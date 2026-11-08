"use client";

import { Check, Circle, CircleDashed, Flag, Moon, Repeat, Snowflake, X } from "lucide-react";
import Link from "next/link";
import type { CSSProperties, HTMLAttributes, ReactNode } from "react";
import { KIND_META, KindIcon, kindOf } from "@/components/calendar/calendar-meta";
import { HabitIcon } from "@/components/habits/habit-icons";
import { describeTime, formatShortDate, isCompletable } from "@/lib/domain/calendar";
import type { Occurrence } from "@/lib/domain/calendar";
import type { CalendarHabit, CalendarHabitStatus } from "@/types/calendar";

// Pointer handlers and data attributes from useCalendarDrag.
export type DragProps = HTMLAttributes<HTMLElement> & Record<`data-${string}`, string | undefined>;

// The words a screen reader hears for one occurrence: "Workout: Gym, 7 AM – 8 AM, done".
export function describeOccurrence(occurrence: Occurrence, withDate = false): string {
  const { item } = occurrence;
  const parts = [`${KIND_META[kindOf(item)].label}: ${item.title}`, describeTime(item)];
  if (withDate) parts.push(formatShortDate(occurrence.date));
  if (item.recurrence) parts.push("repeats");
  if (item.priority === "high") parts.push("high priority");
  if (isCompletable(item)) parts.push(occurrence.done ? "done" : "not done");
  return parts.join(", ");
}

// A one-line item, used in month cells and the all-day row.
export function ItemChip({
  occurrence,
  onOpen,
  drag,
  showTime = true,
}: {
  occurrence: Occurrence;
  onOpen: (occurrence: Occurrence) => void;
  drag?: DragProps;
  showTime?: boolean;
}) {
  const { item } = occurrence;
  const kind = kindOf(item);
  return (
    <button
      type="button"
      {...drag}
      onClick={() => onOpen(occurrence)}
      aria-label={describeOccurrence(occurrence)}
      data-done={occurrence.done ? "" : undefined}
      className={`cal-chip cal-tone-${kind} w-full`}
    >
      {occurrence.done ? <Check className="size-3" aria-hidden="true" /> : <KindIcon kind={kind} className="size-3" />}
      {/* Title first: in a narrow cell the name matters more than the time. */}
      <span className="cal-title min-w-0 flex-1 truncate">{item.title}</span>
      {showTime && !item.allDay && item.startTime ? (
        <span className="shrink-0 tabular-nums text-muted-foreground">{describeTime({ ...item, endTime: null })}</span>
      ) : null}
    </button>
  );
}

// A timed item in the day/week grid, sized by its length.
export function TimedBlock({
  occurrence,
  style,
  minutes,
  onOpen,
  drag,
}: {
  occurrence: Occurrence;
  style: CSSProperties;
  minutes: number;
  onOpen: (occurrence: Occurrence) => void;
  drag?: DragProps;
}) {
  const { item } = occurrence;
  const kind = kindOf(item);
  return (
    <button
      type="button"
      {...drag}
      data-duration-minutes={minutes}
      onClick={(event) => {
        event.stopPropagation(); // not a click on the empty grid
        onOpen(occurrence);
      }}
      aria-label={describeOccurrence(occurrence)}
      data-done={occurrence.done ? "" : undefined}
      style={style}
      className={`cal-chip cal-block cal-tone-${kind}`}
    >
      <span className="flex min-w-0 items-center gap-1 font-semibold">
        {occurrence.done ? <Check className="size-3 shrink-0" aria-hidden="true" /> : <KindIcon kind={kind} className="size-3 shrink-0" />}
        <span className="cal-title truncate">{item.title}</span>
        {item.recurrence ? <Repeat className="size-3 shrink-0 opacity-70" aria-hidden="true" /> : null}
      </span>
      {minutes >= 40 ? (
        <span className="truncate tabular-nums text-muted-foreground">{describeTime(item)}</span>
      ) : null}
    </button>
  );
}

