import {
  CalendarDays,
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

// Order: home first, then the Calendar (the plan for every day, habits included),
// then the progress and reward sections (what you have earned), then managing
// habits, then settings. Streaks sits with the progress group.
export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, ready: true },
  { href: "/dashboard/calendar", label: "Calendar", icon: CalendarDays, ready: true },
  { href: "/dashboard/achievements", label: "Achievements", icon: Trophy, ready: true },
  { href: "/dashboard/rewards", label: "Rewards", icon: Gift, ready: true },
  { href: "/dashboard/stats", label: "Stats", icon: TrendingUp, ready: true },
  { href: "/dashboard/streaks", label: "Streaks", icon: Flame, ready: true },
  { href: "/dashboard/habits", label: "Habits", icon: ListChecks, ready: true },
  { href: "/dashboard/settings", label: "Settings", icon: Settings, ready: true },
];