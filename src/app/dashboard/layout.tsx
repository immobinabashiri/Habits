import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Types } from "mongoose";
import { getServerSession } from "next-auth";
import type { ReactNode } from "react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { Footer } from "@/components/layout/footer";
import { authOptions } from "@/lib/auth/auth";
import { SIDEBAR_COOKIE } from "@/lib/sidebar";
import { getDisplayName } from "@/lib/services/user";

// Shell for every page inside the app (dashboard now, habits/rewards/... later).
// It has its own sidebar and does NOT use the public navbar.
export default async function layout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  // The name comes from the database, so a rename shows up without logging in again.
  const id = session.user.id;
  const storedName = id && Types.ObjectId.isValid(id) ? await getDisplayName(new Types.ObjectId(id)) : null;

  const cookieStore = await cookies();
  const initialCollapsed = cookieStore.get(SIDEBAR_COOKIE)?.value === "1";

  return (
    <DashboardShell
      userName={storedName ?? session.user.name ?? "there"}
      initialCollapsed={initialCollapsed}
      footer={<Footer />}
    >
      {children}
    </DashboardShell>
  );
}