import { Gem, Pencil, Star, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { RewardIcon } from "@/components/rewards/reward-icons";
import type { PublicReward } from "@/types/reward";

interface RewardCardProps {
  reward: PublicReward;
  gems: number; // current balance
  busy: boolean; // a request for this reward is in flight
  onBuy: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggleFavorite: () => void;
}

// Icon-only button. Screen readers also hear which reward it belongs to.
function IconButton({
  label,
  rewardName,
  onClick,
  disabled,
  danger,
  pressed,
  children,
}: {
  label: string;
  rewardName: string;
  onClick: () => void;
  disabled: boolean;
  danger?: boolean;
  pressed?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={`${label}: ${rewardName}`}
      aria-pressed={pressed}
      className={`inline-flex size-11 items-center justify-center rounded-md text-muted-foreground transition-colors disabled:opacity-50 ${
        danger ? "hover:bg-destructive/10 hover:text-destructive" : "hover:bg-muted hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

export function RewardCard({ reward, gems, busy, onBuy, onEdit, onDelete, onToggleFavorite }: RewardCardProps) {
  const missing = reward.price - gems;
  const affordable = missing <= 0;
  const hintId = `reward-hint-${reward.id}`;

  return (
    <li className="flex flex-col rounded-lg border border-border bg-card p-4 text-card-foreground">
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground"
        >
          <RewardIcon name={reward.icon} className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold">{reward.name}</h3>
          <p className="truncate text-sm text-muted-foreground">{reward.category}</p>
        </div>
        <IconButton
          label={reward.favorite ? "Remove from favorites" : "Add to favorites"}
          rewardName={reward.name}
          onClick={onToggleFavorite}
          disabled={busy}
          pressed={reward.favorite}
        >
          <Star
            className={`size-5 ${reward.favorite ? "fill-current text-reward-foreground" : ""}`}
            aria-hidden="true"
          />
        </IconButton>
      </div>

      {reward.description ? (
        <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{reward.description}</p>
      ) : null}

      <div className="mt-4 flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-reward px-3 py-1 text-sm font-semibold text-reward-foreground">
          <Gem className="size-4" aria-hidden="true" />
          {reward.price.toLocaleString("en-US")}
          <span className="sr-only"> gems</span>
        </span>
        <div className="flex items-center">
          <IconButton label="Edit reward" rewardName={reward.name} onClick={onEdit} disabled={busy}>
            <Pencil className="size-4" aria-hidden="true" />
          </IconButton>
          <IconButton label="Delete reward" rewardName={reward.name} onClick={onDelete} disabled={busy} danger>
            <Trash2 className="size-4" aria-hidden="true" />
          </IconButton>
        </div>
      </div>

      <button
        type="button"
        onClick={onBuy}
        disabled={busy || !affordable}
        aria-describedby={affordable ? undefined : hintId}
        className="mt-3 min-h-11 w-full rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        Buy
      </button>
      {!affordable ? (
        <p id={hintId} className="mt-2 text-center text-xs text-muted-foreground">
          You need {missing.toLocaleString("en-US")} more {missing === 1 ? "gem" : "gems"}.
        </p>
      ) : null}
    </li>
  );
}
