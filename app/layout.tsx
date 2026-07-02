import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import PostHogIdentify from "@/components/analytics/PostHogIdentify";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

// viewport-fit=cover lets iOS extend the page into the dynamic island /
// home-indicator area, then the `pt-safe` / `pb-safe` utilities defined
// in globals.css carve the unsafe regions back out where it matters.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "Nexcierge — Source industrial machinery from China, intelligently.",
  description:
    "AI sourcing concierge for international buyers. Identify domestic Chinese suppliers, qualify requirements, and execute through a managed sourcing workflow.",
  metadataBase: new URL("https://nexcierge.com"),
  // Pre-launch: keep the deployed preview out of search engines. Remove
  // before public launch so Google can index the marketing pages.
  robots: { index: false, follow: false },
  openGraph: {
    title: "Nexcierge — The smart way to source equipment",
    description:
      "AI-powered industrial machinery sourcing from Chinese manufacturers, with human verification and managed procurement.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full bg-white text-gray-900">
        <PostHogIdentify />
        {children}
      </body>
    </html>
  );
}
