# Design System

The site reads as an engineering drawing: pale drafting film, ink linework, square panels, machine-paint yellow for the one primary action, and red pencil only where something is being marked up in the app. One typeface at three widths.

The marketing pages (redesigned November 2026) aim for "a trusted machinery trading company with good technology", not an AI startup: whitespace and rules instead of boxed cards, one dark (navy) section per page, a faint grid only in the hero, no decorative numbers, badges or scribbles, one CTA label per destination ("Start a request", "How it works", "Sign in").

The canonical color reference for the whole company lives at [`/brand/PALETTE.md`](../../brand/PALETTE.md). What follows is how those tokens are used inside the frontend.

## Palette: Drafting Sheet

Tokens are defined once, in the `@theme` block of `app/globals.css`, and are available as normal Tailwind utilities (`bg-paper`, `text-ink`, `border-rule`, `bg-ink/10`, ...). Do not write hex values in class names.

| Token | Hex | Use |
|---|---|---|
| `paper` | `#E7EBE6` | Page canvas, sidebars, bands inside a card |
| `sheet` | `#F6F8F4` | Panels, cards, modals, the chat column |
| `white` | `#FFFFFF` | Inputs, chips, incoming chat bubbles |
| `ink` | `#0E2440` | Text, linework, borders, selected states |
| `ink-soft` | `#485B72` | Secondary text |
| `rule` | ink at 16% | Quiet dividers |
| `rule-strong` | ink at 50% | Dividers inside panels, section rules |
| `paint` | `#FFC62B` | Primary actions, the "fix" marker, human-step tags |
| `blueprint` | `#143A82` | The Merchant of Record sheet, focus rings, soft AI/status tints (`bg-blueprint/12`) |
| `redline` | `#D5362B` | Risk markup only. 3.97:1 on paper, so large bold text and strokes only |

**Neutrals.** The default `gray-*` scale is remapped in `@theme` to ink mixed over sheet (`gray-900` is ink, `gray-600` is ink-soft, `gray-200` is a divider tone). Existing `gray-*` classes therefore follow the theme. Do not introduce slate, zinc or stone. `text-gray-400` is about 3.6:1 on sheet: fine for large text and decoration, not for small body text.

**Surface rule.** paper for the page, sheet for anything that sits on it, white for the things you type into or tap. A card inside a sheet panel uses white or a paper band, never another sheet.

**Semantic status colors** (emerald, amber, red) stay, with three adjustments for the new surfaces: pale pill fills carry `ring-1 ring-inset` in the matching 700 shade at 30%; small status text uses the 700 shade; status dots use `amber-600` (not 400, which reads as brand yellow) and `blueprint` instead of blue.

There is no dark mode.

## Shape

- Panels, cards, modals: square (`rounded-none`) with `border-[1.5px] border-ink`. Quieter inner cards use `border border-rule-strong`.
- Controls (buttons, inputs, selects, segmented controls): `rounded-sm`, which is 3px (`--radius-sm`).
- `rounded-full` only for dots, avatars, badges, status pills and suggestion chips.
- No soft drop shadows on cards. The AuthModal keeps one restrained shadow.

## Buttons (`components/ui/button.tsx`)

All variants: `rounded-sm`, 2px border, `font-bold type-title`, focus `ring-2 ring-blueprint`.

| Variant | Rest | Hover | Use |
|---|---|---|---|
| `primary` / `accent` | `bg-paint`, ink border and text | ink wipes up from the bottom edge (`btn-wipe`), text turns paint | The main action on a surface |
| `secondary` | transparent, ink border and text | same wipe, text turns sheet | Side actions |
| `ghost` | no border, `text-gray-700` | `bg-ink/10` | Tertiary actions |

