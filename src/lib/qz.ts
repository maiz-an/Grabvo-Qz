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
 * This is what actually fixes two different problems at once:
 *   1. "Prints blank paper forever" — that was QZ's own separate
 *      embedded renderer (`type: "raw", format: "html"`) choking on
 *      this app's CSS and producing corrupt/empty raster data. QZ now
 *      only ever encodes an already-finished bitmap — a much simpler,
 *      far more reliable job for it.
 *   2. "Different printer, different look" — every printer now
 *      receives the exact same bitmap, generated once, the same way,
 *      regardless of which printer it's headed to.
 *
 * How: the receipt is loaded into a real, hidden, same-page <iframe>
 * (genuine browser layout/paint — the same engine that renders the
 * live preview correctly), then html2canvas walks that live, rendered
 * DOM and paints it directly onto a <canvas> using the Canvas 2D API.
 *
 * (An earlier version used an SVG <foreignObject> + <img> to rasterize
 * instead. That technique is fundamentally unusable for this: every
 * browser permanently marks a canvas "tainted" after drawing an SVG
 * image that contains a <foreignObject> — even from same-origin,
 * locally-generated content — as a deliberate privacy safeguard, and
 * a tainted canvas can never be exported via toDataURL()/toBlob(). No
 * config fixes that; it's not a bug, it's intentional browser policy.
 * html2canvas sidesteps it entirely by never loading an <img> at all —
 * it paints straight from the DOM, so nothing is ever "tainted".)
 * ----------------------------------------------------------------- */
async function rasterizeHtmlToPngBase64(
  html: string,
  widthMm: number,
  density: number
): Promise<string> {
  const iframe = document.createElement("iframe");
  iframe.style.cssText =
    "position:fixed;left:-20000px;top:0;border:0;visibility:hidden;" +
    `width:${widthMm}mm;height:10px;`;

  const frameDoc = await new Promise<Document>((resolve, reject) => {
    iframe.onload = () => {
      const d = iframe.contentDocument;
      if (d) resolve(d);
      else reject(new Error("Could not access the print render frame"));
    };
    document.body.appendChild(iframe);
    iframe.srcdoc = html;
  });

  try {
    // Give fonts/images a beat to settle — same small delay the live
    // preview already relies on before it measures/fits itself.
    await new Promise((r) => setTimeout(r, 60));

    const target = frameDoc.body;
    if (!target) throw new Error("Receipt HTML has no <body>");

    const canvas = await html2canvas(target, {
      // 96 = the CSS spec's fixed reference pixel density (what the
      // HTML naturally lays out at). Scaling up to the printer's real
      // DPI here means html2canvas paints text/lines genuinely crisp
      // at that resolution, rather than rendering small and blurrily
      // stretching afterward.
      scale: density / 96,
      backgroundColor: "#ffffff",
      useCORS: true,
      logging: false
    });

    const dataUrl = canvas.toDataURL("image/png");
    return dataUrl.split(",")[1] || "";
  } finally {
    iframe.remove();
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