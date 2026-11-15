"use client";

import { FormEvent, useState } from "react";
import { Mail, MessageSquare, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Reveal } from "@/components/landing/Reveal";

const CONTACT_INBOX = "nexcierge.ai@gmail.com";

const CHANNELS = [
  {
    icon: Mail,
    label: "Email",
    value: CONTACT_INBOX,
    href: `mailto:${CONTACT_INBOX}`,
  },
  {
    icon: MessageSquare,
    label: "AI sourcing concierge",
    value: "Start a conversation",
    href: "/chat",
  },
];

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);

    const form = e.currentTarget;
    const data = new FormData(form);
    const firstName = String(data.get("firstName") ?? "").trim();
    const lastName = String(data.get("lastName") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();
    const subject = String(data.get("subject") ?? "").trim();
    const body = String(data.get("body") ?? "").trim();

    const fullName = [firstName, lastName].filter(Boolean).join(" ");
    const composedBody = [
      `From: ${fullName || "(no name)"}${email ? ` <${email}>` : ""}`,
      "",
      body,
    ].join("\n");

    const href =
      `mailto:${CONTACT_INBOX}` +
      `?subject=${encodeURIComponent(subject || "Nexcierge contact form")}` +
      `&body=${encodeURIComponent(composedBody)}`;

    // Open the user's mail client. We do this in a microtask so React can
    // commit the busy state first — feels snappier than blocking on the
    // navigation.
    window.location.href = href;

    setTimeout(() => {
      setSubmitted(true);
      setBusy(false);
    }, 250);
  }

  return (
    <>
      <main>
        <section className="pt-[calc(var(--nav-h)+clamp(28px,5vw,64px))] pb-[clamp(60px,8vw,108px)]">
          <div className="wrap">
            <Reveal>
              <div className="max-w-2xl">
                <div className="type-data text-sm font-semibold text-ink-soft">
                  Contact
                </div>
                <h1 className="type-display mt-3 text-[length:clamp(2.2rem,1.3rem+3.4vw,3.7rem)] font-extrabold leading-[0.98] text-ink">
                  Talk to the team.
                </h1>
                <p className="mt-5 text-base leading-relaxed text-ink-soft sm:text-lg">
                  For sourcing inquiries, the AI sourcing concierge is the
                  fastest path. For everything else, including partnerships,
                  press, and enterprise procurement, drop a note below.
                </p>
              </div>
            </Reveal>

            <div className="mt-14 grid gap-12 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
              <Reveal delay={0.05}>
                <form
                  onSubmit={onSubmit}
                  className="rounded-none border-[1.5px] border-ink bg-sheet p-7 sm:p-9"
                >
                  {submitted ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                      <CheckCircle2
                        className="h-7 w-7 text-ink"
                        strokeWidth={1.5}
                      />
                      <h3 className="type-title mt-4 text-xl font-bold text-ink">
                        Almost there.
                      </h3>
                      <p className="mt-2 max-w-sm text-sm leading-relaxed text-ink-soft">
                        Your mail client should open with the message ready to
                        send. If nothing happened, write to{" "}
                        <a
                          href={`mailto:${CONTACT_INBOX}`}
                          className="font-semibold text-blueprint underline underline-offset-4 hover:text-ink"
                        >
                          {CONTACT_INBOX}
                        </a>{" "}
                        directly.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-5">
                      <div className="grid gap-5 sm:grid-cols-2">
                        <Field label="First name" htmlFor="firstName">
                          <Input
                            id="firstName"
                            name="firstName"
                            required
                            placeholder="John"
                            autoComplete="given-name"
                          />
                        </Field>
                        <Field label="Last name" htmlFor="lastName">
                          <Input
                            id="lastName"
                            name="lastName"
                            required
                            placeholder="Doe"
                            autoComplete="family-name"
                          />
                        </Field>
                      </div>

                      <Field label="Email" htmlFor="email">
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          required
                          placeholder="you@company.com"
                          autoComplete="email"
                        />
                      </Field>

                      <Field label="Subject" htmlFor="subject">
                        <Input
                          id="subject"
                          name="subject"
                          required
                          placeholder="What's this about?"
                        />
                      </Field>

                      <Field label="Message" htmlFor="body">
                        <Textarea
                          id="body"
                          name="body"
                          required
                          rows={6}
                          placeholder="Tell us a little about what you're looking for…"
                        />
                      </Field>

                      <div className="flex items-center justify-between pt-2">
                        <p className="type-data text-sm font-semibold text-ink-soft">
                          We reply within one business day.
                        </p>
                        <Button type="submit" disabled={busy}>
                          {busy ? "Opening…" : "Send message"}
                        </Button>
                      </div>
                    </div>
                  )}
                </form>
              </Reveal>

              <Reveal delay={0.1}>
                <div className="space-y-7">
                  <p className="text-sm leading-relaxed text-ink-soft">
                    Working hours are 09:00–18:00 China Standard Time (UTC+8).
                    Cross-border sourcing inquiries usually get a response
                    within a few hours during these windows.
                  </p>

                  <div className="rounded-none border-[1.5px] border-ink bg-sheet">
                    <ul className="divide-y divide-rule-strong">
                      {CHANNELS.map((c) => (
                        <li
                          key={c.label}
                          className="flex items-start gap-4 px-6 py-5"
                        >
                          <c.icon
                            className="mt-0.5 h-4 w-4 shrink-0 text-ink"
                            strokeWidth={1.5}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="type-data text-[13px] font-semibold text-ink-soft">
                              {c.label}
                            </div>
                            <div className="mt-1 whitespace-pre-line text-sm font-semibold text-ink">
                              {c.href ? (
                                <a
                                  href={c.href}
                                  className="text-blueprint underline underline-offset-4 transition-colors hover:text-ink"
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
        className="mb-1.5 block text-sm font-semibold text-ink"
      >
        {label}
      </label>
      {children}
    </div>
  );
}
