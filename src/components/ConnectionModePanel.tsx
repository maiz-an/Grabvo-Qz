import React from "react";
import type { ConnectionMode } from "@/lib/storage";
import Card from "./Card";

/**
 * Same lighter shadow override every card in the Printers tab uses
 * (ActionButtons' Card, PrinterPanel), so this reads as one panel with
 * them rather than a new visual system.
 */
const CARD_CLASS =
  "!shadow-[0_1px_3px_rgba(15,23,42,0.03)] hover:!shadow-[0_2px_6px_rgba(15,23,42,0.05)]";

const MODE_LABELS: Record<ConnectionMode, string> = {
  direct: "Direct QZ Tray",
  agent: "Print Agent",
};

interface Props {
  mode: ConnectionMode;
  agentUrl: string;
  onModeChange: (mode: ConnectionMode) => void;
  onAgentUrlChange: (url: string) => void;
}

/**
 * Smallest possible addition to the existing Printers tab: a mode
 * switch (mirrors the segmented-control pattern already used for the
 * Windows/macOS/Other switcher in SetupPanel.tsx) plus, only when
 * "Print Agent" is selected, one text field for its URL.
 *
 * Selecting "Direct QZ Tray" requires nothing further — existing
 * behavior, unchanged, no agent URL needed.
 */
export function ConnectionModePanel({
  mode,
  agentUrl,
  onModeChange,
  onAgentUrlChange,
}: Props) {
  return (
    <Card padding="none" className={`flex flex-col gap-4 p-6 ${CARD_CLASS}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[13px] font-bold text-slate-900">
          <i className="fa-solid fa-route" aria-hidden="true" />
          Connection mode
        </div>

        <div
          className="flex items-center gap-0.5 rounded-full bg-slate-100 p-0.5"
          role="tablist"
          aria-label="Connection mode"
        >
          {(Object.keys(MODE_LABELS) as ConnectionMode[]).map((m) => {
            const isActive = mode === m;
            return (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => onModeChange(m)}
                className={`rounded-full px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.06em] transition-all duration-200 ${
                  isActive
                    ? "bg-white text-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.08)]"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {MODE_LABELS[m]}
              </button>
            );
          })}
        </div>
      </div>

      {mode === "direct" && (
        <p className="text-[12.5px] leading-relaxed text-slate-500">
          Printing connects straight to QZ Tray running on this computer.
          This is the existing behavior — no extra setup needed.
        </p>
      )}

      {mode === "agent" && (
        <div className="flex flex-col gap-2">
          <label
            htmlFor="agent-url"
            className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500"
          >
            Print Agent URL
          </label>
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
              w-full rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3.5
              text-[13px] font-medium text-slate-900 placeholder:text-slate-400
              transition-all duration-200
              hover:border-slate-200 hover:bg-white
              focus:border-violet-200 focus:bg-white focus:outline-none focus:ring-4 focus:ring-violet-500/10
            "
          />
          <p className="text-[12px] leading-relaxed text-slate-500">
            Address of the GrabvoPrintPing agent on your network (the
            machine or print box running QZ Tray). Click{" "}
            <b className="text-slate-900">Reconnect</b> below after
            entering it.
          </p>
        </div>
      )}
    </Card>
  );
}

export default ConnectionModePanel;
