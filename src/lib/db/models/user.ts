import "server-only";
import { model, models, Schema } from "mongoose";
import type { HydratedDocument, Model } from "mongoose";
import {
  DEFAULT_STREAK_MILESTONES,
  DEFAULT_TIMEZONE,
} from "@/lib/domain/defaults";
import type {
  PublicUser,
  StreakMilestone,
  UserGoals,
  UserRecord,
  UserSettings,
  Wallet,
} from "@/types/user";
import { isInteger } from "@/lib/db/schema-helpers";


function isValidTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat("en", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

// Non-negative whole number that starts at 0.
const counter = { type: Number, default: 0, min: 0, validate: isInteger };

const streakMilestoneSchema = new Schema<StreakMilestone>(
  {
    days: { type: Number, required: true, min: 1, validate: isInteger },
    gems: { type: Number, required: true, min: 0, validate: isInteger },
  },
  { _id: false },
);

const settingsSchema = new Schema<UserSettings>(
  {
    theme: {
      type: String,
      enum: ["system", "light", "dark"],
      default: "system",
    },
    reduceMotion: { type: Boolean, default: false },
    timezone: {
      type: String,
      default: DEFAULT_TIMEZONE,
      validate: { validator: isValidTimeZone, message: "Invalid time zone" },
    },
    streakMilestones: {
      type: [streakMilestoneSchema],
      default: () => DEFAULT_STREAK_MILESTONES.map((m) => ({ ...m })),
    },
  },
  { _id: false },
);

const walletSchema = new Schema<Wallet>(
  {
    gems: counter,
    totalGemsEarned: counter,
    totalGemsSpent: counter,
    xp: counter,
    streakFreezes: counter,
  },
  { _id: false },
);

const goalsSchema = new Schema<UserGoals>(
  {
    primaryRewardId: {
      type: Schema.Types.ObjectId,
      ref: "Reward",
      default: null,
    },
    rewardIds: {
      type: [{ type: Schema.Types.ObjectId, ref: "Reward" }],
      default: [],
    },
  },
  { _id: false },
);

const userSchema = new Schema<UserRecord>(
  {
    email: {
      type: String,
      required: true,
      unique: true, // also creates a unique index
      lowercase: true,
      trim: true,
      maxlength: 254,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 50,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false, // never returned unless explicitly requested with "+passwordHash"
    },
    settings: { type: settingsSchema, default: () => ({}) },
    wallet: { type: walletSchema, default: () => ({}) },
    goals: { type: goalsSchema, default: () => ({}) },
    seenLevel: { type: Number, default: 1, min: 1, validate: isInteger },
  },
  { timestamps: true }, // adds createdAt / updatedAt
);

// In development, hot reload re-runs this file. Reuse the existing model
// instead of registering it twice (which would throw OverwriteModelError).
export const User: Model<UserRecord> =
  (models.User as Model<UserRecord> | undefined) ??
  model<UserRecord>("User", userSchema);

// Explicit mapping to the safe public shape (no passwordHash, no __v).
export function toPublicUser(user: HydratedDocument<UserRecord>): PublicUser {
  return {
    id: user._id.toString(),
    email: user.email,
    name: user.name,
    settings: {
      theme: user.settings.theme,
      reduceMotion: user.settings.reduceMotion,
      timezone: user.settings.timezone,
      streakMilestones: user.settings.streakMilestones.map(
        ({ days, gems }) => ({ days, gems }),
      ),
    },
    wallet: {
      gems: user.wallet.gems,
      totalGemsEarned: user.wallet.totalGemsEarned,
      totalGemsSpent: user.wallet.totalGemsSpent,
      xp: user.wallet.xp,
      streakFreezes: user.wallet.streakFreezes,
    },
    goals: {
      primaryRewardId: user.goals.primaryRewardId?.toString() ?? null,
      rewardIds: user.goals.rewardIds.map((id) => id.toString()),
    },
    seenLevel: user.seenLevel,
    createdAt: user.createdAt.toISOString(),
  };
}