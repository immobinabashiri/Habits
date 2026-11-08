import { addDays } from "@/lib/domain/dates";
import { nowIn, timeToMinutes } from "@/lib/domain/calendar";
import type { DateKey } from "@/types/common";
import type { NotificationKind, TelegramNotificationPrefs, TimedReminderPref } from "@/types/notifications";

// Pure rules for scheduled notifications. No I/O, so they are unit-tested directly.

// What a newly connected account gets. Conservative: one morning nudge and one evening
// check, and only when habits are actually still open; the summary is opt-in.
export const DEFAULT_TELEGRAM_PREFS: TelegramNotificationPrefs = {
  enabled: true,
  habitReminder: { enabled: true, time: "09:00" },
  incompleteReminder: { enabled: true, time: "20:00" },
  dailySummary: { enabled: false, time: "21:30" },
  calendarReminders: true,
};

// How late a timed reminder may still go out. The cron runs every few minutes; if a
// run is missed (deploy, outage) the next one within this window still delivers it.
export const DAILY_WINDOW_MINUTES = 60;
// Calendar reminders are about a specific moment, so a late one is skipped instead.
export const CALENDAR_WINDOW_MINUTES = 15;
// Link tokens for "Connect Telegram".
export const LINK_TOKEN_MINUTES = 10;

export type DailyKind = Exclude<NotificationKind, "calendarReminder">;
export const DAILY_KINDS: readonly DailyKind[] = ["habitReminder", "incompleteReminder", "dailySummary"];

// True when a daily reminder at `time` is due at `nowMinutes` (both in the user's own
// zone): from that minute until the window closes. Never wraps past midnight, because
// the next day is a different day (and a different duplicate key).
export function isDailyDue(time: string, nowMinutes: number, windowMinutes = DAILY_WINDOW_MINUTES): boolean {
  const at = timeToMinutes(time);
  return nowMinutes >= at && nowMinutes < Math.min(1440, at + windowMinutes);
}

// A reminder time that had already passed when the account was connected today is not
// sent "late" right after connecting.
export function passedBeforeLinking(
  time: string,
  today: DateKey,
  linkedAt: Date | null,
  timezone: string,
): boolean {
  if (!linkedAt) return false;
  const linked = nowIn(timezone, linkedAt);
  return linked.date === today && linked.minutes > timeToMinutes(time);
}

// The duplicate-guard key: one message of a kind per user per local day.
export function dailyKey(kind: DailyKind, date: DateKey): string {
  return `${kind}:${date}`;
}

export function calendarKey(itemId: string, occurrenceDate: DateKey): string {
  return `calendarReminder:${itemId}:${occurrenceDate}`;
}

// Is a reminder moment (local day + minutes) within the last `window` minutes of now?
export function isMomentDue(
  at: { date: DateKey; minutes: number },
  now: { date: DateKey; minutes: number },
  windowMinutes = CALENDAR_WINDOW_MINUTES,
): boolean {
  const toAbsolute = (m: { date: DateKey; minutes: number }) =>
    Date.parse(`${m.date}T00:00:00Z`) / 60_000 + m.minutes;
  const diff = toAbsolute(now) - toAbsolute(at);
  return diff >= 0 && diff < windowMinutes;
}

// The days whose occurrences can have a reminder going off today (a reminder can be
// up to a day before its item).
export function reminderSearchDays(today: DateKey): { from: DateKey; to: DateKey } {
  return { from: today, to: addDays(today, 1) };
}

// Stored preferences completed with the defaults, as a plain object. Fields are copied
// one by one on purpose: spreading a Mongoose sub-document would copy its internals
// (which refer to themselves) and break anything that serialises the result.
export function mergePrefs(stored: Partial<TelegramNotificationPrefs> | null | undefined): TelegramNotificationPrefs {
  const p = stored ?? {};
  const timed = (value: Partial<TimedReminderPref> | undefined, fallback: TimedReminderPref): TimedReminderPref => ({
    enabled: typeof value?.enabled === "boolean" ? value.enabled : fallback.enabled,
    time: typeof value?.time === "string" ? value.time : fallback.time,
  });
  return {
    enabled: typeof p.enabled === "boolean" ? p.enabled : DEFAULT_TELEGRAM_PREFS.enabled,
    habitReminder: timed(p.habitReminder, DEFAULT_TELEGRAM_PREFS.habitReminder),
    incompleteReminder: timed(p.incompleteReminder, DEFAULT_TELEGRAM_PREFS.incompleteReminder),
    dailySummary: timed(p.dailySummary, DEFAULT_TELEGRAM_PREFS.dailySummary),
    calendarReminders:
      typeof p.calendarReminders === "boolean" ? p.calendarReminders : DEFAULT_TELEGRAM_PREFS.calendarReminders,
  };
}
