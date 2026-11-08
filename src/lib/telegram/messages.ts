import { BRAND } from "@/lib/brand";
import { formatTime } from "@/lib/domain/calendar";
import type { DailyKind } from "@/lib/domain/notifications";
import type { TelegramNotificationPrefs } from "@/types/notifications";

// Every text the bot sends, in one place. Pure functions: no I/O, so they are tested
// directly. Messages use Telegram's HTML mode, so user content is always escaped.

export interface InlineButton {
  text: string;
  callback_data?: string;
  url?: string;
}
export interface BotMessage {
  text: string;
  buttons?: InlineButton[][];
}

export function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// The commands shown in Telegram's menu (registered by the setup endpoint).
export const BOT_COMMANDS = [
  { command: "today", description: "Today's habits and what's left" },
  { command: "settings", description: "Choose which reminders you get" },
  { command: "status", description: "Is this chat connected?" },
  { command: "help", description: "What this bot can do" },
  { command: "disconnect", description: "Disconnect this chat from your account" },
] as const;

export const BOT_DESCRIPTION =
  `${BRAND.name} reminds you about today's habits, tells you what's still open in the evening, and nudges you before calendar plans. ` +
  `Connect it from Settings → Telegram on the ${BRAND.name} website.`;
export const BOT_SHORT_DESCRIPTION = `Habit reminders and daily summaries from ${BRAND.name}.`;

// Callback data the bot accepts. Anything else is ignored.
export const PREF_TOGGLES = ["enabled", "habitReminder", "incompleteReminder", "dailySummary", "calendarReminders"] as const;
export type PrefToggle = (typeof PREF_TOGGLES)[number];
export const CALLBACKS = {
  toggle: (pref: PrefToggle) => `pref:${pref}`,
  disconnectYes: "disc:yes",
  disconnectNo: "disc:no",
  today: "today",
} as const;

const openSite = (site: string, path = "/dashboard"): InlineButton[][] =>
  site ? [[{ text: `Open ${BRAND.name}`, url: `${site}${path}` }]] : [];

export function welcome(site: string, connectedAs: string | null): BotMessage {
  if (connectedAs) {
    return {
      text:
        `👋 Welcome back, <b>${escapeHtml(connectedAs)}</b>.\n\n` +
        `This chat is connected to your ${BRAND.name} account. Try /today, or /settings to choose your reminders.`,
      buttons: openSite(site),
    };
  }
  return {
    text:
      `💎 <b>Welcome to ${BRAND.name}!</b>\n\n` +
      `I send your habit reminders: what's waiting today, what's still open in the evening, an optional daily summary, and your calendar reminders.\n\n` +
      `<b>To connect your account:</b>\n` +
      `1. Sign in on the ${BRAND.name} website.\n` +
      `2. Open <b>Settings → Telegram</b> and tap <b>Connect Telegram</b>.\n` +
      `3. Tap <b>Start</b> here when Telegram opens.\n\n` +
      `The link works once and only for 10 minutes, so nobody else can use it.`,
    buttons: openSite(site, "/dashboard/settings#telegram"),
  };
}

export function linked(name: string): BotMessage {
  return {
    text:
      `✅ <b>Connected!</b> This chat now receives ${BRAND.name} reminders for <b>${escapeHtml(name)}</b>.\n\n` +
      `By default you get a morning reminder at 9 AM and an evening check at 8 PM, only on days with habits still open. ` +
      `Change them with /settings.`,
  };
}

export const linkInvalid: BotMessage = {
  text:
    `⚠️ That connection link has expired or was already used.\n\n` +
    `Open <b>Settings → Telegram</b> on the website and tap <b>Connect Telegram</b> again to get a fresh one.`,
};

export const linkConflict: BotMessage = {
  text:
    `⚠️ This Telegram account is already connected to a different ${BRAND.name} account.\n\n` +
    `To switch, send /disconnect here first, then connect again from the other account.`,
};

export const notConnected: BotMessage = {
  text: `This chat isn't connected to a ${BRAND.name} account yet. Send /start to see how to connect it.`,
};

export const privateOnly: BotMessage = {
  text: `Please message me in a private chat. Reminders are personal, so I don't work in groups.`,
};

export function help(site: string): BotMessage {
  return {
    text:
      `<b>${BRAND.name} bot</b>\n\n` +
      `/today: today's habits and what's left\n` +
      `/settings: turn reminders on or off\n` +
      `/status: check that this chat is connected\n` +
      `/disconnect: stop all messages and unlink this chat\n` +
      `/help: this message\n\n` +
      `Reminder <b>times</b> and your <b>time zone</b> are set on the website, in Settings. ` +
      `Habits are checked off in the app, so your streaks and rewards stay right.`,
    buttons: openSite(site, "/dashboard/settings#telegram"),
  };
}

export function status(name: string, prefs: TelegramNotificationPrefs, timezone: string): BotMessage {
  return {
    text:
      `🔗 <b>Connected</b> to ${BRAND.name} as <b>${escapeHtml(name)}</b>.\n` +
      `Time zone: ${escapeHtml(timezone)}\n` +
      `Reminders: ${prefs.enabled ? "active" : "paused"}`,
  };
}

