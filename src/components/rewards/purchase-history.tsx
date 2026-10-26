import { Gem } from "lucide-react";
import { RewardIcon } from "@/components/rewards/reward-icons";
import type { PublicPurchase } from "@/types/reward";

function formatWhen(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone }).format(new Date(iso));
}

export function PurchaseHistory({ purchases, timezone }: { purchases: PublicPurchase[]; timezone: string }) {
  return (
    <section aria-labelledby="history-title" className="rounded-xl border border-border bg-card p-4">
      <h2 id="history-title" className="font-bold tracking-tight">
        Purchase history
      </h2>
      {purchases.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">
          What you buy with your gems will be listed here.
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-border">
          {purchases.map((purchase) => (
            <li key={purchase.id} className="flex items-start gap-3 py-2.5">
              <span
                aria-hidden="true"
                className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground"
              >
                <RewardIcon name={purchase.icon} className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {purchase.name}
                  {purchase.quantity > 1 ? ` ×${purchase.quantity}` : ""}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {formatWhen(purchase.purchasedAt, timezone)}
                  {purchase.note ? `, ${purchase.note}` : ""}
                </p>
              </div>
              <span className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-destructive">
                <Gem className="size-3.5" aria-hidden="true" />-{purchase.cost.toLocaleString("en-US")}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
