import type { Types } from "mongoose";
import type { DateKey, Weekday } from "./common";

export type HabitKind = "core" | "bonus"; // HTML: "Core Habit" | "Bonus Habit"

// Only weekday scheduling exists in the HTML app. A monthly variant will be
// added later as another union member without breaking existing data.
export type HabitSchedule = { kind: "weekdays"; days: Weekday[] };

// Present only for habits tracked in minutes (HTML: dur, unit, xb, bonus).
export interface HabitTimedConfig {
  targetMinutes: number; // minimum to count as completed
  unitMinutes: number; // every extra block of this length earns a bonus
  extraXpPerUnit: number;
  extraGemsPerUnit: number;
}

export interface HabitRecord {
  userId: Types.ObjectId;
  name: string;
  icon: string;
  category: string;
  description: string;
  kind: HabitKind;
  schedule: HabitSchedule;
  xp: number; // XP per completion
  gems: number; // gems per completion (bonus habits only; core = 0)
  timed: HabitTimedConfig | null;
  startDate: DateKey; // HTML: created
  exemptDates: DateKey[]; // HTML: ex. Do not break the streak
  archivedAt: Date | null; // HTML: arch. Archived habits keep their history
  createdAt: Date;
  updatedAt: Date;
}

// The reward rule that applied at completion time, so later habit edits
// never change past results (HTML: the "b" array on a completion).
export interface HabitRewardSnapshot {
  xp: number;
  gems: number;
  timed: HabitTimedConfig | null;
}

// HTML: S.comp. One record per habit per day; undoing sets reversedAt.
export interface CompletionRecord {
  userId: Types.ObjectId;
  habitId: Types.ObjectId;
  date: DateKey;
  minutes: number; // 0 for simple checkbox habits
  xp: number;
  gems: number;
  habitName: string; // snapshot, survives renames
  rewardSnapshot: HabitRewardSnapshot;
  completedAt: Date;
  reversedAt: Date | null; // HTML: rev
}

// HTML: S.log. Minutes logged for a habit on a day, even before the target is reached.
export interface TimeLogRecord {
  userId: Types.ObjectId;
  habitId: Types.ObjectId;
  date: DateKey;
  minutes: number;
}

// HTML: S.fr. From streak(): "f" keeps the streak on a missed day, "x" breaks it.
export interface FreezeDecisionRecord {
  userId: Types.ObjectId;
  habitId: Types.ObjectId;
  date: DateKey;
  decision: "frozen" | "broken";
}