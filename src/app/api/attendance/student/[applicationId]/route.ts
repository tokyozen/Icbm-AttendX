import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ applicationId: string }> }
) {
  const { applicationId } = await params;
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Missing session token" }, { status: 400 });
  }

  const session = await prisma.trainingSession.findUnique({ where: { qrToken: token } });
  if (!session) {
    return NextResponse.json({ error: "Invalid session token" }, { status: 401 });
  }

  const student = await prisma.student.findUnique({
    where: { applicationId: applicationId.toUpperCase() },
  });

  if (!student || student.learningTrack !== session.learningTrack) {
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

  const history = allSessions.map((session) => {
    const record = recordsBySessionId.get(session.id);
    const attended = !!record && !record.isAbsent;
    return {
      sessionId: session.id,
      sessionName: session.sessionName,
      date: session.startedAt,
      attended,
      checkInTime: attended ? record?.checkInTime ?? null : null,
      verificationStatus: attended ? record?.verificationStatus ?? null : null,
    };
  });

  const attended = history.filter((h) => h.attended).length;
  const missed = history.filter((h) => !h.attended).length;
  const rate = history.length > 0 ? Math.round((attended / history.length) * 100) : 0;

  return NextResponse.json({
    student: {
      id: student.id,
      fullName: student.fullName,
      applicationId: student.applicationId,
      learningTrack: student.learningTrack,
      trainingLocation: student.trainingLocation,
      gender: student.gender,
    },
    summary: {
      totalSessions: history.length,
      attended,
      missed,
      attendanceRate: rate,
    },
    history,
  });
}
