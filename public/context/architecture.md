# Architecture

Evidence labels are defined in `project.md`. D-numbers refer to the debt register at the end of this file.

## Summary

A single Next.js App Router application: server-rendered pages plus a JSON API in one deployable, backed by MongoDB. Business logic is layered and independent of React. Outside services: MongoDB, optional Google OAuth, and (since 2026-11-06) the Telegram Bot API, through a webhook in and a cron-triggered dispatcher out. There are no queues or caches. See `docs/TELEGRAM_SETUP_TODO.md` and `docs/CRON_JOBS.md`.

```
Browser  components/*  ->  lib/api/*-client.ts  ->  fetch
                                                     |
Server   app/api/*/route.ts (auth, parse, validate)  |
         app/**/page.tsx (Server Components) --------+--> lib/services/*
                                                            |        |
                                                  lib/domain/*    lib/db/models/*
                                                  (pure rules)    (Mongoose -> MongoDB)
```

Dependency rules actually followed:

- `domain` imports only `domain` and types. It is safe in the browser, and `today-habits.tsx` calls `computeReward` for a live preview.
- `services`, `db` and `connectDB` are marked `server-only`.
- Components never import services or models at runtime. `settings-view.tsx` imports a type only.
- Exceptions to the marker: `lib/auth/auth.ts`, `lib/api/http.ts` and `utils/auth.ts` lack `server-only` (D14).

## Server and client boundary

- Every page in `app/` is a Server Component that checks the session, calls a service **directly** with no HTTP hop, and passes plain data to a view. This gives first-paint data with no loading flash.
- 25 files are `"use client"`. Fully server-rendered views: `stats-view.tsx`, `achievements-view.tsx`, `bar-chart.tsx`, and leaf panels.
- `DashboardShell` is a client component that receives `footer` and `children` from the server layout as props.
- Reads go page -> service. Writes go browser -> `/api/*` -> service. There are **no Server Actions**.

## Client state: four patterns, chosen per page

No global store and no React Context. State is local `useState`, initialised from server props.

| Pattern | Page | After a write |
|---|---|---|
| Whole-state replacement | Dashboard | API returns a full `DashboardData`; `setData` replaces it |
| Local upsert | Habits, Rewards | API returns the changed entity; the list is patched |
| Server re-render | Streaks, Settings | `router.refresh()` |
| URL state, no client JS | Stats (`?range=`), Achievements (`?show=`) | `Link` navigation |

Other client persistence: `localStorage` for theme and reduce motion (`lib/theme.ts`, read with `useSyncExternalStore`; see `ui.md`), and the `sidebar-collapsed` cookie, so the server renders the right width.

**Day rollover:** `DashboardView` checks once a minute and on window focus whether `todayKey(timezone)` changed, then calls `router.refresh()`. Dashboard and Streaks pages use `key={today...}` to reset client state on a new day.

## Key execution flow: completing a habit

1. `HabitRow` (`today-habits.tsx`) validates minutes for timed habits and calls `onComplete`.
2. `DashboardView.run()` sets one global `busy` flag and calls `completeHabitRequest`.
3. `POST /api/habits/:id/completion` runs `respond` -> `requireUserId` -> `parseObjectId` -> `readJson` + `parseOrThrow(completeSchema)`.
4. `completeHabit` (`services/completions.ts`):
   - loads the user and computes today **from the server clock and the user's zone**;
   - loads the owned habit and rejects archived, not started, unscheduled or exempt with `NOT_AVAILABLE_TODAY`;
   - computes the reward with `computeReward`;
   - `saveCompletion`: the unique index is the guard against duplicates. A reversed record is revived rather than re-created;
   - `adjustWallet` ($inc), then `recordTransaction` if gems > 0.
5. `awardProgress` (`services/awards.ts`) rebuilds the dashboard, pays all reached and unpaid milestones, then unlocks achievements. Each award's insert into the unique `(userId, key)` index is the "first one wins" check.
6. Returns `{ dashboard, result }`; the client replaces its state and shows toasts.

Other flows follow the same shape. Purchase: price read, one conditional `findOneAndUpdate` on `wallet.gems >= cost`, `Purchase.create` (refund on failure), ledger entry.

## Consistency model

There are **no MongoDB transactions** in the code. Safety comes from four techniques:

1. Unique indexes as race guards: completions, unlocks, ledger `eventKey`, freeze decisions.
2. Conditional atomic updates, such as `{ "wallet.gems": { $gte: cost } }` with `$inc`.
3. Manual compensation in some paths: refund on failed purchase, return of a freeze, undo rollback.
4. Derived values: streaks, levels and stats are recomputed on read, never stored.

