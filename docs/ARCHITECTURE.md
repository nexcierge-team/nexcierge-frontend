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
| Backend (LLM) | FastAPI (stateless transformer over Gemini) |
| Deploy | Vercel (frontend), Render (backend) |

## Repository layout

```
app/
├── layout.tsx
├── globals.css
├── page.tsx                Landing
├── chat/page.tsx           Buyer chat — uses `useChat` hook
├── dashboard/page.tsx      Account-manager inbox + reply UI (role-gated)
├── about/page.tsx
├── contact/page.tsx
├── auth/
│   └── callback/route.ts   Supabase OAuth + magic-link verify
└── api/
    ├── chat/
    │   ├── start/route.ts                       GET — bootstrap on mount (creates anon session if needed)
    │   ├── route.ts                             POST — persist user msg, call FastAPI, persist ai reply
    │   └── sessions/
    │       ├── route.ts                         GET (list) + POST (create new)
    │       └── [id]/
    │           └── language/route.ts            PATCH — buyer-selected output language
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
├── landing/                Marketing sections + HeroChatModal + FloatingChatButton (uses `useChat({ forceNew: true })` so every entry from the homepage starts on a blank slate)
├── auth/
│   └── AuthModal.tsx       Google + magic-link, opens on 401 from /api/request-review
├── chat/
│   ├── ChatSidebar.tsx     Real session list from /api/chat/sessions, kept live via useRealtimeSessions
│   ├── ChatComposer.tsx
│   ├── LanguagePicker.tsx  Header dropdown — buyer's output-language selector
│   ├── MessageBubble.tsx   `viewerRole` prop flips alignment for AM view;
│   │                         `sessionLanguage` prop drives translated/original dual render for AM bubbles
│   └── ProfileSummaryCard.tsx
└── dashboard/              (legacy mock components — kept for reference, not used by /dashboard)

lib/
├── utils.ts
├── constants.ts            HANDOFF_REPLY, accountManagerWelcome, firstNameFromFull
├── languages.ts            SUPPORTED_LANGUAGES + isSupportedLanguage (mirror of backend/app/languages.py)
├── rateLimit.ts            checkRateLimit / rateLimited429 / getClientIp — Postgres-backed fixed-window limiter
├── translate.ts            translateText() — thin wrapper over FastAPI /translate
├── useChat.ts              Hook: bootstraps from /api/chat/start, persists via POST /api/chat,
│                             subscribes to Supabase Realtime, opens AuthModal on 401 from handoff,
│                             auto-resumes handoff after OAuth round-trip via ?resume=handoff,
│                             exposes language + setLanguage (PATCHes /api/chat/sessions/[id]/language)
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
│                             rfqRowToProfile / profileToRfqUpdate converters
└── hubspot/
    ├── client.ts           getHubspotClient + hubspotEnabled feature flag
    └── sync.ts             syncBriefToHubspot (upsert contact → create deal → associate)
                            + advanceDealStage(dealId, stageId) for pipeline transitions

supabase/
├── migrations/             0001..0008 — users + chat tables + rfqs + RLS + cleanup + read_at + language/translation + rate_limits
└── README.md               Step-by-step setup the human operator does once

types/
├── chat.ts                 Message / BuyerProfile / ChatRole / MessageFrom (UI types)
└── dashboard.ts            (legacy mock types)
```

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
            └─ createRfq() → empty rfqs row
   │
   ▼
Returns: user, session, [], empty profile, profile_complete=false
   │
   ▼
[Buyer chats N turns — POST /api/chat each turn, persist + call FastAPI + persist + return]
   │
   ▼
profile.is_complete flips true → ProfileSummaryCard attached → CTA appears
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
   - Insert AI close + divider + AM welcome (service-role client)
   - Return inserted_messages
   ▼
Frontend appends → CTA replaced by "Transferring…" badge → composer mode switches to "Message your account manager…"
   ▼
Supabase Realtime channel pushes any subsequent AM reply (typed in /dashboard) into the buyer's chat
```

## HubSpot pipeline auto-advancement

The Nexcierge Sourcing pipeline progresses through stages as real work happens, not on a sales rep's manual drag:

| Stage | App event | Code path |
|---|---|---|
| Human Review Requested | Buyer clicks Request human review | `syncBriefToHubspot()` in `/api/request-review` creates the deal in this stage (env: `HUBSPOT_DEALSTAGE_NEW`) |
| Assigned to Account Manager | AM claims an unassigned brief | `advanceDealStage()` in `/api/am/sessions/[id]/claim` PATCHes the deal (env: `HUBSPOT_DEALSTAGE_ASSIGNED_TO_AM`) |
| Supplier Contacted, Won, Lost | Off-platform | Manual moves in HubSpot — these events have no signal inside Nexcierge |

Auto-advance is **non-fatal** by contract: every call site swallows HubSpot errors and logs them, because a CRM glitch must never fail the underlying user action (a claim succeeding in Supabase but failing in HubSpot is a reconciliation problem, not a user-visible failure). The advancement is also gated on the stage-id env var being set, so the code can ship before HubSpot is configured and degrades to "no auto-advance" cleanly.

## Buyer-selected output language

Buyers pick their output language from a dropdown in the chat header (mounted on both `/chat` and the `HeroChatModal` on `/`). The choice persists on `chat_sessions.language` (ISO 639-1, default `'en'`) via `PATCH /api/chat/sessions/[id]/language`.

**AI replies.** Every `/api/chat` POST forwards `session.language` to FastAPI. When non-`en`, the backend appends an `# OUTPUT LANGUAGE (HARD OVERRIDE)` directive on top of `SYSTEM_PROMPT` so Gemini responds in the target language regardless of what the buyer types. Zero extra calls — language is baked into the same turn.

