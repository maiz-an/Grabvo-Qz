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
   * RAW (default) — QZ renders the HTML once, converts it to
   * ESC/POS raster commands itself using `quantization`/`threshold`,
   * and (with forceRaw) writes those bytes straight to the printer,
   * bypassing the OS driver entirely. No manual height measurement
   * needed — ESC/POS raster prints continue until the content ends,
   * so QZ auto-sizes the height to the real content.
   * ----------------------------------------------------------- */
  const config = qz.configs.create(printerName, {
    units: "mm",
    density: printer.density,
    forceRaw: printer.raw.forceRaw
  });

  const data = [
    {
      type: "raw",
      format: "html",
      flavor: "plain",
      data: inlined,
      options: {
        language: printer.raw.language,
        quantization: printer.raw.quantization,
        threshold: printer.raw.threshold,
        dotDensity: printer.raw.dotDensity,
        imageEncoding: printer.raw.imageEncoding,
        pageWidth: printer.widthMm
        // pageHeight intentionally omitted — auto-sized to content.
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