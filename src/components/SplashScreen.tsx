import React, { useEffect, useState } from "react";
import { Logo } from "./Logo";

interface SplashScreenProps {
  /** Minimum time the splash stays fully visible, in ms. */
  minDuration?: number;
  /** Fired once the splash has fully faded out. */
  onDone?: () => void;
}

export function SplashScreen({
  minDuration = 1400,
  onDone,
}: SplashScreenProps) {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const fadeTimer = window.setTimeout(() => setFading(true), minDuration);
    const doneTimer = window.setTimeout(() => {
      setVisible(false);
      onDone?.();
    }, minDuration + 500);
    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(doneTimer);
    };
  }, [minDuration, onDone]);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-[10000] flex items-center justify-center bg-[#f8fafc] transition-opacity duration-500 ease-out ${
        fading ? "opacity-0" : "opacity-100"
      }`}
      aria-hidden="true"
    >
      {/* ambient blobs — match the app's Background treatment */}
      <div
        className="pointer-events-none absolute -left-40 -top-40 h-[460px] w-[460px] rounded-full opacity-40 blur-3xl"
        style={{
          background:
            "radial-gradient(circle at 40% 40%, rgba(124,58,237,0.35), transparent 70%)",
        }}
      />
      <div
        className="pointer-events-none absolute -bottom-40 -right-40 h-[460px] w-[460px] rounded-full opacity-30 blur-3xl"
        style={{
          background:
            "radial-gradient(circle at 60% 60%, rgba(59,130,246,0.30), transparent 70%)",
        }}
      />

      <div className="relative z-10 flex flex-col items-center">
        <Logo />

        {/* Animated violet progress bar (mirrors LoaderLogo underline) */}
        <div className="relative mt-5 h-1.5 w-24 overflow-hidden rounded-full bg-violet-100">
          <span className="animate-splash-bar absolute inset-y-0 left-0 w-1/3 rounded-full bg-violet-600" />
        </div>

        <p className="mt-4 text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">
          Preparing Print Setup
        </p>
      </div>
    </div>
  );
}

export default SplashScreen;