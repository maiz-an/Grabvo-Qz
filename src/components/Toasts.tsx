import React from "react";
import type { ToastItem } from "@/hooks/useToast";
import { cn } from "@/lib/utils";

interface Props {
  toasts: ToastItem[];
}

const ICONS: Record<ToastItem["type"], string> = {
  success: "fa-circle-check",
  error: "fa-circle-xmark",
  warning: "fa-triangle-exclamation",
  info: "fa-circle-info"
};

export function Toasts({ toasts }: Props) {
  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[9999] flex max-w-[340px] flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            "pointer-events-auto flex items-start gap-2.5 rounded-xl border border-slate-200 border-l-[3px] bg-white p-3.5 text-[13px] leading-normal shadow-sm",
            "animate-[fadeIn_180ms_ease-out_forwards]",
            t.type === "success" && "border-l-emerald-500",
            t.type === "error" && "border-l-red-500",
            t.type === "warning" && "border-l-amber-500",
            t.type === "info" && "border-l-violet-500"
          )}
        >
          <i
            className={cn(
              "fa-solid mt-0.5 text-[14px]",
              ICONS[t.type],
              t.type === "success" && "text-emerald-500",
              t.type === "error" && "text-red-500",
              t.type === "warning" && "text-amber-500",
              t.type === "info" && "text-violet-500"
            )}
            aria-hidden="true"
          />
          <div>
            <div className="mb-0.5 font-bold text-slate-900">{t.title}</div>
            {t.body && <div className="break-words text-slate-500">{t.body}</div>}
          </div>
        </div>
      ))}
      <style>{`@keyframes fadeIn { from { opacity:0; transform: translateX(16px);} to {opacity:1; transform:translateX(0);} }`}</style>
    </div>
  );
}