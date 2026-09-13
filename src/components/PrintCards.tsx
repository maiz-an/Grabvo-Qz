import React, { useState } from "react";
import { Button } from "./ui";

interface PrintCardsProps {
  receiptPrinter: string;
  ticketPrinter: string;
  onPreviewReceipt: () => void;
  onPreviewBill: () => void;
  onPreviewTicket: () => void;
  onPreviewCancellation: () => void;
  onPrintReceipt: () => Promise<void>;
  onPrintBill: () => Promise<void>;
  onPrintTicket: () => Promise<void>;
  onPrintCancellation: () => Promise<void>;
}

interface PrintCardProps {
  title: string;
  badge: string;
  printer: string;
  onPreview: () => void;
  onPrint: () => Promise<void>;
}

function PrintCard({ title, badge, printer, onPreview, onPrint }: PrintCardProps) {
  const [printing, setPrinting] = useState(false);

  const handlePrint = async () => {
    setPrinting(true);
    try {
      await onPrint();
    } finally {
      setPrinting(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 px-5 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-bold text-slate-900">{title}</span>
        <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-600">
          {badge}
        </span>
      </div>

      <div
        className={
          "flex min-h-[36px] items-center break-all rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[12.5px] font-medium leading-snug " +
          (printer ? "text-slate-900" : "italic text-slate-400")
        }
      >
        {printer || "— no printer assigned —"}
      </div>

      <div className="flex gap-2">
        <Button className="flex-1" onClick={onPreview}>
          <i className="fa-solid fa-eye" aria-hidden="true" />
          Preview
        </Button>
        <Button
          variant="primary"
          className="flex-1"
          loading={printing}
          onClick={handlePrint}
        >
          <i className="fa-solid fa-print" aria-hidden="true" />
          Print
        </Button>
      </div>
    </div>
  );
}

export function PrintCards({
  receiptPrinter,
  ticketPrinter,
  onPreviewReceipt,
  onPreviewBill,
  onPreviewTicket,
  onPreviewCancellation,
  onPrintReceipt,
  onPrintBill,
  onPrintTicket,
  onPrintCancellation
}: PrintCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      <PrintCard
        title="Order Receipt"
        badge="before payment"
        printer={receiptPrinter}
        onPreview={onPreviewBill}
        onPrint={onPrintBill}
      />
      <PrintCard
        title="Checkout Receipt"
        badge="after payment"
        printer={receiptPrinter}
        onPreview={onPreviewReceipt}
        onPrint={onPrintReceipt}
      />
      <PrintCard
        title="Preparation Receipt"
        badge="KOT / BOT"
        printer={ticketPrinter}
        onPreview={onPreviewTicket}
        onPrint={onPrintTicket}
      />
      <PrintCard
        title="Cancellation Receipt"
        badge="void order"
        printer={ticketPrinter}
        onPreview={onPreviewCancellation}
        onPrint={onPrintCancellation}
      />
    </div>
  );
}

export default PrintCards;