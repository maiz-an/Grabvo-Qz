import React from "react";
import Card from "./Card";

/**
 * App footer — the certificate setup that removes the QZ Tray
 * "Allow / Block" popup. Only the production / hosted path is shown,
 * since this app ships as a managed deployment.
 */
export function Footer() {
  const certUrl = "/Grabvo.crt";
  const certFileName = "Grabvo.crt";
  const liveUrl = "https://qz.grabvo.app";

  return (
    <footer className="mt-8">
      <Card
        padding="none"
        className="px-6 py-5 text-[13px] leading-relaxed text-slate-500"
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[13px] font-bold text-slate-900">
            <i
              className="fa-solid fa-shield-halved text-violet-600"
              aria-hidden="true"
            />
            Remove the QZ Tray &quot;Allow / Block&quot; popup
          </div>
          <span className="rounded-full bg-violet-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-violet-600">
            one-time setup
          </span>
        </div>

        <p className="mb-4">
          QZ Tray asks permission on every print unless it{" "}
          <b className="text-slate-900">trusts</b> the site. Download the
          Grabvo certificate below and load it into QZ Tray&apos;s Site
          Manager to enable silent printing.
        </p>

        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <div className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-900">
              Trusted site
            </div>
            <code className="rounded-md bg-white px-2 py-0.5 text-[11px] text-slate-500 ring-1 ring-slate-200">
              {liveUrl}
            </code>
          </div>

          <p className="mb-3 text-[12.5px] leading-relaxed">
            Loading this certificate into QZ Tray tells it to trust requests
            signed by{" "}
            <code className="rounded-md bg-white px-1.5 py-0.5 text-slate-900 ring-1 ring-slate-200">
              {liveUrl}
            </code>{" "}
            — no popup, no prompt, ever.
          </p>

          <div className="mb-3 flex flex-wrap gap-2">
            <a
              href={certUrl}
              download={certFileName}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-violet-600 px-5 py-3 text-[13px] font-bold text-white shadow-lg shadow-violet-100 transition-all duration-300 hover:bg-violet-700 active:scale-95 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2"
            >
              <i className="fa-solid fa-download" aria-hidden="true" />
              Download {certFileName}
            </a>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-4 text-[12.5px] leading-relaxed">
            <div className="mb-2 font-bold text-slate-900">
              Add it to QZ Tray
            </div>
            <ol className="ml-4 list-decimal space-y-1.5">
              <li>
                Right-click the <b className="text-slate-900">QZ Tray</b> tray
                icon → <b className="text-slate-900">Advanced</b> →{" "}
                <b className="text-slate-900">Site Manager</b>.
              </li>
              <li>
                Click the <b className="text-slate-900">+</b> button
                (bottom-left) to add a new site.
              </li>
              <li>
                In the <b className="text-slate-900">Site</b> field, enter{" "}
                <code className="rounded-md bg-slate-50 px-1.5 py-0.5 text-slate-900 ring-1 ring-slate-200">
                  {liveUrl}
                </code>
                .
              </li>
              <li>
                Next to <b className="text-slate-900">Certificate</b>, click{" "}
                <b className="text-slate-900">Browse…</b> and pick the{" "}
                <code className="text-slate-900">{certFileName}</code> you just
                downloaded.
              </li>
              <li>
                Click <b className="text-slate-900">Save</b>. That site is now
                trusted for silent printing.
              </li>
            </ol>
          </div>
        </div>

        <div className="mt-3 flex items-start gap-2 text-[11.5px] leading-relaxed text-slate-400">
          <i
            className="fa-solid fa-circle-info mt-0.5 text-violet-400"
            aria-hidden="true"
          />
          <span>
            The certificate only affects the browser you install it in — no
            other device or site is impacted.
          </span>
        </div>
      </Card>
    </footer>
  );
}

export default Footer;