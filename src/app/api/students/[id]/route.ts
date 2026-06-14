import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function requireAdmin(role: string | null) {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}

const updateSchema = z.object({
  applicationId: z.string().min(1).optional(),
  fullName: z.string().min(1).optional(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
  trainingLocation: z.string().min(1).optional(),
  learningTrack: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
});

type Params = Promise<{ id: string }>;

export async function GET(request: Request, { params }: { params: Params }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!requireAdmin((session.user as any).role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const student = await prisma.student.findUnique({ where: { id } });
  if (!student) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }
  return NextResponse.json({ student });
}

export async function PUT(request: Request, { params }: { params: Params }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!requireAdmin((session.user as any).role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 422 }
    );
  }

  try {
    const student = await prisma.student.update({
      where: { id },
      data: parsed.data,
    });
    return NextResponse.json({ student });
  } catch (err: any) {
    if (err?.code === "P2025") {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }
    if (err?.code === "P2002") {
      return NextResponse.json(
        { error: "Application ID already in use." },
        { status: 409 }
      );
    }
    throw err;
  }
}

export async function DELETE(request: Request, { params }: { params: Params }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!requireAdmin((session.user as any).role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  try {
    await prisma.student.update({
      where: { id },
      data: { isActive: false },
    });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    if (err?.code === "P2025") {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }
    throw err;
  }
}
