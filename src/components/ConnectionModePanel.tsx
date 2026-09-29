import React from "react";
import type { ConnectionMode } from "@/lib/storage";
import Card from "./Card";

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
    <Card padding="none" className="flex flex-col gap-4 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[13px] font-semibold text-slate-900">
          <i className="fa-solid fa-route" aria-hidden="true" />
          Connection mode
        </div>

        <div
          className="flex items-center gap-0.5 rounded-md border border-slate-200 p-0.5"
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
                className={`rounded px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.04em] ${
                  isActive
                    ? "bg-slate-900 text-white"
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
            className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500"
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
              w-full rounded-md border border-slate-200 bg-white px-3.5 py-3
              text-[13px] font-medium text-slate-900 placeholder:text-slate-400
              focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-400
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
