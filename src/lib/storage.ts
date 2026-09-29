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

/* -----------------------------------------------------------------
 * Connection mode — "direct" (existing QZ Tray behavior, unchanged)
 * vs "agent" (transport print jobs through a GrabvoPrintPing agent
 * on the LAN instead of connecting to QZ Tray from the browser).
 *
 * New, additive keys — nothing here touches LS_KEYS above.
 * ----------------------------------------------------------------- */
export type ConnectionMode = "direct" | "agent";

const CONNECTION_LS_KEYS = {
  mode: "qz.connection.mode",
  agentUrl: "qz.connection.agentUrl"
} as const;

export function readConnectionMode(): ConnectionMode {
  try {
    const v = localStorage.getItem(CONNECTION_LS_KEYS.mode);
    return v === "agent" ? "agent" : "direct";
  } catch {
    return "direct";
  }
}

export function writeConnectionMode(mode: ConnectionMode): void {
  try {
    localStorage.setItem(CONNECTION_LS_KEYS.mode, mode);
  } catch {
    /* ignore */
  }
}

export function readAgentUrl(): string {
  try {
    return localStorage.getItem(CONNECTION_LS_KEYS.agentUrl) || "";
  } catch {
    return "";
  }
}

export function writeAgentUrl(url: string): void {
  try {
    if (url) localStorage.setItem(CONNECTION_LS_KEYS.agentUrl, url);
    else localStorage.removeItem(CONNECTION_LS_KEYS.agentUrl);
  } catch {
    /* ignore */
  }
}

/** Strips a trailing slash so callers can safely do `${base}/print`. */
export function normalizeAgentUrl(url: string): string {
  return url.trim().replace(/\/+$/, "");
}
