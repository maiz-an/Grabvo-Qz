export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));