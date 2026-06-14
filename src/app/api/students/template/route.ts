import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { generateStudentTemplate } from "@/lib/excel";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const buffer = generateStudentTemplate();

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="student_template.xlsx"',
      "Cache-Control": "no-store",
    },
  });
}
