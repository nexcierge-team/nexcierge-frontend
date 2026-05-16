"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { FAQS } from "@/lib/mockData";
import { SectionHeader } from "./SectionHeader";
import { Reveal } from "./Reveal";

export function FAQ() {
  return (
    <section className="border-b border-gray-200/70 bg-[#F7F8FA]">
      <div className="mx-auto max-w-3xl px-6 py-24 sm:py-32">
        <SectionHeader
          eyebrow="FAQ"
          title="Common questions."
          align="center"
        />

        <Reveal>
          <div className="mt-12">
            <Accordion type="single" collapsible className="w-full">
              {FAQS.map((f, i) => (
                <AccordionItem key={f.question} value={`item-${i}`}>
                  <AccordionTrigger>{f.question}</AccordionTrigger>
                  <AccordionContent>{f.answer}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
