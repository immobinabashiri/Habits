import {
  Cake,
  Coffee,
  Film,
  Gamepad2,
  Gift,
  Music,
  Pizza,
  Plane,
  Popcorn,
  ShoppingBag,
  Snowflake,
  Sparkles,
  Utensils,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

// The database stores only the icon KEY (e.g. "movie"), never a component.
// These are the icons a user can pick for their own rewards.
export const REWARD_ICONS: Record<string, LucideIcon> = {
  gift: Gift,
  coffee: Coffee,
  movie: Film,
  game: Gamepad2,
  cake: Cake,
  pizza: Pizza,
  snack: Popcorn,
  shopping: ShoppingBag,
  travel: Plane,
  music: Music,
  dinner: Utensils,
  spa: Sparkles,
};

export const REWARD_ICON_KEYS = Object.keys(REWARD_ICONS);

// Purchase history can also hold items the user cannot pick (Streak Freezes).
const DISPLAY_ONLY: Record<string, LucideIcon> = { snowflake: Snowflake };

// Unknown keys fall back to the gift. A component (not a getter) so nobody
// creates a component during render.
export function RewardIcon({ name, className }: { name: string; className?: string }) {
  const Icon = REWARD_ICONS[name] ?? DISPLAY_ONLY[name] ?? Gift;
  return <Icon className={className} aria-hidden="true" />;
}
