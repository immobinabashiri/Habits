import { Flame, Lock, Sparkles, Trophy } from "lucide-react";
import Link from "next/link";
import { ProgressBar } from "@/components/ui/progress-bar";
import { formatDateKey } from "@/lib/domain/dates";
import type { AchievementCard, AchievementsData } from "@/types/achievement";

export type AchievementFilter = "all" | "unlocked" | "locked";

export const ACHIEVEMENT_FILTERS: { value: AchievementFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "unlocked", label: "Unlocked" },
  { value: "locked", label: "Locked" },
];

// Anything that is not a known filter falls back to "all".
export function parseFilter(value: string | string[] | undefined): AchievementFilter {
  const text = Array.isArray(value) ? value[0] : value;
  return ACHIEVEMENT_FILTERS.find((filter) => filter.value === text)?.value ?? "all";
}

function Card({ item }: { item: AchievementCard }) {
  const left = item.progress ? item.progress.target - item.progress.current : 0;
  return (
    <li
      className={`flex gap-4 rounded-xl border p-4 ${
        item.unlocked ? "border-success/50 bg-success-soft/30" : "border-border bg-card"
      }`}
    >
      <span
        aria-hidden="true"
        className={`inline-flex size-12 shrink-0 items-center justify-center rounded-full ${
          item.unlocked ? "bg-reward text-reward-foreground" : "bg-muted text-muted-foreground"
        }`}
      >
        {item.unlocked ? <Trophy className="size-6" /> : <Lock className="size-5" />}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3">
          <h3 className="font-semibold">
            {item.title}
            <span className="sr-only">{item.unlocked ? " (unlocked)" : " (locked)"}</span>
          </h3>
          <span className="text-sm font-medium text-muted-foreground">+{item.xp} XP</span>
        </div>
        <p className="mt-0.5 text-sm text-muted-foreground">{item.description}</p>

        {item.unlocked && item.unlockedOn ? (
          <p className="mt-2 text-sm font-medium">Unlocked {formatDateKey(item.unlockedOn)}</p>
        ) : null}

        {item.progress ? (
          <div className="mt-3">
            <ProgressBar
              value={item.progress.current / item.progress.target}
              label={`Progress toward ${item.title}`}
            />
            <p className="mt-1.5 text-sm text-muted-foreground">
              {item.progress.current} / {item.progress.target} {item.progress.unit}
              {left > 0 ? `, ${left} to go` : ""}
            </p>
          </div>
        ) : null}
        {item.hint ? <p className="mt-2 text-sm text-muted-foreground">{item.hint}</p> : null}
      </div>
    </li>
  );
}

export function AchievementsView({ data, filter }: { data: AchievementsData; filter: AchievementFilter }) {
  const counts: Record<AchievementFilter, number> = {
    all: data.total,
    unlocked: data.unlockedCount,
    locked: data.total - data.unlockedCount,
  };
  const shown = data.items.filter(
    (item) => filter === "all" || (filter === "unlocked" ? item.unlocked : !item.unlocked),
  );
  const complete = data.unlockedCount === data.total;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold tracking-tight">Achievements</h1>
      <p className="mt-1 text-muted-foreground">Milestones you unlock by showing up. Each one pays XP once.</p>

      <section aria-label="Your progress" className="glass mt-6 flex flex-col gap-4 rounded-xl p-5 sm:flex-row sm:items-center">
        <span
          aria-hidden="true"
          className="inline-flex size-14 shrink-0 items-center justify-center rounded-full bg-reward text-reward-foreground"
        >
          <Trophy className="size-7" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-lg font-bold">
            {data.unlockedCount} of {data.total} unlocked
          </p>
          <ProgressBar value={data.unlockedCount / data.total} label="Achievements unlocked" className="mt-2" />
          <p className="mt-1.5 text-sm text-muted-foreground">
            {complete
              ? "You unlocked everything. Impressive."
              : `${data.xpEarned} XP earned from achievements so far.`}
          </p>
        </div>
        <dl className="grid shrink-0 grid-cols-2 gap-x-6 text-sm sm:text-right">
          <div>
            <dt className="text-muted-foreground">Level</dt>
            <dd className="text-xl font-bold">{data.level}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Streak bonuses</dt>
            <dd className="text-xl font-bold">{data.medalCount}</dd>
          </div>
        </dl>
      </section>

      <nav aria-label="Show achievements" className="mt-6">
        <ul className="glass inline-flex rounded-full p-1">
          {ACHIEVEMENT_FILTERS.map(({ value, label }) => (
            <li key={value}>
              <Link
                href={value === "all" ? "/dashboard/achievements" : `/dashboard/achievements?show=${value}`}
                aria-current={filter === value ? "page" : undefined}
                className={`inline-flex min-h-9 items-center rounded-full px-4 text-sm font-medium transition-colors ${
                  filter === value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {label} ({counts[value]})
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {shown.length === 0 ? (
        <p className="mt-4 rounded-lg border border-dashed border-border px-6 py-12 text-center text-muted-foreground">
          {filter === "unlocked" ? "Nothing unlocked yet. Complete a habit to get your first one." : "Nothing left to unlock."}
        </p>
      ) : (
        <ul className="mt-4 grid gap-4 md:grid-cols-2">
          {shown.map((item) => (
            <Card key={item.key} item={item} />
          ))}
        </ul>
      )}

      <section aria-labelledby="medals-title" className="mt-10">
        <h2 id="medals-title" className="flex items-center gap-2 text-lg font-bold tracking-tight">
          <Flame className="size-5 text-primary" aria-hidden="true" />
          Streak bonuses earned
        </h2>
        {data.medals.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Reach a streak length you set in Settings and the bonus shows up here.
          </p>
        ) : (
          <>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {data.medals.map((medal) => (
                <li key={medal.id} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3">
                  <span className="flex min-w-0 items-center gap-2 text-sm font-medium">
                    <Sparkles className="size-4 shrink-0 text-reward-foreground" aria-hidden="true" />
                    <span className="truncate">{medal.title}</span>
                  </span>
                  <span className="shrink-0 text-sm text-muted-foreground">{formatDateKey(medal.date)}</span>
                </li>
              ))}
            </ul>
            {data.medalCount > data.medals.length ? (
              <p className="mt-2 text-sm text-muted-foreground">
                Showing the latest {data.medals.length} of {data.medalCount}.
              </p>
            ) : null}
          </>
        )}
      </section>
    </div>
  );
}