Hand-rolled primary buttons (composer send, "New sourcing request") mirror the primary classes: `rounded-sm border-2 border-ink bg-paint text-ink btn-wipe hover:text-paint`. `buttonVariants` lives in a client module, so a server component cannot call it; pass a size or variant prop into a client component instead (see `LoginTrigger`'s `buttonSize`).

## Typography

- **Font:** Archivo variable with the width axis (`next/font/google`, `axes: ["wdth"]`, in `app/layout.tsx`). CJK and Arabic fall back through `system-ui` to the platform fonts.
- **Three widths**, as `@utility` helpers in `globals.css`. They set width and tracking only; pair each with a weight utility so tailwind-merge keeps resolving weight conflicts.
  - `type-display` (125%): headlines and the wordmark. Pair with `font-extrabold`.
  - `type-title` (112%): card titles, button labels, panel headers. Pair with `font-bold`.
  - `type-data` (78%, tabular numerals): small labels, tags, meta, spec data. Pair with `font-semibold` or `font-bold`.
- **Marketing sizes** live in `components/landing/styles.ts`, fluid via `clamp()`: `H1` 36 to 60px bold, `H2` 28 to 44px semibold, `H3` 19 to 23px semibold (balanced wrap), `LEAD` 17 to 20px, `BODY` 16px at 1.65 line height, `LABEL` 13px condensed. Measure is capped at roughly 58 to 62ch.
- **Wordmark:** `components/layout/Wordmark.tsx` (typeset "Nexcierge"). No logo file exists yet.
- Body feature settings: `'rlig', 'calt'`.

## Spacing and layout

- Marketing container: the `wrap` utility (max 1320px, `--gutter` = `clamp(20px, 5vw, 72px)`: 20px phones, ~40px tablets, 64 to 72px desktop). Chat content stays `max-w-2xl`.
- The marketing header is fixed at `--nav-h` (60px). An inner page's first section uses `PAGE_TOP` (or `PageHero`, which includes it).
- Section rhythm on marketing pages: one token, `--section-y` = `clamp(48px, 5.5vw, 80px)` (about 70px on a laptop), used as both top and bottom padding by `SECTION` and as the bottom padding of the heroes, so every gap between sections is identical. Only a page's first section is taller (it also clears the fixed header).
- Dividers: every light section that follows another light section starts with `<SectionRule />` (a `rule-strong` hairline across the content width with small end ticks, `.section-rule` in globals.css). The navy section takes none, and neither does the section after it (`ClosingCTA divider={false}` on the homepage): the colour edge is the divider. Lists inside a section use `divide-y divide-rule` (inner rules only) so a row rule never doubles the section divider.
- Surfaces: marketing pages sit on `bg-sheet` (the warm off-white) throughout; the only band is the navy section. `bg-paper` is used inside components (the assistant's greeting bubble). The app (chat, dashboard) stays on paper.
- Backgrounds: `bg-drafting` (faint 96px grid on sheet, fading out at the bottom; page heroes), `bg-navy-grid` (ink with a 3.5% white grid; the one dark marketing section), `bg-cyanotype` (blueprint grid, currently unused), `bg-ruled` (ruled lines behind chat logs).

### Mobile-web safe areas

- `app/layout.tsx` exports `viewport: Viewport` with `viewportFit: "cover"` so iOS extends content under the dynamic island and home indicator. The `pt-safe` / `pb-safe` / `pl-safe` / `pr-safe` utilities in `app/globals.css` carve the unsafe regions back out. Use them on any fixed-position chrome that touches a viewport edge: the chat header (`pt-safe`), the composer footer (`pb-safe` on a wrapper, **not** on the same element as the base `py-*`, since `max(env(...), 0px)` collapses to 0 on non-iOS), the mobile drawer, and the AuthModal overlay.
- Chat shell uses `h-[100dvh]` rather than `h-screen` so iOS Safari's collapsing URL bar doesn't push the composer behind the home indicator.
- `ChatSidebar` is a mobile drawer below `md:` and an inline column at `md:` and above; at `md:` it can collapse to a 56px icon rail.

## Component patterns

### Segmented control
`SEG` / `SEG_BTN` in `components/landing/styles.ts`: `rounded-sm border border-rule-strong`, segments divided by `border-rule`, 40px tall, the pressed segment (`aria-pressed`) is ink with sheet text; wraps rather than overflowing. Used for the assistant console's language pickers and the dashboard table filter. Where a filter must wrap on phones (the Why page's order activity), use text tabs with a paint underline on the pressed tab instead.

### Labels instead of tags
The marketing pages no longer use boxed tags (the old `TAG` primitive was removed). Who handles a step, or what kind a record is, is set as a plain `LABEL` (13px condensed, ink-soft); the order-activity preview adds a small dot per kind (ink = message, outline = document, paint = payment). The app's own panels keep their existing tag styling.

### Chat input (`ChatComposer`)
- `rounded-sm border-[1.5px] border-ink bg-white`, `resize-none`.
- Send button: the paint primary recipe, square, bottom-right. Enter sends, Shift+Enter is a newline.

### Suggestion chips
`rounded-full border-[1.5px] border-ink bg-white`, hover `bg-paint`.

### Message bubbles (`MessageBubble`)
- Incoming: `bg-white border border-ink text-ink rounded-[2px_12px_12px_12px]`.
- The viewer's own: `bg-ink text-sheet rounded-[12px_2px_12px_12px]`.
- Error: white with a 1.5px `redline` border.
- **AM dashboard, AI messages** keep the ink "house" bubble with the incoming corner shape, so they group with the Nexcierge side and stay distinct from the buyer's white bubbles (`isAiInAmView`; `AgentMarkdown`'s `dark` prop re-themes links to `text-paint`).
- `max-w-[88%]`; plain (self) bubbles are `whitespace-pre-wrap`, agent bubbles render markdown.

