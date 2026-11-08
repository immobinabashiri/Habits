import { kindOf, typeOfKind } from "@/components/calendar/calendar-meta";
import type { CalendarKind } from "@/components/calendar/calendar-meta";
import { minutesToTime, timeToMinutes } from "@/lib/domain/calendar";
import { calendarItemSchema } from "@/lib/validation/calendar";
import type { CalendarItemInput } from "@/lib/validation/calendar";
import type { CalendarCategory, CalendarPriority, PublicCalendarItem, RecurrenceFreq } from "@/types/calendar";
import type { DateKey, Weekday } from "@/types/common";

// Error keys match the paths the server uses in `fields`, so client-side and
// server-side errors render through the same code.
export type ItemFormErrors = Partial<Record<string, string>>;

// Numbers are kept as text while typing and parsed on submit.
export interface ItemDraft {
  kind: CalendarKind;
  title: string;
  notes: string;
  category: CalendarCategory;
  priority: CalendarPriority;
  date: DateKey;
  allDay: boolean;
  startTime: string;
  endTime: string; // "" = no end
  repeat: "none" | RecurrenceFreq;
  interval: string;
  days: Weekday[];
  until: string; // "" = forever
  reminder: string; // "none" or minutes
}

export function newDraft(date: DateKey, preset: Partial<ItemDraft> = {}): ItemDraft {
  return {
    kind: "event",
    title: "",
    notes: "",
    category: "personal",
    priority: "normal",
    date,
    allDay: false,
    startTime: "09:00",
    endTime: "10:00",
    repeat: "none",
    interval: "1",
    days: [],
    until: "",
    reminder: "none",
    ...preset,
  };
}

export function draftFromItem(item: PublicCalendarItem): ItemDraft {
  return {
    kind: kindOf(item),
    title: item.title,
    notes: item.notes,
    category: item.category,
    priority: item.priority,
    date: item.date,
    allDay: item.allDay,
    startTime: item.startTime ?? "09:00",
    endTime: item.allDay ? "10:00" : (item.endTime ?? ""),
    repeat: item.recurrence?.freq ?? "none",
    interval: String(item.recurrence?.interval ?? 1),
    days: item.recurrence?.days ?? [],
    until: item.recurrence?.until ?? "",
    reminder: item.reminderMinutes === null ? "none" : String(item.reminderMinutes),
  };
}

// Only notes and goals are always all-day; everything else can have a time.
export const isAlwaysAllDay = (kind: CalendarKind) => kind === "note" || kind === "milestone";

// Keeps the end the same length after the start when the start moves.
export function shiftEnd(draft: ItemDraft, nextStart: string): string {
  if (!draft.endTime) return "";
  const length = timeToMinutes(draft.endTime) - timeToMinutes(draft.startTime);
  return minutesToTime(timeToMinutes(nextStart) + Math.max(15, length));
}

// Same rules as the server (the very same schema), so the user gets instant
// feedback and the server stays the final judge.
export function buildItemInput(
  draft: ItemDraft,
  { withRecurrence }: { withRecurrence: boolean },
): { ok: true; input: CalendarItemInput } | { ok: false; errors: ItemFormErrors } {
  const interval = /^\d+$/.test(draft.interval.trim()) ? Number(draft.interval) : Number.NaN;
  const category: CalendarCategory =
    draft.kind === "workout" ? "workout" : draft.category === "workout" ? "personal" : draft.category;
  const parsed = calendarItemSchema.safeParse({
    type: typeOfKind(draft.kind),
    title: draft.title,
    notes: draft.notes,
    category,
    priority: draft.priority,
    date: draft.date,
    allDay: isAlwaysAllDay(draft.kind) ? true : draft.allDay,
    startTime: draft.allDay ? null : draft.startTime || null,
    endTime: draft.allDay ? null : draft.endTime || null,
    recurrence:
      withRecurrence && draft.repeat !== "none"
        ? {
            freq: draft.repeat,
            interval, // NaN when not a whole number: the schema reports it
            days: draft.days,
            until: draft.until || null,
          }
        : null,
    reminderMinutes: draft.reminder === "none" ? null : Number(draft.reminder),
  });
  if (parsed.success) return { ok: true, input: parsed.data };

  const errors: ItemFormErrors = {};
  for (const issue of parsed.error.issues) {
    const key = issue.path.join(".") || "form";
    errors[key] ??= issue.message;
  }
  // The schema's rules between fields only run once every field is valid on its own,
  // so a missing title would hide a wrong end time. Report both at once.
  const timed = !draft.allDay && !isAlwaysAllDay(draft.kind);
  if (timed && draft.startTime && draft.endTime && timeToMinutes(draft.endTime) <= timeToMinutes(draft.startTime)) {
    errors.endTime ??= "End time must be after the start.";
  }
  if (withRecurrence && draft.repeat !== "none" && draft.until && draft.until < draft.date) {
    errors["recurrence.until"] ??= "The last day can't be before the first.";
  }
  return { ok: false, errors };
}
