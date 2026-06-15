import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import UsersClient from "@/components/users/UsersClient";

export default async function UsersPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const role = (session.user as any).role as string;
  if (role !== "SUPER_ADMIN" && role !== "ADMIN") redirect("/dashboard");

  return <UsersClient isSuperAdmin={role === "SUPER_ADMIN"} />;
}
