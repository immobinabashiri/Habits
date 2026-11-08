"use client";

import { Check } from "lucide-react";
import { useLayoutEffect, useRef } from "react";
import type { CSSProperties, MouseEvent } from "react";
import { ItemChip, TimedBlock } from "@/components/calendar/calendar-items";
import type { DragProps } from "@/components/calendar/calendar-items";
import type { HabitSummary } from "@/components/calendar/month-view";
import type { DropTarget } from "@/components/calendar/use-calendar-drag";
import { dayOfMonth, formatFullDate, formatHour, formatTime, layoutTimed, minutesToTime } from "@/lib/domain/calendar";
import type { Occurrence } from "@/lib/domain/calendar";
import { weekdayOf } from "@/lib/domain/dates";
import { WEEKDAY_SHORT } from "@/lib/domain/weekdays";
import type { DateKey } from "@/types/common";

const HOURS = Array.from({ length: 24 }, (_, hour) => hour);
const MAX_ALL_DAY = 3;
const FIRST_HOUR = 7; // where the grid opens when today is not on screen

const pct = (minutes: number) => `${(minutes / 1440) * 100}%`;

export function TimeGrid({
  days,
  today,
  now,
  selected,
  byDate,
  habitsByDate,
  dropTarget,
  dragMinutes,
  dragProps,
  onOpen,
  onOpenDay,
  onCreateAt,
}: {
  days: DateKey[];
  today: DateKey;
  now: { date: DateKey; minutes: number } | null;
  selected: DateKey; // the one day shown on phones in the week view
  byDate: Map<DateKey, Occurrence[]>;
  habitsByDate: Map<DateKey, HabitSummary>;
  dropTarget: DropTarget | null;
  dragMinutes: number; // length of the item being dragged, for the drop preview
  dragProps: (occurrence: Occurrence) => DragProps;
  onOpen: (occurrence: Occurrence) => void;
  onOpenDay: (date: DateKey) => void;
  onCreateAt: (date: DateKey, minutes: number | null) => void;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const single = days.length === 1;
  const showsToday = days.includes(today);
  const nowMinutes = now && now.date === today ? now.minutes : null;
  const mobileHidden = (date: DateKey) => (!single && date !== selected ? "max-md:hidden" : "");

  // Open at the current time (today) or at the start of a normal day.
  useLayoutEffect(() => {
    const box = scroller.current;
    const column = box?.querySelector<HTMLElement>(".cal-hours");
    if (!box || !column) return;
    const hour = column.clientHeight / 24;
    const startMinutes = showsToday && nowMinutes !== null ? Math.max(0, nowMinutes - 90) : FIRST_HOUR * 60;
    box.scrollTop = (startMinutes / 60) * hour;
    // Only when the days change, not every minute.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days[0], days.length]);

  function handleColumnClick(event: MouseEvent<HTMLDivElement>, date: DateKey) {
    if (event.target !== event.currentTarget) return; // a click on an item
    const rect = event.currentTarget.getBoundingClientRect();
    const minutes = Math.floor((((event.clientY - rect.top) / rect.height) * 1440) / 30) * 30;
    onCreateAt(date, Math.max(0, Math.min(1410, minutes)));
  }

  return (
    <div className="panel overflow-hidden p-0">
      <div
        ref={scroller}
        data-drop-scroll
        className="max-h-[min(72dvh,46rem)] overflow-y-auto overscroll-contain"
        style={{ "--cal-cols": days.length } as CSSProperties}
      >
        {/* Day headers and the all-day row stay in view while the hours scroll. */}
        <div className="sticky top-0 z-[4] border-b border-border bg-card">
          <div className="cal-cols">
            <div aria-hidden="true" />
            {days.map((date) => {
              const habits = habitsByDate.get(date);
              return (
                <div key={date} className={`min-w-0 px-1 py-1.5 text-center ${mobileHidden(date)}`}>
                  <button
                    type="button"
                    onClick={() => onOpenDay(date)}
                    aria-label={`${formatFullDate(date)}${date === today ? ", today" : ""}. Open the day`}
                    className="inline-flex flex-col items-center rounded-md px-2 py-0.5 hover:bg-muted"
                  >
                    <span className="text-xs font-semibold text-muted-foreground uppercase">
                      {WEEKDAY_SHORT[weekdayOf(date)]}
                    </span>
                    <span className="cal-daynum" data-today={date === today ? "" : undefined}>
                      {dayOfMonth(date)}
                    </span>
                  </button>
                  {habits && habits.total > 0 ? (
                    <p
                      className="cal-tone-habit mt-0.5 flex items-center justify-center gap-1 text-[0.6875rem] tabular-nums text-muted-foreground"
                      title={`Habits: ${habits.done} of ${habits.total} done`}
                    >
                      <Check className="size-3 text-[var(--tone)]" aria-hidden="true" />
                      <span>
                        {habits.done}/{habits.total}
                        <span className="sr-only"> habits done</span>
                      </span>
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>

          <div className="cal-cols border-t border-border">
            <div className="flex items-start justify-end px-1.5 py-1.5 text-[0.6875rem] text-muted-foreground">All day</div>
            {days.map((date) => {
              const list = (byDate.get(date) ?? []).filter((o) => o.item.allDay || !o.item.startTime);
              const extra = list.length - MAX_ALL_DAY;
              return (
                <div
                  key={date}
                  data-drop-date={date}
                  data-drop-active={dropTarget?.date === date && dropTarget.minutes === null ? "" : undefined}
                  className={`cal-cell min-h-9 gap-0.5 p-1 ${mobileHidden(date)}`}
                  onDoubleClick={(event) => {
                    if (event.target === event.currentTarget) onCreateAt(date, null);
                  }}
                >
                  {list.slice(0, MAX_ALL_DAY).map((occurrence) => (
                    <ItemChip
                      key={`${occurrence.item.id}-${occurrence.date}`}
                      occurrence={occurrence}
                      onOpen={onOpen}
                      drag={dragProps(occurrence)}
                      showTime={false}
                    />
                  ))}
                  {extra > 0 ? (
                    <button
                      type="button"
                      onClick={() => onOpenDay(date)}
                      className="rounded-sm px-1.5 text-left text-xs font-medium text-muted-foreground hover:text-foreground"
                    >
                      +{extra} more
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>

        <div className="cal-cols">
          <div className="relative" aria-hidden="true">
            {HOURS.slice(1).map((hour) => (
              <span key={hour} className="cal-hour-label" style={{ top: pct(hour * 60) }}>
                {formatHour(hour)}
              </span>
            ))}
          </div>
          {days.map((date) => {
            const blocks = layoutTimed(byDate.get(date) ?? []);
            const preview = dropTarget?.date === date && dropTarget.minutes !== null ? dropTarget.minutes : null;
            return (
              <div
                key={date}
                data-drop-date={date}
                data-drop-timed
                data-today={date === today ? "" : undefined}
                data-drop-active={preview !== null ? "" : undefined}
                onClick={(event) => handleColumnClick(event, date)}
                className={`cal-hours ${mobileHidden(date)}`}
                aria-label={`${formatFullDate(date)} schedule`}
                role="group"
              >
                {blocks.map((block) => (
                  <TimedBlock
                    key={`${block.occurrence.item.id}-${block.occurrence.date}`}
                    occurrence={block.occurrence}
                    minutes={block.end - block.start}
                    onOpen={onOpen}
                    drag={dragProps(block.occurrence)}
                    style={{
                      top: pct(block.start),
                      height: pct(block.end - block.start),
                      left: `calc(${(block.column / block.columns) * 100}% + 2px)`,
                      width: `calc(${100 / block.columns}% - 4px)`,
                    }}
                  />
                ))}
                {preview !== null ? (
                  <div
                    className="cal-drop-preview flex items-start px-1.5 py-0.5 text-[0.6875rem] font-semibold text-primary"
                    style={{ top: pct(preview), height: pct(Math.max(15, dragMinutes)) }}
                  >
                    {formatTime(minutesToTime(preview))}
                  </div>
                ) : null}
                {date === today && nowMinutes !== null ? (
                  <div className="cal-now" style={{ top: pct(nowMinutes) }}>
                    <span className="sr-only">Now, {formatTime(minutesToTime(nowMinutes))}</span>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
