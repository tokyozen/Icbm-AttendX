"use client";

import { useEffect, useRef, useState } from "react";
import CountdownTimer from "@/components/sessions/CountdownTimer";
import { ICBM_LOGO_BASE64 } from "@/lib/logo";

interface Props {
  qrToken: string;
  sessionName: string;
  location: string;
  learningTrack: string;
  instructorName: string;
  expiresAt: string;
}

interface StudentRecord {
  id: string;
  applicationId: string;
  fullName: string;
  gender: string;
  trainingLocation: string;
  learningTrack: string;
}

interface CheckInResult {
  fullName: string;
  checkInTime: string;
  sessionName: string;
}

interface AttendanceHistoryItem {
  sessionId: string;
  sessionName: string;
  date: string;
  attended: boolean;
  checkInTime: string | null;
  verificationStatus: string | null;
}

interface AttendanceHistoryData {
  summary: {
    totalSessions: number;
    attended: number;
    missed: number;
    attendanceRate: number;
  };
  history: AttendanceHistoryItem[];
}

type Step = "ENTER_ID" | "CONFIRM_RECORD" | "SUCCESS";

const GLASS: React.CSSProperties = {
  background: "rgba(255,255,255,0.08)",
  border: "1px solid rgba(255,255,255,0.15)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
};

