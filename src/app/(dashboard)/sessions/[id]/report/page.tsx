import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDate, formatDateTime, formatTime } from "@/lib/utils";
import { countRegisteredForSession } from "@/lib/attendance-status";
import ExportSessionButtons from "@/components/reports/ExportSessionButtons";

export const dynamic = "force-dynamic";

export default async function SessionReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;
  const role = (session.user as { role?: string }).role ?? "";
  const userId = session.user.id as string;

  const trainingSession = await prisma.trainingSession.findUnique({
    where: { id },
    include: {
      instructor: { select: { name: true } },
      attendanceRecords: {
        orderBy: { checkInTime: "asc" },
      },
    },
  });

  if (!trainingSession) redirect("/sessions");

  // INSTRUCTOR can only see their own sessions
  if (role === "INSTRUCTOR" && trainingSession.instructorId !== userId) {
    redirect("/sessions");
  }

  // Total registered students for this track + location (campus-aware: a
  // "Both Campuses" session is measured against every active student on
  // the track, not a literal "Both Campuses" trainingLocation match)
  const totalRegistered = await countRegisteredForSession(
    trainingSession.learningTrack,
    trainingSession.location
  );

  const checkedIn = trainingSession.attendanceRecords.length;
  const verifiedCount = trainingSession.attendanceRecords.filter(
    (r) => r.verificationStatus === "VERIFIED"
  ).length;
  const flaggedCount = trainingSession.attendanceRecords.filter(
    (r) => r.verificationStatus === "FLAGGED"
  ).length;
  const pendingCount = trainingSession.attendanceRecords.filter(
    (r) => r.verificationStatus === "PENDING"
  ).length;
  const attendanceRate =
    totalRegistered > 0
      ? `${((checkedIn / totalRegistered) * 100).toFixed(1)}%`
      : "N/A";

  const duration =
    trainingSession.endedAt
      ? Math.round(
          (trainingSession.endedAt.getTime() - trainingSession.startedAt.getTime()) / 60_000
        )
      : Math.round(
          (trainingSession.expiresAt.getTime() - trainingSession.startedAt.getTime()) / 60_000
        );

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6 text-sm flex-wrap">
        <Link href="/sessions" style={{ color: "#64748b" }}>Sessions</Link>
        <span style={{ color: "#E2E8F0" }}>/</span>
        <Link href={`/sessions/${id}`} style={{ color: "#64748b" }}>
          {trainingSession.sessionName}
        </Link>
        <span style={{ color: "#E2E8F0" }}>/</span>
        <span className="font-medium" style={{ color: "#0F1E35" }}>Report</span>
      </div>

      {/* Session details header */}
      <div className="bg-white rounded-xl border p-6 mb-5" style={{ borderColor: "#E2E8F0" }}>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
          <div>
            <h1 className="text-xl font-bold mb-1" style={{ color: "#0F1E35" }}>
              {trainingSession.sessionName}
            </h1>
            <p className="text-sm" style={{ color: "#64748b" }}>
              Code: <span className="font-mono font-semibold">{trainingSession.sessionCode}</span>
            </p>
          </div>
          <StatusChip status={trainingSession.status} />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <DetailItem label="Location" value={trainingSession.location} />
          <DetailItem label="Learning Track" value={trainingSession.learningTrack} />
          <DetailItem label="Instructor" value={trainingSession.instructor.name} />
          <DetailItem label="Duration" value={`${duration} min`} />
          <DetailItem label="Started" value={formatDate(trainingSession.startedAt)} />
          <DetailItem label="Start Time" value={formatTime(trainingSession.startedAt)} />
          <DetailItem
            label={trainingSession.status === "CLOSED" ? "Ended" : "Scheduled End"}
            value={formatTime(trainingSession.expiresAt)}
          />
          <DetailItem label="Date" value={formatDate(trainingSession.startedAt)} />
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-5">
        <StatCard label="Students Checked In" value={String(checkedIn)} color="#0E7C7B" />
        <StatCard label="Total Registered (Track+Location)" value={String(totalRegistered)} color="#0F1E35" />
        <StatCard label="Attendance Rate" value={attendanceRate} color="#C9922A" />
      </div>

      {/* Verification summary */}
      {checkedIn > 0 && (
        <div className="flex flex-wrap gap-3 mb-5">
          <VerifBadge label="Verified" count={verifiedCount} bg="#dcfce7" color="#15803d" />
          <VerifBadge label="Flagged" count={flaggedCount} bg="#fee2e2" color="#dc2626" />
          <VerifBadge label="Pending" count={pendingCount} bg="#fef9c3" color="#a16207" />
        </div>
      )}

      {/* Export + Table */}
      <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: "#E2E8F0" }}>
        <div
          className="px-6 py-4 border-b flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
          style={{ borderColor: "#E2E8F0" }}
        >
          <h2 className="font-semibold" style={{ color: "#0F1E35" }}>
            Attendance Records ({checkedIn})
          </h2>
          <ExportSessionButtons sessionId={id} sessionName={trainingSession.sessionName} />
        </div>

        {checkedIn === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm" style={{ color: "#94a3b8" }}>
              No students checked in for this session.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: "#F5F6FA", borderBottom: "1px solid #E2E8F0" }}>
                  {["#", "Full Name", "Application ID", "Gender", "Check-In Time", "Verification", "Device"].map((h) => (
                    <th
                      key={h}
                      className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide whitespace-nowrap"
                      style={{ color: "#64748b" }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {trainingSession.attendanceRecords.map((r, i) => (
                  <tr
                    key={r.id}
                    style={{ borderBottom: i < checkedIn - 1 ? "1px solid #F1F5F9" : "none" }}
                  >
                    <td className="px-4 py-3 text-xs" style={{ color: "#94a3b8" }}>
                      {i + 1}
                    </td>
                    <td className="px-4 py-3 font-medium whitespace-nowrap" style={{ color: "#0F1E35" }}>
                      {r.fullName}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs whitespace-nowrap" style={{ color: "#0E7C7B" }}>
                      {r.applicationId}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: "#475569" }}>
                      {r.gender}
                    </td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: "#475569" }}>
                      {formatDateTime(r.checkInTime)}
                    </td>
                    <td className="px-4 py-3">
                      <VerifBadge status={r.verificationStatus} />
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: "#64748b" }}>
                      {r.deviceType ?? "—"}
                      {r.browser ? ` / ${r.browser}` : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusChip({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    ACTIVE: { bg: "#dcfce7", color: "#15803d", label: "Active" },
    CLOSED: { bg: "#f1f5f9", color: "#475569", label: "Closed" },
    EXPIRED: { bg: "#fff7ed", color: "#c2410c", label: "Expired" },
  };
  const s = map[status] ?? map.CLOSED;
  return (
    <span
      className="self-start text-xs px-3 py-1 rounded-full font-semibold"
      style={{ backgroundColor: s.bg, color: s.color }}
    >
      {s.label}
    </span>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs mb-0.5" style={{ color: "#94a3b8" }}>{label}</p>
      <p className="text-sm font-semibold" style={{ color: "#0F1E35" }}>{value}</p>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div
      className="bg-white rounded-xl border p-5"
      style={{ borderColor: "#E2E8F0", borderLeft: `4px solid ${color}` }}
    >
      <p className="text-2xl font-extrabold mb-0.5" style={{ color }}>
        {value}
      </p>
      <p className="text-xs" style={{ color: "#64748b" }}>{label}</p>
    </div>
  );
}

function VerifBadge({ status, label, count, bg, color }: {
  status?: string;
  label?: string;
  count?: number;
  bg?: string;
  color?: string;
}) {
  if (label !== undefined && count !== undefined && bg && color) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold" style={{ backgroundColor: bg, color }}>
        <span className="font-black text-sm">{count}</span> {label}
      </span>
    );
  }
  const map: Record<string, { bg: string; color: string }> = {
    VERIFIED: { bg: "#dcfce7", color: "#15803d" },
    FLAGGED:  { bg: "#fee2e2", color: "#dc2626" },
    PENDING:  { bg: "#fef9c3", color: "#a16207" },
  };
  const s = map[status ?? "PENDING"] ?? map.PENDING;
  return (
    <span className="inline-block text-xs font-bold px-2 py-0.5 rounded-full whitespace-nowrap" style={{ backgroundColor: s.bg, color: s.color }}>
      {status ?? "PENDING"}
    </span>
  );
}