export function settings(prefs: TelegramNotificationPrefs, timezone: string, site: string): BotMessage {
  const line = (label: string, on: boolean, time?: string) =>
    `${on ? "✅" : "⬜"} ${label}${time && on ? `, ${formatTime(time)}` : ""}`;
  const toggle = (label: string, pref: PrefToggle, on: boolean): InlineButton => ({
    text: `${on ? "Turn off" : "Turn on"}: ${label}`,
    callback_data: CALLBACKS.toggle(pref),
  });
  return {
    text:
      `⚙️ <b>Your reminders</b>${prefs.enabled ? "" : " (all paused)"}\n\n` +
      `${line("Morning: habits waiting", prefs.habitReminder.enabled, prefs.habitReminder.time)}\n` +
      `${line("Evening: habits still open", prefs.incompleteReminder.enabled, prefs.incompleteReminder.time)}\n` +
      `${line("Daily summary", prefs.dailySummary.enabled, prefs.dailySummary.time)}\n` +
      `${line("Calendar reminders", prefs.calendarReminders)}\n\n` +
      `Times are in your time zone (${escapeHtml(timezone)}). Change them on the website.`,
    buttons: [
      [toggle("morning", "habitReminder", prefs.habitReminder.enabled)],
      [toggle("evening", "incompleteReminder", prefs.incompleteReminder.enabled)],
      [toggle("summary", "dailySummary", prefs.dailySummary.enabled)],
      [toggle("calendar", "calendarReminders", prefs.calendarReminders)],
      [{ text: prefs.enabled ? "⏸ Pause all" : "▶️ Resume all", callback_data: CALLBACKS.toggle("enabled") }],
      ...openSite(site, "/dashboard/settings#telegram"),
    ],
  };
}

export const confirmDisconnect: BotMessage = {
  text: `Disconnect this chat from your ${BRAND.name} account? You will stop getting reminders here. You can reconnect from Settings at any time.`,
  buttons: [
    [
      { text: "Yes, disconnect", callback_data: CALLBACKS.disconnectYes },
      { text: "Keep it", callback_data: CALLBACKS.disconnectNo },
    ],
  ],
};

export const disconnected: BotMessage = {
  text: `👋 Disconnected. This chat won't get any more ${BRAND.name} messages. Send /start if you want to connect again.`,
};

export const keptConnected: BotMessage = { text: `👍 Still connected. Nothing changed.` };

export interface HabitLine {
  name: string;
  done: boolean;
}

function list(habits: HabitLine[]): string {
  return habits.map((h) => `${h.done ? "✅" : "⬜"} ${escapeHtml(h.name)}`).join("\n");
}

export function today(habits: HabitLine[], site: string): BotMessage {
  if (habits.length === 0) {
    return { text: `🌿 No habits are scheduled today. Enjoy the rest day.`, buttons: openSite(site) };
  }
  const done = habits.filter((h) => h.done).length;
  return {
    text:
      `📋 <b>Today</b>: ${done} of ${habits.length} done\n\n${list(habits)}` +
      (done === habits.length ? `\n\n🎉 All done. Great work!` : ""),
    buttons: [[{ text: "↻ Refresh", callback_data: CALLBACKS.today }], ...openSite(site)],
  };
}

export function habitReminder(name: string, open: HabitLine[], site: string): BotMessage {
  return {
    text:
      `☀️ Good morning, ${escapeHtml(name)}! ${open.length === 1 ? "1 habit is" : `${open.length} habits are`} waiting today:\n\n` +
      `${list(open)}`,
    buttons: openSite(site),
  };
}

export function incompleteReminder(open: HabitLine[], doneCount: number, site: string): BotMessage {
  return {
    text:
      `🌙 ${open.length === 1 ? "1 habit is" : `${open.length} habits are`} still open today` +
      (doneCount > 0 ? ` (${doneCount} done already, nice!)` : "") +
      `:\n\n${list(open)}\n\nThere's still time to keep your streaks going.`,
    buttons: openSite(site),
  };
}

export function dailySummary(habits: HabitLine[], site: string): BotMessage {
  const done = habits.filter((h) => h.done).length;
  const verdict =
    done === habits.length ? "🎉 A perfect day!" : done === 0 ? "Tomorrow is a fresh start." : "Good progress. Keep it up!";
  return {
    text: `📊 <b>Your day</b>: ${done} of ${habits.length} habits done\n\n${list(habits)}\n\n${verdict}`,
    buttons: openSite(site),
  };
}

export function calendarReminder(title: string, kindLabel: string, when: string, site: string): BotMessage {
  return {
    text: `⏰ <b>Reminder</b>: ${escapeHtml(title)}\n${escapeHtml(kindLabel)} · ${escapeHtml(when)}`,
    buttons: openSite(site, "/dashboard/calendar?view=day"),
  };
}

// "/start abc", "/start@DayfacetBot abc" -> { command: "start", arg: "abc" }
export function parseCommand(text: string): { command: string; arg: string } | null {
  const match = /^\/([A-Za-z0-9_]{1,32})(?:@[A-Za-z0-9_]+)?(?:\s+([\s\S]*))?$/.exec(text.trim());
  return match ? { command: match[1].toLowerCase(), arg: (match[2] ?? "").trim() } : null;
}

// What to send for a daily kind, or null when there is nothing worth saying.
export function dailyMessage(kind: DailyKind, name: string, habits: HabitLine[], site: string): BotMessage | null {
  const open = habits.filter((h) => !h.done);
  switch (kind) {
    case "habitReminder":
      return open.length > 0 ? habitReminder(name, open, site) : null;
    case "incompleteReminder":
      return open.length > 0 ? incompleteReminder(open, habits.length - open.length, site) : null;
    case "dailySummary":
      return habits.length > 0 ? dailySummary(habits, site) : null;
  }
}

