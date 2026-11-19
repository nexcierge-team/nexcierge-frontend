"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { H1, H3, LABEL, LEAD, PAGE_TOP } from "@/components/landing/styles";
import { CTA } from "@/lib/landingContent";

const CONTACT_INBOX = "nexcierge.ai@gmail.com";

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
    <main>
      <section className={`bg-drafting pb-[clamp(64px,9vw,128px)] ${PAGE_TOP}`}>
        <div className="wrap">
          <div className="grid max-w-2xl gap-6">
            <h1 className={`${H1} hero-in`}>Talk to our team.</h1>
            <p className={`${LEAD} hero-in`} style={{ animationDelay: "0.12s" }}>
              Looking for equipment? Starting a request is the quickest way to
              reach an account manager. For partnerships, press, or anything
              else, send us a note.
            </p>
          </div>

          <div className="mt-[clamp(40px,6vw,72px)] grid gap-12 min-[1024px]:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] min-[1024px]:gap-20">
            <form
              onSubmit={onSubmit}
              className="border border-rule-strong bg-white p-5 min-[560px]:p-8"
            >
              {submitted ? (
                <div className="flex flex-col items-center justify-center py-10 text-center" role="status">
                  <CheckCircle2 className="h-7 w-7 text-ink" strokeWidth={1.5} aria-hidden="true" />
                  <h2 className={`${H3} mt-4`}>Almost there.</h2>
                  <p className="mt-2 max-w-sm leading-relaxed text-ink-soft">
                    Your email app should open with the message ready to send.
                    If nothing happened, write to{" "}
                    <a
                      href={`mailto:${CONTACT_INBOX}`}
                      className="font-semibold text-ink underline underline-offset-4"
                    >
                      {CONTACT_INBOX}
                    </a>{" "}
                    directly.
                  </p>
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="grid gap-5 min-[560px]:grid-cols-2">
                    <Field label="First name" htmlFor="firstName">
                      <Input id="firstName" name="firstName" required autoComplete="given-name" />
                    </Field>
                    <Field label="Last name" htmlFor="lastName">
                      <Input id="lastName" name="lastName" required autoComplete="family-name" />
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
                    <Input id="subject" name="subject" required />
                  </Field>

                  <Field label="Message" htmlFor="body">
                    <Textarea id="body" name="body" required rows={6} />
                  </Field>

                  <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                    <p className="text-sm text-ink-soft">
                      This opens your email app with the message filled in.
                    </p>
                    <Button type="submit" disabled={busy} className="max-[479px]:w-full">
                      {busy ? "Opening…" : "Send message"}
                    </Button>
                  </div>
                </div>
              )}
            </form>

            <aside className="grid content-start gap-8">
              <div className="grid gap-1.5 border-t border-rule-strong pt-5">
                <h2 className={LABEL}>Email</h2>
                <a
                  href={`mailto:${CONTACT_INBOX}`}
                  className="justify-self-start break-all font-semibold text-ink underline decoration-rule-strong underline-offset-4 hover:decoration-ink"
                >
                  {CONTACT_INBOX}
                </a>
              </div>
              <div className="grid gap-1.5 border-t border-rule-strong pt-5">
                <h2 className={LABEL}>Looking for equipment?</h2>
                <p className="text-ink-soft">
                  Tell our sourcing assistant what you need, in your own
                  language. An account manager picks it up from there.
                </p>
                <Link
                  href="/chat"
                  data-ph-capture-attribute-cta="contact"
                  className="mt-1 justify-self-start font-semibold text-ink underline decoration-rule-strong underline-offset-4 hover:decoration-ink"
                >
                  {CTA.start} →
                </Link>
              </div>
              <div className="grid gap-1.5 border-t border-rule-strong pt-5">
                <h2 className={LABEL}>Working hours</h2>
                <p className="text-ink-soft">09:00 to 18:00 China Standard Time (UTC+8)</p>
              </div>
            </aside>
          </div>
        </div>
      </section>
    </main>
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
