import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

// Shared chrome for the marketing pages (/, /how-it-works, /services,
// /why-nexcierge, /contact). Living in a route-group layout means Header
// and Footer stay mounted across navigations between these pages instead
// of remounting (and re-running their auth/role hooks) on every click.
// The (marketing) group doesn't change any URL. Marketing pages sit on
// the warm sheet surface; the app routes keep paper.
export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-sheet">
      <Header />
      {children}
      <Footer />
    </div>
  );
}
