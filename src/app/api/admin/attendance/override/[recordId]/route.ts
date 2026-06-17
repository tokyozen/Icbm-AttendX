import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function requireSuperAdmin() {
  const session = await auth();
  if (!session?.user) return null;
  const role = (session.user as { role?: string }).role ?? "";
  if (role !== "SUPER_ADMIN") return null;
  return session;
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ recordId: string }> }
) {
  const session = await requireSuperAdmin();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { recordId } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const reason = (body as { reason?: string })?.reason || "Marked absent by admin";

  const existing = await prisma.attendanceRecord.findUnique({ where: { id: recordId } });
  if (!existing) {
    return NextResponse.json({ error: "Record not found" }, { status: 404 });
  }

  const adminId = session.user!.id as string;

  const record = await prisma.attendanceRecord.update({
    where: { id: recordId },
    data: {
      isAbsent: true,
      isManualOverride: true,
      overrideReason: reason,
      overriddenBy: adminId,
      overriddenAt: new Date(),
    },
  });

  return NextResponse.json({ success: true, record });
}
