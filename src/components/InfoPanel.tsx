import React from "react";

export function InfoPanel() {
  return (
    <div className="mt-8 flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-[13px] leading-relaxed text-slate-500 shadow-sm">
      <div className="flex items-start gap-2">
        <i className="fa-solid fa-download mt-0.5 text-violet-600" aria-hidden="true" />
        <span>
          Don&apos;t have QZ Tray installed yet? Grab it from{" "}
          <a
            href="https://qz.io/download/"
            target="_blank"
            rel="noopener"
            className="font-semibold text-violet-600 underline decoration-violet-200 underline-offset-2 hover:decoration-violet-500"
          >
            qz.io/download
          </a>
          , then use the certificate setup below to enable silent printing.
        </span>
      </div>
      <div className="flex items-start gap-2">
        <i className="fa-solid fa-floppy-disk mt-0.5 text-violet-600" aria-hidden="true" />
        <span>
          <b className="text-slate-900">Printer choices are saved</b> to this
          browser. Reload the page and your receipt &amp; ticket printers are
          remembered automatically.
        </span>
      </div>
      <div className="flex items-start gap-2">
        <i className="fa-solid fa-sliders mt-0.5 text-violet-600" aria-hidden="true" />
        <span>
          <b className="text-slate-900">Edit src/config/receipt-config.ts</b>{" "}
          to change business, logo, items, font sizes, printer density, and
          footer. Save — Vite hot-reloads instantly.
        </span>
      </div>
    </div>
  );
}

export default InfoPanel;