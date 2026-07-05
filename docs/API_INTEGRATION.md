# API Integration

The frontend never calls the FastAPI backend directly from the browser. All requests go through Next.js Route Handlers under `/api/*`, which proxy server-side to `process.env.BACKEND_URL`.

Every server-side call to the backend goes through `lib/backend.ts` (`BACKEND_URL` + `backendHeaders()`), which attaches an `x-internal-token: BACKEND_SHARED_SECRET` header. The backend rejects LLM calls without it (`401`), so the public Render URL can't be abused directly — set `BACKEND_SHARED_SECRET` to the same value on the frontend (Vercel) and backend (Render). Any **new** backend call must use `backendHeaders()` so it carries the token. See `backend/docs/API.md` § Internal auth.

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
| `POST /api/am/sessions/[id]/messages` | `POST /translate` (forced) [+ `POST /detect-language` on the first reply of an `'en'` session] | AM reply (`{ content?, attachments? }`) — delivers the buyer their language whatever the AM typed. The first reply on an `'en'` session lazily detects the buyer's language from their thread and caches it. Then **one forced** translation into the buyer's language (`force: true`); the backend echoes verbatim if the reply is already in it, so a no-op stores no translation — no per-message detect call. The dashboard renders the AM's bubble optimistically, so the AM never waits on this. Optional `attachments` (browser-uploaded to the `chat-attachments` bucket) are validated against the session and stored in `metadata.attachments` |
| `POST /api/am/sessions/[id]/translate` | `POST /translate` (per uncached message) | AM dashboard — render the thread in the AM's chosen working language (`en`/`zh`/`hi`), caching each result in `chat_messages.metadata.translations` so a string is translated at most once. A message already in that language (e.g. the AM's own `zh` reply while reading in `zh`) is echoed verbatim by the backend and skipped, so it shows no redundant translation line |
| `POST /api/am/sessions/[id]/rating` | — (Supabase only) | AM rates the AI interview's output on a claimed brief: `{ lead_quality, field_issues?, notes? }` → written to the `rfqs` row (migration 0014). 409 unless the caller is the assigned AM. See `docs/ARCHITECTURE.md` § Agent improvement loop |
| `POST /api/am/sessions/[id]/lessons` | `POST /draft-lessons` | Generate improvement lessons from a rated brief: loads the user/ai transcript + rating from Supabase, gets 0-3 drafts back, inserts them into `agent_lessons` as `proposed`. Requires claim + rating (409); rate-limited `am-lessons:user:<id>` 20/h |
| `GET /api/am/lessons`, `PATCH /api/am/lessons/[id]` | — (Supabase only) | Lessons review queue: list (optional `?status=`), then approve (optionally with edited `lesson_text`) or reject each proposed lesson |
| `GET /api/am/config`, `PUT /api/am/config` | — (Supabase only) | Live Gemini model config (the `app_settings` singleton row, migrations 0015/0016). GET returns `{ config: { interview_model, pills_model, translate_model, pills_thinking, updated_at, updated_by_name } }`; PUT validates each id against the `lib/models.ts` allowlist (and `pills_thinking` against off/low/medium/high) and saves. AM-gated. Powers the dashboard **Models** pane and emits `model_config_updated` |

## Flow — chat turn

```
Browser
  │  POST /api/chat  {session_id, message}
  ▼
Next.js Route Handler  (app/api/chat/route.ts)
  │  fetch(`${BACKEND_URL}/chat`, {session_id, user_id, message, history, profile, language})
  │  session_id/user_id are telemetry context only — they land in the
  │  backend's llm_call_logs rows + PostHog llm_call_completed events
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
{ "session_id": "<uuid>", "message": "<trimmed user input>", "client_message_id": "<crypto.randomUUID() per send>" }
```

The route handler reads `chat_sessions.language` for the given session and forwards it to FastAPI as the `language` field. The browser never has to send it.

**Response:** see `backend/docs/API.md` `POST /chat` — full `profile` dict always present, plus `profile_complete` and `review_requested` booleans. `reply` is in the buyer's language: Gemini mirrors whatever the buyer wrote, or follows the pinned `session.language` once it's been set. Per-turn quick-reply `suggestions` are included, plus `reply_language` (ISO 639-1) — the language of the agent's reply, classified by the pills pass — which `useChat` adopts as the buyer's **display language** to localize chat chrome (`lib/chatStrings.ts`) and the summary card from the first turn.

