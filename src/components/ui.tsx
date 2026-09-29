import React from "react";
import { cn } from "@/lib/utils";

/* -----------------------------------------------------------------
 * Spinner — matches the admin app's loading indicator (thin ring,
 * violet-tinted border with transparent top, spins at 0.7s).
 * ----------------------------------------------------------------- */
export function Spinner({
  className,
  variant = "primary",
}: {
  className?: string;
  variant?: "primary" | "white";
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-block h-4 w-4 flex-none rounded-full border-2 border-current border-t-transparent animate-spin-fast",
        variant === "white" ? "text-white" : "text-violet-600",
        className
      )}
    />
  );
}

/* -----------------------------------------------------------------
 * Button — matches Grabvo's design-system Button exactly:
 *   - primary: violet-600 fill, shadow-lg shadow-violet-100, rounded-2xl
 *   - outline: border-2 border-slate-200, hover:bg-slate-50
 *   - base: font-bold, duration-300, active:scale-95
 * ----------------------------------------------------------------- */
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

export function Button({
  variant = "outline",
  size = "md",
  loading,
  icon,
  children,
  className,
  disabled,
  ...rest
}: ButtonProps) {
  const baseStyles =
    "inline-flex items-center justify-center font-bold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2";

  const variants: Record<NonNullable<ButtonProps["variant"]>, string> = {
    primary:
      "bg-violet-600 text-white hover:bg-violet-700 shadow-lg shadow-violet-100 rounded-2xl",
    outline:
      "border-2 border-slate-200 text-slate-700 hover:bg-slate-50 rounded-2xl bg-white",
    ghost: "text-slate-500 hover:bg-slate-100 rounded-2xl",
  };

  const sizes: Record<NonNullable<ButtonProps["size"]>, string> = {
    sm: "px-4 py-2 text-xs gap-2",
    md: "px-6 py-3 text-sm gap-2",
    lg: "px-8 py-4 text-base gap-3",
  };

  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={cn(baseStyles, variants[variant], sizes[size], className)}
    >
      {loading ? (
        <Spinner className="h-4 w-4" variant={variant === "primary" ? "white" : "primary"} />
      ) : (
        <>
          {icon && (
            <span className="opacity-80 group-hover:opacity-100">{icon}</span>
          )}
          {children}
        </>
      )}
    </button>
  );
}

/* -----------------------------------------------------------------
 * Skeleton bar — shares the same shimmer wash as the design system's
 * `Skeleton` component (see .skeleton-shimmer in index.css).
 * ----------------------------------------------------------------- */
export function SkeletonBar({
  className,
  rounded,
}: {
  className?: string;
  rounded?: string;
}) {
  return (
    <div
      className={cn(
        "skeleton-shimmer",
        rounded ?? "rounded-xl",
        className
      )}
    />
  );
}

/* -----------------------------------------------------------------
 * Loading note
 * ----------------------------------------------------------------- */
export function LoadingNote({
  text = "Connecting to QZ Tray…",
}: {
  text?: string;
}) {
  return (
    <div className="flex items-center gap-3 py-1 text-sm font-medium text-slate-500">
      <span className="relative flex h-4 w-4 flex-none">
        <span className="absolute inset-0 rounded-full border-2 border-violet-100" />
        <span className="absolute inset-0 rounded-full border-2 border-transparent border-t-violet-600 animate-spin-slow" />
      </span>
      {text}
    </div>
  );
}

/* -----------------------------------------------------------------
 * Section heading — matches the small uppercase tracked labels used
 * throughout the admin app (e.g. stat card labels, page sections).
 * ----------------------------------------------------------------- */
export function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-8 mb-3 flex items-center gap-3 text-[11px] font-black uppercase tracking-[0.26em] text-slate-400">
      <span>{children}</span>
      <span className="h-px flex-1 bg-slate-200" />
    </div>
  );
}

/* -----------------------------------------------------------------
 * StatusPill — the app's single live "is it connected" indicator.
 * Used in the header so connection state is visible from every tab,
 * not just the Printers tab. `interactive` adds a hover/press affordance
 * for when it doubles as a "go fix this" shortcut.
 * ----------------------------------------------------------------- */
export type LiveStatus = "idle" | "connecting" | "connected" | "error";

const STATUS_CONFIG: Record<
  LiveStatus,
  { dot: string; bg: string; text: string; ring: string; label: string; pulse: boolean }
> = {
  connected: {
    dot: "bg-emerald-500",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    ring: "ring-emerald-600/10",
    label: "Connected",
    pulse: true,
  },
  connecting: {
    dot: "bg-amber-500",
    bg: "bg-amber-50",
    text: "text-amber-700",
    ring: "ring-amber-600/10",
    label: "Connecting…",
    pulse: true,
  },
  error: {
    dot: "bg-red-500",
    bg: "bg-red-50",
    text: "text-red-700",
    ring: "ring-red-600/10",
    label: "Disconnected",
    pulse: false,
  },
  idle: {
    dot: "bg-slate-400",
    bg: "bg-slate-100",
    text: "text-slate-600",
    ring: "ring-slate-600/10",
    label: "Not connected",
    pulse: false,
  },
};

export function StatusPill({
  status,
  className,
  onClick,
}: {
  status: LiveStatus;
  className?: string;
  onClick?: () => void;
}) {
  const cfg = STATUS_CONFIG[status];
  const Tag = onClick ? "button" : "span";

  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-bold ring-1 transition-all duration-200",
        cfg.bg,
        cfg.text,
        cfg.ring,
        onClick && "hover:brightness-95 active:scale-95",
        className
      )}
    >
      <span className="relative flex h-2 w-2 flex-none">
        {cfg.pulse && (
          <span
            className={cn(
              "absolute inset-0 animate-ping rounded-full opacity-60",
              cfg.dot
            )}
          />
        )}
        <span className={cn("relative inline-flex h-2 w-2 rounded-full", cfg.dot)} />
      </span>
      {cfg.label}
    </Tag>
  );
}

/* -----------------------------------------------------------------
 * StatChip — small "glanceable" fact used in the header summary row
 * (printer assignments, printer count, connection mode). Reads as one
 * family with StatusPill but carries a label + value instead of a
 * live/dead state.
 * ----------------------------------------------------------------- */
export function StatChip({
  icon,
  label,
  value,
  tone = "neutral",
  onClick,
}: {
  icon: string;
  label: string;
  value: string;
  tone?: "neutral" | "warning";
  onClick?: () => void;
}) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "flex items-center gap-2.5 rounded-2xl border bg-white px-3.5 py-2.5 text-left transition-all duration-200",
        tone === "warning"
          ? "border-amber-100 bg-amber-50/60"
          : "border-slate-100",
        onClick && "hover:border-slate-200 hover:bg-slate-50 active:scale-[0.98]"
      )}
    >
      <span
        className={cn(
          "flex h-8 w-8 flex-none items-center justify-center rounded-xl text-[13px]",
          tone === "warning"
            ? "bg-amber-100 text-amber-600"
            : "bg-violet-50 text-violet-600"
        )}
      >
        <i className={`fa-solid ${icon}`} aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="block text-[9.5px] font-black uppercase tracking-[0.16em] text-slate-400">
          {label}
        </span>
        <span className="block truncate text-[12.5px] font-bold text-slate-800">
          {value}
        </span>
      </span>
    </Tag>
  );
}