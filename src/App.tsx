import React, { useCallback, useEffect, useRef, useState } from "react";

import { Logo } from "@/components/Logo";
import { PrinterSettingsPanel } from "@/components/PrinterSettingsPanel";
import { PrintCards } from "@/components/PrintCards";
import { PreviewModal, type PreviewKind } from "@/components/PreviewModal";
import { SetupPanel } from "@/components/SetupPanel";
import { Toasts } from "@/components/Toasts";
import { SplashScreen } from "@/components/SplashScreen";
import { StatusPill, StatChip, Eyebrow } from "@/components/ui";

import { receiptConfig } from "@/config/receipt-config";
import { buildReceiptHtml } from "@/templates/receipt-template";
import { buildTicketHtml } from "@/templates/ticket-template";
import { withPreviewCentering } from "@/lib/qz";

import { useToast } from "@/hooks/useToast";
import { useQz } from "@/hooks/useQz";
import {
  readPrinter,
  writePrinter,
  type PrinterKind,
  readConnectionMode,
  writeConnectionMode,
  readAgentUrl,
  writeAgentUrl,
  type ConnectionMode,
} from "@/lib/storage";

const MODE_LABEL: Record<ConnectionMode, string> = {
  direct: "Direct QZ Tray",
  agent: "Print Agent",
};

const SUPPORT_EMAIL = "support@grabvo.app";

