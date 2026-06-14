import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const session = await prisma.trainingSession.findUnique({
    where: { qrToken: token },
    include: { instructor: { select: { name: true } } },
  });

  if (!session) {
    return NextResponse.json({ error: "Invalid QR code" }, { status: 404 });
  }

  if (session.status === "CLOSED") {
    return NextResponse.json({ error: "This session has ended" }, { status: 410 });
  }

  const now = new Date();
  if (session.expiresAt < now && session.status === "ACTIVE") {
    await prisma.trainingSession.update({
      where: { id: session.id },
      data: { status: "EXPIRED" },
    });
    return NextResponse.json({ error: "This QR code has expired" }, { status: 410 });
  }

  if (session.status === "EXPIRED") {
    return NextResponse.json({ error: "This QR code has expired" }, { status: 410 });
  }

  return NextResponse.json({
    sessionId: session.id,
    sessionName: session.sessionName,
    location: session.location,
    learningTrack: session.learningTrack,
    instructorName: session.instructor.name,
    expiresAt: session.expiresAt.toISOString(),
    startedAt: session.startedAt.toISOString(),
  });
}
