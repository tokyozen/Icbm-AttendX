"use client";

import { useEffect, useMemo, useState } from "react";
import { LEARNING_TRACKS } from "@/types/index";

interface AttendanceCell {
  status: "present" | "absent" | "no-session";
  checkInTime?: string;
  verificationStatus?: string;
}

interface StudentRow {
  sn: number;
  id: string;
  applicationId: string;
  fullName: string;
  gender: string;
  learningTrack: string;
  trainingLocation: string;
  daysPresent: number;
  totalSessions: number;
  attendanceRate: number;
  attendance: Record<string, AttendanceCell>;
}

interface MasterAttendanceData {
  dates: string[];
  dateLabels: Record<string, string>;
  students: StudentRow[];
  tracks: string[];
  summary: {
    totalStudents: number;
    totalSessions: number;
    totalCheckIns: number;
  };
}

interface MasterAttendanceClientProps {
  userRole: string;
  userTrack: string | null;
}

const FIXED_COLS = [
  { key: "sn", label: "S/N", width: 44 },
  { key: "appId", label: "App ID", width: 130 },
  { key: "name", label: "Full Name", width: 190 },
  { key: "gender", label: "Gender", width: 56 },
  { key: "track", label: "Track", width: 190 },
  { key: "location", label: "Location", width: 110 },
];

const DATE_COL_WIDTH = 72;
const SUMMARY_COL_WIDTH = 96;

function fixedColLeft(index: number) {
  let left = 0;
  for (let i = 0; i < index; i++) left += FIXED_COLS[i].width;
  return left;
}

const TOTAL_FIXED_WIDTH = FIXED_COLS.reduce((sum, c) => sum + c.width, 0);

