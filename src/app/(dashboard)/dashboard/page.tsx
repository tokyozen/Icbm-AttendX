import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { formatTime } from "@/lib/utils";

function getGreeting(hour: number) {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function firstName(name: string) {
  return name.split(" ")[0];
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const [totalStudents, attendanceToday, activeSessionCount, activeSessions, recentCheckIns] =
    await Promise.all([
      prisma.student.count({ where: { isActive: true } }),
      prisma.attendanceRecord.count({
        where: { checkInTime: { gte: todayStart } },
      }),
      prisma.trainingSession.count({ where: { status: "ACTIVE" } }),
      prisma.trainingSession.findMany({
        where: { status: "ACTIVE" },
        take: 3,
        include: { _count: { select: { attendanceRecords: true } } },
        orderBy: { startedAt: "desc" },
      }),
      prisma.attendanceRecord.findMany({
        where: { checkInTime: { gte: todayStart } },
        take: 5,
        orderBy: { checkInTime: "desc" },
        select: {
          id: true,
          fullName: true,
          learningTrack: true,
          checkInTime: true,
        },
      }),
    ]);

  const attendanceRate =
    totalStudents > 0
      ? `${((attendanceToday / totalStudents) * 100).toFixed(1)}%`
      : "N/A";

  const hour = now.getHours();
  const greeting = getGreeting(hour);
  const name = firstName(session.user.name ?? "there");

  const dateStr = now.toLocaleDateString("en-NG", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const statCards = [
    {
      label: "Total Students",
      value: String(totalStudents),
      color: "#0E7C7B",
      icon: (
        <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-5-3.87M9 20H4v-2a4 4 0 015-3.87m6-4a4 4 0 11-8 0 4 4 0 018 0zm6 0a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
    {
      label: "Attendance Today",
      value: String(attendanceToday),
      color: "#0E7C7B",
      icon: (
        <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      label: "Active Sessions",
      value: String(activeSessionCount),
      color: "#C9922A",
      icon: (
        <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <circle cx="12" cy="12" r="3" strokeLinecap="round" strokeLinejoin="round" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v2m0 16v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M2 12h2m16 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
        </svg>
      ),
    },
    {
      label: "Attendance Rate",
      value: attendanceRate,
      color: "#C9922A",
      icon: (
        <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v18h18" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 16l4-5 4 3 5-7" />
        </svg>
      ),
    },
  ];

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-8">
        <h1 className="text-4xl font-black tracking-tight text-[#0F1E35]">
          {greeting}, {name}
        </h1>
        <p className="text-sm" style={{ color: "#64748b" }}>{dateStr}</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="bg-white rounded-xl shadow-sm p-5 flex items-start gap-4"
            style={{ borderLeft: `4px solid ${card.color}` }}
          >
            <div
              className="p-2.5 rounded-lg flex-shrink-0"
              style={{ backgroundColor: `${card.color}18`, color: card.color }}
            >
              {card.icon}
            </div>
            <div>
              <p className="text-6xl font-black leading-none mt-2" style={{ color: "#0F1E35" }}>
                {card.value}
              </p>
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mt-2">
                {card.label}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Active Sessions panel */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold" style={{ color: "#0F1E35" }}>
              Active Sessions
            </h2>
            <Link
              href="/sessions"
              className="text-xs font-medium"
              style={{ color: "#0E7C7B" }}
            >
              View all →
            </Link>
          </div>

          {activeSessions.length === 0 ? (
            <div
              className="rounded-lg p-8 text-center"
              style={{ backgroundColor: "#f0fafa", border: "1px dashed #0E7C7B" }}
            >
              <svg className="w-10 h-10 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="#0E7C7B" strokeWidth={1.5}>
                <rect x="3" y="4" width="18" height="18" rx="2" strokeLinecap="round" strokeLinejoin="round" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 2v4M8 2v4M3 10h18" />
              </svg>
              <p className="text-sm font-medium mb-2" style={{ color: "#0a5a59" }}>
                No active sessions right now.
              </p>
              <Link
                href="/sessions/new"
                className="inline-block text-xs font-semibold px-4 py-1.5 rounded-lg text-white"
                style={{ backgroundColor: "#0E7C7B" }}
              >
                Start a Session
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {activeSessions.map((s) => (
                <Link
                  key={s.id}
                  href={`/sessions/${s.id}`}
                  className="flex items-center justify-between p-3 rounded-lg transition-colors"
                  style={{ backgroundColor: "#F5F6FA" }}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: "#0F1E35" }}>
                      {s.sessionName}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: "#64748b" }}>
                      {s.location} · Started {formatTime(s.startedAt)}
                    </p>
                  </div>
                  <div className="flex-shrink-0 ml-4 text-right">
                    <p className="text-lg font-bold" style={{ color: "#0E7C7B" }}>
                      {s._count.attendanceRecords}
                    </p>
                    <p className="text-xs" style={{ color: "#94a3b8" }}>checked in</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent Check-ins panel */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold" style={{ color: "#0F1E35" }}>
              Recent Check-ins
            </h2>
            {attendanceToday > 0 && (
              <span
                className="text-xs px-2 py-0.5 rounded-full font-semibold"
                style={{ backgroundColor: "#f0fafa", color: "#0E7C7B" }}
              >
                {attendanceToday} today
              </span>
            )}
          </div>
          {recentCheckIns.length === 0 ? (
            <div
              className="rounded-lg p-8 text-center"
              style={{ backgroundColor: "#fffbf2", border: "1px dashed #C9922A" }}
            >
              <svg className="w-10 h-10 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="#C9922A" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm font-medium" style={{ color: "#92400e" }}>
                No check-ins recorded today.
              </p>
              <p className="text-xs mt-1" style={{ color: "#C9922A" }}>
                Check-ins will appear here as students clock in.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentCheckIns.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                  style={{ borderColor: "#F1F5F9" }}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: "#0F1E35" }}>
                      {r.fullName}
                    </p>
                    <p className="text-xs" style={{ color: "#94a3b8" }}>
                      {r.learningTrack}
                    </p>
                  </div>
                  <p className="text-xs font-semibold flex-shrink-0 ml-3" style={{ color: "#0E7C7B" }}>
                    {formatTime(r.checkInTime)}
                  </p>
                </div>
              ))}
              {attendanceToday > 5 && (
                <p className="text-xs text-center pt-1" style={{ color: "#94a3b8" }}>
                  {`+${attendanceToday - 5} more today`}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
