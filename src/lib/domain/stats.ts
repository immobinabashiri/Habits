import { addDays, weekdayOf } from "@/lib/domain/dates";
import { WEEK_ORDER } from "@/lib/domain/weekdays";
import type { DateKey, Weekday } from "@/types/common";
import type { HabitKind } from "@/types/habits";

export const STATS_RANGES = [7, 30, 90] as const;
export type StatsRange = (typeof STATS_RANGES)[number];
export const DEFAULT_STATS_RANGE: StatsRange = 30;

// Anything that is not exactly 7, 30 or 90 falls back to the default.
export function parseRange(value: string | string[] | undefined): StatsRange {
  const text = Array.isArray(value) ? value[0] : value;
  const found = STATS_RANGES.find((range) => String(range) === text);
  return found ?? DEFAULT_STATS_RANGE;
}

export interface StatsHabit {
  id: string;
  name: string;
  icon: string;
  kind: HabitKind;
  startDate: DateKey;
  days: readonly Weekday[];
  exemptDates: readonly DateKey[];
}

// One finished habit-day.
export interface StatsRow {
  habitId: string;
  date: DateKey;
  xp: number;
  minutes: number;
}

export interface DayFlow {
  earned: number; // gems that came in
  spent: number; // gems spent on purchases
}

// One day, or a few days merged into one bar (`date` = first day, `to` = last day).
export interface DayStats {
  date: DateKey;
  to: DateKey;
  due: number; // habits that counted for the day
  done: number;
  xp: number;
  minutes: number;
  earned: number;
  spent: number;
}

export interface HabitRangeStats {
  habitId: string;
  name: string;
  icon: string;
  kind: HabitKind;
  due: number;
  done: number;
  percent: number | null; // null = it was never due in this period
  xp: number;
}

export interface WeekdayStats {
  weekday: Weekday;
  due: number;
  done: number;
  percent: number | null;
}

export interface RangeSummary {
  due: number;
  done: number;
  percent: number | null;
  xp: number;
  minutes: number;
  earned: number;
  spent: number;
  perfectDays: number; // days where everything that was due got done
  activeDays: number; // days with at least one habit done
}

const percentOf = (done: number, due: number): number | null =>
  due === 0 ? null : Math.round((done / due) * 100);

// What counts as "due" on a day, using the same rules as the dashboard:
//   scheduled and not a skip day        -> due
//   scheduled, skip day, but done anyway -> due (so a completion never exceeds 100%)
//   not scheduled                        -> never due, and a stray completion is ignored
// XP and minutes include EVERY row (also archived habits): they were really earned.
export function computeRangeStats(
  habits: readonly StatsHabit[],
  rows: readonly StatsRow[],
  days: readonly DateKey[],
  flow: ReadonlyMap<DateKey, DayFlow> = new Map(),
): { daily: DayStats[]; perHabit: HabitRangeStats[] } {
  const doneKeys = new Set(rows.map((row) => `${row.habitId}|${row.date}`));
  const rowsByDate = new Map<DateKey, StatsRow[]>();
  for (const row of rows) rowsByDate.set(row.date, [...(rowsByDate.get(row.date) ?? []), row]);
  const totals = new Map<string, { due: number; done: number; xp: number }>();
  for (const habit of habits) totals.set(habit.id, { due: 0, done: 0, xp: 0 });
  for (const row of rows) {
    const total = totals.get(row.habitId);
    if (total) total.xp += row.xp;
  }

  const daily = days.map((date): DayStats => {
    let due = 0;
    let done = 0;
    for (const habit of habits) {
      const scheduled = date >= habit.startDate && habit.days.includes(weekdayOf(date));
      if (!scheduled) continue;
      const finished = doneKeys.has(`${habit.id}|${date}`);
      if (habit.exemptDates.includes(date) && !finished) continue;
      due += 1;
      if (finished) done += 1;
      const total = totals.get(habit.id)!;
      total.due += 1;
      if (finished) total.done += 1;
    }
    let xp = 0;
    let minutes = 0;
    for (const row of rowsByDate.get(date) ?? []) {
      xp += row.xp;
      minutes += row.minutes;
    }
    const money = flow.get(date) ?? { earned: 0, spent: 0 };
    return { date, to: date, due, done, xp, minutes, earned: money.earned, spent: money.spent };
  });

  const perHabit = habits.map((habit): HabitRangeStats => {
    const total = totals.get(habit.id)!;
    return {
      habitId: habit.id,
      name: habit.name,
      icon: habit.icon,
      kind: habit.kind,
      due: total.due,
      done: total.done,
      percent: percentOf(total.done, total.due),
      xp: total.xp,
    };
  });
  return { daily, perHabit };
}

