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

## Round 2 (2026-09-29, same day) — real photo of a printed receipt

The user sent a photo of an actual print. Three things showed up that the
live HTML preview could never have caught, because it's a browser tab
with anti-aliasing — the printer has neither.

### The core problem: preview ≠ print, structurally

Raw mode doesn't print HTML — QZ reduces the rasterized PNG to pure
black/white dots first (`printer.raw.quantization`/`threshold`). A
screen shows every shade of gray; a thermal printhead only "burns" or
doesn't. The live iframe preview was showing smooth anti-aliased text
that could never match what the threshold step does to it.

**Fix:** `simulateEscposPrint(html, printer)` in `src/lib/qz.ts` runs the
SAME `rasterizeHtmlToPngBase64()` the real print uses, then applies the
same luma threshold client-side (canvas `getImageData`/`putImageData`),
composited onto white first (so transparent PNG regions read as paper,
not black). `PreviewModal.tsx` now has a "Live preview" / "Exact print
(ESC/POS)" toggle — the second tab shows literally the dot pattern that
will hit the paper. Only shown when `guessRawCapable()` says the printer
is raw-capable (a pixel-mode driver print doesn't go through this path).
Wired up via new `printer`/`printerName` props threaded from `App.tsx`.

This is also how the two fixes below were actually found and verified —
by rendering the simulation with Playwright and reading the output,
not by guessing.

### Small text was dropping letters on paper ("small letter quality bad")

Two independent causes, both confirmed by screenshotting the simulation:

1. **Secondary text colors were too light for the threshold.** Several
   places used `#888`/`#999`/`#666`/`#777` for de-emphasis (the normal
   screen-design move: lighter = quieter). But `printer.raw.threshold`
   is 140, and `#999`'s luma is 153 — **already past the cutoff at full
   opacity**, so `.powered`, `.tk-footer-powered`, `.tk-empty`, and the
   default item divider were printing essentially blank. `#888` (luma
   136) is right at the edge, so `.item-note` (which was also *italic*
   — thin diagonal strokes are almost all antialiased edge pixels, worst
   case for a threshold) came out patchy. Fixed by darkening every
   instance to `#333`ish and dropping the italic. On a 1-bit printer
   there's no such thing as "light gray" — de-emphasis has to come from
   size/weight, never color.
2. **Weight 500 (and implicit 400) is too thin at 7–7.5pt/203dpi.** Even
   in solid black, a "t" or "T"'s crossbar at that size is 1 raster
   pixel wide — anti-aliasing on screen hides this, the printer's hard
   threshold doesn't. Confirmed literally: "4 items" printed as
   "4 lems", "Order Time" as "Order  ime", the return-policy line
   dropped whole letters. Fixed by bumping every small (7–7.5pt) text
   class from 500/implicit-400 to 600, and giving `.policy` (which had
   **no** `font-weight` at all, so it was inheriting 400) an explicit
   one. `smallMetaSize` 7.5pt→8pt and `contactSize` 7pt→7.5pt also
   bumped — same "floor" the original dev already noted for
   `smallFooterSize`/`poweredSize`, just hadn't been applied everywhere
   yet.
3. **Rasterization now supersamples 2× before downsampling**, inside
   `rasterizeHtmlToPngBase64()` in `qz.ts`. Rendering straight at
   203dpi gives QZ's threshold a hard-aliased source — a thin stroke
   either lands on a dot or it doesn't, no partial coverage to work
   with. Rendering at 2× and area-averaging back down (canvas
   `imageSmoothingQuality: "high"`) gives every final pixel a real
   blended luma, so partial coverage survives the threshold instead of
   being random. This is the single change with the most visible
   effect — verified in the same before/after screenshots as #2.

### Receipt felt too tall for 3 items ("waste paper")

- `.footer` was `margin-top: 6mm; padding-top: 4mm` — **10mm of blank
  paper** before "Thank you" even started, on every single receipt.
  Trimmed to 3mm/2mm (and the ticket's equivalent `.tk-footer` from
  5mm/3.5mm to 2.5mm/2mm).
- `.section-label` (the ORDER/CUSTOMER/ITEMS/REFERENCE headers) had
  `padding-bottom: 1mm` before its `border-bottom` rule — visually the
  rule was touching the letters. Rebalanced to 1.7mm padding / 1.3mm
  margin-bottom — same total height as before, just redistributed, so
  it reads as a clean heading instead of fixing the "touching" look by
  adding paper.
- `.grand`/`.totals` margins left alone — that's the TOTAL box, it's
  supposed to stand out.

### Paper width — NOT auto-detected, on purpose

The user asked for the print width to auto-fit the printer. Looked into
it and decided against wiring it in: `printer.widthMm` isn't just the
raster size, every template's CSS `pageWidth` is hand-set equal to it
(`types.ts` says so explicitly) — silently rasterizing at a guessed
width without also changing the HTML's layout width would stretch or
clip every receipt. Added `warnIfWidthMismatch()` instead (pure
advisory, `console.warn` only) — if a printer's name says "58mm" or
"80mm" and `printer.widthMm` doesn't match what that implies, it logs a
warning so the mismatch is visible instead of silently wrong. Real fix
is still to set `widthMm` + `style.pageWidth`/`ticket.style.pageWidth`
per printer by hand in `receipt-config.ts`.

### How this was actually verified (not just reasoned about)

No printer is attached to this environment, but a browser is: built the
app, served it with `vite preview`, and drove it with Playwright
(headless Chromium) — clicked into the preview modal, switched to
"Exact print", screenshotted, and cropped in to read individual words at
pixel level. That's how the dropped-letter bugs above were actually
found (not guessed) and how the fixes were confirmed to work, in the
same session. Worth repeating this loop for any future thermal-print
legibility change instead of trusting the live HTML preview.

## Round 3 (2026-09-29, later same day) — spacing polish + real bug fix

Feedback this round, from a second real printed receipt: gap between a
section title (e.g. "ORDER") and its first row felt too big; item
name/price felt too bold; gaps between item detail lines too big;
"GX · Gravbo" was getting cut off / hugging the bottom edge; the
Customer block read as a literal "Name: Saif Eddine" label/value line
and should instead read like the Order block above it (position says
what it is, no label); text edges look a little soft up close.

### Spacing/weight tweaks (`receipt-template.ts`, `receipt-config.ts`)

- `.section-label` `margin-bottom` (the gap *below* the underline,
  before the section's first content row — e.g. ORDER → #0015):
  0.9mm, down from 1.3mm. `padding-bottom` (the gap *above* the
  underline, keeping it off the heading letters — Round 2's fix) left
  alone.
- `.item-name` weight 800 → 700, `style.itemPriceWeight` 700 → 600 —
  still the heaviest text on the item line (by design, it's the thing
  a cashier scans first), just less heavy-handed than before.
- `.item-meta`/`.item-note` `margin-top` 0.6mm → 0.4mm, and
  `style.itemPadding` 1.5mm → 1.2mm — tighter rhythm between an item's
  own name/qty/note lines and between one item and the next.
- Customer block rebuilt: it used to be a stack of `kv()` label/value
  rows ("Name: Saif Eddine", "Phone: …"). Now it's positional, matching
  how the Order block above it already reads (`#0015` / `Table 4`, no
  labels either): name on the left, phone on the right of the same
  row (`.customer-row` — a flex row, so it only renders phone at all
  when there is one), then address and email each get their own line
  below (`.customer-line`). No "Name:"/"Phone:" text anywhere.

### The actual bug: "GX · Gravbo" hiding at the bottom (`qz.ts`)

This was **not** a height/auto-fit problem, despite how it looked (a
sliver of the last line getting cut off in the raster). Confirmed with
`getComputedStyle()` inside the render pipeline: the receipt's own
`body { padding: … ${bottomPadding} … }` rule — the thing that's
supposed to put breathing room below the last line — was computing to
`padding-bottom: 0px` no matter what `receipt-config.ts` said.

Root cause: `rasterizeHtmlToPngBase64()` renders into a single
off-screen `<div>` standing in for the whole document, so it rewrites
the template's `html`/`body`/`:root` selectors to all point at that one
div (see the regex in `qz.ts`). The shared `PRINT_CSS` block (used to
force crisp, non-antialiased text before the 1-bit threshold) also has
an `html, body, :root { padding: 0 !important; … }` rule — meant to
zero out a browser's default UA margin on a **real, separate**
`<html>`/`<body>` pair in the live preview iframe. Scoped down onto the
**same single div** as the template's own body padding rule, that
`!important` always won and silently forced every receipt's top/right/
bottom/left padding to 0 — which is also why bumping `bottomPadding`
earlier (2mm→3mm) had no visible effect. Fixed by dropping
`padding: 0 !important` from that shared rule (kept `margin: 0
!important` — harmless, and the template already zeroes its own
margin too). This is shared by both `receipt-template.ts` and
`ticket-template.ts`, so kitchen tickets get real bottom padding again
too, not just receipts.

Verified: re-rasterized and read the raw PNG bytes directly (not the
on-screen preview) before/after — before, ink reached to within 1–2px
of the image's bottom edge with a glyph visibly sliced mid-letter;
after, "GX · Gravbo" prints complete with a clean margin below it, on
both the Checkout Receipt and the KOT ticket.

### "Text edges look a little faded up close"

Looked for a safe fix and don't think there is one left to make here.
Everything that *was* controllable — font weight, color darkness,
italics, threshold, anti-aliasing before the 1-bit cut, supersampling —
was already addressed in Round 2. What's left is a property of direct
thermal printing itself: at 203dpi, each dot is a physical burned spot
on heat-sensitive paper, and heat bleeds slightly outward from where
the printhead actually touched (thermal "dot gain") — that's the soft
edge you're seeing up close, not a rendering/software softness. Pushing
weight or threshold further to compensate would start fattening small
glyphs back into the "bolder/muddy" look Round 1 fixed. If sharper
edges matter more than anything else, the only real lever is the
printer/paper itself (a newer thermal head, or higher-dpi hardware,
prints smaller dots with less bleed) — not something fixable in this
codebase.

## Round 3.1 (same day) — full-width print + gap knobs made editable

- `style.paddingLeftMm`/`paddingRightMm` (both receipt and ticket):
  3mm → 0.7mm. That's ~1% of the 72mm printable width each side, so
  content now fills ~98% of the print — was ~91.7% before (2× 4.2%).
  If `printer.widthMm` ever changes, these should be re-set to ~1% of
  the *new* width, not left at a fixed 0.7mm.
- **New**: `style.sectionBottomGap` (default `"0.9mm"`) — the gap
  between a section title's underline and its first line of content
  (e.g. "ORDER" → "#0015"). This used to be hardcoded inside
  `.section-label` in `receipt-template.ts`; pulled out to
  `receipt-config.ts` so it's a one-line edit like everything else.
  Its sibling, `style.sectionTopGap`, already existed — that's the gap
  *above* a title, between it and whatever section came before it.
  Together these two are the "gap between title and content" controls
  the whole section-header rhythm.
- User tightened `style.sectionTopGap` themselves, 2.5mm → 1.5mm.

## Round 3.2 (same day) — two more gap knobs made editable

Two more spacing requests, both about gaps *within* a section rather
than around its title:

- **New**: `style.orderRowGap` (default `"1mm"`) — the gap *between*
  the Order section's own detail rows, e.g. "#0015 / Table 4" down to
  "Merry / POS-01". This is different from `sectionBottomGap`:
  `sectionBottomGap` is title → first row ("ORDER" → "#0015"),
  `orderRowGap` is row → row ("#0015" → "Merry"). Was hardcoded as
  `.order-grid`'s `row-gap: 1mm`.
- **New**: `style.itemDetailGap` (default `"0.4mm"`) — the gap
  *between one item's own detail lines*: item name → Arabic name →
  "2 × 25.00" (qty×price) → note (e.g. "Extra hot · no sugar"). Was
  hardcoded to 0.4mm across three separate CSS rules
  (`.item-name-ar`, `.item-meta`, `.item-note`'s `margin-top`) — now
  one shared knob. Not to be confused with `style.itemPadding`, which
  is the gap *between two different items* (top+bottom padding on the
  whole `.item` block), not within one.

Both are visually unchanged from before (same default values as what
was previously hardcoded) — this round was purely about exposing them
in `receipt-config.ts` as editable knobs, nothing moved on paper.

## Round 3.3 (same day) — reviewed the ticket (KOT) template

Asked to review `ticket-template.ts` for anything worth changing.
Findings:

- It already benefits from both shared fixes above for free, since it
  goes through the same `rasterizeHtmlToPngBase64()`/`PRINT_CSS` in
  `qz.ts`: the full-width padding fix (`ticket.style.paddingLeftMm`/
  `paddingRightMm` were already `0.7mm`) and, more importantly, the
  `padding: 0 !important` bug — that one was *also* silently zeroing
  `ticket.style.bottomPadding` on every kitchen ticket, not just the
  receipt. Already fixed, already verified (KOT screenshot shows
  "GX Gravbo" with real margin below it).
- Text sizing/weight/color on the ticket was never in the same danger
  zone the receipt was: its smallest text is ~8.5pt vs. the receipt's
  7–7.5pt, and its colors (#333, #000) are already threshold-safe —
  no dropout risk found.
- Two gaps were still hardcoded in `ticket-template.ts` itself
  (couldn't be tuned from config, same problem the receipt had before
  this round) — pulled both into `ticket.style` for consistency,
  **default values unchanged**:
  - **New**: `style.headerGap` (default `"4mm"`) — gap between the
    header's underline (below the KOT badge/order number/table/time)
    and the first item.
  - **New**: `style.itemDetailGap` (default `"0.6mm"`) — gap between
    an item's name and its Arabic translation. The note callout
    underneath keeps its own separate, deliberately larger gap
    (1.6mm, still hardcoded) since it's a bordered box, not a plain
    detail line — didn't fold that into the same knob.
- Left the header's overall size/boldness and the big quantity/name
  text alone on purpose — a KOT is meant to be read at a glance from
  across a kitchen, so "bolder/bigger" is doing its job here, unlike
  on the receipt where it read as heavy-handed. Flagged this as a
  judgment call rather than trimming it unasked.

## Round 3.4 (same day) — found a real Live-preview-vs-print mismatch

Reported: "in preview there's no gap between ORDER's underline and
#0015, but in print there's a real gap." Measured it directly instead
of guessing — rendered the same receipt through both "Live preview"
(the modal's iframe) and "Exact print" (the actual rasterized PNG that
gets sent to the printer), then read pixel rows off each image to get
the real gap in mm.

**Confirmed real, not imagined**: the gap below a section's underline
runs consistently **~2.8mm bigger in the raster than in Live preview**,
same offset on ORDER (CSS grid), CUSTOMER (flex), and ITEMS (plain
block) — so it isn't one layout type misbehaving, it's `html2canvas`
(the library `rasterizeHtmlToPngBase64()` in `qz.ts` uses to turn the
receipt into a printable image) positioning text within its own line
box lower than a real browser does. This is a known category of
html2canvas limitation (imprecise text vertical metrics), not a bug in
this codebase to "fix" — it's baked into the library, so the practical
fix is to compensate for it in the config instead.

**What changed, all in `receipt-config.ts`:**

- `style.sectionBottomGap`: `0.9mm` → **`-1mm`** (negative — yes, on
  purpose). Since the raster always adds ~2.8mm on top of whatever this
  is set to, a negative value is what gets the *actual printed* gap
  down to something tight. **This will look wrong/overlapping in Live
  preview from now on — that's expected.** Always judge this value (and
  any future tweak to it) against "Exact print", never "Live preview" —
  preview is not what prints, it never fully was, that's the entire
  reason the "Exact print" toggle exists.
- `style.sectionTopGap`: `1.5mm` → `3mm` — more breathing room above a
  section title (Merry/POS-01 → CUSTOMER, Saif Eddine → ITEMS), as
  requested.
- Removed a stray hardcoded `.items { margin-top: 0.5mm; }` in
  `receipt-template.ts` — this was stacking on top of
  `sectionBottomGap` for the ITEMS section specifically, so ITEMS
  always had a visibly bigger title→content gap than ORDER/CUSTOMER no
  matter what `sectionBottomGap` was set to. Now all three sections are
  driven by the same one number.

Measured result on Exact print after these changes: ORDER → #0015 gap
1.75mm, CUSTOMER → Saif Eddine gap 1.5mm, ITEMS → Tiramisu gap 3.0mm.
ITEMS still runs a bit bigger than the other two — its first line
(item name) is larger/bolder than ORDER's or CUSTOMER's, and bigger
text carries more of its own built-in line-height leading, which adds
to the same html2canvas offset. Didn't chase it further with a
per-section override to avoid adding fragile, content-dependent
special-casing; `sectionBottomGap` can be pushed more negative if this
residual difference still bothers you on real paper.

## Round 3.5 (same day) — preview cleanup + PAYABLE/TOTAL centering + badge centering

Four separate asks in one message, all fixed, all verified against
"Exact print" rasters (never "Live preview" — see Round 3.4 for why):

**A. Preview modal now shows only "Exact print" (ESC/POS simulation)**

Removed the Live/Exact toggle in `PreviewModal.tsx` entirely. This
wasn't just simplification — Round 3.4 already proved Live preview
doesn't reliably match real print output, so offering it as an equal
option was actively misleading. `view` is now a plain derived constant
(`canSimulate ? "exact" : "live"`), and "Live preview" only ever shows
as a fallback when there's genuinely nothing to simulate (no printer
selected, or a pixel-mode printer that goes through the OS driver
instead of raw ESC/POS). When the simulation is available, a
non-interactive "Exact print (ESC/POS)" badge replaces the old toggle
buttons.

**B. "PAYABLE" (Order Receipt / bill mode) now gets its Arabic line**

`receipt-template.ts` was hardcoding `totalAr = ""` whenever the
receipt was in bill mode, so "PAYABLE" printed with no Arabic
translation under it while "TOTAL" (checkout mode) always got one.
Fixed by reusing `config.bill.labels.amountDue.ar` — an Arabic string
that already existed in the config but was sitting unused.

**C. TOTAL/PAYABLE price now vertically centers against the label**

The `.grand` box (TOTAL/PAYABLE + Arabic on the left, the price on the
right) used `align-items: center` to vertically center the price
against the two-line label stack. Confirmed on the raster that flex
`align-items: center` is **not reliably honored by html2canvas** — the
price rendered pinned to the bottom instead. Tried `display: table` /
`table-cell` / `vertical-align: middle` as a "safer" alternative —
that caused an actual regression, the price visually overlapped the
Arabic label on the raster (html2canvas's table auto-layout column
sizing doesn't match a real browser either). Settled on: keep flex for
horizontal `justify-content: space-between` only (that part already
worked), and vertically position the price with a manually-calibrated
plain `margin-top: 1.7mm` on `.grand-value` instead — pure block-flow
margin, no cross-axis alignment algorithm involved. Verified centered
on both the Order Receipt (PAYABLE) and Checkout Receipt (TOTAL)
rasters.

**D. KOT / CANCELLED badge text now vertically centers in its box**

`.tk-badge` used symmetric padding (`1.2mm 3mm`). On the raster the
text sat hard against the bottom of the badge with a big empty gap
above — the same html2canvas "text sits low in its own line" quirk
from Round 3.4, just more visible here because the badge is short and
single-line. Padding-top can't go negative, so this took two passes:
first dropped padding-top to `0mm` and roughly doubled padding-bottom,
which helped but wasn't yet centered (measured 20px empty above vs 7px
below on the raster, out of a 47px box). Since the ~20px gap at
padding-top:0 is essentially the floor of html2canvas's built-in
offset — it can't be reduced further from the top side — the fix was
to keep growing padding-bottom until the box is tall enough that the
*same* 20px offset now available on the bottom side too, which means
growing the box until space-below also reaches 20px. Landed on
`padding: 0mm 3mm 4mm`. Verified on the raster for **both** badges
(they share the same CSS class): KOT measured 20px above / 20px below,
CANCELLED measured 20px above / 20px below — both centered, box is a
bit taller than before but reads cleanly.

Files touched: `PreviewModal.tsx`, `receipt-template.ts` (`.grand`
family + `totalAr`), `ticket-template.ts` (`.tk-badge`). No config
changes this round — everything was CSS/logic fixes inside the
templates and the preview component.

## Round 3.6 (same day) — cancellation ticket cleanup + a flaky missing underline

**Cancellation ticket ("CANCELLED" ticket, `mode: "cancellation"`):**

Reported three things wrong, all on the cancellation ticket specifically
(not the regular KOT): a stray line "on the right side", a line "at the
top of each product", and a strikethrough on the item name that "isn't
visible on print". Investigated on the actual raster rather than
guessing, and it turned out to be **two bugs, not three** — the "top of
each product" line and the "cut" line were the same bug wearing two
descriptions:

- `text-decoration: line-through` on a **wrapped, multi-line** item name
  (e.g. "TIRAMISU ARABIC" / "COFFEE") isn't positioned correctly by
  html2canvas. Confirmed on the raster: it drew the strikethrough
  correctly through the text, **and** a second, extra decoration line
  floating well above the text entirely — toggling `text-decoration`
  off and re-rendering made both disappear together, which is what
  confirmed it was one cause, not two. This is the same category of
  html2canvas limitation as the border/flex issues documented earlier
  in this file (text-decoration positioning, not just plain text
  positioning, isn't reliable) — so it's removed rather than
  fought. The CANCELLED badge and the black "REMOVED PRODUCTS" band
  already carry the "this is void" meaning without it.
- `.tk-item-void`'s own `border-left` + `padding-left` (meant to give
  each cancelled item its own short left-edge marker) was rendering as
  one **continuous vertical line down the entire item list** — with
  every item in a cancellation ticket getting the same class, the
  individual 2.5px bars stack with essentially no gap between them and
  read as a single line running top to bottom, not "each item has its
  own marker." That's the line reported as being on the ticket's edge.
  Removed for the same reason as above — redundant with the badge/band.

The small vertical bar next to a **note** ("Extra hot · no sugar") is
untouched — that's `.tk-item-note`'s own border, a deliberate callout
style shared with the regular KOT ticket, and wasn't part of what was
reported.

**Order Receipt — CUSTOMER's underline occasionally missing from the simulation:**

Reported: the "Exact print" simulation was missing the underline below
"CUSTOMER" (ORDER's underline, same CSS class, rendered fine right
above it), while the real printed paper had it. Couldn't reproduce it
on demand with the same content — which itself is a clue: same HTML,
same CSS, different result between runs points to the raster pipeline
being borderline on this one rule, not a layout bug. Two defensive
fixes, both aimed at the same root cause (a 1px rule is the thinnest,
least forgiving line on the receipt, so it's the first thing to fall
victim to any timing or sub-pixel rounding edge case in the raster):

- `.section-label`'s `border-bottom`: `1px` → `1.5px` — matches the
  border weight already used everywhere else a black rule needs to
  reliably survive the raster+threshold pipeline (`.grand`, `.tk-notes`,
  `.tk-footer` are all already 1.5px+; this was the one rule in the file
  still at the fragile 1px).
- `rasterizeHtmlToPngBase64()` in `qz.ts` now waits **two**
  `requestAnimationFrame` ticks after `document.fonts.ready` instead of
  one, before handing the element to html2canvas — one extra frame
  (~16ms) of margin in case the font swap's layout reflow hadn't fully
  settled when the capture fired.

Files touched: `ticket-template.ts` (`.tk-item-void` block),
`receipt-template.ts` (`.section-label`), `qz.ts`
(`rasterizeHtmlToPngBase64`). No config changes.

## New: optional Print Agent connection mode (2026-09-29)

Added a second, opt-in transport for print jobs, for the mobile case
(a phone has no local QZ Tray to connect to). **Direct QZ Tray printing
is completely unchanged** — same code paths, same behavior, default
mode. This section only covers what's new.

### What changed and why

- **Integration point**: the two `await qz.print(config, data)` calls
  inside `printHtml()` in `src/lib/qz.ts` (pixel-mode branch and
  raw-mode branch). Everything above them — HTML build, image
  inlining, raw/pixel decision (`guessRawCapable`), rasterization
  (`rasterizeHtmlToPngBase64`), cut command — is 100% shared and
  untouched between the two modes.
- **New `connectionMode`/`agentUrl` params** on `printHtml()` (default
  `"direct"`, so any existing caller that doesn't pass them behaves
  exactly as before). In `"agent"` mode, instead of building a
  `qz.configs.create(...)` instance and calling `qz.print()` locally,
  the same `configOptions` object (what would've been passed to
  `qz.configs.create`) plus the same `data` array are POSTed to
  `${agentUrl}/print`. A browser-built `Config` instance can't survive
  JSON over HTTP, so the options it was built from travel instead —
  the agent reconstructs the identical `qz.configs.create(printerName,
  configOptions)` call on its own `qz-tray` client. Same inputs, same
  `qz.print()` call, different machine.
- **`src/hooks/useQz.ts`**: `connect()`/`refreshPrinters()`/`print()`
  each gained an `"agent"` branch alongside the original, unmodified
  `"direct"` branch. In agent mode there's no local QZ Tray websocket
  at all — `connect()` checks `GET {agentUrl}/status`,
  `refreshPrinters()` calls `GET {agentUrl}/printers`, and `print()`
  skips `connectQz()` entirely (the agent owns that connection).
- **`src/lib/storage.ts`**: new, additive `readConnectionMode` /
  `writeConnectionMode` / `readAgentUrl` / `writeAgentUrl` — same
  `localStorage`-per-browser pattern as the existing
  `readPrinter`/`writePrinter`, new keys (`qz.connection.mode`,
  `qz.connection.agentUrl`), nothing existing touched.
- **New `src/components/ConnectionModePanel.tsx`**: smallest possible
  UI addition, in the Printers tab above the existing
  Reconnect/Refresh buttons. A segmented Direct/Agent switch (same
  pattern as `SetupPanel.tsx`'s OS switcher) and, only in Agent mode,
  one text field for the agent's URL. No new visual system — reuses
  `Card`, the same shadow override every other Printers-tab card
  already uses, and the app's existing Tailwind classes.
- **`src/App.tsx`**: owns `connectionMode`/`agentUrl` state (read from
  storage on mount), passes them into `useQz(...)` and into
  `ConnectionModePanel`. `PrintCards`/`handlePrintReceipt` etc. are
  unchanged — they still just call `print({ printerName, html,
  printer, label })`; the hook decides the transport.

### The agent itself

Lives in a **separate repo/project**, `GrabvoPrintPing`
(`github.com/maiz-an/Grabvo-P2`), not in this repo. It's a thin
transport bridge only — no receipt/ticket templates, no formatting, no
business logic. It uses the official `qz-tray` npm package in Node
(per `qz.io/docs/api-overrides`: `setWebSocketType(ws)`,
`setPromiseType`, `setSha256Type`) and calls back to **this app's own**
`/digital-certificate.txt` and `/sign-message` endpoints for QZ's
cert/signing handshake — same private key, same server, never copied
anywhere else. See that repo's own `CLAUDE.md`/`README.md` for its
internals.

### Not changed

- `server.js` / `server/index.ts` (`/digital-certificate.txt`,
  `/sign-message`, `/logo-base64`) — untouched. The agent is just a new
  *caller* of the same two signing endpoints, same as the browser
  always was.
- Every receipt/ticket layout, `receipt-config.ts`, the raw/pixel
  decision, rasterization, cut commands — identical in both connection
  modes, since the web app remains the only thing that builds print
  content in either mode.