export default function MasterAttendanceClient({ userRole, userTrack }: MasterAttendanceClientProps) {
  const [campus, setCampus] = useState<"All" | "Abuja" | "Enugu">("All");
  const [trackFilter, setTrackFilter] = useState<string>("All");
  const [search, setSearch] = useState("");
  const [data, setData] = useState<MasterAttendanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const isInstructor = userRole === "INSTRUCTOR";

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("campus", campus);
    if (!isInstructor && trackFilter !== "All") params.set("track", trackFilter);

    fetch(`/api/master-attendance?${params}`)
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLastUpdated(new Date());
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [campus, trackFilter, isInstructor]);

  const filteredStudents = useMemo(() => {
    if (!data) return [];
    return data.students.filter((s) => {
      const matchesCampus =
        campus === "All" || s.trainingLocation === campus || s.trainingLocation === "Both Campuses";
      const matchesTrack = trackFilter === "All" || s.learningTrack === trackFilter;
      const matchesSearch =
        !search ||
        s.fullName.toLowerCase().includes(search.toLowerCase()) ||
        s.applicationId.toLowerCase().includes(search.toLowerCase());
      return matchesCampus && matchesTrack && matchesSearch;
    });
  }, [data, campus, trackFilter, search]);

  async function handleDownload() {
    setDownloading(true);
    try {
      const res = await fetch("/api/master-attendance/download");
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ICBM_Master_Attendance_${new Date().toISOString().split("T")[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#F5F6FA" }}>
      <HeroHeader
        summary={data?.summary}
        lastUpdated={lastUpdated}
        downloading={downloading}
        onDownload={handleDownload}
      />

      <FilterBar
        campus={campus}
        setCampus={setCampus}
        trackFilter={trackFilter}
        setTrackFilter={setTrackFilter}
        search={search}
        setSearch={setSearch}
        isInstructor={isInstructor}
        userTrack={userTrack}
        shownCount={filteredStudents.length}
        totalCount={data?.students.length ?? 0}
      />

      <div className="p-6 lg:p-8">
        {loading ? (
          <div className="bg-white rounded-xl border py-24 text-center" style={{ borderColor: "#E2E8F0" }}>
            <div
              className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto"
              style={{ borderColor: "#0E7C7B", borderTopColor: "transparent" }}
            />
          </div>
        ) : !data || data.dates.length === 0 ? (
          <div className="bg-white rounded-xl border py-24 text-center" style={{ borderColor: "#E2E8F0" }}>
            <p className="text-sm" style={{ color: "#94a3b8" }}>
              No closed sessions found yet.
            </p>
          </div>
        ) : (
          <AttendanceGrid data={data} students={filteredStudents} />
        )}
      </div>

      <Footer />
    </div>
  );
}

function HeroHeader({
  summary,
  lastUpdated,
  downloading,
  onDownload,
}: {
  summary?: MasterAttendanceData["summary"];
  lastUpdated: Date | null;
  downloading: boolean;
  onDownload: () => void;
}) {
  return (
    <div className="px-6 lg:px-8 py-8" style={{ backgroundColor: "#0F1E35" }}>
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div>
          <h1 className="text-3xl lg:text-4xl font-black tracking-tight text-white">Master Attendance Report</h1>
          <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.6)" }}>
            ICBM BPO Division · June 2026 Bootcamp
          </p>

          <div className="flex flex-wrap gap-3 mt-4">
            <StatPill label="Total Students" value={summary?.totalStudents ?? "—"} />
            <StatPill label="Total Sessions" value={summary?.totalSessions ?? "—"} />
            <StatPill label="Total Check-ins" value={summary?.totalCheckIns ?? "—"} />
          </div>
        </div>

        <div className="flex flex-col items-start lg:items-end gap-2">
          <button
            onClick={onDownload}
            disabled={downloading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-60"
            style={{ backgroundColor: "#0E7C7B" }}
          >
            {downloading ? (
              <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            )}
            {downloading ? "Generating…" : "Download Excel"}
          </button>
          {lastUpdated && (
            <span className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
              Last updated {lastUpdated.toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function StatPill({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="px-4 py-2 rounded-lg" style={{ backgroundColor: "rgba(255,255,255,0.08)" }}>
      <p className="text-lg font-bold text-white leading-tight">{value}</p>
      <p className="text-[11px] uppercase tracking-wide" style={{ color: "rgba(255,255,255,0.5)" }}>
        {label}
      </p>
    </div>
  );
}

function FilterBar({
  campus,
  setCampus,
  trackFilter,
  setTrackFilter,
  search,
  setSearch,
  isInstructor,
  userTrack,
  shownCount,
  totalCount,
}: {
  campus: "All" | "Abuja" | "Enugu";
  setCampus: (c: "All" | "Abuja" | "Enugu") => void;
  trackFilter: string;
  setTrackFilter: (t: string) => void;
  search: string;
  setSearch: (s: string) => void;
  isInstructor: boolean;
  userTrack: string | null;
  shownCount: number;
  totalCount: number;
}) {
  return (
    <div className="sticky top-0 z-40 bg-white shadow-sm px-6 lg:px-8 py-3 flex flex-wrap items-center gap-3">
      <div className="flex rounded-lg border overflow-hidden" style={{ borderColor: "#E2E8F0" }}>
        {(["All", "Abuja", "Enugu"] as const).map((c) => (
          <button
            key={c}
            onClick={() => setCampus(c)}
            className="px-3.5 py-1.5 text-xs font-semibold transition-colors"
            style={
              campus === c
                ? { backgroundColor: "#0E7C7B", color: "#fff" }
                : { backgroundColor: "#fff", color: "#64748b" }
            }
          >
            {c}
          </button>
        ))}
      </div>

      {isInstructor ? (
        userTrack && (
          <span
            className="px-3 py-1.5 rounded-lg text-xs font-semibold"
            style={{ backgroundColor: "#F1F5F9", color: "#0F1E35" }}
          >
            {userTrack}
          </span>
        )
      ) : (
        <select
          value={trackFilter}
          onChange={(e) => setTrackFilter(e.target.value)}
          className="px-3 py-1.5 rounded-lg border text-xs font-medium"
          style={{ borderColor: "#E2E8F0", color: "#0F1E35" }}
        >
          <option value="All">All Tracks</option>
          {LEARNING_TRACKS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      )}

      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by name or Application ID..."
        className="flex-1 min-w-[200px] px-3 py-1.5 rounded-lg border text-xs"
        style={{ borderColor: "#E2E8F0", color: "#0F1E35" }}
      />

      <p className="text-xs whitespace-nowrap" style={{ color: "#64748b" }}>
        Showing {shownCount} of {totalCount} students
      </p>
    </div>
  );
}

function rateBarColor(rate: number) {
  if (rate >= 80) return "#16a34a";
  if (rate >= 60) return "#d97706";
  return "#dc2626";
}

function AttendanceGrid({ data, students }: { data: MasterAttendanceData; students: StudentRow[] }) {
  const totalTableWidth = TOTAL_FIXED_WIDTH + data.dates.length * DATE_COL_WIDTH + SUMMARY_COL_WIDTH;

  let lastTrack: string | null = null;

  return (
    <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: "#E2E8F0" }}>
      <div className="overflow-auto" style={{ maxHeight: "calc(100vh - 320px)" }}>
        <table style={{ width: totalTableWidth, borderCollapse: "collapse" }} className="text-xs">
          <thead>
            <tr>
              {FIXED_COLS.map((col, i) => (
                <th
                  key={col.key}
                  className="sticky top-0 z-30 px-2 py-2.5 text-left font-semibold whitespace-nowrap"
                  style={{
                    left: fixedColLeft(i),
                    width: col.width,
                    minWidth: col.width,
                    backgroundColor: "#2E75B6",
                    color: "#fff",
                    position: "sticky",
                  }}
                >
                  {col.label}
                </th>
              ))}
              {data.dates.map((date) => (
                <th
                  key={date}
                  className="sticky top-0 z-20 px-1 py-2.5 text-center font-semibold whitespace-nowrap"
                  style={{ width: DATE_COL_WIDTH, minWidth: DATE_COL_WIDTH, backgroundColor: "#1A6B8A", color: "#fff" }}
                >
                  {data.dateLabels[date] ?? date}
                </th>
              ))}
              <th
                className="sticky top-0 z-20 px-2 py-2.5 text-center font-semibold whitespace-nowrap"
                style={{ width: SUMMARY_COL_WIDTH, minWidth: SUMMARY_COL_WIDTH, backgroundColor: "#1F3864", color: "#fff" }}
              >
                Days Present
              </th>
            </tr>
          </thead>
          <tbody>
            {students.map((student, rowIdx) => {
              const rows: React.ReactNode[] = [];
              if (student.learningTrack !== lastTrack) {
                lastTrack = student.learningTrack;
                const count = students.filter((s) => s.learningTrack === student.learningTrack).length;
                rows.push(
                  <tr key={`track-${student.learningTrack}`}>
                    <td
                      colSpan={FIXED_COLS.length + data.dates.length + 1}
                      className="px-3 py-1.5 font-semibold text-left"
                      style={{ backgroundColor: "#1A6B8A", color: "#fff" }}
                    >
                      {`──── ${student.learningTrack} ────`}{" "}
                      <span className="font-normal opacity-80">{count} students</span>
                    </td>
                  </tr>
                );
              }
              rows.push(
                <StudentTableRow key={student.id} student={student} dates={data.dates} rowIdx={rowIdx} />
              );
              return rows;
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StudentTableRow({ student, dates, rowIdx }: { student: StudentRow; dates: string[]; rowIdx: number }) {
  const rowBg = rowIdx % 2 === 0 ? "#FFFFFF" : "#F8FAFC";

  return (
    <tr>
      <td
        className="sticky z-10 px-2 py-1.5 whitespace-nowrap"
        style={{ left: fixedColLeft(0), width: FIXED_COLS[0].width, backgroundColor: rowBg, position: "sticky" }}
      >
        {student.sn}
      </td>
      <td
        className="sticky z-10 px-2 py-1.5 whitespace-nowrap font-semibold"
        style={{ left: fixedColLeft(1), width: FIXED_COLS[1].width, backgroundColor: rowBg, color: "#1F3864", position: "sticky" }}
      >
        {student.applicationId}
      </td>
      <td
        className="sticky z-10 px-2 py-1.5 whitespace-nowrap overflow-hidden text-ellipsis"
        style={{ left: fixedColLeft(2), width: FIXED_COLS[2].width, backgroundColor: rowBg, position: "sticky" }}
      >
        {student.fullName}
      </td>
      <td
        className="sticky z-10 px-2 py-1.5 text-center whitespace-nowrap"
        style={{ left: fixedColLeft(3), width: FIXED_COLS[3].width, backgroundColor: rowBg, position: "sticky" }}
      >
        {student.gender === "MALE" ? "M" : student.gender === "FEMALE" ? "F" : "O"}
      </td>
      <td
        className="sticky z-10 px-2 py-1.5 whitespace-nowrap overflow-hidden text-ellipsis"
        style={{ left: fixedColLeft(4), width: FIXED_COLS[4].width, backgroundColor: rowBg, position: "sticky" }}
      >
        {student.learningTrack}
      </td>
      <td
        className="sticky z-10 px-2 py-1.5 text-center whitespace-nowrap"
        style={{ left: fixedColLeft(5), width: FIXED_COLS[5].width, backgroundColor: rowBg, position: "sticky" }}
      >
        {student.trainingLocation}
      </td>

      {dates.map((date) => {
        const cell = student.attendance[date];
        return (
          <td key={date} className="px-1 py-1.5 text-center" style={{ width: DATE_COL_WIDTH }}>
            {cell?.status === "present" && (
              <span
                className="inline-block px-1.5 py-0.5 rounded font-bold"
                style={{ backgroundColor: "#E2EFDA", color: "#375623" }}
              >
                Present
              </span>
            )}
            {cell?.status === "absent" && (
              <span
                className="inline-block px-1.5 py-0.5 rounded font-bold"
                style={{ backgroundColor: "#FCE4D6", color: "#C00000" }}
              >
                ABS
              </span>
            )}
            {(!cell || cell.status === "no-session") && <span style={{ color: "#AAAAAA" }}>—</span>}
          </td>
        );
      })}

      <td className="px-2 py-1.5" style={{ width: SUMMARY_COL_WIDTH }}>
        <div className="flex items-center gap-1.5">
          <span className="font-semibold whitespace-nowrap" style={{ color: "#0F1E35" }}>
            {student.daysPresent}/{student.totalSessions}
          </span>
        </div>
        <div className="w-full h-1.5 rounded-full mt-1" style={{ backgroundColor: "#E2E8F0" }}>
          <div
            className="h-1.5 rounded-full"
            style={{ width: `${student.attendanceRate}%`, backgroundColor: rateBarColor(student.attendanceRate) }}
          />
        </div>
      </td>
    </tr>
  );
}

function Footer() {
  return (
    <div className="px-6 lg:px-8 py-4 text-center">
      <p className="text-xs" style={{ color: "#94a3b8" }}>
        ICBM-AttendX · Powered by SBTS Group · Data as of{" "}
        {new Date().toLocaleDateString("en-NG", { year: "numeric", month: "short", day: "numeric" })}
      </p>
    </div>
  );
}
