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

type Accent = "violet" | "blue" | "amber" | "red";

const ACCENT: Record<
  Accent,
  { iconBg: string; iconText: string; badgeBg: string; badgeText: string }
> = {
  violet: {
    iconBg: "bg-violet-50",
    iconText: "text-violet-600",
    badgeBg: "bg-violet-50",
    badgeText: "text-violet-600",
  },
  blue: {
    iconBg: "bg-blue-50",
    iconText: "text-blue-600",
    badgeBg: "bg-blue-50",
    badgeText: "text-blue-600",
  },
  amber: {
    iconBg: "bg-amber-50",
    iconText: "text-amber-600",
    badgeBg: "bg-amber-50",
    badgeText: "text-amber-600",
  },
  red: {
    iconBg: "bg-red-50",
    iconText: "text-red-600",
    badgeBg: "bg-red-50",
    badgeText: "text-red-600",
  },
};

interface PrintCardProps {
  title: string;
  description: string;
  badge: string;
  icon: string;
  accent: Accent;
  printer: string;
  onPreview: () => void;
  onPrint: () => Promise<void>;
}

function PrintCard({
  title,
  description,
  badge,
  icon,
  accent,
  printer,
  onPreview,
  onPrint,
}: PrintCardProps) {
  const [printing, setPrinting] = useState(false);
  const cfg = ACCENT[accent];

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
        group flex flex-col gap-4 p-5
        !shadow-[0_1px_3px_rgba(15,23,42,0.03)]
        hover:!shadow-[0_10px_24px_-10px_rgba(15,23,42,0.12)]
        hover:-translate-y-0.5
      "
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className={`flex h-11 w-11 flex-none items-center justify-center rounded-2xl text-[16px] transition-transform duration-300 group-hover:scale-105 ${cfg.iconBg} ${cfg.iconText}`}
          >
            <i className={`fa-solid ${icon}`} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <div className="text-[14px] font-bold leading-tight text-slate-900">
              {title}
            </div>
            <div className="mt-0.5 text-[11.5px] leading-snug text-slate-400">
              {description}
            </div>
          </div>
        </div>
        <span
          className={`flex-none whitespace-nowrap rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-[0.1em] ${cfg.badgeBg} ${cfg.badgeText}`}
        >
          {badge}
        </span>
      </div>

      <div
        className={
          "flex min-h-[42px] items-center gap-2 break-all rounded-2xl border border-slate-100 bg-slate-50 px-3.5 py-2.5 text-[12px] font-medium leading-snug " +
          (hasPrinter ? "text-slate-700" : "italic text-slate-400")
        }
      >
        <i
          className={`fa-solid ${hasPrinter ? "fa-print" : "fa-circle-exclamation"} text-[11px] ${hasPrinter ? "text-slate-400" : "text-amber-400"}`}
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
        description="Handed to the customer before they pay"
        badge="before payment"
        icon="fa-file-invoice"
        accent="blue"
        printer={receiptPrinter}
        onPreview={onPreviewBill}
        onPrint={onPrintBill}
      />
      <PrintCard
        title="Checkout Receipt"
        description="The final, paid copy of the order"
        badge="after payment"
        icon="fa-receipt"
        accent="violet"
        printer={receiptPrinter}
        onPreview={onPreviewReceipt}
        onPrint={onPrintReceipt}
      />
      <PrintCard
        title="Preparation Receipt"
        description="Sent to the kitchen or bar to prepare"
        badge="KOT / BOT"
        icon="fa-kitchen-set"
        accent="amber"
        printer={ticketPrinter}
        onPreview={onPreviewTicket}
        onPrint={onPrintTicket}
      />
      <PrintCard
        title="Cancellation Receipt"
        description="Flags a voided order to the kitchen"
        badge="void order"
        icon="fa-ban"
        accent="red"
        printer={ticketPrinter}
        onPreview={onPreviewCancellation}
        onPrint={onPrintCancellation}
      />
    </div>
  );
}

export default PrintCards;
