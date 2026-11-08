# Features and business rules

Everything listed here is implemented, unless marked otherwise. Evidence labels are defined in `project.md`. Constants live in `src/lib/domain/defaults.ts`; change them there only. D-numbers refer to `architecture.md`.

## Routes

| Route | Access | Page content |
|---|---|---|
| `/` | Public | Landing page: hero, "How it works", navbar, footer |
| `/login`, `/signup` | Public | Credentials forms |
| `/dashboard` | Session | Today's habits and overview |
| `/dashboard/calendar` | Session | Calendar and planning, `?view=month,week,day,agenda&date=YYYY-MM-DD` (default month around today) |
| `/dashboard/habits` | Session | Manage habits |
| `/dashboard/rewards` | Session | Reward shop and purchase history |
| `/dashboard/streaks` | Session | Per-habit streaks and calendars |
| `/dashboard/achievements` | Session | Achievements, `?show=all,unlocked,locked` |
| `/dashboard/stats` | Session | Charts, `?range=7,30,90` (default 30) |
| `/dashboard/settings` | Session | Profile, time zone, bonuses, appearance, password |

## Accounts

- Sign-up: first and last name 3+ characters each, combined at most 50 and stored as a single `name`. Valid email at most 254. Password 8 to 128.
- Signing up with an existing email and its correct password simply logs in; the entered name is ignored.
- New users get default milestones and the `UTC` zone. The dashboard then adopts the browser's zone (`TimezoneSync`).
- Google sign-in exists on the server only (D12).

## Habits

Files: `services/habits.ts`, `validation/habit.ts`, `components/habits/*`.

- Fields: name (at most 60), icon key (24 options), category (at most 40, default "Other"), description (at most 300), kind, weekday schedule (at least 1 unique day), XP (0 to 25, default 10), gems (0 to 100), optional timed settings.
- At most 100 habits per user, **including archived**. A race may exceed it by one; a comment accepts this.
- `startDate` defaults to today and cannot be edited.
- **Core habits always have gems = 0**, enforced in `createHabit`, `updateHabit` and again in `computeReward`.
- Archive pauses a habit and keeps history. It can be restored.
- Delete is permanent. It removes the habit, TimeLogs and FreezeDecisions, and **keeps Completions**, so totals stay right.
- Habit list sends all habits; the Active and Archived tabs filter on the client.
- Monthly schedules do not exist. Comments say one may be added later.

**Timed habits:** `targetMinutes` is the minimum; every full `unitMinutes` beyond it is one bonus block, capped at 4 (`MAX_BONUS_UNITS`), each paying `extraXpPerUnit` and, for bonus habits, `extraGemsPerUnit`. Minutes per day at most 1440.

**Exempt days:** from `startDate` to today + 366 days, at most 366 dates. A habit cannot be completed on an exempt day. Past dates are allowed (D8).

## Daily completion

Files: `services/completions.ts`, `domain/progress.ts`, `components/dashboard/today-habits.tsx`.

- Only for **today**, computed by the server in the user's zone.
- Rejected when archived, before `startDate`, unscheduled or exempt (`NOT_AVAILABLE_TODAY`), or already done (`ALREADY_COMPLETED`).
- Timed habits require minutes at or above the minimum. The dashboard slider runs from the minimum to where the last bonus block is earned, with a mark per block. The number box still accepts longer times.
- Pays XP and gems; records a ledger entry only if gems > 0.
- Stores a reward snapshot and habit name on the completion.
- **Undo:** today only. Takes back that completion's XP and gems. Fails with `UNDO_BLOCKED` if the balance no longer covers them. Milestones and achievements already paid are kept. The record is revived if completed again.

## Levels

`domain/progress.ts`: XP needed to reach level L is `50 * L * (L - 1)` (L2 = 100, L3 = 300, L4 = 600, L5 = 1000). The level is derived from `wallet.xp`, never stored. `seenLevel` tracks the last level announced; the banner's "Nice" button acknowledges it through `/api/user/seen-level`.

## Streaks

Files: `domain/streaks.ts`, `services/streak-overview.ts`, `components/streaks/*`.

`computeStreak` walks backward from today over at most 400 days (`STREAK_LOOKBACK_DAYS`), stopping at `startDate`:

| The day is | Effect |
|---|---|
| Not scheduled, or exempt | Skipped, never breaks |
| Completed | Counts +1 |
| Today, not done yet | Skipped, the day is still open |
| Missed, decision "frozen" | Skipped, keeps the run, adds nothing |
| Missed, otherwise | The streak ends here |

