// Fixed achievements. Keys "a1".."a10" are stored per user, so never renumber them.
export interface AchievementStats {
  totalCompletions: number;
  bestStreak: number;
  level: number;
  totalGemsEarned: number;
  perfectDay: boolean; // 2+ habits scheduled today and all of them done
}

// Which number an achievement is measured by, so the page can show "37 / 50".
export type GoalStat = "totalCompletions" | "bestStreak" | "level" | "totalGemsEarned";

export interface AchievementGoal {
  stat: GoalStat;
  target: number;
  unit: string; // read after the numbers: "37 / 50 habits completed"
}

export interface AchievementDef {
  key: string;
  title: string;
  description: string;
  xp: number;
  goal: AchievementGoal | null; // null = not a simple counter (Perfect day)
  test: (stats: AchievementStats) => boolean;
}

export const ACHIEVEMENTS: readonly AchievementDef[] = [
  { key: "a1", title: "First step", description: "Complete your first habit.", xp: 10, goal: { stat: "totalCompletions", target: 1, unit: "habits completed" }, test: (s) => s.totalCompletions >= 1 },
  { key: "a2", title: "Getting going", description: "Complete 10 habits.", xp: 20, goal: { stat: "totalCompletions", target: 10, unit: "habits completed" }, test: (s) => s.totalCompletions >= 10 },
  { key: "a3", title: "Half century", description: "Complete 50 habits.", xp: 40, goal: { stat: "totalCompletions", target: 50, unit: "habits completed" }, test: (s) => s.totalCompletions >= 50 },
  { key: "a4", title: "Centurion", description: "Complete 100 habits.", xp: 80, goal: { stat: "totalCompletions", target: 100, unit: "habits completed" }, test: (s) => s.totalCompletions >= 100 },
  { key: "a5", title: "Perfect day", description: "Finish every habit scheduled today (at least 2).", xp: 30, goal: null, test: (s) => s.perfectDay },
  { key: "a6", title: "On a roll", description: "Reach a 7-day streak on any habit.", xp: 30, goal: { stat: "bestStreak", target: 7, unit: "day streak" }, test: (s) => s.bestStreak >= 7 },
  { key: "a7", title: "Unstoppable", description: "Reach a 30-day streak on any habit.", xp: 100, goal: { stat: "bestStreak", target: 30, unit: "day streak" }, test: (s) => s.bestStreak >= 30 },
  { key: "a8", title: "Rising star", description: "Reach level 5.", xp: 50, goal: { stat: "level", target: 5, unit: "level" }, test: (s) => s.level >= 5 },
  { key: "a9", title: "Veteran", description: "Reach level 10.", xp: 100, goal: { stat: "level", target: 10, unit: "level" }, test: (s) => s.level >= 10 },
  { key: "a10", title: "Gem collector", description: "Earn 500 gems in total.", xp: 40, goal: { stat: "totalGemsEarned", target: 500, unit: "gems earned" }, test: (s) => s.totalGemsEarned >= 500 },
];
