import "server-only";
import { Types } from "mongoose";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { AppError } from "@/lib/errors";

// The ONLY source of the user id in the API. It comes from the verified session,
// never from the request body or URL.
export async function requireUserId(): Promise<Types.ObjectId> {
  const session = await getServerSession(authOptions);
  const id = session?.user?.id;
  if (!id || !Types.ObjectId.isValid(id)) throw new AppError("UNAUTHENTICATED");
  return new Types.ObjectId(id);
}