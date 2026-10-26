import { StreakMilestone } from "@/types/user";

// Same defaults as the HTML app (S.msg): gems awarded at each streak milestone.
export const DEFAULT_STREAK_MILESTONES: readonly StreakMilestone[] = [
  { days: 7, gems: 50 },
  { days: 14, gems: 100 },
  { days: 30, gems: 200 },
  { days: 60, gems: 400 },
];

// Until the browser reports the real time zone (at sign-up), use UTC.
export const DEFAULT_TIMEZONE = "UTC";

// HTML app: MAXX. A timed habit earns at most this many bonus units per day.
export const MAX_BONUS_UNITS = 4;

// Server-side sanity limits. XP cap matches the HTML migration (Math.min(xp, 25)).
// The gem and price caps are proposals: change them here, nowhere else.
export const LIMITS = {
  maxHabitXp: 25,
  maxHabitGems: 100,
  maxRewardPrice: 10_000_000,
  maxMinutesPerDay: 1440,
  maxHabits: 100,
  maxRewards: 100,
  maxPurchaseNote: 200,
  maxExemptDates: 366,
} as const;

// ---- Streaks ----
// How far back streaks are calculated. Older history is ignored for performance.
export const STREAK_LOOKBACK_DAYS = 400;
// A missed day can only be rescued with a Streak Freeze for this many days.
export const FREEZE_WINDOW_DAYS = 3;
export const STREAK_FREEZE_PRICE = 50; // gems per freeze (proposal: change here only)
export const MAX_STREAK_FREEZES = 5; // most freezes a user can hold at once

// ---- Streak bonuses (settings) ----
export const MAX_MILESTONES = 10; // streak bonuses a user can define
export const MAX_MILESTONE_GEMS = 10_000; // proposal: change here only
// A streak is only counted STREAK_LOOKBACK_DAYS back, so a milestone beyond that
// could never be reached.
export const MAX_MILESTONE_DAYS = STREAK_LOOKBACK_DAYS;

// ---- Streaks page ----
export const STREAK_HISTORY_DAYS = 42; // the calendar on each habit: 6 weeks
