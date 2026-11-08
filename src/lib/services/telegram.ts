import "server-only";
import { createHash, randomBytes } from "node:crypto";
import type { Types } from "mongoose";
import { TelegramLinkToken } from "@/lib/db/models/telegram";
import { User } from "@/lib/db/models/user";
import { readTelegramConfig } from "@/lib/config/server-env";
import { LINK_TOKEN_MINUTES, mergePrefs } from "@/lib/domain/notifications";
import { AppError } from "@/lib/errors";
import { getDashboard } from "@/lib/services/dashboard";
import { sendMessage, logTelegramError } from "@/lib/telegram/api";
import * as msg from "@/lib/telegram/messages";
import type { HabitLine } from "@/lib/telegram/messages";
import type { NotificationPrefsInput } from "@/lib/validation/notifications";
import { connectDB } from "@/utils/connectDB";
import type { TelegramLinkStart, TelegramNotificationPrefs, TelegramStatus } from "@/types/notifications";

// Account linking and preferences. The website side (Settings) and the bot side
// (/start with a token) both come through here.

const TOKEN_BYTES = 32; // 256 bits; base64url = 43 characters, inside Telegram's 64-character /start limit
const TOKEN_FORMAT = /^[A-Za-z0-9_-]{43}$/;

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

function isDuplicateKey(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { code?: number }).code === 11000;
}

export async function getTelegramStatus(userId: Types.ObjectId): Promise<TelegramStatus> {
  await connectDB();
  const user = await User.findById(userId).select("telegram notifications settings.timezone");
  if (!user) throw new AppError("UNAUTHENTICATED");
  const config = readTelegramConfig();
  return {
    configured: config.ok,
    botUsername: config.ok ? config.value.username : null,
    connected: user.telegram?.chatId != null,
    telegramUsername: user.telegram?.username ?? null,
    linkedAt: user.telegram?.linkedAt ? user.telegram.linkedAt.toISOString() : null,
    prefs: mergePrefs(user.notifications?.telegram),
    timezone: user.settings.timezone,
  };
}

// Step 1 (website): a fresh single-use token in a t.me deep link. Only its hash is
// stored; any older unused token of this user stops working.
export async function startTelegramLink(userId: Types.ObjectId): Promise<TelegramLinkStart> {
  const config = readTelegramConfig();
  if (!config.ok) throw new AppError("TELEGRAM_NOT_CONFIGURED");
  await connectDB();
  if (!(await User.exists({ _id: userId }))) throw new AppError("UNAUTHENTICATED");

  const token = randomBytes(TOKEN_BYTES).toString("base64url");
  const expiresAt = new Date(Date.now() + LINK_TOKEN_MINUTES * 60_000);
  await TelegramLinkToken.deleteMany({ userId, usedAt: null });
  await TelegramLinkToken.create({ userId, tokenHash: hashToken(token), expiresAt });
  return {
    url: `https://t.me/${config.value.username}?start=${token}`,
    expiresAt: expiresAt.toISOString(),
  };
}

export type LinkOutcome =
  | { status: "linked"; name: string }
  | { status: "invalid" } // unknown, expired or already used
  | { status: "conflict" }; // this chat belongs to another account

// Step 2 (bot): /start <token> from a private chat. The chat id comes from Telegram's
// update, never from anything the user typed.
export async function completeTelegramLink(
  token: string,
  chat: { chatId: number; username: string | null },
): Promise<LinkOutcome> {
  if (!TOKEN_FORMAT.test(token)) return { status: "invalid" };
  await connectDB();
  const tokenHash = hashToken(token);
  const now = new Date();
  const pending = await TelegramLinkToken.findOne({ tokenHash, usedAt: null, expiresAt: { $gt: now } });
  if (!pending) return { status: "invalid" };

  // A chat that already belongs to someone else is refused (the token stays valid for
  // its remaining minutes, so the owner can /disconnect and try again).
  const holder = await User.findOne({ "telegram.chatId": chat.chatId }).select("_id");
  if (holder && !holder._id.equals(pending.userId)) return { status: "conflict" };

  // Claim the token atomically: of two simultaneous /start messages, one wins.
  const claimed = await TelegramLinkToken.findOneAndUpdate(
    { _id: pending._id, usedAt: null, expiresAt: { $gt: now } },
    { $set: { usedAt: now } },
  );
  if (!claimed) return { status: "invalid" };

  try {
    const user = await User.findOneAndUpdate(
      { _id: pending.userId },
      { $set: { telegram: { chatId: chat.chatId, username: chat.username, linkedAt: now } } },
      { new: true },
    ).select("name");
    if (!user) return { status: "invalid" }; // the account was deleted meanwhile
    return { status: "linked", name: user.name };
  } catch (error) {
    // The unique index on telegram.chatId: another account linked this chat a moment ago.
    if (isDuplicateKey(error)) return { status: "conflict" };
    throw error;
  }
}

export async function findUserByChat(chatId: number) {
  await connectDB();
  return User.findOne({ "telegram.chatId": chatId }).select("name telegram notifications settings.timezone");
}

// From the website. Says goodbye in the chat when the bot is reachable (best effort).
export async function disconnectTelegram(userId: Types.ObjectId): Promise<void> {
  await connectDB();
  const before = await User.findOneAndUpdate(
    { _id: userId },
    { $set: { telegram: { chatId: null, username: null, linkedAt: null } } },
  ).select("telegram");
  if (!before) throw new AppError("UNAUTHENTICATED");
  await TelegramLinkToken.deleteMany({ userId, usedAt: null });
  const chatId = before.telegram?.chatId;
  const config = readTelegramConfig();
  if (chatId != null && config.ok) {
    await sendMessage(config.value, chatId, msg.disconnected).catch((error) => logTelegramError("goodbye", error));
  }
}

// From the bot (/disconnect, or Telegram reporting the chat as blocked).
export async function disconnectChat(chatId: number): Promise<boolean> {
  await connectDB();
  const result = await User.updateOne(
    { "telegram.chatId": chatId },
    { $set: { telegram: { chatId: null, username: null, linkedAt: null } } },
  );
  return result.modifiedCount > 0;
}

export async function updateNotificationPrefs(
  userId: Types.ObjectId,
  input: NotificationPrefsInput,
): Promise<TelegramNotificationPrefs> {
  await connectDB();
  const user = await User.findById(userId).select("notifications");
  if (!user) throw new AppError("UNAUTHENTICATED");
  const next = mergePrefs({ ...mergePrefs(user.notifications?.telegram), ...input });
  await User.updateOne({ _id: userId }, { $set: { "notifications.telegram": next } });
  return next;
}

export async function setPrefsForChat(chatId: number, prefs: TelegramNotificationPrefs): Promise<void> {
  await connectDB();
  await User.updateOne({ "telegram.chatId": chatId }, { $set: { "notifications.telegram": prefs } });
}

// Today's habits exactly as the Dashboard sees them: the user's zone, schedule, days
// off and completions, in the user's own order. Nothing is copied or recalculated here.
export async function todayHabitLines(userId: Types.ObjectId): Promise<HabitLine[]> {
  const dashboard = await getDashboard(userId);
  return dashboard.habits
    // The Dashboard's own "due today" rule (services/dashboard.ts).
    .filter((item) => item.scheduledToday && (!item.exemptToday || item.completedToday))
    .map((item) => ({ name: item.habit.name, done: item.completedToday }));
}
