import { receiptConfig } from "@/config/receipt-config";
import { esc, timeOnly } from "./shared";

export interface TicketOptions {
  label?: string;
  /** "cancellation" renders a void/cancellation receipt instead of a KOT. */
  mode?: "kot" | "cancellation";
  /** Cancellation reason — falls back to order.notes, then config.cancellation.reason. */
  reason?: string;
}

/**
 * Build the order ticket HTML (KOT / BOT / any prep station).
 * No prices. Big quantity markers. Per-item notes as callouts.
 *
 * Pass `{ mode: "cancellation" }` to render a cancellation receipt
 * instead: same item list, struck-through names, a "please discard"
 * banner, a reason box, and a "do not prepare" footer.
 */
export function buildTicketHtml(opts: TicketOptions = {}): string {
  const isCancellation = opts.mode === "cancellation";
  const C = receiptConfig;
  const CX = C.cancellation;
  const T = C.ticket;
  const TS = T.style;
  const TL = T.labels;
  const TH = T.header;
  const O = C.order;
  const LOC = C.locale;

  /* ---------- items ---------- */
  const items = Array.isArray(C.lineItems) ? [...C.lineItems] : [];
  if (T.sortItemsByName) {
    items.sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
  }
  const totalQty = items.reduce((n, it) => n + (Number(it.qty) || 0), 0);

  /* ---------- header ---------- */
  const badgeLabel = String(
    opts.label || (isCancellation ? CX.header.label : TH.label) || (isCancellation ? "CANCELLED" : "KOT")
  ).toUpperCase();
  const orderNumber = O.number || O.orderId || "";

  const typeBits = [
    O.type,
    O.table ? `${TL.table} ${O.table}` : ""
  ].filter(Boolean);

  const metaBits = [O.cashier, O.terminal, timeOnly(O.orderTime)].filter(Boolean);

  const headerHtml = `
    <header class="tk-header">
      <div class="tk-badge">${esc(badgeLabel)}</div>
      ${orderNumber ? `<div class="tk-order-num">${esc(orderNumber)}</div>` : ""}
      ${typeBits.length ? `<div class="tk-order-type">${esc(typeBits.join(" · "))}</div>` : ""}
      ${metaBits.length ? `<div class="tk-order-meta">${esc(metaBits.join(" · "))}</div>` : ""}
    </header>
  `;

  /* ---------- cancellation warning banner ---------- */
  // The big banner now shows the discard notice; the "do not prepare"
  // warning was moved down to the footer.
  const cancelWarningHtml = isCancellation
    ? `<div class="tk-cancel-warn">${esc(CX.labels.footer || "Please discard this ticket")}</div>`
    : "";

  /* ---------- items ---------- */
  const itemsHtml = items.length
    ? items
        .map((it) => {
          const qty = Number(it.qty) || 0;
          const name = it.name || "";
          const nameAr = it.nameAr || "";
          const note = (it.note || "").trim();

          const nameArHtml =
            LOC.showArabic && nameAr
              ? `<div class="tk-item-name-ar ar-text" dir="rtl" lang="ar">${esc(nameAr)}</div>`
              : "";
          const noteHtml = note ? `<div class="tk-item-note">${esc(note)}</div>` : "";

          return `
            <div class="tk-item${isCancellation ? " tk-item-void" : ""}">
              ${qty ? `<div class="tk-qty">${esc(qty)}&times;</div>` : `<div class="tk-qty">·</div>`}
              <div class="tk-item-body">
                <div class="tk-item-name">${esc(name)}</div>
                ${nameArHtml}
                ${noteHtml}
              </div>
            </div>`;
        })
        .join("")
    : `<div class="tk-empty">No items</div>`;

  /* ---------- notes / reason box ---------- */
  const notesLabel = isCancellation ? CX.labels.reason || "Reason" : TL.notes || "Special instructions";
  const notesText = isCancellation
    ? String(opts.reason || O.notes || CX.reason || "").trim()
    : String(O.notes || T.notes || "").trim();
  const notesHtml = notesText
    ? `
    <div class="tk-notes">
      <div class="tk-notes-label">${esc(notesLabel)}</div>
      <div class="tk-notes-body">${esc(notesText)}</div>
    </div>`
    : "";

  /* ---------- footer ---------- */
  const footerCount = totalQty ? `${totalQty} ${TL.items || "items"}` : "";
  // For cancellations: "do not prepare" warning lives in the footer now.
  const footerThanks = isCancellation
    ? CX.labels.warning || "Do not prepare or serve these items"
    : TL.footer || "Please prepare as ordered";
  const footerPowered = isCancellation
    ? CX.labels.powered || (C.footer && C.footer.powered) || ""
    : TL.powered || (C.footer && C.footer.powered) || "";

  const footerHtml = `
    <footer class="tk-footer">
      ${footerCount ? `<div class="tk-footer-count">${esc(footerCount)}</div>` : ""}
      <div class="tk-footer-thanks">${esc(footerThanks)}</div>
      ${footerPowered ? `<div class="tk-footer-powered">${esc(footerPowered)}</div>` : ""}
    </footer>
  `;

  /* ---------- final document ---------- */
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${isCancellation ? "Cancellation Receipt" : "Preparation Receipt"}</title>
<style>
  @page { margin: 0; }
  *, *::before, *::after { box-sizing: border-box; }

  html, body {
    margin: 0; padding: 0;
    background: #fff; color: #000;
    overflow: hidden;
  }

  body {
    width: ${TS.pageWidth || "76mm"};
    padding:
      ${TS.topPadding || "5mm"}
      ${TS.paddingRightMm || "4mm"}
      ${TS.bottomPadding || "5mm"}
      ${TS.paddingLeftMm || "0mm"};

    font-family: ${TS.baseFont || "'Segoe UI', 'Helvetica Neue', Inter, sans-serif"};
    font-size:   ${TS.baseSize || "11pt"};
    line-height: ${TS.lineHeight || "1.35"};
    color: #000;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .ar-text {
    font-family: 'Tahoma', 'Segoe UI', 'Traditional Arabic', 'Noto Naskh Arabic', sans-serif;
    font-weight: 500;
    letter-spacing: 0 !important;
    text-rendering: optimizeLegibility;
  }

  .tk-header {
    padding-bottom: 3.5mm;
    border-bottom: 2px solid #000;
    margin-bottom: 4mm;
  }

  .tk-badge {
    display: inline-block;
    padding: 1.2mm 3mm;
    background: #000;
    color: #fff;
    font-size:   ${TS.badgeSize || "10pt"};
    font-weight: 900;
    letter-spacing: 0.24em;
    line-height: 1;
  }

  .tk-order-num {
    margin-top: 3mm;
    font-size:   ${TS.orderNumberSize || "32pt"};
    font-weight: ${TS.orderNumberWeight || "900"};
    line-height: 0.95;
    letter-spacing: -0.025em;
    color: #000;
    word-break: break-word;
  }

  .tk-order-type {
    margin-top: 2.5mm;
    font-size:   ${TS.orderMetaSize || "12pt"};
    font-weight: ${TS.orderMetaWeight || "800"};
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: #000;
    line-height: 1.25;
  }

  .tk-order-meta {
    margin-top: 1.2mm;
    font-size:   8.5pt;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #333;
    line-height: 1.35;
  }

  .tk-items { margin-bottom: 1mm; }

  .tk-cancel-warn {
    margin: 0 0 4mm;
    padding: 2.5mm 3mm;
    border: 2px solid #000;
    background: #000;
    color: #fff;
    text-align: center;
    font-size: 11pt;
    font-weight: 900;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    line-height: 1.3;
  }

  .tk-item-void {
    border-left: 2.5px solid #000;
    padding-left: 2.5mm;
  }
  .tk-item-void .tk-item-name {
    text-decoration: line-through;
    text-decoration-thickness: 1.5px;
  }

  .tk-item {
    display: flex;
    align-items: flex-start;
    gap: 3.5mm;
    padding: ${TS.itemPadding || "3mm"} 0;
    ${TS.itemDivider !== "" ? "border-bottom: " + (TS.itemDivider || "1px dashed #999") + ";" : ""}
  }
  .tk-item:last-child { border-bottom: 0; }

  .tk-qty {
    flex: 0 0 auto;
    min-width: 11mm;
    font-size:   ${TS.itemQtySize || "18pt"};
    font-weight: ${TS.itemQtyWeight || "900"};
    line-height: 1;
    letter-spacing: -0.02em;
    text-align: right;
    color: #000;
  }

  .tk-item-body {
    flex: 1 1 auto;
    min-width: 0;
  }

  .tk-item-name {
    font-size:   ${TS.itemNameSize || "13pt"};
    font-weight: ${TS.itemNameWeight || "800"};
    line-height: 1.15;
    letter-spacing: 0.005em;
    text-transform: ${T.uppercaseItems === false ? "none" : "uppercase"};
    overflow-wrap: anywhere;
    color: #000;
  }

  .tk-item-name-ar {
    margin-top: 0.6mm;
    font-size: ${TS.itemNameArSize || "10pt"};
    font-weight: 500;
    color: #777;
    line-height: 1.3;
    text-align: left;
  }

  .tk-item-note {
    margin-top: 1.6mm;
    padding: 0.8mm 0 0.8mm 2.5mm;
    border-left: 2.5px solid #000;
    font-size:   ${TS.itemNoteSize || "10pt"};
    font-weight: 700;
    line-height: 1.4;
    color: #000;
    overflow-wrap: anywhere;
  }

  .tk-empty {
    text-align: center;
    padding: 4mm 0;
    color: #999;
    font-size: 10pt;
  }

  .tk-notes {
    margin-top: 4mm;
    padding: 3mm 3.5mm;
    border: 1.5px solid #000;
  }
  .tk-notes-label {
    font-size:   ${TS.notesLabelSize || "9pt"};
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.2em;
    margin-bottom: 1.8mm;
    color: #000;
  }
  .tk-notes-body {
    font-size:   ${TS.notesBodySize || "11pt"};
    font-weight: 700;
    line-height: 1.4;
    white-space: pre-wrap;
    color: #000;
  }

  .tk-footer {
    margin-top: 5mm;
    padding-top: 3.5mm;
    border-top: 1.5px solid #000;
    text-align: center;
  }
  .tk-footer-count {
    font-size:   8.5pt;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.18em;
    color: #333;
  }
  .tk-footer-thanks {
    margin-top: 2mm;
    font-size:   ${TS.thanksSize || "11pt"};
    font-weight: 800;
    letter-spacing: 0.02em;
    color: #000;
  }
  .tk-footer-powered {
    margin-top: 3mm;
    font-size:   ${TS.poweredSize || "7pt"};
    font-weight: 800;
    letter-spacing: 0.24em;
    text-transform: uppercase;
    color: #999;
  }
</style>
</head>
<body>

  ${headerHtml}

  ${cancelWarningHtml}

  <div class="tk-items">${itemsHtml}</div>

  ${notesHtml}

  ${footerHtml}

</body>
</html>`;
}