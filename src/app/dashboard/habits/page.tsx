import { Types } from "mongoose";
import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { HabitsView } from "@/components/habits/habits-view";
import { authOptions } from "@/lib/auth/auth";
import { listHabits } from "@/lib/services/habits";

export const metadata: Metadata = { title: "Habits" };

export default async function HabitsPage() {
  const session = await getServerSession(authOptions);
  const id = session?.user?.id;
  if (!id || !Types.ObjectId.isValid(id)) redirect("/login");

  // Server-side fetch: calls the service directly (no HTTP hop to our own API),
  // so the list arrives with the first HTML and there is no loading flash.
  // Changes (create, edit, archive, delete) go through /api/habits from the browser.
  const habits = await listHabits(new Types.ObjectId(id), "all");

  return <HabitsView initialHabits={habits} />;
}
