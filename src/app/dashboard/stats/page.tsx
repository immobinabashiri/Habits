import { Types } from "mongoose";
import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { StatsView } from "@/components/stats/stats-view";
import { authOptions } from "@/lib/auth/auth";
import { parseRange } from "@/lib/domain/stats";
import { AppError } from "@/lib/errors";
import { getStatsData } from "@/lib/services/stats";
import type { StatsData } from "@/types/stats";

export const metadata: Metadata = { title: "Stats" };

export default async function StatsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getServerSession(authOptions);
  const id = session?.user?.id;
  if (!id || !Types.ObjectId.isValid(id)) redirect("/login");

  // Only 7, 30 or 90 are accepted; anything else falls back to 30.
  const range = parseRange((await searchParams).range);
  let data: StatsData;
  try {
    data = await getStatsData(new Types.ObjectId(id), range);
  } catch (error) {
    if (error instanceof AppError && error.code === "UNAUTHENTICATED") redirect("/login");
    throw error;
  }
  return <StatsView data={data} />;
}
