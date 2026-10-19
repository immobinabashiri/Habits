"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/" })}
      className="min-h-11 rounded-md border border-border bg-card px-4 text-sm font-semibold transition-colors hover:bg-muted"
    >
      Log out
    </button>
  );
}