**Idempotency (`client_message_id`):** `useChat` generates a UUID per send and **reuses it on Retry**. The route inserts the user message with it; a unique index on `chat_messages (chat_session_id, client_message_id)` (migration `0018`) turns a duplicate delivery — timeout retry, flaky network, double submit — into a conflict instead of a second row + second Gemini turn. On conflict the route returns the original turn's result with `duplicate: true`:
- AI reply already persisted → full normal response shape (`reply`, `agent_message`, `profile`, stored `suggestions`; no `reply_language` — the client keeps its current display language).
- Original request still mid-Gemini → `ai_pending: true` with `agent_message: null`; the client renders a retryable error (`errTimeout`) so the buyer can re-poll with the same key.
- Session already `in_handoff` → the usual `ai_skipped: true` shape.

The field is optional; requests without it (older clients) are never deduped. Server-generated rows (`ai` / `account_manager` / `system`) leave the column null, so the partial unique index ignores them.

### Buyer-language: two signals

`POST /api/chat` runs **no separate detector**. A turn yields two language signals:

- **`reply_language`** — the agent reply's language, classified by the pills pass and returned every turn. The client adopts it as the buyer's **display language**, stabilized (only upgrades to a confident non-`en`, never flips back), so the UI localizes from the first exchange. Drives `chatStrings` + the summary card.
- **`chat_sessions.language`** — the persisted target for AM-side translation + the localized handoff messages. Pinned **lazily**, reusing `reply_language` (no extra call), at two points:
  1. **Brief-completion (primary).** The turn `is_complete` first flips true, `/api/chat` pins the turn's `reply_language` to `chat_sessions.language`. By then the client has localized the card/chrome via the per-turn `reply_language` already.
  2. **First AM reply (fallback).** See below — covers any session that reaches handoff still on `'en'`.

Driving everything off the agent reply's language (not the buyer's possibly-one-word opener) is what avoids the old failure mode where a `"hi"` opener pinned the session to `'en'` forever.

### AM-message translation (AM → buyer)

`POST /api/am/sessions/[id]/messages` takes `{ content?, attachments? }` in and `{ message }` out. AMs now work in Chinese/Hindi, so the reply may be in any language; server-side we always deliver the buyer **their** language. `content` may be empty when `attachments` are present (a caption-less file send); only a non-empty caption is translated.

