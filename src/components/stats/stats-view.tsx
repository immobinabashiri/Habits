import { BarChart3, Clock, Flame, Gem, ListChecks, Target, Zap } from "lucide-react";
import Link from "next/link";
import { HabitIcon } from "@/components/habits/habit-icons";
import { BarChart } from "@/components/stats/bar-chart";
import type { ChartBar } from "@/components/stats/bar-chart";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatStrip } from "@/components/ui/stat-strip";
import { formatDateKey } from "@/lib/domain/dates";
import { bucketDays, formatMinutes, STATS_RANGES } from "@/lib/domain/stats";
import type { DayStats, HabitRangeStats } from "@/lib/domain/stats";
import { WEEKDAY_LONG, WEEKDAY_SHORT } from "@/lib/domain/weekdays";
import type { DateKey } from "@/types/common";
import type { StatsData } from "@/types/stats";

const shortDate = (key: DateKey) => {
  const [year, month, day] = key.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(year, month - 1, day)),
  );
};

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;


// 90 days is drawn as 13 weekly bars; shorter periods as one bar per day.
function toBars(daily: DayStats[], size: number, values: (day: DayStats) => number[]): ChartBar[] {
  return bucketDays(daily, size).map((bucket) => ({
    label: size === 1 ? String(Number(bucket.date.slice(8))) : shortDate(bucket.date),
    caption: bucket.date === bucket.to ? formatDateKey(bucket.date) : `${formatDateKey(bucket.date)} to ${formatDateKey(bucket.to)}`,
    values: values(bucket),
  }));
}

function rateText(percent: number | null, done: number, due: number) {
  return percent === null ? "Not due yet" : `${percent}% (${done}/${due})`;
}

function sortHabits(habits: HabitRangeStats[]): HabitRangeStats[] {
  return [...habits].sort(
    (a, b) =>
      (b.percent ?? -1) - (a.percent ?? -1) || b.done - a.done || a.name.localeCompare(b.name),
  );
}

