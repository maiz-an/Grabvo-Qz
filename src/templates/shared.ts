import type { ReceiptConfig } from "@/config/types";

export const esc = (s: unknown): string =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

export const moneyPlain = (n: unknown): string =>
  (Math.round((Number(n) || 0) * 100) / 100).toFixed(2);

export const moneyHtml = (n: unknown, cur: string): string => {
  const v = moneyPlain(n);
  if (!cur) return v;
  const isArabic = /[\u0600-\u06FF]/.test(cur);
  if (isArabic) {
    return `${v} <span class="ar-currency ar-text" dir="rtl" lang="ar">${esc(cur)}</span>`;
  }
  return `${v} ${esc(cur)}`;
};

/** "30/06/2026 10:55 AM" → "10:55 AM" */
export const timeOnly = (str: string): string => {
  if (!str) return "";
  const m = String(str).match(/(\d{1,2}:\d{2}\s*(?:AM|PM)?)/i);
  return m ? m[1] : str;
};

export const kv = (label: string, value: string, cls = ""): string => {
  if (value == null || value === "") return "";
  return `
    <div class="kv ${cls}">
      <span class="k">${esc(label)}</span>
      <span class="v">${esc(value)}</span>
    </div>`;
};

export const kvHtml = (label: string, valueHtml: string, cls = ""): string => {
  if (valueHtml == null || valueHtml === "") return "";
  return `
    <div class="kv ${cls}">
      <span class="k">${esc(label)}</span>
      <span class="v">${valueHtml}</span>
    </div>`;
};

export const sectionLabel = (text: string): string => {
  if (!text) return "";
  return `<div class="section-label">${esc(text)}</div>`;
};

export const ar = (config: ReceiptConfig, text: string, cls = ""): string => {
  const L = config.locale;
  if (!L.showArabic || !text) return "";
  return `<div class="${cls} ar-text" dir="rtl" lang="ar">${esc(text)}</div>`;
};