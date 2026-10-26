import type { Weekday } from "@/types/common";

// Display order of the week in the UI (values stay 0 = Sunday ... 6 = Saturday).
// To start the week on another day, only change this array.
export const WEEK_ORDER: readonly Weekday[] = [1, 2, 3, 4, 5, 6, 0];

export const WEEKDAY_SHORT: Record<Weekday, string> = {
  0: "Sun",
  1: "Mon",
  2: "Tue",
  3: "Wed",
  4: "Thu",
  5: "Fri",
  6: "Sat",
};

export const WEEKDAY_LONG: Record<Weekday, string> = {
  0: "Sunday",
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
  6: "Saturday",
};

const sameDays = (days: readonly Weekday[], expected: readonly Weekday[]) =>
  days.length === expected.length && expected.every((d) => days.includes(d));

// "Every day", "Weekdays", "Weekends" or "Mon, Wed, Fri".
export function describeSchedule(days: readonly Weekday[]): string {
  if (days.length === 7) return "Every day";
  if (sameDays(days, [1, 2, 3, 4, 5])) return "Weekdays";
  if (sameDays(days, [6, 0])) return "Weekends";
  return WEEK_ORDER.filter((d) => days.includes(d))
    .map((d) => WEEKDAY_SHORT[d])
    .join(", ");
}