export function summarizeRange(daily: readonly DayStats[]): RangeSummary {
  const sum = (pick: (day: DayStats) => number) => daily.reduce((total, day) => total + pick(day), 0);
  const due = sum((d) => d.due);
  const done = sum((d) => d.done);
  return {
    due,
    done,
    percent: percentOf(done, due),
    xp: sum((d) => d.xp),
    minutes: sum((d) => d.minutes),
    earned: sum((d) => d.earned),
    spent: sum((d) => d.spent),
    perfectDays: daily.filter((d) => d.due > 0 && d.done === d.due).length,
    activeDays: daily.filter((d) => d.done > 0).length,
  };
}

// Monday-first (the app's week order). Weekdays that were never due show null.
export function weekdayPattern(daily: readonly DayStats[]): WeekdayStats[] {
  const totals = new Map<Weekday, { due: number; done: number }>(
    WEEK_ORDER.map((weekday) => [weekday, { due: 0, done: 0 }]),
  );
  for (const day of daily) {
    const total = totals.get(weekdayOf(day.date))!;
    total.due += day.due;
    total.done += day.done;
  }
  return WEEK_ORDER.map((weekday) => {
    const { due, done } = totals.get(weekday)!;
    return { weekday, due, done, percent: percentOf(done, due) };
  });
}

// Merges `size` consecutive days into one bar (used to turn 90 days into 13 weeks).
export function bucketDays(daily: readonly DayStats[], size: number): DayStats[] {
  if (size <= 1) return [...daily];
  const buckets: DayStats[] = [];
  for (let start = 0; start < daily.length; start += size) {
    const slice = daily.slice(start, start + size);
    buckets.push({
      date: slice[0].date,
      to: slice[slice.length - 1].date,
      due: slice.reduce((n, d) => n + d.due, 0),
      done: slice.reduce((n, d) => n + d.done, 0),
      xp: slice.reduce((n, d) => n + d.xp, 0),
      minutes: slice.reduce((n, d) => n + d.minutes, 0),
      earned: slice.reduce((n, d) => n + d.earned, 0),
      spent: slice.reduce((n, d) => n + d.spent, 0),
    });
  }
  return buckets;
}

export interface LedgerEntry {
  date: DateKey; // already converted to the user's calendar day
  type: string;
  amount: number; // signed gems
}

// Gems per day. Purchases are "spent". Everything else (habits, streak bonuses,
// reversals, adjustments) is "earned"; an undo can make a day negative, so a day's
// earned total never goes below zero.
export function foldLedger(entries: readonly LedgerEntry[]): Map<DateKey, DayFlow> {
  const flow = new Map<DateKey, DayFlow>();
  for (const entry of entries) {
    const day = flow.get(entry.date) ?? { earned: 0, spent: 0 };
    if (entry.type === "purchase") day.spent += -entry.amount;
    else day.earned += entry.amount;
    flow.set(entry.date, day);
  }
  for (const day of flow.values()) day.earned = Math.max(0, day.earned);
  return flow;
}

// The last `count` days ending at `today`, oldest first.
export function rangeDays(today: DateKey, count: number): DateKey[] {
  return Array.from({ length: count }, (_, index) => addDays(today, index - (count - 1)));
}

export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}
