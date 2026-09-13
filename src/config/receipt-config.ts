import type { ReceiptConfig } from "./types";

/**
 * receipt-config.ts
 * ---------------------------------------------------------------------
 *  SHARED configuration for BOTH print templates:
 *    receipt-template.ts  → Checkout Receipt (paid) and
 *                            Order Receipt (before payment, "Payable")
 *    ticket-template.ts   → Preparation Receipt (KOT / BOT) and
 *                            Cancellation Receipt (void order)
 *
 *  Edit → Save → the app hot-reloads.
 * ---------------------------------------------------------------------
 */

export const receiptConfig: ReceiptConfig = {
  printer: {
    density: 203,
    widthMm: 80,

    /* See PrinterConfig in types.ts for the full explanation. Short
       version: "raw" bypasses printer drivers entirely and is what
       makes every printer print identically. Only switch to "pixel"
       for a non-ESC/POS printer (e.g. testing with
       "Microsoft Print to PDF"). */
    mode: "raw",

    raw: {
      language: "ESCPOS",
      quantization: "luma",
      threshold: 128,
      dotDensity: "single",
      imageEncoding: "gs_v_0",
      forceRaw: true
    },

    pixel: {
      colorType: "blackwhite",
      interpolation: "nearest-neighbor"
    }
  },

  business: {
    name: "GRABVO CAFE",
    nameAr: "",
    tagline: "Fresh Food · Fast Service",
    logo: "./fav.png",
    address: "Doha, Qatar",
    phone: "+974 5000 0000",
    email: "",
    website: "grabvo.app/grabvo"
  },

  locale: {
    showArabic: true,
    currency: { en: "ر.ق", ar: "" },
    subtotal: { en: "Subtotal", ar: "المجموع الفرعي" },
    total: { en: "TOTAL", ar: "الإجمالي" },
    thanks: {
      en: "Thank you for dining with us",
      ar: "شكراً لتناولكم الطعام معنا"
    },
    visitAgain: {
      en: "We look forward to serving you again",
      ar: "نتطلع لخدمتكم مرة أخرى"
    },
    returnNote: {
      en: "Items once sold cannot be returned without a valid receipt.",
      ar: "لا يمكن إرجاع المنتجات بعد البيع دون فاتورة صالحة."
    }
  },

  style: {
    baseFont:
      "'Segoe UI', 'Helvetica Neue', 'Inter', -apple-system, BlinkMacSystemFont, Roboto, Arial, sans-serif",
    baseSize: "9.5pt",
    lineHeight: "1.4",

    /*
     * 72mm content inside an 80mm page (4mm symmetric margin each
     * side). 72mm is the actual printable width on virtually every
     * 80mm/203dpi thermal printhead — the paper is 80mm but the
     * print head itself physically cannot mark the outer ~4mm on
     * either edge. Using exactly 72mm, centered, means nothing ever
     * gets clipped no matter which side a given printer's unusable
     * margin falls on — this is what fixes "right side hidden" on
     * some printers and "too much blank space" on others.
     */
    pageWidth: "72mm",
    paddingLeftMm: "4mm",
    paddingRightMm: "4mm",
    topPadding: "4mm",
    bottomPadding: "5mm",

    arabicFont:
      "'Tahoma', 'Segoe UI', 'Simplified Arabic', 'Traditional Arabic', 'Noto Naskh Arabic', 'Arial', sans-serif",

    itemPriceSize: "9pt",
    itemPriceWeight: "700",
    arabicWeightHead: "700",
    arabicWeightBody: "600",
    arabicWeightCurrency: "700",
    arabicWeightGrand: "500",
    arabicWeightItemName: "500",
    arabicWeightSmall: "500",

    businessNameSize: "20pt",
    businessNameArSize: "15pt",
    taglineSize: "7pt",
    contactSize: "7pt",
    logoWidth: "20mm",
    logoHeight: "20mm",
    showLogo: true,

    sectionSize: "7pt",
    sectionTopGap: "4mm",

    orderLineSize: "9pt",

    metaSize: "8.5pt",
    smallMetaSize: "7.5pt",
    rowSpacing: "1.1mm",

    itemNameSize: "10pt",
    itemNameArSize: "8pt",
    itemMetaSize: "7.5pt",
    itemPadding: "2mm",
    itemNoteSize: "7.5pt",

    subtotalTopGap: "3mm",

    grandLabelSize: "11pt",
    grandArSize: "11pt",
    grandTotalSize: "16pt",

    thanksSize: "10pt",
    footerArSize: "9.5pt",
    smallArSize: "8.5pt",
    footerSize: "7.5pt",
    smallFooterSize: "6.8pt",
    poweredSize: "6.5pt"
  },

  order: {
    type: "Dine-in",
    number: "#0015",
    cashier: "Merry",
    terminal: "POS-01",
    table: "4",
    notes: "",

    payment: "Card ·· 4242",

    payments: [
      { method: "Cash", amount: 50.0 },
      { method: "Card", amount: 33.0 }
    ],

    billNo: "260630000004",
    orderId: "21260629002VWNBTSHE",

    payTime: "30/06/2026 10:55 AM",
    orderTime: "30/06/2026 10:30 AM",
    printTime: "30/06/2026 10:55 AM"
  },

  customer: {
    name: "Saif Eddine",
    phone: "",
    email: "",
    address: ""
  },

  lineItems: [
    {
      name: "Tiramisu Arabic Coffee",
      nameAr: "تيراميسو قهوة عربية",
      qty: 2,
      price: 25.0,
      note: "Extra hot · no sugar"
    },
    {
      name: "Cappuccino",
      nameAr: "كابتشينو",
      qty: 1,
      price: 15.0,
      note: ""
    },
    {
      name: "Chocolate Cake",
      nameAr: "كيك الشوكولاتة",
      qty: 1,
      price: 18.0,
      note: "Sliced in 4 pieces"
    }
  ],

  currency: "ر.ق",
  discount: 0,
  taxRate: 0,

  footer: {
    thanks: "Thank you for dining with us",
    line2: "We look forward to serving you again",
    returnPolicy: "Items once sold cannot be returned without a valid receipt.",
    powered: "GX · Gravbo"
  },

  ticket: {
    header: { label: "KOT" },

    labels: {
      table: "Table",
      server: "Server",
      items: "items",
      notes: "Special instructions",
      footer: "Please prepare as ordered",
      powered: "GX Gravbo"
    },

    sortItemsByName: false,
    uppercaseItems: true,
    notes: "",

    style: {
      /* Same 72mm-centered-in-80mm rule as the receipt style above —
         see the comment there. Keep both in sync. */
      pageWidth: "72mm",
      paddingLeftMm: "4mm",
      paddingRightMm: "4mm",
      topPadding: "5mm",
      bottomPadding: "5mm",

      baseFont:
        "'Segoe UI', 'Helvetica Neue', 'Inter', -apple-system, BlinkMacSystemFont, Roboto, Arial, sans-serif",
      baseSize: "11pt",
      lineHeight: "1.35",

      badgeSize: "10pt",
      orderNumberSize: "32pt",
      orderNumberWeight: "900",
      orderMetaSize: "12pt",
      orderMetaWeight: "800",

      itemQtySize: "18pt",
      itemQtyWeight: "900",
      itemNameSize: "13pt",
      itemNameWeight: "800",
      itemNameArSize: "10pt",
      itemNoteSize: "10pt",
      itemPadding: "3mm",
      itemDivider: "",

      notesLabelSize: "9pt",
      notesBodySize: "11pt",
      thanksSize: "11pt",
      poweredSize: "7pt"
    }
  },

  /* -------------------------------------------------------------
   * "Before payment" Order Receipt — a pre-payment preview of the
   * check. Same items + totals as the Checkout Receipt, but NO
   * payment section (nothing's been paid yet). The grand-total
   * label reads "Payable". No "BILL" banner is printed.
   * ------------------------------------------------------------- */
  bill: {
    header: {
      label: "BILL",
      note: "Not a valid receipt"
    },

    labels: {
      amountDue: { en: "AMOUNT DUE", ar: "المبلغ المستحق" }
    },

    footer: {
      note: "Please settle at the counter to receive your official receipt.",
      noteAr: "يرجى الدفع عند الكاونتر للحصول على الفاتورة الرسمية."
    }
  },

  /* -------------------------------------------------------------
   * Cancellation Receipt — printed at the kitchen/ticket printer to
   * void an order that's already been sent to prep. Same item list
   * as the Preparation Receipt, with a "Removed Products" banner,
   * a "Kindly Remove" footer note, and an optional reason.
   *
   * NOTE on key names: `labels.footer` renders as the big banner,
   * and `labels.warning` renders as the small footer line. The names
   * are kept as-is to avoid touching the template — only the text
   * values below were changed.
   * ------------------------------------------------------------- */
  cancellation: {
    header: { label: "CANCELLED" },

    labels: {
      reason: "Reason",
      items: "items",
      // Big banner at the top of the cancellation receipt:
      footer: "Removed Products",
      powered: "GX - Gravbo",
      // Footer line at the bottom of the cancellation receipt:
      warning: "Kindly remove"
    },

    reason: ""
  }
};