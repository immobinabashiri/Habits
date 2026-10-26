import { NextResponse } from "next/server";
import { readJson, respond } from "@/lib/api/http";
import { requireUserId } from "@/lib/auth/session";
import { changePassword } from "@/lib/services/settings";
import { parseOrThrow } from "@/lib/validation/parse";
import { passwordSchema } from "@/lib/validation/settings";

// POST /api/user/password   body: { currentPassword, newPassword }
export function POST(request: Request) {
  return respond(async () => {
    const userId = await requireUserId();
    const input = parseOrThrow(passwordSchema, await readJson(request));
    await changePassword(userId, input);
    return NextResponse.json({ ok: true });
  });
}
