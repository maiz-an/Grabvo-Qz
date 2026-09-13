import React, { useState } from "react";
import { Button } from "./ui";
import Card from "./Card";

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

function PrintCard({
  title,
  badge,
  printer,
  onPreview,
  onPrint,
}: PrintCardProps) {
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
    <Card padding="none" className="flex flex-col gap-3 p-5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[13px] font-bold text-slate-900">{title}</span>
        <span className="rounded-full bg-violet-50 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-[0.14em] text-violet-600">
          {badge}
        </span>
      </div>

      <div
        className={
          "flex min-h-[44px] items-center break-all rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-[12.5px] font-medium leading-snug " +
          (printer ? "text-slate-900" : "italic text-slate-400")
        }
      >
        {printer || "— no printer assigned —"}
      </div>

      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={onPreview}
          icon={<i className="fa-solid fa-eye" aria-hidden="true" />}
        >
          Preview
        </Button>
        <Button
          variant="primary"
          size="sm"
          className="flex-1"
          loading={printing}
          onClick={handlePrint}
          icon={<i className="fa-solid fa-print" aria-hidden="true" />}
        >
          Print
        </Button>
      </div>
    </Card>
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
  onPrintCancellation,
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