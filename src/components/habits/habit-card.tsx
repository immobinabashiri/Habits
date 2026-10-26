import { Archive, ArchiveRestore, CalendarOff, Clock, Gem, Pencil, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { HabitIcon } from "@/components/habits/habit-icons";
import { describeSchedule } from "@/lib/domain/weekdays";
import type { PublicHabit } from "@/types/habits";

interface HabitCardProps {
  habit: PublicHabit;
  busy: boolean; // a request for this habit is in flight
  onEdit: () => void;
  onExempt: () => void;
  onToggleArchive: () => void;
  onDelete: () => void;
}

interface ActionButtonProps {
  label: string;
  habitName: string;
  onClick: () => void;
  disabled: boolean;
  danger?: boolean;
  children: ReactNode;
}

// Icon-only button. The visible tooltip is the short label; screen readers also
// hear which habit it belongs to ("Edit: Read 10 pages").
function ActionButton({ label, habitName, onClick, disabled, danger, children }: ActionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={`${label}: ${habitName}`}
      className={`inline-flex size-11 items-center justify-center rounded-md text-muted-foreground transition-colors disabled:opacity-50 ${
        danger ? "hover:bg-destructive/10 hover:text-destructive" : "hover:bg-muted hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

export function HabitCard({ habit, busy, onEdit, onExempt, onToggleArchive, onDelete }: HabitCardProps) {
  const { timed } = habit;
  const bonus = habit.kind === "bonus";
  const archived = habit.archivedAt !== null;

  return (
    <li
      className={`flex flex-col rounded-lg border border-border p-4 text-card-foreground ${
        archived ? "bg-muted/50" : "bg-card"
      }`}
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground"
        >
          <HabitIcon name={habit.icon} className="size-5" />
        </span>

        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold">{habit.name}</h3>
          <p className="truncate text-sm text-muted-foreground">{habit.category}</p>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1">
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
              bonus ? "bg-reward text-reward-foreground" : "bg-secondary text-secondary-foreground"
            }`}
          >
            {bonus ? "Bonus" : "Core"}
          </span>
          {archived ? (
            <span className="rounded-full border border-border px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
              Archived
            </span>
          ) : null}
        </div>
      </div>

      {habit.description ? (
        <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{habit.description}</p>
      ) : null}

      <dl className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        <div>
          <dt className="sr-only">Schedule</dt>
          <dd className="text-muted-foreground">{describeSchedule(habit.schedule.days)}</dd>
        </div>

        <div className="font-medium">
          <dt className="sr-only">Reward</dt>
          <dd className="flex items-center gap-2">
            <span>+{habit.xp} XP</span>
            {bonus && habit.gems > 0 ? (
              <span className="inline-flex items-center gap-1">
                <Gem className="size-3.5 text-primary" aria-hidden="true" />+{habit.gems}
              </span>
            ) : null}
          </dd>
        </div>

        {timed ? (
          <div className="text-muted-foreground">
            <dt className="sr-only">Target</dt>
            <dd className="inline-flex items-center gap-1">
              <Clock className="size-3.5" aria-hidden="true" />
              {timed.targetMinutes} min
            </dd>
          </div>
        ) : null}

        {habit.exemptDates.length > 0 ? (
          <div className="text-muted-foreground">
            <dt className="sr-only">Exempt days</dt>
            <dd className="inline-flex items-center gap-1">
              <CalendarOff className="size-3.5" aria-hidden="true" />
              {habit.exemptDates.length}
            </dd>
          </div>
        ) : null}
      </dl>

      <div className="-mx-2 -mb-2 mt-3 flex items-center gap-1 border-t border-border pt-2">
        <ActionButton label="Edit" habitName={habit.name} onClick={onEdit} disabled={busy}>
          <Pencil className="size-4" aria-hidden="true" />
        </ActionButton>
        <ActionButton label="Exempt days" habitName={habit.name} onClick={onExempt} disabled={busy}>
          <CalendarOff className="size-4" aria-hidden="true" />
        </ActionButton>
        <ActionButton
          label={archived ? "Unarchive" : "Archive"}
          habitName={habit.name}
          onClick={onToggleArchive}
          disabled={busy}
        >
          {archived ? (
            <ArchiveRestore className="size-4" aria-hidden="true" />
          ) : (
            <Archive className="size-4" aria-hidden="true" />
          )}
        </ActionButton>
        <span className="flex-1" />
        <ActionButton label="Delete" habitName={habit.name} onClick={onDelete} disabled={busy} danger>
          <Trash2 className="size-4" aria-hidden="true" />
        </ActionButton>
      </div>
    </li>
  );
}
