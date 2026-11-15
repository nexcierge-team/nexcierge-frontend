"use client";

import Link from "next/link";
import { useUserRole } from "@/lib/useUserRole";
import { FOOTER, NAV_LINKS } from "@/lib/landingContent";
import { Wordmark } from "./Wordmark";

// The footer is the drawing's title block: three ruled cells on ink.
export function Footer() {
  const { role } = useUserRole();
  const isAccountManager = role === "account_manager";

  const links = [
    { href: "/#risks", label: "Why deals go wrong" },
    ...NAV_LINKS.map((l) =>
      l.href === "/#agent" ? { ...l, label: "Intake agent" } : l,
    ),
    { href: "/about", label: "About" },
    { href: "/contact", label: "Contact" },
    ...(isAccountManager ? [{ href: "/dashboard", label: "Dashboard" }] : []),
  ];

  const cell = "border-sheet/40 p-[18px] max-[859px]:border-b min-[860px]:border-r last:border-0";
  const key = "type-data mb-1 text-[13px] font-semibold opacity-70";

  return (
    <footer className="bg-ink pb-[110px] pt-[clamp(40px,6vw,72px)] text-sheet min-[960px]:pb-[clamp(40px,6vw,72px)]">
      <div className="wrap">
        <div className="grid border-[1.5px] border-sheet min-[860px]:grid-cols-[2fr_1.4fr_1.4fr]">
          <div className={cell}>
            <div className={key}>Company</div>
            <Wordmark className="text-[clamp(1.6rem,1rem+3vw,2.6rem)] text-sheet" />
            <p className="mt-2.5 max-w-[36ch] opacity-85">{FOOTER.blurb}</p>
          </div>
          <div className={cell}>
            <div className={key}>Contact</div>
            <div className="grid gap-1.5">
              <a
                href={`mailto:${FOOTER.email}`}
                className="underline underline-offset-4"
              >
                {FOOTER.email}
              </a>
              <Link href="/contact" className="underline underline-offset-4">
                Contact form
              </Link>
            </div>
          </div>
          <div className={cell}>
            <div className={key}>Sheets</div>
            <div className="flex flex-wrap gap-x-5 gap-y-1.5">
              {links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="underline underline-offset-4"
                >
                  {l.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
        <p className="mt-[18px] text-sm opacity-75">
          © {new Date().getFullYear()} Nexcierge. {FOOTER.legal}
        </p>
      </div>
    </footer>
  );
}
