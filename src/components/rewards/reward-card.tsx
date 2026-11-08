import { Gem, Pencil, Star, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { ProgressBar } from "@/components/ui/progress-bar";
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
      className={`btn-icon ${danger ? "btn-icon-danger" : ""}`}
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
    <li className="surface flex min-w-0 flex-col p-4">
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className="inline-flex size-11 shrink-0 items-center justify-center icon-tile"
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

      {!affordable ? (
        <div className="mt-4">
          <ProgressBar value={gems / reward.price} label={`Gems saved toward ${reward.name}`} className="h-1.5" />
          <p id={hintId} className="mt-1.5 text-xs text-muted-foreground">
            {missing.toLocaleString("en-US")} more {missing === 1 ? "gem" : "gems"} to go
          </p>
        </div>
      ) : null}
      <button
        type="button"
        onClick={onBuy}
        disabled={busy || !affordable}
        aria-describedby={affordable ? undefined : hintId}
        className="btn btn-primary mt-3 w-full px-4"
      >
        Buy
      </button>
    </li>
  );
}
