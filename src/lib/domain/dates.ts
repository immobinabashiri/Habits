import type { DateKey } from "@/types/common";

// True only for real calendar dates written as "YYYY-MM-DD" (rejects 2026-02-31).
export function isValidDateKey(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(value);
}

// Today's calendar day in the given IANA time zone. "en-CA" formats as YYYY-MM-DD.
export function todayKey(timeZone: string): DateKey {
  return new Intl.DateTimeFormat("en-CA", { timeZone }).format(new Date());
}

export function addDays(key: DateKey, days: number): DateKey {
  const date = new Date(`${key}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}