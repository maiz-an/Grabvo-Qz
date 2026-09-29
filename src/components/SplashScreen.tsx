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
      <div className="relative z-10 flex flex-col items-center">
        <Logo />

        {/* Animated violet progress bar (mirrors LoaderLogo underline) */}
        <div className="relative mt-5 h-1 w-24 overflow-hidden rounded-full bg-slate-200">
          <span className="animate-splash-bar absolute inset-y-0 left-0 w-1/3 rounded-full bg-violet-600" />
        </div>

        <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-400">
          Preparing Print Setup
        </p>
      </div>
    </div>
  );
}

export default SplashScreen;