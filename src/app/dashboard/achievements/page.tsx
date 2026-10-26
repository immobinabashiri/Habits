import { Types } from "mongoose";
import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { AchievementsView, parseFilter } from "@/components/achievements/achievements-view";
import { authOptions } from "@/lib/auth/auth";
import { AppError } from "@/lib/errors";
import { getAchievementsData } from "@/lib/services/achievement-overview";
import type { AchievementsData } from "@/types/achievement";

export const metadata: Metadata = { title: "Achievements" };

export default async function AchievementsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getServerSession(authOptions);
  const id = session?.user?.id;
  if (!id || !Types.ObjectId.isValid(id)) redirect("/login");

  const filter = parseFilter((await searchParams).show);
  let data: AchievementsData;
  try {
    data = await getAchievementsData(new Types.ObjectId(id));
  } catch (error) {
    if (error instanceof AppError && error.code === "UNAUTHENTICATED") redirect("/login");
    throw error;
  }
  return <AchievementsView data={data} filter={filter} />;
}
