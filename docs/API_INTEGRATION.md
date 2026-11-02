# API Integration

The frontend never calls the FastAPI backend directly from the browser. All requests go through Next.js Route Handlers under `/api/*`, which proxy server-side to `process.env.BACKEND_URL`.

Every server-side call to the backend goes through `lib/backend.ts` (`BACKEND_URL` + `backendHeaders()`), which attaches an `x-internal-token: BACKEND_SHARED_SECRET` header. The backend rejects LLM calls without it (`401`), so the public Render URL can't be abused directly — set `BACKEND_SHARED_SECRET` to the same value on the frontend (Vercel) and backend (Render). Any **new** backend call must use `backendHeaders()` so it carries the token. See `backend/docs/API.md` § Internal auth.

## Why proxies

1. **No CORS** — the request is server-to-server from Vercel to Render, not browser-to-Render
2. **`BACKEND_URL` stays server-side** — never exposed to the client bundle, can be a private hostname later
3. **Single place to add cross-cutting concerns** — auth, rate limiting, logging
4. **Streaming without exposing the backend** — `/api/chat` relays FastAPI's NDJSON stream to the browser while persisting the turn server-side (see § Flow — chat turn)

## Endpoints

| Frontend route | Backend target | Purpose |
|---|---|---|
| `POST /api/chat` | `POST /chat/stream` (falls back to `POST /chat` on a backend without it) | Conversational turn, streamed to the browser as NDJSON when it sends `Accept: application/x-ndjson` (else one JSON body). Forwards `session.language` to FastAPI (the `'en'` default during the interview, so Gemini mirrors the buyer; a non-`en` code once pinned, so the prompt locks to it). Returns `reply_language` (the agent reply's language, from the pills pass) every turn; the client adopts it to localize chat chrome + the summary card. When the brief first completes, pins that same `reply_language` to `chat_sessions.language` — no separate detector call. |
| `POST /api/request-review` | `POST /translate` only (3 parallel calls, non-`en` buyers); the handoff itself is Supabase + HubSpot | Buyer-initiated handoff to the local account manager: guards, atomic claim, HubSpot sync, three localized closing messages. There is no backend handoff endpoint |
| `POST /api/am/sessions/[id]/messages` | `POST /translate` (forced) [+ `POST /detect-language` on the first reply of an `'en'` session] | AM reply (`{ content?, attachments? }`) — delivers the buyer their language whatever the AM typed. The first reply on a session whose language was never resolved (`chat_sessions.language_resolved_at` null, migration 0023; sessions handed off since then are resolved at brief completion) lazily detects the buyer's language from their thread, caches it, and stamps the session so it never detects again. Then **one forced** translation into the buyer's language (`force: true`); the backend echoes verbatim if the reply is already in it, so a no-op stores no translation — no per-message detect call. The dashboard renders the AM's bubble optimistically, so the AM never waits on this. Optional `attachments` (browser-uploaded to the `chat-attachments` bucket) are validated against the session and stored in `metadata.attachments` |
| `POST /api/am/sessions/[id]/translate` | `POST /translate` (per uncached message) | AM dashboard — render the thread in the AM's chosen working language (`en`/`zh`/`hi`), caching each result in `chat_messages.metadata.translations` so a string is translated at most once. A message already in that language (e.g. the AM's own `zh` reply while reading in `zh`) is echoed verbatim by the backend and skipped, so it shows no redundant translation line |
| `POST /api/am/sessions/[id]/rating` | — (Supabase only) | AM rates the AI interview's output on a claimed brief: `{ lead_quality, field_issues?, notes? }` → written to the `rfqs` row (migration 0014). 409 unless the caller is the assigned AM. See `docs/ARCHITECTURE.md` § Agent improvement loop |
| `POST /api/am/sessions/[id]/stage` | — (Supabase only [+ HubSpot]) | AM manually sets the buyer-visible sourcing stage on a claimed brief: `{ stage }` (slug from `lib/sourcingStages.ts`) → `chat_sessions.sourcing_stage` + a timestamp merged into `sourcing_stage_history`. 409 unless the caller is the assigned AM. Optionally mirrors into the HubSpot pipeline via per-stage `HUBSPOT_DEALSTAGE_*` env vars (non-fatal). Buyer's progress rail updates live via `chat_sessions` realtime. Emits `am_stage_updated` |
| `POST /api/am/sessions/[id]/lessons` | `POST /draft-lessons` | Generate improvement lessons from a rated brief: loads the user/ai transcript + rating from Supabase, gets 0-3 drafts back, inserts them into `agent_lessons` as `proposed`. Requires claim + rating (409); rate-limited `am-lessons:user:<id>` 20/h |
| `GET /api/am/lessons`, `PATCH /api/am/lessons/[id]` | — (Supabase only) | Lessons review queue: list (optional `?status=`; `?count=1` returns just `{ count }` via a head-only count, used for the dashboard badge), then approve (optionally with edited `lesson_text`) or reject each proposed lesson |
| `GET /api/am/config`, `PUT /api/am/config` | — (Supabase only) | Live Gemini model config (the `app_settings` singleton row, migrations 0015/0016). GET returns `{ config: { interview_model, pills_model, translate_model, pills_thinking, updated_at, updated_by_name } }`; PUT validates each id against the `lib/models.ts` allowlist (and `pills_thinking` against off/low/medium/high) and saves. AM-gated. Powers the dashboard **Models** pane and emits `model_config_updated` |