Calendar: last 42 days (`STREAK_HISTORY_DAYS`), statuses `done, missed, frozen, exempt, open, off`, Monday first. `longest` is computed inside the look-back window only.

## Streak Freezes

Files: `services/streak-freezes.ts`, `components/dashboard/streak-panel.tsx`.

- Price 50 gems each, hold at most 5.
- A missed day is offered as `pendingFreeze` only when it is within the last 3 days (`FREEZE_WINDOW_DAYS`), undecided, and a streak existed before it. `gap` is how many consecutive missed days need freezing, at most 3 by the window; `restores` is the earlier run's length.
- Multi-day gaps are resolved one at a time, latest first, one freeze each.
- "Let it break" records `broken` and stops the prompt. No freeze is spent.
- The server accepts only the date currently offered.
- A freeze can rejoin runs and pass a milestone, so `awardProgress` also runs after freezing.

## Streak bonuses (milestones)

Files: `services/awards.ts`, `components/settings/milestones-section.tsx`.

- Per-user list. Defaults: 7 days = 50 gems, 14 = 100, 30 = 200, 60 = 400.
- Limits: at most 10 entries, days 1 to 400 and unique, gems 0 to 10,000. An empty list is allowed.
- Paid once per streak run, for every reached and unpaid milestone. A later new run can earn them again.
- A new or lowered bonus applies to a current streak on its next completion. Paid bonuses are never taken back.
- A 0-gem milestone still records an unlock, but no ledger entry.

## Achievements

Files: `domain/achievements.ts`, `services/achievement-overview.ts`, `components/achievements/*`.

| Key | Title | Condition | XP |
|---|---|---|---|
| a1 | First step | 1 completion | 10 |
| a2 | Getting going | 10 completions | 20 |
| a3 | Half century | 50 completions | 40 |
| a4 | Centurion | 100 completions | 80 |
| a5 | Perfect day | All due today done, at least 2 due | 30 |
| a6 | On a roll | 7-day streak | 30 |
| a7 | Unstoppable | 30-day streak | 100 |
| a8 | Rising star | Level 5 | 50 |
| a9 | Veteran | Level 10 | 100 |
| a10 | Gem collector | 500 gems earned | 40 |

- Pay XP once and are never revoked.
- Evaluated **only** after a completion or a freeze, so a reached goal can wait for the next completion. The page says so.
- `bestStreak` means the best *current* streak among active habits.
- The page also lists earned streak bonuses ("medals"), latest 12.

## Rewards shop

Files: `services/rewards.ts`, `validation/reward.ts`, `components/rewards/*`.

- User-defined: name, price 1 to 10,000,000, category (default "Custom Rewards"), icon (25 options), description, favorite. At most 100.
- Favorites sort first; All and Favorites tabs. The empty state offers idea presets.
- Purchase: atomic conditional payment, optional note at most 200, no refunds. History shows the latest 30 and includes freezes.
- Editing or deleting a reward does not alter purchase history.
- `User.goals` (a savings goal) exists in the schema, but **no such feature is implemented**.

## Dashboard

`services/dashboard.ts` builds it all in one call. Sections: greeting and date, level-up banner, level and wallet card, four stat cards, "Streaks at risk", today's habits with progress, last 7 days, freeze shop, achievements panel, latest 8 ledger entries. Toasts show rewards, at most 4, auto-dismissed after 4.5s. Requests are serialised by a single `busy` flag.

## Calendar

Files: `domain/calendar.ts` (all rules, shared by server and browser), `services/calendar.ts`, `models/calendar.ts`, `validation/calendar.ts`, `components/calendar/*`. Added 2026-11-06.

