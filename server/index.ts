/**
 * Grabvo-Qz — local Express server
 * Reads config from .env.local
 */

import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");

dotenv.config({ path: path.join(ROOT, ".env.local") });

import express, { type Request, type Response, type NextFunction } from "express";
import crypto from "node:crypto";
import fs from "node:fs";

const DIST_DIR = path.join(ROOT, "dist");
const CERTS_DIR = path.join(ROOT, "certs");

const PORT = Number(process.env.PORT) || 3000;
const NODE_ENV = process.env.NODE_ENV || "development";
const IS_PROD = NODE_ENV === "production";

const CERT_FILE =
  process.env.QZ_CERT_FILE || path.join(CERTS_DIR, "digital-certificate.txt");
const PRIVATE_KEY_FILE =
  process.env.QZ_PRIVATE_KEY_FILE || path.join(CERTS_DIR, "private-key.pem");
const LOGO_URL = process.env.LOGO_URL || "";

const app = express();
app.disable("x-powered-by");

const CORS_ORIGIN =
  process.env.CORS_ORIGIN || (IS_PROD ? "" : "http://localhost:5173");

app.use((_req: Request, res: Response, next: NextFunction) => {
  if (CORS_ORIGIN) {
    res.header("Access-Control-Allow-Origin", CORS_ORIGIN);
    res.header("Vary", "Origin");
  }
  res.header("Access-Control-Allow-Headers", "Content-Type");
  res.header("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  next();
});

app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

app.get("/digital-certificate.txt", (_req: Request, res: Response) => {
  try {
    const cert = fs.readFileSync(CERT_FILE, "utf8");
    res.type("text/plain").send(cert);
  } catch (error) {
    console.error("Certificate error:", (error as Error).message);
    res
      .status(500)
      .type("text/plain")
      .send(
        "digital-certificate.txt not found. See README.md → " +
          "'Generate your own certificate (free)' to create one."
      );
  }
});

app.get("/sign-message", (req: Request, res: Response) => {
  try {
    const request = String(req.query.request ?? "");
    if (!request) {
      return res.status(400).type("text/plain").send("Missing request parameter");
    }

    const privateKey = fs.readFileSync(PRIVATE_KEY_FILE, "utf8");
    const signer = crypto.createSign("RSA-SHA512");
    signer.update(request);
    signer.end();
    const signature = signer.sign(privateKey, "base64");

    res.type("text/plain").send(signature);
  } catch (error) {
    console.error("Signing error:", (error as Error).message);
    res
      .status(500)
      .type("text/plain")
      .send(
        "Failed to sign QZ request. Is private-key.pem present in /certs? " +
          "See README.md → 'Generate your own certificate (free)'."
      );
  }
});

app.get("/logo-base64", async (_req: Request, res: Response) => {
  if (!LOGO_URL) return res.status(404).type("text/plain").send("");
  try {
    const response = await fetch(LOGO_URL);
    if (!response.ok) throw new Error(`Logo request failed: ${response.status}`);
    const buffer = Buffer.from(await response.arrayBuffer());
    res.type("text/plain").send(buffer.toString("base64"));
  } catch (error) {
    console.error("Logo error:", (error as Error).message);
    res.status(500).type("text/plain").send("");
  }
});

if (fs.existsSync(DIST_DIR)) {
  app.use(
    "/assets",
    express.static(path.join(DIST_DIR, "assets"), {
      immutable: true,
      maxAge: "1y"
    })
  );
  app.use(express.static(DIST_DIR, { maxAge: IS_PROD ? "1h" : 0 }));

  app.get("/*splat", (req: Request, res: Response, next: NextFunction) => {
    if (
      req.path.startsWith("/digital-certificate.txt") ||
      req.path.startsWith("/sign-message") ||
      req.path.startsWith("/logo-base64") ||
      req.path.startsWith("/assets")
    ) {
      return next();
    }
    res.sendFile(path.join(DIST_DIR, "index.html"), (err) => {
      if (err) next(err);
    });
  });
}

app.use((req: Request, res: Response) => {
  res.status(404).type("text/plain").send(`Not found: ${req.method} ${req.path}`);
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("Unhandled error:", err);
  res.status(500).type("text/plain").send("Internal server error");
});

const server = app.listen(PORT, () => {
  console.log("");
  console.log("==========================================");
  console.log(" Grabvo-Qz  (local)");
  console.log("==========================================");
  console.log("");
  console.log(`Mode:      ${NODE_ENV}`);
  console.log(`Listening: http://localhost:${PORT}`);
  if (fs.existsSync(DIST_DIR)) console.log("Client:    served from /dist");
  else console.log("Client:    http://localhost:5173 (Vite dev)");
  if (!fs.existsSync(CERT_FILE) || !fs.existsSync(PRIVATE_KEY_FILE)) {
    console.log("");
    console.log("⚠️  No certs found in /certs — silent printing will fail.");
  }
  console.log("");
});

const shutdown = (signal: string) => {
  console.log(`\n${signal} received — shutting down…`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 5000).unref();
};
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));