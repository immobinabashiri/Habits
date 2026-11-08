import "server-only";
import type { HydratedDocument, Types } from "mongoose";
import { siteUrl } from "@/lib/brand";
import { CalendarItem } from "@/lib/db/models/calendar";
import { NotificationLog } from "@/lib/db/models/telegram";
import { User } from "@/lib/db/models/user";
import type { TelegramConfig } from "@/lib/config/server-env";
import { formatTime, nowIn, occurrencesInRange, reminderAt } from "@/lib/domain/calendar";
import {
  calendarKey,
  dailyKey,
  DAILY_KINDS,
  isDailyDue,
  isMomentDue,
  mergePrefs,
  passedBeforeLinking,
  reminderSearchDays,
} from "@/lib/domain/notifications";
import { disconnectChat, todayHabitLines } from "@/lib/services/telegram";
import { toPublicCalendarItem } from "@/lib/services/calendar";
import { logTelegramError, sendMessage, TelegramApiError } from "@/lib/telegram/api";
import * as msg from "@/lib/telegram/messages";
import type { BotMessage } from "@/lib/telegram/messages";
import { connectDB } from "@/utils/connectDB";
import type { DateKey } from "@/types/common";
import type { NotificationKind } from "@/types/notifications";
import type { UserRecord } from "@/types/user";

// The scheduled-notification dispatcher, run by the cron endpoint every few minutes.
//
// For every user with a connected Telegram chat and reminders switched on, it works
// out "now" in THAT user's time zone and sends whatever is due:
//   habitReminder       at the user's morning time, if habits are still open
//   incompleteReminder  at the user's evening time, if habits are still open
//   dailySummary        at the user's summary time (opt-in), if habits were due
//   calendarReminder    calendar items whose reminder moment just passed
//
// Exactly once: each message has a key (kind + the user's local day, or item + day)
// that is inserted as the log's _id (always unique in MongoDB) BEFORE sending. A second run, or two runs at
// once, find the key taken and skip. If a send fails for a passing reason, the key is
// released so the next run retries while the window is still open.

const KIND_LABELS: Record<string, string> = {
  event: "Event",
  task: "Task",
  reminder: "Reminder",
  note: "Note",
  milestone: "Goal",
};
const MAX_USERS_PER_RUN = 5000;
const PAUSE_BETWEEN_SENDS_MS = 40; // stays well under Telegram's ~30 messages/second

export interface DispatchReport {
  dryRun: boolean;
  checkedUsers: number;
  sent: number;
  wouldSend: number; // dry run only
  skippedDuplicate: number;
  failed: number;
  unlinked: number; // chats that blocked the bot, now disconnected
  byKind: Record<NotificationKind, number>;
  stoppedEarly: boolean; // Telegram asked us to slow down; the rest goes next run
}

type UserDoc = HydratedDocument<UserRecord>;

