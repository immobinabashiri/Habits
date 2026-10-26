import { MAX_BONUS_UNITS } from "@/lib/domain/defaults";
import type { LevelInfo } from "@/types/dashboard";
import type { HabitKind, HabitTimedConfig } from "@/types/habits";

// Total XP needed to REACH a level: L1 = 0, L2 = 100, L3 = 300, L4 = 600, L5 = 1000 ...
// Every level asks for 100 XP more than the one before it. Change the curve here only.
export function xpForLevel(level: number): number {
  return 50 * level * (level - 1);
}

export function levelFromXp(xp: number): number {
  let level = 1;
  while (xp >= xpForLevel(level + 1)) level += 1;
  return level;
}

export function levelProgress(xp: number): LevelInfo {
  const level = levelFromXp(xp);
  const floor = xpForLevel(level);
  const needed = xpForLevel(level + 1) - floor;
  const into = xp - floor;
  return { level, xp, into, needed, percent: Math.min(100, Math.round((into / needed) * 100)) };
}

export interface RewardSource {
  kind: HabitKind;
  xp: number;
  gems: number;
  timed: HabitTimedConfig | null;
}

export interface Reward {
  xp: number;
  gems: number;
  bonusUnits: number; // extra blocks beyond the minimum (timed habits only)
}

// Every full `unitMinutes` beyond the minimum is a bonus block, up to MAX_BONUS_UNITS.
export function bonusUnitsFor(timed: HabitTimedConfig | null, minutes: number): number {
  if (!timed || minutes < timed.targetMinutes) return 0;
  const blocks = Math.floor((minutes - timed.targetMinutes) / timed.unitMinutes);
  return Math.min(MAX_BONUS_UNITS, blocks);
}

// The caller must already have checked that `minutes` reaches the minimum.
// Core habits never earn gems, whatever the stored numbers say.
export function computeReward(habit: RewardSource, minutes: number): Reward {
  const bonusUnits = bonusUnitsFor(habit.timed, minutes);
  const extra = habit.timed;
  const xp = habit.xp + (extra ? bonusUnits * extra.extraXpPerUnit : 0);
  const gems =
    habit.kind === "bonus" ? habit.gems + (extra ? bonusUnits * extra.extraGemsPerUnit : 0) : 0;
  return { xp, gems, bonusUnits };
}
