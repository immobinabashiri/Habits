import {
  Apple,
  Bike,
  BookOpen,
  Brain,
  Coffee,
  Droplets,
  Dumbbell,
  Heart,
  Moon,
  Music,
  Pencil,
  Star,
  Sun,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

// The database stores only the icon KEY (e.g. "book"), never a component.
export const HABIT_ICONS: Record<string, LucideIcon> = {
  star: Star,
  book: BookOpen,
  workout: Dumbbell,
  water: Droplets,
  sleep: Moon,
  morning: Sun,
  mind: Brain,
  health: Heart,
  coffee: Coffee,
  music: Music,
  write: Pencil,
  bike: Bike,
  food: Apple,
};

export const HABIT_ICON_KEYS = Object.keys(HABIT_ICONS);

// Unknown keys (old data, future icons) fall back to the star.
// A component (not a getter) so nobody creates a component during render.
export function HabitIcon({ name, className }: { name: string; className?: string }) {
  const Icon = HABIT_ICONS[name] ?? Star;
  return <Icon className={className} aria-hidden="true" />;
}