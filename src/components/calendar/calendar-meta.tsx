import {
  Bell,
  BookOpen,
  Briefcase,
  CalendarClock,
  Dumbbell,
  Flag,
  HeartPulse,
  ListChecks,
  ListTodo,
  Shapes,
  StickyNote,
  User,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { CalendarCategory, CalendarItemType, PublicCalendarItem } from "@/types/calendar";

// How each kind of activity looks. A "workout" is an event in the workout category:
// it is offered as its own kind because that is how people think about it.
export type CalendarKind = "event" | "workout" | "task" | "reminder" | "note" | "milestone";
// What the filter chips toggle: every kind, plus habits from the habit system.
export type CalendarTone = CalendarKind | "habit";

export const KIND_META: Record<CalendarKind, { label: string; plural: string; icon: LucideIcon; hint: string }> = {
  event: { label: "Event", plural: "Events", icon: CalendarClock, hint: "Something at a time or on a day" },
  workout: { label: "Workout", plural: "Workouts", icon: Dumbbell, hint: "A training session you can check off" },
  task: { label: "Task", plural: "Tasks", icon: ListTodo, hint: "Something to get done" },
  reminder: { label: "Reminder", plural: "Reminders", icon: Bell, hint: "A nudge at a set time" },
  note: { label: "Note", plural: "Notes", icon: StickyNote, hint: "A few words pinned to a day" },
  milestone: { label: "Goal", plural: "Goals & dates", icon: Flag, hint: "A goal, deadline or important date" },
};

export const KINDS: CalendarKind[] = ["event", "workout", "task", "reminder", "note", "milestone"];

export const TONE_META: Record<CalendarTone, { label: string; icon: LucideIcon }> = {
  ...Object.fromEntries(KINDS.map((kind) => [kind, { label: KIND_META[kind].plural, icon: KIND_META[kind].icon }])),
  habit: { label: "Habits", icon: ListChecks },
} as Record<CalendarTone, { label: string; icon: LucideIcon }>;

export const TONES: CalendarTone[] = [...KINDS, "habit"];

// Workout is a kind, so it is not offered again as a category.
export const CATEGORY_META: Record<Exclude<CalendarCategory, "workout">, { label: string; icon: LucideIcon }> = {
  personal: { label: "Personal", icon: User },
  work: { label: "Work", icon: Briefcase },
  learning: { label: "Learning", icon: BookOpen },
  health: { label: "Health", icon: HeartPulse },
  social: { label: "Social", icon: Users },
  other: { label: "Other", icon: Shapes },
};

export const CATEGORIES = Object.keys(CATEGORY_META) as Exclude<CalendarCategory, "workout">[];

export function kindOf(item: Pick<PublicCalendarItem, "type" | "category">): CalendarKind {
  return item.type === "event" && item.category === "workout" ? "workout" : item.type;
}

export function typeOfKind(kind: CalendarKind): CalendarItemType {
  return kind === "workout" ? "event" : kind;
}

export function KindIcon({ kind, className = "size-3.5" }: { kind: CalendarTone; className?: string }) {
  const Icon = TONE_META[kind].icon;
  return <Icon className={className} aria-hidden="true" />;
}
