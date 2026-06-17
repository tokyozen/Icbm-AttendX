"use client";

import { useCallback, useState } from "react";

interface Student {
  id: string;
  fullName: string;
  applicationId: string;
  learningTrack: string;
  trainingLocation: string;
  gender: string;
}

interface SessionHistory {
  session: {
    id: string;
    sessionName: string;
    sessionCode: string;
    date: string;
    learningTrack: string;
    location: string;
  };
  attended: boolean;
  record: {
    id: string;
    checkInTime: string;
    verificationStatus: string;
    isManualOverride: boolean;
    overrideReason: string | null;
    overriddenAt: string | null;
    isAbsent: boolean;
  } | null;
}

interface AttendanceData {
  student: Student;
  summary: {
    totalSessions: number;
    attended: number;
    missed: number;
    attendanceRate: number;
  };
  history: SessionHistory[];
}

function initialsOf(name: string) {
  return name.split(" ").map((n) => n[0]).slice(0, 2).join("");
}

export default function AttendanceOverrideClient() {
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [attendanceData, setAttendanceData] = useState<AttendanceData | null>(null);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [overrideModal, setOverrideModal] = useState<{
    type: "present" | "absent";
    sessionId?: string;
    recordId?: string;
    sessionName: string;
  } | null>(null);
  const [overrideReason, setOverrideReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSearch = useCallback(async (value: string) => {
    setQuery(value);
    if (value.length < 2) {
      setSearchResults([]);
      return;
    }
    setLoadingSearch(true);
    try {
      const res = await fetch(`/api/admin/students/search?q=${encodeURIComponent(value)}`);
      if (res.ok) setSearchResults(await res.json());
    } finally {
      setLoadingSearch(false);
    }
  }, []);

  const handleSelectStudent = async (student: Student) => {
    setSelectedStudent(student);
    setSearchResults([]);
    setQuery(student.fullName);
    setLoadingAttendance(true);
    try {
      const res = await fetch(`/api/admin/students/${student.id}/attendance`);
      if (res.ok) setAttendanceData(await res.json());
    } finally {
      setLoadingAttendance(false);
    }
  };

  const handleOverride = async () => {
    if (!overrideModal || !selectedStudent) return;
    setSaving(true);
    try {
      if (overrideModal.type === "present") {
        const res = await fetch("/api/admin/attendance/override", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            studentId: selectedStudent.id,
            sessionId: overrideModal.sessionId,
            reason: overrideReason || "Manual attendance override by admin",
          }),
        });
        showToast(
          res.ok ? `${selectedStudent.fullName} marked Present` : "Failed to update attendance",
          res.ok ? "success" : "error"
        );
      } else {
        const res = await fetch(`/api/admin/attendance/override/${overrideModal.recordId}`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: overrideReason || "Marked absent by admin" }),
        });
        showToast(
          res.ok ? `${selectedStudent.fullName} marked Absent` : "Failed to update attendance",
          res.ok ? "success" : "error"
        );
      }
      const res = await fetch(`/api/admin/students/${selectedStudent.id}/attendance`);
      if (res.ok) setAttendanceData(await res.json());
    } finally {
      setSaving(false);
      setOverrideModal(null);
      setOverrideReason("");
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {toast && (
        <div
          className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl shadow-lg text-white font-semibold text-sm transition-all ${
            toast.type === "success" ? "bg-[#0E7C7B]" : "bg-red-500"
          }`}
        >
          {toast.message}
        </div>
      )}

      <div className="mb-8">
        <h1 className="text-4xl font-black text-[#0F1E35] tracking-tight">Attendance Override</h1>
        <p className="text-gray-400 text-sm mt-1">
          Manually mark students as Present or Absent for any session
        </p>
      </div>

      <div className="relative mb-6">
        <label className="block text-sm font-semibold text-[#0F1E35] mb-1.5">Search Student</label>
        <input
          type="text"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Type student name or Application ID..."
          className="w-full px-4 py-3 text-base border border-[#CBD5E0] rounded-lg
            focus:outline-none focus:border-[#0E7C7B] focus:ring-2 focus:ring-[#0E7C7B]/20
            text-[#0F1E35] placeholder-gray-400 bg-white transition-all duration-200"
        />
        {loadingSearch && (
          <div className="absolute right-4 top-11 text-gray-400 text-sm">Searching...</div>
        )}

        {searchResults.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-[#CBD5E0] rounded-xl shadow-lg overflow-hidden">
            {searchResults.map((student) => (
              <button
                key={student.id}
                onClick={() => handleSelectStudent(student)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left border-b border-gray-100 last:border-0"
              >
                <div className="w-9 h-9 rounded-full bg-[#0E7C7B] flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold text-xs">{initialsOf(student.fullName)}</span>
                </div>
                <div>
                  <div className="font-semibold text-[#0F1E35] text-sm">{student.fullName}</div>
                  <div className="text-xs text-gray-400">
                    {student.applicationId} · {student.learningTrack} · {student.trainingLocation}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {loadingAttendance && (
        <div className="text-center py-12 text-gray-400">Loading attendance records...</div>
      )}

      {attendanceData && !loadingAttendance && (
        <>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-[#0E7C7B] flex items-center justify-center flex-shrink-0">
                <span className="text-white font-black text-lg">
                  {initialsOf(attendanceData.student.fullName)}
                </span>
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-black text-[#0F1E35]">{attendanceData.student.fullName}</h2>
                <p className="text-sm text-gray-400">
                  {attendanceData.student.applicationId} · {attendanceData.student.learningTrack} ·{" "}
                  {attendanceData.student.trainingLocation}
                </p>
              </div>
              <div className="flex gap-3">
                <div className="text-center">
                  <div className="text-2xl font-black text-[#0E7C7B]">{attendanceData.summary.attended}</div>
                  <div className="text-xs text-gray-400 uppercase tracking-wider">Present</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-black text-red-400">{attendanceData.summary.missed}</div>
                  <div className="text-xs text-gray-400 uppercase tracking-wider">Absent</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-black text-[#C9922A]">
                    {attendanceData.summary.attendanceRate}%
                  </div>
                  <div className="text-xs text-gray-400 uppercase tracking-wider">Rate</div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-black text-[#0F1E35]">Session History</h3>
              <span className="text-xs text-gray-400">{attendanceData.history.length} sessions</span>
            </div>
            <div className="divide-y divide-gray-100">
              {attendanceData.history.map((item) => (
                <div key={item.session.id} className="flex items-center gap-4 px-5 py-4">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      item.attended ? "bg-[#0E7C7B]/10" : "bg-red-50"
                    }`}
                  >
                    {item.attended ? (
                      <svg
                        className="w-4 h-4 text-[#0E7C7B]"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2.5}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg
                        className="w-4 h-4 text-red-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2.5}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-[#0F1E35] text-sm truncate">
                      {item.session.sessionName}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {new Date(item.session.date).toLocaleDateString("en-GB", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                      {item.record?.checkInTime && (
                        <>
                          {" "}
                          · Checked in at{" "}
                          {new Date(item.record.checkInTime).toLocaleTimeString("en-GB", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </>
                      )}
                      {item.record?.isManualOverride && (
                        <span className="ml-2 text-[#C9922A] font-medium">· Admin override</span>
                      )}
                    </div>
                  </div>

                  <div
                    className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                      item.attended ? "bg-[#0E7C7B]/10 text-[#0E7C7B]" : "bg-red-50 text-red-500"
                    }`}
                  >
                    {item.attended ? "Present" : "Absent"}
                  </div>

                  {item.attended ? (
                    <button
                      onClick={() =>
                        setOverrideModal({
                          type: "absent",
                          recordId: item.record!.id,
                          sessionName: item.session.sessionName,
                        })
                      }
                      className="text-xs font-semibold text-red-400 hover:text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors flex-shrink-0"
                    >
                      Mark Absent
                    </button>
                  ) : (
                    <button
                      onClick={() =>
                        setOverrideModal({
                          type: "present",
                          sessionId: item.session.id,
                          sessionName: item.session.sessionName,
                        })
                      }
                      className="text-xs font-semibold text-[#0E7C7B] hover:text-[#0E7C7B]/80 px-3 py-1.5 rounded-lg hover:bg-[#0E7C7B]/10 transition-colors flex-shrink-0"
                    >
                      Mark Present
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {overrideModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: "rgba(15,30,53,0.7)", backdropFilter: "blur(4px)" }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-xl font-black text-[#0F1E35] mb-1">
              Mark as {overrideModal.type === "present" ? "Present" : "Absent"}
            </h3>
            <p className="text-sm text-gray-400 mb-5">{overrideModal.sessionName}</p>

            <label className="block text-sm font-semibold text-[#0F1E35] mb-1.5">
              Reason <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              placeholder={
                overrideModal.type === "present"
                  ? "e.g. Student was sick but attended virtually"
                  : "e.g. Student was marked present in error"
              }
              rows={3}
              className="w-full px-4 py-3 text-base border border-[#CBD5E0] rounded-lg
                focus:outline-none focus:border-[#0E7C7B] focus:ring-2 focus:ring-[#0E7C7B]/20
                text-[#0F1E35] placeholder-gray-400 bg-white transition-all duration-200 resize-none mb-5"
            />

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setOverrideModal(null);
                  setOverrideReason("");
                }}
                className="flex-1 px-4 py-3 border-2 border-gray-200 text-gray-500 font-semibold rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleOverride}
                disabled={saving}
                className={`flex-1 px-4 py-3 font-semibold rounded-xl text-white transition-colors ${
                  overrideModal.type === "present"
                    ? "bg-[#0E7C7B] hover:bg-[#0E7C7B]/90"
                    : "bg-red-500 hover:bg-red-600"
                } disabled:opacity-50`}
              >
                {saving ? "Saving..." : `Confirm — Mark ${overrideModal.type === "present" ? "Present" : "Absent"}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
