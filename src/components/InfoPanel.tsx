import React from "react";
import Card from "./Card";

interface InfoRowProps {
  icon: string;
  children: React.ReactNode;
}

function InfoRow({ icon, children }: InfoRowProps) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-9 w-9 flex-none items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
        <i className={`fa-solid ${icon}`} aria-hidden="true" />
      </span>
      <span className="pt-1 text-[13px] leading-relaxed text-slate-500">
        {children}
      </span>
    </div>
  );
}

export function InfoPanel() {
  return (
    <Card
      padding="none"
      className="mt-8 flex flex-col gap-4 px-6 py-5"
    >
      <InfoRow icon="fa-download">
        Don&apos;t have QZ Tray installed yet? Grab it from{" "}
        <a
          href="https://qz.io/download/"
          target="_blank"
          rel="noopener"
          className="font-semibold text-violet-600 underline decoration-violet-200 underline-offset-2 transition hover:decoration-violet-500"
        >
          qz.io/download
        </a>
        , then use the certificate setup below to enable silent printing.
      </InfoRow>

      <InfoRow icon="fa-floppy-disk">
        <b className="text-slate-900">Printer choices are saved</b> to this
        browser. Reload the page and your receipt &amp; ticket printers are
        remembered automatically.
      </InfoRow>
    </Card>
  );
}

export default InfoPanel;