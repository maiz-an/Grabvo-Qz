/**
 * api/sign.ts
 * Pure Node handler — signs with process.env.QZ_PRIVATE_KEY.
 */

import type { IncomingMessage, ServerResponse } from "node:http";
import crypto from "node:crypto";

export default function handler(
  req: IncomingMessage,
  res: ServerResponse
): void {
  /* Parse ?request=... from req.url */
  const url = new URL(req.url ?? "/", "http://localhost");
  const request = url.searchParams.get("request") ?? "";

  if (!request) {
    res.statusCode = 400;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.end("Missing request parameter");
    return;
  }

  const raw = process.env.QZ_PRIVATE_KEY;
  if (!raw) {
    res.statusCode = 500;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.end("QZ_PRIVATE_KEY env var missing");
    return;
  }

  try {
    const key = raw.replace(/\\n/g, "\n");
    const signer = crypto.createSign("RSA-SHA512");
    signer.update(request);
    signer.end();
    const signature = signer.sign(key, "base64");

    res.statusCode = 200;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.end(signature);
  } catch (err) {
    console.error("Signing error:", err);
    res.statusCode = 500;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.end("Signing failed: " + (err as Error).message);
  }
}