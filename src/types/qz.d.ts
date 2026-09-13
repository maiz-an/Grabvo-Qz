/**
 * Minimal typings for the browser bundle of qz-tray.js loaded from the CDN.
 * Only the surface we actually use is typed.
 */

export interface QzGlobal {
  websocket: {
    isActive(): boolean;
    connect(): Promise<void>;
    disconnect(): Promise<void>;
  };
  printers: {
    find(query?: string): Promise<string[]>;
  };
  security: {
    setCertificatePromise(
      cb: (resolve: (v: string) => void, reject: (e: unknown) => void) => void
    ): void;
    setSignaturePromise(
      cb: (
        toSign: string
      ) => (resolve: (v: string) => void, reject: (e: unknown) => void) => void
    ): void;
    setSignatureAlgorithm(alg: string): void;
  };
  configs: {
    create(printer: string, opts?: Record<string, unknown>): unknown;
  };
  print(config: unknown, data: unknown[]): Promise<unknown>;
}

declare global {
  interface Window {
    qz?: QzGlobal;
  }
}

export {};