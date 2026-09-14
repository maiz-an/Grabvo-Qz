import type { QzGlobal } from "@/types/qz";
import type { PrinterConfig } from "@/config/types";
import html2canvas from "html2canvas";

declare global {
  interface Window {
    qz?: QzGlobal;
  }
}

/* -----------------------------------------------------------------
 * Error shape returned by humanizeQzError
 * ----------------------------------------------------------------- */
export interface QzErrorInfo {
  code: "QZ_NOT_RUNNING" | "QZ_FAILED";
  title: string;
  body: string;
  raw: string;
}

/* -----------------------------------------------------------------
 * Low-level QZ accessor
 * ----------------------------------------------------------------- */
export function getQz(): QzGlobal {
  const qz = window.qz;
  if (!qz) throw new Error("QZ Tray client not loaded (qz-tray.js missing?)");
  return qz;
}

/* -----------------------------------------------------------------
 * Security setup — call once before any QZ request
 * ----------------------------------------------------------------- */
export function setupQzSecurity(): void {
  const qz = window.qz;
  if (!qz) {
    // qz-tray.js hasn't loaded yet — try again shortly.
    setTimeout(setupQzSecurity, 250);
    return;
  }

  qz.security.setCertificatePromise((resolve, reject) => {
    fetch("/digital-certificate.txt", { cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw new Error("Certificate could not be loaded");
        return r.text();
      })
      .then(resolve)
      .catch(reject);
  });

  qz.security.setSignaturePromise((toSign) => (resolve, reject) => {
    fetch("/sign-message?request=" + encodeURIComponent(toSign), {
      cache: "no-store"
    })
      .then((r) => {
        if (!r.ok) throw new Error("Signature request failed");
        return r.text();
      })
      .then(resolve)
      .catch(reject);
  });

  qz.security.setSignatureAlgorithm("SHA512");
}

/* -----------------------------------------------------------------
 * Connection & printer enumeration
 * ----------------------------------------------------------------- */
export async function connectQz(): Promise<void> {
  const qz = getQz();
  if (qz.websocket.isActive()) return;
  await qz.websocket.connect();
}

export async function listPrinters(): Promise<string[]> {
  const qz = getQz();
  const printers = await qz.printers.find();
  return Array.isArray(printers) ? printers : [];
}

/* -----------------------------------------------------------------
 * Classify QZ errors into something user-friendly
 * ----------------------------------------------------------------- */
export function humanizeQzError(err: unknown): QzErrorInfo {
  const msg = String(
    (err as { message?: string })?.message ?? err ?? ""
  ).trim();

  const looksLikeNotRunning =
    /websocket|econnrefused|unable to connect|failed to open|connection refused|not running|closed/i.test(
      msg
    );

  if (looksLikeNotRunning) {
    return {
      code: "QZ_NOT_RUNNING",
      title: "QZ Tray is not running",
      body: "Start QZ Tray from the system tray (Windows) or menu bar (macOS), then click reconnect_qz.",
      raw: msg
    };
  }

  return {
    code: "QZ_FAILED",
    title: "QZ Tray connection failed",
    body: msg || "Unknown error",
    raw: msg
  };
}

/* -----------------------------------------------------------------
 * HTML helpers
 * ----------------------------------------------------------------- */
export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result));
    fr.onerror = reject;
    fr.readAsDataURL(blob);
  });
}

