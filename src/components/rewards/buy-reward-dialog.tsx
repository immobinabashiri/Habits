"use client";

import { Gem } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";
import { RewardIcon } from "@/components/rewards/reward-icons";
import { toApiError } from "@/lib/api/habits-client";
import { purchaseRewardRequest } from "@/lib/api/rewards-client";
import { LIMITS } from "@/lib/domain/defaults";
import type { PublicReward, PurchaseResult } from "@/types/reward";

interface BuyRewardDialogProps {
  reward: PublicReward;
  gems: number; // balance when the dialog opened
  onClose: () => void;
  onBought: (result: PurchaseResult) => void;
}

export function BuyRewardDialog({ reward, gems, onClose, onBought }: BuyRewardDialogProps) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      onBought(await purchaseRewardRequest(reward.id, note.trim() || undefined));
    } catch (caught) {
      const apiError = toApiError(caught);
      if (apiError.code === "UNAUTHENTICATED") {
        router.push("/login");
        return;
      }
      setError(apiError.fields.note ?? apiError.message);
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4 p-5">
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="inline-flex size-12 shrink-0 items-center justify-center icon-tile"
        >
          <RewardIcon name={reward.icon} className="size-6" />
        </span>
        <h2 id="modal-title" className="min-w-0 type-h2">
          Buy “{reward.name}”?
        </h2>
      </div>

      <dl className="divide-y divide-border rounded-lg border border-border text-sm">
        <div className="flex items-center justify-between px-3 py-2.5">
          <dt className="text-muted-foreground">Price</dt>
          <dd className="inline-flex items-center gap-1 font-semibold">
            <Gem className="size-4" aria-hidden="true" />
            {reward.price.toLocaleString("en-US")}
          </dd>
        </div>
        <div className="flex items-center justify-between px-3 py-2.5">
          <dt className="text-muted-foreground">You will have left</dt>
          <dd className="inline-flex items-center gap-1 font-semibold">
            <Gem className="size-4" aria-hidden="true" />
            {(gems - reward.price).toLocaleString("en-US")}
          </dd>
        </div>
      </dl>

      <div className="space-y-1.5">
        <label htmlFor="purchase-note" className="text-sm font-medium">
          Note <span className="font-normal text-muted-foreground">(optional)</span>
        </label>
        <input
          id="purchase-note"
          type="text"
          maxLength={LIMITS.maxPurchaseNote}
          autoComplete="off"
          data-autofocus
          placeholder="e.g. Saturday with Sam"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          disabled={pending}
          className="field block min-h-11 w-full"
        />
      </div>

      <p className="text-sm text-muted-foreground">Purchases cannot be refunded.</p>

      {error ? (
        <p role="alert" className="alert alert-error">
          {error}
        </p>
      ) : null}

      <div className="flex justify-end gap-3 pt-1">
        <button
          type="button"
          onClick={onClose}
          className="btn btn-quiet px-4"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={pending}
          aria-busy={pending}
          className="btn btn-primary px-5"
        >
          {pending ? "Buying…" : `Buy for ${reward.price.toLocaleString("en-US")} gems`}
        </button>
      </div>
    </form>
  );
}
