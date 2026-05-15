# Nexcierge Frontend

Next.js application serving three surfaces in one codebase:

1. **Marketing site** — public, SEO-friendly, multilingual landing pages for international buyers
2. **Buyer chat UI** — authenticated chat with the AI sourcing agent, dashboard for tracking submitted leads
3. **Internal CRM** — for the local Chinese coordination team to receive handoff profiles, vet buyers, and manage manufacturer outreach

Part of the [`nexcierge-team`](https://github.com/nexcierge-team) stack. Talks to [`nexcierge-backend`](https://github.com/nexcierge-team/nexcierge-backend) over HTTP.

## Status

🚧 **Not yet scaffolded.** This repo currently has only this README. Scaffolding pending.

## Planned stack

| | |
|---|---|
| Framework | Next.js (App Router) |
| Styling | Tailwind CSS |
| Components | shadcn/ui |
| i18n | next-intl (incl. RTL for Arabic/Hebrew) |
| Auth | Magic link via Resend or Postmark |
| Deploy | Render (`render.yaml`) |

## Planned route layout

```
app/
├── (marketing)/         Public landing pages, multilingual
├── (buyer)/             Authenticated buyer dashboard + chat
└── (admin)/             Internal CRM for the Chinese coordination team
```

## Run locally (once scaffolded)

```bash
git clone git@github.com:nexcierge-team/nexcierge-frontend.git
cd nexcierge-frontend

npm install
cp .env.example .env       # set NEXT_PUBLIC_BACKEND_URL
npm run dev
```

## Connected services

- **Backend API** at `NEXT_PUBLIC_BACKEND_URL` (deployed `nexcierge-backend`)
- **Auth provider** (Resend / Postmark) for magic links

## Critical UX constraints (from business model)

- **Buyers must complete Tier 1 pre-qualification** (company name, business reg #, destination port, project timeline) before seeing supplier details.
- **No manufacturer contact info ever surfaces in the UI.** All buyer↔seller communication is mediated by the internal CRM.
- **Multilingual by default.** Latin scripts + CJK + RTL all need to render correctly on day one.
