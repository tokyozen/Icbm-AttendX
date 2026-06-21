import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sessionWhere: Record<string, any> = { status: { in: ["CLOSED", "EXPIRED"] } };
  if (effectiveTrack) sessionWhere.learningTrack = effectiveTrack;

  const sessions = await prisma.trainingSession.findMany({
    where: sessionWhere,
    orderBy: { startedAt: "asc" },
    select: { id: true, learningTrack: true, startedAt: true, location: true },
  });

  // Deduplicate sessions by date+track — multiple sessions same day/track = one column
  const dateTrackMap = new Map<string, { sessionIds: string[]; location: string }>();
  for (const s of sessions) {
    const date = s.startedAt.toISOString().split("T")[0];
    const key = `${date}|${s.learningTrack}`;
    if (!dateTrackMap.has(key)) dateTrackMap.set(key, { sessionIds: [], location: s.location });
    dateTrackMap.get(key)!.sessionIds.push(s.id);
  }

  const allDates = [...new Set(sessions.map((s) => s.startedAt.toISOString().split("T")[0]))].sort();

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
    where: { studentId: { in: studentIds }, isAbsent: false },
    select: { studentId: true, sessionId: true, checkInTime: true, verificationStatus: true },
  });

  const recordMap = new Map<string, { checkInTime: Date; verificationStatus: string }>();
  for (const r of records) {
    recordMap.set(`${r.studentId}|${r.sessionId}`, {
      checkInTime: r.checkInTime,
      verificationStatus: r.verificationStatus,
    });
  }

  const studentRows = students.map((student, idx) => {
    const attendance: Record<
      string,
      { status: "present" | "absent" | "no-session"; checkInTime?: string; verificationStatus?: string }
    > = {};

    let daysPresent = 0;
    let totalSessions = 0;

    for (const date of allDates) {
      const entry = dateTrackMap.get(`${date}|${student.learningTrack}`);
      if (!entry) {
        attendance[date] = { status: "no-session" };
        continue;
      }

      const applies =
        entry.location === "Both Campuses" ||
        entry.location === student.trainingLocation ||
        student.trainingLocation === "Both Campuses";

      if (!applies) {
        attendance[date] = { status: "no-session" };
        continue;
      }

      totalSessions++;
      const found = entry.sessionIds.map((sid) => recordMap.get(`${student.id}|${sid}`)).find((r) => r !== undefined);

      if (found) {
        daysPresent++;
        attendance[date] = {
          status: "present",
          checkInTime: found.checkInTime.toISOString(),
          verificationStatus: found.verificationStatus,
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
      totalCheckIns: records.length,
    },
  });
}
