import type {
  DayStats,
  HabitRangeStats,
  RangeSummary,
  StatsRange,
  WeekdayStats,
} from "@/lib/domain/stats";
import type { DateKey } from "./common";

export interface StatsData {
  today: DateKey;
  timezone: string;
  range: StatsRange;
  from: DateKey; // first day of the period
  habitCount: number; // active habits
  summary: RangeSummary;
  daily: DayStats[]; // one entry per day, oldest first
  weekdays: WeekdayStats[]; // Monday first
  habits: HabitRangeStats[];
  lifetime: {
    completions: number;
    activeDays: number;
    firstDay: DateKey | null;
    minutes: number;
    xp: number; // total XP (the level is derived from it)
    gemsEarned: number;
    gemsSpent: number;
  };
}
