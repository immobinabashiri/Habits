import "server-only";
import type { Types } from "mongoose";
import { AchievementUnlock } from "@/lib/db/models/achievement";
import { Completion, FreezeDecision } from "@/lib/db/models/completion";
import { Habit } from "@/lib/db/models/habit";
import { Transaction } from "@/lib/db/models/transaction";
import { User } from "@/lib/db/models/user";
import { ACHIEVEMENTS } from "@/lib/domain/achievements";
import { addDays, todayKey, weekdayOf } from "@/lib/domain/dates";
import {
  FREEZE_WINDOW_DAYS,
  LIMITS,
  MAX_STREAK_FREEZES,
  STREAK_FREEZE_PRICE,
  STREAK_LOOKBACK_DAYS,
} from "@/lib/domain/defaults";
import { levelProgress } from "@/lib/domain/progress";
import { computeStreak, isScheduledOn } from "@/lib/domain/streaks";
import type { FreezeChoice } from "@/lib/domain/streaks";
import { AppError } from "@/lib/errors";
import { toPublicHabit } from "@/lib/services/habits";
import { connectDB } from "@/utils/connectDB";
import type { DateKey } from "@/types/common";
import type { DashboardData, DashboardHabit } from "@/types/dashboard";
import type { TransactionType } from "@/types/reward";

interface CompletionRow {
  habitId: Types.ObjectId;
  date: DateKey;
  minutes: number;
  xp: number;
  gems: number;
}
interface DecisionRow {
  habitId: Types.ObjectId;
  date: DateKey;
  decision: FreezeChoice;
}
interface UnlockRow {
  key: string;
  unlockedOn: DateKey;
}
interface TransactionRow {
  _id: Types.ObjectId;
  type: TransactionType;
  amount: number;
  label: string;
  createdAt: Date;
}

// Everything the dashboard shows, computed from the database in one pass.
// Streaks are never stored: they are recalculated from completions, so undoing
// a completion or freezing a day can never leave them out of sync.
export async function getDashboard(userId: Types.ObjectId): Promise<DashboardData> {
  await connectDB();

  const user = await User.findById(userId);
  if (!user) throw new AppError("UNAUTHENTICATED");

  const timezone = user.settings.timezone;
  const today = todayKey(timezone);
  const since = addDays(today, -STREAK_LOOKBACK_DAYS);

  const [habits, completions, decisions, totalCompletions, unlocks, transactions] =
    await Promise.all([
      Habit.find({ userId, archivedAt: null }).sort({ createdAt: 1 }).limit(LIMITS.maxHabits),
      Completion.find({ userId, reversedAt: null, date: { $gte: since } })
        .select("habitId date minutes xp gems")
        .lean<CompletionRow[]>(),
      FreezeDecision.find({ userId, date: { $gte: since } })
        .select("habitId date decision")
        .lean<DecisionRow[]>(),
      Completion.countDocuments({ userId, reversedAt: null }),
      AchievementUnlock.find({ userId, kind: "achievement" })
        .select("key unlockedOn")
        .lean<UnlockRow[]>(),
      Transaction.find({ userId })
        .sort({ createdAt: -1 })
        .limit(8)
        .select("type amount label createdAt")
        .lean<TransactionRow[]>(),
    ]);

  const doneByHabit = new Map<string, Map<DateKey, CompletionRow>>();
  for (const row of completions) {
    const id = row.habitId.toString();
    const days = doneByHabit.get(id) ?? new Map<DateKey, CompletionRow>();
    days.set(row.date, row);
    doneByHabit.set(id, days);
  }
  const decisionsByHabit = new Map<string, Map<DateKey, FreezeChoice>>();
  for (const row of decisions) {
    const id = row.habitId.toString();
    const days = decisionsByHabit.get(id) ?? new Map<DateKey, FreezeChoice>();
    days.set(row.date, row.decision);
    decisionsByHabit.set(id, days);
  }

  const milestones = [...user.settings.streakMilestones]
    .map(({ days, gems }) => ({ days, gems }))
    .sort((a, b) => a.days - b.days);

  const items: DashboardHabit[] = habits.map((doc) => {
    const habit = toPublicHabit(doc);
    const done = doneByHabit.get(habit.id) ?? new Map<DateKey, CompletionRow>();
    const spec = {
      startDate: habit.startDate,
      days: habit.schedule.days,
      exemptDates: habit.exemptDates,
    };
    const streak = computeStreak(spec, done, decisionsByHabit.get(habit.id) ?? new Map(), {
      today,
      lookbackDays: STREAK_LOOKBACK_DAYS,
      freezeWindowDays: FREEZE_WINDOW_DAYS,
    });
    const todayRow = done.get(today);
    return {
      habit,
      scheduledToday: isScheduledOn(spec, today),
      exemptToday: habit.exemptDates.includes(today),
      completedToday: todayRow !== undefined,
      todayReward: todayRow
        ? { minutes: todayRow.minutes, xp: todayRow.xp, gems: todayRow.gems }
        : null,
      streak: streak.count,
      streakStart: streak.startDate,
      nextMilestone: milestones.find((m) => m.days > streak.count) ?? null,
      pendingFreeze: streak.pendingFreeze,
    };
  });

  // A habit that is exempt today still counts if it was completed before the exemption.
  const dueToday = items.filter((i) => i.scheduledToday && (!i.exemptToday || i.completedToday));

  const week = Array.from({ length: 7 }, (_, index) => {
    const date = addDays(today, index - 6);
    let scheduled = 0;
    let done = 0;
    for (const { habit } of items) {
      const runs =
        date >= habit.startDate &&
        habit.schedule.days.includes(weekdayOf(date)) &&
        !habit.exemptDates.includes(date);
      if (!runs) continue;
      scheduled += 1;
      if (doneByHabit.get(habit.id)?.has(date)) done += 1;
    }
    return { date, weekday: weekdayOf(date), scheduled, done, isToday: date === today };
  });

  const unlockedOn = new Map(unlocks.map((row) => [row.key, row.unlockedOn]));
  const achievementItems = ACHIEVEMENTS.map(({ key, title, description, xp }) => ({
    key,
    title,
    description,
    xp,
    unlocked: unlockedOn.has(key),
    unlockedOn: unlockedOn.get(key) ?? null,
  }));

  return {
    today,
    timezone,
    userName: user.name,
    wallet: {
      gems: user.wallet.gems,
      totalGemsEarned: user.wallet.totalGemsEarned,
      totalGemsSpent: user.wallet.totalGemsSpent,
      xp: user.wallet.xp,
      streakFreezes: user.wallet.streakFreezes,
    },
    level: levelProgress(user.wallet.xp),
    seenLevel: user.seenLevel,
    habits: items,
    stats: {
      todayDone: dueToday.filter((i) => i.completedToday).length,
      todayTotal: dueToday.length,
      totalCompletions,
      bestStreak: items.reduce((best, i) => Math.max(best, i.streak), 0),
      activeStreaks: items.filter((i) => i.streak > 0).length,
    },
    week,
    achievements: {
      items: achievementItems,
      unlockedCount: achievementItems.filter((a) => a.unlocked).length,
      total: achievementItems.length,
    },
    activity: transactions.map((row) => ({
      id: row._id.toString(),
      type: row.type,
      amount: row.amount,
      label: row.label,
      createdAt: row.createdAt.toISOString(),
    })),
    streakFreeze: { price: STREAK_FREEZE_PRICE, max: MAX_STREAK_FREEZES },
  };
}
