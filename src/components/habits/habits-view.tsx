"use client";

import { Archive, ListChecks, Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { DeleteHabitDialog } from "@/components/habits/delete-habit-dialog";
import { ExemptDaysDialog } from "@/components/habits/exempt-days-dialog";
import { HabitCard } from "@/components/habits/habit-card";
import { HabitForm } from "@/components/habits/habit-form";
import { Modal } from "@/components/ui/modal";
import { setArchivedRequest, toApiError } from "@/lib/api/habits-client";
import type { PublicHabit } from "@/types/habits";

type Filter = "active" | "archived";

// Only ids are stored: the dialogs always read the latest habit from the list.
type DialogState =
  | { type: "form"; habitId: string | null } // null = new habit
  | { type: "exempt"; habitId: string }
  | { type: "delete"; habitId: string }
  | null;

const FILTERS: { value: Filter; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "archived", label: "Archived" },
];

export function HabitsView({ initialHabits }: { initialHabits: PublicHabit[] }) {
  const router = useRouter();
  // The server sends ALL habits (the account is capped at LIMITS.maxHabits), so
  // switching tabs and archiving are instant and need no refetch.
  const [habits, setHabits] = useState(initialHabits);
  const [filter, setFilter] = useState<Filter>("active");
  const [dialog, setDialog] = useState<DialogState>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");

  const active = habits.filter((habit) => habit.archivedAt === null);
  const archived = habits.filter((habit) => habit.archivedAt !== null);
  const visible = filter === "active" ? active : archived;
  const counts: Record<Filter, number> = { active: active.length, archived: archived.length };
  const dialogHabit = dialog?.habitId
    ? habits.find((habit) => habit.id === dialog.habitId)
    : undefined;

  const closeDialog = () => setDialog(null);

  function upsert(habit: PublicHabit) {
    setHabits((current) =>
      current.some((item) => item.id === habit.id)
        ? current.map((item) => (item.id === habit.id ? habit : item))
        : [...current, habit],
    );
  }

  function handleSaved(habit: PublicHabit) {
    const isNew = !habits.some((item) => item.id === habit.id);
    upsert(habit);
    setDialog(null);
    if (isNew) setFilter("active");
    setAnnouncement(isNew ? `${habit.name} was added.` : `${habit.name} was updated.`);
  }

  function handleDeleted(habit: PublicHabit) {
    setHabits((current) => current.filter((item) => item.id !== habit.id));
    setDialog(null);
    setAnnouncement(`${habit.name} was deleted.`);
  }

  async function handleToggleArchive(habit: PublicHabit) {
    const archive = habit.archivedAt === null;
    setBusyId(habit.id);
    setActionError(null);
    try {
      upsert(await setArchivedRequest(habit.id, archive));
      setAnnouncement(archive ? `${habit.name} was archived.` : `${habit.name} was restored.`);
    } catch (caught) {
      const apiError = toApiError(caught);
      if (apiError.code === "UNAUTHENTICATED") {
        router.push("/login");
        return;
      }
      setActionError(apiError.message);
    } finally {
      setBusyId(null);
    }
  }

  const addButton = (
    <button
      type="button"
      onClick={() => setDialog({ type: "form", habitId: null })}
      className="inline-flex min-h-11 items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
    >
      <Plus className="size-5" aria-hidden="true" />
      Add habit
    </button>
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Habits</h1>
          <p className="mt-1 text-muted-foreground">
            {habits.length === 0
              ? "Build your routine one habit at a time."
              : `${active.length} active ${active.length === 1 ? "habit" : "habits"}`}
          </p>
        </div>
        {habits.length > 0 ? addButton : null}
      </div>

      {actionError ? (
        <div
          role="alert"
          className="mt-6 flex items-start justify-between gap-3 rounded-md border border-destructive px-3 py-2 text-sm text-destructive"
        >
          <p className="py-1.5">{actionError}</p>
          <button
            type="button"
            onClick={() => setActionError(null)}
            aria-label="Dismiss"
            className="-my-1 -mr-2 inline-flex size-11 shrink-0 items-center justify-center rounded-md hover:bg-destructive/10"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
      ) : null}

      {habits.length > 0 ? (
        <div role="group" aria-label="Show habits" className="glass mt-6 inline-flex rounded-full p-1">
          {FILTERS.map(({ value, label }) => (
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
              {label} ({counts[value]})
            </button>
          ))}
        </div>
      ) : null}

      {habits.length === 0 ? (
        <div className="mt-8 flex flex-col items-center gap-4 rounded-lg border border-dashed border-border px-6 py-16 text-center">
          <span
            aria-hidden="true"
            className="inline-flex size-14 items-center justify-center rounded-full bg-secondary text-secondary-foreground"
          >
            <ListChecks className="size-7" />
          </span>
          <div>
            <h2 className="text-lg font-semibold">No habits yet</h2>
            <p className="mt-1 max-w-sm text-muted-foreground">
              Create your first habit, choose the days it happens, and start earning gems.
            </p>
          </div>
          {addButton}
        </div>
      ) : visible.length === 0 ? (
        <div className="mt-6 flex flex-col items-center gap-3 rounded-lg border border-dashed border-border px-6 py-14 text-center">
          <span
            aria-hidden="true"
            className="inline-flex size-12 items-center justify-center rounded-full bg-secondary text-secondary-foreground"
          >
            <Archive className="size-6" />
          </span>
          <p className="max-w-sm text-muted-foreground">
            {filter === "active"
              ? "All your habits are archived. Restore one from the Archived tab, or add a new habit."
              : "Nothing is archived. Archive a habit to pause it. Its history is kept and you can restore it any time."}
          </p>
        </div>
      ) : (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((habit) => (
            <HabitCard
              key={habit.id}
              habit={habit}
              busy={busyId === habit.id}
              onEdit={() => setDialog({ type: "form", habitId: habit.id })}
              onExempt={() => setDialog({ type: "exempt", habitId: habit.id })}
              onToggleArchive={() => handleToggleArchive(habit)}
              onDelete={() => setDialog({ type: "delete", habitId: habit.id })}
            />
          ))}
        </ul>
      )}

      <Modal open={dialog !== null} onClose={closeDialog} size={dialog?.type === "delete" ? "sm" : "md"}>
        {dialog?.type === "form" ? (
          <HabitForm habit={dialogHabit} onClose={closeDialog} onSaved={handleSaved} />
        ) : null}
        {dialog?.type === "exempt" && dialogHabit ? (
          <ExemptDaysDialog habit={dialogHabit} onClose={closeDialog} onChange={upsert} />
        ) : null}
        {dialog?.type === "delete" && dialogHabit ? (
          <DeleteHabitDialog habit={dialogHabit} onClose={closeDialog} onDeleted={handleDeleted} />
        ) : null}
      </Modal>

      {/* Screen readers hear the result of each action. */}
      <p role="status" className="sr-only">
        {announcement}
      </p>
    </div>
  );
}
