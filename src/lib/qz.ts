import type { QzGlobal } from "@/types/qz";
import type { PrinterConfig } from "@/config/types";

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
 * Client-side rasterization — render the receipt HTML to a PNG using
 * the browser's OWN real rendering engine (the same one that draws
 * the live preview correctly), instead of handing raw HTML to QZ
 * Tray's separate embedded renderer.
 *
 * This is the actual fix for two different problems at once:
 *   1. "Prints blank paper forever" — that was QZ's own HTML→ESC/POS
 *      conversion (`type: 'raw', format: 'html'`) choking on this
 *      app's CSS and producing corrupt/empty raster data. QZ's raw
 *      printer never renders anything now — it only encodes an
 *      already-finished bitmap, which is a much simpler, far more
 *      reliable job for it.
 *   2. "Different printer, different look" — every printer now
 *      receives the exact same bitmap, generated once, the exact same
 *      way, regardless of which printer it's headed to.
 *
 * Technique: wrap the receipt's real <style>/<body> in an SVG
 * <foreignObject> (this uses actual browser layout/paint — not a
 * re-implementation like some screenshot libraries use), rendered at
 * the printer's real DPI via the viewBox→width/height scale, so text
 * comes out crisp instead of being rendered small and then blurrily
 * upscaled.
 * ----------------------------------------------------------------- */
async function rasterizeHtmlToPngBase64(
  html: string,
  widthMm: number,
  heightMm: number,
  density: number
): Promise<string> {
  const MM_PER_INCH = 25.4;
  const CSS_DPI = 96; // the CSS spec's fixed reference pixel density — this
  // is just the coordinate system the HTML lays out in, not the final
  // output resolution (that's `density`, applied below via the SVG's
  // width/height vs. viewBox scale).

  const nativeWidthPx = Math.max(1, Math.round((widthMm / MM_PER_INCH) * CSS_DPI));
  const nativeHeightPx = Math.max(1, Math.round((heightMm / MM_PER_INCH) * CSS_DPI));
  const targetWidthPx = Math.max(1, Math.round((widthMm / MM_PER_INCH) * density));
  const targetHeightPx = Math.max(1, Math.round((heightMm / MM_PER_INCH) * density));

  const doc = new DOMParser().parseFromString(html, "text/html");

  // Combine every <style> block and move it to the very top of <body>,
  // so it travels with the body when we serialize just that below (and
  // so we don't have to worry about anything else in <head>).
  const combinedCss = Array.from(doc.querySelectorAll("style"))
    .map((s) => s.textContent || "")
    .join("\n");
  const styleEl = doc.createElement("style");
  styleEl.textContent = combinedCss;
  if (doc.body) {
    doc.body.insertBefore(styleEl, doc.body.firstChild);
  }

  // XMLSerializer — not innerHTML — because this gets embedded in an
  // SVG document below, which is parsed as strict XML. innerHTML
  // happily emits HTML-legal-but-XML-illegal markup (e.g. `<img ...>`
  // without a closing slash), which would silently fail to load as an
  // image. XMLSerializer produces well-formed, self-closed, properly
  // namespaced/escaped XML from the exact same DOM.
  const bodyXml = doc.body
    ? new XMLSerializer().serializeToString(doc.body)
    : '<body xmlns="http://www.w3.org/1999/xhtml"></body>';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg"
       viewBox="0 0 ${nativeWidthPx} ${nativeHeightPx}"
       width="${targetWidthPx}" height="${targetHeightPx}">
    <foreignObject x="0" y="0" width="${nativeWidthPx}" height="${nativeHeightPx}">
      ${bodyXml}
    </foreignObject>
  </svg>`;

  const svgBlob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);

  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("Failed to rasterize receipt HTML"));
      image.src = url;
    });

    const canvas = document.createElement("canvas");
    canvas.width = targetWidthPx;
    canvas.height = targetHeightPx;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context unavailable");

    // Solid white background — the canvas is transparent by default,
    // which would confuse black/white quantization on the printer side.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, targetWidthPx, targetHeightPx);
    ctx.imageSmoothingEnabled = false; // keep text/line edges crisp
    ctx.drawImage(img, 0, 0, targetWidthPx, targetHeightPx);

    const dataUrl = canvas.toDataURL("image/png");
    return dataUrl.split(",")[1] || "";
  } finally {
    URL.revokeObjectURL(url);
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
  const heightMm = await measureReceiptHeightMm(inlined, printer.widthMm);
  const pngBase64 = await rasterizeHtmlToPngBase64(
    inlined,
    printer.widthMm,
    heightMm,
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