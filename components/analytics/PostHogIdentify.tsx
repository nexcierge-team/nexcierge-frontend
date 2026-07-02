"use client";

import { useEffect } from "react";
import posthog from "posthog-js";
import { getSupabaseBrowser } from "@/lib/supabase/browser";
import type { AuthChangeEvent, Session, User } from "@supabase/supabase-js";

// Ties browser-side PostHog (autocapture, pageviews) to the Supabase user
// id — the same id the backend uses as distinct_id on llm_call_completed
// and the route handlers use on funnel events, so all three surfaces
// resolve to one person in PostHog.
//
// Only PERMANENT users are identified; anonymous visitors stay anonymous
// (posthog-js's identified_only default means no person profile is created
// for them). Renders nothing.
export default function PostHogIdentify() {
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return;
    const supabase = getSupabaseBrowser();

    const identify = (user: User | null) => {
      if (user && !user.is_anonymous) {
        posthog.identify(user.id, { email: user.email });
      }
    };

    supabase.auth
      .getUser()
      .then(({ data }: { data: { user: User | null } }) =>
        identify(data.user),
      );
    const { data: sub } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, session: Session | null) => {
        if (event === "SIGNED_OUT") {
          posthog.reset();
        } else {
          identify(session?.user ?? null);
        }
      },
    );
    return () => sub.subscription.unsubscribe();
  }, []);

  return null;
}
