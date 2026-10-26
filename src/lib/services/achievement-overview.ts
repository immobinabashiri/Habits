import "server-only";
import type { Types } from "mongoose";
import { AchievementUnlock } from "@/lib/db/models/achievement";
import { ACHIEVEMENTS } from "@/lib/domain/achievements";
import type { GoalStat } from "@/lib/domain/achievements";
import { getDashboard } from "@/lib/services/dashboard";
import { connectDB } from "@/utils/connectDB";
import type { DateKey } from "@/types/common";
import type { AchievementCard, AchievementsData } from "@/types/achievement";

const MEDALS_SHOWN = 12;

interface MedalRow {
  _id: Types.ObjectId;
  title: string;
  unlockedOn: DateKey;
}

// Uses the same numbers the award logic uses (the dashboard's stats), so the page
// can never claim an achievement is "almost there" when the rules say otherwise.
export async function getAchievementsData(userId: Types.ObjectId): Promise<AchievementsData> {
  await connectDB();
  const dashboard = await getDashboard(userId);
  const [medalCount, medalRows] = await Promise.all([
    AchievementUnlock.countDocuments({ userId, kind: "streak-milestone" }),
    AchievementUnlock.find({ userId, kind: "streak-milestone" })
      .sort({ createdAt: -1 })
      .limit(MEDALS_SHOWN)
      .select("title unlockedOn")
      .lean<MedalRow[]>(),
  ]);

  const current: Record<GoalStat, number> = {
    totalCompletions: dashboard.stats.totalCompletions,
    bestStreak: dashboard.stats.bestStreak,
    level: dashboard.level.level,
    totalGemsEarned: dashboard.wallet.totalGemsEarned,
  };
  const { todayDone, todayTotal } = dashboard.stats;

  const items: AchievementCard[] = dashboard.achievements.items.map((item) => {
    const goal = ACHIEVEMENTS.find((def) => def.key === item.key)?.goal ?? null;
    const progress =
      !item.unlocked && goal
        ? { current: Math.min(current[goal.stat], goal.target), target: goal.target, unit: goal.unit }
        : null;
    let hint: string | null = null;
    if (!item.unlocked && !goal) {
      hint = todayTotal >= 2 ? `Today: ${todayDone} of ${todayTotal} done` : "Needs 2 or more habits on the same day.";
    } else if (progress && progress.current >= progress.target) {
      hint = "You have reached this. It unlocks the next time you complete a habit.";
    }
    return {
      key: item.key,
      title: item.title,
      description: item.description,
      xp: item.xp,
      unlocked: item.unlocked,
      unlockedOn: item.unlockedOn,
      progress,
      hint,
    };
  });

  return {
    level: dashboard.level.level,
    items,
    unlockedCount: dashboard.achievements.unlockedCount,
    total: dashboard.achievements.total,
    xpEarned: items.filter((i) => i.unlocked).reduce((sum, i) => sum + i.xp, 0),
    medals: medalRows.map((row) => ({ id: row._id.toString(), title: row.title, date: row.unlockedOn })),
    medalCount,
  };
}
