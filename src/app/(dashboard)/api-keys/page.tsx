import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import ApiKeysClient from "@/components/api-keys/ApiKeysClient";

export default async function ApiKeysPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const role = (session.user as { role?: string }).role ?? "";
  if (role !== "SUPER_ADMIN") redirect("/dashboard");

  return <ApiKeysClient />;
}
