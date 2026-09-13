import React from "react";
import type { ToastItem } from "@/hooks/useToast";

interface Props {
  toasts: ToastItem[];
  // FIX: was `(id: string) => void`, but ToastItem["id"] is actually a
  // number (see useToast's counter-based id generation). Deriving the
  // param type from ToastItem itself keeps this in sync with the hook
  // automatically — if the id type ever changes there, this follows.
  onDismiss?: (id: ToastItem["id"]) => void;
}

/**
 * iOS-notification-style toast config.
 *
 * Two things make it feel "glassy" instead of just translucent:
 *   1. A light-tinted frosted background (NOT a solid colour), heavy
 *      backdrop-blur, and a soft outer shadow that lifts it off the page.
 *   2. A hairline white top border (via the inset ring) that mimics the
 *      specular highlight iOS banners have — that's what sells the glass.
 *
 * The coloured left accent is preserved but moved to a thin ring on the
 * icon badge only, so the card itself stays neutral and glassy.
 */
const KIND_STYLES: Record<
  ToastItem["type"],
  {
    wrapper: string;
    iconBg: string;
    iconColor: string;
    icon: string;
  }
> = {
  success: {
    wrapper:
      "border-emerald-100/80 bg-emerald-50/60 ring-1 ring-white/60 ring-inset",
    iconBg: "bg-emerald-500/15",
    iconColor: "text-emerald-600",
    icon: "fa-circle-check",
  },
  error: {
    wrapper:
      "border-red-100/80 bg-red-50/60 ring-1 ring-white/60 ring-inset",
    iconBg: "bg-red-500/15",
    iconColor: "text-red-600",
    icon: "fa-circle-exclamation",
  },
  warning: {
    wrapper:
      "border-amber-100/80 bg-amber-50/60 ring-1 ring-white/60 ring-inset",
    iconBg: "bg-amber-500/15",
    iconColor: "text-amber-600",
    icon: "fa-triangle-exclamation",
  },
  info: {
    wrapper:
      "border-violet-100/80 bg-violet-50/60 ring-1 ring-white/60 ring-inset",
    iconBg: "bg-violet-500/15",
    iconColor: "text-violet-600",
    icon: "fa-circle-info",
  },
};

export function Toasts({ toasts, onDismiss }: Props) {
  return (
    <div
      className="pointer-events-none fixed right-2 top-3 z-[9999] flex w-[min(420px,calc(100vw-1rem))] flex-col gap-2"
      aria-live="polite"
      aria-atomic="false"
    >
      {toasts.map((t) => {
        const cfg = KIND_STYLES[t.type] ?? KIND_STYLES.info;
        return (
          <div
            key={t.id}
            role="status"
            className={`
              pointer-events-auto flex items-start gap-3 rounded-2xl border
              px-4 py-3
              shadow-[0_8px_24px_-8px_rgba(15,23,42,0.18),0_2px_6px_-2px_rgba(15,23,42,0.08)]
              backdrop-blur-xl backdrop-saturate-150
              animate-[fadeIn_180ms_ease-out_forwards]
              ${cfg.wrapper}
            `}
          >
            {/* Icon badge — coloured tint behind a solid-coloured glyph.
                Matches FeedbackToast's 9×9 circle. */}
            <div
              className={`mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full ${cfg.iconBg} ${cfg.iconColor}`}
            >
              <i className={`fa-solid ${cfg.icon}`} aria-hidden="true" />
            </div>

            {/* Body */}
            <div className="min-w-0 flex-1">
              {t.title && (
                <p className="text-sm font-black text-black tracking-tight">
                  {t.title}
                </p>
              )}
              {t.body && (
                <p
                  className={`text-sm whitespace-pre-line ${
                    t.title ? "mt-0.5" : ""
                  } text-slate-700`}
                >
                  {t.body}
                </p>
              )}
            </div>

            {/* Close */}
            {onDismiss && (
              <button
                type="button"
                onClick={() => onDismiss(t.id)}
                className={`inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition ${
                  t.type === "error"
                    ? "hover:bg-red-500/10"
                    : t.type === "warning"
                      ? "hover:bg-amber-500/10"
                      : t.type === "success"
                        ? "hover:bg-emerald-500/10"
                        : "hover:bg-violet-500/10"
                }`}
                aria-label="Dismiss notification"
              >
                <i className="fa-solid fa-xmark" aria-hidden="true" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}