import { z } from "zod";
import { isValidDateKey, isValidTimeZone } from "@/lib/domain/dates";
import { LIMITS, MAX_STREAK_FREEZES } from "@/lib/domain/defaults";

export const completeSchema = z.object({
  minutes: z.number().int().min(1).max(LIMITS.maxMinutesPerDay).optional(),
});

export const missedDaySchema = z.object({
  date: z.string().refine(isValidDateKey, "Use a valid date in YYYY-MM-DD format."),
  decision: z.enum(["frozen", "broken"]),
});

export const buyFreezesSchema = z.object({
  quantity: z.number().int().min(1).max(MAX_STREAK_FREEZES),
});

export const timezoneSchema = z.object({
  timezone: z.string().trim().min(1).max(64).refine(isValidTimeZone, "Invalid time zone."),
});

// The complete order of the user's habits, as ids. Unknown ids are dropped by the service.
export const habitOrderSchema = z.object({
  habitIds: z
    .array(z.string().regex(/^[a-f0-9]{24}$/i, "Invalid habit id."))
    .max(LIMITS.maxHabits)
    .refine((ids) => new Set(ids).size === ids.length, "Each habit can appear only once."),
});

export type CompleteInput = z.infer<typeof completeSchema>;
