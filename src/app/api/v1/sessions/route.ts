import { NextRequest, NextResponse } from "next/server";
import { requireApiKey } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const auth = await requireApiKey(req);
  if (auth) return auth;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const track = searchParams.get("track");
  const location = searchParams.get("location");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: Record<string, any> = {};
  if (status) where.status = status;
  if (track) where.learningTrack = track;
  if (location) where.location = location;
  if (from || to) {
    where.startedAt = {
      ...(from && { gte: new Date(from) }),
      ...(to && { lte: new Date(to) }),
    };
  }

  const sessions = await prisma.trainingSession.findMany({
    where,
    include: {
      _count: { select: { attendanceRecords: true } },
      instructor: { select: { name: true, email: true } },
    },
    orderBy: { startedAt: "desc" },
  });

  const result = sessions.map((s) => ({
    id: s.id,
    sessionName: s.sessionName,
    sessionCode: s.sessionCode,
    learningTrack: s.learningTrack,
    location: s.location,
    status: s.status,
    startedAt: s.startedAt,
    endedAt: s.endedAt,
    expiresAt: s.expiresAt,
    instructor: s.instructor.name,
    attendeeCount: s._count.attendanceRecords,
  }));

  return NextResponse.json({ count: result.length, sessions: result });
}
