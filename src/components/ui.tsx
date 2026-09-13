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