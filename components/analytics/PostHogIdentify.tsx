"use client";

import { useEffect, useRef } from "react";
import posthog from "posthog-js";
import { useAuthContext } from "@/components/auth/AuthProvider";

// Ties browser-side PostHog (autocapture, pageviews) to the Supabase user
// id: the same id the backend uses as distinct_id on llm_call_completed
// and the route handlers use on funnel events, so all three surfaces
// resolve to one person in PostHog.
//
// Only PERMANENT users are identified; anonymous visitors stay anonymous
// (posthog-js's identified_only default means no person profile is created
// for them). Reads the app-wide <AuthProvider> state, so it costs no Auth
// round trip of its own. Renders nothing.
export default function PostHogIdentify() {
  const { user, loading } = useAuthContext();
  // The permanent user we last identified. A transition from a permanent
  // user to none means sign-out: reset so the next visitor isn't merged.
  const identifiedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_POSTHOG_KEY || loading) return;
    if (user && !user.is_anonymous) {
      if (identifiedRef.current !== user.id) {
        posthog.identify(user.id, { email: user.email });
        identifiedRef.current = user.id;
      }
    } else if (!user && identifiedRef.current) {
      posthog.reset();
      identifiedRef.current = null;
    }
  }, [user, loading]);

  return null;
}
