import { NextRequest, NextResponse } from "next/server";
import { requireApiKey } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const auth = await requireApiKey(req);
  if (auth) return auth;

  const { searchParams } = new URL(req.url);
  const track = searchParams.get("track");
  const location = searchParams.get("location");

  const activeSessions = await prisma.trainingSession.findMany({
    where: {
      status: "ACTIVE",
      ...(track && { learningTrack: track }),
      ...(location && { location }),
    },
    include: {
      instructor: { select: { name: true, email: true } },
      attendanceRecords: {
        where: { isAbsent: false },
        include: {
          student: {
            select: {
              applicationId: true,
              fullName: true,
              gender: true,
              learningTrack: true,
              trainingLocation: true,
              email: true,
            },
          },
        },
        orderBy: { checkInTime: "asc" },
      },
    },
  });

  const result = activeSessions.map((session) => ({
    id: session.id,
    sessionName: session.sessionName,
    sessionCode: session.sessionCode,
    learningTrack: session.learningTrack,
    location: session.location,
    startedAt: session.startedAt,
    expiresAt: session.expiresAt,
    instructor: session.instructor.name,
    checkedInCount: session.attendanceRecords.length,
    attendees: session.attendanceRecords.map((r) => ({
      applicationId: r.student.applicationId,
      fullName: r.student.fullName,
      gender: r.student.gender,
      learningTrack: r.student.learningTrack,
      trainingLocation: r.student.trainingLocation,
      email: r.student.email,
      checkInTime: r.checkInTime,
    })),
  }));

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    activeSessions: result.length,
    sessions: result,
  });
}
