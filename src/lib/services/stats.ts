import "server-only";
import type { Types } from "mongoose";
import { Completion } from "@/lib/db/models/completion";
import { Habit } from "@/lib/db/models/habit";
import { Transaction } from "@/lib/db/models/transaction";
import { User } from "@/lib/db/models/user";
import { addDays, dateKeyOf, todayKey } from "@/lib/domain/dates";
import { LIMITS } from "@/lib/domain/defaults";
import {
  computeRangeStats,
  foldLedger,
  rangeDays,
  summarizeRange,
  weekdayPattern,
} from "@/lib/domain/stats";
import type { LedgerEntry, StatsHabit, StatsRange, StatsRow } from "@/lib/domain/stats";
import { AppError } from "@/lib/errors";
import { toPublicHabit } from "@/lib/services/habits";
import { connectDB } from "@/utils/connectDB";
import type { DateKey } from "@/types/common";
import type { StatsData } from "@/types/stats";

interface CompletionRow {
  habitId: Types.ObjectId;
  date: DateKey;
  xp: number;
  minutes: number;
}
interface LedgerRow {
  type: string;
  amount: number;
  createdAt: Date;
}
interface LifetimeRow {
  completions: number;
  minutes: number;
}

// Everything is computed from the completions and the gem ledger, never stored, so
// undoing a habit or buying something is reflected the next time the page is read.
export async function getStatsData(userId: Types.ObjectId, range: StatsRange): Promise<StatsData> {
  await connectDB();
  const user = await User.findById(userId);
  if (!user) throw new AppError("UNAUTHENTICATED");

  const timezone = user.settings.timezone;
  const today = todayKey(timezone);
  const days = rangeDays(today, range);
  const from = days[0];
  // The ledger stores instants (UTC). Start a day early, then keep only entries that
  // really fall inside the period in the user's own time zone.
  const ledgerSince = new Date(`${addDays(from, -1)}T00:00:00Z`);

  const [habitDocs, completionRows, ledgerRows, lifetimeRows, activeDates] = await Promise.all([
    Habit.find({ userId, archivedAt: null }).sort({ createdAt: 1 }).limit(LIMITS.maxHabits),
    Completion.find({ userId, reversedAt: null, date: { $gte: from, $lte: today } })
      .select("habitId date xp minutes")
      .lean<CompletionRow[]>(),
    Transaction.find({ userId, createdAt: { $gte: ledgerSince } })
      .select("type amount createdAt")
      .lean<LedgerRow[]>(),
    Completion.aggregate<LifetimeRow>([
      { $match: { userId, reversedAt: null } },
      { $group: { _id: null, completions: { $sum: 1 }, minutes: { $sum: "$minutes" } } },
    ]),
    Completion.distinct("date", { userId, reversedAt: null }) as Promise<DateKey[]>,
  ]);

  const habits: StatsHabit[] = habitDocs.map((doc) => {
    const habit = toPublicHabit(doc);
    return {
      id: habit.id,
      name: habit.name,
      icon: habit.icon,
      kind: habit.kind,
      startDate: habit.startDate,
      days: habit.schedule.days,
      exemptDates: habit.exemptDates,
    };
  });
  const rows: StatsRow[] = completionRows.map((row) => ({
    habitId: row.habitId.toString(),
    date: row.date,
    xp: row.xp,
    minutes: row.minutes,
  }));

  const inRange = new Set(days);
  const entries: LedgerEntry[] = ledgerRows
    .map((row) => ({ date: dateKeyOf(row.createdAt, timezone), type: row.type, amount: row.amount }))
    .filter((entry) => inRange.has(entry.date));

  const { daily, perHabit } = computeRangeStats(habits, rows, days, foldLedger(entries));
  const lifetime = lifetimeRows[0] ?? { completions: 0, minutes: 0 };

  return {
    today,
    timezone,
    range,
    from,
    habitCount: habits.length,
    summary: summarizeRange(daily),
    daily,
    weekdays: weekdayPattern(daily),
    habits: perHabit,
    lifetime: {
      completions: lifetime.completions,
      activeDays: activeDates.length,
      firstDay: activeDates.length > 0 ? [...activeDates].sort()[0] : null,
      minutes: lifetime.minutes,
      xp: user.wallet.xp,
      gemsEarned: user.wallet.totalGemsEarned,
      gemsSpent: user.wallet.totalGemsSpent,
    },
  };
}
