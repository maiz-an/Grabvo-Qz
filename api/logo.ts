import type { IncomingMessage, ServerResponse } from "node:http";

export default async function handler(
  _req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  const logoUrl = process.env.LOGO_URL;
  if (!logoUrl) {
    res.statusCode = 404;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.end("");
    return;
  }

  try {
    const r = await fetch(logoUrl);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const buf = Buffer.from(await r.arrayBuffer());

    res.statusCode = 200;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.end(buf.toString("base64"));
  } catch (err) {
    console.error("Logo error:", err);
    res.statusCode = 500;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.end("");
  }
}