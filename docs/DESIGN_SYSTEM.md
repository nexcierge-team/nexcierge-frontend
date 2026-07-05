# Design System

The aesthetic is intentionally minimal — closer to Claude.ai / ChatGPT than to a SaaS landing page. Chat is the centerpiece; marketing copy is sparse.

The canonical color reference for the whole company lives at [`/brand/PALETTE.md`](../../brand/PALETTE.md). What follows is how those tokens are used inside the frontend specifically.

## Palette — Midnight Blue Accent

### Base
| Token | Hex | Tailwind class | Use |
|---|---|---|---|
| Canvas | `#FFFFFF` | `bg-white` | Page background |
| Secondary background | `#F7F8FA` | `bg-[#F7F8FA]` | Soft sections, sidebars |
| Text primary | `#111827` | `text-gray-900` | Headlines, body |
| Text secondary | `#6B7280` | `text-gray-500` (≈ `text-gray-600`) | Subtitles, meta |
| Border | `#E5E7EB` | `border-gray-200` | Cards, dividers |

### Brand accent
| Token | Hex | Use |
|---|---|---|
| **Midnight navy** | `#0F2747` | Primary brand color — CTAs, eyebrow text, status indicators, accent dots, focus rings |
| **Deep blue** (hover) | `#1D4ED8` | Hover state on midnight navy elements (primary buttons) |
| **Powder blue** (soft AI) | `#DCE8F8` | Soft AI-themed backgrounds: AI status pills, AI badges, optional message-bubble tints |

> **Important:** the Tailwind utility scale is **`gray-*`** (not `zinc-*`). `gray-900` matches `#111827` exactly; `zinc-900` is `#18181b` and is the wrong neutral.

## Buttons (in `components/ui/button.tsx`)

| Variant | Background | Text | Hover | Use |
|---|---|---|---|---|
| `primary` | `#0F2747` (midnight navy) | white | `#1D4ED8` (deep blue) | Main page CTAs |
| `accent` | `#0F2747` | white | `#1D4ED8` | Same visual as primary; used in cards for AI-specific actions (e.g. "Request human review") |
| `secondary` | white + `border-gray-200` | `text-gray-900` | `bg-gray-50` | Side CTAs, "Learn more" |
| `ghost` | transparent | `text-gray-700` | `bg-gray-100` | Tertiary actions |

Focus ring: `ring-[#0F2747]` (midnight navy) on all variants.

## Typography

- **Font:** Inter (loaded via `next/font/google` in `app/layout.tsx`)
- **Body font feature settings:** `'rlig', 'calt', 'ss01'` — enables ligatures and stylistic alternates
- **Hero h1:** `text-4xl sm:text-5xl font-semibold tracking-[-0.02em]`
- **Section h2:** `text-3xl sm:text-4xl font-semibold tracking-[-0.015em]`
- **Body:** default size (1rem) with `leading-relaxed` in chat bubbles
- **Subtle / meta:** `text-sm text-gray-500`
- **Brand wordmark:** `font-semibold tracking-[0.16em] text-sm` (uppercase NEXCIERGE)

## Spacing

- Page max-widths: `max-w-6xl` for sections, `max-w-2xl` for chat content, `max-w-3xl` for FAQ / dashboard prose
- Vertical rhythm: sections use `py-24 sm:py-32` for major spacing
- Chat bubbles: `space-y-5` between messages, `rounded-2xl px-4 py-3`
- Cards: `rounded-2xl border border-gray-200`, `p-5`–`p-7` content padding

### Mobile-web safe areas

- `app/layout.tsx` exports `viewport: Viewport` with `viewportFit: "cover"` so iOS extends content under the dynamic island and home indicator. The `pt-safe` / `pb-safe` / `pl-safe` / `pr-safe` utilities in `app/globals.css` (Tailwind v4 `@utility`) carve the unsafe regions back out. Use them on any fixed-position chrome that touches a viewport edge — the chat header (`pt-safe`), the composer footer (`pb-safe` on a wrapper, **not** on the same element as the base `py-*`, since `max(env(...), 0px)` collapses to 0 on non-iOS), the mobile drawer, and the AuthModal overlay.
- Chat shell uses `h-[100dvh]` (dynamic viewport height) rather than `h-screen` / `100vh` so iOS Safari's collapsing URL bar doesn't push the composer behind the home indicator.
- `ChatSidebar` is a mobile drawer below `md:` (fixed off-canvas + backdrop + Escape/select close) and reverts to an inline `md:static` column at `md:` and above. The hamburger trigger in the chat header is `md:hidden`.

## Component patterns

### Chat input
- Rounded `rounded-2xl` textarea with `resize-none`
- Border `border-gray-200` → focus `border-gray-400` (no ring)
- Send button absolutely positioned bottom-right, circular, fires on Enter (Shift+Enter for newline)
- Up arrow SVG icon

### Suggestion chips
- Pill: `rounded-full px-3 py-1.5 border border-gray-200`
- Hover: subtle `bg-gray-50` + text darkens to `text-gray-900`

