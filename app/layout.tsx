import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { FloatingChatButton } from "@/components/landing/FloatingChatButton";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

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
        {children}
        <FloatingChatButton />
      </body>
    </html>
  );
}
