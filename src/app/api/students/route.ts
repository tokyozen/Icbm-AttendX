import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function requireAdmin(role: string | null) {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}

const createSchema = z.object({
  applicationId: z.string().min(1, "Application ID is required"),
  fullName: z.string().min(1, "Full name is required"),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]),
  trainingLocation: z.string().min(1, "Training location is required"),
  learningTrack: z.string().min(1, "Learning track is required"),
});

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const role = (session.user as any).role as string;
  if (!requireAdmin(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search")?.trim() ?? "";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(500, Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10)));
  const skip = (page - 1) * limit;

  const where = search
    ? {
        OR: [
          { fullName: { contains: search, mode: "insensitive" as const } },
          { applicationId: { contains: search, mode: "insensitive" as const } },
        ],
      }
    : {};

  const [students, total] = await Promise.all([
    prisma.student.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.student.count({ where }),
  ]);

  return NextResponse.json({
    students,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const role = (session.user as any).role as string;
  if (!requireAdmin(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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

  try {
    const student = await prisma.student.create({ data: parsed.data });
    return NextResponse.json({ student }, { status: 201 });
  } catch (err: any) {
    if (err?.code === "P2002") {
      return NextResponse.json(
        { error: "A student with this Application ID already exists." },
        { status: 409 }
      );
    }
    throw err;
  }
}
