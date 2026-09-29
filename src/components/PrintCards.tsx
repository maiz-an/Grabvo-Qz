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
  description: string;
  badge: string;
  icon: string;
  printer: string;
  onPreview: () => void;
  onPrint: () => Promise<void>;
}

function PrintCard({
  title,
  description,
  badge,
  icon,
  printer,
  onPreview,
  onPrint,
}: PrintCardProps) {
  const [printing, setPrinting] = useState(false);

  // A print action needs a printer. Preview does not — you can always
  // inspect the layout of a receipt/ticket before one is assigned.
  const hasPrinter = Boolean(printer);

  const handlePrint = async () => {
    if (!hasPrinter) return;
    setPrinting(true);
    try {
      await onPrint();
    } finally {
      setPrinting(false);
    }
  };

  return (
    <Card padding="none" className="flex flex-col gap-3 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 flex-none items-center justify-center rounded-md bg-slate-100 text-[13px] text-slate-500">
            <i className={`fa-solid ${icon}`} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <div className="text-[13.5px] font-semibold leading-tight text-slate-900">
              {title}
            </div>
            <div className="mt-0.5 text-[11.5px] leading-snug text-slate-400">
              {description}
            </div>
          </div>
        </div>
        <span className="flex-none whitespace-nowrap text-[10px] font-medium uppercase tracking-[0.08em] text-slate-400">
          {badge}
        </span>
      </div>

      <div
        className={
          "flex min-h-[38px] items-center gap-2 break-all rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-[12px] font-medium leading-snug " +
          (hasPrinter ? "text-slate-700" : "italic text-slate-400")
        }
      >
        <i
          className={`fa-solid ${hasPrinter ? "fa-print" : "fa-circle-exclamation"} text-[11px] ${hasPrinter ? "text-slate-400" : "text-amber-500"}`}
          aria-hidden="true"
        />
        {hasPrinter ? printer : "No printer assigned"}
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
          disabled={!hasPrinter}
          icon={<i className="fa-solid fa-print" aria-hidden="true" />}
        >
          Print
        </Button>
      </div>

      {!hasPrinter && (
        <p className="text-center text-[11px] text-slate-400">
          Assign a printer in the{" "}
          <b className="font-medium text-slate-500">Printers</b> tab to
          enable printing.
        </p>
      )}
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
        description="Handed to the customer before they pay"
        badge="before payment"
        icon="fa-file-invoice"
        printer={receiptPrinter}
        onPreview={onPreviewBill}
        onPrint={onPrintBill}
      />
      <PrintCard
        title="Checkout Receipt"
        description="The final, paid copy of the order"
        badge="after payment"
        icon="fa-receipt"
        printer={receiptPrinter}
        onPreview={onPreviewReceipt}
        onPrint={onPrintReceipt}
      />
      <PrintCard
        title="Preparation Receipt"
        description="Sent to the kitchen or bar to prepare"
        badge="KOT / BOT"
        icon="fa-kitchen-set"
        printer={ticketPrinter}
        onPreview={onPreviewTicket}
        onPrint={onPrintTicket}
      />
      <PrintCard
        title="Cancellation Receipt"
        description="Flags a voided order to the kitchen"
        badge="void order"
        icon="fa-ban"
        printer={ticketPrinter}
        onPreview={onPreviewCancellation}
        onPrint={onPrintCancellation}
      />
    </div>
  );
}

export default PrintCards;
