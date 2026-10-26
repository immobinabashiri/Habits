import "server-only";
import { Types } from "mongoose";
import { AchievementUnlock } from "@/lib/db/models/achievement";
import { User } from "@/lib/db/models/user";
import { ACHIEVEMENTS } from "@/lib/domain/achievements";
import { levelFromXp } from "@/lib/domain/progress";
import { getDashboard } from "@/lib/services/dashboard";
import { adjustWallet, isDuplicateKeyError, recordTransaction } from "@/lib/services/ledger";
import type { DateKey } from "@/types/common";
import type { AchievementKind } from "@/types/achievement";
import type { CompletionResult, DashboardData } from "@/types/dashboard";

type Won = Pick<CompletionResult, "milestones" | "achievements">;

// Inserting is the "has this been awarded?" check: the unique (userId, key) index
// lets only one request win.
async function unlock(
  userId: Types.ObjectId,
  entry: {
    key: string;
    kind: AchievementKind;
    title: string;
    xp: number;
    habitId: Types.ObjectId | null;
    date: DateKey;
  },
): Promise<boolean> {
  try {
    await AchievementUnlock.create({
      userId,
      key: entry.key,
      kind: entry.kind,
      title: entry.title,
      xp: entry.xp,
      habitId: entry.habitId,
      unlockedOn: entry.date,
    });
    return true;
  } catch (error) {
    if (isDuplicateKeyError(error)) return false;
    throw error;
  }
}

// Milestones already paid to this habit during the CURRENT run. A new run (it starts
// later) can earn them again. Reading the paid days from the unlock records also
// stops a run that was re-joined by a Streak Freeze from paying a day twice.
async function paidMilestoneDays(
  userId: Types.ObjectId,
  habitId: Types.ObjectId,
  runStart: DateKey,
): Promise<Set<number>> {
  const rows = await AchievementUnlock.find({
    userId,
    kind: "streak-milestone",
    habitId,
    unlockedOn: { $gte: runStart },
  })
    .select("key")
    .lean<{ key: string }[]>();
  // key = ms:<habitId>:<days>:<runStart>
  return new Set(rows.map((row) => Number(row.key.split(":")[2])));
}

// Pays every streak milestone this habit's current run has reached and not been
// paid for yet, then every achievement whose condition is now true.
//
// "Every milestone reached", not only "exactly the one just hit": a Streak Freeze
// can join two runs and jump the streak past a milestone without any completion.
// Streak bonuses and achievements are never taken back by an undo.
export async function awardProgress(
  userId: Types.ObjectId,
  habitId: Types.ObjectId,
  today: DateKey,
): Promise<Won & { dashboard: DashboardData }> {
  let dashboard = await getDashboard(userId);
  const won: Won = { milestones: [], achievements: [] };

  // ---- streak milestones ----
  const user = await User.findById(userId).select("settings.streakMilestones");
  const entry = dashboard.habits.find((item) => item.habit.id === habitId.toString());
  if (user && entry && entry.streakStart) {
    const paid = await paidMilestoneDays(userId, habitId, entry.streakStart);
    const reached = user.settings.streakMilestones
      .filter((m) => m.days <= entry.streak && !paid.has(m.days))
      .sort((a, b) => a.days - b.days);

    for (const milestone of reached) {
      const key = `ms:${habitId}:${milestone.days}:${entry.streakStart}`;
      const title = `${milestone.days}-day streak: ${entry.habit.name}`;
      if (!(await unlock(userId, { key, kind: "streak-milestone", title, xp: 0, habitId, date: today }))) {
        continue;
      }
      if (milestone.gems > 0) {
        await adjustWallet(userId, { gems: milestone.gems, totalGemsEarned: milestone.gems });
        await recordTransaction(userId, {
          type: "streak-bonus",
          amount: milestone.gems,
          label: title,
          refId: key,
          eventKey: `milestone:${habitId}:${milestone.days}:${entry.streakStart}`,
        });
      }
      won.milestones.push({ days: milestone.days, gems: milestone.gems });
    }
    if (won.milestones.length > 0) dashboard = await getDashboard(userId);
  }

  // ---- fixed achievements ----
  const alreadyUnlocked = new Set(
    dashboard.achievements.items.filter((a) => a.unlocked).map((a) => a.key),
  );
  const { stats } = dashboard;
  let xp = dashboard.wallet.xp;
  for (const def of ACHIEVEMENTS) {
    if (alreadyUnlocked.has(def.key)) continue;
    const reached = def.test({
      totalCompletions: stats.totalCompletions,
      bestStreak: stats.bestStreak,
      level: levelFromXp(xp), // earlier achievements may have just raised it
      totalGemsEarned: dashboard.wallet.totalGemsEarned,
      perfectDay: stats.todayTotal >= 2 && stats.todayDone === stats.todayTotal,
    });
    if (!reached) continue;
    const unlocked = await unlock(userId, {
      key: def.key,
      kind: "achievement",
      title: def.title,
      xp: def.xp,
      habitId: null,
      date: today,
    });
    if (!unlocked) continue;
    await adjustWallet(userId, { xp: def.xp });
    xp += def.xp;
    won.achievements.push({ title: def.title, xp: def.xp });
  }
  if (won.achievements.length > 0) dashboard = await getDashboard(userId);

  return { ...won, dashboard };
}
