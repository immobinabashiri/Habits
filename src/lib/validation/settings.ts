import { z } from "zod";
import { MAX_MILESTONE_DAYS, MAX_MILESTONE_GEMS, MAX_MILESTONES } from "@/lib/domain/defaults";

export const MIN_DISPLAY_NAME = 2;
export const MAX_DISPLAY_NAME = 50; // the User model allows 50 characters
export const MIN_NEW_PASSWORD = 8;
export const MAX_NEW_PASSWORD = 128;

export const profileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(MIN_DISPLAY_NAME, `Name must be at least ${MIN_DISPLAY_NAME} characters.`)
    .max(MAX_DISPLAY_NAME, `Name must be at most ${MAX_DISPLAY_NAME} characters.`),
});

const milestone = z.object({
  days: z
    .number("Enter the number of days.")
    .int("Days must be a whole number.")
    .min(1, "Days must be at least 1.")
    .max(MAX_MILESTONE_DAYS, `Days must be at most ${MAX_MILESTONE_DAYS}.`),
  gems: z
    .number("Enter the gems.")
    .int("Gems must be a whole number.")
    .min(0, "Gems cannot be negative.")
    .max(MAX_MILESTONE_GEMS, `Gems must be at most ${MAX_MILESTONE_GEMS.toLocaleString("en-US")}.`),
});

// An empty list is allowed: it simply means "no streak bonuses".
export const milestonesSchema = z.object({
  milestones: z
    .array(milestone)
    .max(MAX_MILESTONES, `You can have at most ${MAX_MILESTONES} streak bonuses.`)
    .refine(
      (list) => new Set(list.map((m) => m.days)).size === list.length,
      "Each bonus needs a different number of days.",
    ),
});

export const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password.").max(MAX_NEW_PASSWORD),
    newPassword: z
      .string()
      .min(MIN_NEW_PASSWORD, `Password must be at least ${MIN_NEW_PASSWORD} characters.`)
      .max(MAX_NEW_PASSWORD, `Password must be at most ${MAX_NEW_PASSWORD} characters.`),
  })
  .refine((value) => value.newPassword !== value.currentPassword, {
    path: ["newPassword"],
    message: "Choose a password that is different from the current one.",
  });

export type ProfileInput = z.infer<typeof profileSchema>;
export type MilestonesInput = z.infer<typeof milestonesSchema>;
export type PasswordInput = z.infer<typeof passwordSchema>;
