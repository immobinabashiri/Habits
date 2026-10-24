import { Types } from "mongoose";
import { NextResponse } from "next/server";
import { AppError } from "@/lib/errors";

// Turns any thrown value into a safe JSON response. Internal details go to the
// server log only, never to the client.
export function errorResponse(error: unknown): Response {
  if (error instanceof AppError) {
    return NextResponse.json(error.toBody(), { status: error.status });
  }
  console.error("Unhandled API error:", error);
  const dbDown =
    error instanceof Error && error.name.includes("ServerSelectionError");
  const fallback = new AppError(dbDown ? "SERVICE_UNAVAILABLE" : "INTERNAL");
  return NextResponse.json(fallback.toBody(), { status: fallback.status });
}

// Wraps a handler body so every error becomes a consistent JSON response.
export async function respond(run: () => Promise<Response>): Promise<Response> {
  try {
    return await run();
  } catch (error) {
    return errorResponse(error);
  }
}

// Requiring the JSON content type also blocks simple cross-site form posts.
export async function readJson(request: Request): Promise<unknown> {
  if (!request.headers.get("content-type")?.includes("application/json")) {
    throw new AppError("VALIDATION_FAILED");
  }
  try {
    return await request.json();
  } catch {
    throw new AppError("VALIDATION_FAILED");
  }
}

// A malformed id is reported as "not found", the same as an id that is not yours.
export function parseObjectId(value: string): Types.ObjectId {
  if (!/^[a-f0-9]{24}$/i.test(value)) throw new AppError("NOT_FOUND");
  return new Types.ObjectId(value);
}