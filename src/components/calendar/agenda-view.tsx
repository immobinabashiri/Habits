"use client";

import { CalendarPlus, Search, X } from "lucide-react";
import { useState } from "react";
import { ItemRow } from "@/components/calendar/calendar-items";
import type { HabitSummary } from "@/components/calendar/month-view";
import { AGENDA_DAYS, formatLongDate } from "@/lib/domain/calendar";
import type { Occurrence } from "@/lib/domain/calendar";
import { addDays } from "@/lib/domain/dates";
import type { DateKey } from "@/types/common";

// A plain list of what is coming, grouped by day, for people who prefer lists.
export function AgendaView({
  from,
  today,
  occurrences,
  habitsByDate,
  busyKey,
  onOpen,
  onToggleDone,
  onCreate,
  onOpenDay,
}: {
  from: DateKey;
  today: DateKey;
  occurrences: Occurrence[];
  habitsByDate: Map<DateKey, HabitSummary>;
  busyKey: string | null;
  onOpen: (occurrence: Occurrence) => void;
  onToggleDone: (occurrence: Occurrence) => void;
  onCreate: (date: DateKey) => void;
  onOpenDay: (date: DateKey) => void;
}) {
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();
  const matches = needle
    ? occurrences.filter(
        (o) => o.item.title.toLowerCase().includes(needle) || o.item.notes.toLowerCase().includes(needle),
      )
    : occurrences;

  const days = Array.from({ length: AGENDA_DAYS }, (_, i) => addDays(from, i));
  const groups = days
    .map((date) => ({
      date,
      list: matches.filter((o) => o.date === date),
      habits: needle ? undefined : habitsByDate.get(date),
    }))
    .filter((group) => group.list.length > 0 || (group.habits && group.habits.total > 0));

  return (
    <div className="space-y-4">
      <div className="relative">
        <label htmlFor="agenda-search" className="sr-only">
          Search the next {AGENDA_DAYS} days
        </label>
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <input
          id="agenda-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Search titles and notes in these ${AGENDA_DAYS} days`}
          className="field block min-h-11 w-full pl-9"
          autoComplete="off"
        />
        {query ? (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="Clear search"
            className="btn-icon absolute top-1/2 right-0 -translate-y-1/2"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        ) : null}
      </div>

      {needle ? (
        <p role="status" className="text-sm text-muted-foreground">
          {matches.length === 0
            ? `Nothing matches “${query.trim()}”.`
            : `${matches.length} match${matches.length === 1 ? "" : "es"} for “${query.trim()}”.`}
        </p>
      ) : null}

      {groups.length === 0 && !needle ? (
        <div className="flex flex-col items-center gap-3 empty-box px-6 py-12 text-center">
          <span aria-hidden="true" className="inline-flex size-12 items-center justify-center icon-bubble">
            <CalendarPlus className="size-6" />
          </span>
          <div>
            <h2 className="type-h3">A clear month ahead</h2>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Nothing is planned for these {AGENDA_DAYS} days. Add a workout, a task or an important date.
            </p>
          </div>
          <button type="button" onClick={() => onCreate(from < today ? today : from)} className="btn btn-primary gap-2 px-4">
            <CalendarPlus className="size-4" aria-hidden="true" />
            Plan something
          </button>
        </div>
      ) : (
        <ol className="space-y-5">
          {groups.map(({ date, list, habits }) => (
            <li key={date} aria-labelledby={`agenda-${date}`}>
              <div className="flex items-baseline justify-between gap-2">
                <h2 id={`agenda-${date}`} className="text-sm font-semibold">
                  <button type="button" onClick={() => onOpenDay(date)} className="inline-flex min-h-11 items-center rounded-sm hover:underline">
                    {date === today ? "Today · " : date === addDays(today, 1) ? "Tomorrow · " : ""}
                    {formatLongDate(date)}
                  </button>
                </h2>
                {habits && habits.total > 0 ? (
                  <span className="cal-tone-habit text-xs tabular-nums text-muted-foreground">
                    <span className="mr-1 inline-block size-2 rounded-full bg-[var(--tone)] align-middle" aria-hidden="true" />
                    Habits {habits.done}/{habits.total}
                  </span>
                ) : null}
              </div>
              {list.length > 0 ? (
                <ul className="mt-2 space-y-1.5">
                  {list.map((occurrence) => (
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
                <p className="mt-1 text-sm text-muted-foreground">Only habits on this day.</p>
              )}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
