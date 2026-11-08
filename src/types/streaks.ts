import type { DayStatus } from "@/lib/domain/streaks";
import type { DateKey } from "./common";
import type { PendingFreeze } from "./dashboard";
import type { PublicHabit } from "./habits";
import type { StreakMilestone, Wallet } from "./user";

// One active habit on the Streaks page.
export interface HabitStreakDetail {
  habit: PublicHabit;
  streak: number; // current run, in scheduled days
  streakStart: DateKey | null;
  longest: number; // longest run inside the look-back window
  nextMilestone: StreakMilestone | null;
  pendingFreeze: PendingFreeze | null;
  history: DayStatus[]; // one status per entry of StreaksData.days
  counts: { done: number; missed: number; frozen: number }; // within `days`
}

export interface StreaksData {
  today: DateKey;
  timezone: string;
  days: DateKey[]; // the calendar window, oldest first, ending today
  wallet: Pick<Wallet, "gems" | "streakFreezes">;
  streakFreeze: { price: number; max: number };
  milestones: StreakMilestone[]; // the user's streak bonuses, sorted
  habits: HabitStreakDetail[];
  summary: { activeStreaks: number; bestCurrent: number; bestEver: number };
}
