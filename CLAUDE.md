# Grabvo-Qz — project notes for Claude

Silent 80mm receipt/ticket printing for Grabvo over QZ Tray. React + Vite
frontend, Express locally / Vercel serverless functions (`api/*.ts`) in
production, both implementing the same two QZ Tray endpoints:
`/digital-certificate.txt` and `/sign-message`.

Repo: https://github.com/maiz-an/Grabvo-Qz (branch `main`)
Vercel project: `qz` (team `xmzieos`), domain `qz.grabvo.app`.

## How printing actually works here

- `src/config/receipt-config.ts` is the single source of truth for every
  printer/layout setting. Comment header says "Edit → Save → the app
  hot-reloads" — this is meant to be hand-edited, not driven by UI.
- `src/templates/receipt-template.ts` / `ticket-template.ts` return a full
  HTML **document string** (their own `<html><head>...`). That string is
  used for both the on-screen preview iframe and the actual print job —
  the whole design goal is "what you preview is what prints."
- `src/lib/qz.ts` is the print pipeline:
  - `mode: "raw"` (the default) rasterizes the HTML to a PNG with
    `html2canvas` in an off-screen `<div>` in the **main document** (not
    an iframe — iframes broke html2canvas in production Chrome, see the
    comment above `rasterizeHtmlToPngBase64`), then sends it to QZ as a
    raw ESC/POS image command. This bypasses the OS printer driver
    entirely, which is what makes output identical across machines —
    *but only for a printer that actually speaks ESC/POS* (thermal
    receipt printers).
  - `mode: "pixel"` sends the HTML straight to QZ, which prints it
    through the OS driver. Works on any printer with a driver installed
    (laser, inkjet, virtual PDF printer, …) but is not the crisp/raw path.
  - `guessRawCapable()` (added — see below) picks between the two per
    printer automatically based on the printer's driver name.

## Known root causes fixed in this pass (2026-09-29)

### 1. "Works locally, not on the hosted site"

This was **not a code bug** — it was the deploy pipeline. Checked via the
Vercel MCP tools:

- The two most recent commits/deployments (`3bf3da4`, `f267806`) are
  stuck in Vercel state `BLOCKED`, `errorLink` pointing at
  https://vercel.com/docs/deployments/troubleshoot-project-collaboration#account-configuration
  ("could not attribute the commit to a verified team member").
- `git config` in this repo has `user.email = @Akthaz4875` — not a real
  email address, so GitHub/Vercel can't match the commit author to the
  Vercel account, and Vercel blocks the deploy.
- Because of that, **production is still serving commit `1d59801`**,
  which predates the fix that changed `printer.raw.language` from the
  invalid `"ESC-POS"` to the correct `"ESCPOS"`. That's exactly the
  `Cannot parse (BASE64)...ImageConverter missing for LanguageType: UNKNOWN`
  error in the attached console log — it's the stale hosted build, not
  something wrong with the current source.
- It also means every gap/padding/threshold tweak made after `1d59801`
  (there are several, see the `// ← CHANGED` comments in
  `receipt-config.ts`) never went live either — hosted was rendering the
  *old*, wider-gapped layout the whole time.

**Fix (do this once, outside of code):**
```
git config user.email "<the email verified on your GitHub account>"
git commit --amend --reset-author   # or: re-author the last commits
git push --force-with-lease origin main
```
Then in Vercel → the `qz` project → Deployments, the new push should go
`READY` instead of `BLOCKED`. If it still blocks, check
Vercel → Team Settings → Collaboration for "manual approval" on new
committers and approve the pending membership there.

### 2. "Font looks bolder, gaps bigger" (even beyond the stale deploy)

`baseFont` listed `'Segoe UI'` **first**, ahead of `'Inter'`. `'Segoe UI'`
ships with Windows, so on every Windows till it silently won over the
`Inter` the rest of the app loads from Google Fonts — different tills
(different Windows builds/locales, or non-Windows machines) render
different fallback fonts with different weight/metrics, which is exactly
"bolder on some machines, gaps different on others."

**Fix applied:**
- `src/templates/shared.ts` now exports `INTER_FONT_FACE` — Inter's
  static weights 400/500/600/700/800/900, base64-embedded as
  `@font-face { src: url(data:font/woff2;base64,...) }`. Both templates
  inject it as the first `<style>` block in the document they generate.
- This makes the printed document **fully self-contained**: no network
  fetch, not dependent on what's installed on the till, and — important
  for `mode: "pixel"` — works even when QZ hands the HTML to its own
  renderer outside the browser tab that loaded Google Fonts.
- `baseFont` in `receipt-config.ts` (both `style` and `ticket.style`) now
  lists `'Inter'` first; system fonts stay only as a fallback for the
  instant before the embedded font finishes decoding.
- If you ever need to regenerate `INTER_FONT_FACE` (e.g. add a weight):
  `npm pack @fontsource/inter` and base64 the relevant
  `files/inter-latin-<weight>-normal.woff2`.

### 3. "Work on all printers without needing a driver"

Not fully possible as stated — there is no single wire format every
printer class understands without going through *some* driver. Raw
ESC/POS bypasses the driver but only because thermal/receipt printers
have ESC/POS firmware built in. A laser printer, an inkjet, a label
printer on ZPL, or "Microsoft Print to PDF" each need their own
language/driver; forcing ESC/POS at all of them is what produced the
`ImageConverter missing for LanguageType: UNKNOWN` crash in the log (that
printer list had a PCL laser, a ZPL label printer, and a network MFP
alongside the actual thermal printers).

**Fix applied:** `guessRawCapable(printerName)` in `src/lib/qz.ts` — when
`printer.mode` is `"raw"` but the selected printer's name doesn't look
like thermal/receipt/label hardware (and does look like a laser/inkjet/
virtual/MFP), `printHtml()` automatically falls back to `"pixel"` mode
(prints through that printer's driver) instead of throwing. It's a
name-based heuristic (see the two regexes above it), not a guarantee —
for a printer you use constantly, still worth confirming which family it
falls in.

## Things NOT changed

- `receipt-config.ts`'s existing gap/threshold/width tuning (the
  `// ← CHANGED` lines already there) — left as-is, additive only.
- No restructuring of the print pipeline's control flow, per standing
  preference: `guessRawCapable` is a new, isolated function; the
  existing `if (printer.mode === "pixel")` branch became
  `if (effectiveMode === "pixel")`, nothing else in that function moved.

## Verifying before you print for real

- `npm run typecheck` and `npm run build` both pass after these changes.
- Nothing here was tested against a physical printer (no printer
  attached to this environment) — the font/gap fixes are sound reasoning
  from the code and the attached console log, but worth a real test
  print on the LAN 80MM / GP-D300 thermal printers before rolling out
  further.