export default function App() {
  const { toasts, showToast } = useToast();

  /* ---------- connection mode (Direct QZ Tray vs Print Agent) ---------- */
  const [connectionMode, setConnectionMode] = useState<ConnectionMode>(() =>
    readConnectionMode()
  );
  const [agentUrl, setAgentUrl] = useState<string>(() => readAgentUrl());

  const { status, printers, errorMessage, connect, refreshPrinters, print } =
    useQz(showToast, connectionMode, agentUrl);

  /* ---------- splash (first paint only) ---------- */
  const [splashDone, setSplashDone] = useState(false);

  /* ---------- persisted printer selections ---------- */
  const [receiptPrinter, setReceiptPrinter] = useState<string>(() =>
    readPrinter("receipt")
  );
  const [ticketPrinter, setTicketPrinter] = useState<string>(() =>
    readPrinter("ticket")
  );

  /* ---------- preview state ---------- */
  const [previewKind, setPreviewKind] = useState<PreviewKind | null>(null);

  /* ---------- button busy flags ---------- */
  const [connecting, setConnecting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  /* ---------- actions ---------- */
  const handleConnect = useCallback(async () => {
    setConnecting(true);
    try {
      await connect();
    } finally {
      setConnecting(false);
    }
  }, [connect]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshPrinters();
    } finally {
      setRefreshing(false);
    }
  }, [refreshPrinters]);

  const handleConnectionModeChange = useCallback((mode: ConnectionMode) => {
    writeConnectionMode(mode);
    setConnectionMode(mode);
  }, []);

  const handleAgentUrlChange = useCallback((url: string) => {
    writeAgentUrl(url);
    setAgentUrl(url);
  }, []);

  const handlePrinterSelect = useCallback(
    (kind: PrinterKind, value: string) => {
      writePrinter(kind, value);
      if (kind === "receipt") {
        setReceiptPrinter(value);
        if (value) showToast("success", "Receipt printer saved", value);
      } else {
        setTicketPrinter(value);
        if (value) showToast("success", "Ticket printer saved", value);
      }
    },
    [showToast]
  );

  const handlePreview = useCallback((kind: PreviewKind) => {
    setPreviewKind(kind);
  }, []);

  const closePreview = useCallback(() => setPreviewKind(null), []);

  const handlePrintReceipt = useCallback(async () => {
    const html = buildReceiptHtml();
    await print({
      printerName: receiptPrinter,
      html,
      printer: receiptConfig.printer,
      label: "checkout receipt",
    });
  }, [print, receiptPrinter]);

  const handlePrintBill = useCallback(async () => {
    const html = buildReceiptHtml({ mode: "bill" });
    await print({
      printerName: receiptPrinter,
      html,
      printer: receiptConfig.printer,
      label: "order receipt",
    });
  }, [print, receiptPrinter]);

  const handlePrintTicket = useCallback(async () => {
    const html = buildTicketHtml();
    await print({
      printerName: ticketPrinter,
      html,
      printer: receiptConfig.printer,
      label: "preparation receipt",
    });
  }, [print, ticketPrinter]);

  const handlePrintCancellation = useCallback(async () => {
    const html = buildTicketHtml({ mode: "cancellation" });
    await print({
      printerName: ticketPrinter,
      html,
      printer: receiptConfig.printer,
      label: "cancellation receipt",
    });
  }, [print, ticketPrinter]);

  /* ---------- auto-connect on load ---------- */
  useEffect(() => {
    const id = window.setTimeout(() => {
      void handleConnect();
    }, 300);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------- esc closes preview ---------- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && previewKind) closePreview();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [previewKind, closePreview]);

  /* ---------- generate the preview HTML on demand ---------- */
  const previewHtml = (() => {
    if (!previewKind) return "";
    if (previewKind === "receipt") {
      return withPreviewCentering(buildReceiptHtml());
    }
    if (previewKind === "bill") {
      return withPreviewCentering(buildReceiptHtml({ mode: "bill" }));
    }
    if (previewKind === "cancellation") {
      return buildTicketHtml({ mode: "cancellation" });
    }
    return buildTicketHtml();
  })();

  /* ---------- single-page layout: jump-to-section instead of tabs ----------
     There's no navigation shell anymore - everything lives on one
     scrolling page. The status pill / glance chips still act as
     shortcuts, they just smooth-scroll to the Printers section instead
     of switching a tab. */
  const printersRef = useRef<HTMLDivElement>(null);
  const scrollToPrinters = useCallback(() => {
    printersRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  return (
    <>
      {!splashDone && <SplashScreen onDone={() => setSplashDone(true)} />}

      <Toasts toasts={toasts} />

      <PreviewModal
        kind={previewKind}
        html={previewHtml}
        widthMm={receiptConfig.printer.widthMm}
        onClose={closePreview}
        printer={receiptConfig.printer}
        printerName={
          previewKind === "ticket" || previewKind === "cancellation"
            ? ticketPrinter
            : receiptPrinter
        }
      />

      <div className="relative z-[2] min-h-screen">
        <div className="mx-auto max-w-[1080px] px-4 py-10 sm:px-8 sm:py-14">
          {/* ============================================================
              HERO — brand + live status, no navigation
              ============================================================ */}
          <header className="mb-8 flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <Eyebrow className="mb-3 text-violet-600">
                Grabvo · Print Console
              </Eyebrow>
              <Logo className="text-6xl sm:text-7xl" />
              <p className="mt-3 max-w-[52ch] text-[13.5px] leading-relaxed text-slate-500">
                Preview and send receipts &amp; kitchen tickets straight to
                QZ Tray — every request signed server-side, every order
                prints silently, no popups.
              </p>
            </div>
            <StatusPill status={status} onClick={scrollToPrinters} />
          </header>

          {/* Glance strip */}
          <div className="mb-14 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <StatChip
              icon="fa-route"
              label="Connection"
              value={MODE_LABEL[connectionMode]}
              onClick={scrollToPrinters}
            />
            <StatChip
              icon="fa-receipt"
              label="Receipt printer"
              value={receiptPrinter || "Not assigned"}
              tone={receiptPrinter ? "neutral" : "warning"}
              onClick={scrollToPrinters}
            />
            <StatChip
              icon="fa-kitchen-set"
              label="Ticket printer"
              value={ticketPrinter || "Not assigned"}
              tone={ticketPrinter ? "neutral" : "warning"}
              onClick={scrollToPrinters}
            />
          </div>

          {/* ============================================================
              PRINT
              ============================================================ */}
          <section className="mb-14">
            <Eyebrow className="mb-4">Print</Eyebrow>
            <PrintCards
              receiptPrinter={receiptPrinter}
              ticketPrinter={ticketPrinter}
              onPreviewReceipt={() => handlePreview("receipt")}
              onPreviewBill={() => handlePreview("bill")}
              onPreviewTicket={() => handlePreview("ticket")}
              onPreviewCancellation={() => handlePreview("cancellation")}
              onPrintReceipt={handlePrintReceipt}
              onPrintBill={handlePrintBill}
              onPrintTicket={handlePrintTicket}
              onPrintCancellation={handlePrintCancellation}
            />
          </section>

          {/* ============================================================
              PRINTERS & CONNECTION
              ============================================================ */}
          <section ref={printersRef} className="mb-14 scroll-mt-8">
            <Eyebrow className="mb-4">Printers &amp; Connection</Eyebrow>
            <PrinterSettingsPanel
              status={status}
              printers={printers}
              errorMessage={errorMessage}
              receiptPrinter={receiptPrinter}
              ticketPrinter={ticketPrinter}
              onSelect={handlePrinterSelect}
              connectionMode={connectionMode}
              agentUrl={agentUrl}
              onModeChange={handleConnectionModeChange}
              onAgentUrlChange={handleAgentUrlChange}
              connecting={connecting}
              refreshing={refreshing}
              onConnect={handleConnect}
              onRefresh={handleRefresh}
            />
          </section>

          {/* ============================================================
              SETUP
              ============================================================ */}
          <section className="mb-14">
            <Eyebrow className="mb-4">Setup</Eyebrow>
            <SetupPanel />
          </section>

          {/* ============================================================
              Footer
              ============================================================ */}
          <footer className="flex flex-col items-center gap-2 pt-2 text-center">
            <div className="flex items-center gap-2 text-[11.5px] leading-relaxed text-slate-400">
              <i
                className="fa-solid fa-circle-question text-violet-400"
                aria-hidden="true"
              />
              <span>
                Need help? Reach us at{" "}
                <a
                  href={`mailto:${SUPPORT_EMAIL}`}
                  className="font-semibold text-violet-600 underline decoration-violet-200 underline-offset-2 transition hover:decoration-violet-500"
                >
                  {SUPPORT_EMAIL}
                </a>
              </span>
            </div>

            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">
              Grabvo · QZ Print Setup · v{__APP_VERSION__}
            </p>
          </footer>
        </div>
      </div>
    </>
  );
}
