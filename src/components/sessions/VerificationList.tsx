"use client";

import { useEffect, useState } from "react";

interface VerificationRecord {
  id: string;
  fullName: string;
  applicationId: string;
  checkInTime: string;
  learningTrack: string;
  verificationStatus: "PENDING" | "VERIFIED" | "FLAGGED";
}

interface Props {
  sessionId: string;
  sessionName: string;
  records: VerificationRecord[];
  onComplete: () => void;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-NG", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

const cycleStatus = (current: string): "PENDING" | "VERIFIED" | "FLAGGED" => {
  if (current === "PENDING") return "VERIFIED";
  if (current === "VERIFIED") return "FLAGGED";
  return "PENDING";
};

export default function VerificationList({ sessionId, sessionName: _sessionName, records: initialRecords, onComplete }: Props) {
  const [records, setRecords] = useState<VerificationRecord[]>(initialRecords);
  const [markingAll, setMarkingAll] = useState(false);

  const total = records.length;
  const verified = records.filter((r) => r.verificationStatus === "VERIFIED").length;
  const flagged = records.filter((r) => r.verificationStatus === "FLAGGED").length;
  const pending = records.filter((r) => r.verificationStatus === "PENDING").length;

  useEffect(() => {
    if (total > 0 && pending === 0) onComplete();
  }, [pending, total, onComplete]);

  const handleToggle = async (recordId: string, currentStatus: string) => {
    const newStatus = cycleStatus(currentStatus);
    setRecords((prev) =>
      prev.map((r) => (r.id === recordId ? { ...r, verificationStatus: newStatus } : r))
    );
    await fetch(`/api/attendance/${recordId}/verify`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
  };

  const handleMarkAllVerified = async () => {
    setMarkingAll(true);
    setRecords((prev) =>
      prev.map((r) =>
        r.verificationStatus === "PENDING" ? { ...r, verificationStatus: "VERIFIED" } : r
      )
    );
    await fetch(`/api/attendance/${sessionId}/verify-all`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    });
    setMarkingAll(false);
  };

  return (
    <div>
      {/* Header banner with blob animation */}
      <div
        className="rounded-xl p-5 mb-6 relative overflow-hidden"
        style={{ background: '#0F1E35' }}
      >
        <style>{`
          @keyframes verifyBlobDrift {
            0%   { transform: translate(0, 0) scale(1); }
            33%  { transform: translate(-25px, 35px) scale(1.12); }
            66%  { transform: translate(20px, -18px) scale(0.91); }
            100% { transform: translate(-12px, 12px) scale(1.07); }
          }
        `}</style>

        {/* Teal blob — top right */}
        <div style={{
          position: 'absolute',
          top: '-120px',
          right: '-120px',
          width: '380px',
          height: '380px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(14,124,123,0.95), rgba(14,124,123,0.3) 50%, rgba(14,124,123,0))',
          filter: 'blur(55px)',
          zIndex: 0,
          pointerEvents: 'none',
          animation: 'verifyBlobDrift 16s ease-in-out infinite alternate',
        }} />

        {/* Gold blob — bottom left */}
        <div style={{
          position: 'absolute',
          bottom: '-120px',
          left: '-120px',
          width: '360px',
          height: '360px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(201,146,42,0.95), rgba(201,146,42,0.3) 50%, rgba(201,146,42,0))',
          filter: 'blur(50px)',
          zIndex: 0,
          pointerEvents: 'none',
          animation: 'verifyBlobDrift 21s ease-in-out infinite alternate',
          animationDelay: '-8s',
        }} />

        {/* Small center teal blob — depth */}
        <div style={{
          position: 'absolute',
          top: '30%',
          left: '35%',
          width: '200px',
          height: '200px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(14,124,123,0.5), rgba(14,124,123,0))',
          filter: 'blur(40px)',
          zIndex: 0,
          pointerEvents: 'none',
          animation: 'verifyBlobDrift 26s ease-in-out infinite alternate',
          animationDelay: '-14s',
        }} />

        {/* Liquid glass overlay */}
        <div style={{
          position: 'absolute',
          inset: 0,
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          background: 'rgba(15, 30, 53, 0.35)',
          borderRadius: '0.75rem',
          zIndex: 1,
          pointerEvents: 'none',
        }} />

        {/* Glass sheen highlight */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0) 50%, rgba(255,255,255,0.03) 100%)',
          borderRadius: '0.75rem',
          zIndex: 1,
          pointerEvents: 'none',
        }} />

        {/* Content */}
        <div style={{ position: 'relative', zIndex: 2 }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-3 h-3 rounded-full bg-[#C9922A] animate-pulse" />
            <h2 className="text-white font-black text-xl tracking-tight">Verification Mode</h2>
          </div>

          <p className="text-white/60 text-sm mb-4">
            Review each record and confirm students were physically present.
            Export unlocks when all records are reviewed.
          </p>

          <div className="flex gap-3 flex-wrap">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2 text-center border border-white/10">
              <div className="text-white font-black text-2xl">{total}</div>
              <div className="text-white/50 text-xs uppercase tracking-wider">Checked In</div>
            </div>
            <div className="bg-[#0E7C7B]/20 backdrop-blur-sm rounded-lg px-4 py-2 text-center border border-[#0E7C7B]/20">
              <div className="text-[#0E7C7B] font-black text-2xl">{verified}</div>
              <div className="text-white/50 text-xs uppercase tracking-wider">Verified</div>
            </div>
            <div className="bg-red-500/20 backdrop-blur-sm rounded-lg px-4 py-2 text-center border border-red-400/20">
              <div className="text-red-400 font-black text-2xl">{flagged}</div>
              <div className="text-white/50 text-xs uppercase tracking-wider">Flagged</div>
            </div>
            <div className="bg-[#C9922A]/20 backdrop-blur-sm rounded-lg px-4 py-2 text-center border border-[#C9922A]/20">
              <div className="text-[#C9922A] font-black text-2xl">{pending}</div>
              <div className="text-white/50 text-xs uppercase tracking-wider">Pending</div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick action bar */}
      {pending > 0 && (
        <div className="flex gap-3 mb-4">
          <button
            onClick={handleMarkAllVerified}
            disabled={markingAll}
            className="flex items-center gap-2 px-4 py-2 bg-[#0E7C7B] text-white text-sm font-semibold rounded-lg hover:bg-[#0E7C7B]/90 transition-colors disabled:opacity-60"
          >
            ✓ {markingAll ? "Marking…" : "Mark All as Verified"}
          </button>
          <span className="text-xs text-gray-400 self-center">
            Then flag the exceptions individually
          </span>
        </div>
      )}

      {/* Attendance list */}
      <div className="space-y-2">
        {records.map((record) => (
          <div
            key={record.id}
            className={`flex items-center gap-4 p-4 rounded-lg border-l-4 transition-all ${
              record.verificationStatus === "VERIFIED"
                ? "bg-green-50 border-[#0E7C7B]"
                : record.verificationStatus === "FLAGGED"
                ? "bg-red-50 border-red-400"
                : "bg-white border-gray-200"
            }`}
            style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
          >
            {/* Toggle button */}
            <button
              onClick={() => handleToggle(record.id, record.verificationStatus)}
              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg transition-all flex-shrink-0 ${
                record.verificationStatus === "VERIFIED"
                  ? "bg-[#0E7C7B] text-white"
                  : record.verificationStatus === "FLAGGED"
                  ? "bg-red-400 text-white"
                  : "bg-gray-100 text-gray-400 hover:bg-gray-200"
              }`}
            >
              {record.verificationStatus === "VERIFIED"
                ? "✓"
                : record.verificationStatus === "FLAGGED"
                ? "✕"
                : "○"}
            </button>

            {/* Student info */}
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-[#0F1E35] truncate">{record.fullName}</div>
              <div className="text-xs font-mono text-[#0E7C7B]">{record.applicationId}</div>
            </div>

            {/* Learning track badge */}
            <div className="hidden sm:block text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full whitespace-nowrap">
              {record.learningTrack}
            </div>

            {/* Check-in time */}
            <div className="text-sm text-gray-400 whitespace-nowrap">{formatTime(record.checkInTime)}</div>

            {/* Status badge */}
            <div
              className={`text-xs font-bold px-2 py-1 rounded-full whitespace-nowrap ${
                record.verificationStatus === "VERIFIED"
                  ? "bg-[#0E7C7B]/10 text-[#0E7C7B]"
                  : record.verificationStatus === "FLAGGED"
                  ? "bg-red-100 text-red-500"
                  : "bg-gray-100 text-gray-400"
              }`}
            >
              {record.verificationStatus}
            </div>
          </div>
        ))}
      </div>

      {/* Export section */}
      {pending === 0 ? (
        <div className="mt-6 p-6 bg-white rounded-xl border-2 border-[#0E7C7B] text-center">
          <div className="text-4xl mb-2">🎉</div>
          <h3 className="font-black text-[#0F1E35] text-lg mb-1">
            Verification Complete
          </h3>
          <p className="text-gray-400 text-sm mb-4">
            {verified} verified · {flagged} flagged
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <a
              href={`/api/export?format=csv&sessionId=${sessionId}`}
              className="px-6 py-3 bg-[#0E7C7B] text-white font-semibold rounded-lg hover:bg-[#0E7C7B]/90 transition-colors"
            >
              Export CSV
            </a>
            <a
              href={`/api/export?format=excel&sessionId=${sessionId}`}
              className="px-6 py-3 border-2 border-[#0E7C7B] text-[#0E7C7B] font-semibold rounded-lg hover:bg-[#0E7C7B]/10 transition-colors"
            >
              Export Excel
            </a>
          </div>
        </div>
      ) : (
        <div className="mt-6 p-4 bg-gray-50 rounded-xl border border-gray-200 text-center">
          <p className="text-gray-400 text-sm">
            🔒 Export unlocks when all {pending} remaining record{pending !== 1 ? "s are" : " is"} reviewed
          </p>
        </div>
      )}
    </div>
  );
}
