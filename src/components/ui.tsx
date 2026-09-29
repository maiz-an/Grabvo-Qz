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
 * Button — soft pill (matches the "SOFT/SYSTEM" reference):
 *   - primary: filled violet-600 pill, white bold label
 *   - outline: soft ivory pill, hairline-free, just a tone shift
 *   - base: font-semibold, color-only transition, gentle press scale
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
    "inline-flex items-center justify-center rounded-full font-semibold transition-all duration-150 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2";

  const variants: Record<NonNullable<ButtonProps["variant"]>, string> = {
    primary: "bg-violet-600 text-white hover:bg-violet-700 shadow-[0_8px_20px_-6px_rgba(124,58,237,0.5)]",
    outline: "bg-slate-100 text-slate-700 hover:bg-slate-200",
    ghost: "text-slate-600 hover:bg-slate-100",
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
          {icon && <span>{icon}</span>}
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
 * Eyebrow — bold uppercase tracked section label, no rule line. Marks
 * the start of a bento section on the single-page layout (mirrors the
 * "COLOR PALETTE" / "TYPOGRAPHY" tile labels in the reference board).
 * ----------------------------------------------------------------- */
export function Eyebrow({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "text-[11px] font-black uppercase tracking-[0.2em] text-slate-500",
        className
      )}
    >
      {children}
    </p>
  );
}

/* -----------------------------------------------------------------
 * StatusPill — the app's single live "is it connected" indicator.
 * Used in the header so connection state is visible from every tab,
 * not just the Printers tab. Flat: a colored dot + label, no motion.
 * ----------------------------------------------------------------- */
export type LiveStatus = "idle" | "connecting" | "connected" | "error";

const STATUS_CONFIG: Record<
  LiveStatus,
  { dot: string; text: string; label: string }
> = {
  connected: { dot: "bg-emerald-500", text: "text-slate-700", label: "Connected" },
  connecting: { dot: "bg-amber-500", text: "text-slate-700", label: "Connecting…" },
  error: { dot: "bg-red-500", text: "text-slate-700", label: "Disconnected" },
  idle: { dot: "bg-slate-400", text: "text-slate-500", label: "Not connected" },
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
        "inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-1.5 text-[11px] font-semibold shadow-[0_4px_14px_-6px_rgba(15,23,42,0.18)]",
        cfg.text,
        className
      )}
    >
      <span className={cn("h-1.5 w-1.5 flex-none rounded-full", cfg.dot)} />
      {cfg.label}
    </Tag>
  );
}

/* -----------------------------------------------------------------
 * StatChip — small "glanceable" fact used in the header summary row
 * (printer assignments, printer count, connection mode). Reads as one
 * family with StatusPill but carries a label + value instead of a
 * live/dead state. Flat: plain icon, no color-tint block, no motion.
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
        "flex items-center gap-2.5 rounded-full px-3.5 py-2 text-left shadow-[0_4px_14px_-6px_rgba(15,23,42,0.14)]",
        tone === "warning" ? "bg-amber-50" : "bg-white"
      )}
    >
      <i
        className={cn(
          `fa-solid ${icon} w-3.5 flex-none text-center text-[12px]`,
          tone === "warning" ? "text-amber-500" : "text-violet-500"
        )}
        aria-hidden="true"
      />
      <span className="min-w-0">
        <span className="block text-[9.5px] font-semibold uppercase tracking-[0.12em] text-slate-400">
          {label}
        </span>
        <span className="block truncate text-[12.5px] font-medium text-slate-800">
          {value}
        </span>
      </span>
    </Tag>
  );
}