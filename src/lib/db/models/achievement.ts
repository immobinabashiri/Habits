import "server-only";
import { model, models, Schema } from "mongoose";
import type { Model } from "mongoose";
import { dateKey, isInteger, ownerField } from "@/lib/db/schema-helpers";
import type { AchievementUnlockRecord } from "@/types/achievement";

const achievementUnlockSchema = new Schema<AchievementUnlockRecord>(
  {
    userId: ownerField,
    key: { type: String, required: true, maxlength: 200 },
    kind: { type: String, enum: ["achievement", "streak-milestone"], required: true },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    xp: { type: Number, default: 0, min: 0, validate: isInteger },
    habitId: { type: Schema.Types.ObjectId, ref: "Habit", default: null },
    unlockedOn: { type: String, required: true, validate: dateKey },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

// Each achievement or streak milestone can be unlocked only once per user.
achievementUnlockSchema.index({ userId: 1, key: 1 }, { unique: true });

export const AchievementUnlock: Model<AchievementUnlockRecord> =
  (models.AchievementUnlock as Model<AchievementUnlockRecord> | undefined) ??
  model<AchievementUnlockRecord>("AchievementUnlock", achievementUnlockSchema);