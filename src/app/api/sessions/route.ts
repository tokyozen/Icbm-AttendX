import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateQRToken, generateSessionCode } from "@/lib/qr";
const createSchema = z.object({
  sessionName: z.string().min(1, "Session name is required"),
  location: z.string().min(1, "Location is required"),
  learningTrack: z.string().min(1, "Learning track is required"),
  durationMinutes: z.number().int().min(1).max(480).optional(),
});

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = (session.user as any).role as string;
  const userId = session.user.id as string;
  const { searchParams } = new URL(request.url);

  const statusFilter = searchParams.get("status");
  const locationFilter = searchParams.get("location");
  const trackFilter = searchParams.get("track");
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, parseInt(searchParams.get("limit") ?? "20", 10));
  const skip = (page - 1) * limit;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: Record<string, any> = {};

  if (role === "INSTRUCTOR") where.instructorId = userId;
  if (statusFilter) where.status = statusFilter;
  if (locationFilter) where.location = locationFilter;
  if (trackFilter) where.learningTrack = trackFilter;

  const [sessions, total] = await Promise.all([
    prisma.trainingSession.findMany({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      where: where as any,
      include: {
        instructor: { select: { id: true, name: true, email: true } },
        _count: { select: { attendanceRecords: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    prisma.trainingSession.count({ where: where as any }),
  ]);

  return NextResponse.json({ sessions, total, page, totalPages: Math.ceil(total / limit) });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 422 }
    );
  }

  const { sessionName, location, learningTrack, durationMinutes = 60 } = parsed.data;
  const instructorId = session.user.id as string;

  const sessionCode = generateSessionCode();
  const qrToken = generateQRToken();
  const startedAt = new Date();
  const expiresAt = new Date(startedAt.getTime() + durationMinutes * 60 * 1000);

  const trainingSession = await prisma.trainingSession.create({
    data: {
      sessionName,
      sessionCode,
      location,
      learningTrack,
      instructorId,
      qrToken,
      startedAt,
      expiresAt,
      status: "ACTIVE",
    },
  });

  return NextResponse.json({ session: trainingSession }, { status: 201 });
}
