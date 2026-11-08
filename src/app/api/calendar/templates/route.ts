import { NextResponse } from "next/server";
import { readJson, respond } from "@/lib/api/http";
import { requireUserId } from "@/lib/auth/session";
import { createTemplate } from "@/lib/services/calendar";
import { createTemplateSchema } from "@/lib/validation/calendar";
import { parseOrThrow } from "@/lib/validation/parse";

// POST /api/calendar/templates   body: { "name": "...", "weekStart": "YYYY-MM-DD" }
// Saves that week's single events, tasks and reminders as a reusable template.
export function POST(request: Request) {
  return respond(async () => {
    const userId = await requireUserId();
    const input = parseOrThrow(createTemplateSchema, await readJson(request));
    return NextResponse.json({ template: await createTemplate(userId, input) }, { status: 201 });
  });
}