export default function CheckInFlow({
  qrToken,
  sessionName,
  location,
  learningTrack,
  instructorName,
  expiresAt,
}: Props) {
  const [step, setStep] = useState<Step>("ENTER_ID");
  const [appId, setAppId] = useState("");
  const [student, setStudent] = useState<StudentRecord | null>(null);
  const [result, setResult] = useState<CheckInResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [attendanceData, setAttendanceData] = useState<AttendanceHistoryData | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (step === "ENTER_ID") inputRef.current?.focus();
  }, [step]);

  async function handleLookup(e: React.FormEvent) {
    e.preventDefault();
    const id = appId.trim().toUpperCase();
    if (!id) return;
    setError("");
    setLoading(true);

    const res = await fetch(
      `/api/students/lookup/${encodeURIComponent(id)}?token=${encodeURIComponent(qrToken)}`
    );
    setLoading(false);

    if (res.ok) {
      const data = await res.json();
      setStudent(data);
      setStep("CONFIRM_RECORD");
    } else {
      const data = await res.json().catch(() => ({}));
      if (res.status === 429) {
        setError("Too many attempts. Please wait a moment and try again.");
      } else if (res.status === 401) {
        setError("Session has expired or is no longer active.");
      } else {
        setError(data.error ?? "Something went wrong. Please try again.");
      }
      inputRef.current?.focus();
    }
  }

  async function fetchHistory(applicationId: string) {
    setLoadingHistory(true);
    try {
      const res = await fetch(
        `/api/attendance/student/${encodeURIComponent(applicationId)}?token=${encodeURIComponent(qrToken)}`
      );
      if (res.ok) {
        setAttendanceData(await res.json());
      }
    } catch (err) {
      console.error("Failed to fetch attendance history", err);
    } finally {
      setLoadingHistory(false);
    }
  }

  async function handleClockIn() {
    if (!student) return;
    setError("");
    setLoading(true);

    const res = await fetch("/api/attendance/checkin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ qrToken, applicationId: student.applicationId }),
    });
    setLoading(false);

    const data = await res.json().catch(() => ({}));

    if (res.ok) {
      setResult(data.data);
      setStep("SUCCESS");
      fetchHistory(student.applicationId);
    } else if (res.status === 409) {
      setError("already_checked_in");
    } else if (res.status === 410) {
      setError("session_ended");
    } else {
      setError(data.error ?? "Failed to record attendance. Please try again.");
    }
  }

  if (step === "SUCCESS" && result && student) {
    return (
      <SuccessScreen
        result={result}
        student={student}
        attendanceData={attendanceData}
        loadingHistory={loadingHistory}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-8">
      <div className="w-full max-w-[420px]">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <img
            src={ICBM_LOGO_BASE64}
            alt="ICBM-AttendX"
            style={{
              width: "56px",
              height: "56px",
              objectFit: "contain",
              mixBlendMode: "screen",
              display: "block",
              margin: "0 auto",
            }}
          />
        </div>

        {/* Session banner */}
        <div
          className="rounded-xl p-4 mb-6"
          style={{
            background: "rgba(255,255,255,0.07)",
            border: "1px solid rgba(255,255,255,0.12)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
          }}
        >
          <p className="text-white font-semibold text-base leading-snug mb-1">
            {sessionName}
          </p>
          <p className="text-xs mb-2" style={{ color: "rgba(255,255,255,0.5)" }}>
            {location} · {learningTrack} · {instructorName}
          </p>
          <div className="flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="#C9922A" strokeWidth={2}>
              <circle cx="12" cy="12" r="10" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l3 3" />
            </svg>
            <span className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>
              Closes in{" "}
              <CountdownTimer expiresAt={expiresAt} />
            </span>
          </div>
        </div>

        {/* ENTER_ID step */}
        {step === "ENTER_ID" && (
          <div className="rounded-2xl p-6" style={GLASS}>
            <h1 className="text-xl font-bold mb-1 text-white">
              Enter Your Application ID
            </h1>
            <p className="text-sm mb-5" style={{ color: "rgba(255,255,255,0.6)" }}>
              Type the ID on your student ID card
            </p>

            <form onSubmit={handleLookup} className="space-y-4">
              <div>
                <input
                  ref={inputRef}
                  type="text"
                  value={appId}
                  onChange={(e) => setAppId(e.target.value)}
                  placeholder="e.g. APP-2025-12345"
                  autoCapitalize="none"
                  autoCorrect="off"
                  autoComplete="off"
                  spellCheck={false}
                  className="w-full rounded-xl border px-4 py-3 text-base outline-none transition-colors bg-white"
                  style={{
                    borderColor: error ? "#fca5a5" : "#E2E8F0",
                    color: "#0F1E35",
                    fontSize: "16px",
                  }}
                  onFocus={(e) =>
                    (e.target.style.borderColor = error ? "#fca5a5" : "#0E7C7B")
                  }
                  onBlur={(e) =>
                    (e.target.style.borderColor = error ? "#fca5a5" : "#E2E8F0")
                  }
                />
                {error && (
                  <p className="text-sm mt-2" style={{ color: "#fca5a5" }}>
                    {error}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || !appId.trim()}
                className="w-full rounded-xl font-semibold text-white text-base transition-opacity disabled:opacity-60"
                style={{
                  backgroundColor: "#0E7C7B",
                  height: "52px",
                  fontSize: "16px",
                }}
              >
                {loading ? "Looking up…" : "Find My Record"}
              </button>
            </form>
          </div>
        )}

        {/* CONFIRM_RECORD step */}
        {step === "CONFIRM_RECORD" && student && (
          <div className="rounded-2xl p-6" style={GLASS}>
            <h1 className="text-xl font-bold mb-4 text-white">
              Is this you?
            </h1>

            {/* Already checked in banner */}
            {error === "already_checked_in" && (
              <div
                className="rounded-xl p-3 mb-4 flex items-start gap-2"
                style={{ backgroundColor: "#dcfce7", border: "1px solid #86efac" }}
              >
                <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="#15803d" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm font-medium" style={{ color: "#15803d" }}>
                  You are already marked present for this session.
                </p>
              </div>
            )}

            {error === "session_ended" && (
              <div
                className="rounded-xl p-3 mb-4"
                style={{ backgroundColor: "#fff7ed", border: "1px solid #fed7aa" }}
              >
                <p className="text-sm font-medium" style={{ color: "#c2410c" }}>
                  This session has ended. Please contact your instructor.
                </p>
              </div>
            )}

            {error && error !== "already_checked_in" && error !== "session_ended" && (
              <div
                className="rounded-xl p-3 mb-4"
                style={{ backgroundColor: "#fef2f2", border: "1px solid #fca5a5" }}
              >
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* Student card */}
            <div
              className="rounded-xl p-4 mb-5"
              style={{
                background: "rgba(255,255,255,0.12)",
                border: "1px solid rgba(255,255,255,0.2)",
              }}
            >
              <p className="text-2xl font-bold mb-1 leading-tight text-white">
                {student.fullName}
              </p>
              <p
                className="font-mono text-sm font-semibold mb-3"
                style={{ color: "#0E7C7B" }}
              >
                {student.applicationId}
              </p>
              <div className="grid grid-cols-3 gap-2">
                <InfoChip label="Gender" value={student.gender} />
                <InfoChip label="Location" value={student.trainingLocation} />
                <InfoChip label="Track" value={student.learningTrack} />
              </div>
            </div>

            {/* Actions */}
            {error !== "already_checked_in" && (
              <button
                onClick={handleClockIn}
                disabled={loading || error === "session_ended"}
                className="w-full rounded-xl font-bold text-white text-base transition-opacity disabled:opacity-60 mb-3"
                style={{
                  backgroundColor: "#0E7C7B",
                  height: "56px",
                  fontSize: "17px",
                }}
              >
                {loading ? "Recording attendance…" : "Clock In"}
              </button>
            )}

            <button
              onClick={() => {
                setStep("ENTER_ID");
                setStudent(null);
                setError("");
                setAppId("");
              }}
              className="w-full text-center text-sm py-2"
              style={{ color: "rgba(255,255,255,0.55)" }}
            >
              Not me — try again
            </button>
          </div>
        )}
      </div>

      <p className="text-xs mt-8" style={{ color: "rgba(255,255,255,0.3)" }}>
        ICBM-AttendX · Secure Attendance System
      </p>
    </div>
  );
}

function InfoChip({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="rounded-lg p-2 text-center"
      style={{
        background: "rgba(255,255,255,0.15)",
        border: "1px solid rgba(255,255,255,0.2)",
      }}
    >
      <p className="text-xs mb-0.5" style={{ color: "rgba(255,255,255,0.5)" }}>
        {label}
      </p>
      <p className="text-xs font-semibold truncate text-white">
        {value}
      </p>
    </div>
  );
}

function SuccessScreen({
  result,
  student,
  attendanceData,
  loadingHistory,
}: {
  result: CheckInResult;
  student: StudentRecord;
  attendanceData: AttendanceHistoryData | null;
  loadingHistory: boolean;
}) {
  const checkInDate = new Date(result.checkInTime);

  const timeStr = checkInDate.toLocaleTimeString("en-NG", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
  const dateStr = checkInDate.toLocaleDateString("en-NG", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const initials = student.fullName
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("");

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-[420px]">
        <div className="flex justify-center mb-3">
          <img
            src={ICBM_LOGO_BASE64}
            alt="ICBM-AttendX"
            style={{
              width: "56px",
              height: "56px",
              objectFit: "contain",
              mixBlendMode: "screen",
              display: "block",
              margin: "0 auto",
            }}
          />
        </div>

        <div className="rounded-2xl p-8 text-center" style={{
          background: "rgba(255,255,255,0.08)",
          border: "1px solid rgba(255,255,255,0.15)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
        }}>
          {/* Animated checkmark */}
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
            style={{
              backgroundColor: "#dcfce7",
              animation: "scale-in 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275) both",
            }}
          >
            <svg
              className="w-10 h-10"
              fill="none"
              viewBox="0 0 24 24"
              stroke="#16a34a"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <h1 className="text-2xl font-bold mb-1 text-white">
            Attendance Recorded!
          </h1>

          <p className="text-xl font-semibold mb-4" style={{ color: "#0E7C7B" }}>
            {result.fullName}
          </p>

          <div
            className="rounded-xl p-4 mb-5"
            style={{ background: "rgba(255,255,255,0.1)" }}
          >
            <p className="text-2xl font-bold mb-0.5 text-white">
              {timeStr}
            </p>
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>
              {dateStr}
            </p>
          </div>

          <p className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
            {result.sessionName}
          </p>
        </div>

        {/* Student info card */}
        <div
          className="rounded-2xl p-4 mt-4"
          style={{
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.15)",
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: "#0E7C7B" }}
            >
              <span className="text-white font-bold text-sm">{initials}</span>
            </div>
            <div className="min-w-0">
              <p className="text-white font-semibold text-sm truncate">
                {student.fullName}
              </p>
              <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.5)" }}>
                {student.applicationId} · {student.learningTrack}
              </p>
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>
                {student.trainingLocation}
              </p>
            </div>
          </div>
        </div>

        {/* Attendance summary */}
        {loadingHistory ? (
          <div
            className="rounded-2xl p-5 mt-4 text-center"
            style={{
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.15)",
            }}
          >
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
              Loading your attendance record…
            </p>
          </div>
        ) : attendanceData ? (
          <>
            <div className="grid grid-cols-3 gap-2 mt-4">
              <StatChip
                value={attendanceData.summary.attended}
                label="Attended"
                color="#0E7C7B"
              />
              <StatChip
                value={attendanceData.summary.missed}
                label="Missed"
                color="#f87171"
              />
              <StatChip
                value={`${attendanceData.summary.attendanceRate}%`}
                label="Rate"
                color="#C9922A"
              />
            </div>

            {attendanceData.history.length > 0 && (
              <div
                className="rounded-2xl mt-4 overflow-hidden"
                style={{
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.15)",
                }}
              >
                <div
                  className="px-4 py-3"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}
                >
                  <h3 className="text-white font-semibold text-sm">Recent Sessions</h3>
                </div>
                <div>
                  {attendanceData.history.slice(0, 8).map((item, idx) => (
                    <div
                      key={item.sessionId}
                      className="flex items-center gap-3 px-4 py-3"
                      style={{
                        borderTop: idx === 0 ? "none" : "1px solid rgba(255,255,255,0.06)",
                      }}
                    >
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{
                          backgroundColor: item.attended
                            ? "rgba(14,124,123,0.2)"
                            : "rgba(248,113,113,0.2)",
                        }}
                      >
                        {item.attended ? (
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="#0E7C7B" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="#f87171" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-xs font-semibold truncate">
                          {item.sessionName}
                        </p>
                        <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                          {new Date(item.date).toLocaleDateString("en-NG", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                          {item.checkInTime &&
                            ` · ${new Date(item.checkInTime).toLocaleTimeString("en-NG", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}`}
                        </p>
                      </div>
                      <span
                        className="text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                        style={{
                          backgroundColor: item.attended
                            ? "rgba(14,124,123,0.2)"
                            : "rgba(248,113,113,0.2)",
                          color: item.attended ? "#0E7C7B" : "#f87171",
                        }}
                      >
                        {item.attended ? "Present" : "Absent"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : null}

        <p className="text-sm font-medium text-center mt-6" style={{ color: "rgba(255,255,255,0.45)" }}>
          You may close this page.
        </p>

        <p className="text-xs text-center mt-4" style={{ color: "rgba(255,255,255,0.3)" }}>
          ICBM-AttendX · Secure Attendance System
        </p>
      </div>

      <style>{`
        @keyframes scale-in {
          from { transform: scale(0); opacity: 0; }
          to   { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

function StatChip({
  value,
  label,
  color,
}: {
  value: number | string;
  label: string;
  color: string;
}) {
  return (
    <div
      className="rounded-xl p-3 text-center"
      style={{
        backgroundColor: `${color}26`,
        border: `1px solid ${color}33`,
      }}
    >
      <p className="font-bold text-xl" style={{ color }}>
        {value}
      </p>
      <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.5)" }}>
        {label}
      </p>
    </div>
  );
}
