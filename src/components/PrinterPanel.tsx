import React, { useEffect } from "react";
import type { QzStatus } from "@/hooks/useQz";
import type { PrinterKind } from "@/lib/storage";
import { LoadingNote, SkeletonBar } from "./ui";

interface Props {
  status: QzStatus;
  printers: string[];
  errorMessage: string;
  receiptPrinter: string;
  ticketPrinter: string;
  onSelect: (kind: PrinterKind, value: string) => void;
}

export function PrinterPanel({
  status,
  printers,
  errorMessage,
  receiptPrinter,
  ticketPrinter,
  onSelect
}: Props) {
  /* ---------- loading ---------- */
  if (status === "connecting" || status === "idle") {
    return (
      <div className="flex flex-col gap-3.5 rounded-2xl border border-slate-200 bg-white p-4 px-5 shadow-sm">
        <LoadingNote />
        <div className="flex flex-col gap-3.5">
          <SkeletonRow />
          <SkeletonRow />
        </div>
      </div>
    );
  }

  /* ---------- error ---------- */
  if (status === "error" || printers.length === 0) {
    const isNotRunning = /not running/i.test(errorMessage);
    return (
      <div className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-4 px-5 shadow-sm">
        <div className="flex items-start gap-2 text-[13px] leading-relaxed text-slate-500">
          <i className="fa-solid fa-circle-exclamation mt-0.5 text-amber-500" aria-hidden="true" />
          <span>
            {isNotRunning ? (
              <>
                QZ Tray is not running — start it from the system tray, then
                click <b className="text-slate-900">Reconnect</b>.
              </>
            ) : printers.length === 0 && status === "connected" ? (
              <>
                No printers found on this system. Install a printer (even
                Microsoft Print to PDF) and click{" "}
                <b className="text-slate-900">Refresh Printers</b>.
              </>
            ) : (
              <>
                Could not reach QZ Tray — {errorMessage}. Click{" "}
                <b className="text-slate-900">Reconnect</b> to retry.
              </>
            )}
          </span>
        </div>
        <div className="pl-6 text-xs text-slate-400">
          Once connected, printer dropdowns will appear here.
        </div>
      </div>
    );
  }

  /* ---------- dropdowns ---------- */
  return (
    <div className="flex flex-col gap-3.5 rounded-2xl border border-slate-200 bg-white p-4 px-5 shadow-sm">
      <SelectRow
        id="sel-receipt"
        label="Receipt printer"
        value={receiptPrinter}
        options={printers}
        onChange={(v) => onSelect("receipt", v)}
      />
      <SelectRow
        id="sel-ticket"
        label="Ticket printer"
        value={ticketPrinter}
        options={printers}
        onChange={(v) => onSelect("ticket", v)}
      />
      <div className="text-xs text-slate-400">
        Selections are saved automatically to this browser.
      </div>
    </div>
  );
}

/* ------------------ helpers ------------------ */

function SkeletonRow() {
  return (
    <div className="flex flex-col gap-1.5">
      <SkeletonBar className="!h-2.5 !w-[90px]" />
      <SkeletonBar className="!h-[38px] !rounded-xl" />
    </div>
  );
}

interface SelectRowProps {
  id: string;
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}

function SelectRow({ id, label, value, options, onChange }: SelectRowProps) {
  useEffect(() => {
    if (value && !options.includes(value)) {
      onChange("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options]);

  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className="text-[11px] font-bold uppercase tracking-wide text-slate-500"
      >
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="cursor-pointer appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-3 pr-9 text-[13px] font-medium text-slate-900 transition focus:outline-none focus:ring-2 focus:ring-violet-500"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'><path d='M2 4l4 4 4-4' stroke='%2364748b' stroke-width='1.5' fill='none' stroke-linecap='round'/></svg>\")",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "right 12px center",
          backgroundSize: "12px"
        }}
      >
        <option value="">— select a printer —</option>
        {options.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </select>
    </div>
  );
}