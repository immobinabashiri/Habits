# Scheduled jobs

**There was no cron configuration or cron document in the project before 2026-11-06.** The expected `cron.job.org` file didn't exist, so this file is new. The name suggests cron-job.org was the intended scheduler, and that is what `docs/TELEGRAM_SETUP_TODO.md` sets up.

An endpoint doesn't run on its own. Each job below must be created at your scheduler (cron-job.org or Vercel Cron); see section D of the setup to-do list.

## Jobs

### 1. Notification dispatcher (required)

| | |
|---|---|
| Endpoint | `/api/cron/notifications` |
| Method | `POST` or `GET` (Vercel Cron only sends `GET`) |
| Authorization | Header `Authorization: Bearer <CRON_SECRET>`. Without it: `401`. If `CRON_SECRET` isn't set on the server: `503`. |
| Frequency | **Every 5 minutes** (`*/5 * * * *`) |
| Optional query | `dryRun=1` reports what would be sent and sends nothing. `jobs=habitReminder,incompleteReminder,dailySummary,calendarReminder` runs only some kinds. |
| Code | `src/app/api/cron/notifications/route.ts` → `src/lib/services/notifications.ts` |

**Purpose:** one dispatcher covers every scheduled message, so you configure one job instead of four:

| Kind | Sent when | Only if |
|---|---|---|
| `habitReminder` (morning, default 9:00) | the user's chosen time | at least one of today's habits is still open |
| `incompleteReminder` (evening, default 20:00) | the user's chosen time | at least one is still open |
| `dailySummary` (off by default) | the user's chosen time | habits were due today |
| `calendarReminder` | the reminder moment of a calendar item (for example "15 minutes before") | the item isn't checked off |

**Expected behaviour:**
- **Time zones:** each user's "now" is calculated in their own time zone (Settings → Time zone). A reminder set to 09:00 goes out at 09:00 local time for that user, whoever else is in other zones.
- **Exactly once:** each message has a key such as `habitReminder:2026-11-06` (the user's local day), stored with a unique index **before** sending. Repeated runs, late runs or overlapping runs skip anything already claimed.
- **Late runs:** a daily reminder can still go out up to 60 minutes after its time, so one missed run (a deploy or outage) doesn't lose it. Calendar reminders are skipped if more than 15 minutes late, because a late "starts in 10 minutes" is wrong.
- **No catch-up spam:** connecting Telegram at 10:15 doesn't trigger that morning's 09:00 reminder.
- **Failures:**
  - A temporary Telegram error releases the message so the next run retries it.
  - On `429` (rate limit) the run stops early and the rest goes out on the next run.
  - A chat that blocked the bot is disconnected and never retried.
- **Uses existing data only:**
  - habits, completions and days off come from the same code the Dashboard uses
  - calendar items come from the Calendar
  - nothing is duplicated
- **Response:** JSON such as `{"ok":true,"ms":120,"checkedUsers":12,"sent":3,"skippedDuplicate":5,"failed":0,"unlinked":0,"byKind":{…},"stoppedEarly":false}`.
- **Cost:** a run with nothing due does one database query per user, plus a habit lookup only for users with a reminder due at that moment. Users with Telegram not connected are never loaded.

### 2. One-time setup (run once per deploy or when the bot changes, not scheduled)

| | |
|---|---|
| Endpoint | `/api/telegram/setup` |
| Method | `POST` to register the webhook, command menu and descriptions; `GET` to check status |
| Authorization | `Authorization: Bearer <CRON_SECRET>` |

## Not needed as jobs

- **Cleaning up** expired link tokens, processed webhook updates (kept 7 days) and the notification log (kept 60 days): MongoDB TTL indexes delete them automatically.
- **Streaks, stats and the calendar:** all calculated on read, so nothing needs to run at midnight.
