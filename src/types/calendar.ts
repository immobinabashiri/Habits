import type { Types } from "mongoose";
import type { DayStatus } from "@/lib/domain/streaks";
import type { DateKey, Weekday } from "./common";

// What a calendar item is. Habits are NOT a type here: they stay Habit records and
// are shown on the calendar by reading their schedule (no copies are stored).
//   event     = something at a time or on a day (a workout is an event in the workout category)
//   task      = something to get done, can be checked off
//   reminder  = a nudge at a time
//   note      = a few words pinned to a day
//   milestone = a goal, deadline or important date (birthdays repeat yearly)
export type CalendarItemType = "event" | "task" | "reminder" | "note" | "milestone";

export type CalendarCategory =
  | "personal"
  | "workout"
  | "work"
  | "learning"
  | "health"
  | "social"
  | "other";

export type CalendarPriority = "low" | "normal" | "high";

export type RecurrenceFreq = "daily" | "weekly" | "monthly" | "yearly";

// Repeats from the item's own date. `days` is only used by "weekly".
export interface Recurrence {
  freq: RecurrenceFreq;
  interval: number; // every N days / weeks / months / years
  days: Weekday[];
  until: DateKey | null; // last possible day, inclusive; null = forever
}

export type CalendarView = "month" | "week" | "day" | "agenda";

// Times are wall-clock times ("HH:MM", 24 h) in the user's own time zone, on `date`.
// Like DateKeys they have no zone attached, so changing zones never moves an item to
// another day: 10:00 stays 10:00.
export interface CalendarItemRecord {
  userId: Types.ObjectId;
  type: CalendarItemType;
  title: string;
  notes: string;
  category: CalendarCategory;
  priority: CalendarPriority;
  date: DateKey; // the day it happens, or the first day of a series
  allDay: boolean;
  startTime: string | null; // null when allDay
  endTime: string | null; // optional; null = no end (a point in time)
  recurrence: Recurrence | null;
  reminderMinutes: number | null; // minutes before the start; null = no reminder
  completedDates: DateKey[]; // occurrences checked off (one entry for a single item)
  skippedDates: DateKey[]; // occurrences removed from a series
  templateId: Types.ObjectId | null; // set when created by applying a week template
  createdAt: Date;
  updatedAt: Date;
}

export interface PublicCalendarItem {
  id: string;
  type: CalendarItemType;
  title: string;
  notes: string;
  category: CalendarCategory;
  priority: CalendarPriority;
  date: DateKey;
  allDay: boolean;
  startTime: string | null;
  endTime: string | null;
  recurrence: Recurrence | null;
  reminderMinutes: number | null;
  completedDates: DateKey[];
  skippedDates: DateKey[];
  templateId: string | null;
  createdAt: string;
  updatedAt: string;
}

// ---- Weekly planning ----

export interface WeekPriority {
  id: string; // made by the browser, so a list can be edited without a round trip
  text: string;
  done: boolean;
}

export interface WeekPlanRecord {
  userId: Types.ObjectId;
  weekStart: DateKey; // the first day of the week (WEEK_ORDER[0])
  priorities: WeekPriority[];
  updatedAt: Date;
}

export interface PublicWeekPlan {
  weekStart: DateKey;
  priorities: WeekPriority[];
}

// One line of a reusable week: "Monday 07:00 Workout".
export interface PlanTemplateEntry {
  weekday: Weekday;
  type: "event" | "task" | "reminder";
  title: string;
  category: CalendarCategory;
  priority: CalendarPriority;
  allDay: boolean;
  startTime: string | null;
  endTime: string | null;
  reminderMinutes: number | null;
}

export interface PlanTemplateRecord {
  userId: Types.ObjectId;
  name: string;
  entries: PlanTemplateEntry[];
  createdAt: Date;
  updatedAt: Date;
}

export interface PublicPlanTemplate {
  id: string;
  name: string;
  entries: PlanTemplateEntry[];
  createdAt: string;
}

// ---- Habits, read from the habit system ----

export interface CalendarHabit {
  id: string;
  name: string;
  icon: string;
  timed: boolean;
}

// "upcoming" = scheduled on a future day. "off" days are simply left out.
export type CalendarHabitStatus = Exclude<DayStatus, "off"> | "upcoming";

export interface CalendarHabitDay {
  habitId: string;
  date: DateKey;
  status: CalendarHabitStatus;
}

// ---- Page data ----

export interface CalendarData {
  view: CalendarView;
  anchor: DateKey; // the day the view is built around
  from: DateKey; // the visible range, inclusive
  to: DateKey;
  today: DateKey;
  timezone: string;
  // Items with at least one occurrence in [from, to] or in the next 7 days (for the
  // overview), plus overdue tasks. Repeats are expanded in the browser.
  items: PublicCalendarItem[];
  habits: CalendarHabit[];
  habitDays: CalendarHabitDay[]; // scheduled habit days in the visible range and the next 7 days
  weekPlan: PublicWeekPlan; // the week that contains the anchor
  templates: PublicPlanTemplate[];
}

export interface OccurrenceMoveResult {
  item: PublicCalendarItem; // the series (now skipping that day) or the moved item
  occurrence: PublicCalendarItem | null; // the new single item, for a moved repeat
}

export interface ApplyTemplateResult {
  created: PublicCalendarItem[];
  skipped: number; // entries already on the calendar that week
}