## Flow — chat turn

```
Browser (lib/useChat.ts)
  │  POST /api/chat  {session_id, message, client_message_id}
  │  Accept: application/x-ndjson            (when NEXT_PUBLIC_CHAT_STREAMING=1)
  ▼
Next.js Route Handler  (app/api/chat/route.ts)
  │  auth (getClaims, local)
  │  parallel: rate limit · session · rfq · slim history · model config
  │  insert user message (metadata.turn = "running")
  │  openBackendTurn() → POST ${BACKEND_URL}/chat/stream
  │      {session_id, user_id, message, history, profile, language, model?, pills_model?, pills_thinking?}
  │      session_id/user_id are telemetry context only (llm_call_logs + llm_call_completed)
  ▼
FastAPI  /chat/stream   (NDJSON: delta* → reply_done → pills → done | error → done)
  │  manual streaming tool loop (update_buyer_profile), then the pills pass
  ▼
Route Handler relays to the browser:
  ack{user_message}
  delta{text} ...                         (forwarded as they arrive)
  reply_done{agent_message, profile, profile_complete}
      sent only AFTER the rfq update + AI row insert (parallel) succeed
  pills{suggestions, reply_language}
  done{timings}
  then, after the stream closes (after()): pills → AI row metadata, session language pin
```

A failure before the stream starts (backend unreachable) is a JSON 502. A failure mid-stream (backend `error`, empty reply, truncated stream, failed AI insert) is an `error{code, retryable}` event; the user row flips to `turn = "failed"` and no AI row is written, so Retry re-runs the turn. Without the `Accept` header the same pipeline returns the legacy single JSON body.

## Flow — Request human review

```
Browser
  │  Buyer clicks Request human review on ProfileSummaryCard
  │  POST /api/request-review  {session_id}
  ▼
Next.js Route Handler  (app/api/request-review/route.ts)
  │  rate limit (request-review:user:<id>, 5/h)
  │  session must belong to the caller             → 404
  │  already past 'ai'                             → 200 { already_handed_off: true }
  │  rfqs.is_complete false                        → 409 (captures review_blocked: missing_fields)
  │  caller still anonymous                        → 401 { auth_required: true }
  │                                                  (captures review_blocked: auth_required;
  │                                                   the client opens AuthModal, then resumes)
  │  tryClaimHandoff: UPDATE chat_sessions SET status='in_handoff', sourcing_stage='brief_submitted'
  │                   WHERE id=$1 AND status='ai'  (loser of a race → already_handed_off)
  │  HubSpot (if enabled, idempotent on rfqs.hubspot_deal_id): upsert contact, create deal,
  │           markRfqSubmitted. Validation error → revertHandoff + 422; other errors non-fatal
  │  localize HANDOFF_REPLY, divider label, AM welcome into session.language
  │           (3 × translateText → FastAPI POST /translate, in parallel; English fallback)
  │  insertMessages (service-role): ai close, system divider, account_manager auto-welcome
  │  captureServer('review_requested')
  ▼
200 { session: { id, status: "in_handoff" }, inserted_messages: ChatMessagesRow[] }
  │
  ▼
Client (useChat.requestReview) appends the three rows in order (race-safe against
their Realtime echoes), flips reviewRequested=true (sticky), stamps the progress rail
(status in_handoff, stage brief_submitted), swaps the card CTA for a "Transferring to our
account manager…" badge, and switches the composer to "Message your account manager…".
Later buyer sends still POST /api/chat, which saves the message as a note for the AM and
returns `ai_skipped: true` (no Gemini call, no typing indicator).
```

