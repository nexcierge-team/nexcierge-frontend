import type { Metadata, Viewport } from "next";
import { Archivo } from "next/font/google";
import PostHogIdentify from "@/components/analytics/PostHogIdentify";
import { AuthProvider } from "@/components/auth/AuthProvider";
import "./globals.css";

// One variable family, three widths: expanded for headlines, normal for
// reading, condensed for spec data (see the type-* utilities in
// globals.css). The width axis needs the variable font, so no `weight`.
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin", "latin-ext"],
  axes: ["wdth"],
  display: "swap",
});

// viewport-fit=cover lets iOS extend the page into the dynamic island /
// home-indicator area, then the `pt-safe` / `pb-safe` utilities defined
// in globals.css carve the unsafe regions back out where it matters.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#E7EBE6",
};

export const metadata: Metadata = {
  title: "Nexcierge | Buy machinery from anywhere, under one contract.",
  description:
    "Brief our AI agent in your language. A local account manager sources the machine, the factory is audited, and Nexcierge sells it to you as Merchant of Record.",
  metadataBase: new URL("https://nexcierge.com"),
  // Pre-launch: keep the deployed preview out of search engines. Remove
  // before public launch so Google can index the marketing pages.
  robots: { index: false, follow: false },
  openGraph: {
    title: "Nexcierge | Buy machinery from anywhere, under one contract.",
    description:
      "AI-powered procurement for industrial machinery and equipment, sold under one contract.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${archivo.variable} h-full antialiased`}
      data-scroll-behavior="smooth">
      <body className="min-h-full bg-paper text-ink">
        <AuthProvider>
          <PostHogIdentify />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
