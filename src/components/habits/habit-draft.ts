import { LIMITS } from "@/lib/domain/defaults";
import type { CreateHabitInput } from "@/lib/validation/habit";
import type { Weekday } from "@/types/common";
import type { HabitKind, PublicHabit } from "@/types/habits";

// Error keys match the paths the server uses in `fields` (see parseOrThrow),
// so client-side and server-side errors render through the same code.
export type FormErrors = Partial<Record<string, string>>;

// Number inputs are kept as strings while typing and parsed on submit.
export interface HabitDraft {
  name: string;
  description: string;
  category: string;
  kind: HabitKind;
  icon: string;
  days: Weekday[];
  xp: string;
  gems: string;
  timed: boolean;
  targetMinutes: string;
  unitMinutes: string;
  extraXp: string;
  extraGems: string;
}

export const INITIAL_DRAFT: HabitDraft = {
  name: "",
  description: "",
  category: "",
  kind: "core",
  icon: "star",
  days: [0, 1, 2, 3, 4, 5, 6],
  xp: "10",
  gems: "0",
  timed: false,
  targetMinutes: "30",
  unitMinutes: "15",
  extraXp: "0",
  extraGems: "0",
};

// Fills the form with an existing habit (edit mode).
export function draftFromHabit(habit: PublicHabit): HabitDraft {
  return {
    name: habit.name,
    description: habit.description,
    category: habit.category,
    kind: habit.kind,
    icon: habit.icon,
    days: [...habit.schedule.days],
    xp: String(habit.xp),
    gems: String(habit.gems),
    timed: habit.timed !== null,
    targetMinutes: String(habit.timed?.targetMinutes ?? INITIAL_DRAFT.targetMinutes),
    unitMinutes: String(habit.timed?.unitMinutes ?? INITIAL_DRAFT.unitMinutes),
    extraXp: String(habit.timed?.extraXpPerUnit ?? INITIAL_DRAFT.extraXp),
    extraGems: String(habit.timed?.extraGemsPerUnit ?? INITIAL_DRAFT.extraGems),
  };
}

function toInt(value: string): number {
  return /^\d+$/.test(value.trim()) ? Number(value) : Number.NaN;
}

function intInRange(value: string, min: number, max: number): number | null {
  const n = toInt(value);
  return Number.isInteger(n) && n >= min && n <= max ? n : null;
}

const rangeMessage = (min: number, max: number) =>
  `Enter a whole number between ${min} and ${max}.`;

// Validates the draft with the same limits as the server and builds the
// request body. The server remains the source of truth; this only saves a trip.
// "update" always sends every editable field, so clearing a field really clears it.
export function buildHabitInput(
  draft: HabitDraft,
  mode: "create" | "update",
): { ok: true; input: CreateHabitInput } | { ok: false; errors: FormErrors } {
  const errors: FormErrors = {};
  const name = draft.name.trim();
  const description = draft.description.trim();
  const category = draft.category.trim();
  const bonus = draft.kind === "bonus";

  if (!name) errors.name = "Enter a name.";
  else if (name.length > 60) errors.name = "Name must be at most 60 characters.";
  if (description.length > 300) errors.description = "Description is too long.";
  if (category.length > 40) errors.category = "Category must be at most 40 characters.";
  if (draft.days.length === 0) errors["schedule.days"] = "Pick at least one day.";

  const xp = intInRange(draft.xp, 0, LIMITS.maxHabitXp);
  if (xp === null) errors.xp = rangeMessage(0, LIMITS.maxHabitXp);

  const gems = bonus ? intInRange(draft.gems, 0, LIMITS.maxHabitGems) : 0;
  if (gems === null) errors.gems = rangeMessage(0, LIMITS.maxHabitGems);

  let timed: CreateHabitInput["timed"] = null;
  if (draft.timed) {
    const targetMinutes = intInRange(draft.targetMinutes, 1, LIMITS.maxMinutesPerDay);
    const unitMinutes = intInRange(draft.unitMinutes, 1, LIMITS.maxMinutesPerDay);
    const extraXpPerUnit = intInRange(draft.extraXp, 0, LIMITS.maxHabitXp);
    const extraGemsPerUnit = bonus ? intInRange(draft.extraGems, 0, LIMITS.maxHabitGems) : 0;

    if (targetMinutes === null) errors["timed.targetMinutes"] = rangeMessage(1, LIMITS.maxMinutesPerDay);
    if (unitMinutes === null) errors["timed.unitMinutes"] = rangeMessage(1, LIMITS.maxMinutesPerDay);
    if (extraXpPerUnit === null) errors["timed.extraXpPerUnit"] = rangeMessage(0, LIMITS.maxHabitXp);
    if (extraGemsPerUnit === null) errors["timed.extraGemsPerUnit"] = rangeMessage(0, LIMITS.maxHabitGems);

    if (
      targetMinutes !== null &&
      unitMinutes !== null &&
      extraXpPerUnit !== null &&
      extraGemsPerUnit !== null
    ) {
      timed = { targetMinutes, unitMinutes, extraXpPerUnit, extraGemsPerUnit };
    }
  }

  if (Object.keys(errors).length > 0 || xp === null || gems === null) {
    return { ok: false, errors };
  }

  const input: CreateHabitInput = {
    name,
    kind: draft.kind,
    icon: draft.icon,
    schedule: { kind: "weekdays", days: [...draft.days].sort((a, b) => a - b) },
    xp,
    gems,
    timed,
  };
  if (mode === "update") {
    input.description = description; // "" clears it
    input.category = category || "Other"; // the schema requires at least 1 character
  } else {
    // Empty optional text is left out so the server applies its own defaults.
    if (description) input.description = description;
    if (category) input.category = category;
  }
  return { ok: true, input };
}
