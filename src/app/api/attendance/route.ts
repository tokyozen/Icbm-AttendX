import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildAttendanceRecordWhere, readAttendanceFilterParams } from "@/lib/attendance-filters";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = (session.user as { role?: string }).role ?? "INSTRUCTOR";
  const userId = session.user.id as string;
  const { searchParams } = new URL(request.url);

  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(200, parseInt(searchParams.get("limit") ?? "50", 10));
  const skip = (page - 1) * limit;

  const where = buildAttendanceRecordWhere(readAttendanceFilterParams(searchParams), { role, userId });

  const [records, total] = await Promise.all([
    prisma.attendanceRecord.findMany({
      where,
      include: {
        student: { select: { applicationId: true, fullName: true } },
        session: { select: { sessionName: true, location: true } },
      },
      orderBy: { checkInTime: "desc" },
      skip,
      take: limit,
    }),
    prisma.attendanceRecord.count({ where }),
  ]);

  return NextResponse.json({
    records,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}
