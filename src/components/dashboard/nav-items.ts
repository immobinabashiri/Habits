import {
  Flame,
  Gift,
  LayoutDashboard,
  ListChecks,
  Settings,
  TrendingUp,
  Trophy,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  ready: boolean; // false = page not built yet: shown as disabled "Soon"
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, ready: true },
  { href: "/habits", label: "Habits", icon: ListChecks, ready: false },
  { href: "/rewards", label: "Rewards", icon: Gift, ready: false },
  { href: "/streaks", label: "Streaks", icon: Flame, ready: false },
  { href: "/achievements", label: "Achievements", icon: Trophy, ready: false },
  { href: "/stats", label: "Stats", icon: TrendingUp, ready: false },
  { href: "/settings", label: "Settings", icon: Settings, ready: false },
];