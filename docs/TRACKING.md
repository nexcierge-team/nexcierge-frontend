# Tracking — the complete guide

Onboarding doc for anyone (especially non-engineers) who wants to understand what Nexcierge tracks, where the data lives, and how to answer questions with it. No code knowledge required until the last section.

## The one-paragraph version

Every buyer action, every account-manager action, and every single Gemini (AI) call is tracked. The data lands in two places with different jobs: **PostHog** answers *"how is the product doing?"* (funnels, trends, dashboards — approximate, fast, visual) and **Postgres** answers *"what exactly happened and what did it cost?"* (exact per-call AI cost, tokens, errors — precise, queryable, joinable to our business data). Everything is keyed to the same user id, so a person's journey is traceable across all of it.

## What we track

### Product events (PostHog)

In buyer funnel order:

| Event | Fires when | Useful properties |
|---|---|---|
| `$pageview` / autocapture | any page load, click, form interaction (automatic) | url, browser, country |
| `chat_session_started` | a new chat session is created | `source`: `bootstrap` (first `/chat` visit), `homepage_new` (marketing modal), `sidebar_new` (returning user) |
| `profile_completed` | the AI interview fills the last required field of the sourcing brief | `session_id` |
| `auth_completed` | anonymous buyer signs in (Google or magic link) | `method`: `google_oauth` / `magic_link` |
| `review_blocked` | buyer clicks *Request human review* but is turned away | `reason`: `missing_fields` (brief incomplete) / `auth_required` (still anonymous) — the drop-off `review_requested` can't capture |
| `review_requested` | buyer clicks *Request human review* — **this is the conversion we get paid for** | `language`, `hubspot_synced`, `machine_type`, `delivery_country` |
| `am_brief_claimed` | an account manager claims a handed-off brief | `session_id` |
| `am_reply_sent` | an AM replies to a buyer | `translated`, `has_attachments` |
| `am_lead_rated` | an AM rates the AI interview's output on a claimed brief | `session_id`, `lead_quality` (`qualified`/`partial`/`junk`), `field_issues` |
| `agent_lessons_proposed` | an AM clicks *Generate lessons* on a rated brief (Gemini drafts improvement lessons) | `session_id`, `lead_quality`, `lesson_count` |
| `agent_lesson_reviewed` | an AM approves or rejects a proposed lesson in the Lessons view | `lesson_id`, `decision`, `edited` |
| `model_config_updated` | an AM saves new live model config in the dashboard Models pane | `interview_model`, `pills_model`, `translate_model`, `pills_thinking` |
| `llm_call_completed` | every Gemini API call the backend makes | `model`, `prompt_type`, `latency_ms`, `total_cost_usd`, `success` |
| `hubspot_sync_failed` | CRM sync fails during handoff | `fatal`, `error` |
| `rate_limited` | anyone hits a rate limit | `scope`, `key` |
| `$exception` | any uncaught error — browser, server, or backend (see § Errors) | `$exception_message`, `$exception_type`, plus our `path` / `route` / `source` context |

**Category breakdown:** `review_requested` carries `machine_type` and `delivery_country` — buyer-entered category strings (non-PII, low-cardinality). They're the exception to the "no free text" rule *on purpose*: they let you break down conversions by vertical and destination (Trend → `review_requested` → Breakdown by `machine_type`). Don't add free-text fields beyond these two.

**Identity:** anonymous buyers stay anonymous in PostHog. The moment they sign in, `posthog.identify()` ties their browsing history, server events, and AI calls to one person (the Supabase user id). AMs are identified the same way on the dashboard.

### LLM audit log (Postgres: `llm_call_logs`)

One row per Gemini call with the full detail PostHog doesn't get: exact input/output/**thinking** token counts, input/output/total cost in USD (computed from a pricing table at call time), latency, success/failure with the actual error code and message, and which conversation + user caused the call.

`prompt_type` values: `interview` (the main chat turn), `interview_retry` (blank-reply retry), `pills` (quick-reply suggestions), `detect_language`, `translate`, `lesson_draft` (AM-triggered improvement-lesson drafting from a rated transcript).

### Errors (PostHog `$exception`)

