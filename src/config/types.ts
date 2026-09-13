export interface RawPrinterOptions {
  /** ESC/POS is the near-universal command language for 80mm thermal
   *  receipt/kitchen printers — virtually every brand (Epson, Star,
   *  Xprinter, Rongta, Citizen, generic clones...) implements it the
   *  same way. Only change this if a specific printer needs a
   *  different language (e.g. "ZPL", "EPL", "CPCL"). */
  language: string;
  /** How QZ turns the rendered receipt into black/white pixels before
   *  it ever reaches the printer. "luma" = standard grayscale
   *  brightness thresholding — the predictable, standard choice for
   *  plain black-on-white text/lines content like a receipt. */
  quantization: "alpha" | "black" | "luma" | "dither";
  /** The 0–255 cutoff used by `quantization` to decide black vs.
   *  white. Lower = more pixels turn black (bolder/darker output),
   *  higher = fewer (lighter output). 128 is the balanced default. */
  threshold: number;
  /** ESC/POS raster resolution. "single" is supported by every
   *  ESC/POS printer ever made — the safest, most universally
   *  compatible choice. "double" looks sharper but isn't guaranteed
   *  on older/cheaper clones, so only raise it if every printer in
   *  use is confirmed to support it. */
  dotDensity: "single" | "double" | "triple" | "single-legacy" | "double-legacy";
  /** The ESC/POS raster command used to send the image. "gs_v_0" is
   *  the modern, single-block raster command supported by essentially
   *  all ESC/POS printers made in the last ~15 years, and avoids the
   *  banding/seam issues the older strip-based "esc_asterisk" method
   *  can show on lower-quality firmware. */
  imageEncoding: "esc_asterisk" | "gs_l" | "gs_v_0";
  /** Bypasses the Windows/macOS printer driver entirely and writes
   *  ESC/POS bytes straight to the device. This is what actually
   *  removes the driver from the equation — keep this on unless a
   *  specific printer's driver is known to need the OS's own raw
   *  pass-through instead. */
  forceRaw: boolean;
}

export interface PixelPrinterOptions {
  /** Fallback path only (see PrinterConfig.mode) — same meaning as
   *  before: forces one deterministic black/white conversion instead
   *  of leaving it to the driver. */
  colorType: "blackwhite" | "grayscale" | "color";
  /** Fallback path only — "nearest-neighbor" keeps edges crisp. */
  interpolation: "nearest-neighbor" | "bilinear" | "bicubic";
}

export interface PrinterConfig {
  density: number;
  widthMm: number;
  /**
   * "raw" (the default) talks directly to the printer's own ESC/POS
   * firmware, completely bypassing the OS printer driver. Every
   * ESC/POS-compliant printer interprets the exact same bytes the
   * exact same way, so this is what makes every printer/driver
   * combination print identically — no more "this one has too much
   * spacing", "this one hides the right edge", "this one is blurry".
   *
   * "pixel" is the old approach (renders via the OS driver) — keep it
   * only as a fallback for a printer that does NOT speak ESC/POS,
   * e.g. testing against "Microsoft Print to PDF" or a regular
   * laser/inkjet printer. Non-thermal printers can't run ESC/POS.
   */
  mode: "raw" | "pixel";
  raw: RawPrinterOptions;
  pixel: PixelPrinterOptions;
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

  orderLineSize: string;

  metaSize: string;
  smallMetaSize: string;
  rowSpacing: string;

  itemNameSize: string;
  itemNameArSize: string;
  itemMetaSize: string;
  itemPadding: string;
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

  orderNumberSize: string;
  orderNumberWeight: string;
  orderMetaSize: string;
  orderMetaWeight: string;

  itemQtySize: string;
  itemQtyWeight: string;
  itemNameSize: string;
  itemNameWeight: string;
  itemNameArSize: string;
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