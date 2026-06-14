import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import CheckInFlow from "@/components/attendance/CheckInFlow";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Check In — ICBM-AttendX",
  description: "Scan to mark your attendance",
};

type ErrorKind = "EXPIRED" | "CLOSED" | "INVALID";

function ErrorPage({ kind }: { kind: ErrorKind }) {
  const config = {
    EXPIRED: {
      icon: (
        <svg
          className="w-16 h-16"
          fill="none"
          viewBox="0 0 24 24"
          stroke="#C9922A"
          strokeWidth={1.4}
        >
          <circle cx="12" cy="12" r="10" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l3 3" />
        </svg>
      ),
      heading: "Session Expired",
      body: "This attendance session has ended. Please contact your instructor.",
      color: "#C9922A",
    },
    CLOSED: {
      icon: (
        <svg
          className="w-16 h-16"
          fill="none"
          viewBox="0 0 24 24"
          stroke="#64748b"
          strokeWidth={1.4}
        >
          <rect x="3" y="11" width="18" height="11" rx="2" strokeLinecap="round" strokeLinejoin="round" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 11V7a5 5 0 0110 0v4" />
        </svg>
      ),
      heading: "Session Closed",
      body: "This session has been closed by the instructor.",
      color: "#64748b",
    },
    INVALID: {
      icon: (
        <svg
          className="w-16 h-16"
          fill="none"
          viewBox="0 0 24 24"
          stroke="#ef4444"
          strokeWidth={1.4}
        >
          <circle cx="12" cy="12" r="10" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 9l-6 6M9 9l6 6" />
        </svg>
      ),
      heading: "Invalid QR Code",
      body: "This QR code is not recognized. Please scan the code displayed in your classroom.",
      color: "#ef4444",
    },
  }[kind];

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-[#F5F6FA]">
      <div className="w-full max-w-sm text-center">
        <div className="bg-white rounded-2xl shadow-sm p-8">
          <div className="flex justify-center mb-5">{config.icon}</div>
          <h1 className="text-xl font-bold mb-2" style={{ color: "#0F1E35" }}>
            {config.heading}
          </h1>
          <p className="text-sm leading-relaxed" style={{ color: "#64748b" }}>
            {config.body}
          </p>
          <p className="text-xs mt-6 font-medium" style={{ color: "#94a3b8" }}>
            ICBM-AttendX
          </p>
        </div>
      </div>
    </div>
  );
}

export default async function CheckInPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const session = await prisma.trainingSession.findUnique({
    where: { qrToken: token },
    include: { instructor: { select: { name: true } } },
  });

  if (!session) return <ErrorPage kind="INVALID" />;

  if (session.status === "CLOSED") return <ErrorPage kind="CLOSED" />;

  const now = new Date();
  if (session.expiresAt < now && session.status === "ACTIVE") {
    await prisma.trainingSession.update({
      where: { id: session.id },
      data: { status: "EXPIRED" },
    });
    return <ErrorPage kind="EXPIRED" />;
  }

  if (session.status === "EXPIRED") return <ErrorPage kind="EXPIRED" />;

  return (
    <CheckInFlow
      qrToken={token}
      sessionName={session.sessionName}
      location={session.location}
      learningTrack={session.learningTrack}
      instructorName={session.instructor.name}
      expiresAt={session.expiresAt.toISOString()}
    />
  );
}
