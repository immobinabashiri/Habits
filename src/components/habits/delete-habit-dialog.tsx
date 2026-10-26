"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteHabitRequest, toApiError } from "@/lib/api/habits-client";
import type { PublicHabit } from "@/types/habits";

interface DeleteHabitDialogProps {
  habit: PublicHabit;
  onClose: () => void;
  onDeleted: (habit: PublicHabit) => void;
}

export function DeleteHabitDialog({ habit, onClose, onDeleted }: DeleteHabitDialogProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      await deleteHabitRequest(habit.id);
      onDeleted(habit);
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
      <h2 id="modal-title" className="text-lg font-bold tracking-tight">
        Delete “{habit.name}”?
      </h2>
      <p className="text-sm text-muted-foreground">
        This removes the habit for good and cannot be undone. XP and gems you already earned
        stay in your history.
        {habit.archivedAt ? null : " If you only want a break, archive it instead."}
      </p>

      {error ? (
        <p role="alert" className="rounded-md border border-destructive px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="flex justify-end gap-3 pt-1">
        {/* Focus starts on Cancel so Enter can never delete by accident. */}
        <button
          type="button"
          data-autofocus
          onClick={onClose}
          className="min-h-11 rounded-md px-4 text-sm font-semibold text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={pending}
          aria-busy={pending}
          className="min-h-11 rounded-md bg-destructive px-5 text-sm font-semibold text-destructive-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {pending ? "Deleting…" : "Delete habit"}
        </button>
      </div>
    </div>
  );
}
