import { NextRequest, NextResponse } from "next/server";
import { requireApiKey } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const auth = await requireApiKey(req);
  if (auth) return auth;

  const { searchParams } = new URL(req.url);
  const track = searchParams.get("track");
  const location = searchParams.get("location");

  const students = await prisma.student.findMany({
    where: {
      isActive: true,
      ...(track && { learningTrack: track }),
      ...(location && { trainingLocation: location }),
    },
    include: {
      attendanceRecords: {
        where: { isAbsent: false },
      },
    },
    orderBy: { fullName: "asc" },
  });

  // Total session count depends on a student's (track, location) pair, since a
  // session only counts toward a student if it's at their location or "Both Campuses".
  // Resolve all distinct pairs up front so we issue one count query per pair
  // instead of one per student (which can exhaust the DB connection pool).
  const pairs = new Map<string, { learningTrack: string; trainingLocation: string }>();
  for (const student of students) {
    pairs.set(`${student.learningTrack}::${student.trainingLocation}`, {
      learningTrack: student.learningTrack,
      trainingLocation: student.trainingLocation,
    });
  }

  const sessionTotals = new Map<string, number>();
  for (const [cacheKey, pair] of pairs) {
    const count = await prisma.trainingSession.count({
      where: {
        learningTrack: pair.learningTrack,
        status: { in: ["CLOSED", "EXPIRED"] },
        OR: [{ location: pair.trainingLocation }, { location: "Both Campuses" }],
      },
    });
    sessionTotals.set(cacheKey, count);
  }

  const result = students.map((student) => {
    const attended = student.attendanceRecords.length;
    const totalForStudent = sessionTotals.get(`${student.learningTrack}::${student.trainingLocation}`) ?? 0;
    return {
      applicationId: student.applicationId,
      fullName: student.fullName,
      gender: student.gender,
      learningTrack: student.learningTrack,
      trainingLocation: student.trainingLocation,
      email: student.email,
      phone: student.phoneNumber,
      attendance: {
        sessionsAttended: attended,
        attendanceRate: totalForStudent > 0 ? Math.round((attended / totalForStudent) * 100) : 0,
      },
    };
  });

  return NextResponse.json({ count: result.length, students: result });
}
