import { Hero } from "@/components/landing/Hero";
import { Risks } from "@/components/landing/Risks";
import { Process } from "@/components/landing/Process";
import { Agent } from "@/components/landing/Agent";
import { Account } from "@/components/landing/Account";
import { MerchantOfRecord } from "@/components/landing/MerchantOfRecord";
import { Scope } from "@/components/landing/Scope";
import { FAQ } from "@/components/landing/FAQ";
import { ClosingCTA } from "@/components/landing/ClosingCTA";
import { MobileDock } from "@/components/landing/MobileDock";

// The landing page reads as a set of drawing sheets. Copy lives in
// lib/landingContent.ts. `overflow-x-clip` (not hidden) keeps the hero
// rig's bleed from causing sideways scroll without breaking the sticky
// pin in <Process />.
export default function HomePage() {
  return (
    <>
      <main className="overflow-x-clip">
        <Hero />
        <Risks />
        <Process />
        <Agent />
        <Account />
        <MerchantOfRecord />
        <Scope />
        <FAQ />
        <ClosingCTA />
      </main>
      <MobileDock />
    </>
  );
}
