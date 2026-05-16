# Frontend Architecture

## Stack

| | |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript (strict mode) |
| Styling | Tailwind CSS v4 |
| Fonts | Geist (sans + mono) via `next/font` |
| Build | Turbopack (Next 16 default) |
| Deploy | Vercel (recommended) or Render |

## Layout

```
app/
├── layout.tsx          Root layout — header (NEXCIERGE + Login) + Geist fonts
├── page.tsx            Chat-first homepage (client component)
├── globals.css         Tailwind base + theme tokens
└── api/
    └── chat/route.ts   POST /api/chat → proxies to FastAPI BACKEND_URL/chat
```

No `src/` directory — `app/` lives at the root (Next 16 supports both; we use the simpler form).

## Chat-first homepage state machine

The single page (`app/page.tsx`) has two visual states driven by `messages.length`:

```
┌───────────────────────┐         ┌─────────────────────────┐
│  EMPTY STATE          │  send   │  ACTIVE STATE           │
│                       │ ──────► │                         │
│  • Centered hero      │         │  • Scrolling messages   │
│  • Large chat input   │         │  • Sticky bottom input  │
│  • Suggestion chips   │         │  • Loading dots indicator│
└───────────────────────┘         └─────────────────────────┘
                                       │
                                       ▼
                                  Reload page → back to empty
```

Both states share the same `ChatInput` component. Suggestion chips fire the same `sendMessage()` as form submit.

## Session management

- One `sessionId` per page load, generated via `crypto.randomUUID()` in a `useState` initializer
- Session is **NOT** persisted to localStorage yet → page refresh = new session
- `sessionId` is included in every `POST /api/chat` call so the backend can thread the conversation

When persistence lands (login or anonymous sessions stored server-side), update the init to read from cookie/localStorage first and fall back to `crypto.randomUUID()`.

## Server vs Client components

- `layout.tsx` is a **Server Component** (default) — renders the static shell + metadata
- `page.tsx` is a **Client Component** (`'use client'` directive) because it needs `useState`, `useRef`, `useEffect`, `onSubmit`
- `app/api/chat/route.ts` is a **Route Handler** (Web `Request`/`Response`) — runs on the server only

Be careful about adding server-side data fetching to `page.tsx` — it'd need to be split into a server parent + client child. For now, the homepage has no server-side data, so this is fine.

## API integration

The frontend never calls the FastAPI backend directly. It calls its own `/api/chat` route, which proxies server-side to `process.env.BACKEND_URL`. Reasons:
- No CORS to configure
- `BACKEND_URL` stays server-side (not exposed to the browser)
- Easier to add auth, rate limiting, or logging later

See `docs/API_INTEGRATION.md` for the proxy details.

## Routes (current)

| Route | Type | Purpose |
|---|---|---|
| `/` | static | Chat-first homepage |
| `/api/chat` | dynamic (route handler) | Proxy to backend `/chat` |
| `/login` | (not yet built) | Magic-link login |

## Planned additions

- **`/dashboard`** — authenticated buyer dashboard (past conversations, submitted leads)
- **`/admin/*`** — internal CRM for Chinese team (auth-gated, separate route group)
- **`/(marketing)/`** — `/about`, `/how-it-works`, `/pricing`, `/contact` (SEO pages, multilingual)
- **i18n** via `next-intl` — buyer-facing pages need EN + ZH + ES + HI + AR at minimum
- **Streaming chat** — Gemini supports SSE; switch `/api/chat` route handler to stream tokens

## How to apply when extending

- Adding a new page → place under `app/` following App Router conventions; mark `'use client'` only if needed
- Adding shared UI → create `components/` directory at repo root (not under `app/`)
- Changing the layout/navigation → edit `app/layout.tsx`
- **Always update `docs/ARCHITECTURE.md` when adding a route, changing the state machine, or changing the API integration pattern.**
