"use client";

// Client-side cache for chat bootstrap payloads (GET /api/chat/start), so
// switching conversations doesn't make the buyer wait on a fresh request
// every time:
//
//  - prefetch on hover: the sidebar warms `?session_id=` entries before
//    the click lands;
//  - stale-while-revalidate: a cached payload renders instantly on switch,
//    and useChat refetches in the background if it's older than FRESH_MS;
//  - priming: POST /api/chat/sessions (new conversation) returns the same
//    payload, which is stored here so the switch needs no /start at all.
//
// Only `?session_id=` URLs are ever prefetched. The bare and `?new=1`
// forms have side effects (they find-or-create a session), so they're
// fetched only when actually navigated to.

export interface BootstrapPayload {
  user: {
    id: string;
    email: string | null;
    full_name: string | null;
    is_anonymous: boolean;
  };
  session: {
    id: string;
    status: string;
    handoff_requested_at: string | null;
    title: string | null;
    language: string;
    sourcing_stage: string | null;
    sourcing_stage_history: Record<string, string>;
  };
  messages: unknown[];
  profile: unknown;
  profile_complete: boolean;
  review_requested: boolean;
  sessions: unknown[] | null;
}

interface Entry {
  promise: Promise<BootstrapPayload>;
  data: BootstrapPayload | null;
  at: number;
}

// A payload younger than this is used as-is; older ones render instantly
// and are revalidated.
export const FRESH_MS = 10_000;
// Evict entries older than this (nothing useful to show).
const MAX_AGE_MS = 5 * 60_000;
const MAX_ENTRIES = 20;

const cache = new Map<string, Entry>();

export function bootstrapUrlForSession(sessionId: string): string {
  return `/api/chat/start?session_id=${encodeURIComponent(sessionId)}`;
}

function evict() {
  const now = Date.now();
  for (const [k, v] of cache) {
    if (now - v.at > MAX_AGE_MS) cache.delete(k);
  }
  while (cache.size > MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest === undefined) break;
    cache.delete(oldest);
  }
}

async function fetchPayload(url: string): Promise<BootstrapPayload> {
  const res = await fetch(url, { method: "GET" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as BootstrapPayload;
}

/** Start (or join) a network fetch for `url` and cache it. */
export function fetchBootstrap(url: string): Promise<BootstrapPayload> {
  const entry: Entry = { promise: fetchPayload(url), data: null, at: Date.now() };
  entry.promise.then(
    (data) => {
      entry.data = data;
      entry.at = Date.now();
    },
    () => {
      // Don't keep failures around; the next caller retries.
      if (cache.get(url) === entry) cache.delete(url);
    },
  );
  cache.set(url, entry);
  evict();
  return entry.promise;
}

/**
 * Cached view of `url`, if any.
 *  - `data`: a resolved payload to render right now (possibly stale).
 *  - `inflight`: a pending fetch to join instead of starting another.
 *  - `fresh`: data is young enough to skip revalidation.
 */
export function peekBootstrap(url: string): {
  data: BootstrapPayload | null;
  inflight: Promise<BootstrapPayload> | null;
  fresh: boolean;
} {
  const e = cache.get(url);
  if (!e) return { data: null, inflight: null, fresh: false };
  if (e.data) {
    return { data: e.data, inflight: null, fresh: Date.now() - e.at < FRESH_MS };
  }
  return { data: null, inflight: e.promise, fresh: false };
}

/** Warm a session's payload (sidebar hover). No-op when fresh/in flight. */
export function prefetchSessionBootstrap(sessionId: string): void {
  const url = bootstrapUrlForSession(sessionId);
  const { data, inflight, fresh } = peekBootstrap(url);
  if (inflight || (data && fresh)) return;
  fetchBootstrap(url).catch(() => {});
}

/** Store a payload obtained elsewhere (POST /api/chat/sessions). */
export function primeBootstrap(sessionId: string, data: BootstrapPayload): void {
  const url = bootstrapUrlForSession(sessionId);
  cache.set(url, { promise: Promise.resolve(data), data, at: Date.now() });
  evict();
}

/** Drop a cached entry (e.g. after deleting a session). */
export function forgetBootstrap(sessionId: string): void {
  cache.delete(bootstrapUrlForSession(sessionId));
}
