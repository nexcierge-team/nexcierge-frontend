"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AccountMenu } from "@/components/auth/AccountMenu";
import { useUserRole } from "@/lib/useUserRole";

// On the homepage, "How it works" scrolls to the section anchor.
// Elsewhere it routes home and then jumps. "Contact us" goes to the
// contact form, which composes a mailto: into nexcierge.ai@gmail.com.
const NAV = [
  { href: "/#how-it-works", label: "How it works" },
  { href: "/contact", label: "Contact us" },
];

export function Header() {
  const pathname = usePathname();
  const onChatPage = pathname?.startsWith("/chat");
  const { role } = useUserRole();
  const isAccountManager = role === "account_manager";

  return (
    <header className="sticky top-0 z-40 w-full border-b border-gray-200/70 bg-white/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link
          href="/"
          className="font-semibold tracking-[0.16em] text-[15px] text-gray-900"
          aria-label="Nexcierge home"
        >
          NEXCIERGE
        </Link>

        <nav className="hidden items-center gap-7 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "text-sm font-medium transition-colors",
                pathname === item.href
                  ? "text-gray-900"
                  : "text-gray-600 hover:text-gray-900",
              )}
            >
              {item.label}
            </Link>
          ))}
          {isAccountManager && (
            <Link
              href="/dashboard"
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              Dashboard
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-3">
          <AccountMenu redirectTo={pathname ?? "/"} variant="avatar" />
          {!onChatPage && (
            <Button
              asChild
              size="md"
              className="shadow-[0_8px_24px_-8px_rgba(15,39,71,0.45)] hover:shadow-[0_10px_28px_-8px_rgba(15,39,71,0.55)]"
            >
              <Link href="/chat">
                Start sourcing
                <ArrowRight className="h-4 w-4" strokeWidth={2} />
              </Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
