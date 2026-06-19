import { NextRequest, NextResponse } from "next/server";
import { requireApiKey } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ applicationId: string }> }
) {
  const auth = await requireApiKey(req);
  if (auth) return auth;

  const { applicationId } = await params;

  const student = await prisma.student.findUnique({
    where: { applicationId },
    include: {
      attendanceRecords: {
        where: { isAbsent: false },
        include: {
          session: {
            select: {
              id: true,
              sessionName: true,
              startedAt: true,
              endedAt: true,
              learningTrack: true,
              location: true,
              status: true,
            },
          },
        },
        orderBy: { checkInTime: "desc" },
      },
    },
  });

  if (!student) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  const allSessions = await prisma.trainingSession.count({
    where: {
      learningTrack: student.learningTrack,
      status: { in: ["CLOSED", "EXPIRED"] },
      OR: [{ location: student.trainingLocation }, { location: "Both Campuses" }],
    },
  });

  const attended = student.attendanceRecords.length;
  const missed = allSessions - attended;

  return NextResponse.json({
    applicationId: student.applicationId,
    fullName: student.fullName,
    gender: student.gender,
    learningTrack: student.learningTrack,
    trainingLocation: student.trainingLocation,
    email: student.email,
    phone: student.phoneNumber,
    attendance: {
      totalSessions: allSessions,
      sessionsAttended: attended,
      sessionsMissed: missed,
      attendanceRate: allSessions > 0 ? Math.round((attended / allSessions) * 100) : 0,
    },
    history: student.attendanceRecords.map((r) => ({
      sessionId: r.session.id,
      sessionName: r.session.sessionName,
      date: r.session.startedAt,
      checkInTime: r.checkInTime,
      location: r.session.location,
      status: "PRESENT",
    })),
  });
}
