import "server-only";
import type { Types } from "mongoose";
import { Completion, FreezeDecision } from "@/lib/db/models/completion";
import { Habit } from "@/lib/db/models/habit";
import { User } from "@/lib/db/models/user";
import { addDays, todayKey } from "@/lib/domain/dates";
import {
  FREEZE_WINDOW_DAYS,
  LIMITS,
  MAX_STREAK_FREEZES,
  STREAK_FREEZE_PRICE,
  STREAK_HISTORY_DAYS,
  STREAK_LOOKBACK_DAYS,
} from "@/lib/domain/defaults";
import { computeLongestStreak, computeStreak, dayStatus } from "@/lib/domain/streaks";
import type { DayStatus, FreezeChoice } from "@/lib/domain/streaks";
import { AppError } from "@/lib/errors";
import { toPublicHabit } from "@/lib/services/habits";
import { connectDB } from "@/utils/connectDB";
import type { DateKey } from "@/types/common";
import type { HabitStreakDetail, StreaksData } from "@/types/streaks";

interface DayRow {
  habitId: Types.ObjectId;
  date: DateKey;
}
interface DecisionRow extends DayRow {
  decision: FreezeChoice;
}

// Streaks are never stored: they are recalculated from completions every time, so
// undoing a completion or freezing a day can never leave them out of sync.
export async function getStreaksData(userId: Types.ObjectId): Promise<StreaksData> {
  await connectDB();
  const user = await User.findById(userId);
  if (!user) throw new AppError("UNAUTHENTICATED");

  const timezone = user.settings.timezone;
  const today = todayKey(timezone);
  const since = addDays(today, -STREAK_LOOKBACK_DAYS);
  const days = Array.from({ length: STREAK_HISTORY_DAYS }, (_, i) =>
    addDays(today, i - (STREAK_HISTORY_DAYS - 1)),
  );

  const [habitDocs, completions, decisions] = await Promise.all([
    Habit.find({ userId, archivedAt: null }).sort({ createdAt: 1 }).limit(LIMITS.maxHabits),
    Completion.find({ userId, reversedAt: null, date: { $gte: since } })
      .select("habitId date")
      .lean<DayRow[]>(),
    FreezeDecision.find({ userId, date: { $gte: since } })
      .select("habitId date decision")
      .lean<DecisionRow[]>(),
  ]);

  const doneByHabit = new Map<string, Set<DateKey>>();
  for (const row of completions) {
    const id = row.habitId.toString();
    const set = doneByHabit.get(id) ?? new Set<DateKey>();
    set.add(row.date);
    doneByHabit.set(id, set);
  }
  const decisionsByHabit = new Map<string, Map<DateKey, FreezeChoice>>();
  for (const row of decisions) {
    const id = row.habitId.toString();
    const map = decisionsByHabit.get(id) ?? new Map<DateKey, FreezeChoice>();
    map.set(row.date, row.decision);
    decisionsByHabit.set(id, map);
  }

  const milestones = user.settings.streakMilestones
    .map(({ days: d, gems }) => ({ days: d, gems }))
    .sort((a, b) => a.days - b.days);

  const habits: HabitStreakDetail[] = habitDocs.map((doc) => {
    const habit = toPublicHabit(doc);
    const spec = { startDate: habit.startDate, days: habit.schedule.days, exemptDates: habit.exemptDates };
    const done = doneByHabit.get(habit.id) ?? new Set<DateKey>();
    const decided = decisionsByHabit.get(habit.id) ?? new Map<DateKey, FreezeChoice>();

    const streak = computeStreak(spec, done, decided, {
      today,
      lookbackDays: STREAK_LOOKBACK_DAYS,
      freezeWindowDays: FREEZE_WINDOW_DAYS,
    });
    const longest = computeLongestStreak(spec, done, decided, {
      today,
      lookbackDays: STREAK_LOOKBACK_DAYS,
    });
    const history: DayStatus[] = days.map((day) => dayStatus(spec, done, decided, day, today));
    const count = (status: DayStatus) => history.filter((s) => s === status).length;

    return {
      habit,
      streak: streak.count,
      streakStart: streak.startDate,
      longest: Math.max(longest, streak.count), // never below the current run
      nextMilestone: milestones.find((m) => m.days > streak.count) ?? null,
      pendingFreeze: streak.pendingFreeze,
      history,
      counts: { done: count("done"), missed: count("missed"), frozen: count("frozen") },
    };
  });

  return {
    today,
    timezone,
    days,
    wallet: { gems: user.wallet.gems, streakFreezes: user.wallet.streakFreezes },
    streakFreeze: { price: STREAK_FREEZE_PRICE, max: MAX_STREAK_FREEZES },
    milestones,
    habits,
    summary: {
      activeStreaks: habits.filter((h) => h.streak > 0).length,
      bestCurrent: habits.reduce((best, h) => Math.max(best, h.streak), 0),
      bestEver: habits.reduce((best, h) => Math.max(best, h.longest), 0),
    },
  };
}
