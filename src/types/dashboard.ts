import type { DateKey, Weekday } from "./common";
import type { PublicHabit } from "./habits";
import type { TransactionType } from "./reward";
import type { Wallet } from "./user";

export interface PendingFreeze {
  date: DateKey; // the missed day that can still be rescued
  restores: number; // days of earlier streak that come back if it is frozen
  gap: number; // missed days in a row to freeze (one freeze each); this is the latest
}

// One active habit as the dashboard sees it today.
export interface DashboardHabit {
  habit: PublicHabit;
  scheduledToday: boolean;
  exemptToday: boolean;
  completedToday: boolean;
  todayReward: { minutes: number; xp: number; gems: number } | null;
  streak: number; // current run, in scheduled days
  streakStart: DateKey | null;
  nextMilestone: { days: number; gems: number } | null;
  pendingFreeze: PendingFreeze | null;
}

export interface LevelInfo {
  level: number;
  xp: number; // total XP
  into: number; // XP earned inside this level
  needed: number; // XP this level spans
  percent: number; // 0-100
}

export interface WeekDayInfo {
  date: DateKey;
  weekday: Weekday;
  scheduled: number;
  done: number;
  isToday: boolean;
}

export interface AchievementView {
  key: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  unlockedOn: DateKey | null;
}

export interface ActivityItem {
  id: string;
  type: TransactionType;
  amount: number; // signed gems
  label: string;
  createdAt: string; // ISO
}

export interface DashboardStats {
  todayDone: number;
  todayTotal: number; // scheduled today, excluding exempt days
  totalCompletions: number;
  bestStreak: number; // longest CURRENT streak among active habits
  activeStreaks: number;
}

export interface DashboardData {
  today: DateKey;
  timezone: string;
  userName: string;
  wallet: Wallet;
  level: LevelInfo;
  seenLevel: number;
  habits: DashboardHabit[];
  stats: DashboardStats;
  week: WeekDayInfo[];
  achievements: { items: AchievementView[]; unlockedCount: number; total: number };
  activity: ActivityItem[];
  streakFreeze: { price: number; max: number };
}

// What one completion produced, shown as toasts.
export interface CompletionResult {
  xp: number;
  gems: number;
  bonusUnits: number;
  milestones: { days: number; gems: number }[];
  achievements: { title: string; xp: number }[];
}

// Every dashboard action returns the fresh dashboard, so the client never has
// to re-derive streaks or balances itself.
export interface DashboardMutation {
  dashboard: DashboardData;
  result: CompletionResult | null;
}
