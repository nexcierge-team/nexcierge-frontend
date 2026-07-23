# Frontend Architecture

## Stack

| | |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript (strict mode) |
| Styling | Tailwind CSS v4 |
| UI primitives | shadcn-style components (Radix + CVA) |
| Animation | Framer Motion |
| Icons | lucide-react |
| Fonts | Inter via `next/font/google` |
| Auth + DB + Realtime | Supabase (`@supabase/ssr`, `@supabase/supabase-js`) |
| CRM | HubSpot via `@hubspot/api-client` |
| Analytics | PostHog Cloud US via `posthog-js`, initialised in `instrumentation-client.ts` |
| Backend (LLM) | FastAPI (stateless transformer over Gemini) |
| Deploy | Vercel (frontend), Render (backend) |

## Repository layout

```
app/
├── layout.tsx
├── globals.css
├── page.tsx                Landing
├── chat/page.tsx           Buyer chat — uses `useChat` hook
├── dashboard/page.tsx      Account-manager dashboard orchestrator (role-gated) — state, data
│                             fetching, realtime; renders components/dashboard/* views:
│                             Overview (stats + briefs table) / open brief / Lessons / Models
├── about/page.tsx
├── contact/page.tsx
├── auth/
│   └── callback/route.ts   Supabase OAuth + magic-link verify
└── api/
    ├── chat/
    │   ├── start/route.ts                       GET — bootstrap on mount (creates anon session if needed)
    │   ├── route.ts                             POST — persist user msg, call FastAPI, persist ai reply
    │   └── sessions/
    │       ├── route.ts                         GET (list; hides never-started sessions) + POST (new — reuses the user's never-started session if one exists)
    │       └── [id]/
    │           ├── route.ts                     DELETE — soft-delete a session
    │           └── mark-read/route.ts           POST — buyer-side read receipts
    ├── request-review/route.ts   POST — auth-gated handoff: HubSpot + DB + closing messages
    └── am/
        ├── inbox/route.ts                   GET — AM-only brief inbox
        └── sessions/[id]/
            ├── route.ts                     GET — load brief + transcript + RFQ
            ├── claim/route.ts               POST — claim unassigned brief
            └── messages/route.ts            POST — AM reply

components/
├── ui/                     shadcn-style primitives (Button, Input, Textarea, Accordion)
├── layout/                 Header / Footer for marketing
├── landing/                Marketing sections + HeroChatPreview (mock chat card — every chat entry point on the homepage navigates to `/chat?new=1`, category pills/cards adding `&seed=<prompt>`, so each entry lands on a blank slate; `?new=1` reuses the user's never-started session when one exists rather than minting a new row per visit; no embedded chat modal)
├── auth/
│   └── AuthModal.tsx       Google + magic-link, opens on 401 from /api/request-review
├── chat/
│   ├── ChatSidebar.tsx     Real session list from /api/chat/sessions, kept live via useRealtimeSessions
│   ├── ChatComposer.tsx
│   ├── MessageBubble.tsx   `viewerRole` flips alignment for AM view (and gives AI
│   │                         turns the dark "house" bubble there so they group with the
│   │                         AM, distinct from the buyer's white bubbles); `sessionLanguage`
│   │                         drives the buyer's translated/original dual render;
│   │                         `amDisplayLanguage` drives the AM's original/translated dual render
│   └── ProfileSummaryCard.tsx
└── dashboard/              AM dashboard UI modules (all state + data fetching stays in app/dashboard/page.tsx)
    ├── types.ts            InboxBrief / OpenBrief / ClaimStatus + rowToMessage
    ├── DashboardSidebar.tsx  Left nav rail: Overview / Lessons / Models + AccountMenu footer
    ├── GateScreen.tsx      401 / 403 / load-failure full-screen gates
    ├── OverviewPane.tsx    Landing view: greeting, search, stat cards, briefs table, attention strip
    ├── StatCard.tsx        Headline stat card (label + value + toned icon chip)
    ├── RfqTable.tsx        Incoming-briefs table — All/Mine/Unclaimed tabs + client-side search + 10-per-page pager
    ├── AttentionCards.tsx  Actionable "needs your attention" cards (unclaimed / lessons / mine)
    ├── BriefPane.tsx       Open brief: chat thread + composer + claim CTA + BriefSummary
    ├── BriefSummary.tsx    Brief-details sidebar (buyer / machine / delivery / specs / CRM / rating)
    ├── RatingSection.tsx   Lead-quality rating + Generate-lessons card
    ├── LanguageSelector.tsx  AM working-language dropdown
    ├── LessonsPane.tsx     Lessons review queue
    └── SettingsPane.tsx    Live Gemini model config

lib/
├── utils.ts
├── constants.ts            HANDOFF_REPLY, accountManagerWelcome, firstNameFromFull
├── rateLimit.ts            checkRateLimit / rateLimited429 / getClientIp — Postgres-backed fixed-window limiter
├── translate.ts            translateText() + detectLanguage() — thin wrappers over FastAPI /translate + /detect-language
├── useChat.ts              Hook: bootstraps from /api/chat/start, persists via POST /api/chat,
│                             subscribes to Supabase Realtime, opens AuthModal on 401 from handoff,
│                             auto-resumes handoff after OAuth round-trip via ?resume=handoff,
│                             exposes language (display language — adopted per-turn from the backend's reply_language, or an AM reply's translated_to)
├── supabase/
│   ├── env.ts              Validated env var accessors
│   ├── browser.ts          createBrowserClient (memoised per tab)
│   ├── server.ts           createServerClient for Route Handlers (cookie-aware)
│   ├── admin.ts            service-role client — bypasses RLS, server runtime only
│   ├── route.ts            getOrCreateUser / getUser helpers
│   ├── role.ts             getCurrentUserRole / requireAccountManager
│   └── types.ts            Hand-rolled DB types (replace with `supabase gen types`)
├── db/
│   ├── sessions.ts         findActive / create / get / list / tryClaimHandoff / revertHandoff
│   ├── messages.ts         list / insert / insertMany
│   └── rfqs.ts             get / create / update / mark submitted +
│                             rfqRowToProfile / profileToRfqUpdate converters +
│                             getLatestBuyerIdentity (returning-buyer prefill)
└── hubspot/
    ├── client.ts           getHubspotClient + hubspotEnabled feature flag
    └── sync.ts             syncBriefToHubspot (upsert contact → create deal → associate)
                            + advanceDealStage(dealId, stageId) for pipeline transitions

supabase/
├── migrations/             0001..0008 — users + chat tables + rfqs + RLS + cleanup + read_at + language/translation + rate_limits
└── README.md               Step-by-step setup the human operator does once

types/
└── chat.ts                 Message / BuyerProfile / ChatRole / MessageFrom (UI types)

instrumentation-client.ts   PostHog bootstrap (Next.js convention — runs pre-hydration).
                            Autocapture + SPA pageviews on by default; init is skipped
                            entirely when NEXT_PUBLIC_POSTHOG_KEY is unset
```

