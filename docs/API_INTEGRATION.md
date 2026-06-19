# API Integration

The frontend never calls the FastAPI backend directly from the browser. All requests go through Next.js Route Handlers under `/api/*`, which proxy server-side to `process.env.BACKEND_URL`.

## Why proxies

1. **No CORS** — the request is server-to-server from Vercel to Render, not browser-to-Render
2. **`BACKEND_URL` stays server-side** — never exposed to the client bundle, can be a private hostname later
3. **Single place to add cross-cutting concerns** — auth, rate limiting, logging
4. **Easier to migrate to streaming later** — wrap the proxy in an SSE response without touching the client component

## Endpoints

| Frontend route | Backend target | Purpose |
|---|---|---|
| `POST /api/chat` | `POST /chat` | Conversational turn — forwards `session.language` to FastAPI (the `'en'` default during the interview, so Gemini mirrors the buyer; a non-`en` code once pinned, so the prompt locks to it). Returns `reply_language` (the agent reply's language, from the pills pass) every turn; the client adopts it to localize chat chrome + the summary card. When the brief first completes, pins that same `reply_language` to `chat_sessions.language` — no separate detector call. |
| `POST /api/request-review` | `POST /sessions/{id}/request_review` | Buyer-initiated handoff to the local account manager |
| `POST /api/am/sessions/[id]/messages` | `POST /detect-language` + `POST /translate` (conditional) | AM reply — delivers the buyer their language whatever the AM typed. The first reply on an `'en'` session lazily detects the buyer's language from their thread and caches it. Non-`en` buyer: translate reply→target. `en` buyer: detect the reply's language and translate→English if it isn't already |
| `POST /api/am/sessions/[id]/translate` | `POST /translate` (per uncached message) | AM dashboard — render the thread in the AM's chosen working language (`zh`/`hi`), caching each result in `chat_messages.metadata.translations` so a string is translated at most once |

## Flow — chat turn

```
Browser
  │  POST /api/chat  {session_id, message}
  ▼
Next.js Route Handler  (app/api/chat/route.ts)
  │  fetch(`${BACKEND_URL}/chat`, ...)
  ▼
FastAPI Backend
  │  Gemini call + update_buyer_profile tool execution
  ▼
Returns {reply, profile, profile_complete, review_requested}
  │
  ▼
Route Handler returns same JSON to browser
```

## Flow — Request human review

```
Browser
  │  Buyer clicks Request human review CTA on ProfileSummaryCard
  │  POST /api/request-review  {session_id}
  ▼
Next.js Route Handler  (app/api/request-review/route.ts)
  │  fetch(`${BACKEND_URL}/sessions/{id}/request_review`, POST)
  ▼
FastAPI Backend
  │  Verifies profile_complete, flips state.review_requested=true
  │  Returns HANDOFF_REPLY (hard-coded — no LLM call)
  ▼
Returns {reply, profile, profile_complete: true, review_requested: true}
  │
  ▼
Client appends three messages in order (all localized into the buyer's
session language at insert time via `translateText`, English fallback):
  • the AI close ("Thank you! Your brief has been sent…")
  • a divider row labeled "Account manager"
  • a personalized welcome from the account manager
flips local reviewRequested=true (sticky), swaps the card CTA for a
"Transferring to our account manager…" badge, switches composer to
"Message your account manager…" mode. Subsequent user sends append
locally only (no /api/chat call).
```

## Environment

| Var | Where read | Default | Notes |
|---|---|---|---|
| `BACKEND_URL` | `app/api/*/route.ts` | `http://localhost:8000` | Server-side only. NOT prefixed `NEXT_PUBLIC_` so it's never in the client bundle. |

In Vercel deployment, set `BACKEND_URL` to the Render backend URL (e.g. `https://nexcierge-backend.onrender.com`).

## Request / response shapes

### `GET /api/chat/start`

Bootstraps the buyer's chat surface — anonymous Supabase sign-in if needed, then returns the active or requested `chat_sessions` row, its `rfqs` row, and full message history.

**Query params (all optional):**
- `session_id=<uuid>` — load a specific past session (must be owned by the caller).
- `new=1` — skip the active-session lookup and always create a fresh `chat_sessions` row. Used by `HeroChatPreview` and `FloatingChatButton` so every click from the marketing site lands on a blank chat. The `useChat({ forceNew: true })` option toggles this from the client.

`session_id` takes precedence over `new=1`.

### `POST /api/chat`

**Request:**
```json
{ "session_id": "<crypto.randomUUID()>", "message": "<trimmed user input>" }
```

The route handler reads `chat_sessions.language` for the given session and forwards it to FastAPI as the `language` field. The browser never has to send it.

**Response:** see `backend/docs/API.md` `POST /chat` — full `profile` dict always present, plus `profile_complete` and `review_requested` booleans. `reply` is in the buyer's language: Gemini mirrors whatever the buyer wrote, or follows the pinned `session.language` once it's been set. Per-turn quick-reply `suggestions` are included, plus `reply_language` (ISO 639-1) — the language of the agent's reply, classified by the pills pass — which `useChat` adopts as the buyer's **display language** to localize chat chrome (`lib/chatStrings.ts`) and the summary card from the first turn.

### Buyer-language: two signals

`POST /api/chat` runs **no separate detector**. A turn yields two language signals:

- **`reply_language`** — the agent reply's language, classified by the pills pass and returned every turn. The client adopts it as the buyer's **display language**, stabilized (only upgrades to a confident non-`en`, never flips back), so the UI localizes from the first exchange. Drives `chatStrings` + the summary card.
- **`chat_sessions.language`** — the persisted target for AM-side translation + the localized handoff messages. Pinned **lazily**, reusing `reply_language` (no extra call), at two points:
  1. **Brief-completion (primary).** The turn `is_complete` first flips true, `/api/chat` pins the turn's `reply_language` to `chat_sessions.language`. By then the client has localized the card/chrome via the per-turn `reply_language` already.
  2. **First AM reply (fallback).** See below — covers any session that reaches handoff still on `'en'`.

Driving everything off the agent reply's language (not the buyer's possibly-one-word opener) is what avoids the old failure mode where a `"hi"` opener pinned the session to `'en'` forever.

