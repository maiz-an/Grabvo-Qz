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

    // ← CHANGED: was 80. This is the PRINTABLE width of the printhead,
    //   not the paper width. 80mm paper has a ~72mm printhead; sending
    //   an 80mm raster makes the printer clip the right edge. 72 fixes
    //   both "right side hidden" and "content off-centre".
    widthMm: 72,

    mode: "raw",

    raw: {
      language: "ESCPOS",
      quantization: "luma",
      // ← CHANGED: was 128. 160 makes text noticeably darker/sharper on
      //   thermal paper. Try 150–180; higher = bolder, lower = lighter.
      threshold: 160,
      dotDensity: "single",
      imageEncoding: "gs_v_0",
      forceRaw: true,
    },

    pixel: {
      colorType: "blackwhite",
      interpolation: "nearest-neighbor",
    },

    // ← NEW: paper cut after every print.
    cut: {
      enabled: true,
      type: "full",   // "partial" leaves a tab for easy tearing
      feedLines: 3,   // 3 blank lines before cutting
    },
  },

  business: {
    name: "GRABVO CAFE",
    nameAr: "",
    tagline: "Fresh Food · Fast Service",
    logo: "./fav.png",
    address: "Doha, Qatar",
    phone: "+974 5000 0000",
    email: "",
    website: "grabvo.app/grabvo",
  },

  locale: {
    showArabic: true,
    currency: { en: "ر.ق", ar: "" },
    subtotal: { en: "Subtotal", ar: "المجموع الفرعي" },
    total: { en: "TOTAL", ar: "الإجمالي" },
    thanks: {
      en: "Thank you for dining with us",
      ar: "شكراً لتناولكم الطعام معنا",
    },
    visitAgain: {
      en: "We look forward to serving you again",
      ar: "نتطلع لخدمتكم مرة أخرى",
    },
    returnNote: {
      en: "Items once sold cannot be returned without a valid receipt.",
      ar: "لا يمكن إرجاع المنتجات بعد البيع دون فاتورة صالحة.",
    },
  },

  style: {
    baseFont:
      "'Segoe UI', 'Helvetica Neue', 'Inter', -apple-system, BlinkMacSystemFont, Roboto, Arial, sans-serif",
    baseSize: "9.5pt",
    // ← CHANGED: was "1.4". Tighter, still legible, noticeably shorter
    //   receipts. 1.25 is a good sweet spot for thermal.
    lineHeight: "1.25",

    // pageWidth must equal printer.widthMm so content is designed for
    // exactly the raster the printer receives.
    pageWidth: "72mm",
    // ← CHANGED: was "4mm". Reduced so we don't waste printhead area.
    paddingLeftMm: "3mm",
    paddingRightMm: "3mm",
    // ← CHANGED: was "4mm".
    topPadding: "2mm",
    // ← CHANGED: was "5mm". Kept a touch larger so the cut-feed has
    //   clean white space below the last line.
    bottomPadding: "3mm",

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
    // ← CHANGED: was "4mm".
    sectionTopGap: "2.5mm",

    orderLineSize: "9pt",

    metaSize: "8.5pt",
    smallMetaSize: "7.5pt",
    // ← CHANGED: was "1.1mm".
    rowSpacing: "0.8mm",

    itemNameSize: "10pt",
    itemNameArSize: "8pt",
    itemMetaSize: "7.5pt",
    // ← CHANGED: was "2mm".
    itemPadding: "1.5mm",
    itemNoteSize: "7.5pt",

    // ← CHANGED: was "3mm".
    subtotalTopGap: "2mm",

    grandLabelSize: "11pt",
    grandArSize: "11pt",
    grandTotalSize: "16pt",

    thanksSize: "10pt",
    footerArSize: "9.5pt",
    smallArSize: "8.5pt",
    footerSize: "7.5pt",
    // ← CHANGED: was "6.8pt". Below ~7pt thermal text goes blurry no
    //   matter what — 203dpi just can't render smaller cleanly.
    smallFooterSize: "7pt",
    // ← CHANGED: was "6.5pt". Same reason.
    poweredSize: "7pt",
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
      { method: "Card", amount: 33.0 },
    ],

    billNo: "260630000004",
    orderId: "21260629002VWNBTSHE",

    payTime: "30/06/2026 10:55 AM",
    orderTime: "30/06/2026 10:30 AM",
    printTime: "30/06/2026 10:55 AM",
  },

  customer: {
    name: "Saif Eddine",
    phone: "",
    email: "",
    address: "",
  },

  lineItems: [
    {
      name: "Tiramisu Arabic Coffee",
      nameAr: "تيراميسو قهوة عربية",
      qty: 2,
      price: 25.0,
      note: "Extra hot · no sugar",
    },
    {
      name: "Cappuccino",
      nameAr: "كابتشينو",
      qty: 1,
      price: 15.0,
      note: "",
    },
    {
      name: "Chocolate Cake",
      nameAr: "كيك الشوكولاتة",
      qty: 1,
      price: 18.0,
      note: "Sliced in 4 pieces",
    },
  ],

  currency: "ر.ق",
  discount: 0,
  taxRate: 0,

  footer: {
    thanks: "Thank you for dining with us",
    line2: "We look forward to serving you again",
    returnPolicy: "Items once sold cannot be returned without a valid receipt.",
    powered: "GX · Gravbo",
  },

  ticket: {
    header: { label: "KOT" },

    labels: {
      table: "Table",
      server: "Server",
      items: "items",
      notes: "Special instructions",
      footer: "Please prepare as ordered",
      powered: "GX Gravbo",
    },

    sortItemsByName: false,
    uppercaseItems: true,
    notes: "",

    style: {
      // ← CHANGED: was "72mm" — still 72, matching printer.widthMm.
      pageWidth: "72mm",
      // ← CHANGED: was "4mm".
      paddingLeftMm: "3mm",
      // ← CHANGED: was "4mm".
      paddingRightMm: "3mm",
      // ← CHANGED: was "5mm".
      topPadding: "3mm",
      // ← CHANGED: was "5mm".
      bottomPadding: "3mm",

      baseFont:
        "'Segoe UI', 'Helvetica Neue', 'Inter', -apple-system, BlinkMacSystemFont, Roboto, Arial, sans-serif",
      baseSize: "11pt",
      // ← CHANGED: was "1.35".
      lineHeight: "1.25",

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
      // ← CHANGED: was "3mm".
      itemPadding: "2mm",
      itemDivider: "",

      notesLabelSize: "9pt",
      notesBodySize: "11pt",
      thanksSize: "11pt",
      poweredSize: "7pt",
    },
  },

  bill: {
    header: {
      label: "BILL",
      note: "Not a valid receipt",
    },

    labels: {
      amountDue: { en: "AMOUNT DUE", ar: "المبلغ المستحق" },
    },

    footer: {
      note: "Please settle at the counter to receive your official receipt.",
      noteAr: "يرجى الدفع عند الكاونتر للحصول على الفاتورة الرسمية.",
    },
  },

  cancellation: {
    header: { label: "CANCELLED" },

    labels: {
      reason: "Reason",
      items: "items",
      footer: "Removed Products",
      powered: "GX - Gravbo",
      warning: "Kindly remove",
    },

    reason: "",
  },
};