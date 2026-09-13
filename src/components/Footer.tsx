import React from "react";

/**
 * App footer — everything needed to remove the QZ Tray "Allow / Block"
 * popup lives on this page. No external README is required or linked;
 * this component is the single source of truth for certificate setup.
 */
export function Footer() {
  const certUrl = "/Grabvo.crt";
  const certFileName = "Grabvo.crt";
  const liveUrl = "https://qz.grabvo.app";

  return (
    <footer className="mt-8">
      <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 text-[13px] leading-relaxed text-slate-500 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[13px] font-bold text-slate-900">
            <i className="fa-solid fa-shield-halved text-violet-600" aria-hidden="true" />
            Remove the QZ Tray &quot;Allow / Block&quot; popup
          </div>
          <span className="rounded-full bg-violet-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-violet-600">
            pick one
          </span>
        </div>

        <p className="mb-4">
          QZ Tray asks permission on every print unless it{" "}
          <b className="text-slate-900">trusts</b> the site. Choose the path
          that matches how you&apos;re running this app:
        </p>

        {/* ============================================================
            OPTION 1 — Hosted demo
            ============================================================ */}
        <div className="mb-3 rounded-xl border border-slate-200 bg-slate-50 p-3.5">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <div className="text-[12px] font-bold uppercase tracking-wide text-slate-900">
              1 · Using the hosted demo
            </div>
            <code className="rounded-md bg-white px-1.5 py-0.5 text-[11px] text-slate-500">
              qz.grabvo.app
            </code>
          </div>

          <p className="mb-3 text-[12.5px] leading-relaxed">
            Download the certificate below, then load it into your QZ Tray
            Site Manager. That tells QZ Tray to trust requests signed by{" "}
            <code className="rounded-md bg-white px-1.5 py-0.5 text-slate-900">
              {liveUrl}
            </code>{" "}
            — no popup, no prompt.
          </p>

          <div className="mb-3 flex flex-wrap gap-2">
            <a
              href={certUrl}
              download={certFileName}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-[13px] font-bold text-white transition hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2"
            >
              <i className="fa-solid fa-download" aria-hidden="true" />
              Download {certFileName}
            </a>
          </div>
          <p className="mb-3 text-[11px] italic text-slate-400">
            Official Grabvo certificate coming soon — this link will start
            serving it automatically once it&apos;s live, no change needed on
            your end.
          </p>

          <div className="rounded-xl border border-slate-200 bg-white p-3.5 text-[12.5px] leading-relaxed">
            <div className="mb-2 font-bold text-slate-900">
              Add it to QZ Tray
            </div>
            <ol className="ml-4 list-decimal space-y-1.5">
              <li>
                Right-click the <b className="text-slate-900">QZ Tray</b>{" "}
                tray icon → <b className="text-slate-900">Advanced</b> →{" "}
                <b className="text-slate-900">Site Manager</b>.
              </li>
              <li>
                Click the <b className="text-slate-900">+</b> button
                (bottom-left) to add a new site.
              </li>
              <li>
                In the <b className="text-slate-900">Site</b> field, enter{" "}
                <code className="rounded-md bg-slate-50 px-1.5 py-0.5 text-slate-900">
                  {liveUrl}
                </code>
                .
              </li>
              <li>
                Next to <b className="text-slate-900">Certificate</b>, click{" "}
                <b className="text-slate-900">Browse…</b> and pick the{" "}
                <code className="text-slate-900">{certFileName}</code> you
                just downloaded.
              </li>
              <li>
                Click <b className="text-slate-900">Save</b>. That site is
                now trusted for silent printing.
              </li>
            </ol>
          </div>
        </div>

        {/* ============================================================
            OPTION 2 — Cloned from GitHub (fully inline, no README needed)
            ============================================================ */}
        <div className="mb-3 rounded-xl border border-slate-200 bg-slate-50 p-3.5">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <div className="text-[12px] font-bold uppercase tracking-wide text-slate-900">
              2 · Cloned from GitHub
            </div>
            <code className="rounded-md bg-white px-1.5 py-0.5 text-[11px] text-slate-500">
              local dev
            </code>
          </div>

          <p className="mb-3 text-[12.5px] leading-relaxed">
            If you cloned this repo, don&apos;t use the hosted cert —{" "}
            <b className="text-slate-900">generate your own</b> pair with QZ
            Tray&apos;s built-in generator and drop the two files into the
            project&apos;s{" "}
            <code className="rounded-md bg-white px-1.5 py-0.5 text-slate-900">
              certs/
            </code>{" "}
            folder:
          </p>

          <div className="rounded-xl border border-slate-200 bg-white p-3.5 text-[12.5px] leading-relaxed">
            <div className="mb-2 font-bold text-slate-900">At a glance</div>
            <ol className="ml-4 list-decimal space-y-1.5">
              <li>
                QZ Tray → <b className="text-slate-900">Advanced</b> →{" "}
                <b className="text-slate-900">Site Manager</b> →{" "}
                <b className="text-slate-900">+</b> →{" "}
                <b className="text-slate-900">Create New</b> → generate a
                key pair.
              </li>
              <li>
                Click <b className="text-slate-900">Yes</b> to install the
                certificate automatically, then{" "}
                <b className="text-slate-900">Yes</b> to copy it to{" "}
                <code className="text-slate-900">override.crt</code>.
              </li>
              <li>
                Copy{" "}
                <code className="text-slate-900">digital-certificate.txt</code>{" "}
                and <code className="text-slate-900">private-key.pem</code>{" "}
                from the <b className="text-slate-900">QZ Tray Demo Cert</b>{" "}
                folder on your Desktop.
              </li>
              <li>
                Paste both into this project&apos;s{" "}
                <code className="rounded-md bg-slate-50 px-1.5 py-0.5 text-slate-900">
                  certs/
                </code>{" "}
                folder.
              </li>
              <li>
                Restart the server (
                <code className="text-slate-900">npm run dev</code>) and
                reload the page. Popup gone.
              </li>
            </ol>
          </div>
        </div>

        <div className="flex items-start gap-2 text-[11.5px] leading-relaxed text-slate-400">
          <i className="fa-solid fa-triangle-exclamation mt-0.5 text-amber-500" aria-hidden="true" />
          <span>
            <b className="text-slate-700">Demo certificate for now.</b>{" "}
            It&apos;s trusted only on the machine that generated it, so
            don&apos;t reuse it in production or share it as a drop-in for
            other deployments.
          </span>
        </div>
      </div>
    </footer>
  );
}

export default Footer;