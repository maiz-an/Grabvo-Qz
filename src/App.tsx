import React, { useCallback, useEffect, useState } from "react";

import { Background } from "@/components/Background";
import { Sidebar, MobileTopBar, type TabId } from "@/components/Sidebar";
import { PageHeader } from "@/components/PageHeader";
import { PrinterSettingsPanel } from "@/components/PrinterSettingsPanel";
import { PrintCards } from "@/components/PrintCards";
import { PreviewModal, type PreviewKind } from "@/components/PreviewModal";
import { SetupPanel } from "@/components/SetupPanel";
import { Toasts } from "@/components/Toasts";
import { SplashScreen } from "@/components/SplashScreen";
import { StatChip } from "@/components/ui";

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

const PAGE_COPY: Record<TabId, { title: string; description: string }> = {
  print: {
    title: "Print",
    description:
      "Preview and send receipts & kitchen tickets — printed instantly once a printer is assigned.",
  },
  printers: {
    title: "Printers",
    description:
      "Connect to QZ Tray and assign which printer handles receipts vs. kitchen tickets.",
  },
  setup: {
    title: "Setup",
    description:
      "Install QZ Tray and trust the Grabvo certificate so printing runs silently, with no popups.",
  },
};

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

  /* ---------- tab state ---------- */
  const [activeTab, setActiveTab] = useState<TabId>("print");

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

  /* ---------- scroll reset on tab change ---------- */
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [activeTab]);

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

  /* ---------- Printers nav attention dot ----------
     Surfaces when something needs the user's attention: QZ Tray
     unreachable, or connected but a printer still isn't assigned. */
  const printersNeedAttention =
    status === "error" ||
    (status === "connected" && (!receiptPrinter || !ticketPrinter));

  const goToPrinters = useCallback(() => setActiveTab("printers"), []);

  const page = PAGE_COPY[activeTab];

  return (
    <>
      {!splashDone && <SplashScreen onDone={() => setSplashDone(true)} />}

      <Background />
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

      {/* ==================================================================
          DASHBOARD SHELL — persistent sidebar (desktop) / bottom tab bar
          (mobile) on the left, scrollable content on the right.
          ================================================================== */}
      <div className="relative z-[2] flex min-h-screen">
        <Sidebar
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          status={status}
          needsAttention={printersNeedAttention}
          onStatusClick={goToPrinters}
        />

        <main className="min-w-0 flex-1 pb-20 md:pb-0">
          <MobileTopBar status={status} onStatusClick={goToPrinters} />
          <div className="mx-auto max-w-[880px] px-4 py-6 sm:px-8 sm:py-8">
            {activeTab === "print" && (
              <div key="print" className="animate-[fadeIn_180ms_ease-out_forwards]">
                <PageHeader title={page.title} description={page.description}>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <StatChip
                      icon="fa-route"
                      label="Connection"
                      value={MODE_LABEL[connectionMode]}
                      onClick={goToPrinters}
                    />
                    <StatChip
                      icon="fa-receipt"
                      label="Receipt printer"
                      value={receiptPrinter || "Not assigned"}
                      tone={receiptPrinter ? "neutral" : "warning"}
                      onClick={goToPrinters}
                    />
                    <StatChip
                      icon="fa-kitchen-set"
                      label="Ticket printer"
                      value={ticketPrinter || "Not assigned"}
                      tone={ticketPrinter ? "neutral" : "warning"}
                      onClick={goToPrinters}
                    />
                  </div>
                </PageHeader>

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
              </div>
            )}

            {activeTab === "printers" && (
              <div key="printers" className="animate-[fadeIn_180ms_ease-out_forwards]">
                <PageHeader title={page.title} description={page.description} />
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
              </div>
            )}

            {activeTab === "setup" && (
              <div key="setup" className="animate-[fadeIn_180ms_ease-out_forwards]">
                <PageHeader title={page.title} description={page.description} />
                <SetupPanel />
              </div>
            )}
          </div>
        </main>
      </div>
    </>
  );
}
