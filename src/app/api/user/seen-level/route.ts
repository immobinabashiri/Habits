import { NextResponse } from "next/server";
import { respond } from "@/lib/api/http";
import { requireUserId } from "@/lib/auth/session";
import { acknowledgeLevel } from "@/lib/services/user";

// POST /api/user/seen-level   (the user dismissed the level-up banner)
export function POST() {
  return respond(async () => {
    await acknowledgeLevel(await requireUserId());
    return NextResponse.json({ ok: true });
  });
}
