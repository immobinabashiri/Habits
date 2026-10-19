import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth/auth";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  // Basic server-side check. A proper route guard comes in the next step.
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold tracking-tight">
        Hi, {session.user.name}
      </h1>
      <p className="mt-2 max-w-xl text-muted-foreground">
        This is your dashboard. Your habits, streaks and gems will appear here
        in a later step.
      </p>
      <div className="mt-6">
      </div>
    </main>
  );
}