**Risk:** multi-step writes are not atomic, so a crash between steps can leave the wallet and ledger out of step (D6).

## Data model

Fifteen Mongoose models in `src/lib/db/models/`. Every user-owned document has `userId` (`ownerField`). Each file guards against hot-reload re-registration with `models.X ?? model(...)`.

| Model (file) | Purpose | Notable fields | Indexes |
|---|---|---|---|
| User (`user.ts`) | Account and settings | `email`, `name`, `passwordHash` (`select:false`), `settings{theme, reduceMotion, timezone, streakMilestones[]}`, `wallet{gems, totalGemsEarned, totalGemsSpent, xp, streakFreezes}`, `goals`, `seenLevel` | unique `email` |
| Habit (`habit.ts`) | Definition | `name`, `icon`, `category`, `description`, `kind`, `schedule{kind:"weekdays", days[]}`, `xp`, `gems`, `timed`, `startDate`, `exemptDates[]`, `archivedAt` | `(userId, archivedAt)` |
| Completion (`completion.ts`) | One per habit per day | `date`, `minutes`, `xp`, `gems`, `habitName`, `rewardSnapshot`, `completedAt`, `reversedAt` | unique `(userId, habitId, date)`; `(userId, date)` |
| FreezeDecision (`completion.ts`) | Missed-day outcome | `date`, `decision: frozen or broken` | unique `(userId, habitId, date)` |
| TimeLog (`completion.ts`) | Unused, see D9 | `date`, `minutes` | unique `(userId, habitId, date)` |
| Reward (`reward.ts`) | Shop item | `name`, `icon`, `description`, `price`, `category`, `favorite` | `(userId)` |
| Purchase (`transaction.ts`) | Purchase history with snapshots | `kind: reward or streak-freeze`, `rewardId`, `name`, `icon`, `cost`, `quantity`, `note` | `(userId, purchasedAt desc)` |
| Transaction (`transaction.ts`) | Append-only gem ledger | `type`, signed `amount`, `label`, `refId`, `eventKey` | unique `(userId, eventKey)`; `(userId, createdAt desc)` |
| AchievementUnlock (`achievement.ts`) | Achievements and milestones | `key`, `kind`, `title`, `xp`, `habitId`, `unlockedOn` | unique `(userId, key)` |
| CalendarItem (`calendar.ts`) | Event, task, reminder, note or goal; one document per series | `type`, `title`, `notes`, `category`, `priority`, `date`, `allDay`, `startTime`, `endTime` (wall clock), `recurrence{freq, interval, days[], until}`, `reminderMinutes`, `completedDates[]`, `skippedDates[]`, `templateId` | `(userId, date)` |
| WeekPlan (`calendar.ts`) | Weekly priorities | `weekStart`, `priorities[{id, text, done}]` | unique `(userId, weekStart)` |
| TelegramLinkToken (`telegram.ts`) | Pending "Connect Telegram" links | `tokenHash` (SHA-256 only), `expiresAt`, `usedAt` | unique `tokenHash`; TTL on `expiresAt` |
| TelegramUpdate (`telegram.ts`) | Webhook updates already handled | `updateId` | unique `updateId`; TTL 7 days |
| NotificationLog (`telegram.ts`) | Duplicate guard for scheduled messages | `key` (kind + local day, or item + day), `kind`, `status` | unique `(userId, key)`; TTL 60 days |
| PlanTemplate (`calendar.ts`) | Reusable week | `name`, `entries[{weekday, type, title, category, priority, allDay, startTime, endTime, reminderMinutes}]` | `(userId, createdAt)` |

Key formats, which are stored data and must not change:

- Achievements `a1`..`a10`. Do not renumber.
- Milestone unlock `ms:<habitId>:<days>:<runStart>`. `paidMilestoneDays` parses position 2.
- Ledger: `completion:<id>:<completedAt ms>`, `reversal:<id>:<completedAt ms>`, `milestone:<habitId>:<days>:<runStart>`, `purchase:<id>`.

Only gems are in the ledger. **XP has no ledger**: `wallet.xp` is the only total.

## API

All routes use `respond()` and `requireUserId()`, except NextAuth. There are 30 route files in `src/app/api/`.

