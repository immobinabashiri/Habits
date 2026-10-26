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
  { href: "/dashboard/habits", label: "Habits", icon: ListChecks, ready: true },
  { href: "/dashboard/rewards", label: "Rewards", icon: Gift, ready: true },
  { href: "/dashboard/streaks", label: "Streaks", icon: Flame, ready: true },
  { href: "/dashboard/achievements", label: "Achievements", icon: Trophy, ready: true },
  { href: "/dashboard/stats", label: "Stats", icon: TrendingUp, ready: true },
  { href: "/dashboard/settings", label: "Settings", icon: Settings, ready: true },
];