### Brief card (`ProfileSummaryCard`)
1.5px ink border, white body, paper header and footer bands. White rather than sheet because it sits in the sheet chat column next to white bubbles.

### Buyer app shell (`/chat`)
- **Sidebar status nav:** folder-style rows (lucide icon, label, count badge). Selected = ink fill, sheet text, icon and count badge turn paint (the dashboard nav recipe). Below it a small search input (`border-rule-strong`, ink on focus) and the request list under `type-data` recency headings.
- **Collapsed rail:** `w-14` paper column of 36px icon buttons: expand, the paint New request square, a hairline, then the four status filters (selected = ink fill, paint icon).
- **Workspace tabs:** underline tabs in the chat header (`border-b-2`; selected = ink border + ink text, rest = transparent + `ink-soft`, hover `rule-strong`). Count badges are `bg-ink/10` pills; an item needing the buyer's action (pending payment) uses the amber status pill. Tabs, not the segmented control, because they switch the whole panel rather than filter a list.
- **Order-file lists** (Documents, Payments tabs): a 1.5px ink panel on `bg-paper`, one row per record with a tag (no fill = document, paint = payment), the name, `type-data` meta, and the row action on the right. Payments add a paper summary band (Outstanding total) above the list. Empty states are a dashed `rule-strong` box with an icon chip and one sentence.
- **Pay now** is the paint primary recipe; it is the surface's one paint action as long as one link is pending.

### Active and selected states
- Chat sidebar rows: a 3px paint left bar on a sheet row (an ink fill would hide the status dot).
- Dashboard nav and the current stage row: ink fill with sheet text; the nav's icon and count badge turn paint.

### Dashboard primitives (`components/dashboard/`)
- **Stat card:** `border-[1.5px] border-ink bg-sheet p-5`, a `type-data` label and a `type-title text-3xl` value.
- **Table (`RfqTable`):** inside a sheet panel; header cells in `type-data`; the filter is a segmented control.
- Small dashboard inputs and selects use `border-rule-strong` and go ink on focus; full-size inputs use the 1.5px ink border.

### Sourcing progress timeline
Vertical 8-step timeline (`SourcingProgressRail` buyer-side, `StageSection` for the AM). Done = ink dot with a check, current = ink ring, upcoming = hollow. Stage order and slugs come from `lib/sourcingStages.ts`.

### Loading
- Typing indicator: three dots using the `blip` animation, shown only until the first streamed token.
- Skeletons (`ChatShellSkeleton`, `app/dashboard/loading.tsx`): `animate-pulse` bars in `bg-ink/10` on the real page's frame. Static and hook-free.

## Landing-page primitives (`components/landing/`)