### AM-message translation (AM → buyer)

`POST /api/am/sessions/[id]/messages` is unchanged from the AM's perspective (`{ content }` in, `{ message }` out). AMs now work in Chinese/Hindi, so the reply may be in any language; server-side we always deliver the buyer **their** language.

**Resolve the buyer's language first.** If `session.language` is still the `'en'` default, `detectBuyerLanguage()` classifies it from the buyer's accumulated thread text (`listMessages` → concat the buyer's turns, capped at 2k chars) via `POST /detect-language`, and caches a non-`en` result to `chat_sessions.language` using the **service-role admin client**. A genuinely English buyer resolves to `'en'` and is re-checked cheaply on each send until a non-`en` signal appears. Then translate:
- **Non-`en` buyer**: `translateText(content, targetLanguage)` → FastAPI `POST /translate` (Flash-Lite). Gemini handles whatever source the AM typed.
- **`en` buyer**: `detectLanguage(content)`; if it isn't English, `translateText(content, 'en', sourceLanguage)` — the `sourceLanguage` arg makes English a real translation target (the backend/wrapper otherwise treat `'en'` as a no-op).

Either way the row stores `content` (original), `translated_content` (buyer's language), `translated_to` (the code). On translation failure: `translated_content=null`, buyer renders the original — degraded but not silent. On receipt the buyer client adopts `translated_to` as its in-memory session language (`useChat` `handleInsert`) so `MessageBubble` shows the localisation without a refresh.

### AM display-language translation (buyer/AI/AM → AM)

`POST /api/am/sessions/[id]/translate` body `{ language: "zh" | "hi" }` renders a brief's whole transcript in the AM's chosen working language. AM-gated (`requireAccountManager`) + rate-limited (`am-translate:user:<id>`, 60/min). For each message it returns a cached translation, translates an uncached one (Flash-Lite, bounded concurrency), or skips it when the source already equals the target (`user`/`ai` messages are in `session.language`). New translations are persisted to `chat_messages.metadata.translations[lang]` via the **service-role admin client** (RLS bars an AM from updating buyer/AI rows), so each `(message, language)` pair is translated **once, ever** — a reloaded thread costs zero Gemini calls.

Response: `{ language, translations: { [messageId]: string } }` (non-empty only). The dashboard treats any loaded message id absent from the map as "resolved, show original only" so it never re-asks. The selector (`Original only` / 中文 / हिन्दी) lives in the brief header; the choice is persisted in `localStorage` and applies across briefs. `MessageBubble` (AM viewer) shows the original as primary and the translation as a muted line below.

### `POST /api/request-review`

**Request:**
```json
{ "session_id": "<the live session id>" }
```

**Response:** see `backend/docs/API.md` `POST /sessions/{id}/request_review`. The client uses `reply` (agent's handoff acknowledgment) and `review_requested: true`.

**Error mapping:**
- `404` (session not found) — shouldn't happen in normal use; client surfaces a generic error message
- `409` (profile not complete) — shouldn't happen because the UI only exposes the button when `profile_complete` is true; client surfaces a generic error message
- `502` (backend unreachable) — Route Handler catches and returns its own 502 JSON

## Error handling

- Backend unreachable → Route Handler catches, returns `{error: "...", status: 502}`
- Client displays an error reply bubble in chat (with Retry for chat turns; the Request human review handler just shows the error message and leaves the CTA enabled)

## Future: streaming

Gemini supports SSE token streaming. Migration plan:
1. Backend: switch `/chat` to a streaming response
2. Route handler: forward the stream (use `ReadableStream` or `TransformStream`)
3. Client: replace `fetch().then(res => res.json())` with `fetch().then(res => res.body.getReader())` and append tokens incrementally

Will substantially improve perceived latency for the first reply.

## How to apply when extending

- Adding a new backend endpoint that the browser needs → add a corresponding Route Handler under `app/api/`, document here
- Changing a request/response shape → update both this doc AND the backend's `schemas.py` AND `backend/docs/API.md`
- Adding auth → put the validation in the Route Handler so the client never sees the auth secret
- **Always update `docs/API_INTEGRATION.md` when changing the proxy logic, env vars, or response shape.**
