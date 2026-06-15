import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function requireAdminAccess() {
  const session = await auth();
  if (!session?.user) return null;
  const role = (session.user as { role?: string }).role ?? "";
  if (role !== "SUPER_ADMIN" && role !== "ADMIN") return null;
  return session;
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdminAccess();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const user = await prisma.user.update({
      where: { id },
      data: {
        isActive: true,
        isApproved: true,
        approvedAt: new Date(),
        approvedBy: session.user?.id,
      },
      select: { id: true, name: true, email: true, isActive: true, isApproved: true },
    });
    return NextResponse.json({ user });
  } catch (err: any) {
    if (err?.code === "P2025") {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    throw err;
  }
}
