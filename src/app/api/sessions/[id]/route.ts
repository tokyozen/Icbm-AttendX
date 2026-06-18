import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = Promise<{ id: string }>;

export async function GET(request: Request, { params }: { params: Params }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const role = (session.user as any).role as string;
  const userId = session.user.id as string;

  const trainingSession = await prisma.trainingSession.findUnique({
    where: { id },
    include: {
      instructor: { select: { id: true, name: true, email: true } },
      attendanceRecords: { orderBy: { checkInTime: "asc" } },
      _count: { select: { attendanceRecords: true } },
    },
  });

  if (!trainingSession) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  if (role === "INSTRUCTOR" && trainingSession.instructorId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({ session: trainingSession });
}

export async function DELETE(request: Request, { params }: { params: Params }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = (session.user as any).role as string;
  if (role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const trainingSession = await prisma.trainingSession.findUnique({ where: { id } });
  if (!trainingSession) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  await prisma.attendanceRecord.deleteMany({ where: { sessionId: id } });
  await prisma.trainingSession.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