| Method and path | Body or query | Success |
|---|---|---|
| GET/POST `/api/auth/[...nextauth]` | NextAuth | NextAuth |
| GET `/api/habits` | `?status=active,archived,all` (default active) | `{habits}` |
| POST `/api/habits` | `createHabitSchema` | 201 `{habit}` |
| GET `/api/habits/:id` | | `{habit}` |
| PATCH `/api/habits/:id` | `updateHabitSchema` | `{habit}` |
| DELETE `/api/habits/:id` | | 204 |
| PATCH `/api/habits/:id/archive` | `{archived}` | `{habit}` |
| POST `/api/habits/:id/completion` | `{minutes?}` | 201 `DashboardMutation` |
| DELETE `/api/habits/:id/completion` | undo today | `DashboardMutation` |
| POST `/api/habits/:id/exempt` | `{date}` | `{habit}` |
| DELETE `/api/habits/:id/exempt` | `?date=` | `{habit}` |
| POST `/api/habits/:id/freeze` | `{date, decision}` | `DashboardMutation` |
| GET `/api/rewards` | | `RewardsData` |
| POST `/api/rewards` | `createRewardSchema` | 201 `{reward}` |
| PATCH `/api/rewards/:id` | `updateRewardSchema` | `{reward}` |
| DELETE `/api/rewards/:id` | | 204 |
| POST `/api/rewards/:id/purchase` | `{note?}` | 201 `PurchaseResult` |
| POST `/api/streak-freezes` | `{quantity}` | 201 `DashboardMutation` |
| PATCH `/api/user/profile` | `{name}` | `{name}` |
| PUT `/api/user/milestones` | `{milestones[]}` | `{milestones}` |
| POST `/api/user/password` | `{currentPassword, newPassword}` | `{ok}` |
| POST `/api/user/timezone` | `{timezone}` | `{ok}` |
| POST `/api/user/seen-level` | | `{ok}` |
| PUT `/api/user/habit-order` | `{habitIds[]}` | `{ok}` |
| POST `/api/calendar/items` | `calendarItemSchema` | 201 `{item}` |
| PATCH `/api/calendar/items/:id` | any fields, optional `occurrenceDate` (change one day of a series) | `{item, occurrence}` |
| DELETE `/api/calendar/items/:id` | `?date=` removes one day of a series | `{item}`, or 204 when deleted |
| POST `/api/calendar/items/:id/completion` | `{date}` | `{item}` |
| DELETE `/api/calendar/items/:id/completion` | `?date=` | `{item}` |
| PUT `/api/calendar/week-plans/:weekStart` | `{priorities[]}` (any day names its week) | `{weekPlan}` |
| POST `/api/calendar/templates` | `{name, weekStart}` | 201 `{template}` |
| PATCH `/api/calendar/templates/:id` | `{name}` | `{template}` |
| DELETE `/api/calendar/templates/:id` | | 204 |
| POST `/api/calendar/templates/:id/apply` | `{weekStart}` | 201 `{created[], skipped}` |
| GET `/api/user/telegram` | | `{telegram}` (status and preferences) |
| DELETE `/api/user/telegram` | | `{telegram}` (disconnects, says goodbye in the chat) |
| POST `/api/user/telegram/link` | | 201 `{link: {url, expiresAt}}`, single-use, 10 minutes |
| PUT `/api/user/notifications` | any of `enabled`, `habitReminder`, `incompleteReminder`, `dailySummary`, `calendarReminders` | `{prefs}` |
| POST `/api/telegram/webhook` | Telegram update; header `X-Telegram-Bot-Api-Secret-Token` | `{ok}`; 401 bad secret, 503 not configured, 500 makes Telegram retry |
| GET/POST `/api/cron/notifications` | `Authorization: Bearer CRON_SECRET`; `?dryRun=1&jobs=` | dispatch report |
| GET/POST `/api/telegram/setup` | `Authorization: Bearer CRON_SECRET` | webhook status / registers webhook, commands, descriptions |

No browser client calls `GET /api/habits`, `GET /api/habits/:id` or `GET /api/rewards`; the pages call services directly.

**Error contract** (`lib/errors.ts`, `lib/api/http.ts`): `{ error: { code, message, fields? } }`. `APP_ERRORS` maps each code to status and message. Unknown errors are logged on the server and returned as generic `INTERNAL`, or `SERVICE_UNAVAILABLE` for a Mongo `ServerSelectionError`. Malformed ids, and ids owned by someone else, both return `NOT_FOUND` so they cannot be told apart. `readJson` requires a JSON content type, which also blocks simple cross-site form posts. Clients receive `ApiClientError` (`lib/api/client.ts`).

