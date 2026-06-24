"use client";

import { useCallback, useEffect, useState } from "react";
import { LEARNING_TRACKS, TRAINING_LOCATIONS } from "@/types/index";
import { formatDate, formatTime } from "@/lib/utils";

interface SessionOption {
  id: string;
  sessionName: string;
  sessionCode: string;
}

interface FacilitatorOption {
  id: string;
  name: string;
}

interface AttendanceRow {
  id: string;
  fullName: string;
  applicationId: string;
  learningTrack: string;
  trainingLocation: string;
  checkInTime: string;
  isAbsent: boolean;
  verificationStatus: string;
  session: { sessionName: string; location: string };
}

interface Summary {
  totalStudents: number;
  totalRecords: number;
  presentRecords: number;
  absentStudents: number;
  activeSessions: number;
  attendanceRate: number;
}

const ATTENDANCE_STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "present", label: "Present" },
  { value: "absent", label: "Absent" },
  { value: "verified", label: "Verified" },
  { value: "flagged", label: "Flagged" },
  { value: "pending", label: "Pending" },
] as const;

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}
function today() {
  return isoDate(new Date());
}
function yesterday() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return isoDate(d);
}
function startOfWeek(d: Date) {
  const x = new Date(d);
  x.setDate(x.getDate() - x.getDay());
  return x;
}
function thisWeekRange() {
  return { startDate: isoDate(startOfWeek(new Date())), endDate: today() };
}
function lastWeekRange() {
  const end = startOfWeek(new Date());
  end.setDate(end.getDate() - 1);
  const start = startOfWeek(end);
  return { startDate: isoDate(start), endDate: isoDate(end) };
}
function thisMonthRange() {
  const start = new Date();
  start.setDate(1);
  return { startDate: isoDate(start), endDate: today() };
}
function lastMonthRange() {
  const end = new Date();
  end.setDate(0); // last day of previous month
  const start = new Date(end.getFullYear(), end.getMonth(), 1);
  return { startDate: isoDate(start), endDate: isoDate(end) };
}

const QUICK_RANGES = [
  { key: "today", label: "Today", getValue: () => ({ startDate: today(), endDate: today() }) },
  { key: "yesterday", label: "Yesterday", getValue: () => ({ startDate: yesterday(), endDate: yesterday() }) },
  { key: "thisWeek", label: "This Week", getValue: thisWeekRange },
  { key: "lastWeek", label: "Last Week", getValue: lastWeekRange },
  { key: "thisMonth", label: "This Month", getValue: thisMonthRange },
  { key: "lastMonth", label: "Last Month", getValue: lastMonthRange },
] as const;

interface Filters {
  startDate: string;
  endDate: string;
  location: string;
  track: string;
  sessionId: string;
  attendanceStatus: string;
  instructorId: string;
}

const DEFAULT_FILTERS: Filters = {
  startDate: "",
  endDate: "",
  location: "",
  track: "",
  sessionId: "",
  attendanceStatus: "",
  instructorId: "",
};

function buildQueryString(filters: Filters, extra?: Record<string, string>) {
  const params = new URLSearchParams();
  if (filters.startDate) params.set("startDate", filters.startDate);
  if (filters.endDate) params.set("endDate", filters.endDate);
  if (filters.location) params.set("location", filters.location);
  if (filters.track) params.set("track", filters.track);
  if (filters.sessionId) params.set("sessionId", filters.sessionId);
  if (filters.attendanceStatus) params.set("attendanceStatus", filters.attendanceStatus);
  if (filters.instructorId) params.set("instructorId", filters.instructorId);
  if (extra) Object.entries(extra).forEach(([k, v]) => params.set(k, v));
  return params.toString();
}

