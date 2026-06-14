import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import SessionsClient from "@/components/sessions/SessionsClient";

export default async function SessionsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const role = (session.user as any).role as string;
  const userId = session.user.id as string;

  const where = role === "INSTRUCTOR" ? { instructorId: userId } : {};

  const sessions = await prisma.trainingSession.findMany({
    where,
    include: {
      instructor: { select: { id: true, name: true } },
      _count: { select: { attendanceRecords: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const serialized = sessions.map((s) => ({
    id: s.id,
    sessionName: s.sessionName,
    sessionCode: s.sessionCode,
    location: s.location,
    learningTrack: s.learningTrack,
    status: s.status as string,
    startedAt: s.startedAt.toISOString(),
    expiresAt: s.expiresAt.toISOString(),
    endedAt: s.endedAt?.toISOString() ?? null,
    instructor: s.instructor,
    _count: s._count,
  }));

  return <SessionsClient initialSessions={serialized} userRole={role} />;
}
