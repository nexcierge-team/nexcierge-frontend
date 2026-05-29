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
| `POST /api/chat` | `POST /detect-language` (first turn) + `POST /chat` | Conversational turn — on the buyer's first message, detects the language and pins it on `chat_sessions.language`; every turn forwards `session.language` to FastAPI so the agent's prompt stays locked to it |
| `POST /api/request-review` | `POST /sessions/{id}/request_review` | Buyer-initiated handoff to the local account manager |
| `POST /api/am/sessions/[id]/messages` | `POST /translate` (conditional) | AM reply — when `session.language != 'en'`, translates English→target via FastAPI before persisting |

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
Client appends three messages in order:
  • the hard-coded AI close
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

**Response:** see `backend/docs/API.md` `POST /chat` — full `profile` dict always present, plus `profile_complete` and `review_requested` booleans. `reply` is in the language Gemini detected for this conversation. The response also includes `detected_language` (ISO 639-1 string, or `null` on non-first turns) so the client can update its local language state without a refetch.

### First-message language detection

`POST /api/chat` does extra work on the buyer's first user message of a session:
1. Calls `lib/translate.ts::detectLanguage()` → FastAPI `POST /detect-language` (Flash-Lite, 5s timeout)
2. If the result is a supported ISO 639-1 code other than the stored `'en'` default, persists it to `chat_sessions.language` via `setSessionLanguage()`

Subsequent turns skip detection — Gemini handles language continuity from history, and the backend pins the system prompt to `session.language`. Detection silently falls back to `'en'` on timeout / classifier failure; the buyer can still chat, AM translation just stays in English until we get a confident signal later.

### AM-message translation

`POST /api/am/sessions/[id]/messages` is unchanged from the AM's perspective (`{ content }` in, `{ message }` out). Server-side, when `session.language !== 'en'`:
1. Calls `lib/translate.ts::translateText()` → FastAPI `POST /translate` (Flash-Lite, 8s timeout)
2. Persists `chat_messages` with `content` (English original), `translated_content` (target language), `translated_to` (the language code)

On translation failure: posts with `translated_content=null`. Buyer renders the English original — degraded but not silent.

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
