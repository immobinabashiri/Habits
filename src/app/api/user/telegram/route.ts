import { NextResponse } from "next/server";
import { respond } from "@/lib/api/http";
import { requireUserId } from "@/lib/auth/session";
import { disconnectTelegram, getTelegramStatus } from "@/lib/services/telegram";

// GET /api/user/telegram   connection status and preferences
export function GET() {
  return respond(async () => {
    const userId = await requireUserId();
    return NextResponse.json({ telegram: await getTelegramStatus(userId) });
  });
}

// DELETE /api/user/telegram   disconnect the linked chat
export function DELETE() {
  return respond(async () => {
    const userId = await requireUserId();
    await disconnectTelegram(userId);
    return NextResponse.json({ telegram: await getTelegramStatus(userId) });
  });
}
