import { Hero } from "@/components/landing/Hero";
import { Risks } from "@/components/landing/Risks";
import { Steps } from "@/components/landing/Steps";
import { MerchantOfRecord } from "@/components/landing/MerchantOfRecord";
import { ClosingCTA } from "@/components/landing/ClosingCTA";

// Five sections, each answering one question: what Nexcierge does (hero),
// why trust it (the usual chain struck through, three risks and fixes), how it works (steps), who is responsible
// (Merchant of Record), and how to start (closing). The detail lives on
// /how-it-works, /services and /why-nexcierge. Copy is in
// lib/landingContent.ts. `overflow-x-clip` keeps the hero drawing's bleed
// from causing sideways scroll.
export default function HomePage() {
  return (
    <main className="overflow-x-clip">
      <Hero />
      <Risks />
      <Steps />
      <MerchantOfRecord />
      <ClosingCTA divider={false} />
    </main>
  );
}
