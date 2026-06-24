import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  buildAttendanceRecordWhere,
  buildSessionWhere,
  readAttendanceFilterParams,
} from "@/lib/attendance-filters";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = (session.user as { role?: string }).role ?? "INSTRUCTOR";
  const userId = session.user.id as string;
  const { searchParams } = new URL(request.url);
  const params = readAttendanceFilterParams(searchParams);

  const recordWhere = buildAttendanceRecordWhere(params, { role, userId });
  const sessionWhere = buildSessionWhere(params, { role, userId });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const studentWhere: Record<string, any> = { isActive: true };
  if (params.location) studentWhere.trainingLocation = params.location;
  if (params.track) studentWhere.learningTrack = params.track;

  const [totalStudents, totalRecords, presentRecords, absentStudentIds, activeSessions] = await Promise.all([
    prisma.student.count({ where: studentWhere }),
    prisma.attendanceRecord.count({ where: recordWhere }),
    prisma.attendanceRecord.count({ where: { ...recordWhere, isAbsent: false } }),
    prisma.attendanceRecord.findMany({
      where: { ...recordWhere, isAbsent: true },
      select: { studentId: true },
      distinct: ["studentId"],
    }),
    prisma.trainingSession.count({ where: { ...sessionWhere, status: "ACTIVE" } }),
  ]);

  return NextResponse.json({
    totalStudents,
    totalRecords,
    presentRecords,
    absentStudents: absentStudentIds.length,
    activeSessions,
    attendanceRate: totalRecords > 0 ? Math.round((presentRecords / totalRecords) * 100) : 0,
  });
}