- `PageHero`: inner-page opening (h1, lead, optional action row) on `bg-drafting`.
- `ArrowLink`: the secondary "learn more →" text link (44px tall hit area; `tone="light"` on navy).
- `ClosingCTA`: the shared closing invitation (`placement` sets the PostHog `cta` tag; `secondary` swaps the trailing link).
- `Risks` (homepage): the usual chain (You, Agent, Trader, Factory) with the middlemen struck through in redline, the Nexcierge row on the same grid, then three columns: risk name circled in red pencil, one muted line, the fix under a 3px paint rule. Redline is used only here on the marketing pages, for marking up what goes wrong.
- `MorFlow` (Why Nexcierge page only; the homepage uses the chain diagram instead): You → Nexcierge → Manufacturer. A container query (`@[34rem]`) switches it from vertical to horizontal, so it never shrinks labels or scrolls sideways. `tone` dark/light, `showFlows` adds the paperwork labels.
- `InView`: one-shot fade-up on scroll (`kind="reveal"`). See Animations.
- `rig/`: the hero's three.js machine drawing (`HeroRig` shell, `engine.ts`, `terms.ts`). The engine holds four models (0 excavator, 1 filling machine, 2 lab centrifuge, 3 CNC vertical machining centre); the hero shows the CNC (`MACHINE` in `HeroRig.tsx`, one-line switch) with two callouts, spindle speed and table size. The CNC is drawn without an enclosure so its axes read, and its pose runs a pocketing cycle: the head plunges (Z), the table traces a rectangle under the spinning tool (X on the table, Y on the saddle), then retracts. The engine takes `start` (which model is drawn first), `anchorIndex` (which model anchors the callouts point at) and `cycle` (off: no machine cycling); its surface colour matches sheet so the drawing reads as linework, and its floor grid is drawn at 45% opacity.
- Copy lives in `lib/landingContent.ts`, never inline in components.

## Animations

- **Nothing server-renders hidden.** Entrances are CSS animations, not framer-motion `initial` props, so content is visible without JS.
  - Above the fold: `.hero-in` (a short fade and lift) runs at first paint.
  - Below the fold: `<InView>` sets `data-reveal` to `pending` only if the element is still below the viewport at mount, then `run` when it arrives. The keyframes are in `globals.css` under `prefers-reduced-motion: no-preference`.
  - The homepage risk names keep their red-pencil circle (`.scribble`, an SVG path that draws itself once when its column is revealed). The headline "plot" wipe, sheet-rule draw-in, animated MoR flow lines and the pinned process roll were removed in the redesign; their CSS is gone too.
- **Sticky hero (homepage).** The hero is `position: sticky` and the Risks section (in its own `relative z-[1] bg-sheet` wrapper) slides up over it like a sheet laid on top, its divider rule as the leading edge; the machine keeps cutting until it is covered. `HeroRig` sets the hero's `top` to `min(0, viewport height - hero height)`, so a hero taller than the screen (phones) pins only once its bottom edge, where the drawing is, is on screen. The sticky range is only the Hero + Risks wrapper, so the hero then scrolls away and its canvas stops rendering. A background version (drawing pinned faintly behind the whole page) was tried and dropped.
- **Hero rig.** Loaded with a dynamic `import()` on idle; renders only while on screen and the tab is visible; disposes its WebGL context on unmount. Without WebGL the two callouts show as plain spec boxes.
- No smooth-scroll library. `scroll-behavior: smooth` is set in CSS for motion-allowed users, with `data-scroll-behavior="smooth"` on `<html>` so Next 16 still jumps instantly on route changes.

## Accessibility

- Focus: `focus-visible:ring-2 ring-blueprint` (paint on the blueprint sheet).
- Toggle buttons use `aria-pressed`; live regions (`aria-live="polite"`) announce diagram and scope changes.
- Decorative drawings (rig canvas, step icons, route stepper) are `aria-hidden`; the adjacent text carries the meaning.
- All motion respects `prefers-reduced-motion`.
- The phone dock is `inert` while off screen.

## How to apply when extending

- **Use tokens.** No hex in class names, no new neutral families.
- **Follow the surface rule** (paper, sheet, white) and the shape rule (square panels, 3px controls).
- **One paint action per surface.** If two things are yellow, one of them should be `secondary`.
- **Redline is for risk markup only**, never for errors (errors use the red scale) or emphasis.
- **New visual primitive** (modal, dropdown, table): add a section here before using it twice.
- **New icon:** inline SVG or lucide, `stroke-width="1.5"`, `currentColor`.
- **Always update this file AND `/brand/PALETTE.md` when changing color tokens.**
