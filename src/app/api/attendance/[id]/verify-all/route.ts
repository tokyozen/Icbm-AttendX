import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = Promise<{ id: string }>;

export async function POST(request: Request, { params }: { params: Params }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id as string;
  const role = (session.user as { role?: string }).role ?? "";

  const body = await request.json();
  const sessionId: string = body?.sessionId ?? (await params).id;

  const trainingSession = await prisma.trainingSession.findUnique({
    where: { id: sessionId },
    select: { instructorId: true },
  });

  if (!trainingSession) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const isOwner = trainingSession.instructorId === userId;
  const isAdmin = ["ADMIN", "SUPER_ADMIN"].includes(role);

  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const result = await prisma.attendanceRecord.updateMany({
    where: { sessionId, verificationStatus: "PENDING" },
    data: {
      verificationStatus: "VERIFIED",
      verifiedAt: new Date(),
      verifiedBy: userId,
    },
  });

  return NextResponse.json({ count: result.count });
}
