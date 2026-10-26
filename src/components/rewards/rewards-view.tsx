"use client";

import { Gem, Gift, PartyPopper, Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { BuyRewardDialog } from "@/components/rewards/buy-reward-dialog";
import { DeleteRewardDialog } from "@/components/rewards/delete-reward-dialog";
import { PurchaseHistory } from "@/components/rewards/purchase-history";
import { RewardCard } from "@/components/rewards/reward-card";
import type { RewardDraft } from "@/components/rewards/reward-draft";
import { RewardForm } from "@/components/rewards/reward-form";
import { RewardIcon } from "@/components/rewards/reward-icons";
import { Modal } from "@/components/ui/modal";
import { toApiError } from "@/lib/api/habits-client";
import { updateRewardRequest } from "@/lib/api/rewards-client";
import type { PublicPurchase, PublicReward, PurchaseResult, RewardsData } from "@/types/reward";

type Filter = "all" | "favorites";

// Only ids are stored: dialogs always read the latest reward from the list.
type DialogState =
  | { type: "form"; rewardId: string | null; preset?: Partial<RewardDraft> } // null = new reward
  | { type: "buy"; rewardId: string }
  | { type: "delete"; rewardId: string }
  | null;

// First-run ideas: one tap opens the form with these filled in.
const IDEAS: { label: string; preset: Partial<RewardDraft> }[] = [
  { label: "Coffee out", preset: { name: "Coffee out", icon: "coffee", price: "30", category: "Treats" } },
  { label: "Movie night", preset: { name: "Movie night", icon: "movie", price: "80", category: "Fun" } },
  { label: "Gaming hour", preset: { name: "Gaming hour", icon: "game", price: "50", category: "Fun" } },
];

export function RewardsView({ initial }: { initial: RewardsData }) {
  const router = useRouter();
  const [rewards, setRewards] = useState<PublicReward[]>(initial.rewards);
  const [purchases, setPurchases] = useState<PublicPurchase[]>(initial.purchases);
  const [gems, setGems] = useState(initial.gems);
  const [filter, setFilter] = useState<Filter>("all");
  const [dialog, setDialog] = useState<DialogState>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const favorites = rewards.filter((reward) => reward.favorite);
  // Favorites first, then in the order they were created.
  const sorted = [...rewards].sort(
    (a, b) => Number(b.favorite) - Number(a.favorite) || a.createdAt.localeCompare(b.createdAt),
  );
  const visible = filter === "favorites" ? sorted.filter((reward) => reward.favorite) : sorted;
  const categories = [...new Set(rewards.map((reward) => reward.category))].sort();
  const dialogReward = dialog?.rewardId
    ? rewards.find((reward) => reward.id === dialog.rewardId)
    : undefined;
  const closeDialog = () => setDialog(null);

  function upsert(reward: PublicReward) {
    setRewards((current) =>
      current.some((item) => item.id === reward.id)
        ? current.map((item) => (item.id === reward.id ? reward : item))
        : [...current, reward],
    );
  }

  function handleSaved(reward: PublicReward) {
    const isNew = !rewards.some((item) => item.id === reward.id);
    upsert(reward);
    setDialog(null);
    setNotice(isNew ? `${reward.name} was added to your shop.` : `${reward.name} was updated.`);
  }

  function handleDeleted(reward: PublicReward) {
    setRewards((current) => current.filter((item) => item.id !== reward.id));
    setDialog(null);
    setNotice(`${reward.name} was deleted.`);
  }

  function handleBought(result: PurchaseResult) {
    setGems(result.gems);
    setPurchases((current) => [result.purchase, ...current]);
    setDialog(null);
    setNotice(`Enjoy your ${result.purchase.name}! You spent ${result.purchase.cost.toLocaleString("en-US")} gems.`);
  }

  async function handleToggleFavorite(reward: PublicReward) {
    setBusyId(reward.id);
    setError(null);
    try {
      upsert(await updateRewardRequest(reward.id, { favorite: !reward.favorite }));
    } catch (caught) {
      const apiError = toApiError(caught);
      if (apiError.code === "UNAUTHENTICATED") {
        router.push("/login");
        return;
      }
      setError(apiError.message);
    } finally {
      setBusyId(null);
    }
  }

  const addButton = (
    <button
      type="button"
      onClick={() => setDialog({ type: "form", rewardId: null })}
      className="inline-flex min-h-11 items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
    >
      <Plus className="size-5" aria-hidden="true" />
      Add reward
    </button>
  );

  const FILTERS: { value: Filter; label: string; count: number }[] = [
    { value: "all", label: "All", count: rewards.length },
    { value: "favorites", label: "Favorites", count: favorites.length },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Rewards</h1>
          <p className="mt-1 text-muted-foreground">Spend your gems on things you actually enjoy.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="inline-flex min-h-11 items-center gap-2 rounded-full bg-reward px-4 font-semibold text-reward-foreground">
            <Gem className="size-5" aria-hidden="true" />
            <span>
              {gems.toLocaleString("en-US")}
              <span className="sr-only"> gems</span>
            </span>
          </span>
          {rewards.length > 0 ? addButton : null}
        </div>
      </div>

      {error ? (
        <div
          role="alert"
          className="mt-6 flex items-start justify-between gap-3 rounded-md border border-destructive px-3 py-2 text-sm text-destructive"
        >
          <p className="py-1.5">{error}</p>
          <button
            type="button"
            onClick={() => setError(null)}
            aria-label="Dismiss"
            className="-my-1 -mr-2 inline-flex size-11 shrink-0 items-center justify-center rounded-md hover:bg-destructive/10"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
      ) : null}

      {notice ? (
        <div
          role="status"
          className="mt-6 flex items-start justify-between gap-3 rounded-md border border-success/50 bg-success-soft/40 px-3 py-2 text-sm"
        >
          <p className="flex items-center gap-2 py-1.5">
            <PartyPopper className="size-4 shrink-0" aria-hidden="true" />
            {notice}
          </p>
          <button
            type="button"
            onClick={() => setNotice(null)}
            aria-label="Dismiss"
            className="-my-1 -mr-2 inline-flex size-11 shrink-0 items-center justify-center rounded-md hover:bg-muted"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
      ) : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section aria-label="Your rewards">
          {rewards.length > 0 ? (
            <div role="group" aria-label="Show rewards" className="glass inline-flex rounded-full p-1">
              {FILTERS.map(({ value, label, count }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFilter(value)}
                  aria-pressed={filter === value}
                  className={`min-h-9 rounded-full px-4 text-sm font-medium transition-colors ${
                    filter === value
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {label} ({count})
                </button>
              ))}
            </div>
          ) : null}

          {rewards.length === 0 ? (
            <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed border-border px-6 py-14 text-center">
              <span
                aria-hidden="true"
                className="inline-flex size-14 items-center justify-center rounded-full bg-secondary text-secondary-foreground"
              >
                <Gift className="size-7" />
              </span>
              <div>
                <h2 className="text-lg font-semibold">Your shop is empty</h2>
                <p className="mt-1 max-w-sm text-muted-foreground">
                  Add the rewards you would love to earn, set a price in gems, and buy them when you
                  have saved enough.
                </p>
              </div>
              {addButton}
              <div className="w-full pt-2">
                <p className="text-sm text-muted-foreground">Or start from an idea</p>
                <ul className="mt-2 flex flex-wrap justify-center gap-2">
                  {IDEAS.map((idea) => (
                    <li key={idea.label}>
                      <button
                        type="button"
                        onClick={() => setDialog({ type: "form", rewardId: null, preset: idea.preset })}
                        className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border px-4 text-sm font-medium hover:bg-muted"
                      >
                        <RewardIcon name={idea.preset.icon ?? "gift"} className="size-4" />
                        {idea.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : visible.length === 0 ? (
            <p className="mt-4 rounded-lg border border-dashed border-border px-6 py-12 text-center text-muted-foreground">
              No favorites yet. Tap the star on a reward to pin it here.
            </p>
          ) : (
            <ul className="mt-4 grid gap-4 sm:grid-cols-2">
              {visible.map((reward) => (
                <RewardCard
                  key={reward.id}
                  reward={reward}
                  gems={gems}
                  busy={busyId === reward.id}
                  onBuy={() => setDialog({ type: "buy", rewardId: reward.id })}
                  onEdit={() => setDialog({ type: "form", rewardId: reward.id })}
                  onDelete={() => setDialog({ type: "delete", rewardId: reward.id })}
                  onToggleFavorite={() => handleToggleFavorite(reward)}
                />
              ))}
            </ul>
          )}
        </section>

        <aside>
          <PurchaseHistory purchases={purchases} timezone={initial.timezone} />
        </aside>
      </div>

      <Modal open={dialog !== null} onClose={closeDialog} size={dialog?.type === "delete" ? "sm" : "md"}>
        {dialog?.type === "form" ? (
          <RewardForm
            reward={dialogReward}
            preset={dialog.preset}
            categories={categories}
            onClose={closeDialog}
            onSaved={handleSaved}
          />
        ) : null}
        {dialog?.type === "buy" && dialogReward ? (
          <BuyRewardDialog reward={dialogReward} gems={gems} onClose={closeDialog} onBought={handleBought} />
        ) : null}
        {dialog?.type === "delete" && dialogReward ? (
          <DeleteRewardDialog reward={dialogReward} onClose={closeDialog} onDeleted={handleDeleted} />
        ) : null}
      </Modal>
    </div>
  );
}
