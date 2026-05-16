"use client";

import { FormEvent, useState } from "react";
import { Mail, MapPin, MessageSquare, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Reveal } from "@/components/landing/Reveal";

const CHANNELS = [
  {
    icon: Mail,
    label: "Email",
    value: "hello@nexcierge.com",
    href: "mailto:hello@nexcierge.com",
  },
  {
    icon: MessageSquare,
    label: "AI sourcing concierge",
    value: "Start a conversation",
    href: "/chat",
  },
  {
    icon: MapPin,
    label: "Office",
    value: "Shenzhen, China · Operations\nRemote-first elsewhere",
  },
];

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    // Mock submission delay
    setTimeout(() => {
      setSubmitted(true);
      setBusy(false);
    }, 600);
  }

  return (
    <>
      <Header />
      <main>
        <section className="bg-white">
          <div className="mx-auto max-w-6xl px-6 pt-20 pb-24 sm:pt-28">
            <Reveal>
              <div className="max-w-2xl">
                <div className="text-xs font-medium uppercase tracking-[0.18em] text-[#0F2747]">
                  Contact
                </div>
                <h1 className="mt-3 text-4xl font-semibold tracking-[-0.02em] text-gray-900 sm:text-5xl">
                  Talk to the team.
                </h1>
                <p className="mt-5 text-base leading-relaxed text-gray-600 sm:text-lg">
                  For sourcing inquiries, the AI sourcing concierge is the
                  fastest path. For everything else — partnerships, press, or
                  enterprise procurement — drop a note below.
                </p>
              </div>
            </Reveal>

            <div className="mt-14 grid gap-12 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
              <Reveal delay={0.05}>
                <form
                  onSubmit={onSubmit}
                  className="rounded-3xl border border-gray-200 bg-white p-7 shadow-[0_1px_2px_rgba(0,0,0,0.03)] sm:p-9"
                >
                  {submitted ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                      <CheckCircle2
                        className="h-7 w-7 text-[#0F2747]"
                        strokeWidth={1.5}
                      />
                      <h3 className="mt-4 text-xl font-semibold text-gray-900">
                        Message sent.
                      </h3>
                      <p className="mt-2 max-w-sm text-sm leading-relaxed text-gray-600">
                        We&apos;ll get back within one business day. For urgent
                        sourcing needs, start a conversation with the AI agent.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-5">
                      <div className="grid gap-5 sm:grid-cols-2">
                        <Field label="Name" htmlFor="name">
                          <Input id="name" name="name" required placeholder="Ravi Kumar" />
                        </Field>
                        <Field label="Email" htmlFor="email">
                          <Input
                            id="email"
                            name="email"
                            type="email"
                            required
                            placeholder="you@company.com"
                          />
                        </Field>
                      </div>

                      <div className="grid gap-5 sm:grid-cols-2">
                        <Field label="Company" htmlFor="company">
                          <Input id="company" name="company" placeholder="Acme Industrial" />
                        </Field>
                        <Field label="Country" htmlFor="country">
                          <Input id="country" name="country" placeholder="India" />
                        </Field>
                      </div>

                      <Field label="What are you looking to source?" htmlFor="message">
                        <Textarea
                          id="message"
                          name="message"
                          required
                          rows={5}
                          placeholder="Brief description of the machinery, capacity, and timeline…"
                        />
                      </Field>

                      <div className="flex items-center justify-between pt-2">
                        <p className="text-xs text-gray-500">
                          We reply within one business day.
                        </p>
                        <Button type="submit" disabled={busy}>
                          {busy ? "Sending…" : "Send message"}
                        </Button>
                      </div>
                    </div>
                  )}
                </form>
              </Reveal>

              <Reveal delay={0.1}>
                <div className="space-y-7">
                  <p className="text-sm leading-relaxed text-gray-500">
                    Working hours are 09:00–18:00 China Standard Time (UTC+8).
                    Cross-border sourcing inquiries usually get a response within
                    a few hours during these windows.
                  </p>

                  <div className="rounded-2xl border border-gray-200 bg-white">
                    <ul className="divide-y divide-gray-100">
                      {CHANNELS.map((c) => (
                        <li
                          key={c.label}
                          className="flex items-start gap-4 px-6 py-5"
                        >
                          <c.icon
                            className="mt-0.5 h-4 w-4 shrink-0 text-gray-400"
                            strokeWidth={1.5}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-medium uppercase tracking-[0.14em] text-gray-400">
                              {c.label}
                            </div>
                            <div className="mt-1 whitespace-pre-line text-sm text-gray-900">
                              {c.href ? (
                                <a
                                  href={c.href}
                                  className="hover:text-[#0F2747] transition-colors"
                                >
                                  {c.value}
                                </a>
                              ) : (
                                c.value
                              )}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </Reveal>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="mb-1.5 block text-sm font-medium text-gray-900"
      >
        {label}
      </label>
      {children}
    </div>
  );
}
