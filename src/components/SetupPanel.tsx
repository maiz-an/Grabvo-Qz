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
   Tiny OS segmented control — flat, solid active state, no motion
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
      className="flex items-center gap-0.5 rounded-full bg-[#F3EEE2] p-0.5"
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
            className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.06em] ${
              isActive
                ? "bg-violet-600 text-white"
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
      <span className="mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full bg-violet-600 text-[11px] font-semibold text-white">
        {n}
      </span>
      <span className="pt-0.5 text-[12.5px] leading-relaxed text-slate-600">
        {children}
      </span>
    </li>
  );
}

/* -------------------------------------------------------------------------
   Print Agent (GrabvoPrintPing) install block — shown under every OS's
   own QZ Tray setup instructions above. Optional: only needed for the
   new "Print Agent" connection mode (phones/tablets with no local QZ
   Tray). Direct QZ Tray setup above this is unaffected either way.
   ------------------------------------------------------------------------- */
function PrintAgentSection({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-[#F3EEE2] p-4">
      <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-900">
        <i className="fa-solid fa-route text-slate-500" aria-hidden="true" />
        Optional: Print Agent (for phones/tablets)
      </div>
      <p className="mb-3 text-[12.5px] leading-relaxed text-slate-500">
        Only needed if you want to print from a phone or tablet that has no
        QZ Tray of its own — install this on the Windows PC (or a small
        print box) that already has QZ Tray, then switch the web app's
        Connection mode to <b className="text-slate-900">Print Agent</b> on
        the device you're printing from.
      </p>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

/**
 * One-line shell command with a copy button — used for the macOS/Linux
 * Print Agent install command, matching the muted "code" styling used
 * elsewhere on this page (the "qz.grabvo.app" callout above).
 */
function CopyCommand({ command }: { command: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked — the command is still selectable/visible */
    }
  }

  return (
    <div className="flex items-center gap-2 rounded-xl bg-[#F3EEE2] px-3.5 py-2.5">
      <code className="min-w-0 flex-1 overflow-x-auto whitespace-pre text-[11.5px] text-slate-600">
        {command}
      </code>
      <button
        type="button"
        onClick={handleCopy}
        className="flex-none rounded-full px-2.5 py-1.5 text-[11px] font-semibold text-violet-600 hover:bg-white/70"
      >
        <i
          className={`fa-solid ${copied ? "fa-check" : "fa-copy"}`}
          aria-hidden="true"
        />{" "}
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
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
        <div className="flex items-center gap-2 text-[13px] font-semibold text-slate-900">
          <i
            className="fa-solid fa-shield-halved text-slate-500"
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
        className="inline-flex items-center justify-center gap-2 rounded-full bg-violet-600 px-5 py-3 text-[13px] font-semibold text-white shadow-[0_8px_20px_-6px_rgba(124,58,237,0.5)] hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2"
      >
        <i className="fa-solid fa-download" aria-hidden="true" />
        Download Qz-Grabvo.cmd
      </a>

      <div className="rounded-2xl bg-[#F3EEE2] p-4">
        <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-900">
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

      <div className="flex items-start gap-2 rounded-2xl bg-[#F3EEE2]/60 p-3.5 text-[11.5px] leading-relaxed text-slate-400">
        <i
          className="fa-solid fa-circle-info mt-0.5 text-slate-400"
          aria-hidden="true"
        />
        <span>
          The script only touches this computer&apos;s QZ Tray installation.
          It downloads the official QZ Tray installer from GitHub and the
          Grabvo certificate from{" "}
          <code className="rounded-md bg-[#ECE5D5] px-1.5 py-0.5 text-slate-600">
            qz.grabvo.app
          </code>
          .
        </span>
      </div>

      <PrintAgentSection>
        <a
          href="./GrabvoPrintPing-Setup.cmd"
          download="GrabvoPrintPing-Setup.cmd"
          className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-5 py-3 text-[13px] font-semibold text-slate-700 hover:bg-white/70 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2"
        >
          <i className="fa-solid fa-download" aria-hidden="true" />
          Download GrabvoPrintPing-Setup.cmd
        </a>
        <p className="text-[12px] leading-relaxed text-slate-500">
          Run it the same way as above (right-click →{" "}
          <b className="text-slate-900">Run as administrator</b>). It
          installs Node.js if needed, downloads and builds the agent, opens
          the firewall port, and registers it as an auto-starting Windows
          Service — nothing to type.
        </p>
      </PrintAgentSection>
    </div>
  );
}

/* -------------------------------------------------------------------------
   Shared QZ Tray install block for macOS + Linux - both platforms run the
   same Qz-Grabvo.sh, which auto-detects which of the two it's on. Mirrors
   WindowsSetup's structure (description, primary action, numbered "what
   it does" list, footnote) so the three OS tabs read as one consistent
   flow, not three different designs.
   ------------------------------------------------------------------------- */
function UnixQzTraySetup() {
  return (
    <div className="space-y-4">
      <p className="text-[12.5px] leading-relaxed text-slate-500">
        Run the one-line installer in Terminal. It downloads QZ Tray,
        installs it (you&apos;ll be asked for your password), and trusts
        the Grabvo certificate so printing runs silently with no prompts.
      </p>

      <CopyCommand command="curl -fsSL https://qz.grabvo.app/Qz-Grabvo.sh | bash" />

      <div className="rounded-2xl bg-[#F3EEE2] p-4">
        <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-900">
          What it does
        </div>
        <ol className="space-y-3">
          <Step n={1}>
            Downloads the latest QZ Tray release and installs it.
          </Step>
          <Step n={2}>
            Downloads the Grabvo certificate and registers it with QZ
            Tray, so no trust prompt shows up later.
          </Step>
          <Step n={3}>
            Sets QZ Tray to start automatically on login.
          </Step>
          <Step n={4}>
            Starts QZ Tray immediately — nothing else to do.
          </Step>
        </ol>
      </div>

      <div className="flex items-start gap-2 rounded-2xl bg-[#F3EEE2]/60 p-3.5 text-[11.5px] leading-relaxed text-slate-400">
        <i
          className="fa-solid fa-circle-info mt-0.5 text-slate-400"
          aria-hidden="true"
        />
        <span>
          Prefer to read it first?{" "}
          <a
            href="./Qz-Grabvo.sh"
            download="Qz-Grabvo.sh"
            className="font-semibold text-violet-600 underline decoration-violet-200 underline-offset-2 hover:decoration-violet-500"
          >
            Download Qz-Grabvo.sh
          </a>{" "}
          and run <code className="rounded-md bg-[#ECE5D5] px-1.5 py-0.5 text-slate-600">bash Qz-Grabvo.sh</code>{" "}
          — it downloads the official QZ Tray installer from GitHub and
          the Grabvo certificate from{" "}
          <code className="rounded-md bg-[#ECE5D5] px-1.5 py-0.5 text-slate-600">
            qz.grabvo.app
          </code>
          . To remove QZ Tray later, run{" "}
          <code className="rounded-md bg-[#ECE5D5] px-1.5 py-0.5 text-slate-600">
            curl -fsSL https://qz.grabvo.app/Qz-Grabvo-Uninstall.sh | bash
          </code>
          .
        </span>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------
   macOS
   ------------------------------------------------------------------------- */
function MacSetup() {
  return (
    <div className="space-y-4">
      <UnixQzTraySetup />

      <PrintAgentSection>
        <CopyCommand command="curl -fsSL https://qz.grabvo.app/install-grabvoprintping.sh | bash" />
        <p className="text-[12px] leading-relaxed text-slate-500">
          Run that in Terminal. It installs Node.js if needed (via
          Homebrew), downloads and builds the agent, and registers it as a
          background service that starts at login.
        </p>
      </PrintAgentSection>
    </div>
  );
}

/* -------------------------------------------------------------------------
   Linux / other platforms — same installer as macOS (it auto-detects OS);
   this tab exists for anything the browser doesn't report as Windows or
   macOS, which in practice means Linux.
   ------------------------------------------------------------------------- */
function OtherSetup() {
  return (
    <div className="space-y-4">
      <UnixQzTraySetup />

      <PrintAgentSection>
        <CopyCommand command="curl -fsSL https://qz.grabvo.app/install-grabvoprintping.sh | bash" />
        <p className="text-[12px] leading-relaxed text-slate-500">
          Run that in a terminal. It installs Node.js if needed (via
          apt/dnf/yum), downloads and builds the agent, and registers it as
          a systemd service that starts at boot.
        </p>
      </PrintAgentSection>
    </div>
  );
}

export default SetupPanel;
