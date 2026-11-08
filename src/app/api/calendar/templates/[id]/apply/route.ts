import { NextResponse } from "next/server";
import { parseObjectId, readJson, respond } from "@/lib/api/http";
import { requireUserId } from "@/lib/auth/session";
import { applyTemplate } from "@/lib/services/calendar";
import { applyTemplateSchema } from "@/lib/validation/calendar";
import { parseOrThrow } from "@/lib/validation/parse";

type Context = { params: Promise<{ id: string }> };

// POST /api/calendar/templates/:id/apply   body: { "weekStart": "YYYY-MM-DD" }
export function POST(request: Request, { params }: Context) {
  return respond(async () => {
    const userId = await requireUserId();
    const templateId = parseObjectId((await params).id);
    const { weekStart } = parseOrThrow(applyTemplateSchema, await readJson(request));
    return NextResponse.json(await applyTemplate(userId, templateId, weekStart), { status: 201 });
  });
}
