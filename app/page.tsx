import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Hero } from "@/components/landing/Hero";
import { TrustStrip } from "@/components/landing/TrustStrip";
import { DirectSourcing } from "@/components/landing/DirectSourcing";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Comparison } from "@/components/landing/Comparison";
import { ManufacturingNetwork } from "@/components/landing/ManufacturingNetwork";
import { Categories } from "@/components/landing/Categories";
import { FAQ } from "@/components/landing/FAQ";
import { FinalCTA } from "@/components/landing/FinalCTA";

export default function HomePage() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <TrustStrip />
        <DirectSourcing />
        <HowItWorks />
        <Comparison />
        <ManufacturingNetwork />
        <Categories />
        <FAQ />
        <FinalCTA />
      </main>
      <Footer />
    </>
  );
}