## Analytics (PostHog)

> Full onboarding — event catalog, dashboard links, Postgres sample queries — lives in [`docs/TRACKING.md`](TRACKING.md). This section is the engineer's summary.

Three surfaces, one identity — everything keys on the Supabase `auth.users.id`:

- **Browser** — `instrumentation-client.ts` (autocapture + SPA pageviews + `capture_exceptions: true` → `$exception` on uncaught errors / unhandled rejections). `components/analytics/PostHogIdentify.tsx` (mounted in the root layout) calls `posthog.identify(user.id)` for **permanent** users only and `posthog.reset()` on sign-out; anonymous visitors stay anonymous.
- **Route handlers** — `lib/analytics.ts` `captureServer(distinctId, event, props)` (posthog-node, immediate flush, no-op without `NEXT_PUBLIC_POSTHOG_KEY`, never throws).
- **FastAPI backend** — `llm_call_completed` per Gemini call (see `backend/docs/ARCHITECTURE.md` § LLM telemetry).

Error tracking (all `$exception` events, one PostHog product):

- **Browser exceptions** — autocaptured via the init config above (uncaught errors + unhandled promise rejections).
- **React render errors** — `app/global-error.tsx` (root error boundary) calls `posthog.captureException(error)`; error boundaries swallow the throw before `window.onerror`, so this is the only way render crashes get captured.
- **Server errors** — `instrumentation.ts` `onRequestError` forwards every uncaught Route Handler / RSC / SSR error to `captureServerException()` in `lib/analytics.ts` (Node runtime only — posthog-node has no Edge build). distinct_id is read best-effort from the `ph_<key>_posthog` browser cookie so server errors tie to the browsing person.

Server-side events (funnel order):

