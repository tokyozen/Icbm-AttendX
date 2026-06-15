import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = Promise<{ id: string }>;

export async function PATCH(request: Request, { params }: { params: Params }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const userId = session.user.id as string;
  const role = (session.user as { role?: string }).role ?? "";

  const body = await request.json();
  const status = body?.status as string | undefined;

  if (!["PENDING", "VERIFIED", "FLAGGED"].includes(status ?? "")) {
    return NextResponse.json(
      { error: "status must be PENDING, VERIFIED, or FLAGGED" },
      { status: 400 }
    );
  }

  const record = await prisma.attendanceRecord.findUnique({
    where: { id },
    include: { session: { select: { instructorId: true } } },
  });

  if (!record) {
    return NextResponse.json({ error: "Record not found" }, { status: 404 });
  }

  const isOwner = record.session.instructorId === userId;
  const isAdmin = ["ADMIN", "SUPER_ADMIN"].includes(role);

  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const updated = await prisma.attendanceRecord.update({
    where: { id },
    data: {
      verificationStatus: status as "PENDING" | "VERIFIED" | "FLAGGED",
      verifiedAt: status !== "PENDING" ? new Date() : null,
      verifiedBy: status !== "PENDING" ? userId : null,
    },
  });

  return NextResponse.json({ record: updated });
}
