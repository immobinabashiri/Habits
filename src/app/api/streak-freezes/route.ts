import { NextResponse } from "next/server";
import { readJson, respond } from "@/lib/api/http";
import { requireUserId } from "@/lib/auth/session";
import { buyStreakFreezes } from "@/lib/services/streak-freezes";
import { buyFreezesSchema } from "@/lib/validation/dashboard";
import { parseOrThrow } from "@/lib/validation/parse";

// POST /api/streak-freezes   body: { "quantity": 1..max }   (costs gems)
export function POST(request: Request) {
  return respond(async () => {
    const userId = await requireUserId();
    const { quantity } = parseOrThrow(buyFreezesSchema, await readJson(request));
    return NextResponse.json(await buyStreakFreezes(userId, quantity), { status: 201 });
  });
}
