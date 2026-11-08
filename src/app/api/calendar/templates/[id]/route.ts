import { NextResponse } from "next/server";
import { parseObjectId, readJson, respond } from "@/lib/api/http";
import { requireUserId } from "@/lib/auth/session";
import { deleteTemplate, renameTemplate } from "@/lib/services/calendar";
import { renameTemplateSchema } from "@/lib/validation/calendar";
import { parseOrThrow } from "@/lib/validation/parse";

type Context = { params: Promise<{ id: string }> };

// PATCH /api/calendar/templates/:id   body: { "name": "..." }
export function PATCH(request: Request, { params }: Context) {
  return respond(async () => {
    const userId = await requireUserId();
    const templateId = parseObjectId((await params).id);
    const { name } = parseOrThrow(renameTemplateSchema, await readJson(request));
    return NextResponse.json({ template: await renameTemplate(userId, templateId, name) });
  });
}

// DELETE /api/calendar/templates/:id   (items already created from it stay)
export function DELETE(_request: Request, { params }: Context) {
  return respond(async () => {
    const userId = await requireUserId();
    const templateId = parseObjectId((await params).id);
    await deleteTemplate(userId, templateId);
    return new Response(null, { status: 204 });
  });
}
