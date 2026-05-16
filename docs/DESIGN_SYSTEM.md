# Design System

The aesthetic is intentionally minimal — closer to Claude.ai / ChatGPT than to a SaaS landing page. Chat is the centerpiece; marketing copy is sparse.

## Colors (Tailwind classes)

| Role | Class | Notes |
|---|---|---|
| Page background | `bg-white` | Single mode for now; dark mode planned |
| Primary text | `text-zinc-900` | Near-black |
| Secondary text | `text-zinc-600` | Less emphasis |
| Tertiary / placeholder | `text-zinc-400` / `placeholder-zinc-400` | |
| Subtle borders | `border-zinc-100` (lighter) / `border-zinc-200` (standard) | |
| User message bubble | `bg-zinc-900 text-white` | Dark accent for the buyer's voice |
| Agent message bubble | `bg-zinc-100 text-zinc-900` | Light gray |
| Primary action (send) | `bg-zinc-900 text-white` (hover: `bg-zinc-700`) | |
| Disabled action | `bg-zinc-200 text-zinc-400` | |

**No color accent yet.** When we add one (CTAs, links), it should be a single muted accent — not multiple. Likely deep navy or warm gray.

## Typography

- **Font:** Geist Sans (loaded via `next/font/google` in `app/layout.tsx`)
- **Mono:** Geist Mono (loaded but not currently used)
- **Hero h1:** `text-4xl sm:text-5xl font-semibold tracking-tight`
- **Body:** default size (1rem) with `leading-relaxed` in chat bubbles
- **Subtle / meta:** `text-sm text-zinc-500` or `text-sm text-zinc-600`
- **Brand wordmark:** `font-semibold tracking-[0.18em] text-sm` (uppercase NEXCIERGE)

## Spacing

- Page max-width: `max-w-6xl` for header, `max-w-2xl` for chat content
- Vertical rhythm: `mb-3` (hero title → subtitle), `mb-10` (subtitle → input), `space-y-5` (between message bubbles)
- Padding around chat input: `px-5 py-4` for empty-state, `px-5 py-3` for active-state
- Chip group: `gap-2` between chips, `mt-6` from input

## Component patterns

### Chat input
- Rounded `rounded-2xl` textarea with `resize-none`
- Border `border-zinc-200` → focus `border-zinc-400` (no ring)
- Send button absolutely positioned bottom-right, circular, fires on Enter (Shift+Enter for newline)
- Up arrow SVG icon (not paper plane — feels more "submit" than "send")

### Suggestion chips
- Pill: `rounded-full px-3 py-1.5 border border-zinc-200`
- Hover: subtle `bg-zinc-100` + text darkens to `zinc-900`
- Fire the same `sendMessage()` as form submit

### Message bubbles
- `max-w-[85%]` so long messages don't span full width
- `rounded-2xl px-4 py-3`
- `whitespace-pre-wrap` to preserve linebreaks from the agent

### Loading indicator (agent typing)
- Three small dots in agent bubble, `animate-bounce` with staggered delays (`0.15s`, `0.3s`)

## Animations

Use Tailwind defaults: `transition-colors`, `animate-bounce`. No custom keyframes yet.

## Accessibility

- All buttons have `aria-label` where the icon alone isn't enough (e.g. send button)
- Enter to submit, Shift+Enter for newline — standard chat UX
- Disabled state visually distinct (`disabled:bg-zinc-200 disabled:text-zinc-400`)

**TODO:** add focus-visible styles, prefers-reduced-motion check for the loading bounce.

## Dark mode (planned, not built)

- Use Tailwind's `dark:` variants
- Background: `dark:bg-zinc-950`
- Text: `dark:text-zinc-100`
- Toggle via `prefers-color-scheme` initially; manual toggle in header later

## How to apply when extending

- Stay within the zinc scale — don't introduce new gray/neutral families
- New visual primitive (modal, dropdown, table) → add a section to this doc with the canonical pattern before using it twice
- New icon → SVG inline, 14–16px, `stroke-width="1.5"`, `currentColor` for fill/stroke
- **Always update `docs/DESIGN_SYSTEM.md` when changing color tokens, spacing rules, or component patterns.**
