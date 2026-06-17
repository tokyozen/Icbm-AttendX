import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const role = (session.user as { role?: string }).role ?? "";
  if (role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";

  if (q.length < 2) {
    return NextResponse.json([]);
  }

  const students = await prisma.student.findMany({
    where: {
      isActive: true,
      OR: [
        { fullName: { contains: q, mode: "insensitive" } },
        { applicationId: { contains: q, mode: "insensitive" } },
      ],
    },
    take: 10,
    select: {
      id: true,
      fullName: true,
      applicationId: true,
      learningTrack: true,
      trainingLocation: true,
      gender: true,
    },
  });

  return NextResponse.json(students);
}
