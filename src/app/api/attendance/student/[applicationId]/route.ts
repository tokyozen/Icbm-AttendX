import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDateTrackGroups, resolveDateStatus, type RecordLike } from "@/lib/attendance-status";

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

  const { groups, sessionLocationMap, dates } = await getDateTrackGroups(student.learningTrack);

  const attendanceRecords = await prisma.attendanceRecord.findMany({
    where: { studentId: student.id },
  });
  const recordsBySessionId = new Map<string, RecordLike>();
  for (const r of attendanceRecords) {
    recordsBySessionId.set(r.sessionId, {
      checkInTime: r.checkInTime,
      verificationStatus: r.verificationStatus,
      isAbsent: r.isAbsent,
    });
  }
  const sessionMetaById = new Map(
    [...groups.values()].flatMap((g) => g.sessions).map((s) => [s.id, s])
  );

  const history = [...dates]
    .reverse()
    .map((date) => {
      const group = groups.get(`${date}|${student.learningTrack}`);
      const result = resolveDateStatus({ group, sessionLocationMap, trainingLocation: student.trainingLocation, recordsBySessionId });
      if (result.status === "no-session" || !group) return null;

      const representativeSession = sessionMetaById.get(result.sessionId) ?? group.sessions[0];
      const attended = result.status === "present";

      return {
        sessionId: representativeSession.id,
        sessionName: representativeSession.sessionName,
        date: representativeSession.startedAt,
        attended,
        checkInTime: attended ? result.record?.checkInTime ?? null : null,
        verificationStatus: attended ? result.record?.verificationStatus ?? null : null,
      };
    })
    .filter((h): h is NonNullable<typeof h> => h !== null);

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
