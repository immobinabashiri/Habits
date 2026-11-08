# Design system and visual identity

Rewritten after the 2026-11-03 redesign, and updated after the refinement pass the same day. The implementation is the source of truth. Evidence labels are defined in `project.md`.

**Direction:** glassmorphism with restraint. Translucent layers at three depths over a themed backdrop, and text always comfortably readable. Five themes share the same components, so they differ in tokens, not markup.

## Themes

| Theme | Personality | Fonts (body / display) | Radius feel | Backdrop |
|---|---|---|---|---|
| `light` | Warm cream glass, rose and lavender | Plus Jakarta Sans | Soft | Gradient mesh |
| `dark` | Night glass, same family | Plus Jakarta Sans | Soft | Gradient mesh |
| `minimal` | Neutral ink on paper, least glass | Inter | Tight | None |
| `organic` | Deep lagoon, coral and seafoam | Outfit / Fraunces | Large, irregular panels | Animated waves and blobs |
| `kawaii` | Pastels, plum ink, gem mascot | Nunito / Fredoka | Pills | Drifting stars, hearts, clouds |

"System" is also selectable. It resolves to `light` or `dark` and follows live device changes.

## Architecture

| Piece | File | Role |
|---|---|---|
| Registry | `src/lib/theme.ts` | `THEMES` list, get and set, first-paint script |
| Tokens | `src/styles/themes/<id>.css` | Everything a theme defines |
| Primitives | `src/styles/components.css` | Shared classes built only from tokens |
| Backdrop CSS | `src/styles/backdrop.css` | What sits behind the page |
| Backdrop markup | `src/components/layout/theme-backdrop.tsx` | Rendered once from the root layout |
| Tailwind bridge | `src/app/globals.css` | Exposes tokens as utilities, including `rounded-*` and `font-sans` |
| UI | `src/components/layout/theme-toggle.tsx` | `ThemePicker` (Settings), `ThemeMenu` (navbar, sidebar) |

Behaviour:

- `data-theme` on `<html>` is **always a concrete theme**, set before first paint by `themeInitScript`.
- Choice is stored in `localStorage` under `theme` (absent = System), per device, and syncs across tabs. Existing `light` and `dark` values stay valid. Unknown values fall back to System.
- Token selectors are `[data-theme="x"]`, not `:root`, so any subtree can render another theme. The picker's previews use this.
- `User.settings.theme` in the database is unused and still only lists system, light and dark.

### Adding a theme

1. Copy `src/styles/themes/light.css` to `<id>.css` and change the selector and values.
2. `@import` it in `src/app/globals.css`.
3. Add an entry to `THEMES` in `src/lib/theme.ts`.
4. Any new fonts go in `src/app/layout.tsx` with `preload: false`.
5. Check contrast. The picker and menu pick it up automatically.

## Token contract (every theme defines all of these)

- **Colour:** background, foreground, card, popover, field, primary, secondary, accent, muted, border, input, ring, overlay, success, success-soft, warning, destructive, reward, plus their `-foreground` pairs.
- **Glass:** `--glass-1/2/3` (fills), `--glass-border`, `--glass-edge`, `--glass-highlight`, `--glass-sheen`, `--blur-1/2/3`.
- **Elevation:** `--shadow-1/2/3`, `--shadow-primary`.
- **Gradients:** `--gradient-primary`, `--gradient-progress`, `--page-bg`.
- **Shape:** `--r-sm/md/lg/xl`, `--r-control`, optional `--panel-shape`.
- **Type:** `--font-body`, `--font-display`, `--heading-weight`, `--heading-tracking`.
- **Motion:** `--hover-lift`.
- **Theme-only extras:** organic `--wave-*`, kawaii `--charm-*`.

**Never hardcode colours.** At the last audit there were none in any `.tsx`, `components.css`, `backdrop.css` or `globals.css`. Colours live only in theme files, including the kawaii mascot's data-URI.

## Depth

| Level | Class | Use |
|---|---|---|
| 1 | `.surface` (list cards), `.panel` (section cards) | Most content |
| 2 | `.glass` | Navigation, headers, hero cards, auth cards, toasts |
| 3 | `.glass-overlay` | Dialogs; near-opaque |

Add `.surface-interactive` for pointer lift on cards. Do not nest blurred surfaces; inner rows use a plain `border border-border`. Dropdowns use the opaque `bg-popover`, because `backdrop-filter` cannot see past a blurred parent. The mobile drawer is opaque too (`max-lg:bg-card`).

## Shared classes

| Purpose | Classes |
|---|---|
| Layout | `page`, `page-narrow` |
| Type | `type-display`, `type-h1`, `type-h2`, `type-h3`, `type-stat`, `brand` |
| Buttons | `btn` + `btn-primary`, `btn-secondary`, `btn-outline`, `btn-quiet`, `btn-danger`. Height via `min-h-12` for hero CTAs |
| Fields | `field`, with `block min-h-11 w-full`; handles hover, focus, disabled, invalid |
| Controls | `segmented` |
| Icons | `icon-tile`, `icon-bubble` |
| Icon-only buttons | `btn-icon`, plus `btn-icon-danger` for destructive actions |
| Toggles | `switch` on a real checkbox |
| Sliders | `slider` and `slider-value`, normally used through the `Slider` component |
| Feedback | `alert` + `alert-error` or `alert-success`; `toast-in` |
| States | `empty-box`, `skeleton` |
| Progress | `progress-track`, `progress-fill` |