/** Inline every remote <img src="http…"> in the HTML as a data URI. */
export async function inlineExternalImages(html: string): Promise<string> {
  // Fast path — nothing remote to fetch, skip the DOM parse entirely.
  // The vast majority of prints hit this branch.
  if (!/<img[^>]+src=["']https?:/i.test(html)) return html;

  const doc = new DOMParser().parseFromString(html, "text/html");
  const imgs = Array.from(doc.querySelectorAll("img")).filter((img) =>
    /^https?:/i.test(img.getAttribute("src") || "")
  );

  await Promise.all(
    imgs.map(async (img) => {
      const src = img.getAttribute("src")!;
      try {
        const r = await fetch(src, { mode: "cors", cache: "no-store" });
        if (!r.ok) throw new Error("HTTP " + r.status);
        const b = await r.blob();
        img.setAttribute("src", await blobToDataUrl(b));
      } catch {
        console.warn("logo could not be inlined, leaving URL for QZ:", src);
      }
    })
  );

  return "<!DOCTYPE html>\n" + doc.documentElement.outerHTML;
}

/** Measure the rendered receipt height in mm, using a hidden iframe. */
export function measureReceiptHeightMm(html: string, widthMm: number): Promise<number> {
  return new Promise((resolve) => {
    const f = document.createElement("iframe");
    f.style.cssText =
      "position:fixed;left:-20000px;top:0;border:0;visibility:hidden;" +
      `width:${widthMm}mm;height:10px;`;
    f.onload = () => {
      try {
        const doc = f.contentDocument!;
        const h = Math.max(
          doc.documentElement.scrollHeight,
          doc.body ? doc.body.scrollHeight : 0
        );
        resolve((h * 25.4) / 96 + 20);
      } catch {
        resolve(260);
      } finally {
        f.remove();
      }
    };
    f.srcdoc = html;
    document.body.appendChild(f);
  });
}

/* -----------------------------------------------------------------
 * Client-side rasterization — render the receipt HTML to a PNG in the
 * browser itself, so QZ Tray never has to render any HTML/CSS at all.
 *
 * Why this is done the way it is (learn from a real bug):
 *
 *   An earlier version loaded the receipt into an <iframe srcdoc>
 *   marked visibility:hidden and 10px tall, then ran html2canvas on
 *   the iframe's <body>. On production Chrome this reliably throws
 *
 *       Error: Document is not attached to a Window
 *
 *   html2canvas walks the target element's ownerDocument.defaultView
 *   to do its work, and a srcdoc iframe that never finished attaching
 *   its browsing context can leave defaultView === null at that
 *   instant — html2canvas then refuses to proceed.
 *
 * The fix:
 *   - No iframe. The receipt is rendered into a scoped <div> inside
 *     the *main* document — the exact case html2canvas is built and
 *     tested for.
 *   - The receipt's own CSS is preserved by rewriting its html/body/
 *     :root selectors to target that scoped div. Same visual result,
 *     no iframe isolation needed.
 *   - The host is hidden by being pushed 10 000 px off-screen, NOT by
 *     visibility:hidden or opacity:0 — html2canvas treats both of
 *     those as "paint nothing" and would return a blank canvas.
 *
 * This is also what makes the Android story trivial later: the
 * front-end hands whatever bridge is on the other end a finished PNG,
 * so the bridge only has to encode ESC/POS — no HTML rendering, no
 * platform-specific CSS engine.
 * ----------------------------------------------------------------- */

/**
 * Cheap memoization for rasterized receipts. Printing the same KOT
 * five times a minute should not cost five html2canvas runs — only
 * the first one does. Bounded so a long-lived POS session can't grow
 * without limit; 32 entries covers every receipt/ticket variant.
 */
const rasterCache = new Map<string, string>();
const RASTER_CACHE_MAX = 32;

function rasterCacheKey(html: string, widthMm: number, density: number): string {
  // djb2 hash — collision risk here is irrelevant because the worst
  // case of a collision is a cache miss (just re-rasterize).
  let h = 5381;
  for (let i = 0; i < html.length; i++) {
    h = ((h << 5) + h) ^ html.charCodeAt(i);
  }
  return `${widthMm}|${density}|${(h >>> 0).toString(36)}|${html.length}`;
}

async function rasterizeHtmlToPngBase64(
  html: string,
  widthMm: number,
  density: number
): Promise<string> {
  const key = rasterCacheKey(html, widthMm, density);
  const cached = rasterCache.get(key);
  if (cached) return cached;

  const parsed = new DOMParser().parseFromString(html, "text/html");

  // Unique per-call scope so the receipt's CSS can never leak into the
  // app, and the app's Tailwind base can never override the receipt.
  const scopeId = "qz-render-" + Math.random().toString(36).slice(2);
  const scopeSel = "#" + scopeId;

  // Collect every <style> block from the receipt and rewrite its
  // html / body / :root selectors to target our scoped div. This is
  // the only reason the receipt's own styling survives at all — with
  // a <div> host there is no <html> or <body> for those rules to hit.
  let css = "";
  parsed.querySelectorAll("style").forEach((s) => {
    css += (s.textContent || "") + "\n";
  });

  css = css
    .replace(/:root\b/g, scopeSel)
    .replace(
      /(^|[\s,{])(html|body)(?=[\s,{:]|$)/gm,
      (_m, pre: string) => pre + scopeSel
    );

  // The offscreen host. Hidden by position, never by visibility or
  // opacity — both of those make html2canvas paint a transparent
  // canvas, i.e. a "successful" print of nothing.
  const host = document.createElement("div");
  host.id = scopeId;
  host.setAttribute("aria-hidden", "true");
  host.style.cssText = [
    "position: fixed",
    "left: -10000px",
    "top: 0",
    `width: ${widthMm}mm`,
    "background: #ffffff",
    "pointer-events: none",
    "z-index: -2147483647"
  ].join(";");

  const styleEl = document.createElement("style");
  styleEl.textContent = css;
  host.appendChild(styleEl);

  // Copy <body>'s attributes (class, style, dir, lang, …) onto an
  // inner wrapper so any `.receipt { … }` style rules still apply.
  const inner = document.createElement("div");
  if (parsed.body) {
    for (const attr of Array.from(parsed.body.attributes)) {
      inner.setAttribute(attr.name, attr.value);
    }
    inner.innerHTML = parsed.body.innerHTML;
  }
  host.appendChild(inner);

  document.body.appendChild(host);

  try {
    // Wait for webfonts (Inter, Tahoma, etc.) and inlined logos so the
    // first paint after page load is the final, fully typeset receipt.
    // Without this, the very first print can come out slightly faded
    // or mis-measured.
    if (document.fonts && "ready" in document.fonts) {
      try {
        await document.fonts.ready;
      } catch {
        /* ignore — some browsers reject this promise */
      }
    }
    await new Promise<void>((r) => requestAnimationFrame(() => r()));

    const canvas = await html2canvas(host, {
      // 96 is the CSS spec's reference pixel density (what the HTML
      // naturally lays out at). Scaling up to the printer's real DPI
      // here means html2canvas paints text/lines genuinely crisp at
      // that resolution, rather than rendering small and then
      // blurrily stretching afterward.
      scale: density / 96,
      backgroundColor: "#ffffff",
      useCORS: true,
      logging: false
    });

    const dataUrl = canvas.toDataURL("image/png");
    const png = dataUrl.split(",")[1] || "";

    // Bounded cache insert.
    if (rasterCache.size >= RASTER_CACHE_MAX) {
      const oldest = rasterCache.keys().next().value;
      if (oldest !== undefined) rasterCache.delete(oldest);
    }
    rasterCache.set(key, png);

    return png;
  } finally {
    host.remove();
  }
}

/* -----------------------------------------------------------------
 * Print job — the whole pipeline in one function
 * ----------------------------------------------------------------- */
export interface PrintOptions {
  printerName: string;
  html: string;
  printer: PrinterConfig;
}

export async function printHtml({
  printerName,
  html,
  printer
}: PrintOptions): Promise<void> {
  const qz = getQz();
  const inlined = await inlineExternalImages(html);

  if (printer.mode === "pixel") {
    /* -----------------------------------------------------------
     * PIXEL fallback — renders via the OS printer driver. Only used
     * for non-ESC/POS printers (see PrinterConfig.mode). Since the
     * driver does its own layout, we still have to measure and
     * declare an explicit page height ourselves.
     * ----------------------------------------------------------- */
    const heightMm = await measureReceiptHeightMm(inlined, printer.widthMm);

    const config = qz.configs.create(printerName, {
      size: { width: printer.widthMm, height: heightMm },
      units: "mm",
      margins: 0,
      density: printer.density,
      colorType: printer.pixel.colorType,
      interpolation: printer.pixel.interpolation
    });

    const data = [
      { type: "pixel", format: "html", flavor: "plain", data: inlined }
    ];

    await qz.print(config, data);
    return;
  }

  /* -----------------------------------------------------------
   * RAW (default) — the receipt is rasterized to a PNG in the browser
   * itself (see rasterizeHtmlToPngBase64 above), so QZ never renders
   * any HTML/CSS at all — it only encodes an already-finished bitmap
   * into ESC/POS raster commands using `quantization`/`threshold`,
   * then (with forceRaw) writes those bytes straight to the printer,
   * bypassing the OS driver entirely. Every printer receives the
   * identical bitmap, converted the identical way.
   * ----------------------------------------------------------- */
  const pngBase64 = await rasterizeHtmlToPngBase64(
    inlined,
    printer.widthMm,
    printer.density
  );

  const config = qz.configs.create(printerName, {
    forceRaw: printer.raw.forceRaw
  });

  const data = [
    {
      type: "raw",
      format: "image",
      flavor: "base64",
      data: pngBase64,
      options: {
        language: printer.raw.language,
        quantization: printer.raw.quantization,
        threshold: printer.raw.threshold,
        dotDensity: printer.raw.dotDensity,
        imageEncoding: printer.raw.imageEncoding
      }
    }
  ];

  await qz.print(config, data);
}

/** Build a preview-only variant of a receipt HTML string with balanced padding. */
export function withPreviewCentering(html: string): string {
  const fix = `
    <style id="__preview_center__">
      body {
        margin: 0 auto !important;
        padding-left: 2mm !important;
        padding-right: 2mm !important;
      }
    </style>
  `;
  return html.replace("</head>", fix + "</head>");
}