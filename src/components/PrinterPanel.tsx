import React, { useEffect, useRef, useState } from "react";
import type { QzStatus } from "@/hooks/useQz";
import type { PrinterKind } from "@/lib/storage";
import { LoadingNote, SkeletonBar } from "./ui";
import Card from "./Card";

/**
 * Card override for the dropdowns panel only.
 *
 * Card.tsx ships with `overflow-hidden` (so its rounded corners clip
 * children). That clips the open dropdown panel, which needs to escape
 * past the card's bottom edge. `!overflow-visible` undoes that clipping
 * for THIS card only - every child inside already has its own rounded
 * corners (the reminder block, the triggers, the panel), so nothing
 * visibly spills outside the rounded outline.
 *
 * The `relative z-20` lifts the whole dropdowns card above the sibling
 * Card that comes before it in the DOM, so when a dropdown opens it
 * paints on top of any stacked content.
 */
const DROPDOWN_CARD_CLASS = "!overflow-visible relative z-20";

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
          <span className="flex h-9 w-9 flex-none items-center justify-center rounded-md bg-amber-50 text-amber-500">
            <i className="fa-solid fa-circle-exclamation" aria-hidden="true" />
          </span>
          <span className="pt-1">
            {isNotRunning ? (
              <>
                QZ Tray is not running - start it from the system tray, then
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
                Could not reach QZ Tray - {errorMessage}. Click{" "}
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
    <Card padding="none" className={`flex flex-col gap-4 p-6 ${DROPDOWN_CARD_CLASS}`}>
      {/* Saved-printer reminder */}
      <div className="flex items-start gap-3 rounded-md border border-slate-200 bg-slate-50 p-3.5 text-[12.5px] leading-relaxed text-slate-500">
        <span className="flex h-8 w-8 flex-none items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500">
          <i className="fa-solid fa-floppy-disk" aria-hidden="true" />
        </span>
        <span className="pt-1">
          <b className="text-slate-900">Printer choices are saved</b> to this
          browser. Reload the page and your receipt &amp; ticket printers are
          remembered automatically.
        </span>
      </div>

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
    </Card>
  );
}

/* ------------------ helpers ------------------ */

function SkeletonRow() {
  return (
    <div className="flex flex-col gap-2">
      <SkeletonBar className="!h-2.5 !w-[90px]" rounded="rounded" />
      <SkeletonBar className="!h-[52px] !w-full" rounded="rounded-md" />
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

/**
 * Custom dropdown - replaces the native <select>.
 *
 * Behaviour: click to open, click outside / Escape to close, Up/Down
 * arrows to highlight, Enter to commit, checkmark on the selected row.
 *
 * When open, the wrapper gets `relative z-30` so the panel is guaranteed
 * to paint above anything else in the card - including the *other*
 * dropdown, which would otherwise cover it when the first one is open.
 */
function SelectRow({ id, label, value, options, onChange }: SelectRowProps) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);

  /* If the currently-selected printer disappears from the list (e.g.
     the user removed it in the OS), clear the selection. */
  useEffect(() => {
    if (value && !options.includes(value)) {
      onChange("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options]);

  /* Close when clicking anywhere outside the dropdown. */
  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  /* When opening, highlight whichever option matches the current value. */
  useEffect(() => {
    if (open) {
      const i = options.indexOf(value);
      setHighlight(i >= 0 ? i : 0);
    }
  }, [open, value, options]);

  function commit(name: string) {
    onChange(name);
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLButtonElement>) {
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (!open) {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, options.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (options[highlight]) commit(options[highlight]);
    }
  }

  const hasValue = Boolean(value);
  const display = hasValue ? value : "Select a printer";

  return (
    <div
      className={`flex flex-col gap-2 ${open ? "relative z-30" : ""}`}
      ref={rootRef}
    >
      <label
        htmlFor={id}
        className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500"
      >
        {label}
      </label>

      <div className="relative">
        {/* ---------- Trigger ---------- */}
        <button
          id={id}
          type="button"
          role="combobox"
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          onKeyDown={onKeyDown}
          className={`
            flex w-full items-center gap-3
            rounded-md border py-3 pl-3.5 pr-11
            text-left text-[13px] font-medium
            transition-colors duration-150
            ${
              open
                ? "border-violet-400 bg-white text-slate-900"
                : "border-slate-200 bg-white text-slate-900 hover:border-slate-300"
            }
            focus:outline-none
          `}
        >
          <span
            className={`min-w-0 flex-1 truncate ${
              hasValue ? "" : "text-slate-400"
            }`}
          >
            {display}
          </span>

          {/* Chevron rotates 180° when open */}
          <span
            aria-hidden="true"
            className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center text-slate-400 transition-transform duration-200 ${
              open ? "rotate-180 text-violet-500" : ""
            }`}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M2 4l4 4 4-4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </button>

        {/* ---------- Option panel ---------- */}
        {open && (
          <div
            role="listbox"
            aria-label={label}
            className="
              absolute left-0 right-0 top-[calc(100%+4px)] z-30
              max-h-64 overflow-y-auto
              rounded-md border border-slate-200 bg-white p-1
              shadow-sm
            "
          >
            {options.map((name, i) => {
              const selected = name === value;
              const active = i === highlight;
              return (
                <button
                  key={name}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onMouseEnter={() => setHighlight(i)}
                  onClick={() => commit(name)}
                  className={`
                    flex w-full items-center gap-3
                    rounded px-3 py-2.5 text-left text-[13px]
                    ${
                      active
                        ? "bg-slate-100 text-slate-900"
                        : "text-slate-700"
                    }
                  `}
                >
                  <span className="min-w-0 flex-1 truncate font-medium">
                    {name}
                  </span>

                  {/* Checkmark on the selected row */}
                  {selected && (
                    <span
                      aria-hidden="true"
                      className="flex h-4 w-4 flex-none items-center justify-center text-violet-600"
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 14 14"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M3 7.5l2.5 2.5L11 4.5"
                          stroke="currentColor"
                          strokeWidth="1.75"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                  )}
                </button>
              );
            })}

            {/* Clear option, in case the user wants to unassign */}
            {hasValue && (
              <>
                <div className="my-1 h-px bg-slate-200" />
                <button
                  type="button"
                  role="option"
                  onClick={() => commit("")}
                  className="
                    flex w-full items-center gap-3 rounded px-3 py-2.5
                    text-left text-[13px] font-medium text-slate-400
                    hover:bg-slate-50 hover:text-slate-600
                  "
                >
                  <span className="min-w-0 flex-1 truncate">
                    Clear selection
                  </span>
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}