| Event | Where | Notes |
|---|---|---|
| `chat_session_started` | `/api/chat/start`, `/api/chat/sessions` POST | `source`: bootstrap / homepage_new / sidebar_new; fires only when a row is actually inserted — reusing a never-started session doesn't re-fire |
| `signup_gate_shown` | `lib/useChat.ts` (**browser**) | anonymous buyer exhausted the free preview (`FREE_MESSAGE_LIMIT`) and the signup wall opened; `message_count`. The one browser-side custom capture — guarded on `NEXT_PUBLIC_POSTHOG_KEY` like `PostHogIdentify`, fires once per session |
| `profile_completed` | `/api/chat` | fires on the turn `rfqs.is_complete` flips false→true |
| `auth_completed` | `/auth/callback` | `method`: google_oauth / magic_link |
| `review_blocked` | `/api/request-review` | buyer clicked handoff but was blocked; `reason`: missing_fields (409) / auth_required (401) — the funnel drop-off `review_requested` can't show |
| `review_requested` | `/api/request-review` | **core conversion**; `language`, `hubspot_synced`, `machine_type`, `delivery_country` (category dims for conversion breakdowns) |
| `am_brief_claimed` | `/api/am/sessions/[id]/claim` | distinct_id = the AM |
| `am_reply_sent` | `/api/am/sessions/[id]/messages` | `translated`, `has_attachments` |
| `am_lead_rated` | `/api/am/sessions/[id]/rating` | AM's verdict on the AI interview; `lead_quality`, `field_issues` |
| `agent_lessons_proposed` | `/api/am/sessions/[id]/lessons` | one per Generate-lessons click; `lead_quality`, `lesson_count` |
| `agent_lesson_reviewed` | `/api/am/lessons/[id]` | `decision`: approve / reject; `edited` |
| `model_config_updated` | `/api/am/config` PUT | AM saves live model config; `interview_model`, `pills_model`, `translate_model`, `pills_thinking` |
| `hubspot_sync_failed` | `/api/request-review` | `fatal` = validation error (422 path) |
| `rate_limited` | `lib/rateLimit.ts` | any route; `key`, `scope` identify the wall |

PostHog is for product analytics/dashboards only; exact LLM cost/latency auditing lives in Postgres `llm_call_logs` (migration 0013).

**Autocapture PII guard.** Autocapture records clicked-element text, which can include buyer free-text. Every element rendering buyer-entered content carries `ph-no-capture` (PostHog ignores autocapture on it + its children): `MessageBubble`, `ProfileSummaryCard`, `BriefSummary`, `BriefPane`, `RfqTable` — placed so CTAs stay outside the tagged region and remain captured. `instrumentation-client.ts`'s `before_send` also strips URL query/hash (auth codes, tokens, session ids) from `$current_url`/`$referrer`. **New component rendering buyer content → add `ph-no-capture`** (see `docs/TRACKING.md` § Autocapture & PII).

## Auth flow — anonymous-first

```
Buyer hits /chat
   │
   ▼
useChat → GET /api/chat/start
            │
            ├─ getOrCreateUser():
            │     supabase.auth.getUser() → null
            │     ↓
            │     supabase.auth.signInAnonymously() → real auth.users row, is_anonymous=true
            │
            ├─ findActiveSession() → null
            │     ↓
            │     createSession() → new chat_sessions row owned by anon user
            │
            └─ createRfq() → new rfqs row, identity prefilled if any prior rfq for this user has a non-empty business_email (see "Returning-buyer identity reuse" below)
   │
   ▼
Returns: user, session, [], empty profile, profile_complete=false
   │
   ▼
[Buyer chats N turns — POST /api/chat each turn, persist + call FastAPI + persist + return]
   │
   ▼
profile.is_complete flips true AND pre-handoff follow-ups captured → ProfileSummaryCard attached → CTA appears
   │  (follow-ups = technical specs + facility power + compliance; `followupsPending()` in
   │   lib/useChat.ts mirrors the backend's `[PRE-HANDOFF FOLLOW-UPS]` injection, so the card
   │   lands on the agent's actual closing message, not mid-question. "Unsure" answers store
   │   sentinel values, so the card always arrives. Sessions with review_requested keep their
   │   card regardless. Safety valve: a reply with no question mark (ASCII/fullwidth/Arabic)
   │   counts as a close and attaches the card even with follow-ups pending — the model
   │   occasionally closes early, and a "brief is ready below" line pointing at nothing is a
   │   dead-end. Same check on the bootstrap path so reloads reproduce what the buyer saw.
   │   Pills render ABOVE the card in MessageBubble — they belong to the question.)
   │
   ▼
Buyer clicks Request human review → POST /api/request-review
   │
   ├─ user.is_anonymous → 401 { auth_required: true }
   │       │
   │       ▼
   │   useChat opens AuthModal
   │       │
   │       ├─ Continue with Google → supabase.auth.linkIdentity({ provider: 'google' })
   │       │       → OAuth redirect → /auth/callback → exchangeCodeForSession → /chat?resume=handoff
   │       │
   │       └─ Continue with email → supabase.auth.updateUser({ email })
   │               → confirmation email → user clicks → /auth/callback → verifyOtp → /chat?resume=handoff
   │       ↓
   │   In both cases: SAME auth.users.id, is_anonymous flips to false
   │       ↓
   │   useChat detects ?resume=handoff on next bootstrap → auto-fires requestReview()
   │
   ▼
POST /api/request-review (now non-anonymous):
   - Atomic claim: UPDATE chat_sessions SET status='in_handoff' WHERE id=$1 AND status='ai'
     (concurrent double-click / second tab loses the race → idempotent success, no second HubSpot deal)
   - HubSpot sync (idempotent on rfqs.hubspot_deal_id; on validation error revert claim → 422)
   - Insert AI close + divider + AM welcome (service-role client; each localized into session.language via translateText, English fallback)
   - Return inserted_messages
   ▼
Frontend appends → CTA replaced by "Transferring…" badge → composer mode switches to "Message your account manager…"
   ▼
Supabase Realtime channel pushes any subsequent AM reply (typed in /dashboard) into the buyer's chat
```

