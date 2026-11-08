"use client";

import type { KeyboardEvent } from "react";
import { ItemChip } from "@/components/calendar/calendar-items";
import type { DragProps } from "@/components/calendar/calendar-items";
import { kindOf } from "@/components/calendar/calendar-meta";
import type { DropTarget } from "@/components/calendar/use-calendar-drag";
import { dayOfMonth, formatFullDate, monthStart, weekStartOf } from "@/lib/domain/calendar";
import type { Occurrence } from "@/lib/domain/calendar";
import { addDays } from "@/lib/domain/dates";
import { WEEK_ORDER, WEEKDAY_LONG, WEEKDAY_SHORT } from "@/lib/domain/weekdays";
import type { DateKey } from "@/types/common";

export interface HabitSummary {
  done: number;
  total: number;
}

const MAX_CHIPS = 3;

export function MonthView({
  anchor,
  days,
  today,
  selected,
  byDate,
  habitsByDate,
  dropTarget,
  dragProps,
  onSelect,
  onOpen,
  onCreate,
}: {
  anchor: DateKey;
  days: DateKey[];
  today: DateKey;
  selected: DateKey;
  byDate: Map<DateKey, Occurrence[]>;
  habitsByDate: Map<DateKey, HabitSummary>;
  dropTarget: DropTarget | null;
  dragProps: (occurrence: Occurrence) => DragProps;
  onSelect: (date: DateKey) => void;
  onOpen: (occurrence: Occurrence) => void;
  onCreate: (date: DateKey) => void;
}) {
  const month = monthStart(anchor).slice(0, 7);

  // Arrow keys move between days (one tab stop for the whole grid).
  function handleKey(event: KeyboardEvent<HTMLButtonElement>, date: DateKey) {
    const step: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    let next: DateKey | null = null;
    if (event.key in step) next = addDays(date, step[event.key]);
    if (event.key === "Home") next = weekStartOf(date);
    if (event.key === "End") next = addDays(weekStartOf(date), 6);
    if (!next || next < days[0] || next > days[days.length - 1]) return;
    event.preventDefault();
    onSelect(next);
    const target = next;
    requestAnimationFrame(() => document.querySelector<HTMLElement>(`[data-day-button="${target}"]`)?.focus());
  }

  return (
    <div className="panel overflow-hidden p-0">
      <div className="cal-month border-b border-border" aria-hidden="true">
        {WEEK_ORDER.map((weekday) => (
          <div key={weekday} className="px-1 py-2 text-center text-xs font-semibold text-muted-foreground uppercase">
            <span className="sm:hidden">{WEEKDAY_SHORT[weekday].slice(0, 1)}</span>
            <span className="hidden sm:inline">{WEEKDAY_SHORT[weekday]}</span>
          </div>
        ))}
      </div>
      <div className="cal-month" role="group" aria-label="Days of the month. Use the arrow keys to move between days.">
        {days.map((date) => {
          const list = byDate.get(date) ?? [];
          const habits = habitsByDate.get(date);
          const outside = !date.startsWith(month);
          const isToday = date === today;
          const isSelected = date === selected;
          const hidden = list.length - MAX_CHIPS;
          const label = [
            formatFullDate(date),
            isToday ? "today" : null,
            list.length ? `${list.length} item${list.length === 1 ? "" : "s"}` : "nothing planned",
            habits?.total ? `habits ${habits.done} of ${habits.total} done` : null,
          ]
            .filter(Boolean)
            .join(", ");
          return (
            <div
              key={date}
              data-drop-date={date}
              data-outside={outside ? "" : undefined}
              data-selected={isSelected ? "" : undefined}
              data-today={isToday ? "" : undefined}
              data-drop-active={dropTarget?.date === date ? "" : undefined}
              className="cal-cell"
            >
              <div className="flex items-center justify-between gap-1">
                <button
                  type="button"
                  data-day-button={date}
                  tabIndex={isSelected ? 0 : -1}
                  aria-pressed={isSelected}
                  aria-label={label}
                  onClick={() => onSelect(date)}
                  onDoubleClick={() => onCreate(date)}
                  onKeyDown={(event) => handleKey(event, date)}
                  data-today={isToday ? "" : undefined}
                  className="cal-daynum cal-cell-target -m-0.5"
                >
                  {dayOfMonth(date)}
                </button>
                {habits && habits.total > 0 ? (
                  <span className="hidden text-[0.6875rem] tabular-nums text-muted-foreground md:inline" aria-hidden="true">
                    {habits.done}/{habits.total}
                  </span>
                ) : null}
              </div>
              {habits && habits.total > 0 ? (
                <div className="cal-habit-meter" aria-hidden="true" title={`Habits: ${habits.done} of ${habits.total} done`}>
                  <span style={{ width: `${(habits.done / habits.total) * 100}%` }} />
                </div>
              ) : null}

              {/* Phones: a dot per item (max 4); the day panel below lists them. */}
              {list.length > 0 ? (
                <div className="flex flex-wrap gap-0.5 md:hidden" aria-hidden="true">
                  {list.slice(0, 4).map((occurrence) => (
                    <span
                      key={`${occurrence.item.id}-${occurrence.date}`}
                      className={`cal-dot cal-tone-${kindOf(occurrence.item)}`}
                    />
                  ))}
                </div>
              ) : null}

              <ul className="hidden min-w-0 flex-col gap-0.5 md:flex">
                {list.slice(0, MAX_CHIPS).map((occurrence) => (
                  <li key={`${occurrence.item.id}-${occurrence.date}`} className="min-w-0">
                    <ItemChip occurrence={occurrence} onOpen={onOpen} drag={dragProps(occurrence)} />
                  </li>
                ))}
                {hidden > 0 ? (
                  <li>
                    <button
                      type="button"
                      onClick={() => onSelect(date)}
                      className="rounded-sm px-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
                      aria-label={`${hidden} more on ${formatFullDate(date)}`}
                    >
                      +{hidden} more
                    </button>
                  </li>
                ) : null}
              </ul>
            </div>
          );
        })}
      </div>
      <p className="sr-only">Weeks start on {WEEKDAY_LONG[WEEK_ORDER[0]]}.</p>
    </div>
  );
}
