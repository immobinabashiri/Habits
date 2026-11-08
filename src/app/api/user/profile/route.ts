import { NextResponse } from "next/server";
import { readJson, respond } from "@/lib/api/http";
import { requireUserId } from "@/lib/auth/session";
import { updateProfile } from "@/lib/services/settings";
import { parseOrThrow } from "@/lib/validation/parse";
import { profileSchema } from "@/lib/validation/settings";

// PATCH /api/user/profile   body: { "name": "Alex Doe" }
export function PATCH(request: Request) {
  return respond(async () => {
    const userId = await requireUserId();
    const input = parseOrThrow(profileSchema, await readJson(request));
    return NextResponse.json({ name: await updateProfile(userId, input) });
  });
}
