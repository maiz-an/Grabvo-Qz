import { receiptConfig } from "@/config/receipt-config";
import {
  ar,
  esc,
  INTER_FONT_FACE,
  kv,
  kvHtml,
  moneyHtml,
  moneyPlain,
  sectionLabel,
  timeOnly
} from "./shared";

/**
 * Build the customer receipt HTML (with prices).
 * Returned as a complete document string — used for both the preview
 * iframe and the print job that goes to QZ Tray.
 *
 * Pass `{ mode: "bill" }` to render the same layout as a "before
 * payment" order receipt instead: no payment section, no BILL banner,
 * and the total is labelled "Payable".
 */
export interface ReceiptOptions {
  mode?: "receipt" | "bill";
}

export function buildReceiptHtml(opts: ReceiptOptions = {}): string {
  const isBill = opts.mode === "bill";
  const C = receiptConfig;
  const S = C.style;
  const B = C.business;
  const O = C.order;
  const CU = C.customer;
  const F = C.footer;
  const LOC = C.locale;
  const BILL = C.bill;

  /* ---------- math ---------- */
  let subtotal = 0;
  let itemCount = 0;
  (C.lineItems || []).forEach((it) => {
    const q = Number(it.qty) || 0;
    const p = Number(it.price) || 0;
    subtotal += q * p;
    itemCount += q;
  });
  const discount = Math.max(0, Number(C.discount) || 0);
  const taxable = Math.max(subtotal - discount, 0);
  const taxRate = Number(C.taxRate) || 0;
  const tax = taxable * taxRate;
  const total = taxable + tax;

  const curEn = (LOC.currency && LOC.currency.en) || C.currency || "";
  const curAr = (LOC.currency && LOC.currency.ar) || "";

  /* ---------- logo ---------- */
  let logoHtml = "";
  if (B.logo) {
    logoHtml = `<img class="logo" src="${esc(B.logo)}" alt="" crossorigin="anonymous">`;
  } else if (S.showLogo) {
    const initials = (B.name || "C")
      .trim()
      .split(/\s+/)
      .map((w) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
    logoHtml = `<div class="logo-mark">${esc(initials)}</div>`;
  }

  /* ---------- header ---------- */
  const contactLines = [B.address, B.phone].filter(Boolean);
  const contactBot = [B.email, B.website].filter(Boolean).join("  ·  ");

  const headerHtml = `
    <header class="header">
      ${logoHtml}
      <div class="biz-name">${esc(B.name || "")}</div>
      ${B.nameAr ? ar(C, B.nameAr, "biz-name-ar") : ""}
      ${B.tagline ? `<div class="biz-tagline">${esc(B.tagline)}</div>` : ""}
      ${
        contactLines.length || contactBot
          ? `
        <div class="biz-contact">
          ${contactLines.map((l) => `<div>${esc(l)}</div>`).join("")}
          ${contactBot ? `<div class="dim">${esc(contactBot)}</div>` : ""}
        </div>`
          : ""
      }
    </header>
  `;

  /* ---------- order — table OR type ---------- */
  const hasOrder = !!(O.number || O.type || O.cashier || O.terminal || O.table);
  const typeCell = O.table ? `Table ${O.table}` : O.type || "";

  const orderHtml = hasOrder
    ? `
    ${sectionLabel("Order")}
    <div class="order-grid">
      <div class="order-cell">${esc(O.number || "")}</div>
      <div class="order-cell right">${esc(typeCell)}</div>
      <div class="order-cell">${esc(O.cashier || "")}</div>
      <div class="order-cell right">${esc(O.terminal || "")}</div>
    </div>`
    : "";

  /* ---------- customer ----------
     Name + phone side by side (name left, phone right — no "Name:"
     label, the position says what it is), then address and email each
     on their own full-width line below. Matches how the Order section
     above it already reads (#0015 / Table 4, no labels either). */
  let customerHtml = "";
  if (CU.name || CU.phone || CU.email || CU.address) {
    const rowHtml =
      CU.name || CU.phone
        ? `
      <div class="customer-row">
        ${CU.name ? `<div class="customer-name">${esc(CU.name)}</div>` : "<div></div>"}
        ${CU.phone ? `<div class="customer-phone">${esc(CU.phone)}</div>` : ""}
      </div>`
        : "";

    customerHtml = `
      ${sectionLabel("Customer")}
      ${rowHtml}
      ${CU.address ? `<div class="customer-line">${esc(CU.address)}</div>` : ""}
      ${CU.email ? `<div class="customer-line">${esc(CU.email)}</div>` : ""}
    `;
  }

  /* ---------- items ---------- */
  const itemsHtml = (C.lineItems || [])
    .map((it) => {
      const q = Number(it.qty) || 0;
      const p = Number(it.price) || 0;
      const note = (it.note || "").trim();

      const nameArHtml = it.nameAr
        ? `<div class="item-name-ar ar-text" dir="rtl" lang="ar">${esc(it.nameAr)}</div>`
        : "";
      const noteHtml = note ? `<div class="item-note">${esc(note)}</div>` : "";

      return `
        <div class="item">
          <div class="item-line">
            <span class="item-name">${esc(it.name || "")}</span>
            <span class="item-price">${moneyHtml(q * p, curEn)}</span>
          </div>
          ${nameArHtml}
          <div class="item-meta">${q} × ${moneyPlain(p)}</div>
          ${noteHtml}
        </div>`;
    })
    .join("");

  const itemsSection = `
    ${sectionLabel("Items")}
    <div class="items">${itemsHtml || `<div class="empty">No items</div>`}</div>
  `;

  /* ---------- totals ---------- */
  const subtotalEn = (LOC.subtotal && LOC.subtotal.en) || "Subtotal";
  const subtotalAr = (LOC.subtotal && LOC.subtotal.ar) || "";

  let totalsInner = `
    ${kvHtml(subtotalEn, moneyHtml(subtotal, curEn))}
    ${subtotalAr ? ar(C, subtotalAr, "totals-ar") : ""}
  `;
  if (discount > 0) totalsInner += kvHtml("Discount", "−" + moneyHtml(discount, curEn));
  if (tax > 0)
    totalsInner += kvHtml(
      `Tax ${(taxRate * 100).toFixed(2)}%`,
      moneyHtml(tax, curEn)
    );

  // Order receipts (mode: "bill") show "Payable" instead of "TOTAL".
  // No "AMOUNT DUE" / "BILL" banner is rendered for order receipts.
  const totalEn = isBill
    ? "Payable"
    : (LOC.total && LOC.total.en) || "TOTAL";
  const totalAr = isBill ? "" : (LOC.total && LOC.total.ar) || "";
  const grandArHtml = ar(C, totalAr, "grand-arabic");

  const totalsSection = `
    <div class="totals">${totalsInner}</div>
    <div class="grand">
      <div class="grand-left">
        <div class="grand-label">${esc(totalEn)}</div>
        ${grandArHtml}
      </div>
      <div class="grand-value">
        <div>${moneyHtml(total, curEn)}</div>
        ${curAr ? `<div class="grand-cur-ar ar-text" dir="rtl" lang="ar">${esc(curAr)}</div>` : ""}
      </div>
    </div>
  `;

  /* ---------- payment (never shown on a pre-payment order receipt) ---------- */
  const payTime = timeOnly(O.payTime || O.printTime || O.orderTime || "");
  const payLabel = payTime ? `Payment · ${payTime}` : "Payment";

  const paymentsList =
    Array.isArray(O.payments) && O.payments.length ? O.payments : null;

  let paymentHtml = "";
  if (isBill) {
    paymentHtml = "";
  } else if (paymentsList) {
    const rows = paymentsList
      .map((p) => kvHtml(p.method || "", moneyHtml(Number(p.amount) || 0, curEn)))
      .join("");
    const itemLine = itemCount
      ? `<div class="order-sub">${itemCount} item${itemCount === 1 ? "" : "s"}</div>`
      : "";
    paymentHtml = `${sectionLabel(payLabel)}${rows}${itemLine}`;
  } else {
    const legacyBits = [
      O.payment,
      itemCount ? `${itemCount} item${itemCount === 1 ? "" : "s"}` : ""
    ]
      .filter(Boolean)
      .join("  ·  ");
    paymentHtml = legacyBits
      ? `${sectionLabel(payLabel)}<div class="order-line">${esc(legacyBits)}</div>`
      : "";
  }

  /* ---------- reference ---------- */
  const refRows: Array<[string, string]> = (
    [
      ["Bill No.", O.billNo],
      ["Order ID", O.orderId],
      ["Order Time", O.orderTime],
      ["Print Time", O.printTime]
    ] as Array<[string, string]>
  ).filter((r) => r[1]);

  const referenceHtml = refRows.length
    ? `${sectionLabel("Reference")}${refRows
        .map((r) => kv(r[0], r[1], "small"))
        .join("")}`
    : "";

  /* ---------- footer ---------- */
  const thanksEn = isBill ? "" : F.thanks || "";
  const lineEn = isBill ? "" : F.line2 || "";
  const policyEn = isBill ? "" : F.returnPolicy || "";
  const thanksAr = isBill ? "" : (LOC.thanks && LOC.thanks.ar) || "";
  const visitAr = isBill ? "" : (LOC.visitAgain && LOC.visitAgain.ar) || "";
  const policyAr = isBill ? "" : (LOC.returnNote && LOC.returnNote.ar) || "";

  const billNoteHtml = isBill
    ? `
      ${BILL.footer.note ? `<div class="thanks">${esc(BILL.footer.note)}</div>` : ""}
      ${ar(C, BILL.footer.noteAr, "thanks-ar")}
    `
    : "";

  const footerHtml = `
    <footer class="footer">
      ${billNoteHtml}
      ${thanksEn ? `<div class="thanks">${esc(thanksEn)}</div>` : ""}
      ${ar(C, thanksAr, "thanks-ar")}
      ${lineEn ? `<div class="footer-line">${esc(lineEn)}</div>` : ""}
      ${ar(C, visitAr, "footer-ar")}
      ${policyEn ? `<div class="policy">${esc(policyEn)}</div>` : ""}
      ${ar(C, policyAr, "policy-ar")}
      ${F.powered ? `<div class="powered">${esc(F.powered)}</div>` : ""}
    </footer>
  `;

  /* ---------- final document ---------- */
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${isBill ? "Order Receipt" : "Checkout Receipt"}</title>
<style>${INTER_FONT_FACE}</style>
<style>
  @page { margin: 0; }
  *, *::before, *::after { box-sizing: border-box; }

  html, body {
    margin: 0; padding: 0;
    background: #fff; color: #000;
    overflow: hidden;
  }

  body {
    width: ${S.pageWidth || "76mm"};
    padding:
      ${S.topPadding || "4mm"}
      ${S.paddingRightMm || "2mm"}
      ${S.bottomPadding || "5mm"}
      ${S.paddingLeftMm || "0mm"};

    font-family: ${S.baseFont ||
      "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"};

    font-size:   ${S.baseSize || "9.5pt"};
    line-height: ${S.lineHeight || "1.4"};

    color: #000;
    font-variant-numeric: tabular-nums;
    text-rendering: geometricPrecision;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .ar-text {
    font-family: ${S.arabicFont ||
      "'Tahoma', 'Segoe UI', 'Simplified Arabic', 'Traditional Arabic', 'Noto Naskh Arabic', 'Arial', sans-serif"};
    font-weight: ${S.arabicWeightBody || "600"};
    letter-spacing: 0 !important;
    text-rendering: optimizeLegibility;
  }

  .ar-currency {
    font-size: 0.9em;
    font-weight: ${S.arabicWeightCurrency || "700"};
    color: #333;
  }

  .header { text-align: center; }

  .logo {
    display: block; width: ${S.logoWidth || "16mm"};
    max-height: ${S.logoHeight || "16mm"};
    object-fit: contain;
    margin: 0 auto 2.5mm;
  }
  .logo-mark {
    width: 14mm; height: 14mm; margin: 0 auto 3mm;
    background: #000; color: #fff;
    display: flex; align-items: center; justify-content: center;
    font-size: 12pt; font-weight: 900; letter-spacing: 0.02em;
  }
  .biz-name {
    font-size:   ${S.businessNameSize || "20pt"};
    font-weight: 900;
    letter-spacing: -0.02em;
    line-height: 1.05;
    color: #000;
  }
  .biz-name-ar {
    margin-top: 1.2mm;
    font-size:   ${S.businessNameArSize || "15pt"};
    font-weight: ${S.arabicWeightHead || "700"};
    line-height: 1.3;
    color: #111;
  }
  .biz-tagline {
    margin-top: 1.2mm;
    font-size:   ${S.taglineSize || "7pt"};
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.28em;
    color: #555;
  }
  .biz-contact {
    margin-top: 2.2mm;
    font-size: ${S.contactSize || "7pt"};
    /* ← CHANGED: 500 → 600. Verified against a raster+threshold
       simulation: weight 500 at 7pt drops thin strokes ("t", "i")
       on the actual 1-bit print even though it reads fine on screen. */
    font-weight: 600;
    color: #333;
    line-height: 1.6;
  }
  /* ← CHANGED: #666 → #3a3a3a. On screen #666 reads as "muted gray";
     on a 1-bit thermal threshold (140) it's only ~27% below cutoff, so
     thin 7pt text in that color partially drops out on paper even
     though it looks fine in the preview. Every gray below is the same
     fix for the same reason — de-emphasis on a thermal receipt has to
     come from size/weight, not a lighter color, because there's no
     "light gray" once the printer thresholds it to pure black/white. */
  .biz-contact .dim { color: #3a3a3a; }

  .section-label {
    /* margin-top:    gap ABOVE the title, i.e. between the end of the
       previous section and this title — style.sectionTopGap.
       padding-bottom: gap between the title's letters and the
       underline itself — kept fixed at 1.7mm, this is what stops the
       rule from touching the letters, not really a "gap" to tune.
       margin-bottom: gap BELOW the underline, before the section's
       own content starts (e.g. "ORDER" → "#0015") — style.sectionBottomGap.
       Both gaps now live in receipt-config.ts, nothing to edit here. */
    margin: ${S.sectionTopGap || "4mm"} 0 ${S.sectionBottomGap || "0.9mm"};
    padding-bottom: 1.7mm;
    font-size:   ${S.sectionSize || "7pt"};
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.2em;
    color: #000;
    border-bottom: 1px solid #000;
  }

  .order-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    column-gap: 4mm;
    /* Gap BETWEEN the order-detail rows themselves — e.g. "#0015 /
       Table 4" to "Merry / POS-01" — style.orderRowGap. */
    row-gap: ${S.orderRowGap || "1mm"};
    font-size: ${S.orderLineSize || "9pt"};
    line-height: 1.35;
  }
  .order-cell {
    font-weight: 800;
    color: #000;
    overflow-wrap: anywhere;
  }
  .order-cell.right { text-align: right; }

  .order-line {
    font-size: ${S.orderLineSize || "9pt"};
    font-weight: 700;
    line-height: 1.4;
    color: #000;
  }
  .order-sub {
    margin-top: 0.6mm;
    font-size: ${S.contactSize || "7pt"};
    /* ← CHANGED: 500 → 600, #555 kept (already safely below the print
       threshold). Confirmed with the raster simulation: "4 items" at
       500/7pt printed as "4 lems" — the "t" vanished. */
    font-weight: 600;
    color: #555;
    letter-spacing: 0.02em;
  }

  /* Customer — name left / phone right (no "Name:" label, same
     positional pattern as the Order section above it), address and
     email each their own line underneath. */
  .customer-row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 3mm;
    font-size: ${S.orderLineSize || "9pt"};
  }
  .customer-name {
    font-weight: 800;
    color: #000;
    overflow-wrap: anywhere;
  }
  .customer-phone {
    font-weight: 600;
    color: #333;
    white-space: nowrap;
  }
  .customer-line {
    margin-top: 0.8mm;
    font-size: ${S.smallMetaSize || "8pt"};
    font-weight: 600;
    color: #333;
    overflow-wrap: anywhere;
  }

  .kv {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 3mm;
    margin: ${S.rowSpacing || "1.1mm"} 0;
    font-size: ${S.metaSize || "8.5pt"};
    line-height: 1.35;
  }
  .kv .k { color: #444; font-weight: 500; }
  .kv .v { font-weight: 800; text-align: right; overflow-wrap: anywhere; color: #000; }
  .kv.small { font-size: ${S.smallMetaSize || "7.5pt"}; margin: 0.7mm 0; }
  /* ← CHANGED: 500 → 600, same reasoning as .kv.small .v below — this
     is the smallest text on the receipt ("Order Time", "Print Time"),
     where a stray "T" or colon is most likely to partially vanish. */
  .kv.small .k { color: #555; font-weight: 600; }
  /* ← CHANGED: 600 → 700. Reference values here are digits/IDs at the
     smallest size on the receipt — thin strokes (a "T", a colon) are
     the ones most likely to partially drop out at 1-bit threshold;
     a touch more weight gives them margin to survive. */
  .kv.small .v { font-weight: 700; }

  .totals-ar {
    margin-top: -0.4mm;
    margin-bottom: 0.6mm;
    font-size: ${S.smallArSize || "8pt"};
    font-weight: ${S.arabicWeightSmall || "500"};
    color: #555;
    line-height: 1.3;
    text-align: left;
  }

  /* No margin-top here on purpose — ITEMS' title→content gap should
     behave exactly like every other section's (ORDER, CUSTOMER), both
     driven purely by style.sectionBottomGap. This rule used to add an
     extra fixed 0.5mm on top of that, which is why ITEMS always sat
     with a bigger gap than the others no matter what sectionBottomGap
     was set to. */
  .items { margin-top: 0; }
  .item  { padding: ${S.itemPadding || "2mm"} 0; }

  .item-line {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 3mm;
  }
  .item-name {
    font-size:   ${S.itemNameSize || "10pt"};
    /* ← CHANGED: 800 → 700. Still the heaviest text in the items list
       (name > price > meta/note), just not as heavy-handed. */
    font-weight: 700;
    letter-spacing: -0.005em;
    line-height: 1.25;
    overflow-wrap: anywhere;
    color: #000;
  }
  .item-price {
    font-size: ${S.itemPriceSize || "9pt"};
    font-weight: ${S.itemPriceWeight || "700"};
    white-space: nowrap;
    color: #000;
  }
  .item-name-ar {
    /* Gap between one item-detail line and the next (name → name-ar →
       meta → note, all within the same item) — style.itemDetailGap. */
    margin-top: ${S.itemDetailGap || "0.4mm"};
    font-size: ${S.itemNameArSize || "8pt"};
    font-weight: ${S.arabicWeightItemName || "500"};
    color: #333;
    line-height: 1.3;
    text-align: left;
  }
  .item-meta {
    margin-top: ${S.itemDetailGap || "0.4mm"};
    font-size: ${S.itemMetaSize || "7.5pt"};
    /* ← CHANGED: 500 → 600, same reasoning as .order-sub above. */
    font-weight: 600;
    color: #555;
  }
  .item-note {
    margin-top: ${S.itemDetailGap || "0.4mm"};
    font-size:   ${S.itemNoteSize || "7.5pt"};
    /* ← CHANGED: italic removed, #888 → #333. This was the worst
       offender on paper: a slanted stroke at 7.5pt is almost entirely
       antialiased edge pixels, and #888's luma (136) sits right at the
       threshold (140) — between them, most of the glyph thresholded
       to white and the note came out patchy/broken. Upright + dark
       still reads as "secondary" next to the bold item name above it,
       it just survives the print. Weight bumped 500 → 600 too — same
       thin-stroke dropout confirmed at 500 on other 7.5pt lines. */
    font-weight: 600;
    color: #333;
    line-height: 1.35;
    text-align: left;
    overflow-wrap: anywhere;
  }

  .empty { text-align: center; padding: 3mm 0; color: #333; font-size: 9pt; }

  .totals { margin-top: ${S.subtotalTopGap || "3mm"}; }

  .grand {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 3mm;
    padding: 2.5mm 3mm;
    background: #fff;
    color: #000;
    border: 1.5px solid #000;
  }
  .grand-left {
    display: flex;
    flex-direction: column;
    gap: 0.6mm;
  }
  .grand-label {
    font-size: ${S.grandLabelSize || "11pt"};
    font-weight: 900;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    line-height: 1.1;
  }
  .grand-arabic {
    font-size: ${S.grandArSize || "11pt"};
    font-weight: ${S.arabicWeightGrand || "500"};
    color: #333;
    line-height: 1.3;
  }
  .grand-value {
    text-align: right;
    line-height: 1;
  }
  .grand-value > div:first-child {
    font-size: ${S.grandTotalSize || "16pt"};
    font-weight: 900;
    letter-spacing: -0.015em;
  }
  .grand-value .ar-currency {
    font-size: 0.75em;
    font-weight: ${S.arabicWeightCurrency || "700"};
  }
  .grand-cur-ar {
    margin-top: 0.8mm;
    font-size: ${S.grandArSize || "11pt"};
    font-weight: ${S.arabicWeightGrand || "500"};
    color: #333;
  }

  /* ← CHANGED: margin-top 6mm + padding-top 4mm = 10mm of blank paper
     before "Thank you" even starts — the single biggest source of
     wasted paper on a short receipt. 3mm + 2mm still reads as a clear
     break after the total, without the dead space. */
  .footer {
    margin-top: 3mm;
    padding-top: 2mm;
    border-top: 1px solid #000;
    text-align: center;
  }
  .thanks {
    font-size: ${S.thanksSize || "10pt"};
    font-weight: 800;
    letter-spacing: -0.005em;
    color: #000;
  }
  .thanks-ar {
    margin-top: 1mm;
    font-size: ${S.footerArSize || "9.5pt"};
    font-weight: ${S.arabicWeightBody || "600"};
    color: #111;
    line-height: 1.4;
  }
  .footer-line {
    margin-top: 1.5mm;
    font-size: ${S.footerSize || "7.5pt"};
    /* ← CHANGED: 500 → 600, same reasoning as .order-sub above. */
    font-weight: 600;
    color: #444;
  }
  .footer-ar {
    margin-top: 0.8mm;
    font-size: ${S.footerArSize || "9.5pt"};
    font-weight: ${S.arabicWeightSmall || "500"};
    color: #444;
    line-height: 1.4;
  }
  .policy {
    margin-top: 2mm;
    font-size: ${S.smallFooterSize || "6.8pt"};
    /* ← CHANGED: added explicit font-weight: 600. This had none, so it
       was inheriting the body's normal (400) — the thinnest text on
       the whole receipt, at the smallest size. The raster simulation
       showed it losing whole letters ("Items" → "tems"). */
    font-weight: 600;
    color: #333;
    line-height: 1.5;
  }
  .policy-ar {
    margin-top: 0.8mm;
    font-size: ${S.smallArSize || "8.5pt"};
    font-weight: ${S.arabicWeightSmall || "500"};
    color: #555;
    line-height: 1.5;
  }
  .powered {
    margin-top: 2.5mm;
    font-size: ${S.poweredSize || "6.5pt"};
    font-weight: 800;
    letter-spacing: 0.24em;
    /* ← CHANGED: #999's luma (153) is past the threshold (140)
       already — this line was printing essentially blank. */
    color: #333;
  }
</style>
</head>
<body>

  ${headerHtml}
  ${orderHtml}
  ${customerHtml}
  ${itemsSection}
  ${totalsSection}
  ${paymentHtml}
  ${referenceHtml}
  ${footerHtml}

</body>
</html>`;
}