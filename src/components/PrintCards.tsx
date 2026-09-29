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

interface PrintRowProps {
  title: string;
  description: string;
  badge: string;
  icon: string;
  printer: string;
  onPreview: () => void;
  onPrint: () => Promise<void>;
}

function PrintRow({
  title,
  description,
  badge,
  icon,
  printer,
  onPreview,
  onPrint,
}: PrintRowProps) {
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
    <li className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-4">
      {/* Identity column — fixed width on desktop so every row lines up */}
      <div className="flex min-w-0 items-center gap-3 sm:w-[260px] sm:flex-none">
        <span className="flex h-8 w-8 flex-none items-center justify-center rounded-md bg-slate-100 text-[13px] text-slate-500">
          <i className={`fa-solid ${icon}`} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <div className="text-[13.5px] font-semibold leading-tight text-slate-900">
            {title}
          </div>
          <div className="truncate text-[11.5px] leading-snug text-slate-400">
            {description}
          </div>
        </div>
      </div>

      {/* Meta column — badge + printer status, grows to fill the row */}
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px]">
        <span className="flex-none font-medium uppercase tracking-[0.06em] text-slate-400">
          {badge}
        </span>
        <span className="text-slate-200">·</span>
        <span
          className={
            "flex min-w-0 items-center gap-1.5 " +
            (hasPrinter ? "text-slate-500" : "italic text-amber-600")
          }
        >
          <i
            className={`fa-solid ${hasPrinter ? "fa-print" : "fa-circle-exclamation"} text-[10px] flex-none`}
            aria-hidden="true"
          />
          <span className="truncate">
            {hasPrinter ? printer : "No printer assigned"}
          </span>
        </span>
      </div>

      {/* Actions column — fixed on the right */}
      <div className="flex flex-none gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onPreview}
          icon={<i className="fa-solid fa-eye" aria-hidden="true" />}
        >
          Preview
        </Button>
        <Button
          variant="primary"
          size="sm"
          loading={printing}
          onClick={handlePrint}
          disabled={!hasPrinter}
          icon={<i className="fa-solid fa-print" aria-hidden="true" />}
        >
          Print
        </Button>
      </div>
    </li>
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
    <Card padding="none">
      <ul className="divide-y divide-slate-100">
        <PrintRow
          title="Order Receipt"
          description="Before payment"
          badge="before payment"
          icon="fa-file-invoice"
          printer={receiptPrinter}
          onPreview={onPreviewBill}
          onPrint={onPrintBill}
        />
        <PrintRow
          title="Checkout Receipt"
          description="After payment"
          badge="after payment"
          icon="fa-receipt"
          printer={receiptPrinter}
          onPreview={onPreviewReceipt}
          onPrint={onPrintReceipt}
        />
        <PrintRow
          title="Preparation Receipt"
          description="Kitchen or bar"
          badge="KOT / BOT"
          icon="fa-kitchen-set"
          printer={ticketPrinter}
          onPreview={onPreviewTicket}
          onPrint={onPrintTicket}
        />
        <PrintRow
          title="Cancellation Receipt"
          description="Voided order"
          badge="void order"
          icon="fa-ban"
          printer={ticketPrinter}
          onPreview={onPreviewCancellation}
          onPrint={onPrintCancellation}
        />
      </ul>
    </Card>
  );
}

export default PrintCards;
