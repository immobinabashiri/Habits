import { addDays, weekdayOf } from "@/lib/domain/dates";
import type { DateKey, Weekday } from "@/types/common";

export type FreezeChoice = "frozen" | "broken";

export interface StreakHabit {
  startDate: DateKey;
  days: readonly Weekday[];
  exemptDates: readonly DateKey[];
}

// A Map or a Set of date keys both satisfy this.
export interface DateLookup {
  has(date: DateKey): boolean;
}

export interface StreakOptions {
  today: DateKey;
  lookbackDays: number;
  freezeWindowDays: number;
}

export interface StreakResult {
  count: number; // consecutive scheduled days completed (today may still be open)
  startDate: DateKey | null; // first day of the current run
  pendingFreeze: { date: DateKey; restores: number; gap: number } | null;
}

interface Walk {
  count: number;
  start: DateKey | null;
  miss: DateKey | null; // the missed day that stopped the walk
  decided: boolean; // the user already chose "broken" for it
  bridged: number; // missed days pretended frozen on the way (what-if walks only)
}

export function isScheduledOn(habit: StreakHabit, date: DateKey): boolean {
  return date >= habit.startDate && habit.days.includes(weekdayOf(date));
}

// Walks backwards from today over the habit's scheduled days.
//  - not scheduled, or exempt          -> skipped, never breaks the streak
//  - completed                         -> counts
//  - today and not done yet            -> skipped (the day is still open)
//  - missed and frozen                 -> skipped (a Streak Freeze was used)
//  - missed otherwise                  -> the streak ends here
// If the miss is recent and undecided, and a streak existed before it, it is
// reported as `pendingFreeze` so the user can still rescue it. `gap` is how many
// missed days in a row must be frozen (one freeze each) to reach that streak.
export function computeStreak(
  habit: StreakHabit,
  completed: DateLookup,
  decisions: ReadonlyMap<DateKey, FreezeChoice>,
  options: StreakOptions,
): StreakResult {
  const { today, lookbackDays, freezeWindowDays } = options;
  const exempt = new Set(habit.exemptDates);
  const earliest = addDays(today, -lookbackDays);
  const floor = habit.startDate > earliest ? habit.startDate : earliest;

  // `bridge` > 0 is a what-if: pretend up to that many missed days in a row (with no
  // decision yet) are frozen, to see which earlier streak a freeze would bring back.
  function walk(from: DateKey, bridge = 0): Walk {
    let count = 0;
    let start: DateKey | null = null;
    let bridged = 0;
    let reconnected = false;
    // The step is computed inside the body on purpose: Turbopack mis-compiles an
    // imported function called in a `for (let ...)` update clause.
    for (let back = 0; ; back += 1) {
      const day = addDays(from, -back);
      if (day < floor) break;
      if (!habit.days.includes(weekdayOf(day)) || exempt.has(day)) continue;
      if (completed.has(day)) {
        count += 1;
        start = day;
        if (bridged > 0) reconnected = true;
        continue;
      }
      if (day === today) continue;
      const choice = decisions.get(day);
      if (choice === "frozen") continue;
      if (choice === undefined && !reconnected && bridged < bridge) {
        bridged += 1;
        continue;
      }
      return { count, start, miss: day, decided: choice !== undefined, bridged };
    }
    return { count, start, miss: null, decided: false, bridged };
  }

  const run = walk(today);
  let pendingFreeze: StreakResult["pendingFreeze"] = null;
  if (run.miss && !run.decided && run.miss >= addDays(today, -freezeWindowDays)) {
    // Start AT the missed day: a weekend away is 2 missed days in a row, and both
    // need a freeze. The most recent one is offered first.
    const before = walk(run.miss, freezeWindowDays);
    if (before.count > 0) {
      pendingFreeze = { date: run.miss, restores: before.count, gap: before.bridged };
    }
  }
  return { count: run.count, startDate: run.start, pendingFreeze };
}

// The longest run ever (inside the look-back window), counted with the very same
// rules as the current streak, so it is never smaller than it.
export function computeLongestStreak(
  habit: StreakHabit,
  completed: DateLookup,
  decisions: ReadonlyMap<DateKey, FreezeChoice>,
  options: Pick<StreakOptions, "today" | "lookbackDays">,
): number {
  const { today, lookbackDays } = options;
  const exempt = new Set(habit.exemptDates);
  const earliest = addDays(today, -lookbackDays);
  const floor = habit.startDate > earliest ? habit.startDate : earliest;

  let run = 0;
  let best = 0;
  // Same loop shape as computeStreak: the step is computed inside the body.
  for (let forward = 0; ; forward += 1) {
    const day = addDays(floor, forward);
    if (day > today) break;
    if (!habit.days.includes(weekdayOf(day)) || exempt.has(day)) continue;
    if (completed.has(day)) {
      run += 1;
      if (run > best) best = run;
      continue;
    }
    if (day === today) continue;
    if (decisions.get(day) === "frozen") continue;
    run = 0; // a missed day ends the run
  }
  return best;
}

// What happened to a habit on one day, for the calendar.
//  done    = completed          missed = scheduled, not done, past
//  frozen  = saved by a freeze  exempt = a skip day (never counts)
//  open    = today, not done yet   off = not scheduled, or before the habit started
export type DayStatus = "done" | "missed" | "frozen" | "exempt" | "open" | "off";

export function dayStatus(
  habit: StreakHabit,
  completed: DateLookup,
  decisions: ReadonlyMap<DateKey, FreezeChoice>,
  day: DateKey,
  today: DateKey,
): DayStatus {
  if (!isScheduledOn(habit, day)) return "off";
  if (habit.exemptDates.includes(day)) return "exempt";
  if (completed.has(day)) return "done";
  if (day === today) return "open";
  return decisions.get(day) === "frozen" ? "frozen" : "missed";
}
