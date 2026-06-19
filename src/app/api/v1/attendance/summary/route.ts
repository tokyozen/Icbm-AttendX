import { NextRequest, NextResponse } from "next/server";
import { requireApiKey } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const auth = await requireApiKey(req);
  if (auth) return auth;

  const { searchParams } = new URL(req.url);
  const track = searchParams.get("track");
  const location = searchParams.get("location");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const sessionDateFilter =
    from || to
      ? {
          startedAt: {
            ...(from && { gte: new Date(from) }),
            ...(to && { lte: new Date(to) }),
          },
        }
      : {};

  const checkInDateFilter =
    from || to
      ? {
          checkInTime: {
            ...(from && { gte: new Date(from) }),
            ...(to && { lte: new Date(to) }),
          },
        }
      : {};

  const [totalSessions, totalRecords, students] = await Promise.all([
    prisma.trainingSession.count({
      where: {
        status: { in: ["CLOSED", "EXPIRED"] },
        ...(track && { learningTrack: track }),
        ...(location && { location }),
        ...sessionDateFilter,
      },
    }),
    prisma.attendanceRecord.count({
      where: {
        isAbsent: false,
        ...(track && { learningTrack: track }),
        ...(location && { trainingLocation: location }),
        ...checkInDateFilter,
      },
    }),
    prisma.student.count({
      where: {
        isActive: true,
        ...(track && { learningTrack: track }),
        ...(location && { trainingLocation: location }),
      },
    }),
  ]);

  const byTrack = await prisma.attendanceRecord.groupBy({
    by: ["learningTrack"],
    where: {
      isAbsent: false,
      ...(location && { trainingLocation: location }),
      ...checkInDateFilter,
    },
    _count: { id: true },
  });

  const byLocation = await prisma.attendanceRecord.groupBy({
    by: ["trainingLocation"],
    where: {
      isAbsent: false,
      ...(track && { learningTrack: track }),
      ...checkInDateFilter,
    },
    _count: { id: true },
  });

  return NextResponse.json({
    period: {
      from: from || "all time",
      to: to || "now",
    },
    filters: { track, location },
    summary: {
      totalStudents: students,
      totalSessions,
      totalCheckIns: totalRecords,
      averageAttendanceRate:
        totalSessions > 0 && students > 0
          ? Math.round((totalRecords / (totalSessions * students)) * 100)
          : 0,
    },
    byTrack: byTrack.map((t) => ({
      track: t.learningTrack,
      checkIns: t._count.id,
    })),
    byLocation: byLocation.map((l) => ({
      location: l.trainingLocation,
      checkIns: l._count.id,
    })),
  });
}
