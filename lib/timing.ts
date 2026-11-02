// Tiny per-request stage timer for Route Handlers.
//
// Two outputs, both free of buyer content (ids + numbers only):
//  - a `Server-Timing` header, visible per request in the browser's
//    DevTools Network tab (Timing pane), so "where did this request spend
//    its time" needs no log access;
//  - one structured log line (`timing.log(evt, extra)`) for Vercel logs,
//    used to compare before/after when tuning round trips.
//
// Usage:
//   const t = createTiming();
//   await doAuth();      t.mark("auth");
//   await doQueries();   t.mark("db");
//   return NextResponse.json(body, { headers: t.headers() });
//
// Each mark records the time since the previous mark, so the stages add up
// to the total. Never throws.

export interface Timing {
  mark(stage: string): void;
  /** Stage durations in ms, plus `total`. */
  stages(): Record<string, number>;
  /** `{ "Server-Timing": "auth;dur=12.3, db;dur=40.1, total;dur=52.4" }` */
  headers(): Record<string, string>;
  /** One JSON log line: { evt, ...extra, ...stages }. */
  log(evt: string, extra?: Record<string, string | number | boolean | null>): void;
}

export function createTiming(): Timing {
  const start = performance.now();
  let last = start;
  const stages: Array<[string, number]> = [];

  const snapshot = (): Record<string, number> => {
    const out: Record<string, number> = {};
    for (const [name, ms] of stages) {
      // Same stage name marked twice (e.g. a loop) accumulates.
      out[name] = Math.round(((out[name] ?? 0) + ms) * 10) / 10;
    }
    out.total = Math.round((performance.now() - start) * 10) / 10;
    return out;
  };

  return {
    mark(stage) {
      const now = performance.now();
      stages.push([stage, now - last]);
      last = now;
    },
    stages: snapshot,
    headers() {
      const s = snapshot();
      const value = Object.entries(s)
        .map(([name, ms]) => `${name.replace(/[^a-zA-Z0-9_-]/g, "_")};dur=${ms}`)
        .join(", ");
      return { "Server-Timing": value };
    },
    log(evt, extra) {
      try {
        console.log(JSON.stringify({ evt, ...extra, ...snapshot() }));
      } catch {
        // Logging must never break a request.
      }
    },
  };
}
