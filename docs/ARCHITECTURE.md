# Frontend Architecture

## Stack

| | |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript (strict mode) |
| Styling | Tailwind CSS v4 |
| UI primitives | shadcn-style components (Radix + CVA) |
| Animation | Framer Motion (subtle, scroll-reveal + page transitions) |
| Icons | lucide-react |
| Fonts | Inter via `next/font/google` |
| Deploy | Vercel (recommended) — see project README |

## Repository layout

```
app/
├── layout.tsx              Root layout (Inter font, metadata)
├── globals.css             Tailwind + design tokens + animations + base styles
├── page.tsx                Landing page (server, assembles sections)
├── chat/page.tsx           Full-screen AI sourcing chat
├── dashboard/page.tsx      Mock authenticated dashboard (sidebar + cards)
├── about/page.tsx          About / trust page
├── contact/page.tsx        Contact form (client, mock submit)
└── api/chat/route.ts       POST /api/chat -> proxies to FastAPI BACKEND_URL/chat

components/
├── ui/                     shadcn-style primitives
│   ├── button.tsx          CVA variants: primary/secondary/ghost/accent · sm/md/lg
│   ├── card.tsx            Card + Header/Title/Description/Content/Footer
│   ├── input.tsx
│   ├── textarea.tsx
│   └── accordion.tsx       Radix accordion
├── layout/
│   ├── Header.tsx          Sticky, blurred, marketing pages
│   └── Footer.tsx          4-column footer
├── landing/
│   ├── Reveal.tsx          Scroll-reveal wrapper (Framer Motion + useInView)
│   ├── SectionHeader.tsx   Reusable eyebrow + title + description block
│   ├── Hero.tsx            Split layout with chat preview
│   ├── HeroChatPreview.tsx Animated mock conversation card
│   ├── TrustStrip.tsx      4 trust badges
│   ├── HowItWorks.tsx      5-step process grid
│   ├── Comparison.tsx      Traditional vs Nexcierge table
│   ├── Categories.tsx      6-card machinery category grid
│   ├── FAQ.tsx             Radix accordion FAQ
│   └── FinalCTA.tsx        Centered final call-to-action
├── chat/
│   ├── ChatSidebar.tsx     Conversation history sidebar
│   ├── ChatComposer.tsx    Auto-resizing textarea + send button
│   ├── MessageBubble.tsx   Bubbles + typing indicator
│   └── SupplierCard.tsx    In-chat supplier match card with CTAs
└── dashboard/
    ├── DashboardSidebar.tsx  Nav (Requests, Quotes, Suppliers, etc.)
    └── RequestCard.tsx       Status-tagged sourcing request tile

lib/
├── utils.ts                cn() helper (clsx + tailwind-merge)
└── mockData.ts             All static content: prompts, FAQs, categories, requests, mock supplier

types/
├── chat.ts                 Message · SupplierMatch · ChatSession
└── dashboard.ts            RequestStatus · SourcingRequest
```

## Routes

| Route | Type | Page |
|---|---|---|
| `/` | static | Landing — hero + trust + how-it-works + comparison + categories + FAQ + final CTA |
| `/chat` | static (interactive client) | AI sourcing chat with sidebar, composer, supplier cards |
| `/dashboard` | static | Mock authenticated dashboard with stats + request cards |
| `/about` | static | Trust page — pillars + verification process + team |
| `/contact` | static (interactive client) | Contact form + channels |
| `/api/chat` | dynamic | Server-side proxy to FastAPI `BACKEND_URL/chat` |

## Server vs Client component boundaries

- `app/layout.tsx`, `app/page.tsx`, `app/about/page.tsx`, `app/dashboard/page.tsx` are **Server Components** — they assemble the page from a mix of server-rendered and client child components.
- `app/chat/page.tsx`, `app/contact/page.tsx` are **Client Components** (`"use client"`) because they need state, refs, and effects.
- `components/landing/*` are mostly Client Components because of `framer-motion` + Radix dependencies.
- `components/ui/*` mark `"use client"` where Radix or refs are required (Button, Accordion). Card/Input/Textarea are server-safe.
- `app/api/chat/route.ts` is a Route Handler — runs server-side only.

## Chat-first interactive state machine

The chat page has two visual states keyed off `messages.length`:

```
EMPTY:  centered hero, large composer, suggestion chips
   │
   ▼  first message sent
ACTIVE: scrolling message list + sticky composer at bottom
   │
   ▼  user clicks New conversation (sidebar) → new sessionId → back to EMPTY
```

A new `sessionId` (UUID) is generated on:
- First mount
- Click on "+ New conversation" in the sidebar
- (Not yet) page refresh — sessions don't persist across reloads

The chat page calls `/api/chat` (the Route Handler proxy) on every message — no direct browser-to-FastAPI calls.

## Supplier cards in chat

When the agent's reply references a PET bottle blower (heuristic match in `shouldAttachSupplier`), a `SupplierCard` is attached to the agent's message. This is a placeholder for the future flow where the agent's structured tool output (from the backend's `search_machinery` tool) drives card rendering. **TODO:** wire this to the backend's actual tool results when streaming/structured outputs land.

## Design system

See `docs/DESIGN_SYSTEM.md` for color tokens, typography, spacing, and component patterns.

## API integration

See `docs/API_INTEGRATION.md` for the proxy pattern, env vars, and future streaming plan.

## Animation principles

- Subtle by default — `Reveal` does a 16px y-translate + opacity fade on scroll into view
- One easing curve: `[0.22, 1, 0.36, 1]` (a soft cubic bezier, close to Apple's standard)
- No parallax, no spring physics, no auto-playing carousels
- Hero chat preview has a scripted micro-animation (bubbles appear in sequence, chips fade in) — runs once on mount
- Accordion uses Radix's height + opacity transitions defined in `globals.css`

## Planned additions

- **Magic-link auth** (login page + middleware) — requires backend support
- **Streaming chat responses** via SSE — see `docs/API_INTEGRATION.md`
- **Internal CRM** under `/admin/*` (separate route group, separate auth)
- **i18n** via `next-intl` — at least EN + ZH + ES + HI + AR for buyer-facing pages
- **Dark mode** — Tailwind `dark:` variants once the base palette is finalized
- **Wire SupplierCard to real backend tool outputs** instead of the heuristic match

## How to apply when extending

- New page → place under `app/`. Server Component by default; mark `"use client"` only if it needs state/effects.
- New marketing section → add a component to `components/landing/`, compose into `app/page.tsx`.
- New UI primitive → add to `components/ui/` following the shadcn pattern (CVA for variants, forwardRef, displayName).
- New mock data → add to `lib/mockData.ts` with a type in `types/`.
- **Always update `docs/ARCHITECTURE.md` when adding a route, changing the state machine, or changing the API integration pattern.**
- **Always update `docs/DESIGN_SYSTEM.md` when introducing new visual primitives.**
