import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import AttendanceOverrideClient from "@/components/attendance/AttendanceOverrideClient";

export default async function AttendanceOverridePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const role = (session.user as { role?: string }).role ?? "";
  if (role !== "SUPER_ADMIN") redirect("/dashboard");

  return <AttendanceOverrideClient />;
}