**AM replies.** AMs always type in English. `POST /api/am/sessions/[id]/messages` reads `session.language`; when non-`en`, it calls FastAPI `/translate` (Flash-Lite, ~1s) and persists both the English `content` and the localised `translated_content` together with `translated_to` (the language code we translated to). On translation failure the AM message still posts in English — silence is worse than imperfect localisation.

**Buyer rendering.** `MessageBubble` only honours `translated_content` when `translated_to === sessionLanguage` (so a mid-session language switch doesn't show stale translations). It renders the translation as the primary text and the English original below as a small muted "Original" block separated by a hairline divider — this gives the buyer a way to sanity-check the translation without a click. No re-translation of past AM messages on language change.

**Backwards compatibility.** Pre-migration rows have `language='en'` (default) and `translated_content=null`. Everything degrades to "English only, no dual display" automatically.

## Rate limiting

Defence in depth against (a) anonymous-signup spam filling `auth.users` and (b) Gemini cost amplification.

**Layer 1 (Supabase dashboard).** Per-IP caps on `signInAnonymously` and signups are configured in Authentication → Rate Limits. Stops the worst case before traffic reaches our code. Operator-owned, no migration.

**Layer 2 (app code).** Fixed-window rate limiting backed by Supabase Postgres. Schema in migration `0008_rate_limits.sql`:
- `public.rate_limits(key text pk, count int, window_start timestamptz)` — one row per window-bucket
- `public.check_rate_limit(p_key, p_max, p_window_seconds) returns (allowed, remaining, reset_at)` — `security definer` UPSERT-and-increment in a single statement so two concurrent callers can't both see "under the limit"
- RLS on the table is closed; all access goes through the RPC

`lib/rateLimit.ts` wraps the RPC and exposes `checkRateLimit(key, max, windowSeconds)`, `rateLimited429(result)`, and `getClientIp(req)`. Failure mode: **fails OPEN** on RPC error with a loud `console.error` — a broken rate-limit table should never wedge the app.

**Per-route caps (the policy):**

| Route | Key | Limit |
|---|---|---|
| `GET /api/chat/start` | IP | 60 / hour |
| `POST /api/chat` | user_id | 40 / min |
| `POST /api/request-review` | user_id | 5 / hour |
| `POST /api/am/sessions/[id]/messages` | AM user_id | 120 / min |
| `PATCH /api/chat/sessions/[id]/language` | session_id | 20 / min |

`/api/chat/start` is the critical one — its check runs **before** `getOrCreateUser()` so we never create the anon `auth.users` row we're trying to prevent. All others run after auth resolution and key on the resolved user.

429 responses carry `Retry-After`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`. Body is `{ error: "rate_limited", message, retry_after_seconds }`. Frontend hooks should surface a generic "slow down" toast and back off, not retry immediately.

**Layer 3 (future, if Layers 1+2 prove insufficient).** Cloudflare Turnstile CAPTCHA on the anonymous-sign-in path. Not implemented.

## Realtime model

Two tables are published to `supabase_realtime`: `chat_messages` (per-session live chat) and `chat_sessions` (per-user live sidebar). RLS scopes each subscription naturally — buyers only receive events on rows they own; AMs receive events on sessions they're assigned to (or unclaimed handoffs).

**Per-session channel — `chat_messages`** (`lib/useRealtimeChat.ts`). Both buyer and AM clients subscribe filtered by `chat_session_id`. Inserts are broadcast and rendered. Dedup is handled with a `seenIds` `Set`:
- POST responses add the returned message id to the set before the realtime event arrives.
- The realtime handler checks `seenIds.has(row.id)` and skips if already rendered.

**Per-user channel — `chat_sessions`** (`lib/useRealtimeSessions.ts`). The chat sidebar subscribes filtered by `user_id`. INSERT lights up new conversations the moment they're created (sidebar `+` button, homepage seed flow, or any other tab). UPDATE re-renders the row's title and subtitle live when the AI generates a title, when status flips `ai → in_handoff → closed`, or when language changes. DELETE removes the row across every tab and falls back to `onDeleteActive` if the deleted session was active. The sidebar does one cold GET on mount; everything after is event-driven, no polling, no `refreshKey` plumbing.

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

## How to apply when extending

- New page → place under `app/`. Server Component by default; `"use client"` only if it needs state/effects.
- New chat-affecting state → update `lib/useChat.ts` AND, if the AM dashboard needs the same data, mirror in `app/dashboard/page.tsx`.
- New profile field → update `types/chat.ts` BuyerProfile, `ProfileSummaryCard`, `app/dashboard/page.tsx` BriefSummary, the backend (`_empty_profile` + tool + prompt), the `rfqs` migration, `lib/db/rfqs.ts` converters, and the HubSpot mapping in `lib/hubspot/sync.ts`.
- New AM-only route → put under `app/api/am/*`, gate with `requireAccountManager()` at the top of the handler.
- **Always update `docs/ARCHITECTURE.md` when adding a route, changing the state machine, or changing the API integration pattern.**
- **Always update `docs/DESIGN_SYSTEM.md` when introducing new visual primitives.**

## Operator setup (out of the codebase)

See `frontend/supabase/README.md` for the one-time setup: create the Supabase project, run migrations, enable anonymous sign-ins, configure Google OAuth, configure SMTP for magic link, manually promote AM users via SQL, create HubSpot custom properties.
