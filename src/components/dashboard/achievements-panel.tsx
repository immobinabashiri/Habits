import { Lock, Trophy } from "lucide-react";
import Link from "next/link";
import { formatDateKey } from "@/lib/domain/dates";
import type { DashboardData } from "@/types/dashboard";

// The dashboard only needs what is next: up to three locked goals (or, once
// everything is unlocked, the latest three). The full list has its own page.
const SHOWN = 3;

export function AchievementsPanel({ achievements }: { achievements: DashboardData["achievements"] }) {
  const locked = achievements.items.filter((item) => !item.unlocked);
  const shown = locked.length > 0 ? locked.slice(0, SHOWN) : achievements.items.slice(-SHOWN);
  return (
    <section aria-labelledby="ach-title" className="panel p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 id="ach-title" className="type-h3">
          Achievements
        </h2>
        <span className="text-sm text-muted-foreground">
          {achievements.unlockedCount}/{achievements.total}
        </span>
      </div>
      <p className="text-sm text-muted-foreground">{locked.length > 0 ? "Up next" : "All unlocked"}</p>
      <ul className="mt-2 space-y-1">
        {shown.map((item) => (
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
      <Link
        href="/dashboard/achievements"
        className="mt-1 inline-flex min-h-11 items-center rounded-md text-sm font-semibold text-primary underline-offset-4 hover:underline"
      >
        See all {achievements.total}
      </Link>
    </section>
  );
}
