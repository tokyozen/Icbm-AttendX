import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  role: z.enum(["SUPER_ADMIN", "ADMIN", "INSTRUCTOR"]).optional(),
  location: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

async function requireSuperAdmin() {
  const session = await auth();
  if (!session?.user) return null;
  const role = (session.user as { role?: string }).role ?? "";
  if (role !== "SUPER_ADMIN") return null;
  return session;
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSuperAdmin();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 422 }
    );
  }

  const user = await prisma.user.update({
    where: { id },
    data: parsed.data,
    select: { id: true, name: true, email: true, role: true, location: true, isActive: true },
  });

  return NextResponse.json({ user });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSuperAdmin();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  // Prevent self-deletion
  if (id === session.user?.id) {
    return NextResponse.json({ error: "Cannot deactivate your own account" }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id },
    data: { isActive: false },
    select: { id: true, name: true, isActive: true },
  });

  return NextResponse.json({ user });
}
