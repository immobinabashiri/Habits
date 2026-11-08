import { addDays, weekdayOf } from "@/lib/domain/dates";
import { WEEK_ORDER, WEEKDAY_SHORT } from "@/lib/domain/weekdays";
import type { DateKey, Weekday } from "@/types/common";
import type {
  CalendarCategory,
  CalendarHabitDay,
  CalendarItemType,
  CalendarPriority,
  CalendarView,
  PlanTemplateEntry,
  PublicCalendarItem,
  Recurrence,
  RecurrenceFreq,
} from "@/types/calendar";

// Pure calendar rules, shared by the server and the browser (no I/O). Every date is
// a DateKey and every time a wall-clock "HH:MM" in the user's zone, so nothing here
// ever converts through the machine's local time.

export const CALENDAR_ITEM_TYPES = ["event", "task", "reminder", "note", "milestone"] as const satisfies readonly CalendarItemType[];
export const CALENDAR_CATEGORIES = ["personal", "workout", "work", "learning", "health", "social", "other"] as const satisfies readonly CalendarCategory[];
export const CALENDAR_PRIORITIES = ["low", "normal", "high"] as const satisfies readonly CalendarPriority[];
export const RECURRENCE_FREQS = ["daily", "weekly", "monthly", "yearly"] as const satisfies readonly RecurrenceFreq[];
export const CALENDAR_VIEWS = ["month", "week", "day", "agenda"] as const satisfies readonly CalendarView[];
// Minutes before the start. 0 = at the start.
export const REMINDER_OPTIONS = [0, 5, 10, 15, 30, 60, 120, 1440] as const;

// An all-day item's reminder is measured from this time of day.
export const ALL_DAY_REMINDER_MINUTES = 9 * 60;
// A timed item with no end is drawn (and checked for overlaps) as this long.
export const DEFAULT_BLOCK_MINUTES = 30;
export const AGENDA_DAYS = 30;
// The overview (reminders, what's next) always looks this far ahead of today.
export const LOOKAHEAD_DAYS = 7;

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export function isValidTime(value: string): boolean {
  return TIME_PATTERN.test(value);
}

export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

