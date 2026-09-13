import React, { useState } from "react";

export function Header() {
  const [logoFailed, setLogoFailed] = useState(false);

  return (
    <header className="mb-8">
      <p className="mb-2 text-[10px] font-black uppercase tracking-[0.28em] text-violet-600">
        Print Setup &amp; Preview
      </p>

      <div className="mb-2 flex items-center gap-3">
        {!logoFailed && (
          <img
            src="/logo.png"
            alt="Grabvo"
            className="h-9 w-9 flex-none rounded-2xl bg-slate-50 object-contain"
            onError={() => setLogoFailed(true)}
          />
        )}
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
          Grabvo
        </h1>
      </div>

      <p className="max-w-[58ch] text-sm text-slate-500">
        This is how your receipts and kitchen tickets will print for{" "}
        <b className="font-semibold text-slate-700">Grabvo Cafe</b>. Connect
        QZ Tray once — every request is{" "}
        <b className="font-semibold text-slate-700">signed</b> server-side —
        and every order prints automatically after that, with no popup.
      </p>
    </header>
  );
}