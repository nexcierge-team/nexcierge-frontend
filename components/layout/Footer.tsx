"use client";

import Link from "next/link";
import { useUserRole } from "@/lib/useUserRole";

export function Footer() {
  const { role } = useUserRole();
  const isAccountManager = role === "account_manager";

  const COLUMNS = [
    {
      title: "Product",
      links: [
        { href: "/chat", label: "AI sourcing" },
        ...(isAccountManager
          ? [{ href: "/dashboard", label: "Dashboard" }]
          : []),
        { href: "/about", label: "How it works" },
      ],
    },
    {
      title: "Company",
      links: [
        { href: "/about", label: "About" },
        { href: "/contact", label: "Contact" },
      ],
    },
    {
      title: "Legal",
      links: [
        { href: "/contact", label: "Privacy" },
        { href: "/contact", label: "Terms" },
      ],
    },
  ];

  return (
    <footer className="border-t border-gray-200 bg-white">
      <div className="mx-auto grid max-w-6xl gap-12 px-6 py-16 md:grid-cols-[2fr_1fr_1fr_1fr]">
        <div className="max-w-sm">
          <div className="font-semibold tracking-[0.16em] text-[15px] text-gray-900">
            NEXCIERGE
          </div>
          <p className="mt-4 text-sm leading-relaxed text-gray-500">
            The smart way to source industrial machinery — AI sourcing concierge,
            verified Chinese manufacturers, managed procurement.
          </p>
        </div>

        {COLUMNS.map((col) => (
          <div key={col.title}>
            <div className="text-xs font-medium uppercase tracking-wider text-gray-400">
              {col.title}
            </div>
            <ul className="mt-4 space-y-3">
              {col.links.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-gray-200">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-3 px-6 py-6 text-xs text-gray-400 md:flex-row md:items-center">
          <div>© {new Date().getFullYear()} Nexcierge. All rights reserved.</div>
          <div>Sourcing concierge for international machinery buyers.</div>
        </div>
      </div>
    </footer>
  );
}
