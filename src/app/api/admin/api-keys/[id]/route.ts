import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function requireSuperAdmin() {
  const session = await auth();
  if (!session?.user) return null;
  const role = (session.user as { role?: string }).role ?? "";
  if (role !== "SUPER_ADMIN") return null;
  return session;
}

const patchSchema = z.object({
  isActive: z.boolean(),
});

export async function PATCH(
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

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 422 }
    );
  }

  try {
    const updated = await prisma.apiKey.update({
      where: { id },
      data: { isActive: parsed.data.isActive },
    });
    return NextResponse.json({ success: true, isActive: updated.isActive });
  } catch (err: any) {
    if (err?.code === "P2025") {
      return NextResponse.json({ error: "API key not found" }, { status: 404 });
    }
    throw err;
  }
}
