import { z } from "zod";
import { isValidTime } from "@/lib/domain/calendar";

const time = z.string().refine(isValidTime, "Use a time like 09:00.");
const timed = z.object({ enabled: z.boolean(), time });

// Settings → Telegram. Any subset; missing fields keep their current value.
export const notificationPrefsSchema = z
  .object({
    enabled: z.boolean().optional(),
    habitReminder: timed.optional(),
    incompleteReminder: timed.optional(),
    dailySummary: timed.optional(),
    calendarReminders: z.boolean().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, "Send at least one setting to change.");

export type NotificationPrefsInput = z.infer<typeof notificationPrefsSchema>;

// The parts of a Telegram update the bot uses. Everything else is ignored, and an
// update that doesn't match is acknowledged without being processed.
const chat = z.object({ id: z.number().int(), type: z.string() });
const from = z.object({ id: z.number().int(), is_bot: z.boolean().optional(), username: z.string().max(64).optional() });

export const telegramUpdateSchema = z.object({
  update_id: z.number().int().nonnegative(),
  message: z
    .object({ message_id: z.number().int(), chat, from: from.optional(), text: z.string().max(4096).optional() })
    .optional(),
  callback_query: z
    .object({
      id: z.string().max(128),
      from,
      data: z.string().max(64).optional(),
      message: z.object({ message_id: z.number().int(), chat }).optional(),
    })
    .optional(),
  my_chat_member: z
    .object({ chat, new_chat_member: z.object({ status: z.string() }) })
    .optional(),
});

export type TelegramUpdate = z.infer<typeof telegramUpdateSchema>;

// Cron: ?jobs=habitReminder,calendarReminder&dryRun=1
export const cronQuerySchema = z.object({
  jobs: z
    .string()
    .optional()
    .transform((value) => (value ? value.split(",").map((s) => s.trim()).filter(Boolean) : null))
    .pipe(z.array(z.enum(["habitReminder", "incompleteReminder", "dailySummary", "calendarReminder"])).nullable()),
  dryRun: z
    .enum(["1", "true", "0", "false"])
    .optional()
    .transform((value) => value === "1" || value === "true"),
});
