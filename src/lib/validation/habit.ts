import { z } from "zod";
import { isValidDateKey } from "@/lib/domain/dates";
import { LIMITS } from "@/lib/domain/defaults";
import type { Weekday } from "@/types/common";

const dateKey = z
  .string()
  .refine(isValidDateKey, "Use a valid date in YYYY-MM-DD format.");

const name = z
  .string()
  .trim()
  .min(1, "Enter a name.")
  .max(60, "Name must be at most 60 characters.");
const icon = z.string().trim().min(1).max(32);
const category = z.string().trim().min(1).max(40);
const description = z.string().trim().max(300, "Description is too long.");
const kind = z.enum(["core", "bonus"]);
const xp = z.number().int().min(0).max(LIMITS.maxHabitXp);
const gems = z.number().int().min(0).max(LIMITS.maxHabitGems);

const schedule = z.object({
  kind: z.literal("weekdays"),
  days: z
    .array(z.number().int().min(0).max(6))
    .min(1, "Pick at least one day.")
    .max(7)
    .refine((days) => new Set(days).size === days.length, "Days must be unique.")
    .transform((days) => days as Weekday[]),
});

// A habit tracked in minutes. Every field is required when `timed` is sent.
const timed = z.object({
  targetMinutes: z.number().int().min(1).max(LIMITS.maxMinutesPerDay),
  unitMinutes: z.number().int().min(1).max(LIMITS.maxMinutesPerDay),
  extraXpPerUnit: z.number().int().min(0).max(LIMITS.maxHabitXp),
  extraGemsPerUnit: z.number().int().min(0).max(LIMITS.maxHabitGems),
});

export const createHabitSchema = z.object({
  name,
  icon: icon.optional(),
  category: category.optional(),
  description: description.optional(),
  kind: kind.optional(),
  schedule,
  xp: xp.optional(),
  gems: gems.optional(),
  timed: timed.nullable().optional(),
  startDate: dateKey.optional(), // defaults to today in the user's time zone
});

// startDate is not editable: changing it would silently change streaks.
export const updateHabitSchema = z
  .object({
    name: name.optional(),
    icon: icon.optional(),
    category: category.optional(),
    description: description.optional(),
    kind: kind.optional(),
    schedule: schedule.optional(),
    xp: xp.optional(),
    gems: gems.optional(),
    timed: timed.nullable().optional(), // null turns a timed habit into a simple one
  })
  .refine(
    (value) => Object.keys(value).length > 0,
    "Send at least one field to change.",
  );

export const archiveSchema = z.object({ archived: z.boolean() });
export const exemptDateSchema = z.object({ date: dateKey });
export const listQuerySchema = z.object({
  status: z.enum(["active", "archived", "all"]).optional(),
});

export type CreateHabitInput = z.infer<typeof createHabitSchema>;
export type UpdateHabitInput = z.infer<typeof updateHabitSchema>;