## Guest message limit (signup gate)

Anonymous buyers get a **free preview of `FREE_MESSAGE_LIMIT` (3) messages** before a signup wall blocks further chatting. This sits on top of the anonymous-first flow above — the buyer still starts instantly with no signup, but conversion to a permanent account is now forced mid-interview instead of only at handoff.

Owned entirely by `lib/useChat.ts` + `app/chat/page.tsx` (client-side; no new route, no schema change):

- `useChat` counts buyer turns (`messages` with `role === "user"` — AI replies don't count) and derives `signupRequired = isAnonymous && !reviewRequested && userMessageCount >= FREE_MESSAGE_LIMIT`. `isAnonymous` defaults to `true` until bootstrap resolves, so no free turns leak during load.
- When `signupRequired` first flips true **and the turn's reply has landed** (`!loading`), an effect auto-opens the gate once (ref-guarded so a dismissal doesn't reopen it every render) and fires `signup_gate_shown`.
- The gate is the **same `AuthModal`** as the handoff flow, with message-limit copy (`title` / `description` props) and `redirectTo` = the current session (no `resume=handoff`). Both auth paths preserve `auth.users.id`, so after sign-in `isAnonymous` flips false, `signupRequired` goes false, and the buyer keeps chatting in the same session with all history intact.
- The composer is **replaced** by a locked "sign in to keep chatting" bar (`cs.gateButton` / `cs.gateHint`, localized in `lib/chatStrings.ts`) whenever `signupRequired`, so the buyer can still read the conversation but cannot send. `sendMessage` (hook) and `send` (page) both hard-guard on `signupRequired` too, and suggestion pills are disabled — defense-in-depth against a stray Enter or pill click.

Tune the allowance via `FREE_MESSAGE_LIMIT` in `lib/useChat.ts`. Signed-in buyers are never gated.

## HubSpot pipeline auto-advancement

The Nexcierge Sourcing pipeline progresses through stages as real work happens, not on a sales rep's manual drag:

| Stage | App event | Code path |
|---|---|---|
| Human Review Requested | Buyer clicks Request human review | `syncBriefToHubspot()` in `/api/request-review` creates the deal in this stage (env: `HUBSPOT_DEALSTAGE_NEW`) |
| Assigned to Account Manager | AM claims an unassigned brief | `advanceDealStage()` in `/api/am/sessions/[id]/claim` PATCHes the deal (env: `HUBSPOT_DEALSTAGE_ASSIGNED_TO_AM`) |
| Supplier Contacted, Won, Lost | Off-platform | Manual moves in HubSpot — these events have no signal inside Nexcierge |

Auto-advance is **non-fatal** by contract: every call site swallows HubSpot errors and logs them, because a CRM glitch must never fail the underlying user action (a claim succeeding in Supabase but failing in HubSpot is a reconciliation problem, not a user-visible failure). The advancement is also gated on the stage-id env var being set, so the code can ship before HubSpot is configured and degrades to "no auto-advance" cleanly.

## Returning-buyer identity reuse

A buyer's `auth.users.id` is stable across sessions (cookie-bound for anonymous users, preserved through `linkIdentity` / `updateUser` on promotion), and `transferRfqsOwnership` keeps prior RFQs attached to that same id after sign-in. So once a buyer has filled name / company / email in any past RFQ, that identity is reachable on every later visit.

