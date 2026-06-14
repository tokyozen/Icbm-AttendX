import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import Sidebar from "@/components/layout/Sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = {
    name: session.user.name ?? "User",
    email: session.user.email ?? "",
    role: (session.user as any).role,
  };

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: "#F5F6FA" }}>
      <Sidebar user={user} />
      {/* Push content below mobile top bar */}
      <main className="flex-1 min-w-0 pt-14 lg:pt-0 overflow-auto">
        {children}
      </main>
    </div>
  );
}
