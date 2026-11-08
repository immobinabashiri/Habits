import { Check, Minus, Snowflake, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { weekdayOf } from "@/lib/domain/dates";
import { formatDateKey } from "@/lib/domain/dates";
import type { DayStatus } from "@/lib/domain/streaks";
import { WEEKDAY_LONG, WEEKDAY_SHORT, WEEK_ORDER } from "@/lib/domain/weekdays";
import type { DateKey } from "@/types/common";

// Colour is never the only signal: every state has its own icon or outline.
export const STATUS_STYLE: Record<DayStatus, { label: string; box: string; icon: LucideIcon | null }> = {
  done: { label: "Done", box: "bg-success text-card", icon: Check },
  missed: { label: "Missed", box: "border-2 border-destructive/70 text-destructive", icon: X },
  frozen: { label: "Frozen", box: "bg-secondary text-secondary-foreground", icon: Snowflake },
  exempt: { label: "Skip day", box: "border border-dashed border-muted-foreground/60 text-muted-foreground", icon: Minus },
  open: { label: "Today", box: "border-2 border-primary", icon: null },
  off: { label: "Not scheduled", box: "bg-muted/60", icon: null },
};

export function StatusCell({ status }: { status: DayStatus }) {
  const { box, icon: Icon } = STATUS_STYLE[status];
  return (
    <span className={`inline-flex size-6 items-center justify-center rounded-md ${box}`}>
      {Icon ? <Icon className="size-3.5" aria-hidden="true" /> : null}
    </span>
  );
}

// One row per week, columns in the app's week order (Monday first).
export function HistoryGrid({
  days,
  history,
  summary,
}: {
  days: DateKey[];
  history: DayStatus[];
  summary: string; // the text alternative for the whole calendar
}) {
  const offset = WEEK_ORDER.indexOf(weekdayOf(days[0]));
  const cells: (number | null)[] = [...Array<null>(offset).fill(null), ...days.map((_, index) => index)];
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks = Array.from({ length: cells.length / 7 }, (_, row) => cells.slice(row * 7, row * 7 + 7));

  return (
    <div role="img" aria-label={summary} className="inline-block">
      <div aria-hidden="true" className="grid grid-cols-7 gap-1 pb-1 text-center text-[10px] font-medium text-muted-foreground">
        {WEEK_ORDER.map((weekday) => (
          <span key={weekday} className="w-6" title={WEEKDAY_LONG[weekday]}>
            {WEEKDAY_SHORT[weekday][0]}
          </span>
        ))}
      </div>
      <div aria-hidden="true" className="space-y-1">
        {weeks.map((week, row) => (
          <div key={row} className="grid grid-cols-7 gap-1">
            {week.map((index, column) =>
              index === null ? (
                <span key={column} className="size-6" />
              ) : (
                <span key={column} title={`${formatDateKey(days[index])}: ${STATUS_STYLE[history[index]].label}`}>
                  <StatusCell status={history[index]} />
                </span>
              ),
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function HistoryLegend() {
  const order: DayStatus[] = ["done", "missed", "frozen", "exempt", "open", "off"];
  return (
    <ul aria-label="What the calendar squares mean" className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
      {order.map((status) => (
        <li key={status} className="inline-flex items-center gap-1.5">
          <span className="scale-75">
            <StatusCell status={status} />
          </span>
          {STATUS_STYLE[status].label}
        </li>
      ))}
    </ul>
  );
}
