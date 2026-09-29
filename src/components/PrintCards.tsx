import React, { useState } from "react";
import { motion } from "framer-motion";
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

type Accent = "violet" | "blue" | "amber" | "red";

const ACCENT: Record<
  Accent,
  { iconBg: string; iconText: string; badgeBg: string; badgeText: string; shadow: string }
> = {
  violet: {
    iconBg: "bg-violet-50",
    iconText: "text-violet-600",
    badgeBg: "bg-violet-50",
    badgeText: "text-violet-600",
    shadow: "hover:shadow-[0_12px_28px_-10px_rgba(124,58,237,0.28)] hover:border-violet-200",
  },
  blue: {
    iconBg: "bg-blue-50",
    iconText: "text-blue-600",
    badgeBg: "bg-blue-50",
    badgeText: "text-blue-600",
    shadow: "hover:shadow-[0_12px_28px_-10px_rgba(37,99,235,0.24)] hover:border-blue-200",
  },
  amber: {
    iconBg: "bg-amber-50",
    iconText: "text-amber-600",
    badgeBg: "bg-amber-50",
    badgeText: "text-amber-600",
    shadow: "hover:shadow-[0_12px_28px_-10px_rgba(217,119,6,0.24)] hover:border-amber-200",
  },
  red: {
    iconBg: "bg-red-50",
    iconText: "text-red-600",
    badgeBg: "bg-red-50",
    badgeText: "text-red-600",
    shadow: "hover:shadow-[0_12px_28px_-10px_rgba(220,38,38,0.22)] hover:border-red-200",
  },
};

interface PrintCardProps {
  title: string;
  description: string;
  badge: string;
  icon: string;
  accent: Accent;
  printer: string;
  index: number;
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
  index,
  onPreview,
  onPrint,
}: PrintCardProps) {
  const [printing, setPrinting] = useState(false);
  const cfg = ACCENT[accent];
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
    // Entrance: cards cascade in on mount, staggered by index — never
    // all mount at once. Mount-only (no whileInView) since this grid is
    // always fully in view on load, nothing to scroll to.
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: index * 0.07, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Interaction: real spring physics (not eased CSS) for the hover
          lift and the tap press — transform + a CSS shadow/border
          transition only, nothing layout-triggering. */}
      <motion.div
        whileHover={{ y: -5 }}
        whileTap={{ scale: 0.985 }}
        transition={{ type: "spring", stiffness: 320, damping: 26 }}
        className={`group flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-[box-shadow,border-color] duration-200 ${cfg.shadow}`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span
              className={`flex h-11 w-11 flex-none items-center justify-center rounded-xl text-[16px] transition-transform duration-200 group-hover:scale-110 group-hover:-rotate-3 ${cfg.iconBg} ${cfg.iconText}`}
            >
              <i className={`fa-solid ${icon}`} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <div className="text-[14px] font-semibold leading-tight text-slate-900">
                {title}
              </div>
              <div className="mt-0.5 text-[11.5px] leading-snug text-slate-400">
                {description}
              </div>
            </div>
          </div>
          <span
            className={`flex-none whitespace-nowrap rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${cfg.badgeBg} ${cfg.badgeText}`}
          >
            {badge}
          </span>
        </div>

        <div
          className={
            "flex min-h-[42px] items-center gap-2 break-all rounded-lg border border-slate-100 bg-slate-50 px-3.5 py-2.5 text-[12px] font-medium leading-snug " +
            (hasPrinter ? "text-slate-700" : "italic text-amber-600")
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
      </motion.div>
    </motion.div>
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
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <PrintCard
        title="Order Receipt"
        description="Handed to the customer before they pay"
        badge="before payment"
        icon="fa-file-invoice"
        accent="blue"
        printer={receiptPrinter}
        index={0}
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
        index={1}
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
        index={2}
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
        index={3}
        onPreview={onPreviewCancellation}
        onPrint={onPrintCancellation}
      />
    </div>
  );
}

export default PrintCards;
