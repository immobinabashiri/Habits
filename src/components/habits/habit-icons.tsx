import {
  Activity,
  Apple,
  Bath,
  Bike,
  BookOpen,
  Brain,
  Coffee,
  Droplets,
  Dumbbell,
  Flower2,
  Footprints,
  Guitar,
  Heart,
  Languages,
  Laptop,
  Leaf,
  Moon,
  Music,
  Pencil,
  Pill,
  Star,
  Sun,
  Target,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

// The database stores only the icon KEY (e.g. "book"), never a component, and saved
// habits depend on these keys. Never rename or remove one: only add.
export const HABIT_ICONS: Record<string, LucideIcon> = {
  star: Star,
  book: BookOpen,
  workout: Dumbbell,
  run: Activity,
  walk: Footprints,
  bike: Bike,
  water: Droplets,
  food: Apple,
  sleep: Moon,
  morning: Sun,
  mind: Brain,
  meditate: Flower2,
  health: Heart,
  meds: Pill,
  clean: Bath,
  coffee: Coffee,
  music: Music,
  guitar: Guitar,
  write: Pencil,
  laptop: Laptop,
  language: Languages,
  target: Target,
  nature: Leaf,
  money: Wallet,
};

export const HABIT_ICON_KEYS = Object.keys(HABIT_ICONS);

// Shown as the picker's tooltip and read by screen readers.
export const HABIT_ICON_LABELS: Record<string, string> = {
  star: "Star",
  book: "Reading",
  workout: "Workout",
  run: "Cardio",
  walk: "Walking",
  bike: "Cycling",
  water: "Water",
  food: "Healthy food",
  sleep: "Sleep",
  morning: "Morning",
  mind: "Learning",
  meditate: "Meditation",
  health: "Health",
  meds: "Medication",
  clean: "Self-care",
  coffee: "Coffee",
  music: "Music",
  guitar: "Guitar",
  write: "Writing",
  laptop: "Computer work",
  language: "Languages",
  target: "Goal",
  nature: "Nature",
  money: "Saving money",
};

// Unknown keys (old data, future icons) fall back to the star.
// A component (not a getter) so nobody creates a component during render.
export function HabitIcon({ name, className }: { name: string; className?: string }) {
  const Icon = HABIT_ICONS[name] ?? Star;
  return <Icon className={className} aria-hidden="true" />;
}
