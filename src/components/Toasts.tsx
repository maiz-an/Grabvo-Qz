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
    wrapper: "border-emerald-200 bg-white/20",
    iconBg: "bg-emerald-100",
    iconColor: "text-emerald-600",
    icon: "fa-circle-check",
  },
  error: {
    wrapper: "border-red-200 bg-red-50",
    iconBg: "bg-red-100",
    iconColor: "text-red-600",
    icon: "fa-circle-exclamation",
  },
  warning: {
    wrapper: "border-amber-200 bg-amber-50",
    iconBg: "bg-amber-100",
    iconColor: "text-amber-600",
    icon: "fa-triangle-exclamation",
  },
  info: {
    wrapper: "border-violet-200 bg-white/20",
    iconBg: "bg-violet-100",
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
            className={`pointer-events-auto flex items-start gap-3 rounded-2xl border px-4 py-3 shadow-md backdrop-blur-md animate-[fadeIn_180ms_ease-out_forwards] ${cfg.wrapper}`}
          >
            {/* Icon badge — matches FeedbackToast's 9×9 circle */}
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
                className={`inline-flex h-8 w-8 items-center justify-center rounded-lg transition ${
                  t.type === "error"
                    ? "hover:bg-red-100"
                    : t.type === "warning"
                      ? "hover:bg-amber-100"
                      : "hover:bg-slate-100"
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