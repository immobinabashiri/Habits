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
  maxExemptDates: 366,
} as const;