import { useCallback, useState } from "react";
import {
  connectQz,
  getAgentStatus,
  getQz,
  humanizeQzError,
  listPrinters,
  listPrintersViaAgent,
  printHtml
} from "@/lib/qz";
import { sleep } from "@/lib/utils";
import type { PrinterConfig } from "@/config/types";
import type { ConnectionMode } from "@/lib/storage";
import type { ToastType } from "./useToast";

export type QzStatus = "idle" | "connecting" | "connected" | "error";

export type ShowToast = (
  type: ToastType,
  title: string,
  body?: string,
  lifeMs?: number
) => void;

export interface UseQzResult {
  status: QzStatus;
  printers: string[];
  errorMessage: string;
  connect: () => Promise<void>;
  refreshPrinters: () => Promise<void>;
  print: (args: {
    printerName: string;
    html: string;
    printer: PrinterConfig;
    label: string;
  }) => Promise<void>;
}

/**
 * `connectionMode`/`agentUrl` are new, additive params. When
 * connectionMode === "direct" (the default, existing behavior) this
 * hook behaves exactly as before — every branch below marked "direct"
 * is the original, unmodified code path.
 */
export function useQz(
  showToast: ShowToast,
  connectionMode: ConnectionMode = "direct",
  agentUrl: string = ""
): UseQzResult {
  const [status, setStatus] = useState<QzStatus>("idle");
  const [printers, setPrinters] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState("");

  const connect = useCallback(async () => {
    setStatus("connecting");
    setErrorMessage("");

    if (connectionMode === "agent") {
      try {
        const info = await getAgentStatus(agentUrl);
        setStatus("connected");
        showToast(
          "success",
          "Print Agent reachable",
          info.qzTray === "connected"
            ? `${info.agent || "GrabvoPrintPing"} is online and QZ Tray is connected`
            : `${info.agent || "GrabvoPrintPing"} is online, but QZ Tray isn't connected on that machine yet`
        );
        await refreshPrinters();
      } catch (err) {
        setStatus("error");
        const msg = (err as Error)?.message || "Could not reach the Print Agent";
        setErrorMessage(msg);
        showToast("warning", "Print Agent not reachable", msg, 10000);
      }
      return;
    }

    /* ---------- direct mode (unchanged) ---------- */
    try {
      // Was QZ already connected before we call connectQz()? Used to give
      // the success toast a more informative body — "already running"
      // when it was open, "started" when this call actually opened the
      // websocket. Guard against window.qz being undefined in the brief
      // window before qz-tray.js finishes loading.
      const wasActive = window.qz ? window.qz.websocket.isActive() : false;

      await connectQz();
      setStatus("connected");

      showToast(
        "success",
        "QZ Tray connected",
        wasActive
          ? "Tray is already running and ready to print"
          : "Tray started and ready to print"
      );

      await refreshPrinters();
    } catch (err) {
      setStatus("error");
      const info = humanizeQzError(err);
      setErrorMessage(info.body);
      showToast(
        info.code === "QZ_NOT_RUNNING" ? "warning" : "error",
        info.title,
        info.body,
        10000
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showToast, connectionMode, agentUrl]);

  const refreshPrinters = useCallback(async () => {
    if (connectionMode === "agent") {
      try {
        const list = await listPrintersViaAgent(agentUrl);
        console.log("Available printers (via Print Agent):", list);
        await sleep(350);
        setPrinters(list);
        if (list.length === 0) {
          showToast("warning", "No printers found on the Print Agent");
        }
      } catch (err) {
        const msg = (err as Error)?.message || "Failed to get printers from the Print Agent";
        setErrorMessage(msg);
        setPrinters([]);
        showToast("error", "Failed to get printers", msg, 10000);
      }
      return;
    }

    /* ---------- direct mode (unchanged) ---------- */
    try {
      await connectQz();
      const list = await listPrinters();
      console.log("Available printers:", list);

      // Small delay so the skeleton registers as intentional
      await sleep(350);

      setPrinters(list);

      if (list.length === 0) {
        showToast("warning", "No printers found");
      }
    } catch (err) {
      const info = humanizeQzError(err);
      setErrorMessage(info.body);
      setPrinters([]);
      showToast(
        info.code === "QZ_NOT_RUNNING" ? "warning" : "error",
        info.code === "QZ_NOT_RUNNING" ? info.title : "Failed to get printers",
        info.body,
        10000
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showToast, connectionMode, agentUrl]);

  const print = useCallback(
    async ({
      printerName,
      html,
      printer,
      label
    }: {
      printerName: string;
      html: string;
      printer: PrinterConfig;
      label: string;
    }) => {
      if (!printerName) {
        showToast(
          "warning",
          `No ${label} printer assigned`,
          "Choose one in the PRINTERS panel above."
        );
        return;
      }

      if (connectionMode === "agent" && !agentUrl) {
        showToast(
          "warning",
          "No Print Agent URL configured",
          "Set one in the PRINTERS panel above, or switch back to Direct QZ Tray."
        );
        return;
      }

      showToast("info", `rendering ${label}…`, printerName);

      try {
        // Direct mode needs a live QZ Tray websocket in this browser;
        // agent mode doesn't — GrabvoPrintPing owns that connection.
        if (connectionMode !== "agent") {
          await connectQz();
        }
        await printHtml({ printerName, html, printer, connectionMode, agentUrl });
        showToast(
          "success",
          `${label} sent`,
          connectionMode === "agent" ? `${printerName} (via Print Agent)` : printerName
        );
      } catch (err) {
        console.error(label + " error:", err);
        if (connectionMode === "agent") {
          const msg = (err as Error)?.message || "Print Agent print failed";
          showToast("error", `${label} print failed`, msg, 10000);
          return;
        }
        const info = humanizeQzError(err);
        showToast(
          info.code === "QZ_NOT_RUNNING" ? "warning" : "error",
          info.code === "QZ_NOT_RUNNING" ? info.title : `${label} print failed`,
          info.body,
          10000
        );
      }
    },
    [showToast, connectionMode, agentUrl]
  );

  return { status, printers, errorMessage, connect, refreshPrinters, print };
}

/* Keep the import alive for side-effect typing; not used directly. */
void getQz;
