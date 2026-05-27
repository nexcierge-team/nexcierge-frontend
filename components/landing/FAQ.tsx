"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { FAQ_SECTIONS } from "@/lib/mockData";
import { SectionHeader } from "./SectionHeader";
import { Reveal } from "./Reveal";

export function FAQ() {
  return (
    <section className="border-b border-gray-200/70 bg-[#F7F8FA]">
      <div className="mx-auto max-w-3xl px-6 pt-16 pb-24 sm:pt-24 sm:pb-32">
        <SectionHeader
          eyebrow="FAQ"
          title="Frequently asked questions."
          align="center"
        />

        <div className="mt-14 space-y-10">
          {FAQ_SECTIONS.map((section, sIdx) => (
            <Reveal key={section.title} delay={sIdx * 0.05}>
              <div>
                <div className="text-xs font-medium uppercase tracking-[0.18em] text-gray-500">
                  {section.title}
                </div>
                <Accordion
                  type="single"
                  collapsible
                  className="mt-4 w-full"
                >
                  {section.items.map((f, i) => (
                    <AccordionItem
                      key={f.question}
                      value={`${sIdx}-${i}`}
                    >
                      <AccordionTrigger>{f.question}</AccordionTrigger>
                      <AccordionContent>{f.answer}</AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