export function minutesToTime(total: number): string {
  const clamped = Math.max(0, Math.min(24 * 60 - 1, Math.round(total)));
  const hours = Math.floor(clamped / 60);
  const minutes = clamped % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

// "9 AM", "9:30 AM", "12 PM".
export function formatTime(time: string): string {
  const total = timeToMinutes(time);
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  const suffix = hours < 12 ? "AM" : "PM";
  const h12 = hours % 12 === 0 ? 12 : hours % 12;
  return minutes === 0 ? `${h12} ${suffix}` : `${h12}:${String(minutes).padStart(2, "0")} ${suffix}`;
}

export function formatHour(hour: number): string {
  return formatTime(`${String(hour).padStart(2, "0")}:00`);
}

export function describeTime(item: Pick<PublicCalendarItem, "allDay" | "startTime" | "endTime">): string {
  if (item.allDay || !item.startTime) return "All day";
  return item.endTime ? `${formatTime(item.startTime)} – ${formatTime(item.endTime)}` : formatTime(item.startTime);
}

// ---- Day arithmetic on DateKeys ----

function parts(key: DateKey): [number, number, number] {
  const [year, month, day] = key.split("-").map(Number);
  return [year, month, day];
}

function keyOf(year: number, month: number, day: number): DateKey {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function daysBetween(from: DateKey, to: DateKey): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

// The same day of the month, clamped (Jan 31 + 1 month = Feb 28).
export function addMonths(key: DateKey, months: number): DateKey {
  const [year, month, day] = parts(key);
  const index = year * 12 + (month - 1) + months;
  const nextYear = Math.floor(index / 12);
  const nextMonth = (index % 12) + 1;
  return keyOf(nextYear, nextMonth, Math.min(day, daysInMonth(nextYear, nextMonth)));
}

export function monthStart(key: DateKey): DateKey {
  const [year, month] = parts(key);
  return keyOf(year, month, 1);
}

// The first day of the week holding `key`, using the app's display order (Monday).
export function weekStartOf(key: DateKey): DateKey {
  const offset = WEEK_ORDER.indexOf(weekdayOf(key));
  return addDays(key, -offset);
}

export function weekDays(weekStart: DateKey): DateKey[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

// Six full weeks, so every month fits and the grid never changes height.
export function monthGridDays(anchor: DateKey): DateKey[] {
  const first = weekStartOf(monthStart(anchor));
  return Array.from({ length: 42 }, (_, i) => addDays(first, i));
}

export function rangeFor(view: CalendarView, anchor: DateKey): { from: DateKey; to: DateKey } {
  switch (view) {
    case "month": {
      const days = monthGridDays(anchor);
      return { from: days[0], to: days[days.length - 1] };
    }
    case "week": {
      const start = weekStartOf(anchor);
      return { from: start, to: addDays(start, 6) };
    }
    case "day":
      return { from: anchor, to: anchor };
    case "agenda":
      return { from: anchor, to: addDays(anchor, AGENDA_DAYS - 1) };
  }
}

// Where "previous" and "next" go from a view.
export function shiftAnchor(view: CalendarView, anchor: DateKey, direction: -1 | 1): DateKey {
  switch (view) {
    case "month":
      return addMonths(monthStart(anchor), direction);
    case "week":
      return addDays(anchor, 7 * direction);
    case "day":
      return addDays(anchor, direction);
    case "agenda":
      return addDays(anchor, AGENDA_DAYS * direction);
  }
}

// ---- Display formatting (built from the key's parts and formatted in UTC) ----

function utcDate(key: DateKey): Date {
  const [year, month, day] = parts(key);
  return new Date(Date.UTC(year, month - 1, day));
}

function format(key: DateKey, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat("en-US", { ...options, timeZone: "UTC" }).format(utcDate(key));
}

export const formatMonthTitle = (key: DateKey) => format(key, { month: "long", year: "numeric" });
export const formatLongDate = (key: DateKey) => format(key, { weekday: "long", month: "long", day: "numeric" });
export const formatShortDate = (key: DateKey) => format(key, { month: "short", day: "numeric" });
export const formatFullDate = (key: DateKey) =>
  format(key, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
export const dayOfMonth = (key: DateKey) => parts(key)[2];

// "Nov 2 – 8, 2026", "Oct 26 – Nov 1, 2026", "Dec 28, 2026 – Jan 3, 2027".
export function formatRangeTitle(from: DateKey, to: DateKey): string {
  const [fy, fm] = parts(from);
  const [ty, tm, td] = parts(to);
  if (fy !== ty) return `${format(from, { month: "short", day: "numeric", year: "numeric" })} – ${format(to, { month: "short", day: "numeric", year: "numeric" })}`;
  if (fm !== tm) return `${formatShortDate(from)} – ${formatShortDate(to)}, ${ty}`;
  return `${formatShortDate(from)} – ${td}, ${ty}`;
}

export function viewTitle(view: CalendarView, anchor: DateKey): string {
  const { from, to } = rangeFor(view, anchor);
  if (view === "month") return formatMonthTitle(anchor);
  if (view === "day") return formatFullDate(anchor);
  return formatRangeTitle(from, to);
}

// ---- Recurrence ----

// True when the item happens on `date`.
export function occursOn(
  item: Pick<PublicCalendarItem, "date" | "recurrence" | "skippedDates">,
  date: DateKey,
): boolean {
  if (date < item.date) return false;
  const rule = item.recurrence;
  if (!rule) return date === item.date;
  if (rule.until && date > rule.until) return false;
  if (item.skippedDates.includes(date)) return false;

  const interval = Math.max(1, rule.interval);
  switch (rule.freq) {
    case "daily":
      return daysBetween(item.date, date) % interval === 0;
    case "weekly": {
      // Weeks are counted from the week the series starts in, so "every 2 weeks on
      // Mon and Thu" keeps both days in the same on-week.
      const days = rule.days.length > 0 ? rule.days : [weekdayOf(item.date)];
      if (!days.includes(weekdayOf(date))) return false;
      const weeks = daysBetween(weekStartOf(item.date), weekStartOf(date)) / 7;
      return weeks % interval === 0;
    }
    case "monthly": {
      // Months without that day (the 31st) are skipped, like most calendars do.
      const [sy, sm, sd] = parts(item.date);
      const [y, m, d] = parts(date);
      if (d !== sd) return false;
      return ((y - sy) * 12 + (m - sm)) % interval === 0;
    }
    case "yearly": {
      const [sy, sm, sd] = parts(item.date);
      const [y, m, d] = parts(date);
      return m === sm && d === sd && (y - sy) % interval === 0;
    }
  }
}

// True when any occurrence falls in [from, to]. Used to pick what to load.
export function occursBetween(
  item: Pick<PublicCalendarItem, "date" | "recurrence" | "skippedDates">,
  from: DateKey,
  to: DateKey,
): boolean {
  if (item.date > to) return false;
  if (!item.recurrence) return item.date >= from;
  if (item.recurrence.until && item.recurrence.until < from) return false;
  // The step is computed inside the body on purpose: Turbopack mis-compiles an
  // imported function called in a `for` update clause (see domain/streaks.ts).
  for (let offset = 0; ; offset += 1) {
    const day = addDays(from, offset);
    if (day > to) break;
    if (occursOn(item, day)) return true;
  }
  return false;
}

export function describeRecurrence(rule: Recurrence, start: DateKey): string {
  const every = (unit: string) => (rule.interval > 1 ? `Every ${rule.interval} ${unit}s` : null);
  let text: string;
  switch (rule.freq) {
    case "daily":
      text = every("day") ?? "Every day";
      break;
    case "weekly": {
      const days = rule.days.length > 0 ? rule.days : [weekdayOf(start)];
      const names = WEEK_ORDER.filter((d) => days.includes(d)).map((d) => WEEKDAY_SHORT[d]).join(", ");
      text = `${every("week") ?? "Weekly"} on ${days.length === 7 ? "every day" : names}`;
      break;
    }
    case "monthly":
      text = `${every("month") ?? "Monthly"} on day ${dayOfMonth(start)}`;
      break;
    case "yearly":
      text = `${every("year") ?? "Yearly"} on ${formatShortDate(start)}`;
      break;
  }
  return rule.until ? `${text}, until ${formatShortDate(rule.until)}` : text;
}

// ---- Occurrences ----

export interface Occurrence {
  item: PublicCalendarItem;
  date: DateKey;
  done: boolean;
}

// Only things you "do" can be checked off. Workouts are events, but you do them.
export function isCompletable(item: Pick<PublicCalendarItem, "type" | "category">): boolean {
  return item.type === "task" || item.type === "milestone" || (item.type === "event" && item.category === "workout");
}

const PRIORITY_RANK: Record<CalendarPriority, number> = { high: 0, normal: 1, low: 2 };

export function compareOccurrences(a: Occurrence, b: Occurrence): number {
  if (a.date !== b.date) return a.date < b.date ? -1 : 1;
  if (a.item.allDay !== b.item.allDay) return a.item.allDay ? -1 : 1;
  const at = a.item.startTime ?? "";
  const bt = b.item.startTime ?? "";
  if (at !== bt) return at < bt ? -1 : 1;
  return PRIORITY_RANK[a.item.priority] - PRIORITY_RANK[b.item.priority] || a.item.title.localeCompare(b.item.title);
}

export function occurrencesInRange(items: readonly PublicCalendarItem[], from: DateKey, to: DateKey): Occurrence[] {
  const result: Occurrence[] = [];
  for (const item of items) {
    if (item.date > to) continue;
    if (!item.recurrence) {
      if (item.date >= from) result.push({ item, date: item.date, done: item.completedDates.includes(item.date) });
      continue;
    }
    const start = item.date > from ? item.date : from;
    const end = item.recurrence.until && item.recurrence.until < to ? item.recurrence.until : to;
    // Same loop shape as occursBetween: the step is computed inside the body.
    for (let offset = 0; ; offset += 1) {
      const day = addDays(start, offset);
      if (day > end) break;
      if (occursOn(item, day)) result.push({ item, date: day, done: item.completedDates.includes(day) });
    }
  }
  return result.sort(compareOccurrences);
}

export function groupByDate<T extends { date: DateKey }>(entries: readonly T[]): Map<DateKey, T[]> {
  const map = new Map<DateKey, T[]>();
  for (const entry of entries) {
    const list = map.get(entry.date) ?? [];
    list.push(entry);
    map.set(entry.date, list);
  }
  return map;
}

// A task from an earlier day that was never checked off. Repeating tasks are not
// "overdue": a missed repeat simply shows as missed on its own day.
export function isOverdue(item: PublicCalendarItem, today: DateKey): boolean {
  return (
    item.recurrence === null &&
    (item.type === "task" || item.type === "milestone") &&
    item.date < today &&
    !item.completedDates.includes(item.date)
  );
}

// ---- Time grid layout ----

export interface TimedBlock {
  occurrence: Occurrence;
  start: number; // minutes from midnight
  end: number;
  column: number;
  columns: number; // columns in its group of overlapping blocks
}

export function blockRange(item: Pick<PublicCalendarItem, "startTime" | "endTime">): { start: number; end: number } {
  const start = timeToMinutes(item.startTime ?? "00:00");
  const end = item.endTime ? timeToMinutes(item.endTime) : Math.min(24 * 60, start + DEFAULT_BLOCK_MINUTES);
  return { start, end: Math.max(end, start + 15) };
}

// Side-by-side columns for overlapping timed items, like every calendar does: each
// group of items that overlap (directly or through a chain) shares its width.
export function layoutTimed(occurrences: readonly Occurrence[]): TimedBlock[] {
  const blocks = occurrences
    .filter((o) => !o.item.allDay && o.item.startTime)
    .map((occurrence) => ({ occurrence, ...blockRange(occurrence.item), column: 0, columns: 1 }))
    .sort((a, b) => a.start - b.start || b.end - a.end);

  let group: typeof blocks = [];
  let groupEnd = -1;
  const columnEnds: number[] = [];
  const closeGroup = () => {
    const count = Math.max(1, ...group.map((block) => block.column + 1));
    for (const block of group) block.columns = count;
    group = [];
    columnEnds.length = 0;
  };

  for (const block of blocks) {
    if (block.start >= groupEnd && group.length > 0) closeGroup();
    let column = columnEnds.findIndex((end) => end <= block.start);
    if (column === -1) column = columnEnds.length;
    columnEnds[column] = block.end;
    block.column = column;
    group.push(block);
    groupEnd = Math.max(groupEnd, block.end);
  }
  if (group.length > 0) closeGroup();
  return blocks;
}

// Timed items on that day that overlap [start, end), for the "clashes with" hint.
export function findConflicts(
  occurrences: readonly Occurrence[],
  date: DateKey,
  startTime: string,
  endTime: string | null,
  ignoreId: string | null,
): Occurrence[] {
  const range = blockRange({ startTime, endTime });
  return occurrences.filter((o) => {
    if (o.date !== date || o.item.allDay || !o.item.startTime || o.item.id === ignoreId) return false;
    if (o.item.type === "note") return false;
    const other = blockRange(o.item);
    return other.start < range.end && range.start < other.end;
  });
}

// ---- Reminders ----

// When the reminder for one occurrence goes off, as a day and minutes from midnight.
export function reminderAt(
  item: Pick<PublicCalendarItem, "allDay" | "startTime" | "reminderMinutes">,
  date: DateKey,
): { date: DateKey; minutes: number } | null {
  if (item.reminderMinutes === null) return null;
  const base = item.allDay || !item.startTime ? ALL_DAY_REMINDER_MINUTES : timeToMinutes(item.startTime);
  const total = base - item.reminderMinutes;
  const dayShift = Math.floor(total / 1440);
  return { date: addDays(date, dayShift), minutes: total - dayShift * 1440 };
}

export function describeReminder(minutes: number | null): string {
  if (minutes === null) return "No reminder";
  if (minutes === 0) return "At the start";
  if (minutes < 60) return `${minutes} minutes before`;
  if (minutes === 60) return "1 hour before";
  if (minutes < 1440) return `${minutes / 60} hours before`;
  return "1 day before";
}

// The current day and minute in an IANA zone (the browser's own zone is irrelevant).
export function nowIn(timeZone: string, instant: Date = new Date()): { date: DateKey; minutes: number } {
  const values = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(instant)
      .map((part) => [part.type, part.value]),
  );
  return {
    date: `${values.year}-${values.month}-${values.day}`,
    minutes: (Number(values.hour) % 24) * 60 + Number(values.minute),
  };
}

// ---- Weekly review ----

export interface WeekReview {
  plannedMinutes: number; // timed events, tasks and workouts with an end time
  workouts: { done: number; total: number; minutes: number };
  tasks: { done: number; total: number };
  habits: { done: number; total: number }; // scheduled days so far (today included)
  perDay: { date: DateKey; minutes: number; items: number }[];
  busiest: DateKey | null;
}

export function reviewWeek(
  occurrences: readonly Occurrence[],
  habitDays: readonly CalendarHabitDay[],
  days: readonly DateKey[],
  today: DateKey,
): WeekReview {
  const inWeek = occurrences.filter((o) => days.includes(o.date));
  const minutesOf = (o: Occurrence) => {
    if (o.item.allDay || !o.item.startTime || !o.item.endTime) return 0;
    if (o.item.type === "note" || o.item.type === "reminder") return 0;
    const { start, end } = blockRange(o.item);
    return end - start;
  };
  const workouts = inWeek.filter((o) => o.item.category === "workout" && o.item.type === "event");
  const tasks = inWeek.filter((o) => o.item.type === "task");
  const dueHabits = habitDays.filter((h) => days.includes(h.date) && h.date <= today && h.status !== "exempt");
  const perDay = days.map((date) => {
    const list = inWeek.filter((o) => o.date === date && o.item.type !== "note");
    return { date, minutes: list.reduce((sum, o) => sum + minutesOf(o), 0), items: list.length };
  });
  const top = perDay.reduce<(typeof perDay)[number] | null>(
    (best, day) => (day.minutes + day.items * 15 > (best ? best.minutes + best.items * 15 : 0) ? day : best),
    null,
  );
  return {
    plannedMinutes: inWeek.reduce((sum, o) => sum + minutesOf(o), 0),
    workouts: {
      done: workouts.filter((o) => o.done).length,
      total: workouts.length,
      minutes: workouts.reduce((sum, o) => sum + minutesOf(o), 0),
    },
    tasks: { done: tasks.filter((o) => o.done).length, total: tasks.length },
    habits: { done: dueHabits.filter((h) => h.status === "done").length, total: dueHabits.length },
    perDay,
    busiest: top ? top.date : null,
  };
}

export function formatDuration(minutes: number): string {
  if (minutes <= 0) return "0 h";
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} min`;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}

// ---- Week templates ----

const TEMPLATE_TYPES = new Set(["event", "task", "reminder"]);

// The single (non-repeating) events, tasks and reminders of a week, as reusable lines.
// Repeating items are left out: they already come back every week on their own.
export function templateEntriesFromWeek(
  items: readonly PublicCalendarItem[],
  weekStart: DateKey,
): PlanTemplateEntry[] {
  const days = weekDays(weekStart);
  return items
    .filter((item) => item.recurrence === null && TEMPLATE_TYPES.has(item.type) && days.includes(item.date))
    .map((item) => ({ item, date: item.date, done: false }))
    .sort(compareOccurrences)
    .map(({ item }) => ({
      weekday: weekdayOf(item.date),
      type: item.type as PlanTemplateEntry["type"],
      title: item.title,
      category: item.category,
      priority: item.priority,
      allDay: item.allDay,
      startTime: item.startTime,
      endTime: item.endTime,
      reminderMinutes: item.reminderMinutes,
    }));
}

// The day of `weekStart`'s week that falls on a weekday.
export function dateInWeek(weekStart: DateKey, weekday: Weekday): DateKey {
  return addDays(weekStart, WEEK_ORDER.indexOf(weekday));
}

// Identifies "the same line" when a template is applied twice to one week.
export function templateEntryKey(entry: { title: string; startTime: string | null }, date: DateKey): string {
  return `${date}|${entry.startTime ?? ""}|${entry.title.trim().toLowerCase()}`;
}
