import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getDateTrackGroups, resolveDateStatus, type RecordLike } from "@/lib/attendance-status";

function dayLabel(date: Date) {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${days[date.getUTCDay()]} ${String(date.getUTCDate()).padStart(2, "0")} ${months[date.getUTCMonth()]}`;
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = session.user as { role: string; learningTrack?: string | null };
  const role = user.role;

  const { searchParams } = new URL(request.url);
  const campus = searchParams.get("campus") || "All";
  const trackParam = searchParams.get("track");

  // Instructors are always scoped to their own track; admins may optionally filter
  const effectiveTrack = role === "INSTRUCTOR" ? user.learningTrack ?? null : trackParam;

  const { groups, sessionLocationMap, dates: allDates } = await getDateTrackGroups(effectiveTrack ?? undefined);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const studentWhere: Record<string, any> = { isActive: true };
  if (effectiveTrack) studentWhere.learningTrack = effectiveTrack;
  if (campus !== "All") {
    studentWhere.OR = [{ trainingLocation: campus }, { trainingLocation: "Both Campuses" }];
  }

  const students = await prisma.student.findMany({
    where: studentWhere,
    orderBy: [{ learningTrack: "asc" }, { fullName: "asc" }],
  });

  const studentIds = students.map((s) => s.id);
  const records = await prisma.attendanceRecord.findMany({
    where: { studentId: { in: studentIds } },
    select: { studentId: true, sessionId: true, checkInTime: true, verificationStatus: true, isAbsent: true },
  });

  const recordsByStudent = new Map<string, Map<string, RecordLike>>();
  for (const r of records) {
    if (!recordsByStudent.has(r.studentId)) recordsByStudent.set(r.studentId, new Map());
    recordsByStudent.get(r.studentId)!.set(r.sessionId, {
      checkInTime: r.checkInTime,
      verificationStatus: r.verificationStatus,
      isAbsent: r.isAbsent,
    });
  }

  const studentRows = students.map((student, idx) => {
    const attendance: Record<
      string,
      { status: "present" | "absent" | "no-session"; checkInTime?: string; verificationStatus?: string }
    > = {};

    let daysPresent = 0;
    let totalSessions = 0;
    const recordsBySessionId = recordsByStudent.get(student.id) ?? new Map<string, RecordLike>();

    for (const date of allDates) {
      const group = groups.get(`${date}|${student.learningTrack}`);
      const result = resolveDateStatus({
        group,
        sessionLocationMap,
        trainingLocation: student.trainingLocation,
        recordsBySessionId,
      });

      if (result.status === "no-session") {
        attendance[date] = { status: "no-session" };
        continue;
      }

      totalSessions++;
      if (result.status === "present") {
        daysPresent++;
        attendance[date] = {
          status: "present",
          checkInTime: result.record!.checkInTime.toISOString(),
          verificationStatus: result.record!.verificationStatus,
        };
      } else {
        attendance[date] = { status: "absent" };
      }
    }

    return {
      sn: idx + 1,
      id: student.id,
      applicationId: student.applicationId,
      fullName: student.fullName,
      gender: student.gender,
      learningTrack: student.learningTrack,
      trainingLocation: student.trainingLocation,
      daysPresent,
      totalSessions,
      attendanceRate: totalSessions > 0 ? Math.round((daysPresent / totalSessions) * 100) : 0,
      attendance,
    };
  });

  return NextResponse.json({
    dates: allDates,
    dateLabels: Object.fromEntries(allDates.map((d) => [d, dayLabel(new Date(d + "T00:00:00Z"))])),
    students: studentRows,
    tracks: [...new Set(students.map((s) => s.learningTrack))].sort(),
    summary: {
      totalStudents: students.length,
      totalSessions: allDates.length,
      totalCheckIns: records.filter((r) => !r.isAbsent).length,
    },
  });
}
