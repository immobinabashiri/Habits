import "server-only";
import { model, models, Schema } from "mongoose";
import type { Model } from "mongoose";
import { LIMITS } from "@/lib/domain/defaults";
import { dateKey, isInteger, ownerField } from "@/lib/db/schema-helpers";
import { HabitRecord, HabitTimedConfig } from "@/types/habits";

// Also reused for the reward snapshot stored on each completion.
export const timedConfigSchema = new Schema<HabitTimedConfig>(
  {
    targetMinutes: {
      type: Number,
      required: true,
      min: 1,
      max: LIMITS.maxMinutesPerDay,
      validate: isInteger,
    },
    unitMinutes: {
      type: Number,
      required: true,
      min: 1,
      max: LIMITS.maxMinutesPerDay,
      validate: isInteger,
    },
    extraXpPerUnit: {
      type: Number,
      default: 0,
      min: 0,
      max: LIMITS.maxHabitXp,
      validate: isInteger,
    },
    extraGemsPerUnit: {
      type: Number,
      default: 0,
      min: 0,
      max: LIMITS.maxHabitGems,
      validate: isInteger,
    },
  },
  { _id: false },
);

// Only "weekdays" exists today. A monthly kind will be added to the enum later.
const scheduleSchema = new Schema(
  {
    kind: { type: String, enum: ["weekdays"], default: "weekdays" },
    days: {
      type: [{ type: Number, min: 0, max: 6, validate: isInteger }],
      validate: [
        {
          validator: (v: number[]) => v.length >= 1,
          message: "Pick at least one day",
        },
        {
          validator: (v: number[]) => new Set(v).size === v.length,
          message: "Days must be unique",
        },
      ],
    },
  },
  { _id: false },
);

const habitSchema = new Schema<HabitRecord>(
  {
    userId: ownerField,
    name: { type: String, required: true, trim: true, minlength: 1, maxlength: 60 },
    icon: { type: String, trim: true, maxlength: 32, default: "star" },
    category: { type: String, trim: true, minlength: 1, maxlength: 40, default: "Other" },
    description: { type: String, trim: true, maxlength: 300, default: "" },
    kind: { type: String, enum: ["core", "bonus"], default: "core" },
    schedule: { type: scheduleSchema, required: true },
    xp: { type: Number, default: 10, min: 0, max: LIMITS.maxHabitXp, validate: isInteger },
    // Business rule (enforced in the API layer): core habits keep gems at 0.
    gems: { type: Number, default: 0, min: 0, max: LIMITS.maxHabitGems, validate: isInteger },
    timed: { type: timedConfigSchema, default: null },
    startDate: { type: String, required: true, validate: dateKey },
    exemptDates: { type: [{ type: String, validate: dateKey }], default: [] },
    archivedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// "List this user's active habits" is the hottest query.
habitSchema.index({ userId: 1, archivedAt: 1 });

export const Habit: Model<HabitRecord> =
  (models.Habit as Model<HabitRecord> | undefined) ??
  model<HabitRecord>("Habit", habitSchema);