"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toApiError } from "@/lib/api/habits-client";
import { deleteRewardRequest } from "@/lib/api/rewards-client";
import type { PublicReward } from "@/types/reward";

interface DeleteRewardDialogProps {
  reward: PublicReward;
  onClose: () => void;
  onDeleted: (reward: PublicReward) => void;
}

export function DeleteRewardDialog({ reward, onClose, onDeleted }: DeleteRewardDialogProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      await deleteRewardRequest(reward.id);
      onDeleted(reward);
    } catch (caught) {
      const apiError = toApiError(caught);
      if (apiError.code === "UNAUTHENTICATED") {
        router.push("/login");
        return;
      }
      setError(apiError.message);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-4 p-5">
      <h2 id="modal-title" className="type-h2">
        Delete “{reward.name}”?
      </h2>
      <p className="text-sm text-muted-foreground">
        The reward is removed from your shop. Things you already bought with it stay in your
        purchase history.
      </p>

      {error ? (
        <p role="alert" className="alert alert-error">
          {error}
        </p>
      ) : null}

      <div className="flex justify-end gap-3 pt-1">
        {/* Focus starts on Cancel so Enter can never delete by accident. */}
        <button
          type="button"
          data-autofocus
          onClick={onClose}
          className="btn btn-quiet px-4"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={pending}
          aria-busy={pending}
          className="btn btn-danger px-5"
        >
          {pending ? "Deleting…" : "Delete reward"}
        </button>
      </div>
    </div>
  );
}
