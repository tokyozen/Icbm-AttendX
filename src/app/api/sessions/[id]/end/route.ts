import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = Promise<{ id: string }>;

export async function POST(request: Request, { params }: { params: Params }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const role = (session.user as any).role as string;
  const userId = session.user.id as string;

  const trainingSession = await prisma.trainingSession.findUnique({ where: { id } });
  if (!trainingSession) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const isOwner = trainingSession.instructorId === userId;
  const isAdmin = role === "ADMIN" || role === "SUPER_ADMIN";
  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const updated = await prisma.trainingSession.update({
    where: { id },
    data: { status: "CLOSED", endedAt: new Date() },
  });

  return NextResponse.json({ session: updated });
}
