import { Check } from "lucide-react";
import { WEEKDAY_LONG, WEEKDAY_SHORT } from "@/lib/domain/weekdays";
import type { WeekDayInfo } from "@/types/dashboard";

function describe(day: WeekDayInfo): string {
  if (day.scheduled === 0) return "nothing scheduled";
  if (day.done === day.scheduled) return `all ${day.scheduled} done`;
  return `${day.done} of ${day.scheduled} done`;
}

export function WeekOverview({ week }: { week: WeekDayInfo[] }) {
  return (
    <section aria-labelledby="week-title" className="space-y-3">
      <h2 id="week-title" className="text-lg font-bold tracking-tight">
        Last 7 days
      </h2>
      <ul className="grid grid-cols-7 gap-2">
        {week.map((day) => {
          const complete = day.scheduled > 0 && day.done === day.scheduled;
          const partial = day.done > 0 && !complete;
          return (
            <li
              key={day.date}
              aria-label={`${WEEKDAY_LONG[day.weekday]}: ${describe(day)}`}
              className="flex flex-col items-center gap-1.5"
            >
              <span
                aria-hidden="true"
                className={`inline-flex size-10 items-center justify-center rounded-full border-2 text-xs font-semibold sm:size-11 ${
                  complete
                    ? "border-success bg-success-soft text-success"
                    : partial
                      ? "border-reward-foreground/40 bg-reward text-reward-foreground"
                      : day.scheduled === 0
                        ? "border-dashed border-border text-muted-foreground"
                        : "border-input text-muted-foreground"
                } ${day.isToday ? "ring-2 ring-ring ring-offset-2 ring-offset-background" : ""}`}
              >
                {complete ? (
                  <Check className="size-4" />
                ) : day.scheduled > 0 ? (
                  `${day.done}/${day.scheduled}`
                ) : (
                  ""
                )}
              </span>
              <span
                aria-hidden="true"
                className={`text-xs ${day.isToday ? "font-semibold text-foreground" : "text-muted-foreground"}`}
              >
                {WEEKDAY_SHORT[day.weekday]}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
