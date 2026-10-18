import type { Types } from "mongoose";

export type ThemePreference = "system" | "light" | "dark";

export interface StreakMilestone {
  days: number;
  gems: number; // gems awarded when a habit reaches this streak (0 = no bonus)
}

// HTML: S.theme, S.rm, S.msg
export interface UserSettings {
  theme: ThemePreference;
  reduceMotion: boolean;
  timezone: string; // IANA name, e.g. "Asia/Tehran"
  streakMilestones: StreakMilestone[];
}

// Server-controlled. The client may display these but can never set them.
// gems is a cached balance: it is only changed together with a Transaction.
export interface Wallet {
  gems: number; // current balance (HTML: bal())
  totalGemsEarned: number; // sum of positive transactions (HTML: earned())
  totalGemsSpent: number; // sum of purchases (HTML: spent())
  xp: number; // total XP; the level is derived from it (HTML: xp(), lvl())
  streakFreezes: number; // available Streak Freezes (HTML: S.fz)
}

// HTML: S.goals, S.primary (reward ids)
export interface UserGoals<Id = Types.ObjectId> {
  primaryRewardId: Id | null;
  rewardIds: Id[];
}

// A user document as stored in MongoDB. Server-side only.
export interface UserRecord {
  email: string;
  name: string; // display name (HTML: S.name)
  passwordHash: string;
  settings: UserSettings;
  wallet: Wallet;
  goals: UserGoals;
  seenLevel: number; // last level the user was congratulated for (HTML: S.seenLvl)
  createdAt: Date;
  updatedAt: Date;
}

// The only user shape that may be sent to the browser. Never contains passwordHash.
export interface PublicUser {
  id: string;
  email: string;
  name: string;
  settings: UserSettings;
  wallet: Wallet;
  goals: UserGoals<string>;
  seenLevel: number;
  createdAt: string; // ISO date string
}