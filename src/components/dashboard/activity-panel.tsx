import { Gem } from "lucide-react";
import type { ActivityItem } from "@/types/dashboard";

function formatWhen(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  }).format(new Date(iso));
}

export function ActivityPanel({ items, timezone }: { items: ActivityItem[]; timezone: string }) {
  return (
    <section aria-labelledby="activity-title" className="rounded-xl border border-border bg-card p-4">
      <h2 id="activity-title" className="font-bold tracking-tight">
        Recent gems
      </h2>
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">
          Complete a bonus habit or reach a streak milestone to earn your first gems.
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-border">
          {items.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{item.label}</p>
                <p className="text-xs text-muted-foreground">{formatWhen(item.createdAt, timezone)}</p>
              </div>
              <span
                className={`inline-flex shrink-0 items-center gap-1 text-sm font-semibold ${
                  item.amount > 0 ? "text-success" : "text-destructive"
                }`}
              >
                <Gem className="size-3.5" aria-hidden="true" />
                {item.amount > 0 ? "+" : ""}
                {item.amount}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
