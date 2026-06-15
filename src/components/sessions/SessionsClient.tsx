"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDate, formatTime } from "@/lib/utils";

interface SessionRow {
  id: string;
  sessionName: string;
  sessionCode: string;
  location: string;
  learningTrack: string;
  status: string;
  startedAt: string;
  expiresAt: string;
  endedAt: string | null;
  instructor: { id: string; name: string };
  _count: { attendanceRecords: number };
}

type Tab = "ALL" | "ACTIVE" | "CLOSED" | "EXPIRED";

interface Props {
  initialSessions: SessionRow[];
  userRole: string;
}

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  ACTIVE: { bg: "#dcfce7", color: "#15803d", label: "Active" },
  CLOSED: { bg: "#f1f5f9", color: "#475569", label: "Closed" },
  EXPIRED: { bg: "#fff7ed", color: "#c2410c", label: "Expired" },
};

export default function SessionsClient({ initialSessions, userRole }: Props) {
  const router = useRouter();
  const [sessions, setSessions] = useState<SessionRow[]>(initialSessions);
  const [activeTab, setActiveTab] = useState<Tab>("ALL");
  const [endingId, setEndingId] = useState<string | null>(null);
  const [confirmEndId, setConfirmEndId] = useState<string | null>(null);

  const loadSessions = useCallback(async () => {
    const res = await fetch("/api/sessions?limit=100");
    if (res.ok) {
      const data = await res.json();
      setSessions(data.sessions ?? []);
    }
  }, []);

  async function handleEndSession(id: string) {
    setEndingId(id);
    const res = await fetch(`/api/sessions/${id}/end`, { method: "POST" });
    setEndingId(null);
    setConfirmEndId(null);
    if (res.ok) loadSessions();
  }

  const filtered =
    activeTab === "ALL" ? sessions : sessions.filter((s) => s.status === activeTab);

  const tabs: { key: Tab; label: string }[] = [
    { key: "ALL", label: "All" },
    { key: "ACTIVE", label: "Active" },
    { key: "CLOSED", label: "Closed" },
    { key: "EXPIRED", label: "Expired" },
  ];

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-4xl font-black tracking-tight text-[#0F1E35]">
          Sessions
        </h1>
        <Link
          href="/sessions/new"
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white"
          style={{ backgroundColor: "#0E7C7B" }}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          New Session
        </Link>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-6 bg-white rounded-xl p-1 w-fit border" style={{ borderColor: "#E2E8F0" }}>
        {tabs.map((t) => {
          const count = t.key === "ALL" ? sessions.length : sessions.filter((s) => s.status === t.key).length;
          const active = activeTab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className="px-4 py-1.5 rounded-lg text-sm font-medium transition-colors"
              style={
                active
                  ? { backgroundColor: "#0E7C7B", color: "#fff" }
                  : { color: "#64748b" }
              }
            >
              {t.label}
              <span
                className="ml-1.5 text-xs px-1.5 py-0.5 rounded-full"
                style={
                  active
                    ? { backgroundColor: "rgba(255,255,255,0.25)", color: "#fff" }
                    : { backgroundColor: "#F5F6FA", color: "#94a3b8" }
                }
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Cards */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border py-16 text-center" style={{ borderColor: "#E2E8F0" }}>
          <svg className="w-10 h-10 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="#cbd5e1" strokeWidth={1.2}>
            <rect x="3" y="4" width="18" height="18" rx="2" strokeLinecap="round" strokeLinejoin="round" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 2v4M8 2v4M3 10h18" />
          </svg>
          <p className="text-sm font-medium mb-3" style={{ color: "#64748b" }}>
            {activeTab === "ALL"
              ? "No sessions yet. Click 'New Session' to get started."
              : `No ${activeTab.toLowerCase()} sessions.`}
          </p>
          {activeTab === "ALL" && (
            <Link
              href="/sessions/new"
              className="text-sm font-semibold"
              style={{ color: "#0E7C7B" }}
            >
              → New Session
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {filtered.map((s) => {
            const badge = STATUS_STYLE[s.status] ?? STATUS_STYLE.CLOSED;
            const isActive = s.status === "ACTIVE";
            const confirming = confirmEndId === s.id;

            return (
              <div
                key={s.id}
                className="bg-white rounded-xl border overflow-hidden"
                style={{ borderColor: "#E2E8F0" }}
              >
                {/* Card top */}
                <div className="p-5 pb-4">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <h3 className="font-semibold text-base leading-snug" style={{ color: "#0F1E35" }}>
                      {s.sessionName}
                    </h3>
                    <span
                      className="text-xs px-2.5 py-1 rounded-full font-semibold flex-shrink-0"
                      style={{ backgroundColor: badge.bg, color: badge.color }}
                    >
                      {badge.label}
                    </span>
                  </div>

                  {/* Badges */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    <Pill label={s.location} icon="📍" />
                    <Pill label={s.learningTrack} icon="📚" />
                    {(userRole === "ADMIN" || userRole === "SUPER_ADMIN") && (
                      <Pill label={s.instructor.name} icon="👤" />
                    )}
                  </div>

                  {/* Meta */}
                  <div className="flex items-center gap-4 text-xs" style={{ color: "#64748b" }}>
                    <span>{formatDate(s.startedAt)}, {formatTime(s.startedAt)}</span>
                    <span
                      className="flex items-center gap-1 font-semibold"
                      style={{ color: "#0F1E35" }}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-5-3.87M9 20H4v-2a4 4 0 015-3.87m6-4a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                      {s._count.attendanceRecords} checked in
                    </span>
                  </div>

                  <p className="text-xs mt-1" style={{ color: "#94a3b8" }}>
                    Code: <span className="font-mono font-semibold">{s.sessionCode}</span>
                    {" · "}
                    {isActive
                      ? `Expires ${formatTime(s.expiresAt)}`
                      : s.endedAt
                      ? `Ended ${formatTime(s.endedAt)}`
                      : `Expired ${formatTime(s.expiresAt)}`}
                  </p>
                </div>

                {/* Card footer — actions */}
                <div
                  className="px-5 py-3 border-t flex items-center gap-2"
                  style={{ borderColor: "#F1F5F9", backgroundColor: "#FAFBFC" }}
                >
                  {confirming ? (
                    <div className="flex items-center gap-2 w-full">
                      <p className="text-xs text-red-600 flex-1">End this session?</p>
                      <button
                        onClick={() => handleEndSession(s.id)}
                        disabled={endingId === s.id}
                        className="px-3 py-1.5 text-xs rounded-lg bg-red-600 text-white font-semibold disabled:opacity-60"
                      >
                        {endingId === s.id ? "Ending…" : "Confirm"}
                      </button>
                      <button
                        onClick={() => setConfirmEndId(null)}
                        className="px-3 py-1.5 text-xs rounded-lg border font-medium"
                        style={{ borderColor: "#E2E8F0", color: "#64748b" }}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : isActive ? (
                    <>
                      <Link
                        href={`/sessions/${s.id}`}
                        className="flex-1 text-center px-3 py-1.5 text-xs rounded-lg font-semibold text-white"
                        style={{ backgroundColor: "#0E7C7B" }}
                      >
                        Open QR
                      </Link>
                      <button
                        onClick={() => setConfirmEndId(s.id)}
                        className="px-3 py-1.5 text-xs rounded-lg border font-semibold"
                        style={{ borderColor: "#fca5a5", color: "#ef4444" }}
                      >
                        End Session
                      </button>
                    </>
                  ) : (
                    <Link
                      href={`/sessions/${s.id}`}
                      className="px-3 py-1.5 text-xs rounded-lg border font-semibold"
                      style={{ borderColor: "#0E7C7B", color: "#0E7C7B" }}
                    >
                      View Report
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Pill({ label, icon }: { label: string; icon: string }) {
  return (
    <span
      className="text-xs px-2.5 py-0.5 rounded-full font-medium"
      style={{ backgroundColor: "#F5F6FA", color: "#475569" }}
    >
      {icon} {label}
    </span>
  );
}
