import { Types } from "mongoose";
import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import { authOptions } from "@/lib/auth/auth";
import { getDashboard } from "@/lib/services/dashboard";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const id = session?.user?.id;
  if (!id || !Types.ObjectId.isValid(id)) redirect("/login");

  // Server-side fetch: the first HTML already contains today's habits and streaks.
  const data = await getDashboard(new Types.ObjectId(id));

  // The key makes the view start fresh when the day or the time zone changes
  // (midnight passing, or the browser time zone being adopted).
  return <DashboardView key={`${data.today}:${data.timezone}`} initial={data} />;
}
