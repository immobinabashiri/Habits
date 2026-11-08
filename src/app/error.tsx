"use client";

import { TriangleAlert } from "lucide-react";
import Link from "next/link";

// Shown when a page fails to render, such as when the database cannot be reached.
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="page flex flex-1 items-center justify-center">
      <div className="empty-box flex w-full max-w-md flex-col items-center gap-4 px-6 py-14 text-center">
        <span aria-hidden="true" className="icon-bubble inline-flex size-14 items-center justify-center">
          <TriangleAlert className="size-7" />
        </span>
        <div>
          <h1 className="type-h1">Something went wrong</h1>
          <p className="mt-1 text-muted-foreground">This page could not load. Please try again in a moment.</p>
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          <button type="button" onClick={reset} className="btn btn-primary px-5">
            Try again
          </button>
          <Link href="/" className="btn btn-outline px-5">
            Back to home
          </Link>
        </div>
      </div>
    </main>
  );
}
