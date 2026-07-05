"use client";

import { useEffect } from "react";
import posthog from "posthog-js";
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
    <html lang="en">
      <body className="min-h-screen bg-white text-gray-900 antialiased">
        <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
          <p className="text-sm font-medium text-[#0F2747]">
            Something went wrong
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">
            We hit an unexpected error
          </h1>
          <p className="mt-3 max-w-md text-gray-500">
            The issue has been logged and our team will take a look. You can try
            again — most errors are temporary.
          </p>
          <button
            onClick={() => reset()}
            className="mt-8 rounded-lg bg-[#0F2747] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#1D4ED8]"
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
