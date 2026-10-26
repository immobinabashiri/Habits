import { Lock, Trophy } from "lucide-react";
import Link from "next/link";
import { formatDateKey } from "@/lib/domain/dates";
import type { DashboardData } from "@/types/dashboard";

export function AchievementsPanel({ achievements }: { achievements: DashboardData["achievements"] }) {
  return (
    <section aria-labelledby="ach-title" className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 id="ach-title" className="font-bold tracking-tight">
          Achievements
        </h2>
        <span className="text-sm text-muted-foreground">
          {achievements.unlockedCount}/{achievements.total}
        </span>
      </div>
      <Link
        href="/dashboard/achievements"
        className="mt-1 inline-flex min-h-11 items-center text-sm font-semibold text-primary hover:underline"
      >
        See progress for all
      </Link>
      <ul className="mt-3 space-y-2">
        {achievements.items.map((item) => (
          <li
            key={item.key}
            className={`flex items-start gap-3 rounded-md p-2 ${item.unlocked ? "" : "opacity-60"}`}
          >
            <span
              aria-hidden="true"
              className={`mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-full ${
                item.unlocked ? "bg-reward text-reward-foreground" : "bg-muted text-muted-foreground"
              }`}
            >
              {item.unlocked ? <Trophy className="size-4" /> : <Lock className="size-4" />}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold">
                {item.title}
                <span className="sr-only">{item.unlocked ? " (unlocked)" : " (locked)"}</span>
              </p>
              <p className="text-xs text-muted-foreground">
                {item.unlocked && item.unlockedOn
                  ? `Unlocked ${formatDateKey(item.unlockedOn)}`
                  : `${item.description} +${item.xp} XP`}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
