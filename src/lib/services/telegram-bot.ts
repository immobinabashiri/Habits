import "server-only";
import { TelegramUpdate as ProcessedUpdate } from "@/lib/db/models/telegram";
import { siteUrl } from "@/lib/brand";
import type { TelegramConfig } from "@/lib/config/server-env";
import { mergePrefs } from "@/lib/domain/notifications";
import {
  completeTelegramLink,
  disconnectChat,
  findUserByChat,
  setPrefsForChat,
  todayHabitLines,
} from "@/lib/services/telegram";
import { answerCallback, editMessage, logTelegramError, sendMessage } from "@/lib/telegram/api";
import * as msg from "@/lib/telegram/messages";
import { parseCommand } from "@/lib/telegram/messages";
import type { BotMessage, PrefToggle } from "@/lib/telegram/messages";
import type { TelegramUpdate } from "@/lib/validation/notifications";
import { connectDB } from "@/utils/connectDB";
import type { TelegramNotificationPrefs } from "@/types/notifications";

// Handles one webhook update. Telegram may deliver an update more than once (it
// retries until it gets a 2xx), so each update_id is recorded first and skipped if
// already seen. If processing itself fails, the record is removed again and the
// error is rethrown, so Telegram's retry gets a clean second attempt.

export type UpdateResult = "processed" | "duplicate" | "ignored";

function isDuplicateKey(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { code?: number }).code === 11000;
}

export async function handleTelegramUpdate(config: TelegramConfig, update: TelegramUpdate): Promise<UpdateResult> {
  await connectDB();
  try {
    await ProcessedUpdate.create({ _id: update.update_id, updateId: update.update_id });
  } catch (error) {
    if (isDuplicateKey(error)) return "duplicate";
    throw error;
  }
  try {
    return await dispatch(config, update);
  } catch (error) {
    await ProcessedUpdate.deleteOne({ _id: update.update_id }).catch(() => undefined);
    throw error;
  }
}

async function dispatch(config: TelegramConfig, update: TelegramUpdate): Promise<UpdateResult> {
  // The user blocked the bot: stop messaging that chat.
  if (update.my_chat_member) {
    const { chat, new_chat_member } = update.my_chat_member;
    if (chat.type === "private" && (new_chat_member.status === "kicked" || new_chat_member.status === "left")) {
      await disconnectChat(chat.id);
    }
    return "processed";
  }
  if (update.callback_query) return handleCallback(config, update.callback_query);
  if (update.message) return handleMessage(config, update.message);
  return "ignored";
}

// Replies are best effort: a reply that fails (blocked bot, deleted chat) is logged,
// not retried, so one unreachable chat can't make Telegram resend updates forever.
async function reply(config: TelegramConfig, chatId: number, message: BotMessage) {
  await sendMessage(config, chatId, message).catch((error) => logTelegramError("reply", error));
}

type IncomingMessage = NonNullable<TelegramUpdate["message"]>;

async function handleMessage(config: TelegramConfig, message: IncomingMessage): Promise<UpdateResult> {
  const chatId = message.chat.id;
  if (message.from?.is_bot) return "ignored";
  if (message.chat.type !== "private") {
    if (message.text?.startsWith("/")) await reply(config, chatId, msg.privateOnly);
    return "ignored";
  }
  const site = siteUrl();
  const parsed = parseCommand(message.text ?? "");
  const user = await findUserByChat(chatId);

  if (!parsed) {
    await reply(config, chatId, user ? msg.help(site) : msg.welcome(site, null));
    return "processed";
  }

  switch (parsed.command) {
    case "start": {
      if (!parsed.arg) {
        await reply(config, chatId, msg.welcome(site, user?.name ?? null));
        return "processed";
      }
      const outcome = await completeTelegramLink(parsed.arg, { chatId, username: message.from?.username ?? null });
      await reply(
        config,
        chatId,
        outcome.status === "linked" ? msg.linked(outcome.name) : outcome.status === "conflict" ? msg.linkConflict : msg.linkInvalid,
      );
      return "processed";
    }
    case "help":
      await reply(config, chatId, msg.help(site));
      return "processed";
    case "status":
      await reply(
        config,
        chatId,
        user ? msg.status(user.name, mergePrefs(user.notifications?.telegram), user.settings.timezone) : msg.notConnected,
      );
      return "processed";
    case "settings":
      await reply(
        config,
        chatId,
        user ? msg.settings(mergePrefs(user.notifications?.telegram), user.settings.timezone, site) : msg.notConnected,
      );
      return "processed";
    case "today":
      await reply(config, chatId, user ? msg.today(await todayHabitLines(user._id), site) : msg.notConnected);
      return "processed";
    case "disconnect":
      await reply(config, chatId, user ? msg.confirmDisconnect : msg.notConnected);
      return "processed";
    default:
      await reply(config, chatId, msg.help(site));
      return "processed";
  }
}

type CallbackQuery = NonNullable<TelegramUpdate["callback_query"]>;

function toggle(prefs: TelegramNotificationPrefs, pref: PrefToggle): TelegramNotificationPrefs {
  switch (pref) {
    case "enabled":
      return { ...prefs, enabled: !prefs.enabled };
    case "calendarReminders":
      return { ...prefs, calendarReminders: !prefs.calendarReminders };
    default:
      return { ...prefs, [pref]: { ...prefs[pref], enabled: !prefs[pref].enabled } };
  }
}

async function handleCallback(config: TelegramConfig, query: CallbackQuery): Promise<UpdateResult> {
  const chatId = query.message?.chat.id;
  const messageId = query.message?.message_id;
  const ack = (text?: string) => answerCallback(config, query.id, text).catch((e) => logTelegramError("callback answer", e));
  // Buttons only act in the private chat of the person who pressed them.
  if (chatId === undefined || messageId === undefined || query.message?.chat.type !== "private" || query.from.id !== chatId) {
    await ack();
    return "ignored";
  }
  const user = await findUserByChat(chatId);
  if (!user) {
    await ack("This chat isn't connected.");
    return "processed";
  }
  const site = siteUrl();
  const data = query.data ?? "";
  const edit = (message: BotMessage) =>
    editMessage(config, chatId, messageId, message).catch((e) => logTelegramError("edit", e));

  if (data.startsWith("pref:")) {
    const pref = data.slice(5) as PrefToggle;
    if (!(msg.PREF_TOGGLES as readonly string[]).includes(pref)) {
      await ack();
      return "ignored";
    }
    const next = toggle(mergePrefs(user.notifications?.telegram), pref);
    await setPrefsForChat(chatId, next);
    await edit(msg.settings(next, user.settings.timezone, site));
    await ack("Saved");
    return "processed";
  }
  if (data === msg.CALLBACKS.disconnectYes) {
    await disconnectChat(chatId);
    await edit(msg.disconnected);
    await ack("Disconnected");
    return "processed";
  }
  if (data === msg.CALLBACKS.disconnectNo) {
    await edit(msg.keptConnected);
    await ack();
    return "processed";
  }
  if (data === msg.CALLBACKS.today) {
    await edit(msg.today(await todayHabitLines(user._id), site));
    await ack("Updated");
    return "processed";
  }
  await ack();
  return "ignored";
}
