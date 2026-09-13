import { useCallback, useState } from "react";
import {
  connectQz,
  getQz,
  humanizeQzError,
  listPrinters,
  printHtml
} from "@/lib/qz";
import { sleep } from "@/lib/utils";
import type { PrinterConfig } from "@/config/types";
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

export function useQz(showToast: ShowToast): UseQzResult {
  const [status, setStatus] = useState<QzStatus>("idle");
  const [printers, setPrinters] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState("");

  const connect = useCallback(async () => {
    setStatus("connecting");
    setErrorMessage("");
    try {
      await connectQz();
      setStatus("connected");
      showToast("success", "QZ Tray connected");
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
  }, [showToast]);

  const refreshPrinters = useCallback(async () => {
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
  }, [showToast]);

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

      showToast("info", `rendering ${label}…`, printerName);

      try {
        await connectQz();
        await printHtml({ printerName, html, printer });
        showToast("success", `${label} sent`, printerName);
      } catch (err) {
        console.error(label + " error:", err);
        const info = humanizeQzError(err);
        showToast(
          info.code === "QZ_NOT_RUNNING" ? "warning" : "error",
          info.code === "QZ_NOT_RUNNING" ? info.title : `${label} print failed`,
          info.body,
          10000
        );
      }
    },
    [showToast]
  );

  return { status, printers, errorMessage, connect, refreshPrinters, print };
}

/* Keep the import alive for side-effect typing; not used directly. */
void getQz;