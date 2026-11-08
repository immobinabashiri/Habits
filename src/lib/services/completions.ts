import "server-only";
import type { HydratedDocument, Types } from "mongoose";
import { Completion } from "@/lib/db/models/completion";
import { Habit } from "@/lib/db/models/habit";
import { User } from "@/lib/db/models/user";
import { todayKey, weekdayOf } from "@/lib/domain/dates";
import { computeReward } from "@/lib/domain/progress";
import type { Reward } from "@/lib/domain/progress";
import { AppError } from "@/lib/errors";
import { awardProgress } from "@/lib/services/awards";
import { getDashboard } from "@/lib/services/dashboard";
import { adjustWallet, isDuplicateKeyError, recordTransaction } from "@/lib/services/ledger";
import type { CompleteInput } from "@/lib/validation/dashboard";
import { connectDB } from "@/utils/connectDB";
import type { DateKey } from "@/types/common";
import type { CompletionResult, DashboardMutation } from "@/types/dashboard";
import type { HabitRecord } from "@/types/habits";

async function loadUser(userId: Types.ObjectId) {
  await connectDB();
  const user = await User.findById(userId).select("settings wallet");
  if (!user) throw new AppError("UNAUTHENTICATED");
  return user;
}

// Minutes only matter for timed habits, and they must reach the minimum.
function resolveMinutes(habit: HydratedDocument<HabitRecord>, minutes: number | undefined): number {
  if (!habit.timed) return 0;
  if (minutes === undefined) {
    throw new AppError("VALIDATION_FAILED", { minutes: "Enter the minutes you spent." });
  }
  if (minutes < habit.timed.targetMinutes) {
    throw new AppError("VALIDATION_FAILED", {
      minutes: `At least ${habit.timed.targetMinutes} minutes are needed.`,
    });
  }
  return minutes;
}

// One record per habit per day. The unique index (userId, habitId, date) is the
// guard: two simultaneous requests can never both create it. After an undo the
// same record is reused, so a day can be completed again.
async function saveCompletion(
  userId: Types.ObjectId,
  habit: HydratedDocument<HabitRecord>,
  date: DateKey,
  minutes: number,
  reward: Reward,
) {
  const fields = {
    minutes,
    xp: reward.xp,
    gems: reward.gems,
    habitName: habit.name,
    rewardSnapshot: {
      xp: habit.xp,
      gems: habit.kind === "bonus" ? habit.gems : 0,
      timed: habit.timed
        ? {
            targetMinutes: habit.timed.targetMinutes,
            unitMinutes: habit.timed.unitMinutes,
            extraXpPerUnit: habit.timed.extraXpPerUnit,
            extraGemsPerUnit: habit.timed.extraGemsPerUnit,
          }
        : null,
    },
    completedAt: new Date(),
    reversedAt: null,
  };

  const existing = await Completion.findOne({ userId, habitId: habit._id, date }).select("reversedAt");
  if (existing) {
    if (!existing.reversedAt) throw new AppError("ALREADY_COMPLETED");
    const revived = await Completion.findOneAndUpdate(
      { _id: existing._id, reversedAt: { $ne: null } },
      { $set: fields },
      { returnDocument: "after" },
    );
    if (!revived) throw new AppError("ALREADY_COMPLETED");
    return revived;
  }
  try {
    return await Completion.create({ userId, habitId: habit._id, date, ...fields });
  } catch (error) {
    if (isDuplicateKeyError(error)) throw new AppError("ALREADY_COMPLETED");
    throw error;
  }
}

export async function completeHabit(
  userId: Types.ObjectId,
  habitId: Types.ObjectId,
  input: CompleteInput,
): Promise<DashboardMutation> {
  const user = await loadUser(userId);
  // "Today" always comes from the server clock and the user's time zone, never
  // from the request, so completions cannot be backdated or pre-filled.
  const today = todayKey(user.settings.timezone);

  const habit = await Habit.findOne({ _id: habitId, userId });
  if (!habit) throw new AppError("NOT_FOUND");
  if (
    habit.archivedAt ||
    today < habit.startDate ||
    !habit.schedule.days.includes(weekdayOf(today)) ||
    habit.exemptDates.includes(today)
  ) {
    throw new AppError("NOT_AVAILABLE_TODAY");
  }

  const minutes = resolveMinutes(habit, input.minutes);
  const reward = computeReward(habit, minutes);
  const completion = await saveCompletion(userId, habit, today, minutes, reward);

  await adjustWallet(userId, { xp: reward.xp, gems: reward.gems, totalGemsEarned: reward.gems });
  if (reward.gems > 0) {
    await recordTransaction(userId, {
      type: "habit",
      amount: reward.gems,
      label: habit.name,
      refId: completion._id.toString(),
      eventKey: `completion:${completion._id}:${completion.completedAt.getTime()}`,
    });
  }

  // ---- Streak milestones and achievements ----
  const won = await awardProgress(userId, habit._id, today);
  const result: CompletionResult = {
    xp: reward.xp,
    gems: reward.gems,
    bonusUnits: reward.bonusUnits,
    milestones: won.milestones,
    achievements: won.achievements,
  };
  const dashboard = won.dashboard;

  return { dashboard, result };
}

// Undo is only possible for today. XP and gems from the completion are taken back.
// Streak milestone bonuses and achievements already granted are kept.
export async function undoCompletion(
  userId: Types.ObjectId,
  habitId: Types.ObjectId,
): Promise<DashboardMutation> {
  const user = await loadUser(userId);
  const today = todayKey(user.settings.timezone);

  const completion = await Completion.findOne({ userId, habitId, date: today, reversedAt: null });
  if (!completion) throw new AppError("NOT_FOUND");

  // Marking it reversed is the guard against a double undo.
  const reversed = await Completion.findOneAndUpdate(
    { _id: completion._id, reversedAt: null },
    { $set: { reversedAt: new Date() } },
  );
  if (!reversed) throw new AppError("NOT_FOUND");

  // The gems may already be spent. The conditional update only debits when the
  // balance still covers them; otherwise the undo is rolled back.
  const debit = await User.updateOne(
    { _id: userId, "wallet.gems": { $gte: completion.gems } },
    {
      $inc: {
        "wallet.gems": -completion.gems,
        "wallet.totalGemsEarned": -completion.gems,
        "wallet.xp": -completion.xp,
      },
    },
  );
  if (debit.modifiedCount === 0) {
    await Completion.updateOne({ _id: completion._id }, { $set: { reversedAt: null } });
    throw new AppError("UNDO_BLOCKED");
  }

  if (completion.gems > 0) {
    await recordTransaction(userId, {
      type: "reversal",
      amount: -completion.gems,
      label: `Undo: ${completion.habitName}`,
      refId: completion._id.toString(),
      eventKey: `reversal:${completion._id}:${completion.completedAt.getTime()}`,
    });
  }

  return { dashboard: await getDashboard(userId), result: null };
}