## Environment

| Var | Where read | Default | Notes |
|---|---|---|---|
| `BACKEND_URL` | `app/api/*/route.ts` | `http://localhost:8000` | Server-side only. NOT prefixed `NEXT_PUBLIC_` so it's never in the client bundle. |

In Vercel deployment, set `BACKEND_URL` to the Render backend URL (e.g. `https://nexcierge-backend.onrender.com`).

## Request / response shapes

### `GET /api/chat/start`

Bootstraps the buyer's chat surface — anonymous Supabase sign-in if needed, then returns the active or requested `chat_sessions` row, its `rfqs` row, full message history, and the sidebar list (`sessions`: the same rows as `GET /api/chat/sessions`, so the page needs no second request). The IP rate limit applies only when the request has no session (i.e. it is about to create an anonymous user). `POST /api/chat/sessions` (new conversation) returns this same payload as `bootstrap` (with `sessions: null`), which the client caches so switching to the new chat needs no `/start` call.

**Query params (all optional):**
- `session_id=<uuid>` — load a specific past session (must be owned by the caller).
- `new=1` — skip the active-session lookup and hand back a blank-slate `chat_sessions` row: the user's existing **never-started** session (`status='ai'`, `title IS NULL` — no message ever sent) if one exists, else a freshly created row. Reuse is what keeps repeat marketing-site visits from stacking empty "New conversation" rows. Used by `HeroChatPreview` and `FloatingChatButton` so every click from the marketing site lands on a blank chat. The `useChat({ forceNew: true })` option toggles this from the client.

`session_id` takes precedence over `new=1`.

### `POST /api/chat`

**Request:**
```json
{ "session_id": "<uuid>", "message": "<trimmed user input>", "client_message_id": "<crypto.randomUUID() per send>" }
```

The route handler reads `chat_sessions.language` for the given session and forwards it to FastAPI as the `language` field. The browser never has to send it.

**Response (streamed, `Accept: application/x-ndjson`):** `Content-Type: application/x-ndjson`, one `ChatStreamEvent` (`types/chat.ts`) per line: `ack{user_message}`, `delta{text}`*, `reply_done{agent_message, profile, profile_complete}`, `pills{suggestions, reply_language}` (or `error{code, retryable}` instead of `reply_done`), always ending with `done{timings}`. `reply_done.agent_message` is the persisted row (its `metadata` carries `reply_to` + `client_message_id`); pills are merged into that row's metadata after the stream closes. Outcomes decided before the AI runs (400/404/429/500/502, `ai_skipped`, `duplicate`, `ai_pending`) are returned as JSON even to a streaming request, so the client branches on `content-type`.

**Response (JSON):** see `backend/docs/API.md` `POST /chat` — full `profile` dict always present, plus `profile_complete` and `review_requested` booleans. `reply` is in the buyer's language: Gemini mirrors whatever the buyer wrote, or follows the pinned `session.language` once it's been set. Per-turn quick-reply `suggestions` are included, plus `reply_language` (ISO 639-1) — the language of the agent's reply, classified by the pills pass — which `useChat` adopts as the buyer's **display language** to localize chat chrome (`lib/chatStrings.ts`) and the summary card from the first turn.

**Idempotency (`client_message_id`):** `useChat` generates a UUID per send and **reuses it on Retry**. The route inserts the user message with it; a unique index on `chat_messages (chat_session_id, client_message_id)` (migration `0018`) turns a duplicate delivery — timeout retry, flaky network, double submit — into a conflict instead of a second row + second Gemini turn. On conflict the route returns the original turn's result with `duplicate: true`:
- AI reply already persisted → full normal response shape (`reply`, `agent_message`, `profile`, stored `suggestions`; no `reply_language` — the client keeps its current display language).
- No reply, and the original turn **failed** (`metadata.turn = "failed"`) or has been `running` for over 75 s (its function died) → the route claims the turn with a compare-and-swap and **re-runs it** (streamed or JSON, like a fresh send). Two concurrent retries can't both re-run it.
- Original request still mid-Gemini → `ai_pending: true` with `agent_message: null`; the client renders a retryable error (`errTimeout`) so the buyer can re-poll with the same key (Realtime may deliver the reply first and replace that bubble).
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

