import React from "react";
import { Logo } from "./Logo";
import { StatusPill, StatChip, type LiveStatus } from "./ui";
import type { ConnectionMode } from "@/lib/storage";

interface HeaderProps {
  status: LiveStatus;
  connectionMode: ConnectionMode;
  printerCount: number;
  receiptPrinter: string;
  ticketPrinter: string;
  onGoToPrinters: () => void;
}

const MODE_LABEL: Record<ConnectionMode, string> = {
  direct: "Direct QZ Tray",
  agent: "Print Agent",
};

export function Header({
  status,
  connectionMode,
  printerCount,
  receiptPrinter,
  ticketPrinter,
  onGoToPrinters,
}: HeaderProps) {
  const assignedCount = [receiptPrinter, ticketPrinter].filter(Boolean).length;

  return (
    <header className="mb-8">
      {/* Kicker — matches admin's uppercase tracked label */}
      <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-violet-600">
        Print Setup &amp; Preview
      </p>

      {/* Wordmark + live status — the connection state is the single most
          important fact in this app, so it now lives next to the logo on
          every tab instead of being buried inside the Printers panel. */}
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <Logo className="text-7xl font-bolder" />
        <StatusPill status={status} onClick={onGoToPrinters} className="mb-1" />
      </div>

      <p className="max-w-[58ch] text-sm leading-relaxed text-slate-500">
        This is how your receipts and kitchen tickets will print from{" "}
        <b className="font-semibold text-slate-700">Grabvo</b>. Connect QZ
        Tray once - every request is{" "}
        <b className="font-semibold text-slate-700">signed</b> server-side and
        every order prints automatically after that, with no popup.
      </p>

      {/* Glance strip — the three facts a cashier/manager actually checks
          before printing: is it wired up, and which printer handles what.
          Clicking any chip jumps straight to the Printers tab to fix it. */}
      <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <StatChip
          icon="fa-route"
          label="Connection"
          value={MODE_LABEL[connectionMode]}
          onClick={onGoToPrinters}
        />
        <StatChip
          icon="fa-receipt"
          label="Receipt printer"
          value={receiptPrinter || "Not assigned"}
          tone={receiptPrinter ? "neutral" : "warning"}
          onClick={onGoToPrinters}
        />
        <StatChip
          icon="fa-kitchen-set"
          label="Ticket printer"
          value={ticketPrinter || "Not assigned"}
          tone={ticketPrinter ? "neutral" : "warning"}
          onClick={onGoToPrinters}
        />
      </div>

      {status === "connected" && (
        <p className="mt-3 text-[11.5px] font-medium text-slate-400">
          <i className="fa-solid fa-print mr-1.5 text-violet-400" aria-hidden="true" />
          {printerCount} printer{printerCount === 1 ? "" : "s"} available
          {assignedCount < 2 && (
            <>
              {" "}
              ·{" "}
              <button
                type="button"
                onClick={onGoToPrinters}
                className="font-semibold text-violet-600 underline decoration-violet-200 underline-offset-2 hover:decoration-violet-500"
              >
                assign {assignedCount === 0 ? "printers" : "the rest"}
              </button>
            </>
          )}
        </p>
      )}
    </header>
  );
}
