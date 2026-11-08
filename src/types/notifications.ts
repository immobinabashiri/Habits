import type { Types } from "mongoose";
import type { DateKey } from "./common";

// A reminder at a time of day, in the user's own time zone ("HH:MM", 24 h).
export interface TimedReminderPref {
  enabled: boolean;
  time: string;
}

// What the user wants to receive on Telegram. New kinds are added as new fields with
// their own defaults, so stored documents never need a migration.
export interface TelegramNotificationPrefs {
  enabled: boolean; // master switch ("pause all")
  habitReminder: TimedReminderPref; // "today's habits are waiting" (only if any are open)
  incompleteReminder: TimedReminderPref; // "N habits still open" (only if any are open)
  dailySummary: TimedReminderPref; // done vs open, for days with habits due
  calendarReminders: boolean; // calendar items that have a reminder set
}

export interface NotificationPrefs {
  telegram: TelegramNotificationPrefs;
}

// The Telegram chat linked to an account. chatId is where messages go; the username
// is shown in Settings only and never used to identify anyone.
export interface TelegramLink {
  chatId: number | null;
  username: string | null;
  linkedAt: Date | null;
}

export type NotificationKind = "habitReminder" | "incompleteReminder" | "dailySummary" | "calendarReminder";

// One message per (user, key), e.g. "habitReminder:2026-11-06". Claimed BEFORE
// sending, so a job that runs twice can never send twice.
export interface NotificationLogRecord {
  _id: string; // "<userId>:<key>": MongoDB's own _id index is the duplicate guard
  userId: Types.ObjectId;
  key: string;
  kind: NotificationKind;
  date: DateKey; // the user's local day it belongs to
  status: "sending" | "sent" | "failed";
  error: string | null;
  createdAt: Date;
}

export interface TelegramLinkTokenRecord {
  userId: Types.ObjectId;
  tokenHash: string; // SHA-256 of the token; the token itself is never stored
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
}

export interface TelegramUpdateRecord {
  _id: number; // the update_id itself, so _id uniqueness is the duplicate guard
  updateId: number;
  receivedAt: Date;
}

// What the Settings page shows.
export interface TelegramStatus {
  configured: boolean; // the server has the bot credentials
  botUsername: string | null;
  connected: boolean;
  telegramUsername: string | null;
  linkedAt: string | null;
  prefs: TelegramNotificationPrefs;
  timezone: string;
}

export interface TelegramLinkStart {
  url: string; // https://t.me/<bot>?start=<token>
  expiresAt: string;
}
