import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import MasterAttendanceClient from "@/components/master-attendance/MasterAttendanceClient";

export default async function MasterAttendancePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = session.user as { role: string; learningTrack?: string | null };

  return <MasterAttendanceClient userRole={user.role} userTrack={user.learningTrack ?? null} />;
}