`createRfq` (`lib/db/rfqs.ts`) calls `getLatestBuyerIdentity(supabase, userId)` before inserting and spreads any returned `{full_name, company_name, business_email, phone_number, job_role}` over the empty defaults. The query takes the newest RFQ row owned by this user with a non-empty `business_email` — using `business_email` rather than `is_complete` because a buyer who reached the identity step but bailed before completing logistics is still a valid identity source. Request-specific fields (`machine_type`, delivery, timeline, etc.) are deliberately NOT carried over — every request is its own brief.

The backend recognises the returning-buyer case from existing signals: when `/chat` arrives with empty `history` and `buyer_info.business_email` non-empty, `_profile_state_note` appends a one-shot instruction telling Gemini to open with a brief acknowledgement of the prefilled identity and invite correction. No new request or DB field. If the buyer corrects an identity field mid-chat, `update_buyer_profile` overwrites the value in the current RFQ, and the next session's prefill reads the corrected value (newest-RFQ-wins ordering).

`public.users` is intentionally NOT used as the identity source. It already mirrors `auth.users.email` + `full_name` via the `handle_auth_user` trigger, but the broader fields (`company_name`, `business_email`, `phone_number`, `job_role`) live only on `rfqs`. Treating the newest RFQ as the identity record keeps the source of truth singular and avoids a sync layer; revisit if a separate profile-management surface ever lands.

## Output language (lazily detected)

There is no language picker — Gemini mirrors the buyer's language naturally. The buyer types in their language and the agent replies in kind. `chat_sessions.language` (ISO 639-1, default `'en'`) is tracked only so AM-side translation has a target; it is **not** read during the interview.

**The language comes from the pills pass, not a separate detector.** The pills second pass already reads each agent reply, so it also reports that reply's language as `reply_language` (returned every turn). The frontend adopts it as the buyer's **display language** — stabilized (only upgrades to a confident non-`en`, never flips back) — so chat chrome (`lib/chatStrings.ts`) and the summary card localize from the first exchange. The **persisted** `chat_sessions.language` (the AM-translation + handoff-message target) is pinned **lazily**, reusing that same `reply_language`, at two points: (1) **brief-completion** — `/api/chat` pins it the turn `is_complete` first flips true; (2) **first AM reply** (fallback) — `POST /api/am/sessions/[id]/messages` runs `detectBuyerLanguage()` and caches a non-`en` result (service-role admin client) for any session that reached handoff still on `'en'`. Keying off the agent reply's language (not the buyer's possibly-one-word opener) is what fixes the old "`hi` freezes the session to `en`" bug. A genuinely English buyer simply stays `'en'`.

**AI replies.** `/api/chat` forwards `session.language` to FastAPI on every turn. During the interview that's `'en'`, so the base prompt's "reply in the buyer's language and stay consistent" rule does the work. Once the language has been pinned (post-handoff), non-`en` makes the backend append an `# OUTPUT LANGUAGE (LOCKED FOR THIS SESSION)` directive on top of `SYSTEM_PROMPT` so a single English-flecked buyer message can't flip Gemini back to English.

**AM replies (AM → buyer).** AMs pick a working language on the dashboard and may type in any language, so `POST /api/am/sessions/[id]/messages` always delivers the buyer **their** language. After resolving the language (above), a single **forced** `translateText(content, targetLanguage, { force: true })` localises the reply for every buyer, English included — the backend echoes the text verbatim when it's already in the buyer's language, so we persist `translated_content`/`translated_to` only when the result differs. Dropping the old per-message `/detect-language` pass halves the round-trips (and latency) on the English-buyer path. Persists `content` (original) plus the translation when non-trivial. On failure the original still posts — silence is worse than imperfect localisation. The dashboard renders the AM's own bubble **optimistically** on send and reconciles with the persisted row when the POST returns, so the AM never blocks on the buyer's translation.

**Buyer rendering.** `MessageBubble` honours `translated_content` when `translated_to === sessionLanguage`. Because the language is detected lazily, the buyer client may still be on `'en'` when the first AM reply lands — so `useChat`'s `handleInsert` adopts the incoming message's `translated_to` as the in-memory session language, which makes the gate pass and the localisation render without a refresh. Translation is primary, original is the muted "Original" block under a hairline divider, giving the buyer a way to sanity-check without a click. (English buyers likewise see an English translation of a foreign-language AM reply with the original below.)

