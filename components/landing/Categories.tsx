"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { motion } from "framer-motion";
import { MACHINERY_CATEGORIES } from "@/lib/mockData";
import { SectionHeader } from "./SectionHeader";

export function Categories() {
  return (
    <section className="border-b border-gray-200/70 bg-white">
      <div className="mx-auto max-w-6xl px-6 py-24 sm:py-32">
        <SectionHeader
          eyebrow="Categories"
          title="Industries we source for."
          description="From packaging lines to industrial automation, the sourcing concierge supports the categories where Chinese manufacturers lead globally."
        />

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {MACHINERY_CATEGORIES.map((c, i) => (
            <motion.div
              key={c.title}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{
                duration: 0.5,
                delay: i * 0.04,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              <Link
                href="/chat"
                className="group relative flex h-full flex-col justify-between rounded-2xl border border-gray-200 bg-white p-7 transition-all duration-200 hover:border-gray-300 hover:shadow-[0_8px_30px_-12px_rgba(0,0,0,0.08)]"
              >
                <div>
                  <div className="text-lg font-semibold text-gray-900">
                    {c.title}
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-gray-600">
                    {c.description}
                  </p>
                </div>
                <div className="mt-8 flex items-center justify-between border-t border-gray-100 pt-4 text-xs text-gray-400">
                  <span className="tracking-wide">{c.examples}</span>
                  <ArrowUpRight
                    className="h-4 w-4 text-gray-400 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-gray-900"
                    strokeWidth={1.5}
                  />
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