// A full row with a check button, for the day panel, the agenda and the overview.
export function ItemRow({
  occurrence,
  onOpen,
  onToggleDone,
  busy,
  showDate = false,
  extra,
}: {
  occurrence: Occurrence;
  onOpen: (occurrence: Occurrence) => void;
  onToggleDone: (occurrence: Occurrence) => void;
  busy: boolean;
  showDate?: boolean;
  extra?: ReactNode;
}) {
  const { item } = occurrence;
  const kind = kindOf(item);
  const completable = isCompletable(item);
  return (
    <li className={`cal-tone-${kind} flex items-center gap-2 rounded-md border border-border py-1 pl-1 pr-2`}>
      {completable ? (
        <button
          type="button"
          role="checkbox"
          aria-checked={occurrence.done}
          aria-label={`${occurrence.done ? "Mark not done" : "Mark done"}: ${item.title}`}
          onClick={() => onToggleDone(occurrence)}
          disabled={busy}
          className="btn-icon shrink-0"
        >
          <span
            aria-hidden="true"
            className={`flex size-5 items-center justify-center rounded-full border-2 transition-colors ${
              occurrence.done ? "border-[var(--tone)] bg-[var(--tone)] text-card" : "border-[var(--tone)]"
            }`}
          >
            {occurrence.done ? <Check className="size-3" strokeWidth={3} /> : null}
          </span>
        </button>
      ) : (
        <span aria-hidden="true" className="flex size-11 shrink-0 items-center justify-center text-[var(--tone)]">
          <KindIcon kind={kind} className="size-4" />
        </span>
      )}
      <button
        type="button"
        onClick={() => onOpen(occurrence)}
        className="flex min-h-11 min-w-0 flex-1 flex-col items-start justify-center rounded-sm text-left"
        aria-label={`${describeOccurrence(occurrence, showDate)}. Open`}
      >
        <span
          className={`flex w-full min-w-0 items-center gap-1.5 text-sm font-medium ${
            occurrence.done ? "text-muted-foreground line-through" : ""
          }`}
        >
          <span className="truncate">{item.title}</span>
          {item.priority === "high" ? <Flag className="size-3.5 shrink-0 text-destructive" aria-hidden="true" /> : null}
          {item.recurrence ? <Repeat className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" /> : null}
        </span>
        <span className="truncate text-xs text-muted-foreground">
          {showDate ? `${formatShortDate(occurrence.date)} · ` : ""}
          {describeTime(item)} · {KIND_META[kind].label}
        </span>
      </button>
      {extra}
    </li>
  );
}

export const HABIT_STATUS_META: Record<CalendarHabitStatus, { label: string; icon: typeof Check }> = {
  done: { label: "Done", icon: Check },
  open: { label: "To do today", icon: Circle },
  missed: { label: "Missed", icon: X },
  frozen: { label: "Saved by a freeze", icon: Snowflake },
  exempt: { label: "Day off", icon: Moon },
  upcoming: { label: "Scheduled", icon: CircleDashed },
};

// A habit on a day, read from the habit system. It links to the habit itself; habits
// are checked off on the Dashboard, where their rewards are paid.
export function HabitDayRow({ habit, status }: { habit: CalendarHabit; status: CalendarHabitStatus }) {
  const meta = HABIT_STATUS_META[status];
  const StatusIcon = meta.icon;
  return (
    <li className="cal-tone-habit">
      <Link
        href={`/dashboard/habits#habit-${habit.id}`}
        className="flex min-h-11 items-center gap-2.5 rounded-md border border-border px-2.5 py-1 hover:bg-muted"
        aria-label={`Habit: ${habit.name}, ${meta.label}. Open habit`}
      >
        <span aria-hidden="true" className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--tone)_16%,var(--card))] text-[var(--tone)]">
          <HabitIcon name={habit.icon} className="size-4" />
        </span>
        <span className={`min-w-0 flex-1 truncate text-sm font-medium ${status === "done" ? "text-muted-foreground" : ""}`}>
          {habit.name}
        </span>
        <span
          className={`inline-flex shrink-0 items-center gap-1 text-xs ${
            status === "done" ? "text-[var(--tone)]" : status === "missed" ? "text-destructive" : "text-muted-foreground"
          }`}
        >
          <StatusIcon className="size-3.5" aria-hidden="true" />
          {meta.label}
        </span>
      </Link>
    </li>
  );
}
