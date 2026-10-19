"use client";

import { Menu } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Sidebar } from "@/components/dashboard/sidebar";
import { LogoMark } from "@/components/layout/logo";
import { SIDEBAR_COOKIE } from "@/lib/sidebar";

interface DashboardShellProps {
  userName: string;
  initialCollapsed: boolean;
  footer: ReactNode;
  children: ReactNode;
}

export function DashboardShell({
  userName,
  initialCollapsed,
  footer,
  children,
}: DashboardShellProps) {
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const asideRef = useRef<HTMLElement>(null);
  const wasOpen = useRef(false);

  function toggleCollapsed() {
    const next = !collapsed;
    setCollapsed(next);
    // Remembered for a year. The server reads it so the first paint has the right width.
    document.cookie = `${SIDEBAR_COOKIE}=${next ? "1" : "0"}; path=/; max-age=31536000; samesite=lax`;
  }

  const closeMobile = () => setMobileOpen(false);

  // While the mobile drawer is open: Escape closes it, the page behind does not
  // scroll, and growing the window to desktop size closes it.
  useEffect(() => {
    if (!mobileOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
    };
    const desktop = window.matchMedia("(min-width: 1024px)");
    const onBreakpoint = (event: MediaQueryListEvent) => {
      if (event.matches) setMobileOpen(false);
    };
    const previousOverflow = document.body.style.overflow;

    document.addEventListener("keydown", onKeyDown);
    desktop.addEventListener("change", onBreakpoint);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      desktop.removeEventListener("change", onBreakpoint);
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileOpen]);

  // Keyboard users: move focus into the drawer when it opens and back to the
  // menu button when it closes.
  useEffect(() => {
    if (mobileOpen) {
      asideRef.current?.querySelector<HTMLElement>("a[href], button")?.focus();
    } else if (wasOpen.current) {
      menuButtonRef.current?.focus();
    }
    wasOpen.current = mobileOpen;
  }, [mobileOpen]);

  return (
    <div className="flex flex-1">
      {mobileOpen ? (
        <div
          aria-hidden="true"
          onClick={closeMobile}
          className="fixed inset-0 z-40 bg-foreground/40 lg:hidden"
        />
      ) : null}

      {/* Mobile: off-canvas drawer. Desktop (lg+): sticky column, collapsible. */}
      <aside
        id="app-sidebar"
        ref={asideRef}
        aria-label="Sidebar"
        className={`fixed inset-y-0 left-0 z-50 w-72 border-r border-border bg-card transition-[transform,width,visibility] duration-200 lg:sticky lg:top-0 lg:z-auto lg:h-screen lg:shrink-0 lg:translate-x-0 lg:self-start lg:visible ${
          mobileOpen ? "visible translate-x-0" : "invisible -translate-x-full"
        } ${collapsed ? "lg:w-[4.5rem]" : "lg:w-64"}`}
      >
        <Sidebar
          userName={userName}
          collapsed={collapsed}
          onToggleCollapse={toggleCollapsed}
          onClose={closeMobile}
        />
      </aside>

      {/* inert: while the drawer is open nothing behind it can be focused or clicked */}
      <div className="flex min-w-0 flex-1 flex-col" inert={mobileOpen}>
        <header className="glass sticky top-0 z-30 flex h-14 items-center gap-3 border-x-0 border-t-0 px-4 lg:hidden">
          <button
            type="button"
            ref={menuButtonRef}
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
            aria-expanded={mobileOpen}
            aria-controls="app-sidebar"
            className="-ml-2 inline-flex size-11 items-center justify-center rounded-md hover:bg-muted"
          >
            <Menu className="size-5" aria-hidden="true" />
          </button>
          <span className="flex items-center gap-2 font-bold tracking-tight">
            <LogoMark className="size-6" />
            Gem Habits
          </span>
        </header>

        <main id="main-content" className="flex-1">
          {children}
        </main>
        {footer}
      </div>
    </div>
  );
}