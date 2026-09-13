export const LS_KEYS = {
  receipt: "qz.receipt.printer",
  ticket: "qz.ticket.printer"
} as const;

export type PrinterKind = keyof typeof LS_KEYS;

export function readPrinter(kind: PrinterKind): string {
  try {
    return localStorage.getItem(LS_KEYS[kind]) || "";
  } catch {
    return "";
  }
}

export function writePrinter(kind: PrinterKind, name: string): void {
  try {
    if (name) localStorage.setItem(LS_KEYS[kind], name);
    else localStorage.removeItem(LS_KEYS[kind]);
  } catch {
    /* ignore */
  }
}