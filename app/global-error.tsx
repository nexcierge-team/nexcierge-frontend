"use client";

import { useEffect } from "react";
import posthog from "posthog-js";
import { archivo } from "./fonts";
import "./globals.css";

// Root React error boundary. Next.js renders this in place of the whole
// app (it replaces the root layout, hence its own <html>/<body>) when a
// render error bubbles past every nested boundary. React error boundaries
// swallow the throw before it reaches window.onerror, so the browser
// exception autocapture never sees it — we report it here explicitly so
// render crashes reach PostHog like every other $exception.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_POSTHOG_KEY) {
      posthog.captureException(error, { source: "global-error" });
    }
  }, [error]);

  return (
    <html lang="en" className={archivo.variable}>
      <body className="min-h-screen bg-paper text-ink antialiased">
        <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
          <p className="type-data text-sm font-semibold text-ink-soft">
            Something went wrong
          </p>
          <h1 className="type-display mt-2 text-2xl font-extrabold">
            We hit an unexpected error
          </h1>
          <p className="mt-3 max-w-md text-ink-soft">
            The issue has been logged and our team will take a look. You can try
            again, as most errors are temporary.
          </p>
          <button
            onClick={() => reset()}
            className="mt-8 inline-flex h-11 items-center justify-center px-5 text-[15px] rounded-sm border-2 border-ink bg-paint font-bold leading-none text-ink type-title btn-wipe hover:text-paint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blueprint focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
