import React from "react";
import { cn } from "@/lib/utils";

/* -----------------------------------------------------------------
 * Spinner
 * ----------------------------------------------------------------- */
export function Spinner({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-block h-3.5 w-3.5 flex-none rounded-full border-2 border-current border-t-transparent animate-spin-fast",
        className
      )}
    />
  );
}

/* -----------------------------------------------------------------
 * Button — matches the admin app's Button: violet-600 primary,
 * slate-200 outline, rounded-xl, bold text, ring-based focus.
 * ----------------------------------------------------------------- */
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "ghost";
  loading?: boolean;
  children: React.ReactNode;
}

export function Button({
  variant = "ghost",
  loading,
  children,
  className,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-bold transition-colors",
        variant === "primary"
          ? "bg-violet-600 text-white hover:bg-violet-700"
          : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
        "focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-40",
        className
      )}
    >
      {loading && <Spinner />}
      <span className={cn(loading && "opacity-60")}>{children}</span>
    </button>
  );
}

/* -----------------------------------------------------------------
 * Skeleton bar
 * ----------------------------------------------------------------- */
export function SkeletonBar({ className }: { className?: string }) {
  return <div className={cn("skeleton-bar rounded-md", className)} />;
}

/* -----------------------------------------------------------------
 * Loading note
 * ----------------------------------------------------------------- */
export function LoadingNote({
  text = "Connecting to QZ Tray…"
}: {
  text?: string;
}) {
  return (
    <div className="flex items-center gap-2.5 py-1 text-sm text-slate-500">
      <span className="h-3 w-3 flex-none rounded-full border-2 border-violet-100 border-t-violet-600 animate-spin-slow" />
      {text}
    </div>
  );
}

/* -----------------------------------------------------------------
 * Section heading — matches the small uppercase tracked labels used
 * throughout the admin app (e.g. stat card labels).
 * ----------------------------------------------------------------- */
export function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-8 mb-3 flex items-center gap-3 text-xs font-black uppercase tracking-[0.24em] text-slate-400">
      <span>{children}</span>
      <span className="h-px flex-1 bg-slate-200" />
    </div>
  );
}