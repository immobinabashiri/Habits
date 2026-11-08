import { CheckCircle2, Flame, Gem, Snowflake, Sparkles, Trophy } from "lucide-react";
import { StatStrip } from "@/components/ui/stat-strip";
import type { DashboardData } from "@/types/dashboard";

export function LevelCard({ data }: { data: DashboardData }) {
  const { level, wallet } = data;
  return (
    <section
      aria-label="Level and gems"
      className="glass flex flex-col gap-5 rounded-xl p-5 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex min-w-0 flex-1 items-center gap-4">
        <span
          aria-hidden="true"
          className="inline-flex size-14 shrink-0 items-center justify-center rounded-full btn-primary type-stat"
        >
          {level.level}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">Level {level.level}</p>
          <div
            role="progressbar"
            aria-label="Progress to the next level"
            aria-valuemin={0}
            aria-valuemax={level.needed}
            aria-valuenow={level.into}
            className="progress-track mt-2 h-2.5 w-full"
          >
            <div
              className="progress-fill"
              style={{ width: `${level.percent}%` }}
            />
          </div>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {level.into} / {level.needed} XP to level {level.level + 1}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <span className="inline-flex min-h-11 items-center gap-2 rounded-full bg-reward px-4 font-semibold text-reward-foreground">
          <Gem className="size-5" aria-hidden="true" />
          <span>
            {wallet.gems.toLocaleString("en-US")}
            <span className="sr-only"> gems</span>
          </span>
        </span>
        <span
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border bg-field px-4 text-sm font-medium"
          title="Streak Freezes you own"
        >
          <Snowflake className="size-4 text-primary" aria-hidden="true" />
          {wallet.streakFreezes}
          <span className="sr-only"> Streak Freezes</span>
        </span>
      </div>
    </section>
  );
}

export function StatCards({ data }: { data: DashboardData }) {
  const { stats, wallet } = data;
  const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);
  return (
    <StatStrip
      label="Summary"
      items={[
        {
          icon: <CheckCircle2 />,
          label: "Done today",
          value: `${stats.todayDone}/${stats.todayTotal}`,
          hint: stats.todayTotal === 0 ? "Nothing scheduled" : undefined,
        },
        {
          icon: <Flame />,
          label: "Best streak",
          value: `${stats.bestStreak} ${plural(stats.bestStreak, "day", "days")}`,
          hint: `${stats.activeStreaks} active ${plural(stats.activeStreaks, "streak", "streaks")}`,
        },
        {
          icon: <Gem />,
          label: "Gems earned",
          value: wallet.totalGemsEarned.toLocaleString("en-US"),
          hint: `${wallet.totalGemsSpent.toLocaleString("en-US")} spent`,
        },
        {
          icon: <Trophy />,
          label: "Completions",
          value: stats.totalCompletions.toLocaleString("en-US"),
          hint: `${wallet.xp.toLocaleString("en-US")} XP total`,
        },
      ]}
    />
  );
}

export function LevelUpBanner({ level, onDismiss }: { level: number; onDismiss: () => void }) {
  return (
    <div
      role="status"
      className="announce-in flex items-center justify-between gap-3 rounded-xl border border-border bg-reward px-4 py-3 text-reward-foreground"
    >
      <p className="flex items-center gap-2 font-semibold">
        <Sparkles className="size-5" aria-hidden="true" />
        You reached level {level}!
      </p>
      <button
        type="button"
        onClick={onDismiss}
        className="btn shrink-0 px-4 hover:bg-foreground/10"
      >
        Nice
      </button>
    </div>
  );
}
