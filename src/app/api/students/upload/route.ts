import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseStudentExcel, normalizeGender } from "@/lib/excel";

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!["ADMIN", "SUPER_ADMIN"].includes((session.user as any).role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "File exceeds 10 MB limit" }, { status: 413 });
  }

  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext !== "xlsx" && ext !== "xls") {
    return NextResponse.json(
      { error: "Only .xlsx and .xls files are accepted" },
      { status: 415 }
    );
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  let rows: ReturnType<typeof parseStudentExcel>;
  try {
    rows = parseStudentExcel(buffer);
  } catch {
    return NextResponse.json({ error: "Could not parse Excel file" }, { status: 422 });
  }

  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const row of rows) {
    if (!row.applicationId || !row.fullName) {
      skipped++;
      continue;
    }

    const gender = normalizeGender(row.gender);
    const data = {
      fullName: row.fullName,
      gender,
      trainingLocation: row.trainingLocation || "Unknown",
      learningTrack: row.learningTrack || "Unknown",
      isActive: true,
    };

    try {
      const existing = await prisma.student.findUnique({
        where: { applicationId: row.applicationId },
      });

      if (existing) {
        await prisma.student.update({
          where: { id: existing.id },
          data,
        });
        updated++;
      } else {
        await prisma.student.create({
          data: { applicationId: row.applicationId, ...data },
        });
        inserted++;
      }
    } catch (err: any) {
      errors.push(
        `[${row.applicationId}] ${err?.message ?? "Unknown error"}`
      );
    }
  }

  return NextResponse.json({ inserted, updated, skipped, errors });
}
