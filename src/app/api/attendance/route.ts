import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = (session.user as { role?: string }).role ?? "INSTRUCTOR";
  const userId = session.user.id as string;
  const { searchParams } = new URL(request.url);

  const sessionId = searchParams.get("sessionId");
  const date = searchParams.get("date");
  const location = searchParams.get("location");
  const track = searchParams.get("track");
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(200, parseInt(searchParams.get("limit") ?? "50", 10));
  const skip = (page - 1) * limit;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: Record<string, any> = {};

  if (sessionId) where.sessionId = sessionId;
  if (location) where.trainingLocation = location;
  if (track) where.learningTrack = track;
  if (date) {
    const day = new Date(date);
    const dayEnd = new Date(day);
    dayEnd.setDate(dayEnd.getDate() + 1);
    where.checkInTime = { gte: day, lt: dayEnd };
  }

  // INSTRUCTOR sees only records from their own sessions
  if (role === "INSTRUCTOR") {
    where.session = { instructorId: userId };
  }

  const [records, total] = await Promise.all([
    prisma.attendanceRecord.findMany({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      where: where as any,
      include: {
        student: { select: { applicationId: true, fullName: true } },
        session: { select: { sessionName: true, location: true } },
      },
      orderBy: { checkInTime: "desc" },
      skip,
      take: limit,
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    prisma.attendanceRecord.count({ where: where as any }),
  ]);

  return NextResponse.json({
    records,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}
