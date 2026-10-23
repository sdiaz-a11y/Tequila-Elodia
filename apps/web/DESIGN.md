# Design system — ELODIA OS (web)

Recorded from the built Sprint 1.5 interface. Tokens live in `src/app/globals.css`; palette is provisional until official brand assets arrive (`docs/BRANDING.md`).

## World

**Black glass + engraved gold.** Surfaces are layered warm blacks; gold is spent only on the active state, the single primary action per surface, and brand moments. Dark only (user decision, 2026-10-22). Mode: Operate, with one brand moment (login).

## Colour (restrained strategy)

| Role          | Token                                      | Value                                         |
| ------------- | ------------------------------------------ | --------------------------------------------- |
| Canvas        | `--background`                             | `#0e0e10`                                     |
| Sidebar       | `--sidebar`                                | `#141316`                                     |
| Panel         | `--surface` / `-secondary` / `-tertiary`   | `#1b1918` / `#242120` / `#2e2a27`             |
| Gold (accent) | `--gold-primary` / `-secondary` / `-deep`  | `#d8b777` / `#b8924f` / `#7d6232`             |
| Text          | `--text-primary` / `-secondary` / `-faint` | `#f5ebdd` / `#b9b1a4` / `#9d968a`             |
| Lines         | `--border` / `-strong`                     | `#38322b` / `#5a4e3c`                         |
| Status        | success / warning / danger / info          | `#7fb285` / `#e0a84f` / `#e07a6e` / `#7fa6c9` |

`--text-faint` is ≥ 4.85:1 on every surface (it was `#8a8377`, 4.26:1 on panels, below AA). Status colours are never gold, so an alert cannot be mistaken for the accent. Primary button text uses `--background` on gold.

## Typography

- **Display**: Cormorant Garamond 500/600 + italic (provisional, pinned in BRANDING.md; closest obtainable face to the bottle lettering). Only for page titles, greeting, wordmark and empty-state moments — never labels, buttons or data.
- **UI / data**: Geist. Fixed rem scale, `tabular-nums` (`.tabular`) for figures and codes.
- Group labels in the sidebar: 11px, uppercase, tracking `0.16em`, `--text-faint`.

## Shape, depth, motion

- Radii: control `0.5rem`, panel `0.875rem`. Panels carry a 1px inner highlight and a soft long shadow (`--shadow-panel`); pop-overs use `--shadow-pop`.
- Motion: 150–250 ms on state changes (`--ease-out-expo`), one shared-layout gold pill that slides between active nav items, grid-row height animation for sidebar groups, pop-in for menus/dialogs. Login alone gets expressive motion: blur-to-sharp bottle entrance, a light sweep clipped to the bottle's own alpha (`.bottle-sweep`), a breathing glow, a damped pointer parallax and a drawn star divider. `prefers-reduced-motion` disables all of it.

## Signature

The **star divider** (hairline · eight-point star · hairline), taken from the divider motif of the official label, drawn as plain SVG — a separator, not the logo. The wordmark is plain text "ELODIA OS" in the display serif; the official logo must not be simulated.

## Components (`src/components/ui`)

Button (primary gold / secondary / ghost / danger / link, `loading` state), Input + Field (label, hint, error with `role=alert`), Card, Badge (neutral/gold/success/warning/danger), Tooltip, Popover, DropdownMenu, Dialog / Sheet / AlertDialog, EmptyState, Skeleton (`.skeleton`, warm shimmer). Command palette (`cmdk`) in `components/shell`.

## Rules

- One gold primary per surface. Active nav = gold tint + ring, not a coloured side border.
- Empty states say what will appear and what unlocks it; no simulated data, ever.
- Modules not built yet are listed (permission-aware) but are `aria-disabled` and explain their ETA via tooltip, palette and dashboard.
- Browser surfaces are themed: selection, caret, autofill, scrollbars, focus ring (`:focus-visible` in `@layer base`, so utilities can override).
- Every interactive element has default, hover, focus, active, disabled and loading/error where relevant.
