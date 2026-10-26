import type { Types } from "mongoose";
import type { DateKey } from "./common";

export type AchievementKind = "achievement" | "streak-milestone";

// HTML: S.ach. Fixed achievements use keys "a1".."a11"; milestones use
// "ms:<habitId>:<streak>:<startDate>" so each streak run is rewarded only once.
export interface AchievementUnlockRecord {
  userId: Types.ObjectId;
  key: string; // unique per user
  kind: AchievementKind;
  title: string;
  xp: number;
  habitId: Types.ObjectId | null;
  unlockedOn: DateKey;
  createdAt: Date;
}

// ---- The Achievements page ----

export interface AchievementCard {
  key: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  unlockedOn: DateKey | null;
  progress: { current: number; target: number; unit: string } | null; // locked counters only
  hint: string | null; // extra line for locked achievements that are not simple counters
}

// A streak bonus the user earned (kind "streak-milestone").
export interface StreakMedal {
  id: string;
  title: string;
  date: DateKey;
}

export interface AchievementsData {
  level: number;
  items: AchievementCard[];
  unlockedCount: number;
  total: number;
  xpEarned: number; // XP from unlocked achievements
  medals: StreakMedal[]; // newest first
  medalCount: number;
}
