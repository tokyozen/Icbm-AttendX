import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = Promise<{ id: string }>;

const extendSchema = z.object({
  additionalMinutes: z.number().int().min(1).max(120),
});

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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = extendSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 422 });
  }

  const { additionalMinutes } = parsed.data;
  const base = trainingSession.expiresAt;
  const newExpiry = new Date(base.getTime() + additionalMinutes * 60 * 1000);

  const updated = await prisma.trainingSession.update({
    where: { id },
    data: {
      expiresAt: newExpiry,
      status: trainingSession.status === "EXPIRED" ? "ACTIVE" : trainingSession.status,
    },
  });

  return NextResponse.json({ session: updated });
}
