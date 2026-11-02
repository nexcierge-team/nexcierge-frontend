import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

// Shared chrome for the marketing pages (/, /about, /contact). Living in
// a route-group layout means Header and Footer stay mounted across
// navigations between these pages, instead of remounting (and re-running
// their auth/role hooks) on every click as they did when each page
// rendered its own. The (marketing) group doesn't change any URL.
export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Header />
      {children}
      <Footer />
    </>
  );
}
