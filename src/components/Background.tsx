import React from "react";

/**
 * Soft, light Grabvo-style background — near-neutral version.
 *
 * Earlier revisions used violet + indigo washes that, even at low opacity,
 * read as "purple app" against the #f8fafc base. This version pulls almost
 * all of the colour out: one ultra-faint warm slate wash at the top-left
 * for a hint of depth, and a whisper-thin neutral vignette on the right.
 * The dot grid is a faint neutral too, not violet-tinted.
 *
 * Result: the page reads as off-white / warm paper with the faintest
 * suggestion of warmth in the corners. No blue, no purple, no visible
 * gradient — just enough to keep the flat #f8fafc from feeling like
 * dead paper.
 *
 * Everything sits behind the app content (z-0) and never captures pointer
 * events.
 */
export function Background() {
  return (
    <>
      {/* -------- dot-grid texture — neutral slate, very faint -------- */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        aria-hidden="true"
        style={{
          // Neutral slate dots at ~4% opacity. Not violet, not blue.
          backgroundImage:
            "radial-gradient(rgba(100,116,139,0.10) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
          maskImage:
            "radial-gradient(ellipse 100% 70% at 50% 0%, black 25%, transparent 100%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 100% 70% at 50% 0%, black 25%, transparent 100%)",
        }}
      />

      {/* -------- top-left: barely-there warm wash --------
          Peak opacity 0.06 — visible as a soft lift, not a colour. */}
      <div
        className="pointer-events-none fixed -left-40 -top-40 z-0 h-[560px] w-[560px] animate-blob-1 rounded-full blur-3xl"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(circle at 40% 40%, rgba(120,113,108,0.06), transparent 72%)",
        }}
      />

      {/* -------- right side: neutral vignette, no colour -------- */}
      <div
        className="pointer-events-none fixed -right-40 top-1/3 z-0 h-[520px] w-[520px] animate-blob-2 rounded-full blur-3xl"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(circle at 60% 40%, rgba(100,116,139,0.05), transparent 75%)",
        }}
      />
    </>
  );
}