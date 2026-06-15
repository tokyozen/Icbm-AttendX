"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import CountdownTimer from "@/components/sessions/CountdownTimer";
import VerificationList from "@/components/sessions/VerificationList";
import { formatDate, formatDateTime, formatTime } from "@/lib/utils";

interface AttendanceRow {
  id: string;
  fullName: string;
  applicationId: string;
  checkInTime: string;
  learningTrack: string;
  deviceType: string | null;
  browser: string | null;
  verificationStatus: "PENDING" | "VERIFIED" | "FLAGGED";
}

interface SessionData {
  id: string;
  sessionName: string;
  sessionCode: string;
  location: string;
  learningTrack: string;
  status: string;
  startedAt: string;
  expiresAt: string;
  endedAt: string | null;
  qrToken: string;
  instructor: { name: string };
  attendanceRecords: AttendanceRow[];
  _count: { attendanceRecords: number };
}

interface QRData {
  qrDataUrl: string;
  sessionUrl: string;
  token: string;
  expiresAt: string;
}

export default function SessionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [qrData, setQrData] = useState<QRData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [ending, setEnding] = useState(false);
  const [extending, setExtending] = useState(false);
  const refreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchSession = useCallback(async () => {
    const res = await fetch(`/api/sessions/${id}`);
    if (!res.ok) {
      setError("Session not found or you don't have access.");
      return;
    }
    const data = await res.json();
    setSessionData(data.session);
  }, [id]);

  const fetchQR = useCallback(async () => {
    const res = await fetch(`/api/sessions/${id}/qr`);
    if (res.ok) {
      const data = await res.json();
      setQrData(data);
    }
  }, [id]);

  // Initial load
  useEffect(() => {
    async function init() {
      setLoading(true);
      await Promise.all([fetchSession(), fetchQR()]);
      setLoading(false);
    }
    init();
  }, [fetchSession, fetchQR]);

  // Auto-refresh every 10 s while session is ACTIVE
  useEffect(() => {
    if (!sessionData) return;
    if (sessionData.status !== "ACTIVE") {
      if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
      return;
    }
    refreshIntervalRef.current = setInterval(fetchSession, 10_000);
    return () => {
      if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
    };
  }, [sessionData?.status, fetchSession]);

  async function handleEnd() {
    setEnding(true);
    const res = await fetch(`/api/sessions/${id}/end`, { method: "POST" });
    setEnding(false);
    setConfirmEnd(false);
    if (res.ok) fetchSession();
  }

  async function handleExtend(minutes: number) {
    setExtending(true);
    const res = await fetch(`/api/sessions/${id}/extend`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ additionalMinutes: minutes }),
    });
    setExtending(false);
    if (res.ok) {
      const data = await res.json();
      setSessionData((prev) =>
        prev
          ? {
              ...prev,
              expiresAt: data.session.expiresAt,
              status: data.session.status,
            }
          : prev
      );
      fetchQR(); // QR URL stays same but expiresAt in response updates
    }
  }

  function downloadQR() {
    if (!qrData) return;
    const a = document.createElement("a");
    a.href = qrData.qrDataUrl;
    a.download = `QR-${sessionData?.sessionCode ?? id}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-64">
        <div className="text-center">
          <div
            className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-3"
            style={{ borderColor: "#0E7C7B", borderTopColor: "transparent" }}
          />
          <p className="text-sm" style={{ color: "#64748b" }}>Loading session…</p>
        </div>
      </div>
    );
  }

  if (error || !sessionData) {
    return (
      <div className="p-8 max-w-lg mx-auto text-center">
        <p className="text-sm text-red-600 mb-4">{error || "Session not found."}</p>
        <Link href="/sessions" className="text-sm font-medium" style={{ color: "#0E7C7B" }}>
          ← Back to Sessions
        </Link>
      </div>
    );
  }

  const isActive = sessionData.status === "ACTIVE";
  const isClosed = sessionData.status === "CLOSED";
  const records = sessionData.attendanceRecords;

  const hasPending = records.some((r) => r.verificationStatus === "PENDING");
  const showVerification = isClosed && hasPending;
  const showExport = isClosed && !hasPending && records.length > 0;

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6 text-sm">
        <Link href="/sessions" style={{ color: "#64748b" }}>
          ← Sessions
        </Link>
        <span style={{ color: "#E2E8F0" }}>/</span>
        <span className="font-medium truncate max-w-xs" style={{ color: "#0F1E35" }}>
          {sessionData.sessionName}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* ── Left: QR ── */}
        <div className="bg-white rounded-xl border p-6 flex flex-col items-center" style={{ borderColor: "#E2E8F0" }}>
          <div className="flex items-center justify-between w-full mb-4">
            <h2 className="font-bold text-lg truncate" style={{ color: "#0F1E35" }}>
              {sessionData.sessionName}
            </h2>
            <StatusBadge status={sessionData.status} />
          </div>

          {isActive && qrData ? (
            <>
              {/* QR image */}
              <div
                className="rounded-xl p-4 mb-4"
                style={{ backgroundColor: "#F5F6FA", border: "1px solid #E2E8F0" }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrData.qrDataUrl}
                  alt="Attendance QR Code"
                  className="w-64 h-64 object-contain"
                />
              </div>

              {/* Session URL */}
              <p
                className="text-xs text-center mb-4 font-mono px-3 py-2 rounded-lg break-all"
                style={{ backgroundColor: "#F5F6FA", color: "#0E7C7B" }}
              >
                {qrData.sessionUrl}
              </p>

              <button
                onClick={downloadQR}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white w-full justify-center"
                style={{ backgroundColor: "#0F1E35" }}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download QR Code
              </button>
            </>
          ) : (
            <div
              className="w-64 h-64 rounded-xl flex flex-col items-center justify-center mb-4"
              style={{ backgroundColor: "#F5F6FA", border: "2px dashed #E2E8F0" }}
            >
              <svg className="w-12 h-12 mb-2" fill="none" viewBox="0 0 24 24" stroke="#cbd5e1" strokeWidth={1.2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
              <p className="text-sm font-medium" style={{ color: "#94a3b8" }}>Session Ended</p>
              <p className="text-xs mt-1" style={{ color: "#cbd5e1" }}>
                {isClosed && sessionData.endedAt
                  ? formatDateTime(sessionData.endedAt)
                  : "Expired"}
              </p>
            </div>
          )}
        </div>

        {/* ── Right: Live stats ── */}
        <div className="bg-white rounded-xl border p-6" style={{ borderColor: "#E2E8F0" }}>
          {/* Big counter */}
          <div
            className="rounded-xl p-6 text-center mb-5"
            style={{ backgroundColor: "#F5F6FA" }}
          >
            <p className="text-6xl font-extrabold mb-1" style={{ color: "#0F1E35" }}>
              {sessionData._count.attendanceRecords}
            </p>
            <p className="text-sm font-medium" style={{ color: "#64748b" }}>
              Students Checked In
            </p>
          </div>

          {/* Details */}
          <dl className="space-y-3 mb-5">
            <Detail label="Location" value={sessionData.location} />
            <Detail label="Learning Track" value={sessionData.learningTrack} />
            <Detail label="Started" value={`${formatDate(sessionData.startedAt)}, ${formatTime(sessionData.startedAt)}`} />
            <Detail
              label={isActive ? "Expires" : "Expired"}
              value={
                <span className="flex items-center gap-2">
                  {formatTime(sessionData.expiresAt)}
                  {isActive && (
                    <span className="text-sm">
                      (<CountdownTimer
                        expiresAt={sessionData.expiresAt}
                        onExpired={fetchSession}
                      />)
                    </span>
                  )}
                </span>
              }
            />
          </dl>

          {/* Actions */}
          {isActive ? (
            <>
              {confirmEnd ? (
                <div
                  className="rounded-xl p-4 mb-3"
                  style={{ backgroundColor: "#fff5f5", border: "1px solid #fecaca" }}
                >
                  <p className="text-sm font-medium text-red-700 mb-3">
                    End this session? Students won't be able to check in anymore.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setConfirmEnd(false)}
                      className="flex-1 px-3 py-2 text-sm rounded-lg border font-medium"
                      style={{ borderColor: "#E2E8F0", color: "#64748b" }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleEnd}
                      disabled={ending}
                      className="flex-1 px-3 py-2 text-sm rounded-lg bg-red-600 text-white font-semibold disabled:opacity-60"
                    >
                      {ending ? "Ending…" : "End Session"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleExtend(30)}
                    disabled={extending}
                    className="flex-1 px-3 py-2 text-sm rounded-lg border font-semibold disabled:opacity-60"
                    style={{ borderColor: "#C9922A", color: "#C9922A" }}
                  >
                    {extending ? "Extending…" : "+30 min"}
                  </button>
                  <button
                    onClick={() => setConfirmEnd(true)}
                    className="flex-1 px-3 py-2 text-sm rounded-lg border font-semibold"
                    style={{ borderColor: "#fca5a5", color: "#ef4444" }}
                  >
                    End Session
                  </button>
                </div>
              )}
            </>
          ) : (
            <div
              className="rounded-xl py-3 text-center text-sm font-semibold"
              style={{ backgroundColor: "#F5F6FA", color: "#64748b" }}
            >
              Session {sessionData.status === "CLOSED" ? "Closed" : "Expired"}
            </div>
          )}
        </div>
      </div>

      {/* ── Verification mode (CLOSED + pending records) ── */}
      {showVerification && (
        <VerificationList
          sessionId={sessionData.id}
          sessionName={sessionData.sessionName}
          records={records}
          onComplete={fetchSession}
        />
      )}

      {/* ── Export panel (CLOSED + all verified/flagged) ── */}
      {showExport && (
        <div className="mt-2 p-6 bg-white rounded-xl border-2 border-[#0E7C7B] text-center">
          <div className="text-4xl mb-2">🎉</div>
          <h3 className="font-black text-[#0F1E35] text-lg mb-1">Verification Complete</h3>
          <p className="text-gray-400 text-sm mb-4">All records have been reviewed.</p>
          <div className="flex gap-3 justify-center flex-wrap">
            <a
              href={`/api/export?format=csv&sessionId=${sessionData.id}`}
              className="px-6 py-3 bg-[#0E7C7B] text-white font-semibold rounded-lg hover:bg-[#0E7C7B]/90 transition-colors"
            >
              Export CSV
            </a>
            <a
              href={`/api/export?format=excel&sessionId=${sessionData.id}`}
              className="px-6 py-3 border-2 border-[#0E7C7B] text-[#0E7C7B] font-semibold rounded-lg hover:bg-[#0E7C7B]/10 transition-colors"
            >
              Export Excel
            </a>
          </div>
        </div>
      )}

      {/* ── Attendance list (ACTIVE or EXPIRED) ── */}
      {!showVerification && (
        <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: "#E2E8F0" }}>
          <div
            className="flex items-center justify-between px-6 py-4 border-b"
            style={{ borderColor: "#E2E8F0" }}
          >
            <h3 className="font-semibold" style={{ color: "#0F1E35" }}>
              Attendance List
            </h3>
            <div className="flex items-center gap-3">
              {isActive && (
                <p className="text-xs" style={{ color: "#94a3b8" }}>
                  Auto-refreshes every 10s
                </p>
              )}
            </div>
          </div>

          {records.length === 0 ? (
            <div className="py-12 text-center">
              <svg className="w-10 h-10 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="#cbd5e1" strokeWidth={1.2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm" style={{ color: "#94a3b8" }}>
                Waiting for students to scan and check in…
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ backgroundColor: "#F5F6FA", borderBottom: "1px solid #E2E8F0" }}>
                    {["#", "Full Name", "Application ID", "Check-in Time", "Device"].map((h) => (
                      <th
                        key={h}
                        className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide"
                        style={{ color: "#64748b" }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {records.map((r, i) => (
                    <tr
                      key={r.id}
                      style={{
                        borderBottom: i < records.length - 1 ? "1px solid #F1F5F9" : "none",
                      }}
                    >
                      <td className="px-4 py-3 text-xs" style={{ color: "#94a3b8" }}>
                        {i + 1}
                      </td>
                      <td className="px-4 py-3 font-medium" style={{ color: "#0F1E35" }}>
                        {r.fullName}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs" style={{ color: "#0E7C7B" }}>
                        {r.applicationId}
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: "#475569" }}>
                        {formatDateTime(r.checkInTime)}
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
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    ACTIVE: { bg: "#dcfce7", color: "#15803d", label: "Active" },
    CLOSED: { bg: "#f1f5f9", color: "#475569", label: "Closed" },
    EXPIRED: { bg: "#fff7ed", color: "#c2410c", label: "Expired" },
  };
  const s = map[status] ?? map.CLOSED;
  return (
    <span
      className="text-xs px-2.5 py-1 rounded-full font-semibold flex-shrink-0"
      style={{ backgroundColor: s.bg, color: s.color }}
    >
      {s.label}
    </span>
  );
}

function Detail({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-xs" style={{ color: "#64748b" }}>
        {label}
      </dt>
      <dd className="text-sm font-medium" style={{ color: "#0F1E35" }}>
        {value}
      </dd>
    </div>
  );
}
