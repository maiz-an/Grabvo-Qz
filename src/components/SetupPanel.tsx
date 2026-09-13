import React, { useEffect, useState } from "react";
import Card from "./Card";

type OS = "windows" | "mac" | "other";

/**
 * Detects the user's operating system from the User-Agent + platform.
 * Falls back to "other" if we can't tell — never throws, always returns
 * a value, so the UI always has something to render.
 */
function detectOS(): OS {
  if (typeof navigator === "undefined") return "other";
  const ua = (navigator.userAgent || "").toLowerCase();
  const platform = (
    (navigator as any).userAgentData?.platform
      ? (navigator as any).userAgentData.platform
      : navigator.platform || ""
  ).toLowerCase();

  if (ua.includes("windows") || platform.includes("win")) return "windows";
  if (
    ua.includes("macintosh") ||
    ua.includes("mac os") ||
    platform.includes("mac")
  ) {
    return "mac";
  }
  return "other";
}

/** Where the user's manual OS choice is persisted, if they override auto-detect. */
const OS_OVERRIDE_KEY = "grabvo:setup-os-override";

function readOverride(): OS | null {
  try {
    const v = localStorage.getItem(OS_OVERRIDE_KEY);
    if (v === "windows" || v === "mac" || v === "other") return v;
  } catch {
    /* localStorage blocked — fine, just fall back to auto-detect */
  }
  return null;
}

function writeOverride(os: OS) {
  try {
    localStorage.setItem(OS_OVERRIDE_KEY, os);
  } catch {
    /* ignore */
  }
}

function clearOverride() {
  try {
    localStorage.removeItem(OS_OVERRIDE_KEY);
  } catch {
    /* ignore */
  }
}

/* -------------------------------------------------------------------------
   Tiny OS segmented control — 3 pills, iOS-style
   ------------------------------------------------------------------------- */
const OS_LABELS: Record<OS, string> = {
  windows: "Windows",
  mac: "macOS",
  other: "Other",
};

interface OsSwitcherProps {
  value: OS;
  onChange: (os: OS) => void;
}

function OsSwitcher({ value, onChange }: OsSwitcherProps) {
  return (
    <div
      className="flex items-center gap-0.5 rounded-full bg-slate-100 p-0.5"
      role="tablist"
      aria-label="Switch operating system"
    >
      {(Object.keys(OS_LABELS) as OS[]).map((os) => {
        const isActive = value === os;
        return (
          <button
            key={os}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(os)}
            className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.08em] transition-all duration-200 ${
              isActive
                ? "bg-white text-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.08)]"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {OS_LABELS[os]}
          </button>
        );
      })}
    </div>
  );
}

interface StepProps {
  n: number;
  children: React.ReactNode;
}

function Step({ n, children }: StepProps) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-0.5 flex h-6 w-6 flex-none items-center justify-center rounded-full bg-violet-600 text-[11px] font-black text-white">
        {n}
      </span>
      <span className="pt-0.5 text-[12.5px] leading-relaxed text-slate-600">
        {children}
      </span>
    </li>
  );
}

export function SetupPanel() {
  /* Detected OS is stored separately from the currently-viewed OS, so if
     the user overrides the choice we can still show an "Auto" reset. */
  const [autoOs, setAutoOs] = useState<OS>("other");
  const [os, setOs] = useState<OS>("other");
  const [isOverridden, setIsOverridden] = useState(false);

  useEffect(() => {
    const detected = detectOS();
    setAutoOs(detected);

    const saved = readOverride();
    if (saved) {
      setOs(saved);
      setIsOverridden(true);
    } else {
      setOs(detected);
    }
  }, []);

  const handleSwitch = (next: OS) => {
    setOs(next);
    if (next === autoOs) {
      // Selecting the auto-detected option clears the override — so the
      // next visit starts fresh from auto-detect again.
      clearOverride();
      setIsOverridden(false);
    } else {
      writeOverride(next);
      setIsOverridden(true);
    }
  };

  return (
    <Card padding="none" className="px-6 py-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[13px] font-bold text-slate-900">
          <i
            className="fa-solid fa-shield-halved text-violet-600"
            aria-hidden="true"
          />
          Enable silent printing
        </div>

        <div className="flex items-center gap-2">
          <OsSwitcher value={os} onChange={handleSwitch} />
        </div>
      </div>

      {os === "windows" && <WindowsSetup />}
      {os === "mac" && <MacSetup />}
      {os === "other" && <OtherSetup />}
    </Card>
  );
}

/* -------------------------------------------------------------------------
   Windows - one .cmd file, self-elevating, installs QZ Tray + trusts cert
   ------------------------------------------------------------------------- */
