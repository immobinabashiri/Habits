import { NextResponse } from "next/server";
import { parseObjectId, readJson, respond } from "@/lib/api/http";
import { requireUserId } from "@/lib/auth/session";
import { setArchived } from "@/lib/services/habits";
import { archiveSchema } from "@/lib/validation/habit";
import { parseOrThrow } from "@/lib/validation/parse";

type Context = { params: Promise<{ id: string }> };

// PATCH /api/habits/:id/archive   body: { "archived": true | false }
export function PATCH(request: Request, { params }: Context) {
  return respond(async () => {
    const userId = await requireUserId();
    const habitId = parseObjectId((await params).id);
    const { archived } = parseOrThrow(archiveSchema, await readJson(request));
    return NextResponse.json({ habit: await setArchived(userId, habitId, archived) });
  });
}