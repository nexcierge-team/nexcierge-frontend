import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Reveal } from "./Reveal";

export function FinalCTA() {
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-4xl px-6 py-28 text-center sm:py-36">
        <Reveal>
          <h2 className="text-4xl font-semibold tracking-[-0.015em] text-zinc-900 sm:text-5xl">
            Need machinery sourced?
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-zinc-600 sm:text-lg">
            Describe what you&apos;re looking for. The AI sourcing concierge takes
            it from there.
          </p>
          <div className="mt-9">
            <Button asChild size="lg">
              <Link href="/chat">
                Talk to Nexcierge AI
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
