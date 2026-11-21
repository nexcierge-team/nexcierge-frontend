"use client";

import Link from "next/link";
import { LoginTrigger } from "@/components/auth/LoginTrigger";
import { useUserRole } from "@/lib/useUserRole";
import { CTA, FOOTER } from "@/lib/landingContent";
import { Wordmark } from "./Wordmark";

const HEADING = "type-data text-[13px] font-medium text-white/60";
const LINK =
  "inline-flex min-h-9 items-center text-[15px] text-white/90 transition-colors hover:text-white hover:underline hover:underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-paint focus-visible:ring-offset-2 focus-visible:ring-offset-ink";

// Restrained ink footer: the wordmark and one line on the left, three
// short link columns on the right. Only verified contact details appear
// here (no address, phone or registration until the business confirms
// them), and there are no legal page links until those pages exist.
export function Footer() {
  const { role } = useUserRole();
  const isAccountManager = role === "account_manager";

  return (
    <footer className="relative bg-ink pb-[max(32px,env(safe-area-inset-bottom))] pt-[clamp(48px,7vw,88px)] text-white">
      <div className="wrap">
        <div className="grid gap-10 min-[860px]:grid-cols-[minmax(0,1.6fr)_repeat(3,minmax(0,1fr))]">
          <div className="grid content-start gap-3">
            <Wordmark className="text-2xl text-white" />
            <p className="max-w-[32ch] text-white/75">{FOOTER.blurb}</p>
            <a
              href={`mailto:${FOOTER.email}`}
              className={`${LINK} justify-self-start`}
            >
              {FOOTER.email}
            </a>
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-10 min-[860px]:col-span-3 min-[860px]:grid-cols-3">
            {FOOTER.columns.map((col) => (
              <nav key={col.title} aria-label={col.title}>
                <h2 className={HEADING}>{col.title}</h2>
                <ul className="mt-3 grid gap-0.5">
                  {col.links.map((l) => (
                    <li key={l.href}>
                      <Link href={l.href} className={LINK}>
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
            <nav aria-label="Account">
              <h2 className={HEADING}>Account</h2>
              <ul className="mt-3 grid gap-0.5">
                <li>
                  <LoginTrigger className={LINK} signedInLabel={CTA.account}>
                    {CTA.signIn}
                  </LoginTrigger>
                </li>
                <li>
                  <Link
                    href="/chat"
                    className={LINK}
                    data-ph-capture-attribute-cta="footer"
                  >
                    {CTA.start}
                  </Link>
                </li>
                {isAccountManager && (
                  <li>
                    <Link href="/dashboard" className={LINK}>
                      Dashboard
                    </Link>
                  </li>
                )}
              </ul>
            </nav>
          </div>
        </div>

        <div className="mt-[clamp(40px,6vw,72px)] flex flex-wrap justify-between gap-x-6 gap-y-2 border-t border-white/15 pt-6 text-sm text-white/60">
          <p>© {new Date().getFullYear()} Nexcierge</p>
          <p>{FOOTER.legal}</p>
        </div>
      </div>
    </footer>
  );
}