**AM attachments (AM → buyer).** AMs can attach documents and media to a reply; buyers stay text-only but receive and view them. The AM's browser uploads each file straight to the private `chat-attachments` Storage bucket (`lib/storage/attachments.ts`), so big files never hit the serverless body limit, then `POST /api/am/sessions/[id]/messages` carries only `attachments: [{ path, name, size, type, kind }]` (alongside an optional caption, which is translated like any reply). The route re-validates each `path` against the open session before persisting to `metadata.attachments`. Reads use short-lived **signed URLs** minted in the browser; Storage RLS (migration `0010`) gates upload to the assigned AM and read to session members. `MessageAttachments` renders images inline as thumbnails and everything else as download cards, in both the buyer chat and the AM view. Shared limits/validation live in `lib/attachments.ts`; the composer's paperclip + file chips are opt-in props on `ChatComposer` (off for the buyer). See API_INTEGRATION.md.

**Static-string i18n (`lib/cardStrings.ts`, `lib/chatStrings.ts`).** The buyer-facing UI with hard-coded copy — the summary card (`ProfileSummaryCard`: section titles, field labels, enum value labels, footer) and the chat chrome (composer placeholders, the keyboard hint, error bubbles, aria-labels) — is localized via static dictionaries in all 11 supported languages (zero runtime cost, no flash-of-English), keyed off the buyer's **display language** (the per-turn `reply_language`). The card sets `dir="rtl"` for RTL languages; the composer uses `dir="auto"`. Deliberately **not** localized: the technical-spec *keys* on the card (e.g. "Clamping Force"), which come from Gemini-stored `data_point` names and stay English on every view (buyer and AM) — there's an unbounded, per-machine-type set of these, so translating them would mean an uncached Gemini call per unique key. Technical-spec *values* and `additional_notes`, by contrast, are **not** locked to English — the backend writes them in the buyer's own conversation language (see backend `docs/PROMPTS.md` → "Output language"), so the card is a mix of localized chrome + English spec keys + buyer-language values throughout. The handoff close + AM welcome are localized separately, at insert time, via `translateText` (see API_INTEGRATION.md).

**AM display language (buyer/AI/AM → AM).** Separately, the AM dashboard lets the AM read a brief's **chat thread** in a chosen working language (`en`/`zh`/`hi`, or "Original only"; the set lives in `lib/amLanguages.ts`). `POST /api/am/sessions/[id]/translate` translates each message into that language on demand and caches the result in `chat_messages.metadata.translations[lang]` (admin client; never re-translated). `MessageBubble` in the AM view shows the original as primary and the translation below — but only when there IS one: a message already in the working language (e.g. the AM's own `zh` reply while reading in `zh`) is echoed verbatim by the backend and skipped, so it renders with no redundant secondary line.

The **AM display language affects only the chat thread — the "Brief details" sidebar is not translated and reads in English regardless.** Its free-text `rfqs` values (`machine_type`, `intended_application`, `additional_notes`, each `technical_specifications` value) render exactly as the buyer submitted them, in the buyer's own conversation language — `BriefSummary` (`components/dashboard/BriefSummary.tsx`) reads them straight off the row. Sourcing brief content is shown as-is; a future "download brief in language X" export can translate on demand. (The old `translate-brief` route and the `rfqs.translations` cache column were removed — migration `0012` drops the column added in `0011`.) The brief's entire reading surface is **pinned to English** so it stays canonical against HubSpot/CRM records: field labels + the `timeline`/`condition` enum tables come from `cardStrings("en")`, section headings ("Buyer information", "RFQ details", "Created") are hardcoded English, and the AM-workflow chrome — the status pill in the panel header, the claim button, the CRM section (HubSpot copy, session id label), and the lead-rating / lesson-generation card ("AI interview quality") — comes from the English-only table in `lib/amBriefStrings.ts` (its former `zh`/`hi` dictionaries were removed when chrome localization was dropped). Specs render inline under RFQ details and are simply omitted when empty.

The selector sits in the brief header and persists in `localStorage`. Cost control: cache forever, skip when source == target (or the model echoes the input), Flash-Lite only, per-AM rate limit — see API_INTEGRATION.md.

**Backwards compatibility.** Pre-migration rows have `language='en'` (default), `translated_content=null`, and empty `metadata`. Everything degrades to "original only, no dual display" automatically.

## Rate limiting

Defence in depth against (a) anonymous-signup spam filling `auth.users` and (b) Gemini cost amplification.

**Layer 1 (Supabase dashboard).** Per-IP caps on `signInAnonymously` and signups are configured in Authentication → Rate Limits. Stops the worst case before traffic reaches our code. Operator-owned, no migration.