### Message bubbles
- Self (outgoing — buyer's own / AM's own): `bg-[#0F2747] text-white`
- Agent / incoming: `bg-white border border-gray-200 text-gray-900 shadow-[0_1px_2px_rgba(0,0,0,0.03)]`
- **AM dashboard, AI messages:** the prior AI interview turns use the dark `bg-[#0F2747] text-white` "house" bubble (same colour as the AM's own replies) so they group with the Nexcierge side and stay distinct from the buyer's white bubbles. Alignment is unchanged — AI stays on the incoming (left) side; only the colour flips. The buyer's own view keeps AI messages white. Driven by `isAiInAmView` in `MessageBubble.tsx`; `AgentMarkdown` takes a `dark` prop that re-themes strong/links/code/headings/blockquote and the translation secondary line for white-on-navy contrast.
- `max-w-[88%]` so long messages don't span full width
- `whitespace-pre-wrap` on plain (self) bubbles to preserve linebreaks; agent bubbles render markdown

### Status pills (dashboard)
- AI-related: `bg-[#DCE8F8] text-[#0F2747] ring-[#BFD3F0]` (Supplier Matching uses this — it's the soft AI accent)
- Functional Tailwind tints for non-AI states: `emerald-*` for Quote Ready, `amber-*` for Negotiating, etc.

### Dashboard primitives (components/dashboard/)

- **Nav rail** (`DashboardSidebar`): white `w-60` column, `border-r border-gray-200`. Active item: `bg-[#DCE8F8]/60 text-[#0F2747]` (powder blue wash + navy text); inactive: `text-gray-700 hover:bg-gray-50`. Count badges are `rounded-full text-[10px]` — `bg-gray-100 text-gray-600`, inverting to `bg-[#0F2747] text-white` on the active item.
- **Stat card** (`StatCard`): white `rounded-2xl border border-gray-200 p-5` card with a `text-3xl font-semibold` value and a 36px circular icon chip top-right. Chip tones stay in-palette: `navy` = powder blue + midnight navy (the brand/AI stat), plus functional `amber` / `emerald` / `gray` tints.
- **Data table** (`RfqTable`): lives inside a white `rounded-2xl border` card with its own header row (title left, filter pills right). `<table>` wrapped in `overflow-x-auto`; header cells `text-[11px] uppercase tracking-wider text-gray-400`; body rows `border-b border-gray-50 hover:bg-gray-50/70 cursor-pointer`. Filter pills: active `bg-[#0F2747] text-white`, inactive `text-gray-500 hover:bg-gray-50`. Paged client-side at 10 rows; the pager footer ("Showing X–Y of Z" + circular chevron prev/next buttons) sits inside the card behind a `border-t border-gray-100`, and only renders when there's more than one page.
- **Buyer avatar**: initials in a `rounded-full bg-[#DCE8F8] text-[#0F2747]` circle (powder blue — buyers arrive via the AI funnel).
- **Search input**: `rounded-full border-gray-200` with a left `Search` icon, focus ring `ring-[#0F2747]/15` — same treatment as the header language selector.
- **Overview canvas**: the overview scroll area uses `bg-[#F7F8FA]` with white cards on top; chat/brief views stay on white.
- **Detail panel** (`BriefSummary`): white `w-80` right column (`border-l border-gray-200`). Header holds a `text-sm font-semibold` title and an inline status pill (no close control — the chat header's back arrow is the only way out of a brief). Sections use sentence-case `text-[13px] font-semibold` headings separated by `border-t border-gray-100` hairlines — optionally with an inline badge (the lead-quality pill sits next to "AI interview quality"). A section can be `collapsible` (currently only "AI interview quality"): the heading becomes a disclosure button with a right-aligned chevron, collapsed by default, badge visible while collapsed. Field rows are a two-column grid: `grid-cols-[92px_1fr]`, label `text-gray-400` left, value `text-gray-800` wrapping right, `text-xs`. Empty fields are omitted, never placeholder'd.

### Loading indicator (agent typing)
- Three small dots in agent bubble, `animate-bounce` with staggered delays (`0.15s`, `0.3s`)

## Animations

- Single easing curve everywhere: `cubic-bezier(0.22, 1, 0.36, 1)`
- `Reveal` wrapper does a 16px y-translate + opacity fade on scroll into view (once-only)
- Accordion uses Radix's height + opacity transitions defined in `globals.css`
- No parallax, no spring physics, no auto-playing carousels

## Accessibility

- All buttons have `aria-label` where the icon alone isn't enough (e.g. send button)
- Enter to submit, Shift+Enter for newline — standard chat UX
- Disabled state visually distinct (`disabled:bg-gray-200 disabled:text-gray-400`)
- Focus rings on all interactive elements use `ring-[#0F2747]`

**TODO:** add focus-visible styles for non-button elements; prefers-reduced-motion check for the loading bounce.

## Dark mode (planned, not built)

- Use Tailwind's `dark:` variants
- Background: `dark:bg-gray-950`
- Text: `dark:text-gray-100`
- Accent: brighten midnight navy slightly for better contrast (`#1D4ED8` itself may become the dark-mode default)

## How to apply when extending

- **Stay within the gray + midnight-blue palette.** Don't introduce new neutral families (slate, stone, zinc).
- **Reuse the variables in `globals.css`** when authoring custom styles. Don't hardcode `#0F2747` in CSS files; use `var(--color-accent)`. Tailwind utilities can keep the hex inline.
- **New visual primitive (modal, dropdown, table) →** add a section to this doc with the canonical pattern before using it twice.
- **New icon →** SVG inline, 14–16px, `stroke-width="1.5"`, `currentColor` for fill/stroke.
- **Status pill that represents AI behavior →** use the powder-blue + midnight-navy combination.
- **Always update `docs/DESIGN_SYSTEM.md` AND `/brand/PALETTE.md` when changing color tokens.**
