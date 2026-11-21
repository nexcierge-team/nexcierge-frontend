import { Hero } from "@/components/landing/Hero";
import { Risks } from "@/components/landing/Risks";
import { Steps } from "@/components/landing/Steps";
import { MerchantOfRecord } from "@/components/landing/MerchantOfRecord";
import { ClosingCTA } from "@/components/landing/ClosingCTA";

// Five sections, each answering one question: what Nexcierge does (hero),
// why trust it (the usual chain struck through, three risks and fixes),
// how it works (steps), who is responsible (Merchant of Record), and how
// to start (closing). The detail lives on /how-it-works, /services and
// /why-nexcierge. Copy is in lib/landingContent.ts.
//
// The hero is sticky: it stays put (the machine keeps cutting) while the
// next section slides up over it like a sheet laid on top. The sticky
// range is only the first wrapper, so once the Risks sheet has passed,
// the hero scrolls away and its canvas stops rendering. `overflow-x-clip`
// (not hidden) keeps the drawing's bleed from causing sideways scroll
// without breaking `position: sticky`.
export default function HomePage() {
  return (
    <main className="overflow-x-clip">
      <div>
        <Hero />
        <div className="relative z-[1] bg-sheet">
          <Risks />
        </div>
      </div>
      <div className="relative z-[1] bg-sheet">
        <Steps />
        <MerchantOfRecord />
        <ClosingCTA divider={false} />
      </div>
    </main>
  );
}
