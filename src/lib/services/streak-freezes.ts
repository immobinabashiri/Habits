import "server-only";
import type { Types } from "mongoose";
import { FreezeDecision } from "@/lib/db/models/completion";
import { Habit } from "@/lib/db/models/habit";
import { Purchase } from "@/lib/db/models/transaction";
import { User } from "@/lib/db/models/user";
import { MAX_STREAK_FREEZES, STREAK_FREEZE_PRICE } from "@/lib/domain/defaults";
import type { FreezeChoice } from "@/lib/domain/streaks";
import { AppError } from "@/lib/errors";
import { awardProgress } from "@/lib/services/awards";
import { getDashboard } from "@/lib/services/dashboard";
import { adjustWallet, isDuplicateKeyError, recordTransaction } from "@/lib/services/ledger";
import { connectDB } from "@/utils/connectDB";
import type { DateKey } from "@/types/common";
import type { DashboardMutation } from "@/types/dashboard";

export async function buyStreakFreezes(
  userId: Types.ObjectId,
  quantity: number,
): Promise<DashboardMutation> {
  await connectDB();
  const cost = quantity * STREAK_FREEZE_PRICE;

  // One atomic update: it only applies when the balance covers the price AND the
  // user stays under the cap, so two quick clicks can never overspend.
  const paid = await User.updateOne(
    {
      _id: userId,
      "wallet.gems": { $gte: cost },
      "wallet.streakFreezes": { $lte: MAX_STREAK_FREEZES - quantity },
    },
    {
      $inc: {
        "wallet.gems": -cost,
        "wallet.totalGemsSpent": cost,
        "wallet.streakFreezes": quantity,
      },
    },
  );
  if (paid.modifiedCount === 0) {
    const user = await User.findById(userId).select("wallet");
    if (!user) throw new AppError("UNAUTHENTICATED");
    throw new AppError(
      user.wallet.streakFreezes + quantity > MAX_STREAK_FREEZES ? "LIMIT_REACHED" : "INSUFFICIENT_GEMS",
    );
  }

  const purchase = await Purchase.create({
    userId,
    kind: "streak-freeze",
    rewardId: null,
    name: "Streak Freeze",
    icon: "snowflake",
    category: "Streaks",
    cost,
    quantity,
  });
  await recordTransaction(userId, {
    type: "purchase",
    amount: -cost,
    label: quantity === 1 ? "Streak Freeze" : `Streak Freeze x${quantity}`,
    refId: purchase._id.toString(),
    eventKey: `purchase:${purchase._id}`,
  });

  return { dashboard: await getDashboard(userId), result: null };
}

// Decide what happens to a recently missed day: spend a Streak Freeze to keep the
// streak, or let it break. Only the day the dashboard currently offers is accepted.
export async function decideMissedDay(
  userId: Types.ObjectId,
  habitId: Types.ObjectId,
  date: DateKey,
  decision: FreezeChoice,
): Promise<DashboardMutation> {
  await connectDB();
  if (!(await Habit.exists({ _id: habitId, userId }))) throw new AppError("NOT_FOUND");

  const current = await getDashboard(userId);
  const entry = current.habits.find((item) => item.habit.id === habitId.toString());
  if (entry?.pendingFreeze?.date !== date) {
    throw new AppError("VALIDATION_FAILED", { date: "There is nothing to decide for this day." });
  }

  if (decision === "frozen") {
    // Take the freeze first (atomic); give it back if recording the decision fails.
    const taken = await User.updateOne(
      { _id: userId, "wallet.streakFreezes": { $gte: 1 } },
      { $inc: { "wallet.streakFreezes": -1 } },
    );
    if (taken.modifiedCount === 0) throw new AppError("FREEZE_UNAVAILABLE");
    try {
      await FreezeDecision.create({ userId, habitId, date, decision });
    } catch (error) {
      await adjustWallet(userId, { streakFreezes: 1 });
      if (isDuplicateKeyError(error)) {
        throw new AppError("VALIDATION_FAILED", { date: "This day was already decided." });
      }
      throw error;
    }
  } else {
    try {
      await FreezeDecision.create({ userId, habitId, date, decision });
    } catch (error) {
      if (!isDuplicateKeyError(error)) throw error;
    }
  }

  // A freeze can join two runs and push the streak past a milestone (or unlock an
  // achievement) without any completion, so pay that out now.
  if (decision === "frozen") {
    const won = await awardProgress(userId, habitId, current.today);
    const earned = won.milestones.length > 0 || won.achievements.length > 0;
    return {
      dashboard: won.dashboard,
      result: earned
        ? { xp: 0, gems: 0, bonusUnits: 0, milestones: won.milestones, achievements: won.achievements }
        : null,
    };
  }
  return { dashboard: await getDashboard(userId), result: null };
}
