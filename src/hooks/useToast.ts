import { useCallback, useState } from "react";

export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastItem {
  id: number;
  type: ToastType;
  title: string;
  body?: string;
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback(
    (type: ToastType, title: string, body?: string, lifeMs?: number) => {
      const id = Date.now() + Math.random();
      setToasts((prev) => [...prev, { id, type, title, body }]);
      const life = lifeMs ?? (type === "error" ? 7000 : 4000);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, life);
    },
    []
  );

  return { toasts, showToast };
}