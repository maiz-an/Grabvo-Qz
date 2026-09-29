import React, { useEffect, useRef, useState } from "react";

import type { PrinterConfig } from "@/config/types";
import { guessRawCapable, simulateEscposPrint } from "@/lib/qz";

export type PreviewKind = "receipt" | "bill" | "ticket" | "cancellation";

interface PreviewModalProps {
  kind: PreviewKind | null;
  html: string;
  widthMm: number;
  onClose: () => void;
  /** Optional — enables the "Exact print" tab (raw ESC/POS simulation). */
  printer?: PrinterConfig;
  printerName?: string;
}

export function PreviewModal({
  kind,
  html,
  widthMm,
  onClose,
  printer,
  printerName,
}: PreviewModalProps) {
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const [ready, setReady] = useState(false);

  /*
   * "Exact print" tab — renders the SAME raster + threshold pipeline
   * the real print job goes through, instead of live anti-aliased
   * HTML. Only meaningful for raw/ESC-POS mode (pixel mode prints
   * through the OS driver, which does its own halftoning QZ doesn't
   * expose) and only for a printer that actually looks raw-capable —
   * otherwise this would show a simulation that doesn't apply.
   */
  const canSimulate =
    !!printer &&
    printer.mode === "raw" &&
    guessRawCapable(printerName || "");

  /*
   * ← CHANGED: no more Live/Exact toggle. The preview always shows the
   * ESC/POS simulation when it's available (canSimulate) — "Live
   * preview" is only ever a fallback for when we genuinely can't
   * simulate yet (no printer selected, or a non-raw/pixel-mode
   * printer, where there's no raster+threshold pipeline to simulate in
   * the first place). This isn't just a UI simplification: it turned
   * out "Live preview" spacing doesn't reliably match what actually
   * prints (html2canvas positions text slightly differently than a
   * real browser does), so showing it side-by-side as an equal option
   * was actively misleading — better to only show the one view that's
   * always true to the real output.
   */
  const view: "live" | "exact" = canSimulate ? "exact" : "live";
  const [simSrc, setSimSrc] = useState<string | null>(null);
  const [simLoading, setSimLoading] = useState(false);
  const [simError, setSimError] = useState(false);

  useEffect(() => {
    setSimSrc(null);
    setSimError(false);
  }, [kind, html]);

  useEffect(() => {
    if (!kind || view !== "exact" || !printer) return;
    if (simSrc) return;

    let cancelled = false;
    setSimLoading(true);
    setSimError(false);

    simulateEscposPrint(html, printer)
      .then((src) => {
        if (!cancelled) setSimSrc(src);
      })
      .catch(() => {
        if (!cancelled) setSimError(true);
      })
      .finally(() => {
        if (!cancelled) setSimLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [kind, view, html, printer, simSrc]);

  /*
   * Reset preview whenever the preview type or HTML changes.
   */
  useEffect(() => {
    if (!kind) {
      setReady(false);
      return;
    }

    setReady(false);
  }, [kind, html]);

  /*
   * Resize iframe to the full height of the receipt.
   *
   * The iframe itself becomes as tall as the complete receipt.
   * The modal body (below) handles scrolling when that's taller
   * than the available space.
   */
  useEffect(() => {
    if (!kind) return;

    const frame = frameRef.current;
    if (!frame) return;

    let resizeObserver: ResizeObserver | null = null;

    const fit = () => {
      try {
        const doc = frame.contentDocument;

        if (!doc || !doc.body) return;

        const htmlElement = doc.documentElement;
        const body = doc.body;

        const height = Math.max(
          htmlElement.scrollHeight,
          htmlElement.offsetHeight,
          htmlElement.clientHeight,
          body.scrollHeight,
          body.offsetHeight,
          body.clientHeight
        );

        if (height > 0) {
          frame.style.height = `${height}px`;
        }
      } catch {
        // Ignore iframe access errors.
      }
    };

    const onLoad = () => {
      /*
       * Run several times because receipt HTML/fonts/images
       * may finish rendering slightly after iframe load.
       */
      fit();

      window.setTimeout(fit, 50);
      window.setTimeout(fit, 150);
      window.setTimeout(fit, 300);
      window.setTimeout(fit, 600);

      setReady(true);

      /*
       * Watch the receipt content for changes.
       */
      try {
        const doc = frame.contentDocument;

        if (doc?.body && typeof ResizeObserver !== "undefined") {
          resizeObserver = new ResizeObserver(() => {
            fit();
          });

          resizeObserver.observe(doc.body);
        }
      } catch {
        // Ignore observer errors.
      }
    };

    frame.addEventListener("load", onLoad);

    /*
     * If iframe has already loaded.
     */
    if (frame.contentDocument?.readyState === "complete") {
      onLoad();
    }

    return () => {
      frame.removeEventListener("load", onLoad);

      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, [kind, html]);

  /*
   * Close preview when Escape is pressed.
   */
  useEffect(() => {
    if (!kind) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [kind, onClose]);

  if (!kind) {
    return null;
  }

  const titles: Record<PreviewKind, string> = {
    receipt: "Checkout Receipt Preview",
    bill: "Order Receipt Preview",
    ticket: "Preparation Receipt Preview",
    cancellation: "Cancellation Receipt Preview",
  };
  const title = titles[kind];

  return (
    /* ==============================================================
       BACKDROP — dimmed + blurred, sits above the light app chrome
       ============================================================== */
    <div
      className="
        fixed
        inset-0
        z-[9998]
        flex
        items-center
        justify-center
        bg-slate-900/60
        p-4
        backdrop-blur-sm
        sm:p-6
      "
      onClick={(event) => {
        /*
         * Close only when clicking the dark background,
         * not when clicking inside the modal.
         */
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      {/* ============================================================
          MODAL CARD
          ============================================================ */}
      <div
        className="
          flex
          max-h-[92vh]
          w-[min(520px,100%)]
          flex-col
          overflow-hidden
          rounded-lg
          border
          border-slate-200
          bg-white
          shadow-lg
        "
      >
        {/* ==========================================================
            HEADER
            ========================================================== */}
        <div
          className="
            flex
            flex-none
            items-center
            justify-between
            border-b
            border-slate-200
            bg-slate-50
            px-6
            py-4
            text-[13px]
            font-semibold
            text-slate-900
          "
        >
          <span className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-violet-600" />
            {title}
          </span>

          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-medium text-slate-500 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            <i className="fa-solid fa-xmark" aria-hidden="true" /> Close
          </button>
        </div>

        {/* ==========================================================
            "Exact print" badge — no toggle anymore, just a label
            confirming what's shown is the real raster + threshold
            simulation, not a live-HTML approximation. Only shown when
            we actually have one (canSimulate); otherwise the fallback
            live iframe below renders with no badge at all.
            ========================================================== */}
        {canSimulate && (
          <div className="flex flex-none justify-center border-b border-slate-200 bg-white px-6 py-2.5">
            <span className="rounded bg-violet-600 px-3 py-1 text-[11px] font-medium text-white">
              Exact print (ESC/POS)
            </span>
          </div>
        )}

        {/* ==========================================================
            MODAL BODY
            ========================================================== */}
        <div
          className="
            hide-scrollbar
            relative
            min-h-0
            overflow-y-auto
            overflow-x-hidden
            bg-slate-100
            p-6
            flex
            items-start
            justify-center
          "
        >
          {/* ========================================================
              LOADING PLACEHOLDER — uses shared shimmer wash
              ======================================================== */}
          <div
            className={
              "pointer-events-none absolute left-1/2 top-6 -translate-x-1/2 transition-opacity duration-200 " +
              (ready ? "opacity-0" : "opacity-100")
            }
          >
            <div
              className="
                flex
                h-[520px]
                flex-col
                gap-3
                rounded-lg
                border
                border-slate-200
                bg-white
                p-5
                shadow-sm
              "
              style={{
                width: `${widthMm}mm`,
                minWidth: 260,
                maxWidth: "100%",
              }}
            >
              <div className="skeleton-shimmer h-3 w-2/3 rounded-md" />
              <div className="skeleton-shimmer h-2 w-full rounded-md" />
              <div className="skeleton-shimmer h-2 w-5/6 rounded-md" />
              <div className="skeleton-shimmer h-2 w-full rounded-md" />
              <div className="skeleton-shimmer h-2 w-4/5 rounded-md" />

              <div className="my-2 h-px w-full bg-slate-100" />

              <div className="skeleton-shimmer h-2 w-full rounded-md" />
              <div className="skeleton-shimmer h-2 w-full rounded-md" />
              <div className="skeleton-shimmer h-2 w-3/4 rounded-md" />

              <div className="skeleton-shimmer mt-2 h-8 w-full rounded-lg" />

              <div className="skeleton-shimmer h-2 w-full rounded-md" />
              <div className="skeleton-shimmer h-2 w-5/6 rounded-md" />
              <div className="skeleton-shimmer h-2 w-2/3 rounded-md" />
            </div>
          </div>

          {/* ========================================================
              RECEIPT / TICKET IFRAME — "Live preview"
              ======================================================== */}
          <iframe
            ref={frameRef}
            title="Preview"
            scrolling="no"
            srcDoc={html}
            className="
              mx-auto
              block
              flex-none
              rounded-lg
              border
              border-slate-200
              bg-white
              shadow-sm
            "
            style={{
              display: view === "live" ? "block" : "none",
              width: `${widthMm}mm`,
              minWidth: 260,
              maxWidth: "100%",
              height: 1,
              border: 0,
              overflow: "hidden",
              opacity: ready ? 1 : 0,
              transition: "opacity 200ms ease",
            }}
          />

          {/* ========================================================
              EXACT PRINT — the actual raster QZ sends to the printer,
              thresholded to black/white exactly like ESC/POS will.
              ======================================================== */}
          {view === "exact" && (
            <div
              className="mx-auto flex flex-none justify-center rounded-lg border border-slate-200 bg-white shadow-sm"
              style={{ width: `${widthMm}mm`, minWidth: 260, maxWidth: "100%" }}
            >
              {simLoading && (
                <div className="flex h-[300px] items-center justify-center text-[12px] font-semibold text-slate-400">
                  Rendering exact print…
                </div>
              )}
              {!simLoading && simError && (
                <div className="flex h-[300px] items-center justify-center px-6 text-center text-[12px] font-semibold text-rose-500">
                  Couldn't render the print simulation.
                </div>
              )}
              {!simLoading && !simError && simSrc && (
                <img
                  src={simSrc}
                  alt="Exact print simulation"
                  style={{ width: "100%", display: "block", imageRendering: "pixelated" }}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default PreviewModal;