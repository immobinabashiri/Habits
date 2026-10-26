import { Types } from "mongoose";
import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { RewardsView } from "@/components/rewards/rewards-view";
import { authOptions } from "@/lib/auth/auth";
import { AppError } from "@/lib/errors";
import { getRewardsData } from "@/lib/services/rewards";

export const metadata: Metadata = { title: "Rewards" };

export default async function RewardsPage() {
  const session = await getServerSession(authOptions);
  const id = session?.user?.id;
  if (!id || !Types.ObjectId.isValid(id)) redirect("/login");

  // Server-side fetch: the shop and the balance arrive with the first HTML.
  let data;
  try {
    data = await getRewardsData(new Types.ObjectId(id));
  } catch (error) {
    // A valid session for a user that no longer exists: send them to log in again.
    if (error instanceof AppError && error.code === "UNAUTHENTICATED") redirect("/login");
    throw error;
  }
  return <RewardsView initial={data} />;
}
