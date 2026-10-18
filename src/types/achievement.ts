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