import {
  Award,
  Cake,
  Camera,
  Coffee,
  Crown,
  Diamond,
  Film,
  Gamepad2,
  Gem,
  Gift,
  Headphones,
  Heart,
  IceCreamCone,
  Medal,
  Music,
  PartyPopper,
  Pizza,
  Plane,
  Popcorn,
  ShoppingBag,
  Snowflake,
  Sparkles,
  Star,
  Ticket,
  Trophy,
  Utensils,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

// The database stores only the icon KEY (e.g. "movie"), never a component, and saved
// rewards and purchases depend on these keys. Never rename or remove one: only add.
// These are the icons a user can pick for their own rewards.
export const REWARD_ICONS: Record<string, LucideIcon> = {
  gift: Gift,
  trophy: Trophy,
  medal: Medal,
  award: Award,
  crown: Crown,
  star: Star,
  gem: Gem,
  diamond: Diamond,
  heart: Heart,
  spa: Sparkles,
  party: PartyPopper,
  coffee: Coffee,
  cake: Cake,
  icecream: IceCreamCone,
  pizza: Pizza,
  dinner: Utensils,
  snack: Popcorn,
  movie: Film,
  ticket: Ticket,
  game: Gamepad2,
  music: Music,
  headphones: Headphones,
  camera: Camera,
  shopping: ShoppingBag,
  travel: Plane,
};

export const REWARD_ICON_KEYS = Object.keys(REWARD_ICONS);

// Shown as the picker's tooltip and read by screen readers.
export const REWARD_ICON_LABELS: Record<string, string> = {
  gift: "Gift",
  trophy: "Trophy",
  medal: "Medal",
  award: "Award",
  crown: "Crown",
  star: "Star",
  gem: "Gem",
  diamond: "Diamond",
  heart: "Heart",
  spa: "Pampering",
  party: "Party",
  coffee: "Coffee",
  cake: "Cake",
  icecream: "Ice cream",
  pizza: "Pizza",
  dinner: "Dinner out",
  snack: "Snacks",
  movie: "Movie",
  ticket: "Event ticket",
  game: "Gaming",
  music: "Music",
  headphones: "Headphones",
  camera: "Camera",
  shopping: "Shopping",
  travel: "Travel",
};

// Purchase history can also hold items the user cannot pick (Streak Freezes).
const DISPLAY_ONLY: Record<string, LucideIcon> = { snowflake: Snowflake };

// Unknown keys fall back to the gift. A component (not a getter) so nobody
// creates a component during render.
export function RewardIcon({ name, className }: { name: string; className?: string }) {
  const Icon = REWARD_ICONS[name] ?? DISPLAY_ONLY[name] ?? Gift;
  return <Icon className={className} aria-hidden="true" />;
}