export function StatsView({ data }: { data: StatsData }) {
  const { summary, range, lifetime } = data;
  const size = range === 90 ? 7 : 1;
  const habits = sortHabits(data.habits);
  const rated = habits.filter((habit) => habit.percent !== null && habit.due >= 3);
  const best = rated[0];
  const weakest = rated.length >= 2 ? rated[rated.length - 1] : undefined;
  const spanLabel = size === 1 ? "day" : "week";

  const doneBars = toBars(data.daily, size, (d) => [d.due, d.done]);
  const xpBars = toBars(data.daily, size, (d) => [d.xp]);
  const gemBars = toBars(data.daily, size, (d) => [d.earned, d.spent]);
  const totalOf = (bars: ChartBar[], index: number) => bars.reduce((n, bar) => n + bar.values[index], 0);

  return (
    <div className="page">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="type-h1">Stats</h1>
          <p className="mt-1 text-muted-foreground">
            {formatDateKey(data.from)} to {formatDateKey(data.today)}
          </p>
        </div>
        <nav aria-label="Time range">
          <ul className="segmented">
            {STATS_RANGES.map((value) => (
              <li key={value}>
                <Link
                  href={`/dashboard/stats?range=${value}`}
                  aria-current={range === value ? "page" : undefined}
                  className="segmented-item"
                >
                  {value} days
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      {data.habitCount === 0 ? (
        <div className="mt-8 flex flex-col items-center gap-4 empty-box px-6 py-16 text-center">
          <span aria-hidden="true" className="inline-flex size-14 items-center justify-center icon-bubble">
            <BarChart3 className="size-7" />
          </span>
          <div>
            <h2 className="type-h2">No numbers yet</h2>
            <p className="mt-1 max-w-sm text-muted-foreground">Create a habit and complete it for a few days. Your charts will appear here.</p>
          </div>
          <Link href="/dashboard/habits" className="btn btn-primary gap-2 px-4">
            <ListChecks className="size-5" aria-hidden="true" />
            Go to Habits
          </Link>
        </div>
      ) : (
        <>
          <StatStrip
            label="Summary of this period"
            columns={3}
            className="mt-6"
            items={[
              {
                icon: <Target />,
                label: "Completion rate",
                value: summary.percent === null ? "No data" : `${summary.percent}%`,
                hint: summary.due === 0 ? "Nothing was due in this period." : `${summary.done} of ${summary.due} habit-days done`,
              },
              {
                icon: <Flame />,
                label: "Perfect days",
                value: String(summary.perfectDays),
                hint: `${plural(summary.activeDays, "active day", "active days")} out of ${range}`,
              },
              { icon: <Zap />, label: "XP earned", value: summary.xp.toLocaleString("en-US") },
              {
                icon: <Gem />,
                label: "Gems earned / spent",
                value: `${summary.earned.toLocaleString("en-US")} / ${summary.spent.toLocaleString("en-US")}`,
              },
              { icon: <Clock />, label: "Time logged", value: formatMinutes(summary.minutes), hint: "From habits you track in minutes" },
              {
                icon: <BarChart3 />,
                label: "All time",
                value: `${lifetime.completions.toLocaleString("en-US")} done`,
                hint: lifetime.firstDay
                  ? `On ${plural(lifetime.activeDays, "day", "days")}, since ${formatDateKey(lifetime.firstDay)}`
                  : "Your first completion starts the count.",
              },
            ]}
          />

          {summary.done === 0 ? (
            <p className="mt-6 empty-box px-4 py-3 text-sm text-muted-foreground">
              No habits were completed in this period yet, so the charts below are empty.
            </p>
          ) : null}

          <div className="mt-6 space-y-6">
            <BarChart
              title={`Habits done per ${spanLabel}`}
              summary={`${totalOf(doneBars, 1)} of ${totalOf(doneBars, 0)} scheduled habits were done over ${range} days.`}
              bars={doneBars}
              series={[
                { name: "Scheduled", barClass: "bg-muted-foreground/30" },
                { name: "Done", barClass: "bg-primary" },
              ]}
              mode="overlay"
            />
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <BarChart
                title={`XP per ${spanLabel}`}
                summary={`${totalOf(xpBars, 0)} XP earned over ${range} days.`}
                bars={xpBars}
                series={[{ name: "XP", barClass: "bg-primary" }]}
                mode="grouped"
              />
              <BarChart
                title={`Gems per ${spanLabel}`}
                summary={`${totalOf(gemBars, 0)} gems earned and ${totalOf(gemBars, 1)} spent over ${range} days.`}
                bars={gemBars}
                series={[
                  { name: "Earned", barClass: "bg-success" },
                  { name: "Spent", barClass: "bg-warning" },
                ]}
                mode="grouped"
              />
            </div>
          </div>

          <div className="mt-6 grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
            <section aria-labelledby="weekday-title" className="panel p-4">
              <h2 id="weekday-title" className="type-h3">
                Best days of the week
              </h2>
              <ul className="mt-3 space-y-3">
                {data.weekdays.map((day) => (
                  <li key={day.weekday}>
                    <div className="flex items-baseline justify-between text-sm">
                      <span title={WEEKDAY_LONG[day.weekday]} className="font-medium">
                        {WEEKDAY_SHORT[day.weekday]}
                      </span>
                      <span className="text-muted-foreground">{rateText(day.percent, day.done, day.due)}</span>
                    </div>
                    <ProgressBar
                      value={(day.percent ?? 0) / 100}
                      label={`${WEEKDAY_LONG[day.weekday]} completion rate`}
                      className="mt-1"
                    />
                  </li>
                ))}
              </ul>
            </section>

            <section aria-labelledby="habits-title" className="panel p-4">
              <h2 id="habits-title" className="type-h3">
                Habit by habit
              </h2>
              {best ? (
                <p className="mt-1 text-sm text-muted-foreground">
                  Strongest: <strong className="text-foreground">{best.name}</strong> ({best.percent}%)
                  {weakest && weakest.habitId !== best.habitId ? (
                    <>
                      . Needs the most care: <strong className="text-foreground">{weakest.name}</strong> ({weakest.percent}%).
                    </>
                  ) : (
                    "."
                  )}
                </p>
              ) : null}
              <ul className="mt-3 divide-y divide-border">
                {habits.map((habit) => (
                  <li key={habit.habitId} className="py-3">
                    <div className="flex items-center gap-3">
                      <span aria-hidden="true" className="inline-flex size-9 shrink-0 items-center justify-center icon-tile">
                        <HabitIcon name={habit.icon} className="size-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">
                          {habit.name}
                          <span className="ml-2 text-xs font-normal text-muted-foreground">
                            {habit.kind === "bonus" ? "Bonus" : "Core"}
                          </span>
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {rateText(habit.percent, habit.done, habit.due)}
                          {habit.xp > 0 ? `, ${habit.xp} XP` : ""}
                        </p>
                      </div>
                    </div>
                    <ProgressBar
                      value={(habit.percent ?? 0) / 100}
                      label={`${habit.name} completion rate`}
                      className="mt-2"
                    />
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
