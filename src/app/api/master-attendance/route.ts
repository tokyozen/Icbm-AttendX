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
  const dateTrackMap = new Map<string, { sessionIds: string[] }>();
  const sessionLocationMap = new Map<string, string>();
  for (const s of sessions) {
    const date = s.startedAt.toISOString().split("T")[0];
    const key = `${date}|${s.learningTrack}`;
    if (!dateTrackMap.has(key)) dateTrackMap.set(key, { sessionIds: [] });
    dateTrackMap.get(key)!.sessionIds.push(s.id);
    sessionLocationMap.set(s.id, s.location);
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
    where: { studentId: { in: studentIds } },
    select: { studentId: true, sessionId: true, checkInTime: true, verificationStatus: true, isAbsent: true },
  });

  const recordMap = new Map<string, { checkInTime: Date; verificationStatus: string; isAbsent: boolean }>();
  for (const r of records) {
    recordMap.set(`${r.studentId}|${r.sessionId}`, {
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

    for (const date of allDates) {
      const entry = dateTrackMap.get(`${date}|${student.learningTrack}`);
      if (!entry) {
        attendance[date] = { status: "no-session" };
        continue;
      }

      const found = entry.sessionIds.map((sid) => recordMap.get(`${student.id}|${sid}`)).find((r) => r !== undefined);

      // A date+track applies to a student if at least one session that day
      // was for their campus or Both Campuses. An explicit record (a check-in or
      // a manual absence override) always counts, even if the session happened
      // to be tagged to the other campus.
      const applies =
        !!found ||
        entry.sessionIds.some((sid) => {
          const sessionLocation = sessionLocationMap.get(sid) ?? "Both Campuses";
          return (
            sessionLocation === "Both Campuses" ||
            sessionLocation === student.trainingLocation ||
            student.trainingLocation === "Both Campuses"
          );
        });

      if (!applies) {
        attendance[date] = { status: "no-session" };
        continue;
      }

      totalSessions++;

      if (found && !found.isAbsent) {
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
      totalCheckIns: records.filter((r) => !r.isAbsent).length,
    },
  });
}
