# Session hand-off log

**Inferred purpose:** this file was empty, with no stated purpose. Its name suggests conversation notes, so it is used as a short log between sessions. Reassign it if something else was intended. Newest entry first.

## 2026-11-06: Dayfacet branding and Telegram notifications

Again a Royal Motion brief, applied to this app.

- **Name:** **Dayfacet**, chosen from 5 finalists after .com registry checks and web searches (`docs/BRANDING.md`). Trademark clearance and buying the domain are still to do. Only user-facing text changed; package, database and env names are the same.
- **Assets:** a gem mark (`public/brand/`), `src/app/favicon.ico` (16/32/48), `icon.svg`, `apple-icon.png`, a web manifest, an Open Graph image, and a 640px Telegram avatar. The in-app logo uses the same gem.
- **Telegram:** linking, bot commands, webhook, preferences in Settings, and the reminder dispatcher (rules in `features.md`). No new dependencies. One extra, optional, test-only variable: `TELEGRAM_API_BASE_URL`.
- **Env:** `.env` got the 4 new names with empty values (nothing else touched). `.env.example` added. `.gitignore` now ignores env files (resolves D2's ignore half).
- **Cron:** no cron file existed (the expected "cron.job.org" was not in the project). Added `docs/CRON_JOBS.md`: one job, every 5 minutes.
- **Tests:**
  - `tests/notifications.test.ts`: 15/15.
  - End-to-end against a **mock Telegram server**: 89/89, covering branding assets, the unconfigured server, webhook auth, linking (single use, expiry, conflicts), duplicate updates, every command and button, cron auth, time zones, exactly-once under concurrent runs, calendar reminders, 429, blocked chats, disconnect, the preferences API and the setup endpoint. A further check confirmed logs contain no secrets.
  - A real bug found and fixed: Settings crashed when preferences were copied from a Mongoose sub-document.
- **Manual steps left:** everything in `docs/TELEGRAM_SETUP_TODO.md` (BotFather, secrets, deploy, the webhook setup call, the cron job).

## 2026-11-06: Calendar and planning system

`prompt.md` was again written for **Royal Motion**. As agreed before, it was applied to this habit tracker. Royal Motion's workouts and notifications have no counterpart here: workouts became a calendar kind (an event in the `workout` category, with its own colour and icon, that can be checked off), and reminders are in-app only.

- **Built:** `/dashboard/calendar` with Month, Week, Day and Agenda views. Events, workouts, tasks, reminders, notes and goals/important dates. Repeats, one-day changes to a series, check-off per day, overdue tasks, overlap warnings, reminder alerts while the page is open, filters, agenda search, weekly priorities, a week review and reusable week templates. Drag-and-drop rescheduling with mouse and touch. Rules: `features.md` → Calendar.
- **Habits:** read live from the habit system (schedule, exempt days, completions, freezes, custom order), never copied. Checking habits off stays on the Dashboard, where rewards are paid; the calendar links each habit to its record (`habit-card.tsx` got an `id` for that).
- **Data:** three new collections (`CalendarItem`, `WeekPlan`, `PlanTemplate`). Nothing existing changed. Times are wall clock in the user's zone, like DateKeys.
- **Sidebar:** Calendar sits right after Dashboard.
- **Tests:** `tests/calendar.test.ts` 25/25 (run with jiti and the `@/` alias). End-to-end 120/120 on an isolated production build with a throwaway DB, run twice. It covers the API rules, isolation between two users, every view, the form, mouse and touch drag, filters, reminders, the keyboard, time zones, phones and all 5 themes. Earlier suites: regression 20/20, interaction 20/20, reorder 45/45, slider 46/47 (the known invalid check). 5-theme audit: 0 errors. The only findings are the month day buttons, whose real tap area is the whole cell.
- **Not done:** email/push reminders, editing a template's lines (save a week again instead), dragging habits (they follow their schedule), "this and following" edits of a series, a per-item colour picker (colour follows the type).

## 2026-11-06: Habit reordering and sidebar order

- **Asked:** drag-and-drop reordering of habits on the dashboard, saved per user, and a new sidebar order.
- **Data:** a new `habitOrder` field on users (a list of habit ids, default empty). No migration is needed: an empty list means creation order. New habits go to the end, and ids of deleted habits are ignored. `PUT /api/user/habit-order` keeps only the caller's own habit ids, so no user can store another user's ids.
- **Dashboard:** `getDashboard` sorts by the saved order. Only the habits due today can be dragged. Habits not due today keep their slots in the saved order (`mergeSubsetOrder`).
- **Interaction** (`use-drag-reorder.ts`, Pointer Events, no library):
  - A grip handle starts the drag. Only the handle blocks scrolling, so the rest of the row scrolls and clicks as before.
  - While dragging, the row lifts, the other rows slide aside and a dashed slot marks the drop point.
  - The page scrolls near the screen edges. Escape or a cancelled touch puts the row back.
  - On drop, every row glides into its new place.
  - Keyboard and screen-reader users get Move up/down buttons that appear only when focused, and each move is announced.
- **Saving:** the new order shows at once and saves in the background, under the same one-action-at-a-time lock as completions. If the save fails, the old order comes back with an error message.
- **Sidebar:** Dashboard, Achievements, Rewards, Stats, Streaks, Habits, Settings. The brief also listed **"Stickers"**, which does not exist in this app, so nothing was added for it.
- **Tests:**
  - Reorder suite: 44 of 44 pass. It covers mouse drag, touch drag at 390 px, keyboard moves, persistence after refresh, two independent users, the cross-user id filter, validation, anonymous requests getting a 401, complete/undo still working, new habits going last, Escape cancelling, sidebar order and active states, the collapsed rail and the mobile drawer.
  - Earlier suites: regression 20 of 20, interaction 20 of 20, slider/icon/switch 46 of 47 (the known invalid check), and the responsive audit in 5 themes at 320, 390 and 1440 px with no findings.
- **Not done:** the Habits page still lists habits in creation order. The brief scoped reordering to the dashboard. Applying `applyOrder` in `listHabits` would make that page match.

## 2026-11-05: Frontend quality and polish pass

`prompt.md` was written for a different product, **Royal Motion** (a coaching platform with Coach and Student roles, Persian/RTL and a gold accent). None of that exists here. The owner asked for it to be adapted to this habit tracker, so the Coach/Student, Persian/RTL and gold-accent parts were dropped and everything else was applied.

**Status key:** ✅ done · 🟡 partly done · ⬜ not done · 🔍 needs investigation

### 1. Design skills used
- `frontend-design`: dropped template tells (sparkle eyebrow pill above the hero); visual structure must carry information.
- `emil-design-eng` and the `review-animations` standards: motion tokens, strong ease-out, press scale 0.97, never animate from scale(0), origin-aware popovers, hover gated to fine pointers.
- `mobile-native`: tap highlight, `touch-action`, `user-select` on controls, `dvh`, `viewport-fit=cover` and safe areas, `theme-color`.
- `ui-ux-pro-max`: priority order (accessibility, then touch targets, then layout). Its search script was not run: auto mode had blocked it on install.
- Not used: `design-taste-frontend` (built for marketing sites) and `brainstorming` (the owner had already given the brief and said go).

### 2. Pages and modules inspected
- ✅ All 11 routes: home, login, signup, dashboard, habits, rewards, streaks, achievements, stats, settings, 404. The error page was reviewed in code only.
- ✅ Every component in `src/components`: dashboard (6), habits (5), rewards (6), streaks (3), stats (2), settings (6), auth, layout, ui.
- ✅ Rendered at 320, 375, 390, 768, 1024, 1440 and 1600 px in all five themes.

### 3. Main problems found
- **Sideways scrolling at 375 px** on Habits, Rewards and Streaks when a name is long. Grids had no shrinkable base column, so `truncate` text pushed the track wider than the screen.
- **Small touch targets:** filter tabs were 36 px tall and the logo links 28 px.
- **Same control built four times:** the filter tabs were copied with `rounded-full`, which ignored the theme radius (Minimal showed pills).
- **No entrance motion:** dialogs and the theme menu appeared abruptly.
- **Sticky hover on touch:** hover effects were not gated, so a tapped card or button stayed lifted on phones.
- **Weak motion defaults:** a soft easing curve, and the mobile drawer ran on the default curve.
- **`h-screen` on the desktop sidebar** instead of `dvh`.
- **No mobile platform basics:** no tap-highlight fix and no safe-area handling.

### 4. Generic AI-style patterns improved
- ✅ **Cards that weren't buttons** (habit cards, reward cards, home steps) lifted on hover. The lift now only applies to clickable surfaces.
- ✅ **Stat cards:** a row of identical cards was built three different ways (dashboard, streaks, stats). It is now one `StatStrip` surface with hairline dividers.
- ✅ **Hero eyebrow pill** ("Your routines, turned into a calm game" with a sparkle) removed. The headline carries the hero.
- ✅ **Dashboard Achievements panel** listed all 10 locked achievements. It now shows the next 3 and "See all N".
- Kept deliberately: the glass levels, the gradient primary, the numbered "How it works" steps (a real sequence) and the theme backdrops.

### 5. Design system refinements
- ✅ **Motion tokens** in `globals.css`: `--ease-ui`, `--ease-ui-move`, `--ease-drawer`, and `--dur-press`/`--dur-pop`/`--dur-enter`/`--dur-drawer`. `--ease-soft` is kept as an alias. The tokens are named `--ease-ui*` because `--ease-out` would override Tailwind's own token.
- ✅ **New shared classes:** `.segmented-item`, `.popover`, `.stat-strip`, `.fade-in`, `.announce-in`, `.check-mark`.
- ✅ **New component:** `components/ui/stat-strip.tsx`.

### 6. Glassmorphism details
- ✅ **Fewer stacked glass surfaces:** the stat strips replace 13 small glass cards with 3 surfaces.
- ✅ **Theme menu** now uses the dialog-level glass (`.popover`) instead of a flat `bg-popover shadow-lg`, so it matches dialogs in every theme.
- Unchanged: the three depth levels, the per-theme blur and the reduced-transparency fallback.

### 7. Animation fixes and additions
- ✅ **Dialogs** fade and rise 8 px (240 ms) with a fading backdrop, using `@starting-style` with no JavaScript. They stay centred. Exits are instant on purpose.
- ✅ **Theme menu** grows from its trigger: bottom-left in the sidebar, top-right in the navbar (180 ms).
- ✅ **Mobile drawer** uses the drawer curve at 320 ms, and the scrim fades in.
- ✅ **Habit check mark** pops in on completion. The circle scales to 0.95 on press.
- ✅ **Level-up banner** has a small entrance; it is rare, so it is allowed to be noticed.
- ✅ **Feedback timing:** buttons press to 0.97 and use 140 ms feedback. The progress fill shortened from 500 to 400 ms.
- ✅ **Hover gating:** all hover transforms are behind `(hover: hover) and (pointer: fine)`, including Kawaii's bounce and the slider thumb.
- ✅ **Reduced motion** (system setting or app setting) still removes all of it. Tested on the dialog.
- ⬜ **Theme-change crossfade (View Transitions)** was built, then removed. During the transition the new theme lagged and a quick second click was lost, so the change stays instant. `theme.ts` is back to its original.

### 8. Responsive improvements
- ✅ **No sideways scrolling:** grids get `grid-cols-1` as a base (habits, rewards, streaks, stats, achievements, home, signup, loading).
- ✅ **Filter tabs** stretch evenly below 480 px.
- ✅ **Streak summary** fits 3 across on phones instead of 3 stacked cards.
- ✅ **Safe areas:** sticky headers, the drawer and toasts pad around the notch and home bar.
- ✅ **Sidebar height** uses `100dvh`.

### 9. Component-level improvements
- ✅ **Segmented control:** one class with 44 px items and the theme radius.
- ✅ **Logo links** are now 44 px tall.
- ✅ **Buttons:** `nowrap` so labels never break mid-word.
- ✅ **Reward card:** when you can't afford a reward, a savings bar and "N more gems to go" sit above the Buy button.

### 10–11. Coach and Student interfaces
- Not applicable: this app has a single user role. Each of its own flows was reviewed separately: daily check-in, habit management, reward shop, streak rescue, stats and settings.

### 12. Accessibility improvements
- ✅ **Touch targets:** all at least 44 px. The audit found no smaller ones.
- ✅ **Unchanged where already right:** focus rings, dialog focus placement, Escape handling and drawer focus return were kept and re-tested.
- ✅ **Savings bar** is a labelled `progressbar`.
- ✅ **Button labels** can't be selected by long-press; body text stays selectable.

### 13. Testing and validation
- **Setup:** an isolated production build with no `.env`, a throwaway in-memory database and Chrome via puppeteer. **The real database was never contacted.**
- **Responsive audit:** 5 themes × 11 pages × 6 widths. No overflow, no undersized targets, no clipped controls, no console errors.
- **Regression:** 20 of 20 pass (sign-up, complete and undo, purchase, theme switching and persistence, backdrop contrast).
- **Slider, icon and switch suite:** 46 of 47 pass. The failure is the known invalid check (the test can't read styles on the slider thumb).
- **Interaction:** 20 of 20 pass (dialog and menu entrances, drawer curve and focus return, check mark, segmented keyboard use, reduced motion).
- **Static checks:** `tsc` and ESLint on `src` are clean.
- **Scope:** no files in `lib/`, `types/`, `utils/` or `app/api/` changed, and `package.json` is unchanged.

### 14. Remaining issues and limits
- 🔍 **Browsers:** only Chrome was tested. `@starting-style` needs Safari 17.5+ and Firefox 129+; older browsers simply skip the entrance.
- 🔍 **Real devices:** safe areas, tap delay and sticky hover need checking on a phone. Chrome's emulation cannot reproduce them.
- 🟡 **Progress fill** still animates `width` rather than `transform` (small and infrequent, so it was left).
- ⬜ **Exit animations** for dialogs and toasts were left out deliberately.
- ⬜ **Older audit items** are still open: `.env` not in `.gitignore`, `public/context/` publicly served, `tests/service.test.ts` dropping the remote database, no login rate limiting.
- ⬜ **Skills folder:** the installed skills in `.claude/` make `npm run lint` fail and are scanned by Tailwind. This is waiting on the owner's decision about git.

## 2026-11-03: Refinement pass

- **Asked:** `prompt.md` became a refinement brief: leftover legacy components, better sliders, at least 15 icons each.
- **Key finding:** the app had **no slider at all**. Added a real one (habit XP and gems, timed-habit minutes), made checkboxes into switches, and polished progress bars, to cover what the brief could have meant. Worth confirming with the owner.
- **Also added:** 24 habit and 25 reward icons with no data changes; themed 404 and error pages; `btn-icon`; themed select; chart table polish.
- **Testing:** an isolated copy with no `.env` and a throwaway database, because the owner's dev server was running on this project on port 3001 and was left alone.
- **Self-inflicted bugs found by looking at screenshots, all fixed:** unlayered CSS exposed the drawer's close button on desktop; a slider focus rectangle; bonus ticks stacked behind the thumb.

## 2026-11-03: Full redesign

- **Asked:** `prompt.md` was replaced with a redesign brief: glassmorphism and five themes, on the existing architecture.
- **Done:** token files per theme, shared primitives, theme registry, picker and menu, decorative backdrop, dashboard loading skeleton, landing page rebuild, navbar and footer on auth pages. No dependencies were added.
- **Bugs fixed along the way:** mobile dashboard overflow, snowflake icon invisible in dark mode, "Spent" bars low-contrast in dark themes, misleading Streak Freeze copy.
- **Testing:** used a throwaway in-memory MongoDB. **The remote database in `.env` was never contacted.** Results are in `ui.md`.
- **Not touched:** the debt register items in `architecture.md`, including `.env` not being ignored and this folder being public.

## 2026-11-03: Initial onboarding

- **Asked:** run `prompt.md`, a documentation-only audit of the project.
- **Done:** read all of `src/` and `tests/`, plus configuration. Filled the 9 empty context files. No new files were created. `prompt.md` was left unchanged.
- **Checks:** ESLint reported no problems. `tsc` reported only the `LayoutProps` error caused by the missing generated types.
- **Deliberately not run:** `next build` and the dev server (they write to the project), and the tests (`service.test.ts` wipes the remote database in `.env`).
- **Secrets:** `.env` was read for key names and the host type only. No values were printed or recorded.
- **Next session should read:** `project.md`, then `current-task.md`.
