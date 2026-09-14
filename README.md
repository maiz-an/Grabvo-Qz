# Grabvo-Qz

**Live:** <https://qz.grabvo.app> — see exactly how a **Grabvo's**
receipt or kitchen ticket will print, then set up **silent** 80mm printing
over **[QZ Tray](https://qz.io)**: connect from the browser, list installed
printers, and print a **receipt** or a kitchen/order **ticket** — no
"Allow / Block" popup after the first handshake — using a signed
certificate.

Built as a **React + Vite + TypeScript + Tailwind** single-page app, backed
by a tiny signing server that runs either as a local **Express** process or
as **Vercel serverless functions**, so the same codebase works on your
laptop and in production without changes.

Fork it, edit `src/config/receipt-config.ts`, and you have a working
receipt/ticket printer for your own POS, kiosk, or restaurant project in
minutes.

**Repo:** <https://github.com/maiz-an/Grabvo-Qz>

![status](https://img.shields.io/badge/status-live-7c3aed)
![license](https://img.shields.io/badge/license-MIT-green)

---

## Table of contents

1. [What this project teaches](#what-this-project-teaches)
2. [What's in the box](#whats-in-the-box)
3. [Prerequisites](#prerequisites)
4. [Quick start (5 minutes)](#quick-start-5-minutes)
5. [QZ Tray — install and verify](#qz-tray--install-and-verify)
6. [Certificate setup (for silent printing)](#certificate-setup-for-silent-printing)
7. [Running the app](#running-the-app)
8. [Using the app](#using-the-app)
9. [Testing without a real printer](#testing-without-a-real-printer)
10. [Customizing the receipt and ticket](#customizing-the-receipt-and-ticket)
11. [Environment variables](#environment-variables)
12. [How the code works (behind the scenes)](#how-the-code-works-behind-the-scenes)
13. [Troubleshooting](#troubleshooting)
14. [Deploying to production (Vercel)](#deploying-to-production-vercel)
15. [Security notes](#security-notes)
16. [License](#license)

---

## What this project teaches

- **What QZ Tray is** and why a browser can't talk to a USB/network printer
  on its own
- **How silent printing works** (certificate + signed requests)
- **How to generate a free local certificate** with QZ Tray's Site Manager
- **How to build 80mm print layouts** with HTML/CSS — a customer-facing
  **receipt** (with prices) and a kitchen-facing **order ticket** (no
  prices) — including bilingual (English + Arabic) content
- **How to print from the browser through a signing backend** that keeps
  the private key off the client, with one codebase that runs as either a
  local Express server or Vercel serverless functions
- **How to build a live, full-size print preview** in an iframe before
  committing anything to paper
- **How to test without a physical printer** using *Microsoft Print to PDF*

---

## What's in the box

```text
Grabvo-Qz/
├── index.html                 # Vite entry HTML — loads qz-tray.js from CDN
├── src/
│   ├── main.tsx                # React root; registers QZ security handlers
│   ├── App.tsx                  # Top-level layout & state (connect, print, preview)
│   ├── index.css                # Tailwind base + custom theme utilities
│   │
│   ├── components/
│   │   ├── Header.tsx            # Page title / branding
│   │   ├── Background.tsx        # Decorative animated background
│   │   ├── GitHubLink.tsx        # "View source" badge
│   │   ├── ActionButtons.tsx     # reconnect_qz / scan_printers
│   │   ├── PrinterPanel.tsx      # Printer list + receipt/ticket printer pickers
│   │   ├── PrintCards.tsx        # Preview + print buttons for receipt & ticket
│   │   ├── PreviewModal.tsx      # Full-size, scrollable print preview (iframe)
│   │   ├── InfoPanel.tsx         # How-it-works / help panel
│   │   ├── Toasts.tsx            # Toast notification stack
│   │   └── ui.tsx                # Shared small UI primitives (Button, etc.)
│   │
│   ├── config/
│   │   ├── receipt-config.ts     # ← edit this first — business, items, style, ticket
│   │   └── types.ts              # TypeScript shape of the config above
│   │
│   ├── templates/
│   │   ├── receipt-template.ts   # Renders config → full receipt HTML (buildReceiptHtml)
│   │   ├── ticket-template.ts    # Renders config → full ticket HTML (buildTicketHtml)
│   │   └── shared.ts             # HTML helpers shared by both templates
│   │
│   ├── hooks/
│   │   ├── useQz.ts              # Connect / list printers / print, with toasts
│   │   ├── useToast.ts           # Toast state
│   │   └── useLocalStorage.ts    # Generic localStorage-backed state
│   │
│   ├── lib/
│   │   ├── qz.ts                 # QZ Tray security setup, connect, print pipeline
│   │   ├── storage.ts            # Persist chosen receipt/ticket printer
│   │   └── utils.ts              # Small shared helpers (sleep, cn, etc.)
│   │
│   └── types/
│       └── qz.d.ts               # Type definitions for the global `qz` object
│
├── server/
│   └── index.ts                 # Local Express server (dev + `npm start`)
├── server.js                    # Compiled/plain JS entry used by some hosts
│
├── api/                          # Vercel serverless functions (production)
│   ├── cert.ts                   # GET /api/cert   → serves QZ_CERTIFICATE
│   ├── sign.ts                   # GET /api/sign    → signs a QZ request
│   └── logo.ts                   # GET /api/logo    → proxies LOGO_URL as base64
│
├── certs/                        # Your QZ Tray key pair goes here (git-ignored)
│   ├── digital-certificate.txt
│   ├── private-key.pem
│   └── README.md
│
├── dist/                         # Production build output (git-ignored in practice)
├── vercel.json                   # Rewrites /digital-certificate.txt, /sign-message,
│                                  # /logo-base64 → the /api functions above
├── vite.config.ts                # Vite + React plugin, "@/" path alias → src/
├── tailwind.config.js            # Tailwind theme
├── postcss.config.js
├── tsconfig.json / tsconfig.node.json
├── .env.example                  # Documents every supported env var
├── .gitignore                    # Ignores node_modules/, dist/, certs/, .env*
├── package.json
└── README.md                     # You are here
```

---

## Prerequisites

| What | Version | Where |
|---|---|---|
| **Node.js** | 18 or newer | <https://nodejs.org/> |
| **QZ Tray** | Any recent version | <https://qz.io/download/> |
| **A printer** | Optional — Microsoft Print to PDF works | — |

Node 18+ is required for the built-in `fetch()` used by the logo proxy and
for the Vite/TypeScript toolchain.

---

## Quick start (5 minutes)

```bash
git clone https://github.com/maiz-an/Grabvo-Qz.git
cd Grabvo-Qz
npm install
npm run dev
```

`npm run dev` starts **both** processes at once (via `concurrently`):

- the **Vite dev server** (the React UI) on <http://localhost:5173>
- the **Express signing server** (`server/index.ts`) on <http://localhost:3000>

Open **<http://localhost:5173>**, then:

1. Make sure **QZ Tray is running** (system tray / menu bar — see the next
   section for how to check).
2. Click **↻ reconnect_qz** — a green toast says "QZ Tray connected."
3. Click **↻ scan_printers** — your installed printers appear in the
   **PRINTERS** panel.
4. Assign a printer to **Receipt** and/or **Ticket**.
5. Click **👁 preview** to see exactly what will print, or **print ▸** to
   send it.

If QZ Tray isn't running, step 2 shows a warning toast "QZ Tray is not
running" — jump to [QZ Tray — install and verify](#qz-tray--install-and-verify).

**You'll see an Allow/Block popup the first time you print.** That's
expected — click **Allow**, check **Remember this decision**, and it never
appears again. To skip that popup entirely, set up a certificate (see
[Certificate setup](#certificate-setup-for-silent-printing)).

---

## QZ Tray — install and verify

### What is QZ Tray?

QZ Tray is a free desktop application that runs on the **same machine as
the printer**. It opens a WebSocket server on `localhost:8182` and exposes
APIs that a web page can call to list printers and send print jobs —
something a browser alone cannot do for security reasons.

```text
  Browser  ←→  QZ Tray (localhost WebSocket)  ←→  Your OS print spooler  ←→  Printer
```

### Install it

1. Download the installer for your OS: <https://qz.io/download/>
2. Run the installer, accept defaults, finish.
3. QZ Tray launches automatically and lives in the **system tray** (Windows)
   or **menu bar** (macOS) — it's a background service, not a window.

### Verify it's running

| OS | Where to look |
|---|---|
| Windows | System tray (bottom-right of the taskbar) — you'll see a **QZ** icon. If it's hidden, click the ▲ arrow. |
| macOS | Menu bar (top-right) — a **QZ** icon. |
| Linux | Usually system tray or top-right corner depending on the desktop environment. |

**Right-click the icon** — the menu should have items like *About*,
*Advanced*, *Reload*, *Exit*. If you see that menu, QZ Tray is running.

### What happens if QZ Tray is not running?

Clicking **reconnect_qz** with QZ Tray stopped shows:

- A warning toast: **"QZ Tray is not running"**
- A console error: **`Failed to open WebSocket: ws://localhost:8182`**
- The **PRINTERS** panel stays empty.

**Fix:** start QZ Tray, then click **reconnect_qz** again. No page reload
needed.

> **Tip:** QZ Tray opens port **8182** on `localhost`. If that's blocked by
> a firewall, connection fails even if QZ is running. Check with
> `netstat -an | findstr 8182` (Windows) or `lsof -i :8182` (macOS/Linux).

---

## Certificate setup (for silent printing)

This is the most important section — read it if you want to understand
**how silent printing actually works**.

### Why you need a certificate

By default, QZ Tray asks the user "Allow this website to use your
printer?" **on every print**. That's a reasonable default (it stops a
malicious page from printing 500 pages). For a POS or kiosk, it's
unusable.

The solution:

1. You generate a **certificate** (public) + **private key** (secret).
2. You tell QZ Tray to trust that certificate.
3. For every print request, the page asks the backend to **sign** the
   request with the private key.
4. QZ Tray verifies the signature against the trusted certificate and
   silently lets it through.

The private key **never touches the browser** — it stays on the server
(local Express) or in a serverless function's environment (Vercel).

### Generate a free certificate (2 minutes)

QZ Tray includes a built-in **Demo Keys** generator. It's free, instant,
and trusted by QZ Tray on *your* machine only. (For a certificate trusted
across all machines — e.g. for a public web app — see
[QZ's paid Premium Support](https://qz.io/login).)

**Steps:**

1. **Right-click the QZ Tray icon** → **Advanced** → **Site Manager**.
2. Click **+** (bottom-left) → **Create New**.
3. Click **Yes** to generate a new key pair.
4. Click **Yes** to install the certificate automatically.
5. Click **Yes** to copy it to `override.crt`.
6. Approve the OS permission prompt (Administrator / UAC on Windows).
7. QZ Tray places a folder called **`QZ Tray Demo Cert`** on your
   **Desktop**. Inside:
   - `digital-certificate.txt` — the public certificate
   - `private-key.pem` — the private key

### Install it in the project (local dev)

Copy both files into this project's `certs/` folder:

```text
Grabvo-Qz/
└── certs/
    ├── digital-certificate.txt     ← from your Desktop
    └── private-key.pem             ← from your Desktop
```

Then **restart the server** (`Ctrl+C`, then `npm run dev` again) and reload
the page. The popup will be gone.

For production (Vercel), see
[Deploying to production](#deploying-to-production-vercel) — the same two
files are provided as environment variables instead of files on disk.

### Verify it works

Open DevTools → Network tab → reload the page. You should see:

- `GET /digital-certificate.txt` (dev) or `GET /api/cert` (prod) — status
  200, containing the PEM certificate
- Every print makes a request to `/sign-message` (dev) or `/api/sign`
  (prod) with status 200

If it returns 500, the certificate/key isn't where the server expects it
— see [Troubleshooting](#troubleshooting).

### 🔒 Keep your private key private

`private-key.pem` can sign any QZ request on your behalf — **treat it like
a password**.

- `.gitignore` already excludes `certs/` — **don't force-add it**.
- Never paste it into an issue, PR, chat, or commit message.
- If you suspect it leaked: open Site Manager, delete the entry, and
  generate a new pair.

---

## Running the app

**Dev mode (recommended)** — Vite dev server + Express, both with
hot-reload:

```bash
npm run dev
```

This runs `npm:dev:server` (`tsx watch server/index.ts`, port `3000`) and
`npm:dev:client` (`vite`, port `5173`) together via `concurrently`. Open
**<http://localhost:5173>**.

Expected console output from the Express side:

```text
==========================================
 Grabvo-Qz  (local)
==========================================

Mode:      development
Listening: http://localhost:3000
Client:    http://localhost:5173 (Vite dev)

⚠️  No certs found in /certs — silent printing will fail.
```

The certificate warning disappears once `certs/` has both
`digital-certificate.txt` and `private-key.pem` — see
[Certificate setup](#certificate-setup-for-silent-printing).

**Production-style, single process:**

```bash
npm run build   # tsc -b && vite build → outputs to dist/
npm start       # tsx server/index.ts — serves dist/ + the sign/cert/logo routes
```

Open **<http://localhost:3000>**. Console output is the same as above, but
with `Mode: production` and `Client: served from /dist`.

**Other scripts:**

```bash
npm run typecheck   # tsc --noEmit
npm run preview     # vite preview (static preview of the dist/ build only,
                     #   without the signing endpoints — printing will fail)
```

**Change the port** (affects the Express server):

```bash
PORT=4000 npm start          # macOS / Linux
set PORT=4000 && npm start   # Windows cmd
$env:PORT=4000; npm start    # Windows PowerShell
```

---

## Using the app

Open the app in your browser. You'll see connection controls at the top, a
**PRINTERS** panel, and a **Print** section with a card each for the
**Receipt** and the **Ticket**.

### `↻ reconnect_qz`

1. Opens the WebSocket connection to QZ Tray (`ws://localhost:8182`).
2. On success: shows a green toast "QZ Tray connected."
3. Automatically calls `scan_printers` (below) so the printer list
   populates.

**When to click it:** after starting QZ Tray, after restarting QZ Tray, or
any time the printer list looks stale.

### `↻ scan_printers`

Queries QZ Tray for the printers installed on this machine and rebuilds
the **PRINTERS** list. Assign one printer to **Receipt** and, optionally, a
different one to **Ticket** — the printer kitchen orders go to a KOT/BOT
printer is often different from the one that prints customer receipts.
Your picks are remembered in `localStorage`.

### `👁 preview` (Receipt / Ticket)

Opens a modal showing **exactly** what will print, rendered at real
physical size (the configured `widthMm`, 80mm by default). The preview
always renders at its true width and height — it never shrinks to fit the
modal — and both scroll vertically and horizontally as needed, so nothing
gets squeezed down and unreadable. Press **Esc** or click the dark
backdrop to close it.

### `print ▸` (Receipt / Ticket)

Sends the current receipt or ticket to the printer assigned to it.

What happens on the wire (with the default `printer.mode: "raw"`):

1. The browser builds the HTML from `receipt-config.ts` via
   `buildReceiptHtml()` / `buildTicketHtml()`.
2. Any remote images (like a logo URL) are fetched and inlined as `data:`
   URIs so the printer doesn't need network access.
3. QZ Tray asks the backend for a signature over the request.
4. The backend signs with the private key and returns the base64
   signature.
5. QZ Tray verifies it against the certificate, renders the HTML itself,
   converts it to ESC/POS raster commands (using
   `printer.raw.quantization`/`threshold`/`dotDensity`), and — bypassing
   the OS print driver entirely (`forceRaw: true`) — writes those bytes
   straight to the printer.

If a printer is switched to `printer.mode: "pixel"` instead (only for
non-ESC/POS printers — see [Testing without a real printer](#testing-without-a-real-printer)),
step 5 changes: the HTML is first measured in a hidden iframe to compute
an explicit physical page height, then the job goes through the normal
OS print driver/spooler instead.

You'll see toast messages and console logs at each step.

---

## Testing without a real printer

You don't need a thermal printer to try this.

### Option 1 — Microsoft Print to PDF (Windows)

Microsoft Print to PDF doesn't speak ESC/POS, so it needs the fallback
print path: set `printer.mode: "pixel"` in `receipt-config.ts` before
testing with it (switch back to `"raw"` for your real thermal printers
afterward). Then select **Microsoft Print to PDF** in the PRINTERS list,
print a receipt or ticket, save the PDF, and open it.

**One-time setup required** — Windows needs a custom paper size:

1. **Settings → Bluetooth & devices → Printers & scanners**
2. Click **Microsoft Print to PDF** → **Printer properties**
3. **Preferences → Advanced → Paper Size → New**
4. Name it **80mm Roll**, size **80 mm × 297 mm**
5. Save.

Without this, PDF jobs default to A4 or Letter — you'll see a mostly-blank
page with a tiny receipt in the top-left corner.

### Option 2 — Any network printer

Same as above — a laser/inkjet printer needs `printer.mode: "pixel"`,
since it can't interpret ESC/POS. Send the job to any printer you have;
the 80mm layout will fit on the left side of an A4 page, useful for
checking alignment and text quality.

### Option 3 — Just look at the preview

`👁 preview` renders the exact HTML QZ will send, at real physical size. If
it looks right there, it will look right on paper — and this one needs no
mode switch either way, since the preview never goes through QZ at all.

---

## Customizing the receipt and ticket

Almost everything lives in one file: **`src/config/receipt-config.ts`**
(typed by `src/config/types.ts`). You normally never touch
`receipt-template.ts` or `ticket-template.ts` directly.

### Common changes

**Business details:**

```ts
business: {
  name: "YOUR CAFE NAME",
  tagline: "Fine Dining · Est. 2024",
  address: "123 Main St",
  phone: "+1 555 0000",
  logo: "https://yourserver.com/logo.png"   // or "" to hide
}
```

**Line items** (shared by both the receipt and, for name/qty/note, the
ticket):

```ts
lineItems: [
  { name: "Espresso",  nameAr: "إسبريسو", qty: 2, price: 3.00 },
  { name: "Croissant", nameAr: "كرواسون", qty: 1, price: 4.50 }
]
```

**Printer settings — this is the important one:**

```ts
printer: {
  density:  203,     // 203 for most 80mm thermals, 300 for higher-end units
  widthMm:  80,       // full paper width

  mode: "raw",         // "raw" = talks straight to the printer's own
                        // ESC/POS firmware, bypassing the OS driver —
                        // this is what makes every printer print
                        // identically. Leave this on "raw" for every
                        // real thermal printer.

  raw: {
    language: "ESCPOS",
    quantization: "luma",     // brightness-based black/white conversion
    threshold: 128,            // 0–255 cutoff, lower = bolder/darker
    dotDensity: "single",      // supported by every ESC/POS printer;
                                // "double" is sharper but not guaranteed
                                // on cheaper/older clones
    imageEncoding: "gs_v_0",   // modern raster command, avoids banding
    forceRaw: true              // bypass the OS driver entirely
  },

  pixel: {
    // Fallback only — used when printer.mode is switched to "pixel"
    // for a printer that does NOT speak ESC/POS (a laser/inkjet
    // printer, or "Microsoft Print to PDF" for quick local testing).
    colorType: "blackwhite",
    interpolation: "nearest-neighbor"
  }
}
```

**Why "raw" and not the old driver-based printing?** Printing through
`pixel`/HTML rendering means every printer's Windows/macOS *driver* gets
to reinterpret spacing, margins and black/white conversion its own way —
which is exactly why the same receipt can come out looking different
(more spacing, faded fills, blurry text, a clipped edge) on different
printer models, even with identical config. `raw` + ESC/POS sidesteps
drivers completely: QZ renders the HTML once, converts it to ESC/POS
raster commands itself, and (with `forceRaw: true`) writes those bytes
straight to the printer. Virtually every 80mm thermal/kitchen printer
(Epson, Star, Xprinter, Rongta, Citizen, generic clones...) implements
ESC/POS the same way, so the same bytes print the same way everywhere.

Only switch a printer to `mode: "pixel"` if it genuinely isn't an
ESC/POS printer — e.g. you're pointing it at "Microsoft Print to PDF"
just to sanity-check a layout, or at a regular office laser printer.
Real receipt/kitchen thermal printers should stay on `"raw"`.

**Paper margins (safe-print zone):**

```ts
style: {
  pageWidth:      "72mm",   // content width
  paddingLeftMm:  "4mm",    // left safety margin
  paddingRightMm: "4mm"     // right safety margin
}
```

80mm thermal paper has a physically printable width of about **72mm** on
virtually every 80mm/203dpi printhead — the outer ~4mm on *each* edge
can't be marked no matter the brand or driver. Centering exactly 72mm of
content with a symmetric 4mm margin means nothing ever gets clipped,
regardless of which side a given printer's unprintable margin happens to
fall on. Don't widen `pageWidth` past 72mm — that's the one number that's
safe across every printer, not just the one on your desk. (The `ticket`
block below has its own identical `style.pageWidth` / padding — keep both
in sync if you ever change one.)

**Bilingual content:** set `locale.showArabic: false` to hide all Arabic
text (useful if your printer's font engine can't shape Arabic script).

**Ticket-specific options** (`ticket` block): the header label, field
labels (table/server/items/notes), whether items are sorted by name or
kept in order, whether item names are uppercased, and its own `style`
block for font sizes.

### Advanced — changing the layout

- **`src/templates/receipt-template.ts`** exports `buildReceiptHtml()`,
  which returns the full `<!DOCTYPE html>` string QZ prints for the
  customer receipt.
- **`src/templates/ticket-template.ts`** exports `buildTicketHtml()` for
  the kitchen/order ticket.
- **`src/templates/shared.ts`** holds small HTML-building helpers used by
  both.

Both read from `receiptConfig` — nothing is hardcoded. Money formatting,
Arabic spans, bilingual footer lines, payment methods, and totals are all
built here. Vite hot-reloads on save; no separate build step in dev.

---

## Environment variables

Copy `.env.example` to `.env.local` (used by the local Express server) and
adjust as needed:

| Variable | Default | Used by | Purpose |
|---|---|---|---|
| `PORT` | `3000` | `server/index.ts` | Local Express server port |
| `CORS_ORIGIN` | `http://localhost:5173` in dev | `server/index.ts` | Allowed origin for the signing endpoints |
| `QZ_CERT_FILE` | `certs/digital-certificate.txt` | `server/index.ts` | Path to the public certificate (local dev) |
| `QZ_PRIVATE_KEY_FILE` | `certs/private-key.pem` | `server/index.ts` | Path to the private key (local dev) |
| `LOGO_URL` | *(unset)* | `server/index.ts`, `api/logo.ts` | Image URL proxied as base64 for the receipt logo |
| `QZ_CERTIFICATE` | *(unset)* | `api/cert.ts` | Full certificate contents (Vercel only) |
| `QZ_PRIVATE_KEY` | *(unset)* | `api/sign.ts` | Full private key contents (Vercel only) |

`server/index.ts` reads `.env.local` via `dotenv` automatically. The
Vercel functions in `api/` read directly from the platform's environment
variables — set `QZ_CERTIFICATE` and `QZ_PRIVATE_KEY` in
**Vercel → Project → Settings → Environment Variables** (see
[Deploying to production](#deploying-to-production-vercel)).

---

## How the code works (behind the scenes)

### Local dev/runtime — `server/index.ts` (also mirrored in `server.js`)

An Express app with three data endpoints, plus static hosting of the built
client:

- **`GET /digital-certificate.txt`** — returns the contents of
  `certs/digital-certificate.txt`. This is public information; QZ Tray
  fetches it on load to know who's asking for printer access.
- **`GET /sign-message?request=<string>`** — signs the given string with
  `certs/private-key.pem` using **SHA-512 + RSA** and returns the base64
  signature. The private key never leaves this process.
- **`GET /logo-base64`** — if `LOGO_URL` is set, fetches that image and
  returns it as base64, avoiding CORS issues when the logo lives on
  another domain.

When `dist/` exists (after `npm run build`), Express also serves the built
client and falls back to `dist/index.html` for any route that isn't one of
the API paths above (SPA fallback).

### Production — `api/*.ts` (Vercel serverless functions)

The same three endpoints, reimplemented as plain Node request handlers
(no Express) so they deploy as individual serverless functions:

- **`api/cert.ts`** — serves the `QZ_CERTIFICATE` env var.
- **`api/sign.ts`** — signs with the `QZ_PRIVATE_KEY` env var.
- **`api/logo.ts`** — proxies `LOGO_URL`.

`vercel.json` rewrites the front-end's familiar paths to these functions:

```json
"/digital-certificate.txt" → "/api/cert"
"/sign-message"            → "/api/sign"
"/logo-base64"             → "/api/logo"
"/(.*)"                    → "/index.html"
```

So the React app always calls the same three URLs regardless of whether
it's running against the local Express server or against Vercel.

### `src/lib/qz.ts` — the QZ Tray integration layer

- `setupQzSecurity()` — wires `qz.security.setCertificatePromise` /
  `setSignaturePromise` to fetch `/digital-certificate.txt` and
  `/sign-message`. Called once in `main.tsx`, before React even renders.
- `connectQz()` / `listPrinters()` — thin wrappers over the `qz` global.
- `inlineExternalImages()` — rewrites `<img src="https://…">` tags in the
  HTML into `data:` URIs before printing, so the printer doesn't need
  network access for a logo.
- `printHtml()` — the print pipeline, branching on `printer.mode`:
  - **`"raw"` (default, every real thermal printer)** — the receipt is
    rasterized to a PNG **in the browser itself first**
    (`rasterizeHtmlToPngBase64()`, using the
    [html2canvas](https://html2canvas.hertzen.com/) library on a hidden,
    real, same-page `<iframe>` — genuine browser layout/paint, the exact
    same engine that renders the live preview correctly), then sent as
    `{ type: "raw", format: "image", options: { language: "ESCPOS",
    quantization, threshold, dotDensity, imageEncoding } }`. QZ never
    renders any HTML/CSS itself here — it only encodes an already-
    finished bitmap into ESC/POS raster commands, then (`forceRaw: true`)
    writes those bytes straight to the printer, bypassing the OS driver
    entirely. Two things this fixes at once: every printer receives the
    identical bitmap converted the identical way (no more "different
    printer, different spacing/blur"), and QZ's own separate embedded
    HTML renderer — which choked on this app's CSS and printed blank
    pages forever — is out of the picture completely.
    (An earlier version rasterized via an SVG `<foreignObject>` + `<img>`
    instead of html2canvas. Don't go back to that — every browser
    permanently taints a canvas after drawing an SVG image containing a
    `<foreignObject>`, even from same-origin content, which makes
    `canvas.toDataURL()` throw `SecurityError: Tainted canvases may not
    be exported`. It's intentional browser privacy policy, not a bug,
    and no config option works around it. html2canvas paints straight
    from the DOM instead of loading an `<img>`, so nothing is ever
    tainted.)
  - **`"pixel"` (fallback, non-ESC/POS printers only)** — the old
    driver-based path: `measureReceiptHeightMm()` renders the HTML in a
    hidden off-screen iframe to estimate the physical height, then
    `{ type: "pixel", format: "html" }` is sent with that explicit
    `size`. This is what "Microsoft Print to PDF" or a regular
    laser/inkjet printer needs, since they can't interpret ESC/POS.
- `withPreviewCentering()` — injects a small `<style>` override used only
  by the on-screen preview so short receipts look centered; both print
  paths above rely on the printer's own safe-margin padding instead.

### `src/components/PreviewModal.tsx` — the live preview

Renders the receipt/ticket HTML inside a `srcDoc` iframe sized to its real
physical width and auto-measured full height (via `ResizeObserver` +
several delayed re-measurements for fonts/images). The modal card caps at
`92vh` and its body scrolls vertically (`overflow-y-auto`) when the
receipt is taller than that — content is centered and always shown at
its true, real width, never shrunk to fit.

### `src/hooks/useQz.ts` — React state around the QZ pipeline

Wraps `connectQz` / `listPrinters` / `printHtml` with `status`,
`printers`, `errorMessage` state and toast notifications, so `App.tsx`
only has to call `connect()`, `refreshPrinters()`, and `print()`.

---

## Troubleshooting

### "QZ Tray is not running" (warning toast)

**Most likely:** QZ Tray is not running.

- Check your system tray / menu bar for the QZ icon.
- If missing, start QZ Tray from the Start menu / Applications folder.
- Click **reconnect_qz** again.

**Also possible:**

- QZ Tray is running but a firewall is blocking `localhost:8182`. Test in
  a browser: <http://localhost:8182> — should return a QZ Tray error
  message (which means it's alive).
- Another app is using port 8182. Check with
  `netstat -an | findstr 8182` (Windows) or `lsof -i :8182` (macOS/Linux).

### Allow / Block popup appears on every print

**Cause:** No certificate installed, or the browser hasn't been told
"Remember this decision."

**Fix:**

1. If you don't have `certs/digital-certificate.txt` and
   `certs/private-key.pem` (or the `QZ_CERTIFICATE` / `QZ_PRIVATE_KEY` env
   vars in production), follow
   [Certificate setup](#certificate-setup-for-silent-printing).
2. If the popup already appeared and you clicked Allow, check
   **Remember this decision** next time — after that it won't ask again.

### "Signing failed" / 500 from `/sign-message` or `/api/sign`

**Cause:** `certs/private-key.pem` is missing/unreadable (local), or
`QZ_PRIVATE_KEY` isn't set (Vercel), or the key isn't a valid PKCS#8
2048-bit RSA key.

**Fix:** regenerate the pair from QZ Tray's Site Manager (delete the old
entry first), then copy both files into `certs/` again (or update the
Vercel env vars).

### Printer list is empty

QZ Tray connected successfully but returned zero printers. Check your OS
printer list — if none are installed at the OS level, QZ has nothing to
show. Install at least one (Microsoft Print to PDF is enough to test).

### Microsoft Print to PDF gives a blank A4 page

Windows' built-in PDF driver needs a custom paper size registered once.
See [Testing without a real printer](#testing-without-a-real-printer).

### Printer feeds blank paper endlessly

This was a real bug in an earlier version of `printHtml()`, now fixed:
sending `{ type: "raw", format: "html" }` handed the receipt's HTML/CSS to
**QZ Tray's own separate embedded renderer** — a different engine than
your actual browser — and it choked on this app's CSS, producing corrupt
raster data that some printers interpreted as an endless blank feed. The
fix was to stop asking QZ to render anything at all: the receipt is now
rasterized to a finished PNG in the browser itself, via
[html2canvas](https://html2canvas.hertzen.com/)
(`rasterizeHtmlToPngBase64()` in `lib/qz.ts`), and only that already-
finished bitmap is handed to QZ as `{ type: "raw", format: "image" }`. If
you're running an older copy of `lib/qz.ts` and see this, update it.

### `SecurityError: Tainted canvases may not be exported`

This was also a real bug, from the version right after the one above:
that version rasterized the receipt via an SVG `<foreignObject>` + `<img>`
instead of html2canvas. Every browser permanently marks a canvas
"tainted" after anything is drawn onto it from an SVG image containing a
`<foreignObject>` — even fully same-origin, locally-generated content —
as a deliberate privacy safeguard, and a tainted canvas can never be
exported via `toDataURL()`/`toBlob()`. This isn't a bug in that code and
no option/flag works around it — it's intentional, permanent browser
policy. The fix was switching to html2canvas, which paints straight from
the live DOM instead of loading an `<img>`, so nothing is ever tainted.
If you're running an older copy of `lib/qz.ts` and see this exact error,
update it — and run `npm install` afterward, since this fix adds the
`html2canvas` package as a new dependency.

### The same receipt prints differently on different printers

This is what `printer.mode: "raw"` fixes — see
[Common changes → Printer settings](#common-changes) above. If you're
still seeing this:

1. Confirm the printer is actually staying on `mode: "raw"` — check
   `receipt-config.ts`. Every real 80mm thermal/kitchen printer should
   use `"raw"`; only a non-ESC/POS printer (a laser printer, or
   "Microsoft Print to PDF") needs `"pixel"`.
2. Confirm the printer genuinely speaks ESC/POS — check its spec sheet
   or manual. The overwhelming majority of 80mm thermal receipt/kitchen
   printers do (Epson, Star, Xprinter, Rongta, Citizen, and most
   generic/clone printers). A handful of older or specialty models use
   a different language (`"ZPL"`, `"EPL"`, `"CPCL"`) — set
   `printer.raw.language` accordingly for that printer if so.
3. If a specific printer's driver still doesn't cooperate even with
   `forceRaw: true`, try installing it under Windows' generic
   **"Generic / Text Only"** driver instead of its bundled driver —
   raw/ESC-POS commands don't need a smart driver, just a pass-through.

### Receipt/ticket is cut off on the right side

Content is already set to the safe, universal 72mm-centered-in-80mm zone
(see [Printer settings](#common-changes)) — that should never clip on a
genuine 80mm printer. If it still does, that printer's physical print
head is narrower than the 72mm standard (unusual, but some cheaper units
run 68–70mm). Narrow `style.pageWidth` (and the matching `ticket.style`
block) by 1–2mm and keep the left/right padding symmetric:

```ts
style: {
  pageWidth:      "70mm",   // was "72mm"
  paddingLeftMm:  "5mm",    // was "4mm"
  paddingRightMm: "5mm"     // was "4mm"
}
```

### Preview looks squashed / hard to read

The preview modal always renders the receipt/ticket at its real physical
width and scrolls vertically instead of shrinking it — if it still looks
compressed, hard-refresh the page (the running app may be serving a
stale `dist/` build; run `npm run build` again, or use `npm run dev`).

### Receipt looks faded or "light"

With `printer.mode: "raw"`, darkness is controlled entirely by the
printer's own hardware, not the app — the ESC/POS bytes it receives are
already pure black/white (`quantization: "luma"`, `threshold: 128`):

1. **Printer firmware** — most 80mm thermals have a paper feed / density
   button combo or a config tool from the manufacturer. Increase darkness
   by one or two steps.
2. **Lower `printer.raw.threshold`** in `receipt-config.ts` (e.g. `100`)
   to make more pixels count as black — use this if the receipt looks
   consistently light across every printer, not just one.

The HTML output itself is already bold (weights 700–900 throughout).

### TypeScript error after editing the config

You probably deleted or renamed a key that `types.ts` expects, or that a
template reads. Compare against `src/config/types.ts`, run
`npm run typecheck`, or restore from git:

```bash
git checkout -- src/config/receipt-config.ts
```

### Nothing prints, but no error appears

Check DevTools → Network — do you see a `/sign-message` (or `/api/sign`)
request? If not, QZ never sent the job. Check the console for a
`qz.print resolved:`-style log; if it's missing, the print call was
rejected before reaching QZ.

---

## Deploying to production (Vercel)

This project ships a ready-to-use `vercel.json`:

```bash
vercel
```

1. In **Vercel → Project → Settings → Environment Variables**, set:
   - `QZ_CERTIFICATE` — the full contents of `digital-certificate.txt`
   - `QZ_PRIVATE_KEY` — the full contents of `private-key.pem`
     (real newlines or `\n` both work — `api/sign.ts` and `api/cert.ts`
     normalize `\n`)
   - `LOGO_URL` — optional
2. Vercel runs `npm run build` and serves `dist/`, with
   `/digital-certificate.txt`, `/sign-message`, and `/logo-base64`
   rewritten to the `api/*.ts` functions.

Before shipping this beyond a learning project, also:

3. **Restrict CORS** in `server/index.ts` (`CORS_ORIGIN`) to your real
   origin(s) if you keep the Express server around for anything, e.g.
   `https://pos.yourcompany.com`.
4. **Buy a Premium Support certificate** from QZ if your users are on
   machines you don't control — demo certs only work on the machine that
   generated them.
5. **Serve over HTTPS** — QZ Tray accepts requests from `https://` origins
   more reliably than `http://`.
6. **Lock down the sign endpoint** — in production, only sign requests
   that come from your own authenticated session; the current version
   signs anything anyone asks it to.
7. **Keep the private key as a platform secret**, never commit it —
   `QZ_PRIVATE_KEY` as a Vercel env var, not a file in the repo.

---

## Security notes

- **`private-key.pem` / `QZ_PRIVATE_KEY` = password.** Anyone with it can
  sign any QZ request as your site. Guard it.
- **`.gitignore` already excludes `certs/`.** Don't remove that line.
- **The certificate is public.** It's fine to serve it, commit it, or
  expose it — `digital-certificate.txt` / `QZ_CERTIFICATE`.
- **The signature endpoint is powerful.** In production, only sign for
  authenticated users, and add rate limiting.
- **Demo certificates are local-only.** They're trusted by QZ Tray on the
  machine that generated them. If you send your app to a friend, they'll
  need to generate their own demo pair (or you buy a Premium certificate).

---

## License

MIT — see [LICENSE](LICENSE).

This project is an independent, unofficial learning example and is not
affiliated with QZ Industries, LLC.

---

## Links

- Repo: <https://github.com/maiz-an/Grabvo-Qz>
- QZ Tray: <https://qz.io>
- QZ Tray — Getting Started: <https://qz.io/docs/getting-started>
- QZ Tray — Signing: <https://qz.io/docs/signing>
- QZ Tray — Generate a certificate: <https://qz.io/docs/generate-certificate>
- QZ Tray — API Reference: <https://qz.io/api/>
