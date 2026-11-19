"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useMotionValueEvent, useScroll } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { AccountMenu } from "@/components/auth/AccountMenu";
import { LoginTrigger } from "@/components/auth/LoginTrigger";
import { useAuthUser } from "@/lib/useAuthUser";
import { useUserRole } from "@/lib/useUserRole";
import { CTA, NAV_LINKS } from "@/lib/landingContent";
import { Wordmark } from "./Wordmark";

const DESKTOP_LINK =
  "relative py-2 text-[15px] font-medium text-ink-soft transition-colors hover:text-ink aria-[current=page]:text-ink after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:origin-left after:scale-x-0 after:bg-paint after:transition-transform after:duration-200 hover:after:scale-x-100 aria-[current=page]:after:scale-x-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blueprint focus-visible:ring-offset-4 focus-visible:ring-offset-sheet";

const MENU_LINK =
  "flex min-h-14 items-center border-b border-rule text-xl font-semibold text-ink type-title aria-[current=page]:underline aria-[current=page]:decoration-paint aria-[current=page]:decoration-[3px] aria-[current=page]:underline-offset-8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blueprint";

// The marketing header. Fixed; tucks away while scrolling down and comes
// back on the way up. Pages start their first section with padding for
// --nav-h. Below 960px the links move into a full-height menu sheet.
export function Header() {
  const pathname = usePathname();
  const { isSignedIn } = useAuthUser();
  const { role } = useUserRole();
  const isAccountManager = role === "account_manager";

  const [menuOpen, setMenuOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { scrollY } = useScroll();
  const toggleRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useMotionValueEvent(scrollY, "change", (y) => {
    const prev = scrollY.getPrevious() ?? 0;
    setHidden(y > 400 && y > prev);
    setScrolled(y > 8);
  });

  // Close the sheet whenever the route changes (covers browser back too).
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setMenuOpen(false);
  }

  // While the sheet is open: Escape closes it, focus moves into it, and
  // the page behind it does not scroll. Focus returns to the toggle on
  // close.
  useEffect(() => {
    if (!menuOpen) return;
    const toggle = toggleRef.current;
    // Wait a frame: the sheet is still `visibility: hidden` on the commit
    // frame (its visibility transitions with the fade), so focus() there
    // would be ignored.
    const focusId = window.setTimeout(() => {
      menuRef.current?.querySelector<HTMLElement>("a, button")?.focus();
    }, 30);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(focusId);
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      toggle?.focus({ preventScroll: true });
    };
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);
  const current = (href: string) => (pathname === href ? "page" : undefined);
  const accountHref = isAccountManager ? "/dashboard" : "/chat";
  const accountLabel = isAccountManager ? "Dashboard" : CTA.account;

  return (
    <>
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-50 h-[var(--nav-h)] border-b bg-sheet/95 backdrop-blur-[8px] transition-[transform,border-color] duration-300 ease-[cubic-bezier(0.2,0.7,0.2,1)]",
          scrolled || menuOpen ? "border-rule" : "border-transparent",
          hidden && !menuOpen && "-translate-y-[101%]",
        )}
      >
        <div className="wrap flex h-full items-center gap-6">
          <Link
            href="/"
            aria-label="Nexcierge home"
            className="mr-auto rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blueprint focus-visible:ring-offset-4 focus-visible:ring-offset-sheet"
            onClick={closeMenu}
          >
            <Wordmark className="text-lg" />
          </Link>

          <nav
            aria-label="Main"
            className="hidden items-center gap-8 min-[960px]:flex"
          >
            {NAV_LINKS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={current(item.href)}
                className={DESKTOP_LINK}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-5">
            {isSignedIn ? (
              <>
                <Link
                  href={accountHref}
                  className={cn(DESKTOP_LINK, "hidden min-[960px]:inline")}
                >
                  {accountLabel}
                </Link>
                <span className="hidden min-[960px]:inline-flex">
                  <AccountMenu redirectTo={pathname ?? "/"} variant="avatar" />
                </span>
              </>
            ) : (
              <LoginTrigger
                className={cn(DESKTOP_LINK, "hidden min-[960px]:inline")}
              >
                {CTA.signIn}
              </LoginTrigger>
            )}

            <Button asChild size="sm" className="h-10 max-[399px]:hidden">
              <Link href="/chat" data-ph-capture-attribute-cta="nav">
                {CTA.start}
              </Link>
            </Button>

            <button
              ref={toggleRef}
              type="button"
              aria-expanded={menuOpen}
              aria-controls="site-menu"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              onClick={() => setMenuOpen((v) => !v)}
              className="-mr-2.5 grid h-11 w-11 place-items-center rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blueprint min-[960px]:hidden"
            >
              <span className="relative block h-[14px] w-[20px]" aria-hidden="true">
                <span
                  className={cn(
                    "absolute left-0 h-[1.5px] w-full bg-ink transition-transform duration-200",
                    menuOpen ? "top-[6px] rotate-45" : "top-0",
                  )}
                />
                <span
                  className={cn(
                    "absolute left-0 top-[6px] h-[1.5px] w-full bg-ink transition-opacity duration-200",
                    menuOpen && "opacity-0",
                  )}
                />
                <span
                  className={cn(
                    "absolute left-0 h-[1.5px] w-full bg-ink transition-transform duration-200",
                    menuOpen ? "top-[6px] -rotate-45" : "top-[12px]",
                  )}
                />
              </span>
            </button>
          </div>
        </div>
      </header>

      <div
        id="site-menu"
        ref={menuRef}
        role="dialog"
        aria-modal="true"
        aria-label="Site menu"
        inert={!menuOpen}
        className={cn(
          "fixed inset-x-0 bottom-0 top-[var(--nav-h)] z-[49] flex flex-col overflow-y-auto bg-sheet px-[var(--gutter)] pb-[max(24px,env(safe-area-inset-bottom))] pt-4 transition-[opacity,transform,visibility] duration-200 motion-reduce:transition-none min-[960px]:hidden",
          menuOpen
            ? "visible translate-y-0 opacity-100"
            : "invisible -translate-y-2 opacity-0",
        )}
      >
        <nav aria-label="Main" className="grid">
          <Link href="/" onClick={closeMenu} aria-current={current("/")} className={MENU_LINK}>
            Home
          </Link>
          {NAV_LINKS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={closeMenu}
              aria-current={current(item.href)}
              className={MENU_LINK}
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/contact"
            onClick={closeMenu}
            aria-current={current("/contact")}
            className={MENU_LINK}
          >
            Contact
          </Link>
        </nav>

        <div className="mt-8 grid gap-3">
          <Button asChild size="lg" className="w-full">
            <Link
              href="/chat"
              onClick={closeMenu}
              data-ph-capture-attribute-cta="menu"
            >
              {CTA.start}
            </Link>
          </Button>
          {isSignedIn ? (
            <div className="flex items-center justify-between gap-4 py-2">
              <Link
                href={accountHref}
                onClick={closeMenu}
                className="min-h-11 content-center font-semibold text-ink underline underline-offset-4"
              >
                {accountLabel}
              </Link>
              <AccountMenu redirectTo={pathname ?? "/"} variant="avatar" />
            </div>
          ) : (
            // The sign-in modal is portalled to <body>, so closing the
            // sheet as it opens does not hide it.
            <div onClickCapture={closeMenu}>
              <LoginTrigger className="inline-flex h-[50px] w-full items-center justify-center rounded-sm border border-rule-strong font-semibold text-ink transition-colors hover:border-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blueprint">
                {CTA.signIn}
              </LoginTrigger>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
