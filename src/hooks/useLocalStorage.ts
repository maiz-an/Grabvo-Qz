import { useCallback, useState } from "react";

export function useLocalStorage(
  key: string,
  initial: string
): [string, (v: string) => void] {
  const [value, setValue] = useState<string>(() => {
    try {
      return localStorage.getItem(key) ?? initial;
    } catch {
      return initial;
    }
  });

  const set = useCallback(
    (v: string) => {
      setValue(v);
      try {
        if (v) localStorage.setItem(key, v);
        else localStorage.removeItem(key);
      } catch {
        /* ignore */
      }
    },
    [key]
  );

  return [value, set];
}