**Resolve the buyer's language first.** If `session.language` is still the `'en'` default, `detectBuyerLanguage()` classifies it from the buyer's accumulated thread text (`listMessages` → concat the buyer's turns, capped at 2k chars) via `POST /detect-language`, and caches a non-`en` result to `chat_sessions.language` using the **service-role admin client**. A genuinely English buyer resolves to `'en'` and is re-checked cheaply on each send until a non-`en` signal appears.

**Then one forced translation into that language.** `translateText(content, targetLanguage, { force: true })` → FastAPI `POST /translate` (Flash-Lite) covers every buyer, English included. Gemini handles whatever source the AM typed and **echoes the reply verbatim when it's already in the target language**, so we store `translated_content`/`translated_to` only when the result differs from the original. This replaces the old detect-then-translate path — the per-message `detectLanguage(content)` call is gone, halving the round-trips (and the latency the AM waits on) for the English-buyer case. For an English buyer the same call translates a foreign reply into English, or echoes an already-English reply (which we skip). `detectLanguage` survives only inside `detectBuyerLanguage` above.

The row stores `content` (original), `translated_content` (buyer's language), `translated_to` (the code). On translation failure: `translated_content=null`, buyer renders the original — degraded but not silent. On receipt the buyer client adopts `translated_to` as its in-memory session language (`useChat` `handleInsert`) so `MessageBubble` shows the localisation without a refresh. **The dashboard renders the AM's own bubble optimistically** (`sendReply` appends it before the POST, then swaps in the persisted row on return; realtime skips own-inserts), so the AM sees their message immediately instead of waiting on the buyer's translation.

### AM attachments (AM → buyer)

AMs can attach documents and media to a reply (the buyer stays text-only). Files do **not** pass through our server — the AM's browser uploads each one straight to the private `chat-attachments` Storage bucket (`lib/storage/attachments.ts` → `uploadAttachment`), keyed `"<sessionId>/<uuid>-<filename>"`. Going browser-direct sidesteps the serverless request-body limit, so large PDFs/images work. The same `POST /api/am/sessions/[id]/messages` then carries only the lightweight metadata: `attachments: [{ path, name, size, type, kind }]`. The route re-validates each entry server-side (`validateAttachments`) — every `path` must live under **this** session's folder, size ≤ 25 MiB, ≤ 8 files — so a tampered client can't point a message at another session's objects, then stores the list in `chat_messages.metadata.attachments`. Limits + allowed extensions live in `lib/attachments.ts`; the bucket also enforces the size cap (migration `0010`).

Reads use **short-lived signed URLs** minted in the browser by whoever is viewing (`signAttachmentUrls`); Storage RLS restricts both upload (assigned AM) and read (session members) to the session folder, so a leaked message row can't be replayed for file access. `MessageAttachments` renders images inline as thumbnails and other files as download cards; it works in both the buyer chat and the AM dashboard since both run the Supabase browser client. Attachments ride the existing realtime `chat_messages` INSERT (the payload already carries `metadata`), so the buyer sees them live with no new channel.

### AM display-language translation (buyer/AI/AM → AM)

`POST /api/am/sessions/[id]/translate` body `{ language: "en" | "zh" | "hi" }` renders a brief's whole transcript in the AM's chosen working language (an `en` target is passed to `translateText` with `force: true`, since the helper otherwise short-circuits English targets). AM-gated (`requireAccountManager`) + rate-limited (`am-translate:user:<id>`, 60/min). For each message it returns a cached translation, translates an uncached one (Flash-Lite, bounded concurrency), or skips it when the source already equals the target. Two skip paths: `user`/`ai` messages known to be in `session.language`; and any message the backend echoes back **verbatim** because it's already in the target language — this is what stops an AM's own `zh` reply from showing a pointless "translation" into slightly different `zh` while the AM reads in `zh`. New translations are persisted to `chat_messages.metadata.translations[lang]` via the **service-role admin client** (RLS bars an AM from updating buyer/AI rows), so each `(message, language)` pair is translated **once, ever** — a reloaded thread costs zero Gemini calls.

Response: `{ language, translations: { [messageId]: string } }` (non-empty only). The dashboard treats any loaded message id absent from the map as "resolved, show original only" so it never re-asks. The selector (`Original only` / English / 中文 / हिन्दी) lives in the brief header; the choice is persisted in `localStorage` and applies across briefs. `MessageBubble` (AM viewer) shows the original as primary and the translation as a muted line below.

### AM brief sidebar — not translated (buyer → AM)

The "Brief details" sidebar's free-text `rfqs` values (`machine_type`, `intended_application`, `additional_notes`, each `technical_specifications` value) are **not** translated — `BriefSummary` (`app/dashboard/page.tsx`) renders them exactly as the buyer submitted them, in the buyer's own conversation language. Sourcing brief content is shown as-is; a future "download brief in language X" export can translate on demand. There is no `translate-brief` route and no `rfqs.translations` column (removed in migration `0012`).

The sidebar's **chrome** still follows the AM's working language: section titles + field labels + the `timeline`/`condition` enum tables come from `lib/cardStrings.ts` (so enums like `purchase_timeline` render a translated label with no Gemini call), and the AM-only strings (the "Brief details" title, "CRM" section, status pill labels, HubSpot copy) come from `lib/amBriefStrings.ts` (`en`/`zh`/`hi`). The CRM section also shows the session UUID as a click-to-copy row — the join key for `chat_sessions`/`chat_messages`/`rfqs` when an AM (or operator) needs to run SQL against a specific thread. The AM's language selector (above) affects only the chat thread translation + this static chrome.

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

### Live model config injection

The Gemini models are set from the dashboard **Models** pane, not hard-coded and no longer only Render env vars. `lib/modelConfig.ts` `getModelConfig()` reads the `app_settings` singleton row (service-role client, short in-memory TTL cache, never throws → returns nulls on failure). Every server-side call that reaches the backend injects the relevant model, and the backend falls back to its env default for any null field:

- `/api/chat` → `model` (interview) + `pills_model` + `pills_thinking` (semantic off/low/medium/high reasoning level for the pills pass) on the `/chat` body
- `lib/translate.ts` (`translateText` / `detectLanguage`, used by the AM message-send + display-language routes) → `model` on `/translate` and `/detect-language`
- `/api/am/sessions/[id]/lessons` → `model` (interview) on `/draft-lessons`

The model actually used is what the backend logs to `llm_call_logs` + PostHog, so a model change is immediately comparable in analytics. This is a **global live** control (all buyer chats), because buyers chat anonymously before any AM is assigned — there is no per-tester scoping. The allowlist of selectable ids is `lib/models.ts` (shared by the dropdown and the PUT validation).

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
