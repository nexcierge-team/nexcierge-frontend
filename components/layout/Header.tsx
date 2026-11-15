"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { motion, useMotionValueEvent, useScroll } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { AccountMenu } from "@/components/auth/AccountMenu";
import { LoginTrigger } from "@/components/auth/LoginTrigger";
import { useAuthUser } from "@/lib/useAuthUser";
import { useUserRole } from "@/lib/useUserRole";
import { NAV_LINKS } from "@/lib/landingContent";
import { Wordmark } from "./Wordmark";

// Section anchors are written as "/#id" so they also work from /about and
// /contact (route home, then jump). The bar is fixed, tucks away while
// scrolling down and returns on the way back up; pages under it start
// their first section with padding for --nav-h.
export function Header() {
  const pathname = usePathname();
  const onHome = pathname === "/";
  const { isSignedIn } = useAuthUser();
  const { role } = useUserRole();
  const isAccountManager = role === "account_manager";

  const [menuOpen, setMenuOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const { scrollY, scrollYProgress } = useScroll();

  useMotionValueEvent(scrollY, "change", (y) => {
    const prev = scrollY.getPrevious() ?? 0;
    setHidden(y > 400 && y > prev);
  });

  const closeMenu = () => setMenuOpen(false);

  return (
    <>
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-50 h-[var(--nav-h)] border-b border-rule bg-paper/90 backdrop-blur-[10px] transition-transform duration-300 ease-[cubic-bezier(0.2,0.7,0.2,1)]",
          hidden && !menuOpen && "-translate-y-[101%]",
        )}
      >
        <div className="wrap flex h-full items-center gap-5">
          <Link
            href="/"
            aria-label="Nexcierge home"
            className="mr-auto"
            onClick={closeMenu}
          >
            <Wordmark className="text-lg" />
          </Link>

          <nav
            aria-label="Main"
            className="hidden items-center gap-[22px] min-[960px]:flex"
          >
            {NAV_LINKS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="link-draw py-2 text-[15px] font-semibold"
              >
                {item.label}
              </Link>
            ))}
            {isAccountManager && (
              <Link
                href="/dashboard"
                className="link-draw py-2 text-[15px] font-semibold"
              >
                Dashboard
              </Link>
            )}
          </nav>

          {isSignedIn ? (
            <AccountMenu redirectTo={pathname ?? "/"} variant="avatar" />
          ) : (
            <LoginTrigger className="hidden whitespace-nowrap text-[15px] font-bold underline underline-offset-4 min-[960px]:inline">
              Log in
            </LoginTrigger>
          )}

          <Button asChild size="sm" className="max-[519px]:hidden">
            <Link href="/chat" data-ph-capture-attribute-cta="nav">
              Start a brief
            </Link>
          </Button>

          <button
            type="button"
            aria-expanded={menuOpen}
            aria-controls="site-menu"
            aria-label="Menu"
            onClick={() => setMenuOpen((v) => !v)}
            className="-mr-2.5 grid h-11 w-11 place-items-center min-[960px]:hidden"
          >
            <span className="relative block h-[16px] w-[22px]" aria-hidden="true">
              <span
                className={cn(
                  "absolute left-0 h-0.5 w-full bg-ink transition-all duration-200",
                  menuOpen ? "top-[7px] rotate-45" : "top-0",
                )}
              />
              <span
                className={cn(
                  "absolute left-0 top-[7px] h-0.5 w-full bg-ink transition-opacity duration-200",
                  menuOpen && "opacity-0",
                )}
              />
              <span
                className={cn(
                  "absolute left-0 h-0.5 w-full bg-ink transition-all duration-200",
                  menuOpen ? "top-[7px] -rotate-45" : "top-[14px]",
                )}
              />
            </span>
          </button>
        </div>

        {onHome && (
          <motion.div
            aria-hidden="true"
            style={{ scaleX: scrollYProgress }}
            className="absolute -bottom-px left-0 h-0.5 w-full origin-left bg-ink"
          />
        )}
      </header>

      <div
        id="site-menu"
        className={cn(
          "fixed inset-x-0 bottom-0 top-[var(--nav-h)] z-[49] grid content-start gap-1 overflow-y-auto bg-paper px-[var(--gutter)] py-7 transition-[opacity,transform,visibility] duration-200 min-[960px]:hidden",
          menuOpen
            ? "visible translate-y-0 opacity-100"
            : "invisible -translate-y-2 opacity-0",
        )}
      >
        {[{ href: "/#risks", label: "Why deals go wrong" }, ...NAV_LINKS].map(
          (item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={closeMenu}
              className="type-display border-b border-rule py-3 text-[1.75rem] font-extrabold"
            >
              {item.label}
            </Link>
          ),
        )}
        {isAccountManager && (
          <Link
            href="/dashboard"
            onClick={closeMenu}
            className="type-display border-b border-rule py-3 text-[1.75rem] font-extrabold"
          >
            Dashboard
          </Link>
        )}
        {!isSignedIn && (
          <LoginTrigger className="type-display border-b border-rule py-3 text-left text-[1.75rem] font-extrabold">
            Log in
          </LoginTrigger>
        )}
        <Link
          href="/chat"
          onClick={closeMenu}
          data-ph-capture-attribute-cta="menu"
          className="type-display border-b border-rule py-3 text-[1.75rem] font-extrabold"
        >
          Start a brief
        </Link>
      </div>
    </>
  );
}
