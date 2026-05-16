import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Nexcierge — The Smart Way to Source Equipment",
  description:
    "AI-powered industrial machinery sourcing, direct from Chinese manufacturers.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-white text-zinc-900">
        <header className="border-b border-zinc-100 px-6 py-4">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <Link
              href="/"
              className="font-semibold tracking-[0.18em] text-zinc-900 text-sm"
            >
              NEXCIERGE
            </Link>
            <Link
              href="/login"
              className="text-sm text-zinc-600 hover:text-zinc-900 transition-colors"
            >
              Login
            </Link>
          </div>
        </header>
        <main className="flex flex-col flex-1">{children}</main>
      </body>
    </html>
  );
}
