# API Integration

The frontend never calls the FastAPI backend directly from the browser. All chat requests go through a Next.js Route Handler at `/api/chat`, which proxies server-side to `process.env.BACKEND_URL`.

## Why a proxy

1. **No CORS** — the request is server-to-server from Vercel to Render, not browser-to-Render
2. **`BACKEND_URL` stays server-side** — never exposed to the client bundle, can be a private hostname later
3. **Single place to add cross-cutting concerns** — auth, rate limiting, logging, response transformation
4. **Easier to migrate to streaming later** — wrap the proxy in an SSE response without touching the client component

## Flow

```
Browser
  │  POST /api/chat  {session_id, message}
  ▼
Next.js Route Handler  (app/api/chat/route.ts)
  │
  │  fetch(`${BACKEND_URL}/chat`, ...)
  ▼
FastAPI Backend
  │
  │  Gemini call + tool execution
  ▼
Returns reply + profile_submitted + profile
  │
  ▼
Route Handler returns same JSON to browser
```

## Environment

| Var | Where read | Default | Notes |
|---|---|---|---|
| `BACKEND_URL` | `app/api/chat/route.ts` | `http://localhost:8000` | Server-side only. NOT prefixed `NEXT_PUBLIC_` so it's never in the client bundle. |

In Vercel deployment, set `BACKEND_URL` to the Render backend URL (e.g. `https://nexcierge-backend.onrender.com`) in Project Settings → Environment Variables.

## Request shape

The frontend sends what the FastAPI endpoint expects:

```json
{
  "session_id": "<crypto.randomUUID() from client>",
  "message": "<trimmed user input>"
}
```

## Response shape

Same as `POST /chat` returns. The client treats `data.reply` as the agent's response and uses `data.profile_submitted` to detect the handoff completion (currently doesn't do anything special with it — future: show a "lead submitted" confirmation UI).

## Error handling

- Backend unreachable → Route Handler catches, returns `{reply: "Backend is unreachable...", status: 502}`
- Client displays the error reply as if it were an agent message
- No retry logic yet (Gemini SDK retries internally for rate limits, but we don't on the frontend)

## Future: streaming

Gemini supports SSE token streaming. Migration plan:
1. Backend: switch `/chat` to a streaming response
2. Route handler: forward the stream (use `ReadableStream` or `TransformStream`)
3. Client: replace `fetch().then(res => res.json())` with `fetch().then(res => res.body.getReader())` and append tokens incrementally

This will substantially improve perceived latency for the first reply (current cold response is 2–5s on flash-lite).

## How to apply when extending

- Adding a new backend endpoint that the browser needs → add a corresponding Route Handler under `app/api/`
- Changing the request/response shape → update both this doc AND the backend's `schemas.py`
- Adding auth → put the validation in the Route Handler so the client never sees the auth secret
- **Always update `docs/API_INTEGRATION.md` when changing the proxy logic, env vars, or response shape.**
