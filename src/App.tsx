import React, { useCallback, useEffect, useState } from "react";

import { Background } from "@/components/Background";
import { Header } from "@/components/Header";
import { ActionButtons } from "@/components/ActionButtons";
import { PrinterPanel } from "@/components/PrinterPanel";
import { ConnectionModePanel } from "@/components/ConnectionModePanel";
import { PrintCards } from "@/components/PrintCards";
import { PreviewModal, type PreviewKind } from "@/components/PreviewModal";
import { SetupPanel } from "@/components/SetupPanel";
import { Toasts } from "@/components/Toasts";
import { SplashScreen } from "@/components/SplashScreen";
import Card from "@/components/Card";

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

type TabId = "print" | "printers" | "setup";

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: "print", label: "Print", icon: "fa-print" },
  { id: "printers", label: "Printers", icon: "fa-plug-circle-bolt" },
  { id: "setup", label: "Setup", icon: "fa-shield-halved" },
];

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

  /* ---------- scroll reset on tab change ----------
     The whole page scrolls together (header included) — so when the user
     switches tabs while scrolled down, hard-jump back to the top. That
     way the header is always the first thing visible after a tab switch,
     without ever pinning anything. `behavior: "instant"` forces a hard
     jump regardless of any global scroll-behavior setting. */
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

  /* ---------- iOS segmented-control index ---------- */
  const activeIndex = TABS.findIndex((t) => t.id === activeTab);

  /* ---------- Printers tab attention dot ----------
     Surfaces in the tab bar itself when something there needs the
     user's attention: QZ Tray unreachable, or connected but a printer
     still isn't assigned. Cleared once everything's wired up. */
  const printersNeedAttention =
    status === "error" ||
    (status === "connected" && (!receiptPrinter || !ticketPrinter));

  const goToPrinters = useCallback(() => setActiveTab("printers"), []);

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
          ONE SCROLL CONTAINER — header, tab bar, and tab panels all live
          in this single column. Nothing is sticky. The whole page scrolls
          as one unit, header included, exactly like the original layout.
          ================================================================== */}
      <div className="relative z-[2] mx-auto max-w-[820px] px-4 pb-16 pt-12 sm:px-6 sm:pt-16">
        <Header
          status={status}
          connectionMode={connectionMode}
          printerCount={printers.length}
          receiptPrinter={receiptPrinter}
          ticketPrinter={ticketPrinter}
          onGoToPrinters={goToPrinters}
        />

        {/* iOS-style segmented control */}
        <div
          className="relative mb-6 flex rounded-2xl bg-slate-100 p-1.5"
          role="tablist"
          aria-label="App sections"
        >
          {/* Sliding pill — sits behind the buttons (z-0), buttons sit at z-10 */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-1.5 bottom-1.5 left-1.5 z-0 rounded-xl bg-white shadow-[0_1px_2px_rgba(15,23,42,0.08),0_2px_6px_rgba(15,23,42,0.06)]"
            style={{
              width: `calc((100% - 0.75rem) / ${TABS.length})`,
              transform: `translateX(${activeIndex * 100}%)`,
              transition: "transform 340ms cubic-bezier(0.32, 0.72, 0, 1)",
            }}
          />

          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveTab(tab.id)}
                className={`relative z-10 inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-bold transition-colors duration-300 active:scale-[0.97] ${
                  isActive
                    ? "text-slate-900"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <span className="relative inline-flex">
                  <i
                    className={`fa-solid ${tab.icon} text-[12px] transition-colors duration-300 ${
                      isActive ? "text-violet-600" : "text-slate-400"
                    }`}
                    aria-hidden="true"
                  />
                  {tab.id === "printers" && printersNeedAttention && (
                    <span
                      className="absolute -right-1.5 -top-1.5 h-1.5 w-1.5 rounded-full bg-red-500 ring-2 ring-slate-100"
                      aria-hidden="true"
                    />
                  )}
                </span>
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* ---------------------------------------------
            Tab panels — one visible at a time.
            Each panel starts at the same Y offset (0), with the same
            internal vertical rhythm, so nothing shifts the header.
            --------------------------------------------- */}
        {activeTab === "print" && (
          <div
            key="print"
            className="animate-[fadeIn_220ms_ease-out_forwards] flex flex-col gap-3"
          >
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
          <div
            key="printers"
            className="animate-[fadeIn_220ms_ease-out_forwards] flex flex-col gap-3"
          >
            <ConnectionModePanel
              mode={connectionMode}
              agentUrl={agentUrl}
              onModeChange={handleConnectionModeChange}
              onAgentUrlChange={handleAgentUrlChange}
            />
            <Card
              padding="none"
              // Same light-shadow override used by PrintCards / PrinterPanel /
              // SetupPanel, so every card in the app reads with the same
              // weight. The `!` is what lets this override Card's own default
              // shadow without touching Card.tsx.
              className="
                p-5
                !shadow-[0_1px_3px_rgba(15,23,42,0.03)]
                hover:!shadow-[0_2px_6px_rgba(15,23,42,0.05)]
              "
            >
              <ActionButtons
                connecting={connecting}
                refreshing={refreshing}
                onConnect={handleConnect}
                onRefresh={handleRefresh}
              />
            </Card>
            <PrinterPanel
              status={status}
              printers={printers}
              errorMessage={errorMessage}
              receiptPrinter={receiptPrinter}
              ticketPrinter={ticketPrinter}
              onSelect={handlePrinterSelect}
            />
          </div>
        )}

        {activeTab === "setup" && (
          <div
            key="setup"
            className="animate-[fadeIn_220ms_ease-out_forwards] flex flex-col gap-3"
          >
            <SetupPanel />
          </div>
        )}

        {/* ---------------------------------------------
            Global footer — always visible on every tab.
            A quiet support line, matching the app's overall tone, plus
            the app version (injected from package.json at build time).
            --------------------------------------------- */}
        <footer className="mt-10 flex flex-col items-center gap-2 text-center">
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

          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-300">
            Grabvo · QZ Print Setup · v{__APP_VERSION__}
          </p>
        </footer>
      </div>
    </>
  );
}