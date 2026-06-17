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

export async function POST(request: Request) {
  const session = await requireSuperAdmin();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { studentId, sessionId, reason } = body as {
    studentId?: string;
    sessionId?: string;
    reason?: string;
  };

  if (!studentId || !sessionId) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const student = await prisma.student.findUnique({ where: { id: studentId } });
  const trainingSession = await prisma.trainingSession.findUnique({ where: { id: sessionId } });

  if (!student || !trainingSession) {
    return NextResponse.json({ error: "Student or session not found" }, { status: 404 });
  }

  const adminId = session.user!.id as string;

  const record = await prisma.attendanceRecord.upsert({
    where: { sessionId_studentId: { sessionId, studentId } },
    create: {
      sessionId,
      studentId,
      applicationId: student.applicationId,
      fullName: student.fullName,
      gender: student.gender,
      trainingLocation: student.trainingLocation,
      learningTrack: student.learningTrack,
      checkInTime: trainingSession.startedAt,
      deviceType: "Manual Override",
      verificationStatus: "VERIFIED",
      verifiedAt: new Date(),
      verifiedBy: adminId,
      isManualOverride: true,
      overrideReason: reason || "Manual attendance override by admin",
      overriddenBy: adminId,
      overriddenAt: new Date(),
      isAbsent: false,
    },
    update: {
      isAbsent: false,
      isManualOverride: true,
      overrideReason: reason || "Manual attendance override by admin",
      overriddenBy: adminId,
      overriddenAt: new Date(),
      verificationStatus: "VERIFIED",
      verifiedAt: new Date(),
      verifiedBy: adminId,
    },
  });

  return NextResponse.json({ success: true, record });
}