**Resolve the buyer's language first.** If `session.language` is still the `'en'` default **and** the session isn't resolved yet (`language_resolved_at` null), `detectBuyerLanguage()` classifies it from the buyer's accumulated thread text (`listMessages` → concat the buyer's turns, capped at 2k chars) via `POST /detect-language`, caches a non-`en` result to `chat_sessions.language`, and stamps `language_resolved_at` (English included), all with the **service-role admin client**. Detection therefore runs at most once per session; `/api/chat` already stamps sessions when their brief completes, so newly handed-off sessions never detect here.

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

Handled entirely in the Route Handler (Supabase + HubSpot); the only backend calls are the closing-message translations (`POST /translate`). The FastAPI backend has no handoff endpoint (the old `/sessions/{id}/request_review` was removed when the backend went stateless).

**Response (200):**
```json
{ "session": { "id": "<uuid>", "status": "in_handoff" }, "inserted_messages": [ /* ai close, system divider, account_manager welcome */ ] }
```
or `{ "already_handed_off": true, "session": { "id", "status" } }` when the session is already past `ai` (double click, second tab, retry). The client appends `inserted_messages` and flips its local `reviewRequested`.

**Error mapping:**
- `400` — invalid JSON / missing `session_id`
- `401 { auth_required: true }` — buyer still anonymous; `useChat` opens `AuthModal`, and the sign-in round trip returns to `/chat?resume=handoff`, which re-fires the request
- `404` — session not found or not owned by the caller
- `409` — brief not complete (`rfqs.is_complete` false). The UI only shows the button once the profile is complete, so this is a defensive path
- `422 { error: "invalid_profile_field", field, value, message }` — HubSpot rejected a field (e.g. a typo'd email); the claim is reverted so the buyer can fix it in chat and retry. The client shows `message` as an error bubble
- `429` — handoff rate limit (5 per hour per user)
- `500` — missing rfq row or a database failure

### Live model config injection

The Gemini models are set from the dashboard **Models** pane, not hard-coded and no longer only Render env vars. `lib/modelConfig.ts` `getModelConfig()` reads the `app_settings` singleton row (service-role client, short in-memory TTL cache, never throws → returns nulls on failure). Every server-side call that reaches the backend injects the relevant model, and the backend falls back to its env default for any null field:

- `/api/chat` → `model` (interview) + `pills_model` + `pills_thinking` (semantic off/low/medium/high reasoning level for the pills pass) on the `/chat` body
- `lib/translate.ts` (`translateText` / `detectLanguage`, used by the AM message-send + display-language routes) → `model` on `/translate` and `/detect-language`
- `/api/am/sessions/[id]/lessons` → `model` (interview) on `/draft-lessons`

The model actually used is what the backend logs to `llm_call_logs` + PostHog, so a model change is immediately comparable in analytics. This is a **global live** control (all buyer chats), because buyers chat anonymously before any AM is assigned — there is no per-tester scoping. The allowlist of selectable ids is `lib/models.ts` (shared by the dropdown and the PUT validation).

## Error handling

- Backend unreachable → Route Handler catches, returns `{error: "...", status: 502}` (and marks the chat turn `failed` so Retry re-runs it)
- Mid-stream failure → `error` event; the client drops the partial bubble and shows an error bubble with Retry
- Client watchdogs (streamed turns): 15 s without `ack`, 20 s of silence, or 60 s total aborts the request; the server keeps running under `after()`, so the reply still lands (Realtime heals the error bubble, or Retry returns it)
- Client displays an error reply bubble in chat (with Retry for chat turns; the Request human review handler just shows the error message and leaves the CTA enabled)

## Streaming rollout

Implemented end-to-end (backend `POST /chat/stream`, `app/api/chat/route.ts`, `lib/useChat.ts`). The browser opts in with `NEXT_PUBLIC_CHAT_STREAMING=1` (rollout flag; when unset the route returns the classic JSON body from the same pipeline). Order: apply migration 0022 → deploy backend → deploy frontend (flag off) → set the flag → after a soak, the backend's legacy `/chat` switches to the streaming implementation. The frontend tolerates either backend order: `lib/backendTurn.ts` falls back to `/chat` when `/chat/stream` returns 404.

## How to apply when extending

- Adding a new backend endpoint that the browser needs → add a corresponding Route Handler under `app/api/`, document here
- Changing a request/response shape → update both this doc AND the backend's `schemas.py` AND `backend/docs/API.md`
- Adding auth → put the validation in the Route Handler so the client never sees the auth secret
- **Always update `docs/API_INTEGRATION.md` when changing the proxy logic, env vars, or response shape.**