export default function ReportsPage() {
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [applied, setApplied] = useState<Filters>(DEFAULT_FILTERS);
  const [activeQuickRange, setActiveQuickRange] = useState<string | null>(null);
  const [sessions, setSessions] = useState<SessionOption[]>([]);
  const [facilitators, setFacilitators] = useState<FacilitatorOption[]>([]);
  const [records, setRecords] = useState<AttendanceRow[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState<"csv" | "excel" | "pdf" | null>(null);

  // Filter option sources
  useEffect(() => {
    fetch("/api/sessions?limit=100")
      .then((r) => r.json())
      .then((d) => setSessions(d.sessions ?? []))
      .catch(() => {});
    fetch("/api/users?status=active")
      .then((r) => r.json())
      .then((d) =>
        setFacilitators(
          (d.users ?? []).filter((u: { role: string }) => u.role === "INSTRUCTOR")
        )
      )
      .catch(() => {});
  }, []);

  const fetchRecords = useCallback(async (f: Filters, pg: number) => {
    setLoading(true);
    const qs = buildQueryString(f, { page: String(pg), limit: "20" });
    const [recordsRes, summaryRes] = await Promise.all([
      fetch(`/api/attendance?${qs}`),
      fetch(`/api/attendance/summary?${buildQueryString(f)}`),
    ]);
    if (recordsRes.ok) {
      const d = await recordsRes.json();
      setRecords(d.records ?? []);
      setTotal(d.total ?? 0);
      setTotalPages(d.totalPages ?? 1);
    }
    if (summaryRes.ok) {
      setSummary(await summaryRes.json());
    }
    setLoading(false);
  }, []);

  // Initial load — all records
  useEffect(() => {
    fetchRecords(DEFAULT_FILTERS, 1);
  }, [fetchRecords]);

  function applyFilters() {
    setApplied(filters);
    setPage(1);
    fetchRecords(filters, 1);
  }

  function resetFilters() {
    setFilters(DEFAULT_FILTERS);
    setApplied(DEFAULT_FILTERS);
    setActiveQuickRange(null);
    setPage(1);
    fetchRecords(DEFAULT_FILTERS, 1);
  }

  function applyQuickRange(key: string, startDate: string, endDate: string) {
    const next = { ...filters, startDate, endDate };
    setFilters(next);
    setApplied(next);
    setActiveQuickRange(key);
    setPage(1);
    fetchRecords(next, 1);
  }

  function handleCustomDateChange(field: "startDate" | "endDate", value: string) {
    setActiveQuickRange(null);
    setFilters((p) => ({ ...p, [field]: value }));
  }

  async function handleExport(format: "csv" | "excel" | "pdf") {
    setDownloading(format);
    const qs = buildQueryString(applied, { format });
    const res = await fetch(`/api/export?${qs}`);
    if (res.ok) {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const dateTag = new Date().toISOString().slice(0, 10);
      const ext = format === "excel" ? "xlsx" : format;
      a.href = url;
      a.download = `attendance-${dateTag}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
    setDownloading(null);
  }

  function changePage(pg: number) {
    setPage(pg);
    fetchRecords(applied, pg);
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <h1 className="text-4xl font-black tracking-tight text-[#0F1E35] mb-6">
        Reports &amp; Exports
      </h1>

      {/* ── Summary cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-5">
        <SummaryCard label="Total Students" value={summary?.totalStudents} color="#0F1E35" />
        <SummaryCard label="Attendance Records" value={summary?.totalRecords} color="#0E7C7B" />
        <SummaryCard
          label="Attendance Rate"
          value={summary ? `${summary.attendanceRate}%` : undefined}
          color="#C9922A"
        />
        <SummaryCard label="Active Sessions" value={summary?.activeSessions} color="#2563eb" />
        <SummaryCard label="Absent Students" value={summary?.absentStudents} color="#dc2626" />
      </div>

      {/* ── Quick filters ── */}
      <div className="bg-white rounded-xl border p-6 mb-5" style={{ borderColor: "#E2E8F0" }}>
        <h2 className="text-sm font-semibold mb-3" style={{ color: "#0F1E35" }}>
          Quick Filters
        </h2>
        <div className="flex flex-wrap gap-2">
          {QUICK_RANGES.map((r) => (
            <button
              key={r.key}
              onClick={() => {
                const { startDate, endDate } = r.getValue();
                applyQuickRange(r.key, startDate, endDate);
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors"
              style={
                activeQuickRange === r.key
                  ? { borderColor: "#0E7C7B", color: "#0E7C7B", backgroundColor: "#0E7C7B1A" }
                  : { borderColor: "#E2E8F0", color: "#475569" }
              }
            >
              {r.label}
            </button>
          ))}
        </div>

        {/* ── Advanced filters ── */}
        <h2 className="text-sm font-semibold mt-5 mb-3" style={{ color: "#0F1E35" }}>
          Advanced Filters
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 mb-4">
          <FilterField label="From Date (Custom Range)">
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => handleCustomDateChange("startDate", e.target.value)}
              className="filter-input"
            />
          </FilterField>
          <FilterField label="To Date (Custom Range)">
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => handleCustomDateChange("endDate", e.target.value)}
              className="filter-input"
            />
          </FilterField>
          <FilterField label="Location">
            <select
              value={filters.location}
              onChange={(e) => setFilters((p) => ({ ...p, location: e.target.value }))}
              className="filter-input"
            >
              <option value="">All Locations</option>
              {TRAINING_LOCATIONS.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </FilterField>
          <FilterField label="Track">
            <select
              value={filters.track}
              onChange={(e) => setFilters((p) => ({ ...p, track: e.target.value }))}
              className="filter-input"
            >
              <option value="">All Tracks</option>
              {LEARNING_TRACKS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </FilterField>
          <FilterField label="Session">
            <select
              value={filters.sessionId}
              onChange={(e) => setFilters((p) => ({ ...p, sessionId: e.target.value }))}
              className="filter-input"
            >
              <option value="">All Sessions</option>
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.sessionName} ({s.sessionCode})
                </option>
              ))}
            </select>
          </FilterField>
          <FilterField label="Attendance Status">
            <select
              value={filters.attendanceStatus}
              onChange={(e) => setFilters((p) => ({ ...p, attendanceStatus: e.target.value }))}
              className="filter-input"
            >
              {ATTENDANCE_STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </FilterField>
          <FilterField label="Facilitator">
            <select
              value={filters.instructorId}
              onChange={(e) => setFilters((p) => ({ ...p, instructorId: e.target.value }))}
              className="filter-input"
            >
              <option value="">All Facilitators</option>
              {facilitators.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </FilterField>
        </div>

        <div className="flex gap-2">
          <button
            onClick={applyFilters}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white"
            style={{ backgroundColor: "#0E7C7B" }}
          >
            Apply Filters
          </button>
          <button
            onClick={resetFilters}
            className="px-4 py-2 rounded-lg text-sm font-medium border"
            style={{ borderColor: "#E2E8F0", color: "#64748b" }}
          >
            Reset
          </button>
        </div>
      </div>

      {/* ── Export panel ── */}
      <div className="bg-white rounded-xl border p-5 mb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4" style={{ borderColor: "#E2E8F0" }}>
        <div>
          <p className="text-sm font-semibold mb-0.5" style={{ color: "#0F1E35" }}>
            Export Results
          </p>
          <p className="text-xs" style={{ color: "#64748b" }}>
            {total} records match current filters
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ExportBtn
            label="Export CSV"
            color="#16a34a"
            loading={downloading === "csv"}
            onClick={() => handleExport("csv")}
          />
          <ExportBtn
            label="Export Excel"
            color="#2563eb"
            loading={downloading === "excel"}
            onClick={() => handleExport("excel")}
          />
          <ExportBtn
            label="Export PDF"
            color="#dc2626"
            loading={downloading === "pdf"}
            onClick={() => handleExport("pdf")}
          />
        </div>
      </div>

      {/* ── Preview table ── */}
      <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: "#E2E8F0" }}>
        <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: "#E2E8F0" }}>
          <h2 className="text-sm font-semibold" style={{ color: "#0F1E35" }}>
            Preview
          </h2>
          <p className="text-xs" style={{ color: "#64748b" }}>
            {loading ? "Loading…" : `Showing ${records.length} of ${total} records`}
          </p>
        </div>

        {loading ? (
          <div className="py-16 text-center">
            <div
              className="w-7 h-7 border-2 border-t-transparent rounded-full animate-spin mx-auto"
              style={{ borderColor: "#0E7C7B", borderTopColor: "transparent" }}
            />
          </div>
        ) : records.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm" style={{ color: "#94a3b8" }}>
              No records match your filters.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ backgroundColor: "#F5F6FA", borderBottom: "1px solid #E2E8F0" }}>
                    {["Full Name", "Application ID", "Track", "Location", "Session", "Check-In Time", "Status"].map((h) => (
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
                  {records.map((r, i) => (
                    <tr
                      key={r.id}
                      style={{ borderBottom: i < records.length - 1 ? "1px solid #F1F5F9" : "none" }}
                    >
                      <td className="px-4 py-3 font-medium whitespace-nowrap" style={{ color: "#0F1E35" }}>
                        {r.fullName}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs whitespace-nowrap" style={{ color: "#0E7C7B" }}>
                        {r.applicationId}
                      </td>
                      <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: "#475569" }}>
                        {r.learningTrack}
                      </td>
                      <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: "#475569" }}>
                        {r.trainingLocation}
                      </td>
                      <td className="px-4 py-3 text-xs max-w-[180px] truncate" style={{ color: "#64748b" }}>
                        {r.session.sessionName}
                      </td>
                      <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: "#64748b" }}>
                        {formatDate(r.checkInTime)}, {formatTime(r.checkInTime)}
                      </td>
                      <td className="px-4 py-3 text-xs whitespace-nowrap">
                        <StatusBadge isAbsent={r.isAbsent} verificationStatus={r.verificationStatus} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div
                className="px-6 py-3 border-t flex items-center justify-between"
                style={{ borderColor: "#E2E8F0" }}
              >
                <p className="text-xs" style={{ color: "#64748b" }}>
                  Page {page} of {totalPages}
                </p>
                <div className="flex gap-1">
                  <button
                    disabled={page === 1}
                    onClick={() => changePage(page - 1)}
                    className="px-3 py-1.5 text-xs rounded-lg border disabled:opacity-40"
                    style={{ borderColor: "#E2E8F0", color: "#64748b" }}
                  >
                    ← Prev
                  </button>
                  <button
                    disabled={page === totalPages}
                    onClick={() => changePage(page + 1)}
                    className="px-3 py-1.5 text-xs rounded-lg border disabled:opacity-40"
                    style={{ borderColor: "#E2E8F0", color: "#64748b" }}
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <style>{`
        .filter-input {
          width: 100%;
          border: 1px solid #E2E8F0;
          border-radius: 0.5rem;
          padding: 0.4rem 0.75rem;
          font-size: 0.8125rem;
          color: #0F1E35;
          outline: none;
          background: white;
        }
        .filter-input:focus { border-color: #0E7C7B; }
      `}</style>
    </div>
  );
}

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1" style={{ color: "#64748b" }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function SummaryCard({ label, value, color }: { label: string; value: number | string | undefined; color: string }) {
  return (
    <div
      className="bg-white rounded-xl border p-4"
      style={{ borderColor: "#E2E8F0", borderLeft: `4px solid ${color}` }}
    >
      <p className="text-2xl font-extrabold mb-0.5" style={{ color }}>
        {value === undefined ? "—" : value}
      </p>
      <p className="text-xs" style={{ color: "#64748b" }}>{label}</p>
    </div>
  );
}

function StatusBadge({ isAbsent, verificationStatus }: { isAbsent: boolean; verificationStatus: string }) {
  if (isAbsent) {
    return (
      <span className="inline-block text-xs font-bold px-2 py-0.5 rounded-full whitespace-nowrap" style={{ backgroundColor: "#fee2e2", color: "#dc2626" }}>
        Absent
      </span>
    );
  }
  const map: Record<string, { bg: string; color: string }> = {
    VERIFIED: { bg: "#dcfce7", color: "#15803d" },
    FLAGGED: { bg: "#fee2e2", color: "#dc2626" },
    PENDING: { bg: "#fef9c3", color: "#a16207" },
  };
  const s = map[verificationStatus] ?? map.PENDING;
  return (
    <span className="inline-block text-xs font-bold px-2 py-0.5 rounded-full whitespace-nowrap" style={{ backgroundColor: s.bg, color: s.color }}>
      {verificationStatus}
    </span>
  );
}

function ExportBtn({
  label,
  color,
  loading,
  onClick,
}: {
  label: string;
  color: string;
  loading: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border disabled:opacity-60"
      style={{ borderColor: color, color }}
    >
      {loading ? (
        <span
          className="w-3.5 h-3.5 border border-t-transparent rounded-full animate-spin"
          style={{ borderColor: color, borderTopColor: "transparent" }}
        />
      ) : (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
      )}
      {loading ? "Exporting…" : label}
    </button>
  );
}
