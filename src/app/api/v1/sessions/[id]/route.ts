import { NextRequest, NextResponse } from "next/server";
import { requireApiKey } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiKey(req);
  if (auth) return auth;

  const { id } = await params;

  const session = await prisma.trainingSession.findUnique({
    where: { id },
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

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: session.id,
    sessionName: session.sessionName,
    sessionCode: session.sessionCode,
    learningTrack: session.learningTrack,
    location: session.location,
    status: session.status,
    startedAt: session.startedAt,
    endedAt: session.endedAt,
    instructor: session.instructor.name,
    attendeeCount: session.attendanceRecords.length,
    attendees: session.attendanceRecords.map((r) => ({
      applicationId: r.student.applicationId,
      fullName: r.student.fullName,
      gender: r.student.gender,
      learningTrack: r.student.learningTrack,
      trainingLocation: r.student.trainingLocation,
      email: r.student.email,
      checkInTime: r.checkInTime,
      verificationStatus: r.verificationStatus,
    })),
  });
}
