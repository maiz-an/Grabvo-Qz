import React, { useEffect } from "react";
import type { QzStatus } from "@/hooks/useQz";
import type { PrinterKind } from "@/lib/storage";
import { LoadingNote, SkeletonBar } from "./ui";
import Card from "./Card";

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
  onSelect,
}: Props) {
  /* ---------- loading ---------- */
  if (status === "connecting" || status === "idle") {
    return (
      <Card padding="none" className="flex flex-col gap-4 p-6">
        <LoadingNote />
        <div className="flex flex-col gap-4">
          <SkeletonRow />
          <SkeletonRow />
        </div>
      </Card>
    );
  }

  /* ---------- error ---------- */
  if (status === "error" || printers.length === 0) {
    const isNotRunning = /not running/i.test(errorMessage);
    return (
      <Card padding="none" className="flex flex-col gap-3 p-6">
        <div className="flex items-start gap-3 text-[13px] leading-relaxed text-slate-500">
          <span className="flex h-9 w-9 flex-none items-center justify-center rounded-2xl bg-amber-50 text-amber-500">
            <i className="fa-solid fa-circle-exclamation" aria-hidden="true" />
          </span>
          <span className="pt-1">
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
        <div className="pl-12 text-xs text-slate-400">
          Once connected, printer dropdowns will appear here.
        </div>
      </Card>
    );
  }

  /* ---------- dropdowns ---------- */
  return (
    <Card padding="none" className="flex flex-col gap-4 p-6">
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
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <i
          className="fa-solid fa-floppy-disk text-violet-400"
          aria-hidden="true"
        />
        Selections are saved automatically to this browser.
      </div>
    </Card>
  );
}

/* ------------------ helpers ------------------ */

function SkeletonRow() {
  return (
    <div className="flex flex-col gap-2">
      <SkeletonBar className="!h-2.5 !w-[90px]" rounded="rounded-full" />
      <SkeletonBar className="!h-[52px] !w-full" rounded="rounded-2xl" />
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
    <div className="flex flex-col gap-2">
      <label
        htmlFor={id}
        className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500"
      >
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="cursor-pointer appearance-none rounded-2xl border border-slate-100 bg-slate-50 py-3.5 pl-4 pr-10 text-[13px] font-medium text-slate-900 transition-all duration-300 focus:border-violet-200 focus:bg-white focus:outline-none focus:ring-4 focus:ring-violet-500/10"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'><path d='M2 4l4 4 4-4' stroke='%2364748b' stroke-width='1.5' fill='none' stroke-linecap='round'/></svg>\")",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "right 14px center",
          backgroundSize: "12px",
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