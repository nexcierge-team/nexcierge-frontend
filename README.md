# Nexcierge Frontend

Next.js application serving the Nexcierge landing experience and AI sourcing chat. Talks to [`nexcierge-backend`](https://github.com/nexcierge-team/nexcierge-backend) via an internal API proxy route.

Part of the [`nexcierge-team`](https://github.com/nexcierge-team) stack.

## Stack

| | |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Fonts | Geist (sans + mono) via `next/font` |
| Deploy | Vercel (recommended) or Render (`render.yaml`) |

## What's built

- **Chat-first homepage (`/`)** — hero tagline, prominent chat input, suggested prompts. Once a message is sent, transitions to full chat view with messages and persistent input at bottom.
- **API proxy (`/api/chat`)** — forwards POST requests to the FastAPI backend, avoiding CORS issues.
- **Header** with `NEXCIERGE` brand and `Login` link (login page not yet implemented).

## Run locally

```bash
git clone git@github.com:nexcierge-team/nexcierge-frontend.git
cd nexcierge-frontend

npm install
cp .env.example .env.local       # default points at http://localhost:8000
npm run dev
```

Then open http://localhost:3000.

**Requires `nexcierge-backend` running** on the URL in `BACKEND_URL`. Start it with:

```bash
cd ../nexcierge-backend          # or wherever you cloned it
source .venv/bin/activate
uvicorn app.main:app --reload
```

## Environment

| Var | Purpose | Default |
|---|---|---|
| `BACKEND_URL` | FastAPI backend base URL (server-side only) | `http://localhost:8000` |

## Layout

```
app/
├── layout.tsx            Header + Geist font + global wrapper
├── page.tsx              Chat-first homepage (client component)
├── globals.css           Tailwind + base theme
└── api/chat/route.ts     Proxy POST /api/chat -> $BACKEND_URL/chat
```

## Deploy

### Vercel (recommended)
1. Push to GitHub (already done)
2. Vercel Dashboard → **New Project** → import `nexcierge-frontend`
3. Set `BACKEND_URL` to your deployed backend URL (e.g. `https://nexcierge-backend.onrender.com`)
4. Deploy. Custom domain (`nexcierge.com`) configurable in project settings.

### Render (alternative)
Use the included `render.yaml`. Set `BACKEND_URL` manually in dashboard (the blueprint marks it `sync: false`).

## Design language

- Minimalist, refined typography (Geist)
- Mostly grayscale with high-contrast `zinc-900` text on `white`
- Soft borders (`zinc-100`/`zinc-200`), generous whitespace
- Single accent: `zinc-900` for primary actions and user message bubbles

Inspired by the AI app aesthetic (Claude.ai, ChatGPT) — chat is the centerpiece, marketing copy is minimal.