## Authentication and authorization

- JWT sessions through NextAuth (`lib/auth/auth.ts`), with no custom `pages` and no explicit `maxAge`.
- **Sign-up and login share one Credentials `authorize()`:** an unknown email goes down the sign-up branch and creates the account; a known email is a password check. No dedicated register endpoint exists.
- `jwt` callback stores the database id and provider; `session` callback exposes `session.user.id` and `provider` (`types/next-auth.d.ts`).
- Google provider is conditional on env vars, requires `email_verified`, links by email, and creates a user with a random password hash. **No UI offers a Google button** (D12).
- **Roles:** none. The only authorization is ownership: every query filters by `userId`, which comes only from `requireUserId()`, never from the request.
- **Route protection:** there is no `middleware.ts` or `proxy.ts`. `dashboard/layout.tsx` redirects without a session, each dashboard page re-checks, and each API route calls `requireUserId()`. `/login` and `/signup` do not redirect users who are already logged in.
- Client handling: on code `UNAUTHENTICATED`, components `router.push("/login")`.

## Error, loading and empty states

- `src/app/dashboard/loading.tsx` shows a skeleton during dashboard navigation. `src/app/not-found.tsx` and `src/app/error.tsx` give themed 404 and failure pages. There is no `global-error.tsx`, so a failure in the root layout itself still shows Next's default page.
- Client: `pending` or `busy` flags disable controls and set `aria-busy`; errors render as `role="alert"`. Each list page has a designed empty state.

## Areas requiring extra caution

1. **`computeStreak` loop shape** (`domain/streaks.ts`): the step is computed inside the loop body on purpose, because of a Turbopack mis-compile noted in the comment. Do not "simplify" it into the `for` update clause.
2. **Stored key formats** (above). Changing them breaks exactly-once payouts.
3. **Wallet writes.** Always pair gem changes with a ledger entry, and keep the conditional-update pattern when spending. A test asserts ledger sum equals balance.
4. **DateKey handling.** Never convert a DateKey through local time. Compare as strings; use `lib/domain/dates.ts`.
5. **Reward snapshots.** Completions and purchases deliberately copy names and prices, so history survives edits and deletes.
6. **`getDashboard` is the source of truth** for award decisions. `awardProgress` and `decideMissedDay` depend on its output.
7. **Rule duplication** (D10): auth rules live in two places.
8. **`tests/service.test.ts` wipes the database** (D3).

## Decisions to preserve

- Streaks are always derived, never stored, so undo and freezes cannot desynchronise them.
- The server decides "today"; clients never send a completion date.
- Undo takes back only the completion's XP and gems, and only for today. Paid milestones and achievements are kept.
- Undo is refused when the gems were already spent (`UNDO_BLOCKED`).
- Archive is reversible; delete is permanent but keeps completions, so totals stay correct.
- The server is the final validator. Client validation is only for fast feedback.
- Native `<dialog>` for modals; plain HTML for charts.
- Public DTOs are mapped explicitly (`toPublicHabit`, `toPublicReward`), never by spreading documents.

## Known limitations and technical debt

Severity is my judgement. **None of these have been changed.**

### High

- **D1. Context docs are publicly served.** `public/context/*.md`, including this register, is web-accessible once deployed. Move out of `public/`.
- **D2. `.env` was not git-ignored. Fixed 2026-11-06:** `.gitignore` now ignores `.env` and `.env.*` (except `.env.example`). Rotating the secrets is still needed if a copy was ever pushed. Original note: The env section of `.gitignore` is empty, and `.env` holds real values. A `git init` plus `git add .` would commit the database credentials and auth secret. Add an ignore rule; rotate the secrets if this copy was ever pushed. Whether it was is **Unknown**. **Inferred:** the folder name `Habits-main` looks like a GitHub archive download, so check this.
- **D3. `tests/service.test.ts` drops the database** named by `MONGO_URI` with no safety check, and the current value is remote.
- **D4. No rate limiting on auth.** `RATE_LIMITED` is defined but never thrown, so password guessing is unthrottled. **Unknown** whether a host-level limit exists.

### Medium

