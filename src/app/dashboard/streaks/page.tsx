import { Types } from "mongoose";
import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { StreaksView } from "@/components/streaks/streaks-view";
import { authOptions } from "@/lib/auth/auth";
import { AppError } from "@/lib/errors";
import { getStreaksData } from "@/lib/services/streak-overview";
import type { StreaksData } from "@/types/streaks";

export const metadata: Metadata = { title: "Streaks" };

export default async function StreaksPage() {
  const session = await getServerSession(authOptions);
  const id = session?.user?.id;
  if (!id || !Types.ObjectId.isValid(id)) redirect("/login");

  let data: StreaksData;
  try {
    data = await getStreaksData(new Types.ObjectId(id));
  } catch (error) {
    if (error instanceof AppError && error.code === "UNAUTHENTICATED") redirect("/login");
    throw error;
  }
  // The key changes with the day, so a page left open past midnight starts clean.
  return <StreaksView key={data.today} data={data} />;
}
