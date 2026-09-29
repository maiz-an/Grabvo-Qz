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
      threshold: 140,
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
    // ← CHANGED: 'Inter' now comes first. It's embedded straight into
    //   the printed document (see INTER_FONT_FACE in shared.ts), so
    //   every till renders the exact same glyphs regardless of what's
    //   installed on that machine. Before, 'Segoe UI' came first and
    //   silently won on every Windows till (it ships with Windows),
    //   which is why the same receipt looked bolder / had different
    //   spacing on different registers — each one was quietly using a
    //   different font. The rest of the stack is just a safety net for
    //   the on-screen preview before the embedded font finishes decoding.
    baseFont:
      "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
    baseSize: "9.5pt",
    // ← CHANGED: was "1.4". Tighter, still legible, noticeably shorter
    //   receipts. 1.25 is a good sweet spot for thermal.
    lineHeight: "1.15",

    // pageWidth must equal printer.widthMm so content is designed for
    // exactly the raster the printer receives.
    pageWidth: "72mm",
    // ← CHANGED: was "3mm" (≈4.2% of 72mm each side). Requested: content
    //   should fill ~98% of the printable width, ~1% margin each side.
    //   1% of 72mm = 0.72mm — rounded to 0.7mm. If a printer's
    //   `widthMm` is changed, these should scale with it (1% of
    //   whatever the new widthMm is), not stay fixed at 0.7mm.
    paddingLeftMm: "0.7mm",
    paddingRightMm: "0.7mm",
    // ← CHANGED: was "4mm".
    topPadding: "0.5mm",
    // ← CHANGED: 2mm → 3mm. The footer margins got trimmed hard in the
    //   last pass, which left "powered" sitting right at the edge
    //   before the cut feed — felt jammed/half-hidden. This gives it
    //   breathing room without bringing back the old wasted paper.
    bottomPadding: "3mm",

    arabicFont:
      "'Tahoma', 'Segoe UI', 'Simplified Arabic', 'Traditional Arabic', 'Noto Naskh Arabic', 'Arial', sans-serif",

    itemPriceSize: "9pt",
    // ← CHANGED: was "700". Item name (below) also dropped a step —
    //   both were reading heavier than intended next to the rest of
    //   the receipt.
    itemPriceWeight: "600",
    arabicWeightHead: "700",
    arabicWeightBody: "600",
    arabicWeightCurrency: "700",
    arabicWeightGrand: "500",
    arabicWeightItemName: "500",
    arabicWeightSmall: "500",

    businessNameSize: "20pt",
    businessNameArSize: "15pt",
    taglineSize: "7pt",
    // ← CHANGED: was "7pt". Same floor issue as smallMetaSize above —
    //   confirmed with the raster simulation on the "N items" line.
    contactSize: "7.5pt",
    logoWidth: "20mm",
    logoHeight: "20mm",
    showLogo: true,

    sectionSize: "7pt",
    // Gap ABOVE a section title (e.g. space before "CUSTOMER" starts,
    // or before "ITEMS" starts) — between the end of the previous
    // section's content and this title.
    // ← CHANGED: 1.5mm → 3mm. Requested more breathing room here —
    //   "Merry / POS-01" felt too close to "CUSTOMER" right under it,
    //   same for "Saif Eddine" → "ITEMS".
    sectionTopGap: "3mm",
    // Gap BELOW a section title's underline, before its content starts
    // (e.g. "ORDER" → "#0015", or "ITEMS" → "Tiramisu Arabic Coffee").
    // ← CHANGED: 0.9mm → -1mm (yes, negative — see below). IMPORTANT:
    //   this looks wrong/overlapping in "Live preview" — that's
    //   expected, ignore it. Measured directly against a rasterized
    //   "Exact print" (what actually hits the paper): the real printed
    //   gap runs a roughly constant ~2.8mm *bigger* than whatever
    //   margin is set here, because html2canvas (the library that
    //   turns the receipt into the image sent to the printer)
    //   positions text within its own line lower than a real browser
    //   does — same fixed offset on every section (confirmed: same
    //   effect on ORDER, CUSTOMER,
    //   and ITEMS, which use three different CSS layouts, so it's not
    //   a layout bug, just how that library renders text). Bottom
    //   line: always judge this value against "Exact print", never
    //   "Live preview" — preview will now look too tight/overlapping,
    //   that's the negative margin compensating for the offset above.
    //   Want it tighter/looser on the real print? Move this number,
    //   not what Live preview shows you.
    sectionBottomGap: "-1mm",

    orderLineSize: "9pt",
    // ← NEW: gap BETWEEN the order-detail rows themselves — e.g.
    //   "#0015 / Table 4" down to "Merry / POS-01". Was hardcoded to
    //   1mm as `.order-grid`'s row-gap — pulled out here. This is a
    //   *different* gap from sectionBottomGap above: sectionBottomGap
    //   is "ORDER" (the title) → "#0015" (the first row);
    //   orderRowGap is "#0015" (first row) → "Merry" (second row).
    orderRowGap: "0.5mm",

    metaSize: "8.5pt",
    // ← CHANGED: was "7.5pt". Verified against an actual raster+
    //   threshold simulation (not just the on-screen preview): at
    //   7.5pt a capital "T"'s crossbar (Reference section: "Order
    //   Time", "Print Time") is thin enough to drop out at 1-bit —
    //   8pt gives it enough raster pixels to survive reliably, for
    //   ~0.1mm of extra line height.
    smallMetaSize: "8pt",
    // ← CHANGED: was "1.1mm".
    rowSpacing: "0.8mm",

    itemNameSize: "10pt",
    itemNameArSize: "8pt",
    itemMetaSize: "7.5pt",
    // ← CHANGED: was "2mm", then "1.5mm". A touch tighter again between
    //   items — this is padding on EACH item (top+bottom), so it adds
    //   up fast across a longer order.
    itemPadding: "1.2mm",
    // ← NEW: gap BETWEEN one item's own detail lines — item name →
    //   Arabic name → "2 × 25.00" (qty×price) → note (e.g. "Extra hot
    //   · no sugar"). Was hardcoded to 0.4mm across three separate CSS
    //   rules — pulled out here as one shared knob. This is *within*
    //   one item; `itemPadding` above is the space *between* items.
    itemDetailGap: "0.4mm",
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
      pageWidth: "78mm",
      // ← CHANGED: was "3mm" — same "~1% each side" request applied to
      //   tickets too, for consistency with the receipt above.
      paddingLeftMm: "0.0mm",
      paddingRightMm: "0.0mm",
      // ← CHANGED: was "5mm".
      topPadding: "0.5mm",
      // ← CHANGED: was "5mm".
      bottomPadding: "2mm",

      // ← CHANGED: same reasoning as printer receipt style.baseFont above —
      //   'Inter' first, embedded, so kitchen tickets match too.
      baseFont:
        "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
      baseSize: "11pt",
      // ← CHANGED: was "1.35".
      lineHeight: "1.25",

      badgeSize: "10pt",
      // ← NEW: gap between the header's underline (below "KOT" / order
      //   number / table / time) and the first item row. Was hardcoded
      //   as `.tk-header`'s margin-bottom: 4mm.
      headerGap: "1mm",
      orderNumberSize: "32pt",
      orderNumberWeight: "900",
      orderMetaSize: "12pt",
      orderMetaWeight: "800",

      itemQtySize: "18pt",
      itemQtyWeight: "900",
      itemNameSize: "13pt",
      itemNameWeight: "800",
      itemNameArSize: "10pt",
      // ← NEW: gap between an item's name and its Arabic translation
      //   (within the same item). Was hardcoded to 0.6mm.
      itemDetailGap: "0.3mm",
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