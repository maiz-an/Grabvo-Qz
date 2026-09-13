/**
 * Grabvo-Qz — minimal Express server
 * ---------------------------------------------------
 * Serves the demo page and implements the two endpoints QZ Tray needs
 * for *silent* (no popup) printing:
 *
 *   GET /digital-certificate.txt   → returns your public certificate
 *   GET /sign-message?request=...  → signs the string QZ sends with your
 *                                     private key (SHA512) and returns
 *                                     the base64 signature
 *
 * See README.md for how to generate a free certificate/key pair.
 */

const express = require("express");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const app = express();

const PORT = process.env.PORT || 3000;
const BASE_DIR = __dirname;
const PUBLIC_DIR = path.join(BASE_DIR, "public");
const CERTS_DIR = path.join(BASE_DIR, "certs");

// Paths to your QZ Tray key pair. Override with env vars if you keep
// them somewhere else (e.g. outside the repo).
const CERT_FILE = process.env.QZ_CERT_FILE || path.join(CERTS_DIR, "digital-certificate.txt");
const PRIVATE_KEY_FILE = process.env.QZ_PRIVATE_KEY_FILE || path.join(CERTS_DIR, "private-key.pem");

// Optional: a logo to print on the test receipt. Leave unset to skip it.
const LOGO_URL = process.env.LOGO_URL || "";

/*
|--------------------------------------------------------------------------
| CORS
|--------------------------------------------------------------------------
| Loosened for local testing. Lock this down to your own origin before
| deploying anywhere public.
*/
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Content-Type");
    next();
});

/*
|--------------------------------------------------------------------------
| Static files (index.html, css, client js)
|--------------------------------------------------------------------------
*/
app.use(express.static(PUBLIC_DIR));

app.get("/", (req, res) => {
    res.sendFile(path.join(PUBLIC_DIR, "index.html"));
});

/*
|--------------------------------------------------------------------------
| QZ Certificate
|--------------------------------------------------------------------------
| QZ Tray fetches this on every page load to identify who is requesting
| the connection. It is NOT secret — it's fine for this to be public.
*/
app.get("/digital-certificate.txt", (req, res) => {
    try {
        const certificate = fs.readFileSync(CERT_FILE, "utf8");
        res.type("text/plain").send(certificate);
    } catch (error) {
        console.error("Certificate error:", error.message);
        res.status(500)
            .type("text/plain")
            .send(
                "digital-certificate.txt not found. See README.md → " +
                "'Generate your own certificate (free)' to create one."
            );
    }
});

/*
|--------------------------------------------------------------------------
| QZ Message Signing
|--------------------------------------------------------------------------
| QZ Tray sends a string that must be signed with the private key on
| every print call. SHA512 is required for current QZ Tray versions.
| The private key never leaves this server.
*/
app.get("/sign-message", (req, res) => {
    try {
        const request = req.query.request;

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
        console.error("Signing error:", error.message);
        res.status(500)
            .type("text/plain")
            .send(
                "Failed to sign QZ request. Is private-key.pem present in /certs? " +
                "See README.md → 'Generate your own certificate (free)'."
            );
    }
});

/*
|--------------------------------------------------------------------------
| Logo proxy (optional)
|--------------------------------------------------------------------------
| Avoids browser CORS issues when the receipt logo lives on another
| domain. Only active if LOGO_URL is set.
*/
app.get("/logo-base64", async (req, res) => {
    if (!LOGO_URL) {
        return res.status(404).type("text/plain").send("");
    }

    try {
        const response = await fetch(LOGO_URL);

        if (!response.ok) {
            throw new Error(`Logo request failed: ${response.status}`);
        }

        const buffer = Buffer.from(await response.arrayBuffer());
        res.type("text/plain").send(buffer.toString("base64"));
    } catch (error) {
        console.error("Logo error:", error.message);
        res.status(500).type("text/plain").send("");
    }
});

/*
|--------------------------------------------------------------------------
| Start Server
|--------------------------------------------------------------------------
*/
app.listen(PORT, () => {
    console.log("");
    console.log("==========================================");
    console.log(" Grabvo-Qz");
    console.log("==========================================");
    console.log("");
    console.log(`Open: http://localhost:${PORT}`);
    if (!fs.existsSync(CERT_FILE) || !fs.existsSync(PRIVATE_KEY_FILE)) {
        console.log("");
        console.log("⚠️  No certs found in /certs — silent printing will fail.");
        console.log("   See README.md → 'Generate your own certificate (free)'.");
    }
    console.log("");
});