Every uncaught error becomes a `$exception` event, viewable under **[Error tracking](https://us.posthog.com/project/494483/error_tracking)** (auto-grouped by stack trace). Four capture points:

| Where it breaks | How it's captured |
|---|---|
| Browser JS (uncaught error / unhandled promise rejection) | Autocaptured — `capture_exceptions: true` in `instrumentation-client.ts` |
| React render crash | `app/global-error.tsx` reports it (`source: global-error`); error boundaries hide these from browser autocapture, so this is the only path |
| Next.js server code (Route Handler / RSC / SSR) | `instrumentation.ts` `onRequestError` → PostHog; props carry `path`, `method`, `route` |
| FastAPI backend (a real 500, not an intentional `HTTPException`) | `@app.exception_handler(Exception)` in `backend/app/main.py` → `analytics.capture_exception`; props carry `path`, `method` |

Gemini call failures are **not** here — those live in `llm_call_logs` (exact model/tokens/error_code) and the `llm_call_completed` event (`success=false`). `$exception` is for code crashes.

## Where to look — PostHog

Project: [us.posthog.com/project/494483](https://us.posthog.com/project/494483)

- **[Activity](https://us.posthog.com/project/494483/activity/explore)** — live stream of every event as it arrives. Click a row to see its properties. Start here to check "is tracking working?"
- **[Nexcierge MVP dashboard](https://us.posthog.com/project/494483/dashboard/1789100)** — the starter dashboard: Gemini latency by model, daily AI spend by prompt_type, calls vs failures, the buyer funnel, sessions per day.
- **[New insight](https://us.posthog.com/project/494483/insights/new)** — build your own chart, no code:
  - *Trend*: pick an event → change aggregation (count, average of a property, sum) → optional **Breakdown** by a property. Example: `llm_call_completed` → Property value (average) → `latency_ms` → breakdown by `model`.
  - *Funnel*: add events as ordered steps. Example: `chat_session_started` → `profile_completed` → `auth_completed` → `review_requested` = our conversion rate.
- Any insight can be saved and added to a dashboard with one click.

Gotcha: an event type only appears in pickers after it has fired at least once.

## Where to look — Postgres

The `llm_call_logs` table lives in our Supabase project (production) and each engineer's local DB (dev).

**Easiest (production data):** Supabase dashboard → our project → **SQL Editor** → paste a query below → Run. (Table Editor also works for casual browsing.)

**Engineers, local dev data:** `psql nexcierge` then paste a query, or one-shot: `psql nexcierge -c "<query>"`.

### Sample queries

**How much has AI cost us, total and this month?**
```sql
SELECT sum(total_cost_usd) AS all_time,
       sum(total_cost_usd) FILTER (WHERE created_at >= date_trunc('month', now())) AS this_month
FROM llm_call_logs;
```

**Cost, volume, and speed per model** (the model-comparison report):
```sql
SELECT model, prompt_type,
       count(*)                    AS calls,
       round(avg(latency_ms))      AS avg_ms,
       round(sum(total_cost_usd)::numeric, 4) AS total_usd
FROM llm_call_logs
WHERE success
GROUP BY model, prompt_type
ORDER BY total_usd DESC;
```

**Daily spend trend:**
```sql
SELECT created_at::date AS day, round(sum(total_cost_usd)::numeric, 4) AS usd, count(*) AS calls
FROM llm_call_logs
GROUP BY day ORDER BY day DESC LIMIT 30;
```

**What's failing and why?**
```sql
SELECT created_at, model, prompt_type, error_code, error_message
FROM llm_call_logs
WHERE NOT success
ORDER BY created_at DESC LIMIT 20;
```

**Cost per conversation** (production only — joins to real sessions):
```sql
SELECT conversation_id,
       count(*)                    AS ai_calls,
       round(sum(total_cost_usd)::numeric, 4) AS usd
FROM llm_call_logs
WHERE conversation_id IS NOT NULL
GROUP BY conversation_id
ORDER BY usd DESC LIMIT 20;
```

**Cost per qualified lead** (what does one `review_requested` cost us in AI spend? Production only):
```sql
SELECT round(avg(cost)::numeric, 4) AS avg_ai_cost_per_lead
FROM (
  SELECT l.conversation_id, sum(l.total_cost_usd) AS cost
  FROM llm_call_logs l
  JOIN chat_sessions s ON s.id = l.conversation_id
  WHERE s.status = 'in_handoff'
  GROUP BY l.conversation_id
) per_lead;
```

**Are thinking tokens eating our budget?** (relevant when testing Gemini 3 models):
```sql
SELECT model,
       sum(output_tokens)   AS visible_out,
       sum(thinking_tokens) AS thinking,
       round(100.0 * sum(thinking_tokens) / nullif(sum(output_tokens) + sum(thinking_tokens), 0)) AS thinking_pct
FROM llm_call_logs
WHERE success
GROUP BY model;
```

## Rules of thumb

- **Glance in PostHog, investigate in Postgres.** Dashboard says something changed; the table says exactly what, when, and why.
- PostHog numbers are directionally right; Postgres sums are exact. Billing/reconciliation questions → Postgres only.
- Events flow within seconds. If nothing arrives: check the env keys (see below), then the Activity stream.
- Preview/staging deploys currently write real events into the same PostHog project — small noise for now, filterable by URL if it matters.

## For engineers — plumbing map & conventions

| Piece | Where |
|---|---|
| Browser init + autocapture + exception autocapture | `frontend/instrumentation-client.ts` |
| Identify / reset on auth changes | `frontend/components/analytics/PostHogIdentify.tsx` |
| Server-side event capture | `captureServer()` in `frontend/lib/analytics.ts` |
| Server-side exception capture | `captureServerException()` in `frontend/lib/analytics.ts` |
| Next.js server error hook | `frontend/instrumentation.ts` (`onRequestError`) |
| React render error boundary | `frontend/app/global-error.tsx` |
| Backend event + exception capture | `backend/app/analytics.py` (`capture`, `capture_exception`); 500 handler in `backend/app/main.py` |
| Per-Gemini-call telemetry (both sinks) | `backend/app/llm_tracking.py` — every call site wraps in `track()` |
| Pricing table (USD per 1M tokens) | `_PRICING_PER_1M` in `llm_tracking.py` — **update when models change** |
| Table schema | `frontend/supabase/migrations/0013_llm_call_logs.sql` |
| Env keys | Frontend/Vercel: `NEXT_PUBLIC_POSTHOG_KEY` + `NEXT_PUBLIC_POSTHOG_HOST`. Backend/Render: `POSTHOG_API_KEY`, `POSTHOG_HOST`, `DATABASE_URL` (Supabase session pooler). Everything no-ops without its key. |

Conventions for new tracking (full policy: workspace `CLAUDE.md` § Analytics & Tracking Policy): snake_case past-tense event names; `distinct_id` = Supabase user id; properties are ids + enums/booleans only — never emails or free text; every new event gets a row in the table at the top of this file.

**Every new endpoint gets tracking.** Any new FastAPI route or Next.js Route Handler must have its tracking decided before it ships: action endpoints (create / mutate / convert / buyer or AM step) get a PostHog event + a table row; pure reads are event-exempt but still covered by automatic `$exception` error capture. No endpoint ships without either an event or a deliberate "pure read, no event" decision.