function isDuplicateKey(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { code?: number }).code === 11000;
}

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function runNotifications(
  config: TelegramConfig,
  options: { now?: Date; dryRun?: boolean; jobs?: NotificationKind[] | null } = {},
): Promise<DispatchReport> {
  await connectDB();
  const instant = options.now ?? new Date();
  const dryRun = options.dryRun ?? false;
  const jobs = new Set<NotificationKind>(options.jobs ?? [...DAILY_KINDS, "calendarReminder"]);
  const site = siteUrl();
  const report: DispatchReport = {
    dryRun,
    checkedUsers: 0,
    sent: 0,
    wouldSend: 0,
    skippedDuplicate: 0,
    failed: 0,
    unlinked: 0,
    byKind: { habitReminder: 0, incompleteReminder: 0, dailySummary: 0, calendarReminder: 0 },
    stoppedEarly: false,
  };

  // Only connected chats with reminders on. Unconnected accounts are never touched.
  const users = (await User.find({
    "telegram.chatId": { $ne: null },
    "notifications.telegram.enabled": { $ne: false },
  })
    .select("name telegram notifications settings.timezone")
    .limit(MAX_USERS_PER_RUN)) as UserDoc[];

  for (const user of users) {
    if (report.stoppedEarly) break;
    report.checkedUsers += 1;
    const chatId = user.telegram.chatId;
    if (chatId == null) continue;
    const prefs = mergePrefs(user.notifications?.telegram);
    const timezone = user.settings.timezone;
    const now = nowIn(timezone, instant);

    // Returns false when this user's chat is gone or Telegram asked us to stop.
    async function deliver(kind: NotificationKind, key: string, message: BotMessage): Promise<boolean> {
      const logId = `${user._id.toString()}:${key}`;
      if (dryRun) {
        const taken = await NotificationLog.exists({ _id: logId });
        if (taken) report.skippedDuplicate += 1;
        else {
          report.wouldSend += 1;
          report.byKind[kind] += 1;
        }
        return true;
      }
      try {
        await NotificationLog.create({ _id: logId, userId: user._id, key, kind, date: now.date, status: "sending" });
      } catch (error) {
        if (isDuplicateKey(error)) {
          report.skippedDuplicate += 1;
          return true;
        }
        throw error;
      }
      try {
        await sendMessage(config, chatId!, message);
        await NotificationLog.updateOne({ _id: logId }, { $set: { status: "sent" } });
        report.sent += 1;
        report.byKind[kind] += 1;
        await pause(PAUSE_BETWEEN_SENDS_MS);
        return true;
      } catch (error) {
        report.failed += 1;
        logTelegramError(`notification ${kind}`, error);
        if (error instanceof TelegramApiError && error.chatUnreachable) {
          // Blocked or deleted: keep the log (never retry) and unlink the chat.
          await NotificationLog.updateOne({ _id: logId }, { $set: { status: "failed", error: "chat unreachable" } });
          if (await disconnectChat(chatId!)) report.unlinked += 1;
          return false;
        }
        // Anything else may pass: free the key so the next run tries again.
        await NotificationLog.deleteOne({ _id: logId });
        if (error instanceof TelegramApiError && error.code === 429) report.stoppedEarly = true;
        return !report.stoppedEarly;
      }
    }

    // ---- Daily habit reminders: read the habits only if one of them is due ----
    const dueDaily = DAILY_KINDS.filter((kind) => {
      if (!jobs.has(kind)) return false;
      const pref = prefs[kind];
      return pref.enabled && isDailyDue(pref.time, now.minutes) && !passedBeforeLinking(pref.time, now.date, user.telegram.linkedAt, timezone);
    });
    let reachable = true;
    if (dueDaily.length > 0) {
      const habits = await todayHabitLines(user._id as Types.ObjectId);
      for (const kind of dueDaily) {
        const message = msg.dailyMessage(kind, user.name, habits, site);
        if (!message) continue; // nothing to say today (no habits due, or all done)
        reachable = await deliver(kind, dailyKey(kind, now.date), message);
        if (!reachable) break;
      }
    }

    // ---- Calendar reminders ----
    if (reachable && jobs.has("calendarReminder") && prefs.calendarReminders) {
      for (const due of await dueCalendarReminders(user._id as Types.ObjectId, now)) {
        const message = msg.calendarReminder(due.title, due.kindLabel, due.when, site);
        reachable = await deliver("calendarReminder", calendarKey(due.itemId, due.date), message);
        if (!reachable) break;
      }
    }
  }
  return report;
}

async function dueCalendarReminders(userId: Types.ObjectId, now: { date: DateKey; minutes: number }) {
  const { from, to } = reminderSearchDays(now.date);
  const docs = await CalendarItem.find({
    userId,
    reminderMinutes: { $ne: null },
    date: { $lte: to },
    $or: [{ recurrence: null, date: { $gte: from } }, { recurrence: { $ne: null } }],
  }).limit(500);
  const items = docs.map(toPublicCalendarItem);
  return occurrencesInRange(items, from, to)
    .filter((o) => !o.done)
    .map((o) => ({ o, at: reminderAt(o.item, o.date) }))
    .filter((r): r is { o: typeof r.o; at: { date: DateKey; minutes: number } } => r.at !== null && isMomentDue(r.at, now))
    .map(({ o }) => ({
      itemId: o.item.id,
      date: o.date,
      title: o.item.title,
      kindLabel: o.item.category === "workout" && o.item.type === "event" ? "Workout" : KIND_LABELS[o.item.type],
      when:
        o.item.allDay || !o.item.startTime
          ? o.date === now.date
            ? "today"
            : "tomorrow"
          : `${o.date === now.date ? "today" : "tomorrow"} at ${formatTime(o.item.startTime)}${
              o.item.endTime ? ` (until ${formatTime(o.item.endTime)})` : ""
            }`,
    }));
}
