import type { QzGlobal } from "@/types/qz";
import type { PrinterConfig } from "@/config/types";
import html2canvas from "html2canvas";

declare global {
  interface Window {
    qz?: QzGlobal;
  }
}

export interface QzErrorInfo {
  code: "QZ_NOT_RUNNING" | "QZ_FAILED";
  title: string;
  body: string;
  raw: string;
}

/* -----------------------------------------------------------------
 * QZ accessor
 * ----------------------------------------------------------------- */
export function getQz(): QzGlobal {
  const qz = window.qz;
  if (!qz) throw new Error("QZ Tray client not loaded (qz-tray.js missing?)");
  return qz;
}

/* -----------------------------------------------------------------
 * Security — call once before any QZ request
 * ----------------------------------------------------------------- */
export function setupQzSecurity(): void {
  const qz = window.qz;
  if (!qz) {
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
      cache: "no-store",
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
 * Error classification
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
      raw: msg,
    };
  }

  return {
    code: "QZ_FAILED",
    title: "QZ Tray connection failed",
    body: msg || "Unknown error",
    raw: msg,
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

export async function inlineExternalImages(html: string): Promise<string> {
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

export function measureReceiptHeightMm(
  html: string,
  widthMm: number
): Promise<number> {
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

/* =================================================================
 * Shared print-document CSS.
 *
 * This block is applied to the printed raster AND to the preview, so
 * what you see in the modal is byte-for-byte what hits the paper.
 *
 * The sharpening rules matter: html2canvas inherits the browser's
 * default font smoothing, which produces a grey halo around every
 * glyph. After luma thresholding at 140 that halo either fattens the
 * glyph (muddy) or thins it (faded). Disabling smoothing forces
 * pixel-snapped edges, so the threshold has clean black/white to work
 * with and the printed text comes out crisp at every size.
 * ================================================================= */
const PRINT_CSS = `
  html, body, :root {
    margin: 0 !important;
    padding: 0 !important;
    -webkit-font-smoothing: none !important;
    -moz-osx-font-smoothing: unset !important;
    text-rendering: geometricPrecision !important;
    font-synthesis: none !important;
  }
  body > * {
    -webkit-font-smoothing: none !important;
    -moz-osx-font-smoothing: unset !important;
  }
  *, *::before, *::after {
    -webkit-font-smoothing: none !important;
    -moz-osx-font-smoothing: unset !important;
    text-rendering: geometricPrecision !important;
  }
`;

/* =================================================================
 * Bounded raster cache.
 * Same receipt printed twice = one html2canvas pass.
 * ================================================================= */
const rasterCache = new Map<string, string>();
const RASTER_CACHE_MAX = 32;

function rasterCacheKey(html: string, widthMm: number, density: number): string {
  let h = 5381;
  for (let i = 0; i < html.length; i++) {
    h = ((h << 5) + h) ^ html.charCodeAt(i);
  }
  return `${widthMm}|${density}|${(h >>> 0).toString(36)}|${html.length}`;
}

/* =================================================================
 * Client-side rasterization.
 *
 * The receipt is rendered into an off-screen <div> in the *main*
 * document — never an iframe. The receipt's own CSS survives because
 * we rewrite its html/body/:root selectors to target that scoped div.
 *
 * An earlier version used <iframe srcdoc>; on production Chrome the
 * srcdoc iframe could finish loading before its browsing context was
 * fully attached, and html2canvas then threw:
 *
 *     Error: Document is not attached to a Window
 *
 * The div approach has none of that. html2canvas walks a real,
 * attached element in the main window — the exact use case it's built
 * for.
 * ================================================================= */
async function rasterizeHtmlToPngBase64(
  html: string,
  widthMm: number,
  density: number
): Promise<string> {
  const key = rasterCacheKey(html, widthMm, density);
  const cached = rasterCache.get(key);
  if (cached) return cached;

  const parsed = new DOMParser().parseFromString(html, "text/html");
  const scopeId = "qz-render-" + Math.random().toString(36).slice(2);
  const scopeSel = "#" + scopeId;

  // Collect the receipt's own <style> blocks and rewrite html/body/:root
  // selectors to target our scoped div. This is the ONLY transformation
  // applied — the CSS otherwise stays exactly as the template wrote it,
  // which is what guarantees preview === print.
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

  // Shared sharpening rules, scoped to our host.
  const scopedPrintCss = PRINT_CSS
    .replace(/html,\s*body,\s*:root/g, scopeSel)
    .replace(/\bbody\b/g, scopeSel);

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
    "z-index: -2147483647",
  ].join(";");

  const styleEl = document.createElement("style");
  styleEl.textContent = css + "\n" + scopedPrintCss;
  host.appendChild(styleEl);

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
    if (document.fonts && "ready" in document.fonts) {
      try {
        await document.fonts.ready;
      } catch {
        /* ignore */
      }
    }
    await new Promise<void>((r) => requestAnimationFrame(() => r()));

    const canvas = await html2canvas(host, {
      scale: density / 96,
      backgroundColor: "#ffffff",
      useCORS: true,
      logging: false,
    });

    const dataUrl = canvas.toDataURL("image/png");
    const png = dataUrl.split(",")[1] || "";

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

/* =================================================================
 * ESC/POS paper-cut helper.
 *
 * Byte layout:
 *   ESC d n    1B 64 <n>    feed n lines (0–255)
 *   GS  V m    1D 56 <m>    cut (0/48 = full, 1/49 = partial)
 *
 * If feedLines is 0, the ESC d byte is omitted — you get a bare cut,
 * which is almost never what you want, but is available.
 * ================================================================= */
function buildCutCommand(
  type: "full" | "partial",
  feedLines: number
): string {
  const lines = Math.max(0, Math.min(255, Math.floor(feedLines)));
  const feed =
    lines > 0
      ? "\x1B\x64" + String.fromCharCode(lines)
      : "";
  const cut = "\x1D\x56" + (type === "partial" ? "\x01" : "\x00");
  return feed + cut;
}

/* =================================================================
 * Printer-type detection.
 *
 * "raw" mode sends bytes straight in the printer's own command
 * language (ESC/POS here) and bypasses the OS driver entirely — it's
 * what makes thermal receipt printers print pixel-identical output
 * everywhere. But it ONLY works on a printer that actually speaks
 * that language. Point it at a laser/inkjet, a network MFP, or a
 * virtual printer (e.g. "Microsoft Print to PDF") and QZ can't turn
 * the image into ESC/POS bytes for it — that's the
 * "ImageConverter missing for LanguageType: UNKNOWN" crash.
 *
 * There's no single wire format every printer class understands
 * without a driver — a laser printer needs its driver (or PostScript/
 * PCL, which amounts to the same thing) no matter what. So instead of
 * forcing raw ESC/POS at every printer in the list, this guesses the
 * printer's type from its name and only uses raw mode for printers
 * that look like thermal/receipt/label hardware. Everything else
 * automatically falls back to "pixel" mode, which prints through the
 * printer's driver — so it degrades safely instead of throwing.
 *
 * This is a heuristic, not a guarantee — if a printer's driver name
 * doesn't match either list it's left as configured. For a printer
 * you print to often, the reliable fix is still to set `printer.mode`
 * explicitly once you know what it is.
 * ================================================================= */
const RAW_CAPABLE_NAME = /\b(pos|thermal|receipt|kitchen|kot|escpos|esc-pos|tm-|tsp|rp[0-9]|zpl|zebra|epl|tspl|dpl|cpcl|label|barcode|lan\s*80mm|80mm|58mm)\b/i;
const DRIVER_ONLY_NAME = /\b(pdf|xps|onenote|fax|laserjet|officejet|deskjet|inkjet|pcl|postscript|mfp|bizhub|konica|ricoh|xerox|canon|epson\s*et|copier|scan)\b/i;

export function guessRawCapable(printerName: string): boolean {
  if (RAW_CAPABLE_NAME.test(printerName)) return true;
  if (DRIVER_ONLY_NAME.test(printerName)) return false;
  // Unknown name: trust whatever the config says.
  return true;
}

/* =================================================================
 * Print pipeline
 * ================================================================= */
export interface PrintOptions {
  printerName: string;
  html: string;
  printer: PrinterConfig;
}

export async function printHtml({
  printerName,
  html,
  printer,
}: PrintOptions): Promise<void> {
  const qz = getQz();
  const inlined = await inlineExternalImages(html);

  const effectiveMode: "raw" | "pixel" =
    printer.mode === "raw" && !guessRawCapable(printerName)
      ? "pixel"
      : printer.mode;

  if (effectiveMode !== printer.mode) {
    console.warn(
      `[qz] "${printerName}" doesn't look like a raw/ESC-POS printer — ` +
        `printing through its driver (pixel mode) instead of raw ESC/POS.`
    );
  }

  if (effectiveMode === "pixel") {
    const heightMm = await measureReceiptHeightMm(inlined, printer.widthMm);

    const config = qz.configs.create(printerName, {
      size: { width: printer.widthMm, height: heightMm },
      units: "mm",
      margins: 0,
      density: printer.density,
      colorType: printer.pixel.colorType,
      interpolation: printer.pixel.interpolation,
    });

    const data: unknown[] = [
      { type: "pixel", format: "html", flavor: "plain", data: inlined },
    ];

    if (printer.cut?.enabled) {
      data.push({
        type: "raw",
        format: "command",
        flavor: "plain",
        data: buildCutCommand(printer.cut.type, printer.cut.feedLines),
      });
    }

    await qz.print(config, data);
    return;
  }

  const pngBase64 = await rasterizeHtmlToPngBase64(
    inlined,
    printer.widthMm,
    printer.density
  );

  const config = qz.configs.create(printerName, {
    forceRaw: printer.raw.forceRaw,
  });

  const data: unknown[] = [
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
        imageEncoding: printer.raw.imageEncoding,
      },
    },
  ];

  if (printer.cut?.enabled) {
    data.push({
      type: "raw",
      format: "command",
      flavor: "plain",
      data: buildCutCommand(printer.cut.type, printer.cut.feedLines),
    });
  }

  await qz.print(config, data);
}

/* =================================================================
 * Preview parity.
 *
 * The preview iframe gets the identical PRINT_CSS the print path
 * injects — same rules, same cascade, same engine. Preview and print
 * now differ only in *where* the HTML renders, never *what* it is.
 * ================================================================= */
export function withPreviewCentering(html: string): string {
  const injection = `<style id="__print_parity__">${PRINT_CSS}</style>`;
  return html.replace("</head>", injection + "</head>");
}