import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Simple in-memory rate limiter — resets on server restart, sufficient for v1
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }

  if (entry.count >= 20) return false;
  entry.count++;
  return true;
}

async function getActiveSession(token: string) {
  const session = await prisma.trainingSession.findUnique({
    where: { qrToken: token },
  });

  if (!session || session.status === "CLOSED" || session.status === "EXPIRED") {
    return null;
  }

  const now = new Date();
  if (session.expiresAt < now) {
    if (session.status === "ACTIVE") {
      await prisma.trainingSession.update({
        where: { id: session.id },
        data: { status: "EXPIRED" },
      });
    }
    return null;
  }

  return session;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ appId: string }> }
) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";

  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: "Too many requests. Please wait and try again." },
      { status: 429 }
    );
  }

  const { appId } = await params;
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Missing session token" }, { status: 400 });
  }

  const session = await getActiveSession(token);
  if (!session) {
    return NextResponse.json(
      { error: "Invalid or expired session" },
      { status: 401 }
    );
  }

  const student = await prisma.student.findFirst({
    where: { applicationId: appId, isActive: true },
    select: {
      id: true,
      applicationId: true,
      fullName: true,
      gender: true,
      trainingLocation: true,
      learningTrack: true,
    },
  });

  if (!student) {
    return NextResponse.json(
      { error: "Application ID not found. Please check your ID card." },
      { status: 404 }
    );
  }

  return NextResponse.json(student);
}
