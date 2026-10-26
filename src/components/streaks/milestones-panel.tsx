import { Gem, Settings } from "lucide-react";
import Link from "next/link";
import type { StreakMilestone } from "@/types/user";

export function MilestonesPanel({ milestones }: { milestones: StreakMilestone[] }) {
  return (
    <section aria-labelledby="bonuses-title" className="rounded-xl border border-border bg-card p-4">
      <h2 id="bonuses-title" className="font-bold tracking-tight">
        Streak bonuses
      </h2>
      {milestones.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">You have no streak bonuses.</p>
      ) : (
        <ul className="mt-3 divide-y divide-border">
          {milestones.map((milestone) => (
            <li key={milestone.days} className="flex items-center justify-between py-2 text-sm">
              <span>{milestone.days} days</span>
              <span className="inline-flex items-center gap-1 font-semibold">
                <Gem className="size-3.5" aria-hidden="true" />+{milestone.gems}
              </span>
            </li>
          ))}
        </ul>
      )}
      <Link
        href="/dashboard/settings"
        className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary hover:underline"
      >
        <Settings className="size-4" aria-hidden="true" />
        Change in Settings
      </Link>
    </section>
  );
}
