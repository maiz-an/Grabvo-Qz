import React from "react";

export function GitHubLink() {
  return (
    <a
      className="absolute right-5 top-6 z-[3] inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-500 shadow-sm transition hover:border-violet-200 hover:text-violet-600 focus:outline-none focus:ring-2 focus:ring-violet-500"
      href="https://github.com/maiz-an/Grabvo-Qz"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="View source on GitHub"
    >
      <i className="fa-brands fa-github text-[13px]" aria-hidden="true" />
      <span className="hidden sm:inline">Source</span>
    </a>
  );
}