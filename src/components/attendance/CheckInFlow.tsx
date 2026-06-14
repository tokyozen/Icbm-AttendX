"use client";

import { useEffect, useRef, useState } from "react";
import CountdownTimer from "@/components/sessions/CountdownTimer";

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

type Step = "ENTER_ID" | "CONFIRM_RECORD" | "SUCCESS";

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
    } else if (res.status === 409) {
      setError("already_checked_in");
    } else if (res.status === 410) {
      setError("session_ended");
    } else {
      setError(data.error ?? "Failed to record attendance. Please try again.");
    }
  }

  if (step === "SUCCESS" && result) {
    return <SuccessScreen result={result} />;
  }

  return (
    <div className="min-h-screen bg-[#F5F6FA] flex flex-col items-center px-4 py-8">
      <div className="w-full max-w-[420px]">
        {/* Logo */}
        <div className="text-center mb-6">
          <p className="text-sm font-bold tracking-wider" style={{ color: "#0F1E35" }}>
            ICBM-AttendX
          </p>
        </div>

        {/* Session banner */}
        <div
          className="rounded-xl p-4 mb-6"
          style={{ backgroundColor: "#0F1E35" }}
        >
          <p className="text-white font-semibold text-base leading-snug mb-1">
            {sessionName}
          </p>
          <p className="text-xs mb-2" style={{ color: "#94a3b8" }}>
            {location} · {learningTrack} · {instructorName}
          </p>
          <div className="flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="#C9922A" strokeWidth={2}>
              <circle cx="12" cy="12" r="10" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l3 3" />
            </svg>
            <span className="text-xs" style={{ color: "#94a3b8" }}>
              Closes in{" "}
              <CountdownTimer expiresAt={expiresAt} />
            </span>
          </div>
        </div>

        {/* Step content */}
        {step === "ENTER_ID" && (
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h1
              className="text-xl font-bold mb-1"
              style={{ color: "#0F1E35" }}
            >
              Enter Your Application ID
            </h1>
            <p className="text-sm mb-5" style={{ color: "#64748b" }}>
              Type the ID on your student ID card
            </p>

            <form onSubmit={handleLookup} className="space-y-4">
              <div>
                <input
                  ref={inputRef}
                  type="text"
                  value={appId}
                  onChange={(e) => setAppId(e.target.value)}
                  placeholder="e.g. ICBM-2026-0001"
                  autoCapitalize="none"
                  autoCorrect="off"
                  autoComplete="off"
                  spellCheck={false}
                  className="w-full rounded-xl border px-4 py-3 text-base outline-none transition-colors"
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
                  <p className="text-sm mt-2 text-red-500">{error}</p>
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

        {step === "CONFIRM_RECORD" && student && (
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h1
              className="text-xl font-bold mb-4"
              style={{ color: "#0F1E35" }}
            >
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
                backgroundColor: "#F5F6FA",
                border: "1px solid #E2E8F0",
              }}
            >
              <p
                className="text-2xl font-bold mb-1 leading-tight"
                style={{ color: "#0F1E35" }}
              >
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
              style={{ color: "#64748b" }}
            >
              Not me — try again
            </button>
          </div>
        )}
      </div>

      <p className="text-xs mt-8" style={{ color: "#cbd5e1" }}>
        ICBM-AttendX · Secure Attendance System
      </p>
    </div>
  );
}

function InfoChip({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="rounded-lg p-2 text-center"
      style={{ backgroundColor: "white", border: "1px solid #E2E8F0" }}
    >
      <p className="text-xs mb-0.5" style={{ color: "#94a3b8" }}>
        {label}
      </p>
      <p className="text-xs font-semibold truncate" style={{ color: "#0F1E35" }}>
        {value}
      </p>
    </div>
  );
}

function SuccessScreen({ result }: { result: CheckInResult }) {
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

  return (
    <div className="min-h-screen bg-[#F5F6FA] flex items-center justify-center px-4">
      <div className="w-full max-w-[420px]">
        <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
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
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>

          <h1
            className="text-2xl font-bold mb-1"
            style={{ color: "#0F1E35" }}
          >
            Attendance Recorded!
          </h1>

          <p className="text-xl font-semibold mb-4" style={{ color: "#0E7C7B" }}>
            {result.fullName}
          </p>

          <div
            className="rounded-xl p-4 mb-5"
            style={{ backgroundColor: "#F5F6FA" }}
          >
            <p className="text-2xl font-bold mb-0.5" style={{ color: "#0F1E35" }}>
              {timeStr}
            </p>
            <p className="text-sm" style={{ color: "#64748b" }}>
              {dateStr}
            </p>
          </div>

          <p className="text-sm" style={{ color: "#94a3b8" }}>
            {result.sessionName}
          </p>

          <p
            className="text-sm font-medium mt-6"
            style={{ color: "#64748b" }}
          >
            You may close this page.
          </p>
        </div>

        <p className="text-xs text-center mt-4" style={{ color: "#cbd5e1" }}>
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
