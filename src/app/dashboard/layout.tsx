import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import type { ReactNode } from "react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { Footer } from "@/components/layout/footer";
import { authOptions } from "@/lib/auth/auth";
import { SIDEBAR_COOKIE } from "@/lib/sidebar";

// Shell for every page inside the app (dashboard now, habits/rewards/... later).
// It has its own sidebar and does NOT use the public navbar.
export default async function layout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const cookieStore = await cookies();
  const initialCollapsed = cookieStore.get(SIDEBAR_COOKIE)?.value === "1";

  return (
    <DashboardShell
      userName={session.user.name ?? "there"}
      initialCollapsed={initialCollapsed}
      footer={<Footer />}
    >
      {children}
    </DashboardShell>
  );
}