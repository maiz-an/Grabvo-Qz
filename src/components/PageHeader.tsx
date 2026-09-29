import React from "react";

interface PageHeaderProps {
  title: string;
  description: string;
  children?: React.ReactNode;
}

/**
 * Slim per-page header inside the main content area — title + one-line
 * description, with room for page-specific extras (e.g. the Print
 * page's glance chips) underneath. Replaces the old single big intro
 * block that used to repeat on every tab.
 */
export function PageHeader({ title, description, children }: PageHeaderProps) {
  return (
    <div className="mb-5">
      <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
      <p className="mt-1 max-w-[60ch] text-[13px] leading-relaxed text-slate-500">
        {description}
      </p>
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}

export default PageHeader;
