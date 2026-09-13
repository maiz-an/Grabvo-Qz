/**
 * api/cert.ts
 * Pure Node handler — no Express methods, no @vercel/node runtime deps.
 */

import type { IncomingMessage, ServerResponse } from "node:http";

export default function handler(
  _req: IncomingMessage,
  res: ServerResponse
): void {
  const raw = process.env.QZ_CERTIFICATE;

  if (!raw) {
    res.statusCode = 500;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.end("QZ_CERTIFICATE env var missing");
    return;
  }

  /* Support both real newlines and literal "\n" */
  const cert = raw.replace(/\\n/g, "\n");

  res.statusCode = 200;
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.end(cert);
}