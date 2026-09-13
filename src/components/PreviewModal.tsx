import React, { useEffect, useRef, useState } from "react";

export type PreviewKind = "receipt" | "bill" | "ticket" | "cancellation";

interface PreviewModalProps {
  kind: PreviewKind | null;
  html: string;
  widthMm: number;
  onClose: () => void;
}

export function PreviewModal({
  kind,
  html,
  widthMm,
  onClose,
}: PreviewModalProps) {
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const [ready, setReady] = useState(false);

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
          MODAL CARD — matches Grabvo's Card (rounded-[2rem])
          ============================================================ */}
      <div
        className="
          flex
          max-h-[92vh]
          w-[min(520px,100%)]
          flex-col
          overflow-hidden
          rounded-[2rem]
          border
          border-slate-100
          bg-white
          shadow-[0_24px_80px_rgba(15,23,42,.35)]
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
            border-slate-100
            bg-slate-50
            px-6
            py-4
            text-[13px]
            font-bold
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
            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-bold text-slate-500 transition-all duration-300 hover:border-violet-200 hover:text-violet-600 focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            <i className="fa-solid fa-xmark" aria-hidden="true" /> Close
          </button>
        </div>

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
          style={{
            backgroundImage:
              "radial-gradient(circle at 50% 0%, rgba(124,58,237,.08), transparent 60%)",
          }}
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
                rounded-2xl
                bg-white
                p-5
                shadow-[0_18px_50px_rgba(15,23,42,.18)]
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
              RECEIPT / TICKET IFRAME
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
              rounded-2xl
              bg-white
              shadow-[0_3px_8px_rgba(15,23,42,.18)]
            "
            style={{
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
        </div>
      </div>
    </div>
  );
}

export default PreviewModal;