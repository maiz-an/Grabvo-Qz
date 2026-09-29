/* -----------------------------------------------------------------
 * New in this update: CutConfig
 * -----------------------------------------------------------------
 * ESC/POS paper cutter support. On a printer with a built-in cutter
 * (nearly every 80mm thermal POS printer has one), the standard
 * sequence is:
 *
 *   ESC d n   →  1B 64 n   feed n lines before cutting
 *   GS  V m   →  1D 56 m   cut (m=0 or 48 full, m=1 or 49 partial)
 *
 * Without the feed, the cutter blade lands mid-line and slices the
 * last printed row in half. 3 lines is a safe default — enough to
 * clear the blade on every printer we've tested. Set to 0 to disable
 * the feed (rarely what you want).
 * ----------------------------------------------------------------- */
export interface CutConfig {
  enabled: boolean;
  /** "full" = complete cut, "partial" = leaves a small tab so the
   *  receipt hangs from the printer and is easy to tear off cleanly. */
  type: "full" | "partial";
  /** Number of blank lines fed before the cut (0–255). */
  feedLines: number;
}

export interface RawPrinterOptions {
  language: string;
  quantization: "alpha" | "black" | "luma" | "dither";
  threshold: number;
  dotDensity: "single" | "double" | "triple" | "single-legacy" | "double-legacy";
  imageEncoding: "esc_asterisk" | "gs_l" | "gs_v_0";
  forceRaw: boolean;
}

export interface PixelPrinterOptions {
  colorType: "blackwhite" | "grayscale" | "color";
  interpolation: "nearest-neighbor" | "bilinear" | "bicubic";
}

export interface PrinterConfig {
  density: number;

  /**
   * IMPORTANT — this is the PRINTABLE width, not the paper width.
   *
   * 80mm thermal paper has a printhead that only reaches the middle
   * ~72mm of it. If you rasterize at 80mm, the printer receives data
   * for the full 80mm but can only physically print the first 72mm —
   * which clips the right edge of your content by ~4mm.
   *
   * Set this to the physical printable width (72 for standard 80mm
   * printers, 48 for 58mm printers) and the raster will map 1:1 to
   * the printhead, so nothing is ever clipped.
   */
  widthMm: number;

  mode: "raw" | "pixel";
  raw: RawPrinterOptions;
  pixel: PixelPrinterOptions;

  /** Paper cutter. Ignored if the printer has no cutter. */
  cut: CutConfig;
}

export interface BusinessConfig {
  name: string;
  nameAr: string;
  tagline: string;
  logo: string;
  address: string;
  phone: string;
  email: string;
  website: string;
}

export interface LocaleStringPair {
  en: string;
  ar: string;
}

export interface LocaleConfig {
  showArabic: boolean;
  currency: LocaleStringPair;
  subtotal: LocaleStringPair;
  total: LocaleStringPair;
  thanks: LocaleStringPair;
  visitAgain: LocaleStringPair;
  returnNote: LocaleStringPair;
}

export interface ReceiptStyleConfig {
  baseFont: string;
  baseSize: string;
  lineHeight: string;

  pageWidth: string;
  paddingLeftMm: string;
  paddingRightMm: string;
  topPadding: string;
  bottomPadding: string;

  arabicFont: string;

  itemPriceSize: string;
  itemPriceWeight: string;
  arabicWeightHead: string;
  arabicWeightBody: string;
  arabicWeightCurrency: string;
  arabicWeightGrand: string;
  arabicWeightItemName: string;
  arabicWeightSmall: string;

  businessNameSize: string;
  businessNameArSize: string;
  taglineSize: string;
  contactSize: string;
  logoWidth: string;
  logoHeight: string;
  showLogo: boolean;

  sectionSize: string;
  sectionTopGap: string;
  sectionBottomGap: string;

  orderLineSize: string;
  orderRowGap: string;

  metaSize: string;
  smallMetaSize: string;
  rowSpacing: string;

  itemNameSize: string;
  itemNameArSize: string;
  itemMetaSize: string;
  itemPadding: string;
  itemDetailGap: string;
  itemNoteSize: string;

  subtotalTopGap: string;

  grandLabelSize: string;
  grandArSize: string;
  grandTotalSize: string;

  thanksSize: string;
  footerArSize: string;
  smallArSize: string;
  footerSize: string;
  smallFooterSize: string;
  poweredSize: string;
}

export interface PaymentRow {
  method: string;
  amount: number;
}

export interface OrderConfig {
  type: string;
  number: string;
  cashier: string;
  terminal: string;
  table: string;
  notes: string;
  payment: string;
  payments: PaymentRow[];
  billNo: string;
  orderId: string;
  payTime: string;
  orderTime: string;
  printTime: string;
}

export interface CustomerConfig {
  name: string;
  phone: string;
  email: string;
  address: string;
}

export interface LineItem {
  name: string;
  nameAr?: string;
  qty: number;
  price: number;
  note?: string;
}

export interface FooterConfig {
  thanks: string;
  line2: string;
  returnPolicy: string;
  powered: string;
}

export interface TicketLabels {
  table: string;
  server: string;
  items: string;
  notes: string;
  footer: string;
  powered: string;
}

export interface TicketStyleConfig {
  pageWidth: string;
  paddingLeftMm: string;
  paddingRightMm: string;
  topPadding: string;
  bottomPadding: string;

  baseFont: string;
  baseSize: string;
  lineHeight: string;

  badgeSize: string;
  headerGap: string;

  orderNumberSize: string;
  orderNumberWeight: string;
  orderMetaSize: string;
  orderMetaWeight: string;

  itemQtySize: string;
  itemQtyWeight: string;
  itemNameSize: string;
  itemNameWeight: string;
  itemNameArSize: string;
  itemDetailGap: string;
  itemNoteSize: string;
  itemPadding: string;
  itemDivider: string;

  notesLabelSize: string;
  notesBodySize: string;
  thanksSize: string;
  poweredSize: string;
}

export interface TicketConfig {
  header: { label: string };
  labels: TicketLabels;
  sortItemsByName: boolean;
  uppercaseItems: boolean;
  notes: string;
  style: TicketStyleConfig;
}

export interface BillHeaderConfig {
  label: string;
  note: string;
}

export interface BillLabels {
  amountDue: LocaleStringPair;
}

export interface BillFooterConfig {
  note: string;
  noteAr: string;
}

export interface BillConfig {
  header: BillHeaderConfig;
  labels: BillLabels;
  footer: BillFooterConfig;
}

export interface CancellationLabels {
  reason: string;
  items: string;
  footer: string;
  powered: string;
  warning: string;
}

export interface CancellationConfig {
  header: { label: string };
  labels: CancellationLabels;
  reason: string;
}

export interface ReceiptConfig {
  printer: PrinterConfig;
  business: BusinessConfig;
  locale: LocaleConfig;
  style: ReceiptStyleConfig;
  order: OrderConfig;
  customer: CustomerConfig;
  lineItems: LineItem[];
  currency: string;
  discount: number;
  taxRate: number;
  footer: FooterConfig;
  ticket: TicketConfig;
  bill: BillConfig;
  cancellation: CancellationConfig;
}