function WindowsSetup() {
  return (
    <div className="space-y-4">
      <p className="text-[12.5px] leading-relaxed text-slate-500">
        Download the one-click installer and run it. It handles everything —
        installs QZ Tray if you don&apos;t have it, then trusts the Grabvo
        certificate so printing runs silently with no &quot;Allow / Block&quot;
        popups.
      </p>

      <a
        href="./Qz-Grabvo.cmd"
        download="Qz-Grabvo.cmd"
        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-violet-600 px-5 py-3 text-[13px] font-bold text-white shadow-lg shadow-violet-100 transition-all duration-300 hover:bg-violet-700 active:scale-95 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2"
      >
        <i className="fa-solid fa-download" aria-hidden="true" />
        Download Qz-Grabvo.cmd
      </a>

      <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
        <div className="mb-3 text-[11px] font-black uppercase tracking-[0.18em] text-slate-900">
          How to run it
        </div>
        <ol className="space-y-3">
          <Step n={1}>
            Download the file, then find it in your{" "}
            <b className="text-slate-900">Downloads</b> folder.
          </Step>
          <Step n={2}>
            <b className="text-slate-900">Right-click</b> the file and choose{" "}
            <b className="text-slate-900">Run as administrator</b> (it will
            also self-elevate if you just double-click).
          </Step>
          <Step n={3}>
            If Windows shows a blue{" "}
            <b className="text-slate-900">SmartScreen</b> warning, click{" "}
            <b className="text-slate-900">More info</b> →{" "}
            <b className="text-slate-900">Run anyway</b>. This is expected for
            any new script.
          </Step>
          <Step n={4}>
            Wait for the <b className="text-slate-900">SETUP COMPLETE</b>{" "}
            banner. QZ Tray restarts automatically when it&apos;s done.
          </Step>
        </ol>
      </div>

      <div className="flex items-start gap-2 rounded-2xl border border-slate-100 bg-white p-3.5 text-[11.5px] leading-relaxed text-slate-400">
        <i
          className="fa-solid fa-circle-info mt-0.5 text-violet-400"
          aria-hidden="true"
        />
        <span>
          The script only touches this computer&apos;s QZ Tray installation.
          It downloads the official QZ Tray installer from GitHub and the
          Grabvo certificate from{" "}
          <code className="rounded bg-slate-50 px-1.5 py-0.5 text-slate-600 ring-1 ring-slate-200">
            qz.grabvo.app
          </code>
          .
        </span>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------
   macOS - coming soon
   ------------------------------------------------------------------------- */
function MacSetup() {
  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-400 ring-1 ring-slate-200">
          <i className="fa-brands fa-apple text-[22px]" aria-hidden="true" />
        </span>
        <div>
          <p className="text-[14px] font-bold text-slate-900">
            macOS setup - coming soon
          </p>
          <p className="mx-auto mt-1 max-w-[40ch] text-[12.5px] leading-relaxed text-slate-500">
            The one-click installer for macOS is in development. We&apos;ll
            update this page the moment it&apos;s ready - no action needed on
            your end.
          </p>
        </div>
      </div>

      <div className="flex items-start gap-2 rounded-2xl border border-slate-100 bg-white p-3.5 text-[11.5px] leading-relaxed text-slate-400">
        <i
          className="fa-solid fa-circle-info mt-0.5 text-violet-400"
          aria-hidden="true"
        />
        <span>
          In the meantime, printing still works on macOS with QZ Tray - you
          just need to add the certificate manually via{" "}
          <b className="text-slate-600">QZ Tray → Advanced → Site Manager</b>.
          Support is available at{" "}
          <a
            href="mailto:support@grabvo.app"
            className="font-semibold text-violet-600 underline decoration-violet-200 underline-offset-2 hover:decoration-violet-500"
          >
            support@grabvo.app
          </a>
          .
        </span>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------
   Fallback for Linux / unrecognized platforms
   ------------------------------------------------------------------------- */
function OtherSetup() {
  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-400 ring-1 ring-slate-200">
          <i className="fa-solid fa-laptop text-[20px]" aria-hidden="true" />
        </span>
        <div>
          <p className="text-[14px] font-bold text-slate-900">
            Automated setup not available for this OS
          </p>
          <p className="mx-auto mt-1 max-w-[40ch] text-[12.5px] leading-relaxed text-slate-500">
            The one-click installer currently supports Windows only. macOS
            support is coming soon.
          </p>
        </div>
      </div>

      <div className="flex items-start gap-2 rounded-2xl border border-slate-100 bg-white p-3.5 text-[11.5px] leading-relaxed text-slate-400">
        <i
          className="fa-solid fa-circle-info mt-0.5 text-violet-400"
          aria-hidden="true"
        />
        <span>
          Need help setting up QZ Tray on this system? Reach us at{" "}
          <a
            href="mailto:support@grabvo.app"
            className="font-semibold text-violet-600 underline decoration-violet-200 underline-offset-2 hover:decoration-violet-500"
          >
            support@grabvo.app
          </a>
          .
        </span>
      </div>
    </div>
  );
}

export default SetupPanel;