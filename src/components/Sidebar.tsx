import React from "react";
import { Logo } from "./Logo";
import { StatusPill, type LiveStatus } from "./ui";

export type TabId = "print" | "printers" | "setup";

interface NavItem {
  id: TabId;
  label: string;
  icon: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: "print", label: "Print", icon: "fa-print" },
  { id: "printers", label: "Printers", icon: "fa-plug-circle-bolt" },
  { id: "setup", label: "Setup", icon: "fa-shield-halved" },
];

const SUPPORT_EMAIL = "support@grabvo.app";

interface SidebarProps {
  activeTab: TabId;
  onSelectTab: (tab: TabId) => void;
  status: LiveStatus;
  needsAttention: boolean;
  onStatusClick: () => void;
}

/**
 * Dashboard shell navigation.
 *
 * One component renders both surfaces so the nav item list/state lives
 * in one place:
 *  - `md:` and up: a persistent left sidebar (brand, live status, nav,
 *    support footer) — the "dashboard" shell the app didn't have before.
 *  - below `md:`: a fixed bottom tab bar (icon + label), since this app
 *    is used from tablets/tills as much as desktops. Main content gets
 *    bottom padding (in App.tsx) so it isn't covered by the fixed bar.
 */
export function Sidebar({
  activeTab,
  onSelectTab,
  status,
  needsAttention,
  onStatusClick,
}: SidebarProps) {
  return (
    <>
      {/* ---------------- Desktop sidebar ---------------- */}
      <aside className="hidden md:flex md:w-60 md:flex-none md:flex-col md:border-r md:border-slate-200 md:bg-white">
        <div className="flex flex-col gap-3 px-5 pt-7 pb-5">
          <Logo className="text-4xl" />
          <StatusPill status={status} onClick={onStatusClick} />
        </div>

        <nav className="flex flex-1 flex-col gap-0.5 px-3" aria-label="App sections">
          {NAV_ITEMS.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                aria-current={isActive ? "page" : undefined}
                className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-left text-[13px] font-medium ${
                  isActive
                    ? "bg-violet-50 text-violet-700"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <span className="relative inline-flex w-4 flex-none justify-center">
                  <i
                    className={`fa-solid ${item.icon} text-[13px] ${
                      isActive ? "text-violet-600" : "text-slate-400"
                    }`}
                    aria-hidden="true"
                  />
                  {item.id === "printers" && needsAttention && (
                    <span
                      className="absolute -right-1.5 -top-1.5 h-1.5 w-1.5 rounded-full bg-red-500 ring-2 ring-white"
                      aria-hidden="true"
                    />
                  )}
                </span>
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="border-t border-slate-200 px-5 py-4">
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="flex items-center gap-2 text-[11.5px] text-slate-400 hover:text-slate-600"
          >
            <i className="fa-solid fa-circle-question" aria-hidden="true" />
            {SUPPORT_EMAIL}
          </a>
          <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-300">
            QZ Print Setup · v{__APP_VERSION__}
          </p>
        </div>
      </aside>

      {/* ---------------- Mobile bottom tab bar ---------------- */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 flex border-t border-slate-200 bg-white md:hidden"
        aria-label="App sections"
      >
        {NAV_ITEMS.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              aria-current={isActive ? "page" : undefined}
              className="flex flex-1 flex-col items-center gap-1 py-2.5 text-[10.5px] font-medium"
            >
              <span className="relative inline-flex">
                <i
                  className={`fa-solid ${item.icon} text-[16px] ${
                    isActive ? "text-violet-600" : "text-slate-400"
                  }`}
                  aria-hidden="true"
                />
                {item.id === "printers" && needsAttention && (
                  <span
                    className="absolute -right-1.5 -top-1 h-1.5 w-1.5 rounded-full bg-red-500 ring-2 ring-white"
                    aria-hidden="true"
                  />
                )}
              </span>
              <span className={isActive ? "text-violet-700" : "text-slate-500"}>
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>
    </>
  );
}

/**
 * Mobile-only brand + status strip, shown above the scrollable content
 * in `<main>` (NOT inside `Sidebar`'s own layout) — it needs to be a
 * normal block-level child of main, not a flex-row sibling of it, or
 * it ends up squeezed into a narrow column next to main instead of
 * stacked above it.
 */
export function MobileTopBar({
  status,
  onStatusClick,
}: {
  status: LiveStatus;
  onStatusClick: () => void;
}) {
  return (
    <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 md:hidden">
      <Logo className="text-2xl" />
      <StatusPill status={status} onClick={onStatusClick} />
    </div>
  );
}

export default Sidebar;
