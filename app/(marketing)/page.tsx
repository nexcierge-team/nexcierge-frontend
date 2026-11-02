import { Hero } from "@/components/landing/Hero";
import { TrustStrip } from "@/components/landing/TrustStrip";
import { DirectSourcing } from "@/components/landing/DirectSourcing";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Comparison } from "@/components/landing/Comparison";
import { Categories } from "@/components/landing/Categories";
import { FAQ } from "@/components/landing/FAQ";

export default function HomePage() {
  return (
    <>
      <main>
        <Hero />
        <TrustStrip />
        <DirectSourcing />
        <HowItWorks />
        <Comparison />
        <Categories />
        <FAQ />
      </main>
    </>
  );
}
