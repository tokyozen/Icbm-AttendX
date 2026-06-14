import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDeviceType, getBrowser } from "@/lib/utils";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { qrToken, applicationId } = body as {
    qrToken?: string;
    applicationId?: string;
  };

  if (!qrToken || !applicationId) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Step 1: Validate session
  const session = await prisma.trainingSession.findUnique({
    where: { qrToken },
  });

  if (!session) {
    return NextResponse.json({ error: "Invalid QR token" }, { status: 401 });
  }

  if (session.status === "CLOSED") {
    return NextResponse.json({ error: "This session has ended" }, { status: 410 });
  }

  const now = new Date();
  if (session.expiresAt < now || session.status === "EXPIRED") {
    if (session.status === "ACTIVE") {
      await prisma.trainingSession.update({
        where: { id: session.id },
        data: { status: "EXPIRED" },
      });
    }
    return NextResponse.json({ error: "This QR code has expired" }, { status: 410 });
  }

  // Step 2: Look up student
  const student = await prisma.student.findFirst({
    where: { applicationId, isActive: true },
  });

  if (!student) {
    return NextResponse.json(
      { error: "Application ID not found. Please check your ID card." },
      { status: 404 }
    );
  }

  // Step 3/4: Create record — unique constraint (sessionId, studentId) catches duplicates
  const userAgent = request.headers.get("user-agent") ?? "";
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";

  try {
    const record = await prisma.attendanceRecord.create({
      data: {
        sessionId: session.id,
        studentId: student.id,
        applicationId: student.applicationId,
        fullName: student.fullName,
        gender: student.gender,
        trainingLocation: student.trainingLocation,
        learningTrack: student.learningTrack,
        deviceType: getDeviceType(userAgent),
        browser: getBrowser(userAgent),
        ipAddress: ip,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Attendance recorded",
      data: {
        fullName: student.fullName,
        checkInTime: record.checkInTime.toISOString(),
        sessionName: session.sessionName,
      },
    });
  } catch (error: unknown) {
    // P2002 = unique constraint violation → already checked in
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code: string }).code === "P2002"
    ) {
      return NextResponse.json(
        {
          error: "already_checked_in",
          message: "You are already marked present for this session.",
        },
        { status: 409 }
      );
    }
    throw error;
  }
}