- **D5. Email enumeration through raw auth errors.** The `errors.ts` comment promises this cannot happen, but `authorize()` returns `NAME_AT_LEAST` for an unknown email and `INVALID_CREDENTIALS` for a known one. `getAuthErrorMessage` hides the difference in the UI only; the raw code still reaches the client. Sign-up also says the account "may already exist".
- **D6. Non-atomic multi-step writes.** No transactions, and compensation is uneven: `purchaseReward` refunds when `Purchase.create` fails, `buyStreakFreezes` does not.
- **D7. Exempt days behave inconsistently when a day is also completed.** `computeStreak` checks exemption first, so a completed exempt day does not add to the streak. `dayStatus` shows it as exempt. `computeRangeStats` and dashboard `dueToday` count it as done. The dashboard `week` excludes it. So the same day gives different results across screens.
- **D8. Past-affecting edits.**
  - `addExemptDate` accepts any past date from `startDate` on, so a missed day can be exempted for free, bypassing the Streak Freeze cost. **Unknown** whether this is intended.
  - Editing a schedule retroactively changes streaks and history, because evaluation always uses the current `days`. The stated reason `startDate` is not editable ("would silently change streaks") applies equally here.
  - `POST /api/habits` accepts a client `startDate` with no bounds. The UI never sends it.
- **D15. Inconsistent handling of a deleted user with a valid session.** Most pages catch `UNAUTHENTICATED` and redirect; `dashboard/page.tsx` and `habits/page.tsx` do not, so the dashboard page throws and shows the themed `error.tsx` instead of redirecting to login. Any DB outage shows the same page.
- **D16. `TimezoneSync` can overwrite an explicit choice.** It adopts the browser zone whenever the stored value is `UTC`. A user who deliberately selects UTC in Settings is switched back on the next dashboard visit, contradicting the comment "A zone the user already has is never overwritten". Changing zones also shifts "today" with no throttle, which softens the no-backdating guarantee.
- **D17. Test coverage gaps and a misleading test name.** See `stack.md`. The "not scheduled / archived / exempt / foreign" test only exercises unscheduled and foreign.

### Low

- **D9. Dead code and fields.** `TimeLog` is only ever deleted, never written. `SignOutButton`, `toPublicUser` and `PublicUser` have no consumers. `User.settings.theme` and `reduceMotion` are never used (the real values are in localStorage). `User.goals` is never used. Transaction type `adjustment` is never written. Error code `FORBIDDEN` is never thrown. `NavItem.ready` is always true, so the "Soon" branch never renders. `public/*.svg` are unreferenced.
- **D10. Duplicated logic.** Auth constants in `auth.ts` and `rules.ts`. `isDuplicateKeyError` in `auth.ts` and `ledger.ts`. `isValidTimeZone` in `dates.ts` and `models/user.ts`. Date-key validation in `dates.ts` and `schema-helpers.ts`. See also the UI duplicates in `rules.md`.
- **D11. Rule mismatches.** Sign-up requires first and last names of 3+ characters, so short real names like "Li" are refused, while Settings allows a 2-character display name. (The `FreezeShop` copy about "one missed day" was corrected in the redesign.)
- **D12. Google sign-in has no entry point in the UI.** A Google session also hides the password form, even for accounts linked to an existing password.
- **D13. Stale comments and messages.** `connectDB` refers to `.env.example` and `.env.local`, neither of which is used. `src/app/page.tsx` refers to a nonexistent `(public)/layout.tsx`. `types/achievement.ts` says `a1..a11`, while only `a1..a10` exist. `defaults.ts` says the zone is reported "at sign-up"; it happens on dashboard load. `dashboard/layout.tsx` says other pages come "later".
- **D14. Missing `server-only` markers** on `lib/auth/auth.ts`, `lib/api/http.ts` and `utils/auth.ts`.
- **D18. Repeated computation.** One completion can rebuild the full dashboard up to 3 times in `awardProgress`, plus the Achievements page reuses the whole dashboard. `getServerSession` runs in both `page.tsx` and `Navbar` on the home page. Acceptable at current scale (**Inferred**).
- **D19. Streaks page ignores achievement rewards.** After a freeze, `streaks-view.tsx` announces milestones but not achievements that were unlocked; the Dashboard shows both.
- **D20. Stats XP versus total XP.** Stats charts sum completion XP only, while `wallet.xp` also includes achievement XP, so period totals will not add up to the level total. `bestStreak` also looks only at active habits' current streaks.
- **D21. Password change leaves other sessions active.** Stated in the UI, so it is a known behaviour.
- **D22. No i18n.** English and `en-US` formatting are hard-coded throughout.
- **D23. Remaining UI duplication after the redesign.** Helpers listed in `rules.md` are still copied, and the redesign deliberately did not merge them.
