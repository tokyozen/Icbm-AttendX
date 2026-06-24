import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getDateTrackGroups, resolveDateStatus, type RecordLike } from "@/lib/attendance-status";

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

  const { groups, sessionLocationMap, dates } = await getDateTrackGroups(student.learningTrack);

  const attendanceRecords = await prisma.attendanceRecord.findMany({
    where: { studentId: student.id },
  });
  const recordsBySessionId = new Map<string, RecordLike & { id: string; isManualOverride: boolean; overrideReason: string | null; overriddenAt: Date | null }>();
  for (const r of attendanceRecords) {
    recordsBySessionId.set(r.sessionId, {
      id: r.id,
      checkInTime: r.checkInTime,
      verificationStatus: r.verificationStatus,
      isAbsent: r.isAbsent,
      isManualOverride: r.isManualOverride,
      overrideReason: r.overrideReason,
      overriddenAt: r.overriddenAt,
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
      const record = result.record;

      return {
        session: {
          id: representativeSession.id,
          sessionName: representativeSession.sessionName,
          sessionCode: representativeSession.sessionCode,
          date: representativeSession.startedAt,
          learningTrack: representativeSession.learningTrack,
          location: representativeSession.location,
        },
        attended: result.status === "present",
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
    })
    .filter((h): h is NonNullable<typeof h> => h !== null);

  const attended = history.filter((h) => h.attended).length;
  const missed = history.filter((h) => !h.attended).length;
  const rate = history.length > 0 ? Math.round((attended / history.length) * 100) : 0;

  return NextResponse.json({
    student,
    summary: { totalSessions: history.length, attended, missed, attendanceRate: rate },
    history,
  });
}