**Layer 2 (app code).** Fixed-window rate limiting backed by Supabase Postgres. Schema in migration `0008_rate_limits.sql`:
- `public.rate_limits(key text pk, count int, window_start timestamptz)` — one row per window-bucket
- `public.check_rate_limit(p_key, p_max, p_window_seconds) returns (allowed, remaining, reset_at)` — `security definer` UPSERT-and-increment in a single statement so two concurrent callers can't both see "under the limit"
- RLS on the table is closed; all access goes through the RPC

`lib/rateLimit.ts` wraps the RPC and exposes `checkRateLimit(key, config)`, `rateLimited429(result)`, and `getClientIp(req)`. Failure mode: **fails OPEN** on RPC error with a loud `console.error` — a broken rate-limit table should never wedge the app.

**Per-route caps (the policy):** all limits live in the `RATE_LIMITS` constant in `lib/rateLimit.ts` — change them there, not at call sites. Current values:

| Route | Key | `RATE_LIMITS` entry | Limit |
|---|---|---|---|
| `GET /api/chat/start` | IP | `chatStart` | 60 / hour |
| `POST /api/chat` | user_id | `chat` | 40 / min |
| `POST /api/request-review` | user_id | `requestReview` | 5 / hour |
| `POST /api/am/sessions/[id]/messages` | AM user_id | `amMessages` | 120 / min |
| `POST /api/am/sessions/[id]/translate` | AM user_id | `amTranslate` | 60 / min |
| `POST /api/am/sessions/[id]/lessons` | AM user_id | `amLessons` | 20 / hour |

`/api/chat/start` is the critical one — its check runs **before** `getOrCreateUser()` so we never create the anon `auth.users` row we're trying to prevent. All others run after auth resolution and key on the resolved user.

