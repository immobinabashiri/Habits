import "server-only";
import type { Types } from "mongoose";
import { User } from "@/lib/db/models/user";
import { levelFromXp } from "@/lib/domain/progress";
import { AppError } from "@/lib/errors";
import { connectDB } from "@/utils/connectDB";

export async function setTimezone(userId: Types.ObjectId, timezone: string): Promise<void> {
  await connectDB();
  const result = await User.updateOne({ _id: userId }, { $set: { "settings.timezone": timezone } });
  if (result.matchedCount === 0) throw new AppError("UNAUTHENTICATED");
}

// The user dismissed the level-up banner: remember the level they were told about.
export async function acknowledgeLevel(userId: Types.ObjectId): Promise<void> {
  await connectDB();
  const user = await User.findById(userId).select("wallet");
  if (!user) throw new AppError("UNAUTHENTICATED");
  const level = levelFromXp(user.wallet.xp);
  await User.updateOne({ _id: userId, seenLevel: { $lt: level } }, { $set: { seenLevel: level } });
}

// The name shown in the sidebar. Read from the database (not the login token), so a
// rename shows up immediately without logging in again.
export async function getDisplayName(userId: Types.ObjectId): Promise<string | null> {
  await connectDB();
  const user = await User.findById(userId).select("name");
  return user?.name ?? null;
}