- **Item types:** event, task, reminder, note, milestone (shown as "Goal"). A **workout** is an event in the `workout` category; the UI offers it as its own kind. The app has no other workout system.
- **Habits are not copied.** The calendar reads the habit system as it is: active habits, their schedule, exempt days, completions and freeze decisions, through the Streaks page's `dayStatus` rule, in the user's custom habit order. Future scheduled days show as "upcoming". Habits are checked off on the Dashboard (where rewards are paid); calendar habit rows link to `/dashboard/habits#habit-<id>`.
- **Times** are wall-clock `HH:MM` on a DateKey in the user's zone. Changing zones never moves an item (10:00 stays 10:00). "Today" and the now-line come from the user's zone.
- **Rules:** notes and goals are always all-day. A timed item needs a start; the end is optional and must be after the start. A reminder item reminds at its start by default. Max 3000 items per user (a series counts once).
- **Repeats:** daily, weekly (chosen days, counted by weeks since the series' first week), monthly (same day; months without it are skipped), yearly (Feb 29 only in leap years), every N, optional last day. Expanded on read, never stored per day. One day of a series can be removed (`skippedDates`) or changed on its own: it is taken out of the series and saved as a new single item.
- **Checking off:** tasks, goals and workouts, per occurrence (`completedDates`). Overdue = a single task or goal before today that is not done; the overview offers "To today".
- **Conflicts:** the form warns when a timed item overlaps another (touching ends do not count). It never blocks saving. Overlapping items are drawn side by side.
- **Reminders:** "at the start" to "1 day before"; all-day items count from 9 AM. In-app only: listed in the overview and shown as an alert while the Calendar page is open. No email or push.
- **Weekly plan:** up to 5 priorities per week (Monday start), a "week at a glance" review (planned time, workouts, tasks, habits so far, busiest day).
- **Week templates:** up to 12, made from a real week's single events, tasks and reminders (repeats are left out). Applying skips lines already there (same day, time and title), so applying twice never doubles a week.
- **Drag-and-drop:** move an item to another day (month, all-day row) or time (week/day, 15-minute steps, length kept). Moving one day of a series moves only that day. Mouse: drag after a small move; touch: press and hold. Escape cancels. The edit form is the keyboard route.
- **Filters** per type (habits included), and agenda search over titles and notes in the 30 days shown.

## Telegram notifications (2026-11-06)

Setup steps: `docs/TELEGRAM_SETUP_TODO.md`. Schedules: `docs/CRON_JOBS.md`. Files: `lib/config/server-env.ts`, `lib/telegram/*`, `services/telegram*.ts`, `services/notifications.ts`, `domain/notifications.ts`, `components/settings/telegram-section.tsx`.

- **Linking:** Settings → Connect Telegram creates a 256-bit token, stores only its SHA-256 hash, and gives a `t.me/<bot>?start=<token>` link. The link expires after 10 minutes, works once (claimed atomically), and replaces any older unused link. The chat id comes from Telegram's update. A partial unique index on `telegram.chatId` lets one chat belong to one account only. The Telegram username is stored for display only.
- **Bot:** `/start`, `/help`, `/settings` (toggle buttons), `/status`, `/today`, `/disconnect` (asks to confirm). Private chats only. Blocking the bot unlinks the account. Each update id is handled once.
- **Reminders:** morning (default 09:00), evening "still open" (default 20:00), daily summary (off by default) and calendar reminders, all in the user's own time zone. Habit state comes from `getDashboard` (its own "due today" rule), so Telegram always matches the Dashboard. Habits are not checked off from Telegram.
- **Exactly once:** a unique `(userId, key)` log entry is claimed before each send. Daily reminders may go out up to 60 minutes late; calendar reminders up to 15 minutes. A reminder time that had passed when the chat was linked is not sent that day.
- **Unconfigured server:** missing variables are logged by name. Settings shows "not available", and the webhook and cron endpoints return 503.

## Stats

Files: `domain/stats.ts`, `services/stats.ts`, `components/stats/*`.

- Ranges 7, 30, 90 days. 90 days is drawn as 7-day buckets.
- Summary: completion rate, perfect days, active days, XP, gems earned and spent, minutes, plus lifetime totals.
- "Due" rules: scheduled and not exempt is due; scheduled and exempt but done is also due, so rates cannot exceed 100%; unscheduled is never due.
- Only active habits count toward rates; XP and minutes include all completion rows.
- Gem flow from the ledger, converted to the user's calendar day. Each day's earned total is floored at 0.
- Also shows weekday pattern (Monday first) and per-habit table with strongest and weakest (needs at least 3 due days).
- All computed on read.

## Settings

`components/settings/*`, each section saving independently.

- Profile: name 2 to 50. Email is read-only.
- Time zone: all IANA zones plus UTC, or use the device's. Changes what counts as today.
- Streak bonuses: see above; has "Reset to defaults".
- Appearance: theme (system, light, dark, minimal, organic, kawaii) and reduce motion, **per device** in localStorage. Themes can also be switched from the navbar and sidebar.
- Password: current password required; hidden for Google sessions. Other sessions stay active.

## Not implemented

No password reset or email verification, account deletion, email or push notifications (Telegram is the only notification channel), data export, social features, admin area, or payments. Email cannot be changed. (Checked by the absence of routes and services.)
