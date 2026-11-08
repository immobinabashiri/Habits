"use client";

import { ArrowRight, Plus } from "lucide-react";
import { HabitDayRow, ItemRow } from "@/components/calendar/calendar-items";
import { formatLongDate } from "@/lib/domain/calendar";
import type { Occurrence } from "@/lib/domain/calendar";
import type { CalendarHabit, CalendarHabitDay } from "@/types/calendar";
import type { DateKey } from "@/types/common";

// Everything on one day: items first, then the habits scheduled that day.
export function DayPanel({
  date,
  today,
  occurrences,
  habitDays,
  habits,
  busyKey,
  showItems = true,
  onOpen,
  onToggleDone,
  onCreate,
  onOpenDay,
}: {
  date: DateKey;
  today: DateKey;
  occurrences: Occurrence[];
  habitDays: CalendarHabitDay[];
  habits: Map<string, CalendarHabit>;
  busyKey: string | null;
  showItems?: boolean;
  onOpen: (occurrence: Occurrence) => void;
  onToggleDone: (occurrence: Occurrence) => void;
  onCreate: (date: DateKey) => void;
  onOpenDay?: (date: DateKey) => void;
}) {
  const label = date === today ? "Today" : formatLongDate(date);
  return (
    <section aria-labelledby={`day-${date}`} className="panel p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 id={`day-${date}`} className="type-h3 min-w-0 truncate">
          {label}
          {date === today ? <span className="sr-only">, {formatLongDate(date)}</span> : null}
        </h2>
        <div className="flex shrink-0 items-center gap-1">
          {onOpenDay ? (
            <button
              type="button"
              onClick={() => onOpenDay(date)}
              className="btn-icon"
              aria-label={`Open ${formatLongDate(date)} in the day view`}
              title="Open day"
            >
              <ArrowRight className="size-4" aria-hidden="true" />
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => onCreate(date)}
            className="btn btn-secondary min-h-11 gap-1.5 px-3 text-sm"
            aria-label={`Add to ${formatLongDate(date)}`}
          >
            <Plus className="size-4" aria-hidden="true" />
            Add
          </button>
        </div>
      </div>

      {showItems ? (
        occurrences.length > 0 ? (
          <ul className="mt-3 space-y-1.5" aria-label="Planned">
            {occurrences.map((occurrence) => (
              <ItemRow
                key={`${occurrence.item.id}-${occurrence.date}`}
                occurrence={occurrence}
                onOpen={onOpen}
                onToggleDone={onToggleDone}
                busy={busyKey === `${occurrence.item.id}-${occurrence.date}`}
              />
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">Nothing planned. Use Add to plan something.</p>
        )
      ) : null}

      {habitDays.length > 0 ? (
        <div className="mt-4">
          <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Habits · {habitDays.filter((h) => h.status === "done").length} of{" "}
            {habitDays.filter((h) => h.status !== "exempt").length} done
          </h3>
          <ul className="mt-2 space-y-1.5">
            {habitDays.map((day) => {
              const habit = habits.get(day.habitId);
              return habit ? <HabitDayRow key={day.habitId} habit={habit} status={day.status} /> : null;
            })}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
