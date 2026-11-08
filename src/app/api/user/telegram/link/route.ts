import { NextResponse } from "next/server";
import { respond } from "@/lib/api/http";
import { requireUserId } from "@/lib/auth/session";
import { startTelegramLink } from "@/lib/services/telegram";

// POST /api/user/telegram/link   a fresh single-use t.me link (valid 10 minutes)
export function POST() {
  return respond(async () => {
    const userId = await requireUserId();
    return NextResponse.json({ link: await startTelegramLink(userId) }, { status: 201 });
  });
}
