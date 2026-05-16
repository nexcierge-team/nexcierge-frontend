"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const NAV = [
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export function Header() {
  const pathname = usePathname();
  const onChatPage = pathname?.startsWith("/chat");

  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-200/70 bg-white/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link
          href="/"
          className="font-semibold tracking-[0.16em] text-[15px] text-zinc-900"
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
                "text-sm transition-colors",
                pathname === item.href
                  ? "text-zinc-900"
                  : "text-zinc-600 hover:text-zinc-900",
              )}
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/dashboard"
            className="text-sm text-zinc-600 hover:text-zinc-900 transition-colors"
          >
            Dashboard
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="hidden text-sm text-zinc-600 hover:text-zinc-900 transition-colors sm:block md:hidden"
          >
            Log in
          </Link>
          {!onChatPage && (
            <Button asChild size="sm">
              <Link href="/chat">Start sourcing</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