These live in `@layer components`, so any Tailwind utility overrides them. **Put new shared CSS inside that layer.** Unlayered CSS beats utilities such as `lg:hidden`; this caused a real bug during the refinement. The reverse also applies: a layered rule cannot override the unlayered global `:focus-visible`, which is why the slider's focus override sits outside the layer. Body text stays utility-based: `text-sm text-muted-foreground`, `text-xs` for captions.

Semantic colour utilities remain the norm: `bg-primary`, `text-muted-foreground`, `border-border`, `bg-overlay`. There are zero `dark:` utilities.

## Calendar styling (2026-11-06)

- **Tokens:** every theme defines `--cal-event`, `--cal-workout`, `--cal-task`, `--cal-reminder`, `--cal-note`, `--cal-goal`, `--cal-habit`. Each has at least 3:1 against `--card` (checked in all 5 themes). Add them when adding a theme.
- **Classes** (`components.css`): `cal-tone-<kind>` sets `--tone`; `cal-chip`, `cal-block`, `cal-dot`, `cal-filter`, `cal-month`, `cal-cell`, `cal-cell-target` (the day button's hit area is the whole cell), `cal-daynum`, `cal-cols`, `cal-hours`, `cal-now`, `cal-drop-preview`, `cal-ghost`, `cal-habit-meter`, `cal-enter`.
- **Layout:** the Calendar uses `.page.page-wide` (100rem). Side panels sit beside the grid only from 100rem; below that they go under it, in two columns from `md`. Phones get dots in the month grid and one day at a time in the week view.

## Reusable components

| Component | File | Notes |
|---|---|---|
| `Modal` | `ui/modal.tsx` | Native `<dialog>`. Needs a heading `id="modal-title"`; `data-autofocus` on first focus target. Destructive dialogs focus Cancel |
| `ProgressBar` | `ui/progress-bar.tsx` | `value` 0 to 1, required `label`. Display only |
| `Slider`, `SliderField` | `ui/slider.tsx` | Native range input. `ticks` marks points on the track. Themes tune it with `--slider-track`, `--slider-thumb`, `--slider-thumb-radius`. Use `SliderField` for labelled form values |
| `FormField` | `auth/form-field.tsx` | Label, input, error, wired for a11y. Used beyond auth |
| `BarChart` | `stats/bar-chart.tsx` | Plain HTML, `overlay` or `grouped`, table fallback |
| `HabitIcon`, `RewardIcon` | `habits/habit-icons.tsx`, `rewards/reward-icons.tsx` | DB stores a key; unknown keys fall back |
| `StreakGuard`, `FreezeShop` | `dashboard/streak-panel.tsx` | Dashboard and Streaks |
| `HistoryGrid`, `HistoryLegend` | `streaks/history-grid.tsx` | |
| `RewardToasts` | `dashboard/reward-toasts.tsx` | Dashboard only |
| `SettingsCard`, `SaveStatus` | `settings/settings-card.tsx` | |
| `Logo`, `Navbar`, `Footer` | `layout/` | |

Icons: `lucide-react` only, usually `size-4` or `size-5`, `aria-hidden` beside text.

**Picker icons:** `HABIT_ICONS` (24) and `REWARD_ICONS` (25), each with a matching `*_ICON_LABELS` entry for tooltips and screen readers. The database stores the key, so never rename or remove one: only add. Unknown keys fall back to a star (habits) or gift (rewards). Lucide has no running figure, so `run` uses `Activity`, labelled Cardio.

## Interaction and motion

- Buttons lift by `--hover-lift`, press with a slight scale, and fade when disabled. Kawaii adds a small bounce.
- Global `:focus-visible`: 3px `--ring`, offset 2px. Do not remove it.
- Motion is limited to short transitions, progress width, skeleton pulse, toast entry, and slow backdrop drift.
- `prefers-reduced-motion` and the `data-motion="reduce"` setting neutralise all of it.
- `prefers-reduced-transparency` swaps glass for opaque cards.

## Responsive behaviour

Mobile-first with Tailwind's default breakpoints. Below `lg` the sidebar is an off-canvas drawer with content `inert`, scroll lock and Escape to close. At `lg` and up it is sticky, `w-64` or `w-[4.5rem]` collapsed, persisted by cookie. Two-column pages use `grid-cols-[minmax(0,1fr)]` on mobile so long rows cannot force sideways scrolling. Kawaii hides optional charms on small screens.

## Accessibility rules

- At least 4.5:1 for text on all glass levels and on the raw backdrop; 3:1 for field borders and focus rings.
- 44px minimum targets (`btn`, `min-h-11`, `size-11`).
- Colour is never the only signal: calendar states have icons, and charts have a text summary and a table.
- `sr-only` text for icon-only content; `aria-label` includes the item's name.
- Native radios for theme selection, so arrow keys work.

## Verification on 2026-11-03

Run on the production build with a throwaway local database and headless Chrome, with all 5 themes and all 10 page routes.

- No console or page errors; no horizontal overflow at 320, 390, 820, 1024 or 1360px.
- 46 token contrast pairs per theme pass, and worst-pixel backdrop contrast passes.
- Sign-up, complete, undo, purchase, instant switching, persistence, keyboard picker, live System switching and reduced motion all pass.

The refinement pass re-ran all of this and added 46 checks: slider drag and keyboard, tick placement, icon selection and persistence across every display, legacy and unknown icon keys, switches, and the 404 and error pages. A separate check for the thumb's focus ring could not read that pseudo-element, so the ring was confirmed from a zoomed screenshot instead.

**Limits:** Chrome only, so Safari and Firefox are untested. Reduced transparency was checked by token value, not by eye. Screenshots were reviewed as thumbnails for most page and theme combinations.
