import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import type { QzStatus } from "@/hooks/useQz";
import type { PrinterKind, ConnectionMode } from "@/lib/storage";
import { Button } from "./ui";

const MODE_LABELS: Record<ConnectionMode, string> = {
  direct: "Direct QZ Tray",
  agent: "Print Agent",
};

interface Props {
  status: QzStatus;
  printers: string[];
  errorMessage: string;
  receiptPrinter: string;
  ticketPrinter: string;
  onSelect: (kind: PrinterKind, value: string) => void;
  connectionMode: ConnectionMode;
  agentUrl: string;
  onModeChange: (mode: ConnectionMode) => void;
  onAgentUrlChange: (url: string) => void;
  connecting: boolean;
  refreshing: boolean;
  onConnect: () => void;
  onRefresh: () => void;
}

/**
 * Printer configuration as a grid of motion cards — Connection, Status,
 * Receipt printer, Ticket printer — matching PrintCards' card language
 * (same entrance stagger, same spring hover lift) instead of the earlier
 * flat settings-row panel.
 */
export function PrinterSettingsPanel({
  status,
  printers,
  errorMessage,
  receiptPrinter,
  ticketPrinter,
  onSelect,
  connectionMode,
  agentUrl,
  onModeChange,
  onAgentUrlChange,
  connecting,
  refreshing,
  onConnect,
  onRefresh,
}: Props) {
  const isLoading = status === "connecting" || status === "idle";
  const isNotRunning = /not running/i.test(errorMessage);
  const hasPrinters = status === "connected" && printers.length > 0;

  let statusText: string;
  let statusTone: "neutral" | "warning" = "neutral";
  if (isLoading) {
    statusText = "Connecting…";
  } else if (status === "error") {
    statusText = isNotRunning
      ? "QZ Tray is not running — start it, then reconnect."
      : `Could not reach QZ Tray — ${errorMessage}`;
    statusTone = "warning";
  } else if (printers.length === 0) {
    statusText = "Connected, but no printers were found on this system.";
    statusTone = "warning";
  } else {
    statusText = `Connected · ${printers.length} printer${printers.length === 1 ? "" : "s"} found`;
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <SettingsCard icon="fa-route" label="Connection" hint="How this device reaches QZ Tray" index={0}>
        <div className="flex flex-col gap-3">
          <div
            className="flex w-fit items-center gap-0.5 rounded-full bg-slate-100 p-0.5"
            role="tablist"
            aria-label="Connection mode"
          >
            {(Object.keys(MODE_LABELS) as ConnectionMode[]).map((m) => {
              const isActive = connectionMode === m;
              return (
                <button
                  key={m}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => onModeChange(m)}
                  className={`rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.04em] ${
                    isActive
                      ? "bg-violet-600 text-white"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {MODE_LABELS[m]}
                </button>
              );
            })}
          </div>

          {connectionMode === "direct" ? (
            <p className="text-[12px] leading-relaxed text-slate-500">
              Printing connects straight to QZ Tray running on this computer.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              <input
                id="agent-url"
                type="text"
                inputMode="url"
                spellCheck={false}
                autoComplete="off"
                placeholder="http://192.168.1.50:8765"
                value={agentUrl}
                onChange={(e) => onAgentUrlChange(e.target.value)}
                className="
                  w-full rounded-xl bg-slate-100 px-3.5 py-2.5
                  text-[13px] font-medium text-slate-900 placeholder:text-slate-400
                  focus:outline-none focus:ring-2 focus:ring-violet-400
                "
              />
              <p className="text-[12px] leading-relaxed text-slate-500">
                Address of the GrabvoPrintPing agent on your network.
              </p>
            </div>
          )}
        </div>
      </SettingsCard>

      <SettingsCard icon="fa-signal" label="Status" index={1}>
        <div className="flex flex-col gap-3">
          <p
            className={`text-[12.5px] leading-relaxed ${
              statusTone === "warning" ? "text-amber-600" : "text-slate-500"
            }`}
          >
            {statusText}
          </p>
          <div className="flex flex-wrap gap-2.5">
            <Button variant="primary" size="sm" loading={connecting} onClick={onConnect}>
              <i className="fa-solid fa-plug-circle-bolt" aria-hidden="true" />
              Reconnect
            </Button>
            <Button size="sm" loading={refreshing} onClick={onRefresh}>
              <i className="fa-solid fa-arrows-rotate" aria-hidden="true" />
              Refresh Printers
            </Button>
          </div>
        </div>
      </SettingsCard>

      <SettingsCard icon="fa-receipt" label="Receipt printer" hint="Order &amp; checkout receipts" index={2} dropdown>
        {hasPrinters ? (
          <SelectRow
            id="sel-receipt"
            value={receiptPrinter}
            options={printers}
            onChange={(v) => onSelect("receipt", v)}
          />
        ) : (
          <PlaceholderField loading={isLoading} />
        )}
      </SettingsCard>

      <SettingsCard icon="fa-kitchen-set" label="Ticket printer" hint="Kitchen &amp; cancellation tickets" index={3} dropdown>
        {hasPrinters ? (
          <SelectRow
            id="sel-ticket"
            value={ticketPrinter}
            options={printers}
            onChange={(v) => onSelect("ticket", v)}
          />
        ) : (
          <PlaceholderField loading={isLoading} />
        )}
      </SettingsCard>

      <div className="md:col-span-2 text-center text-[11px] text-slate-400">
        <i className="fa-solid fa-floppy-disk mr-1.5" aria-hidden="true" />
        Printer choices are saved to this browser and remembered on reload.
      </div>
    </div>
  );
}

/* ------------------ helpers ------------------ */

/**
 * Card shell shared by all four settings cards — same motion language as
 * PrintCards: staggered fade/rise on mount, spring lift on hover. The
 * dropdown cards need `!overflow-visible` so their open option panel can
 * escape the card's rounded-corner clip.
 */
function SettingsCard({
  icon,
  label,
  hint,
  index,
  dropdown,
  children,
}: {
  icon: string;
  label: string;
  hint?: string;
  index: number;
  dropdown?: boolean;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: index * 0.07, ease: [0.16, 1, 0.3, 1] }}
      className={dropdown ? "relative z-10" : undefined}
    >
      <motion.div
        whileHover={{ y: -4 }}
        transition={{ type: "spring", stiffness: 320, damping: 26 }}
        className={`flex flex-col gap-3 rounded-[1.75rem] bg-white p-5 shadow-[0_10px_28px_-10px_rgba(15,23,42,0.14)] transition-shadow duration-200 hover:shadow-[0_16px_36px_-12px_rgba(124,58,237,0.28)] ${
          dropdown ? "!overflow-visible" : ""
        }`}
      >
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-violet-100 text-[13px] text-violet-600">
            <i className={`fa-solid ${icon}`} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <div className="text-[13px] font-semibold text-slate-900">{label}</div>
            {hint && (
              <div
                className="text-[11px] text-slate-400"
                dangerouslySetInnerHTML={{ __html: hint }}
              />
            )}
          </div>
        </div>
        {children}
      </motion.div>
    </motion.div>
  );
}

function PlaceholderField({ loading }: { loading: boolean }) {
  if (loading) {
    return <div className="skeleton-shimmer h-[46px] w-full rounded-xl" />;
  }
  return (
    <div className="flex h-[46px] w-full items-center rounded-xl bg-slate-100 px-3.5 text-[12.5px] italic text-slate-400">
      Connect to QZ Tray to see printers
    </div>
  );
}

interface SelectRowProps {
  id: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}

/**
 * Custom dropdown - replaces the native <select>.
 *
 * Behaviour: click to open, click outside / Escape to close, Up/Down
 * arrows to highlight, Enter to commit, checkmark on the selected row.
 */
function SelectRow({ id, value, options, onChange }: SelectRowProps) {
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
      className={`w-full ${open ? "relative z-30" : ""}`}
      ref={rootRef}
    >
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
            rounded-xl py-2.5 pl-3.5 pr-11
            text-left text-[13px] font-medium
            transition-[box-shadow] duration-150
            ${
              open
                ? "bg-white text-slate-900 ring-2 ring-violet-400"
                : "bg-slate-100 text-slate-900 hover:bg-slate-200"
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
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
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
            aria-label="Printer"
            className="
              absolute left-0 right-0 top-[calc(100%+4px)] z-30
              max-h-64 overflow-y-auto
              rounded-2xl bg-white p-1.5
              shadow-[0_16px_36px_-8px_rgba(15,23,42,0.25)]
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
                    rounded-xl px-3 py-2.5 text-left text-[13px]
                    ${active ? "bg-violet-50 text-violet-700" : "text-slate-700"}
                  `}
                >
                  <span className="min-w-0 flex-1 truncate font-medium">{name}</span>

                  {selected && (
                    <span
                      aria-hidden="true"
                      className="flex h-4 w-4 flex-none items-center justify-center text-violet-600"
                    >
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
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

            {hasValue && (
              <>
                <div className="my-1 h-px bg-slate-200" />
                <button
                  type="button"
                  role="option"
                  onClick={() => commit("")}
                  className="
                    flex w-full items-center gap-3 rounded-xl px-3 py-2.5
                    text-left text-[13px] font-medium text-slate-400
                    hover:bg-slate-50 hover:text-slate-600
                  "
                >
                  <span className="min-w-0 flex-1 truncate">Clear selection</span>
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default PrinterSettingsPanel;
