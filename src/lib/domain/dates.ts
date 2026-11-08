import type { DateKey, Weekday } from "@/types/common";

// True only for real calendar dates written as "YYYY-MM-DD" (rejects 2026-02-31).
export function isValidDateKey(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(value);
}

// Today's calendar day in the given IANA time zone. "en-CA" formats as YYYY-MM-DD.
// The calendar day an instant falls on in a given time zone ("YYYY-MM-DD").
export function dateKeyOf(instant: Date, timeZone: string): DateKey {
  return new Intl.DateTimeFormat("en-CA", { timeZone }).format(instant);
}

export function todayKey(timeZone: string): DateKey {
  return dateKeyOf(new Date(), timeZone);
}

export function addDays(key: DateKey, days: number): DateKey {
  const date = new Date(`${key}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

// "Sat, Oct 24, 2026". Built from the parts of the key and formatted in UTC, so
// the user's own time zone can never shift the day (a DateKey has no time zone).
export function formatDateKey(key: DateKey): string {
  const [year, month, day] = key.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

// 0 = Sunday ... 6 = Saturday, for a calendar day (no time zone involved).
export function weekdayOf(key: DateKey): Weekday {
  return new Date(`${key}T00:00:00Z`).getUTCDay() as Weekday;
}

export function isValidTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat("en", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}
