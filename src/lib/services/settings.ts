import "server-only";
import type { Types } from "mongoose";
import { User } from "@/lib/db/models/user";
import { AppError } from "@/lib/errors";
import { hashPassword, verifyPassword } from "@/utils/auth";
import { connectDB } from "@/utils/connectDB";
import type { MilestonesInput, PasswordInput, ProfileInput } from "@/lib/validation/settings";
import type { StreakMilestone } from "@/types/user";

export interface SettingsData {
  name: string;
  email: string;
  timezone: string;
  milestones: StreakMilestone[]; // sorted by days
}

const byDays = (a: StreakMilestone, b: StreakMilestone) => a.days - b.days;

export async function getSettings(userId: Types.ObjectId): Promise<SettingsData> {
  await connectDB();
  const user = await User.findById(userId);
  if (!user) throw new AppError("UNAUTHENTICATED");
  return {
    name: user.name,
    email: user.email,
    timezone: user.settings.timezone,
    milestones: user.settings.streakMilestones.map(({ days, gems }) => ({ days, gems })).sort(byDays),
  };
}

export async function updateProfile(userId: Types.ObjectId, input: ProfileInput): Promise<string> {
  await connectDB();
  const result = await User.updateOne(
    { _id: userId },
    { $set: { name: input.name } },
    { runValidators: true },
  );
  if (result.matchedCount === 0) throw new AppError("UNAUTHENTICATED");
  return input.name;
}

// Replaces the whole list. Streak bonuses already paid are never taken back, and a
// bonus is paid only once per streak run, so editing the list cannot pay twice.
// A NEW or lowered bonus does apply to a streak the habit is on right now: it is
// paid the next time that habit is completed.
export async function setMilestones(
  userId: Types.ObjectId,
  input: MilestonesInput,
): Promise<StreakMilestone[]> {
  await connectDB();
  const milestones = input.milestones.map(({ days, gems }) => ({ days, gems })).sort(byDays);
  const result = await User.updateOne(
    { _id: userId },
    { $set: { "settings.streakMilestones": milestones } },
    { runValidators: true },
  );
  if (result.matchedCount === 0) throw new AppError("UNAUTHENTICATED");
  return milestones;
}

// Accounts created with Google have a random password nobody knows, so the
// current-password check can never pass for them.
export async function changePassword(userId: Types.ObjectId, input: PasswordInput): Promise<void> {
  await connectDB();
  const user = await User.findById(userId).select("+passwordHash");
  if (!user) throw new AppError("UNAUTHENTICATED");

  if (!(await verifyPassword(input.currentPassword, user.passwordHash))) {
    throw new AppError("VALIDATION_FAILED", { currentPassword: "Your current password is incorrect." });
  }
  const passwordHash = await hashPassword(input.newPassword);
  await User.updateOne({ _id: userId }, { $set: { passwordHash } });
}
