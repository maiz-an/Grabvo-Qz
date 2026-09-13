import React from "react";

/**
 * Soft, light Grabvo-style background: a subtle dot-grid texture plus
 * two slow-floating violet/blue gradient blobs. Everything here sits
 * behind the app content (z-0 / z-[1]) and never captures pointer
 * events.
 */
export function Background() {
  return (
    <>
      {/* -------- dot-grid texture -------- */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        aria-hidden="true"
        style={{
          backgroundImage:
            "radial-gradient(rgba(124,58,237,0.14) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
          maskImage:
            "radial-gradient(ellipse 80% 60% at 50% 0%, black 40%, transparent 100%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 80% 60% at 50% 0%, black 40%, transparent 100%)"
        }}
      />

      {/* -------- floating gradient blobs -------- */}
      <div
        className="pointer-events-none fixed -left-24 -top-24 z-0 h-[420px] w-[420px] animate-blob-1 rounded-full opacity-40 blur-3xl"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(circle at 30% 30%, rgba(124,58,237,0.35), transparent 70%)"
        }}
      />
      <div
        className="pointer-events-none fixed -right-32 top-40 z-0 h-[380px] w-[380px] animate-blob-2 rounded-full opacity-30 blur-3xl"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(circle at 60% 40%, rgba(59,130,246,0.30), transparent 70%)"
        }}
      />
      <div
        className="pointer-events-none fixed bottom-[-160px] left-1/3 z-0 h-[360px] w-[360px] animate-blob-1 rounded-full opacity-25 blur-3xl"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, rgba(124,58,237,0.25), transparent 70%)"
        }}
      />
    </>
  );
}
