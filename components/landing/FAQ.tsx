"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { FAQ_SECTIONS } from "@/lib/landingContent";
import { InView } from "./InView";
import { H2, SECTION } from "./styles";

// Sheet 8.
export function FAQ() {
  return (
    <section id="faq" className={SECTION}>
      <InView kind="draw" className="sheet-rule" />
      <div className="wrap grid gap-[clamp(28px,5vw,64px)] min-[960px]:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] min-[960px]:items-start">
        <InView kind="plot" as="h2" className={H2}>
          Frequently asked questions
        </InView>

        <div className="grid gap-10">
          {FAQ_SECTIONS.map((section, sIdx) => (
            <div key={section.title}>
              <div className="type-data text-sm font-bold text-ink-soft">
                {section.title}
              </div>
              <Accordion type="single" collapsible className="mt-3 w-full">
                {section.items.map((f, i) => (
                  <AccordionItem key={f.question} value={`${sIdx}-${i}`}>
                    <AccordionTrigger>{f.question}</AccordionTrigger>
                    <AccordionContent>{f.answer}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
