"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { syncTimezoneRequest } from "@/lib/api/dashboard-client";
import { DEFAULT_TIMEZONE } from "@/lib/domain/defaults";

// New accounts start on UTC. "Today" depends on the time zone, so the first time
// the dashboard opens we adopt the browser's zone and reload with the right day.
// A zone the user already has is never overwritten.
export function TimezoneSync({ stored }: { stored: string }) {
  const router = useRouter();

  useEffect(() => {
    if (stored !== DEFAULT_TIMEZONE) return;
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!detected || detected === stored) return;
    syncTimezoneRequest(detected)
      .then(() => router.refresh())
      .catch(() => {
        // Not critical: it simply tries again on the next visit.
      });
  }, [stored, router]);

  return null;
}
