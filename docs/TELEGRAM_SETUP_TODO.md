# Telegram setup: your to-do list

Everything in the code is done and tested against a fake Telegram server. These are the steps only you can do, because they need your Telegram account, your secrets or your hosting. Work through them in order. Allow about 20 minutes.

Placeholders:
- `YOUR-SITE` is your public address, for example `https://dayfacet.com`.
- `YOUR_CRON_SECRET` is the value you put in `CRON_SECRET`.

---

## A. BotFather configuration (in the Telegram app)

- [ ] **A1. Create the bot.** Open a chat with [@BotFather](https://t.me/BotFather) and send `/newbot`.
  - **Name:** `Dayfacet` (shown in chats; can be changed later).
  - **Username:** must end in `bot` and be unique across Telegram. Try `DayfacetBot`; if it's taken, `DayfacetAppBot` or `DayfacetHQBot`. Availability couldn't be checked from here.
- [ ] **A2. Copy the token** BotFather replies with (`123456789:AA…`). It goes into `TELEGRAM_BOT_TOKEN` (step B). Treat it like a password. If it ever leaks, send `/revoke` to BotFather and update the variable.
- [ ] **A3. Upload the profile photo.** Send `/setuserpic` to BotFather, choose the bot, and send this file **as a photo** (not as a file): `public/brand/telegram-bot-avatar.png` (640×640). Creating the image does **not** set it; this step does. The Bot API has no reliable way to set a bot's own photo, so use BotFather.
- [ ] **A4. Optional polish in BotFather:**
  - `/setabouttext`: `Habit reminders and daily summaries from Dayfacet.`
  - The command menu and the bot's description are set automatically in step C4, so you don't need `/setcommands` or `/setdescription`.
  - Leave `/setjoingroups` **disabled**: the bot only works in private chats.

## B. Environment configuration

Your local `.env` already has these four lines with empty values. Nothing else in it was changed. `.env.example` lists every variable for new environments. Fill the same values into your **hosting provider's environment settings** for production.

| Variable | What it's for | Where you get it | Generate it yourself? | Secret? |
|---|---|---|---|---|
| `TELEGRAM_BOT_TOKEN` | Lets the server send messages as the bot | BotFather, step A2 | No | **Secret** |
| `TELEGRAM_BOT_USERNAME` | Builds the "Connect Telegram" link (`t.me/<username>`) | The username from A1, **without** `@` | No | Public |
| `TELEGRAM_WEBHOOK_SECRET` | Proves an incoming webhook call really came from Telegram (sent in the `X-Telegram-Bot-Api-Secret-Token` header) | You make it up | **Yes**: `openssl rand -hex 32` | **Secret** |
| `CRON_SECRET` | Protects the scheduled-job endpoint and the one-time setup endpoint | You make it up | **Yes**: `openssl rand -hex 32` (use a different value from the webhook secret) | **Secret** |
| `NEXT_PUBLIC_SITE_URL` *(already existed)* | Your public `https://` address. Used for the webhook address, the links in messages and SEO. **Must be set before the build runs.** | Your domain | No | Public |

- [ ] **B1.** Fill in the four variables, plus `NEXT_PUBLIC_SITE_URL`, in your hosting provider (and locally if you want to try it).
- [ ] **B2.** Keep `.env` out of git. `.gitignore` now ignores `.env` and `.env.*`, and only `.env.example` (no values) is meant to be committed. **If this project was ever pushed with the old `.env`, rotate the database password and `NEXTAUTH_SECRET`.**

Do **not** set `TELEGRAM_API_BASE_URL` in production. It exists only so tests can talk to a fake Telegram server.

The server checks the variables on use. If one is missing or malformed, it logs a line such as `[config] Telegram is not configured: TELEGRAM_BOT_USERNAME is empty`, naming the variable but never its value. The app keeps working; only Telegram features stay off, and Settings shows "not available on this server yet".

## C. Deployment configuration

- [ ] **C1. Deploy** the updated application with the variables from B.
- [ ] **C2. Check that the site is live:** `https://YOUR-SITE/` should show "Dayfacet" in the browser tab with the new gem icon.
- [ ] **C3. Make sure the address is HTTPS.** Telegram only calls `https://` webhooks.
- [ ] **C4. Register the webhook, command menu and descriptions.** This is one command, so you never paste the bot token into a terminal:

  ```bash
  curl -X POST https://YOUR-SITE/api/telegram/setup \
    -H "Authorization: Bearer YOUR_CRON_SECRET"
  ```

  Expected: `{"ok":true,"webhookUrl":"https://YOUR-SITE/api/telegram/webhook","commands":["/today","/settings","/status","/help","/disconnect"]}`

- [ ] **C5. Verify connectivity:**

  ```bash
  curl https://YOUR-SITE/api/telegram/setup -H "Authorization: Bearer YOUR_CRON_SECRET"
  ```

  Look for `"matchesEnv": true` (the token belongs to the username you configured) and `"pointsHere": true`. `"lastError"` should be `null`. If it shows an error, Telegram couldn't reach your site: check the address and that the deploy is live.

  <details><summary>Alternative without the setup endpoint (manual curl to Telegram)</summary>

  ```bash
  curl -X POST "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook" \
    -d "url=https://YOUR-SITE/api/telegram/webhook" \
    -d "secret_token=<TELEGRAM_WEBHOOK_SECRET>" \
    -d 'allowed_updates=["message","callback_query","my_chat_member"]'
  ```
  This puts your token in your shell history; clear it afterwards. The command menu then has to be set with BotFather's `/setcommands`.
  </details>

## D. Cron job configuration

Only **one** job is required. Full reference: `docs/CRON_JOBS.md`.

| | |
|---|---|
| Endpoint | `https://YOUR-SITE/api/cron/notifications` |
| Method | `POST` (or `GET`; both work) |
| Header | `Authorization: Bearer YOUR_CRON_SECRET` |
| Schedule | **Every 5 minutes** (`*/5 * * * *`) |
| Purpose | Sends every due Telegram message: morning habit reminders, evening "still open" checks, daily summaries and calendar reminders, each in the user's own time zone |

- [ ] **D1. Create the job at [cron-job.org](https://cron-job.org)** (free, and works with any host):
  1. Create a free account → **Create cronjob**.
  2. **URL:** `https://YOUR-SITE/api/cron/notifications`
  3. **Execution schedule:** "Every 5 minutes".
  4. **Advanced** → **Request method:** `POST`. Add the header `Authorization` with the value `Bearer YOUR_CRON_SECRET`.
  5. **Timeout:** 30 seconds or more.
  6. Save, then use **Test run**. The response should start with `{"ok":true,` and include counts such as `"sent"`.
- [ ] **D2. If you host on Vercel instead:** Vercel Cron sends `Authorization: Bearer $CRON_SECRET` automatically. **On the Hobby plan a cron job can run at most once a day**, which is too slow for reminders, so use cron-job.org (D1) unless you're on Pro. On Pro, add this `vercel.json` at the project root:
  ```json
  { "crons": [{ "path": "/api/cron/notifications", "schedule": "*/5 * * * *" }] }
  ```
  It wasn't added to the project, because on the Hobby plan it would make the deploy fail.
- [ ] **D3. Never point the job at a staging and a production site that share one database.** The duplicate guard would still prevent double messages, but both would compete for the same work.

Creating the endpoint does not schedule anything by itself. Until D1 or D2 is done, no reminder is ever sent.

## E. Final verification

Use your own account first.

- [ ] **E1. Account linking.** Open Settings → Telegram → **Connect Telegram** → **Open Telegram** → tap **Start**. The bot replies "Connected!", and the Settings page switches to "Connected as @you" within a few seconds without a reload.
- [ ] **E2. Links work once.** Tap the same t.me link again: the bot replies that it expired or was already used. A link not used within 10 minutes stops working too.
- [ ] **E3. Commands.**
  - `/today` lists today's habits, matching the Dashboard.
  - `/settings` shows toggle buttons. Pressing one updates the message and the website's Settings.
  - `/status` shows your name and time zone.
  - `/help` lists the commands.
  - `/disconnect` asks before unlinking.
- [ ] **E4. Notification delivery (dry run first).**
  ```bash
  curl -X POST "https://YOUR-SITE/api/cron/notifications?dryRun=1" -H "Authorization: Bearer YOUR_CRON_SECRET"
  ```
  This shows `wouldSend` without sending anything.
- [ ] **E5. Habit reminders.** In Settings, set the morning reminder to a couple of minutes from now, with at least one habit still open today. Within 5 minutes of that time you get "☀️ Good morning… N habits are waiting". Complete all habits and set the evening check a few minutes ahead: nothing should arrive, because nothing is open.
- [ ] **E6. Time zone behaviour.** Change your time zone in Settings. Reminder times are wall-clock times in **your** zone, so 9:00 means 9:00 where you are, whatever the server's zone.
- [ ] **E7. Duplicate prevention.** Run the cron command from E4 without `dryRun` twice in a row: the second run reports `"sent":0` and `"skippedDuplicate"` instead.
- [ ] **E8. Blocking.** Block the bot in Telegram. The account is disconnected automatically, and Settings shows "Connect Telegram" again.

## Things to know

- **Default reminders** for a newly connected account:
  - morning at 9:00 and evening at 20:00, only on days with habits still open
  - the daily summary is off
  - calendar reminders are on
- **Nothing is sent to accounts that never connected Telegram.** Pausing in `/settings` or Settings stops everything immediately.
- **Habits are checked off in the app, not in Telegram,** so rewards, streaks and undo keep working exactly as before.