429 responses carry `Retry-After`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`. Body is `{ error: "rate_limited", message, retry_after_seconds }`. Frontend hooks should surface a generic "slow down" toast and back off, not retry immediately.

**Layer 3 (future, if Layers 1+2 prove insufficient).** Cloudflare Turnstile CAPTCHA on the anonymous-sign-in path. Not implemented.

## Realtime model

Two tables are published to `supabase_realtime`: `chat_messages` (per-session live chat) and `chat_sessions` (per-user live sidebar). RLS scopes each subscription naturally — buyers only receive events on rows they own; AMs receive events on sessions they're assigned to (or unclaimed handoffs).

**Per-session channel — `chat_messages`** (`lib/useRealtimeChat.ts`). Both buyer and AM clients subscribe filtered by `chat_session_id`. Inserts are broadcast and rendered (the payload carries the full row incl. `metadata`, so an AM message's `metadata.attachments` reaches the buyer live — no extra channel). Dedup is handled with a `seenIds` `Set`:
- POST responses add the returned message id to the set before the realtime event arrives.
- The realtime handler checks `seenIds.has(row.id)` and skips if already rendered.

**Per-user channel — `chat_sessions`** (`lib/useRealtimeSessions.ts`). The chat sidebar subscribes filtered by `user_id`. Never-started sessions (`title IS NULL` — the title is only set by the DB trigger on the first user message) are invisible to the sidebar: the cold GET filters them server-side (`listSessionsForUser`) and the INSERT handler skips them, so a blank chat doesn't appear in the list until the buyer actually sends something. That first message bumps the session's title via trigger, which arrives as an UPDATE — the UPDATE handler therefore **upserts** (adds the row if it wasn't in the list yet) as well as re-rendering title/subtitle live when status flips `ai → in_handoff → closed` or language changes. DELETE removes the row across every tab and falls back to `onDeleteActive` if the deleted session was active. The sidebar does one cold GET on mount; everything after is event-driven, no polling, no `refreshKey` plumbing.

**Never-started session reuse.** To stop abandoned blank chats piling up as duplicate rows, every "give me a blank chat" path (`GET /api/chat/start?new=1` from homepage entries, `POST /api/chat/sessions` from the sidebar `+`) first looks for the user's newest `status='ai'`, `title IS NULL` session (`findNeverStartedSession` in `lib/db/sessions.ts`) and reuses it; a fresh row is only inserted when none exists. A never-started session is guaranteed untouched — the rfq can only change via `/api/chat` turns, which require a user message, which would have set the title.

No polling. No SSE. Tab-visibility-aware reconnect is not yet wired (Step 7 polish).

## Stateless backend coupling

The FastAPI backend has no auth, no DB, no session store. The Next.js `/api/chat` Route Handler is the gatekeeper:
1. Auths via Supabase (`@supabase/ssr` cookie session).
2. Inserts the user message via the user-scoped Supabase client (RLS enforces ownership).
3. Loads history + rfq.
4. Calls FastAPI with `{history, profile, message}`.
5. Updates the rfq row from the returned `profile`.
6. Inserts the ai message via the service-role admin client (RLS would block `sender_type='ai'` from a normal client).

The user-scoped client (`getSupabaseServer()`) respects RLS. The admin client (`getSupabaseAdmin()`) bypasses it — use only for AI/system writes the buyer can't legitimately make themselves.

## Agent improvement loop (lead rating → lessons)

The interview agent is prompt-driven and stateless, so it only "learns" through curated prompt changes. The dashboard feeds that loop with ground-truth labels and machine-drafted candidates:

1. **Rate** — after claiming a handed-off brief, the AM rates the AI interview's output in the brief sidebar (`components/dashboard/RatingSection.tsx`): `lead_quality` (`qualified` / `partial` / `junk`), flagged-field checkboxes (enum slugs: `machine_type`, `specs`, `quantity`, `delivery`, `timeline`, `contact`), and an optional free-text note. `POST /api/am/sessions/[id]/rating` writes these onto the `rfqs` row (migration 0014). Only the assigned AM can rate (409 otherwise); re-rating overwrites. This label is deliberately distinct from `rfqs.status` (won/lost) — it judges the *interview*, not the deal.
2. **Generate** — the rated card unlocks **Generate lessons**. `POST /api/am/sessions/[id]/lessons` loads the AI-interview transcript (user + ai messages only), sends it with the rating to FastAPI `POST /draft-lessons` (`prompt_type: lesson_draft` — see `backend/docs/API.md`), and inserts the 0-3 returned drafts into `agent_lessons` as `proposed`. Rate-limited (20/h per AM); requires claim + rating (409 otherwise).
3. **Review** — the **Lessons** view (button in the inbox header → `LessonsPane`) lists proposed lessons with their rationale. The AM approves (optionally editing the text first), or rejects. `PATCH /api/am/lessons/[id]` records the decision + reviewer; `GET /api/am/lessons` feeds the list. `agent_lessons` is AM-only under RLS (`is_account_manager()`).
4. **Apply** — *manual, by design.* Nothing consumes approved lessons automatically: they are the curated input for the next `backend/app/prompts.py` change (each applied lesson should also gain a few-shot + a `test_scope.py` case per the testing policy). If/when runtime lesson injection is built, only `approved` rows may ever reach the prompt, and never in a way that can touch the critical constraints.

## How to apply when extending

- New page → place under `app/`. Server Component by default; `"use client"` only if it needs state/effects.
- New chat-affecting state → update `lib/useChat.ts` AND, if the AM dashboard needs the same data, mirror in `app/dashboard/page.tsx`.
- New profile field → update `types/chat.ts` BuyerProfile, `ProfileSummaryCard`, `components/dashboard/BriefSummary.tsx`, the backend (`_empty_profile` + tool + prompt), the `rfqs` migration, `lib/db/rfqs.ts` converters, and the HubSpot mapping in `lib/hubspot/sync.ts`.
- New AM-only route → put under `app/api/am/*`, gate with `requireAccountManager()` at the top of the handler.
- **New Route Handler → add tracking for it before it ships.** Every new endpoint must have its tracking decided: action endpoints (create / mutate / convert / buyer or AM step) get a `captureServer(...)` event + a row in the § Analytics table; pure-read endpoints are exempt from events but still covered by automatic `$exception` error capture (`instrumentation.ts`). No endpoint merges without either an event or a deliberate "pure read, no event" call.
- **New feature → decide its tracking before shipping** (see § Analytics). Add a PostHog event when the feature is (a) a buyer funnel step (creation / completion / conversion), (b) an AM productivity action, or (c) an operational failure worth alarming on. Pure reads and internal refactors don't get events. Server-side: `captureServer(userId, "event_name", props)`; browser-only interactions: `posthog.capture(...)`. Conventions: snake_case past-tense names (`review_requested`, not `RequestReview`), distinct_id = Supabase user id, props limited to ids + enums/booleans — never emails or free text. Then add a row to the event table in § Analytics; an undocumented event is a future mystery.
- **Always update `docs/ARCHITECTURE.md` when adding a route, changing the state machine, or changing the API integration pattern.**
- **Always update `docs/DESIGN_SYSTEM.md` when introducing new visual primitives.**

## Operator setup (out of the codebase)

See `frontend/supabase/README.md` for the one-time setup: create the Supabase project, run migrations, enable anonymous sign-ins, configure Google OAuth, configure SMTP for magic link, manually promote AM users via SQL, create HubSpot custom properties.
