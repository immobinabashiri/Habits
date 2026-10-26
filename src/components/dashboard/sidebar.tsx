"use client";

import { ChevronsLeft, ChevronsRight, LogOut, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { LogoMark } from "@/components/layout/logo";
import { NAV_ITEMS } from "@/components/dashboard/nav-items";

interface SidebarProps {
  userName: string;
  collapsed: boolean; // only affects screens >= lg; the mobile drawer is always full
  onToggleCollapse: () => void;
  onClose: () => void; // closes the mobile drawer
}

const itemBase =
  "flex min-h-11 w-full items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors";

export function Sidebar({ userName, collapsed, onToggleCollapse, onClose }: SidebarProps) {
  const pathname = usePathname();
  // sr-only keeps the text available to screen readers while the sidebar is collapsed
  const label = collapsed ? "lg:sr-only" : "";
  const centered = collapsed ? "lg:justify-center lg:px-0" : "";

  return (
    <div className="flex h-full flex-col">
      <div
        className={`flex h-16 shrink-0 items-center justify-between px-4 ${
          collapsed ? "lg:justify-center lg:px-0" : ""
        }`}
      >
        <Link
          href="/dashboard"
          onClick={onClose}
          className="flex items-center gap-2 rounded-md font-bold tracking-tight"
        >
          <LogoMark />
          <span className={label}>Gem Habits</span>
        </Link>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close menu"
          className="inline-flex size-11 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground lg:hidden"
        >
          <X className="size-5" aria-hidden="true" />
        </button>
      </div>

      <nav aria-label="Dashboard" className="flex-1 overflow-y-auto px-3 py-2">
        <ul className="space-y-1">
          {NAV_ITEMS.map(({ href, label: text, icon: Icon, ready }) => {
            const active =
  href === "/dashboard"
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);
            return (
              <li key={href}>
                {ready ? (
                  <Link
                    href={href}
                    onClick={onClose}
                    aria-current={active ? "page" : undefined}
                    title={collapsed ? text : undefined}
                    className={`${itemBase} ${centered} ${
                      active
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    <Icon className="size-5 shrink-0" aria-hidden="true" />
                    <span className={label}>{text}</span>
                  </Link>
                ) : (
                  <span
                    aria-disabled="true"
                    title={collapsed ? `${text} (coming soon)` : undefined}
                    className={`${itemBase} ${centered} cursor-not-allowed text-muted-foreground/60`}
                  >
                    <Icon className="size-5 shrink-0" aria-hidden="true" />
                    <span className={label}>{text}</span>
                    <span
                      className={`ml-auto rounded-full bg-muted px-2 py-0.5 text-xs ${
                        collapsed ? "lg:hidden" : ""
                      }`}
                    >
                      Soon
                    </span>
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="shrink-0 space-y-1 border-t border-border p-3">
        <button
          type="button"
          onClick={onToggleCollapse}
          aria-expanded={!collapsed}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={`${itemBase} ${centered} hidden text-muted-foreground hover:bg-muted hover:text-foreground lg:flex`}
        >
          {collapsed ? (
            <ChevronsRight className="size-5 shrink-0" aria-hidden="true" />
          ) : (
            <ChevronsLeft className="size-5 shrink-0" aria-hidden="true" />
          )}
          <span className={label}>Collapse</span>
        </button>

        <div className={`flex min-h-11 items-center gap-3 px-3 ${centered}`}>
          <span
            aria-hidden="true"
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-bold text-secondary-foreground"
          >
            {userName.charAt(0).toUpperCase()}
          </span>
          <span className={`truncate text-sm font-medium ${label}`}>{userName}</span>
        </div>

        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/" })}
          title={collapsed ? "Log out" : undefined}
          className={`${itemBase} ${centered} text-muted-foreground hover:bg-muted hover:text-foreground`}
        >
          <LogOut className="size-5 shrink-0" aria-hidden="true" />
          <span className={label}>Log out</span>
        </button>
      </div>
    </div>
  );
}