import React, { useCallback, useEffect, useState } from "react";

import { Background } from "@/components/Background";
import { GitHubLink } from "@/components/GitHubLink";
import { Header } from "@/components/Header";
import { ActionButtons } from "@/components/ActionButtons";
import { PrinterPanel } from "@/components/PrinterPanel";
import { PrintCards } from "@/components/PrintCards";
import { PreviewModal, type PreviewKind } from "@/components/PreviewModal";
import { InfoPanel } from "@/components/InfoPanel";
import { Footer } from "@/components/Footer";
import { Toasts } from "@/components/Toasts";
import { SectionHeading } from "@/components/ui";

import { receiptConfig } from "@/config/receipt-config";
import { buildReceiptHtml } from "@/templates/receipt-template";
import { buildTicketHtml } from "@/templates/ticket-template";
import { withPreviewCentering } from "@/lib/qz";

import { useToast } from "@/hooks/useToast";
import { useQz } from "@/hooks/useQz";
import { readPrinter, writePrinter, type PrinterKind } from "@/lib/storage";

export default function App() {
  const { toasts, showToast } = useToast();
  const { status, printers, errorMessage, connect, refreshPrinters, print } =
    useQz(showToast);

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
      label: "checkout receipt"
    });
  }, [print, receiptPrinter]);

  const handlePrintBill = useCallback(async () => {
    const html = buildReceiptHtml({ mode: "bill" });
    await print({
      printerName: receiptPrinter,
      html,
      printer: receiptConfig.printer,
      label: "order receipt"
    });
  }, [print, receiptPrinter]);

  const handlePrintTicket = useCallback(async () => {
    const html = buildTicketHtml();
    await print({
      printerName: ticketPrinter,
      html,
      printer: receiptConfig.printer,
      label: "preparation receipt"
    });
  }, [print, ticketPrinter]);

  const handlePrintCancellation = useCallback(async () => {
    const html = buildTicketHtml({ mode: "cancellation" });
    await print({
      printerName: ticketPrinter,
      html,
      printer: receiptConfig.printer,
      label: "cancellation receipt"
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

  return (
    <>
      <Background />
      <Toasts toasts={toasts} />

      <PreviewModal
        kind={previewKind}
        html={previewHtml}
        widthMm={receiptConfig.printer.widthMm}
        onClose={closePreview}
      />

      <div className="relative z-[2] mx-auto max-w-[760px] px-5 pb-20 pt-14">
        <GitHubLink />

        <Header />

        <ActionButtons
          connecting={connecting}
          refreshing={refreshing}
          onConnect={handleConnect}
          onRefresh={handleRefresh}
        />

        <SectionHeading>Printers</SectionHeading>
        <PrinterPanel
          status={status}
          printers={printers}
          errorMessage={errorMessage}
          receiptPrinter={receiptPrinter}
          ticketPrinter={ticketPrinter}
          onSelect={handlePrinterSelect}
        />

        <SectionHeading>Print</SectionHeading>
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

        <InfoPanel />
        <Footer />
      </div>
    </>
  );
}