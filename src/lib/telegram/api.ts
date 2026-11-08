import "server-only";
import type { TelegramConfig } from "@/lib/config/server-env";
import type { BotMessage } from "@/lib/telegram/messages";

// A minimal Telegram Bot API client on fetch (no library). The bot token is part of
// the request URL, so errors NEVER include the URL: only the method name, Telegram's
// error code and its description.

export class TelegramApiError extends Error {
  readonly code: number; // Telegram's error_code; 0 = network or timeout
  readonly retryAfter: number | null; // seconds, for 429

  constructor(method: string, code: number, description: string, retryAfter: number | null = null) {
    super(`Telegram ${method} failed (${code}): ${description}`.slice(0, 300));
    this.name = "TelegramApiError";
    this.code = code;
    this.retryAfter = retryAfter;
  }

  // The chat is gone for good: the user blocked the bot, deleted their account, or
  // the chat never existed. Retrying can't help.
  get chatUnreachable(): boolean {
    return this.code === 403 || (this.code === 400 && /chat not found|user is deactivated/i.test(this.message));
  }
}

interface TelegramResponse<T> {
  ok: boolean;
  result?: T;
  error_code?: number;
  description?: string;
  parameters?: { retry_after?: number };
}

const TIMEOUT_MS = 10_000;

export async function callTelegram<T = unknown>(
  config: TelegramConfig,
  method: string,
  payload: Record<string, unknown> = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${config.apiBase}/bot${config.token}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
  } catch {
    throw new TelegramApiError(method, 0, "network error or timeout");
  }
  const body = (await response.json().catch(() => null)) as TelegramResponse<T> | null;
  if (!body || !body.ok) {
    throw new TelegramApiError(
      method,
      body?.error_code ?? response.status,
      body?.description ?? "unexpected response",
      body?.parameters?.retry_after ?? null,
    );
  }
  return body.result as T;
}

function replyMarkup(message: BotMessage) {
  return message.buttons && message.buttons.length > 0 ? { inline_keyboard: message.buttons } : undefined;
}

export function sendMessage(config: TelegramConfig, chatId: number, message: BotMessage) {
  return callTelegram(config, "sendMessage", {
    chat_id: chatId,
    text: message.text,
    parse_mode: "HTML",
    link_preview_options: { is_disabled: true },
    reply_markup: replyMarkup(message),
  });
}

export function editMessage(config: TelegramConfig, chatId: number, messageId: number, message: BotMessage) {
  return callTelegram(config, "editMessageText", {
    chat_id: chatId,
    message_id: messageId,
    text: message.text,
    parse_mode: "HTML",
    link_preview_options: { is_disabled: true },
    reply_markup: replyMarkup(message),
  });
}

export function answerCallback(config: TelegramConfig, callbackQueryId: string, text?: string) {
  return callTelegram(config, "answerCallbackQuery", { callback_query_id: callbackQueryId, text });
}

// Logs a failed send without anything secret, and swallows it: a reply that can't be
// delivered must not make Telegram resend the whole update.
export function logTelegramError(context: string, error: unknown) {
  const detail = error instanceof TelegramApiError ? error.message : "unexpected error";
  console.error(`[telegram] ${context}: ${detail}`);
}
