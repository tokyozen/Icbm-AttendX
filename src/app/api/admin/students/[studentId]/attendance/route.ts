import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ studentId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const role = (session.user as { role?: string }).role ?? "";
  if (role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { studentId } = await params;

  const student = await prisma.student.findUnique({ where: { id: studentId } });
  if (!student) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  const allSessions = await prisma.trainingSession.findMany({
    where: {
      learningTrack: student.learningTrack,
      status: { in: ["CLOSED", "EXPIRED"] },
    },
    orderBy: { startedAt: "desc" },
  });

  const attendanceRecords = await prisma.attendanceRecord.findMany({
    where: { studentId: student.id },
    orderBy: { checkInTime: "desc" },
  });

  const recordsBySessionId = new Map(attendanceRecords.map((r) => [r.sessionId, r]));

  const history = allSessions.map((s) => {
    const record = recordsBySessionId.get(s.id);
    const attended = record ? !record.isAbsent : false;
    return {
      session: {
        id: s.id,
        sessionName: s.sessionName,
        sessionCode: s.sessionCode,
        date: s.startedAt,
        learningTrack: s.learningTrack,
        location: s.location,
      },
      attended,
      record: record
        ? {
            id: record.id,
            checkInTime: record.checkInTime,
            verificationStatus: record.verificationStatus,
            isManualOverride: record.isManualOverride,
            overrideReason: record.overrideReason,
            overriddenAt: record.overriddenAt,
            isAbsent: record.isAbsent,
          }
        : null,
    };
  });

  const attended = history.filter((h) => h.attended).length;
  const missed = history.filter((h) => !h.attended).length;
  const rate = history.length > 0 ? Math.round((attended / history.length) * 100) : 0;

  return NextResponse.json({
    student,
    summary: { totalSessions: history.length, attended, missed, attendanceRate: rate },
    history,
  });
}
