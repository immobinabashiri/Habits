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

export type CompleteInput = z.infer<typeof completeSchema>;
