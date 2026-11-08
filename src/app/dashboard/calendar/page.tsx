import { Types } from "mongoose";
import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { CalendarView } from "@/components/calendar/calendar-view";
import { authOptions } from "@/lib/auth/auth";
import { AppError } from "@/lib/errors";
import { getCalendarData } from "@/lib/services/calendar";
import { calendarQuerySchema } from "@/lib/validation/calendar";
import type { CalendarData } from "@/types/calendar";

export const metadata: Metadata = { title: "Calendar" };

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getServerSession(authOptions);
  const id = session?.user?.id;
  if (!id || !Types.ObjectId.isValid(id)) redirect("/login");

  // URL state: ?view=month|week|day|agenda&date=YYYY-MM-DD. Bad values fall back to
  // the month around today.
  const params = await searchParams;
  const { view, date } = calendarQuerySchema.parse({ view: first(params.view), date: first(params.date) });
  let data: CalendarData;
  try {
    data = await getCalendarData(new Types.ObjectId(id), view, date);
  } catch (error) {
    if (error instanceof AppError && error.code === "UNAUTHENTICATED") redirect("/login");
    throw error;
  }
  return <CalendarView data={data} />;
}
