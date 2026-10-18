import "server-only";
import { model, models, Schema } from "mongoose";
import type { Model } from "mongoose";
import { LIMITS } from "@/lib/domain/defaults";
import { dateKey, isInteger, ownerField } from "@/lib/db/schema-helpers";
import { timedConfigSchema } from "@/lib/db/models/habit";
import type {
  CompletionRecord,
  FreezeDecisionRecord,
  HabitRewardSnapshot,
  TimeLogRecord,
} from "@/types/habits";

const habitRef = { type: Schema.Types.ObjectId, ref: "Habit", required: true };
const amount = { type: Number, default: 0, min: 0, validate: isInteger };

const rewardSnapshotSchema = new Schema<HabitRewardSnapshot>(
  {
    xp: amount,
    gems: amount,
    timed: { type: timedConfigSchema, default: null },
  },
  { _id: false },
);

// ---- Completion: one record per habit per day. Undo sets reversedAt. ----
const completionSchema = new Schema<CompletionRecord>({
  userId: ownerField,
  habitId: habitRef,
  date: { type: String, required: true, validate: dateKey },
  minutes: { type: Number, default: 0, min: 0, max: LIMITS.maxMinutesPerDay, validate: isInteger },
  xp: amount,
  gems: amount,
  habitName: { type: String, required: true, trim: true, maxlength: 60 },
  rewardSnapshot: { type: rewardSnapshotSchema, required: true },
  completedAt: { type: Date, default: Date.now },
  reversedAt: { type: Date, default: null },
});

// Prevents duplicate completions, even for simultaneous requests.
completionSchema.index({ userId: 1, habitId: 1, date: 1 }, { unique: true });
// Calendar and "today" queries filter by user and date range.
completionSchema.index({ userId: 1, date: 1 });

// ---- TimeLog: minutes logged for a habit on a day ----
const timeLogSchema = new Schema<TimeLogRecord>({
  userId: ownerField,
  habitId: habitRef,
  date: { type: String, required: true, validate: dateKey },
  minutes: { type: Number, required: true, min: 0, max: LIMITS.maxMinutesPerDay, validate: isInteger },
});
timeLogSchema.index({ userId: 1, habitId: 1, date: 1 }, { unique: true });

// ---- FreezeDecision: was a missed day frozen (streak kept) or broken ----
const freezeDecisionSchema = new Schema<FreezeDecisionRecord>({
  userId: ownerField,
  habitId: habitRef,
  date: { type: String, required: true, validate: dateKey },
  decision: { type: String, enum: ["frozen", "broken"], required: true },
});
freezeDecisionSchema.index({ userId: 1, habitId: 1, date: 1 }, { unique: true });

export const Completion: Model<CompletionRecord> =
  (models.Completion as Model<CompletionRecord> | undefined) ??
  model<CompletionRecord>("Completion", completionSchema);

export const TimeLog: Model<TimeLogRecord> =
  (models.TimeLog as Model<TimeLogRecord> | undefined) ??
  model<TimeLogRecord>("TimeLog", timeLogSchema);

export const FreezeDecision: Model<FreezeDecisionRecord> =
  (models.FreezeDecision as Model<FreezeDecisionRecord> | undefined) ??
  model<FreezeDecisionRecord>("FreezeDecision", freezeDecisionSchema);