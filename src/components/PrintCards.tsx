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
    <Card
      padding="none"
      // The default Card shadow is tuned for the admin dashboard's dense
      // page. On this single-column print app there are only 4 of these
      // on screen, so the same shadow reads a touch heavy. This scopes a
      // lighter lift to just these cards — no change to any other Card
      // in the app.
      className="
        flex flex-col gap-3 p-5
        !shadow-[0_1px_3px_rgba(15,23,42,0.03)]
        hover:!shadow-[0_2px_6px_rgba(15,23,42,0.05)]
      "
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[13px] font-bold text-slate-900">{title}</span>
        <span className="rounded-full bg-violet-50 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-[0.14em] text-violet-600">
          {badge}
        </span>
      </div>

      <div
        className={
          "flex min-h-[44px] items-center break-all rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-[12.5px] font-medium leading-snug " +
          (hasPrinter ? "text-slate-900" : "italic text-slate-400")
        }
      >
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
          <b className="font-semibold text-slate-500">Printers</b> tab to
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