import React from "react";
import { Logo } from "./Logo";

export function Header() {
  return (
    <header className="mb-8">
      {/* Kicker — matches admin's uppercase tracked label */}
      <p className="mb-3 text-[10px] font-black uppercase tracking-[0.28em] text-violet-600">
        Print Setup &amp; Preview
      </p>

      {/* Wordmark — same italic Grabvo as LoginPage, scaled to app header */}
      <div className="mb-3 flex items-baseline gap-3">
        <Logo className="text-7xl font-bolder" />
      </div>

      <p className="max-w-[58ch] text-sm leading-relaxed text-slate-500">
        This is how your receipts and kitchen tickets will print for{" "}
        <b className="font-semibold text-slate-700">Grabvo Cafe</b>. Connect QZ
        Tray once — every request is{" "}
        <b className="font-semibold text-slate-700">signed</b> server-side — and
        every order prints automatically after that, with no popup.
      </p>
    </header>
  );
}