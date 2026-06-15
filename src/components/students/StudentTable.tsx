"use client";

import { useState, useCallback } from "react";
import { LEARNING_TRACKS, TRAINING_LOCATIONS } from "@/types/index";

export interface Student {
  id: string;
  applicationId: string;
  fullName: string;
  gender: string;
  trainingLocation: string;
  learningTrack: string;
  email?: string | null;
  phoneNumber?: string | null;
  isActive: boolean;
}

interface Props {
  initialStudents: Student[];
  canEdit?: boolean;
}

const PAGE_SIZE = 20;

const GENDERS = [
  { label: "Male", value: "MALE" },
  { label: "Female", value: "FEMALE" },
  { label: "Other", value: "OTHER" },
];

/* ─── Badge helpers ─────────────────────────────────────────── */

function genderBadge(gender: string) {
  if (gender === "MALE") return { bg: "#dbeafe", color: "#1d4ed8", label: "Male" };
  if (gender === "FEMALE") return { bg: "#fce7f3", color: "#be185d", label: "Female" };
  return { bg: "#f1f5f9", color: "#475569", label: "Other" };
}

function trackBadge(track: string) {
  const map: Record<string, { bg: string; color: string }> = {
    Cybersecurity: { bg: "#ffe4e6", color: "#be123c" },
    "Software Development": { bg: "#dcfce7", color: "#15803d" },
    "AI & Machine Learning": { bg: "#f3e8ff", color: "#7e22ce" },
    "Business Process & Outsourcing (BPO)": { bg: "#dbeafe", color: "#1d4ed8" },
    "Project Management": { bg: "#ffedd5", color: "#c2410c" },
  };
  return map[track] ?? { bg: "#f1f5f9", color: "#475569" };
}

/* ─── Inline edit modal ──────────────────────────────────────── */

function EditModal({
  student,
  onClose,
  onSaved,
}: {
  student: Student;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    fullName: student.fullName,
    applicationId: student.applicationId,
    gender: student.gender,
    trainingLocation: student.trainingLocation,
    learningTrack: student.learningTrack,
    email: student.email ?? "",
    phoneNumber: student.phoneNumber ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function set(field: string, value: string) {
    setForm((p) => ({ ...p, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const res = await fetch(`/api/students/${student.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        email: form.email.trim() || null,
        phoneNumber: form.phoneNumber.trim() || null,
      }),
    });

    setSaving(false);

    if (res.ok) {
      onSaved();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to update student.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "#E2E8F0" }}>
          <h2 className="text-base font-semibold" style={{ color: "#0F1E35" }}>
            Edit Student
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {error && (
            <p className="text-sm px-3 py-2 bg-red-50 border border-red-200 text-red-600 rounded-lg">
              {error}
            </p>
          )}

          <FormField label="Full Name">
            <input
              type="text"
              value={form.fullName}
              onChange={(e) => set("fullName", e.target.value)}
              className="fi"
              required
            />
          </FormField>

          <FormField label="Application ID">
            <input
              type="text"
              value={form.applicationId}
              onChange={(e) => set("applicationId", e.target.value)}
              className="fi"
              required
            />
          </FormField>

          <FormField label="Gender">
            <select value={form.gender} onChange={(e) => set("gender", e.target.value)} className="fi">
              {GENDERS.map((g) => (
                <option key={g.value} value={g.value}>{g.label}</option>
              ))}
            </select>
          </FormField>

          <FormField label="Training Location">
            <select value={form.trainingLocation} onChange={(e) => set("trainingLocation", e.target.value)} className="fi">
              {TRAINING_LOCATIONS.map((loc) => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>
          </FormField>

          <FormField label="Learning Track">
            <select value={form.learningTrack} onChange={(e) => set("learningTrack", e.target.value)} className="fi">
              {LEARNING_TRACKS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </FormField>

          <FormField label="Email Address">
            <input
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              className="fi"
              placeholder="Optional"
            />
          </FormField>

          <FormField label="Phone Number">
            <input
              type="tel"
              value={form.phoneNumber}
              onChange={(e) => set("phoneNumber", e.target.value)}
              className="fi"
              placeholder="Optional"
            />
          </FormField>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-lg border text-sm font-medium"
              style={{ borderColor: "#E2E8F0", color: "#64748b" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-60"
              style={{ backgroundColor: "#0E7C7B" }}
            >
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>

      <style>{`
        .fi {
          width: 100%;
          border: 1px solid #E2E8F0;
          border-radius: 0.5rem;
          padding: 0.5rem 0.875rem;
          font-size: 0.875rem;
          color: #0F1E35;
          outline: none;
          background: white;
        }
        .fi:focus { border-color: #0E7C7B; box-shadow: 0 0 0 3px rgba(14,124,123,0.15); }
      `}</style>
    </div>
  );
}

/* ─── Delete confirmation ────────────────────────────────────── */

function DeleteConfirm({
  student,
  onClose,
  onDeleted,
}: {
  student: Student;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  async function handleDelete() {
    setDeleting(true);
    setError("");
    const res = await fetch(`/api/students/${student.id}`, { method: "DELETE" });
    setDeleting(false);
    if (res.ok) {
      onDeleted();
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Failed to delete. Please try again.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6">
        <div className="flex items-start gap-4 mb-5">
          <div className="p-2 rounded-full bg-red-100 flex-shrink-0">
            <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold" style={{ color: "#0F1E35" }}>
              Delete Student
            </h3>
            <p className="text-sm mt-1" style={{ color: "#64748b" }}>
              Are you sure you want to permanently delete{" "}
              <strong style={{ color: "#0F1E35" }}>{student.fullName}</strong>? This cannot be undone.
            </p>
          </div>
        </div>
        {error && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">
            {error}
          </p>
        )}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-lg border text-sm font-medium"
            style={{ borderColor: "#E2E8F0", color: "#64748b" }}
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold text-white bg-red-600 disabled:opacity-60"
          >
            {deleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Main component ─────────────────────────────────────────── */

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5" style={{ color: "#0F1E35" }}>
        {label}
      </label>
      {children}
    </div>
  );
}

export default function StudentTable({ initialStudents, canEdit = true }: Props) {
  const [students, setStudents] = useState<Student[]>(initialStudents);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [editStudent, setEditStudent] = useState<Student | null>(null);
  const [deleteStudent, setDeleteStudent] = useState<Student | null>(null);

  const loadStudents = useCallback(async () => {
    const res = await fetch("/api/students?limit=500");
    if (res.ok) {
      const data = await res.json();
      setStudents(data.students ?? []);
    }
  }, []);

  const q = search.toLowerCase().trim();
  const filtered = q
    ? students.filter(
        (s) =>
          s.fullName.toLowerCase().includes(q) ||
          s.applicationId.toLowerCase().includes(q)
      )
    : students;

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageStudents = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  function handleSearchChange(val: string) {
    setSearch(val);
    setPage(1);
  }

  return (
    <div>
      {/* Search */}
      <div className="relative mb-4">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
          fill="none"
          viewBox="0 0 24 24"
          stroke="#94a3b8"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 1116.65 16.65z" />
        </svg>
        <input
          type="text"
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Search by name or Application ID…"
          className="w-full pl-9 pr-4 py-2.5 text-sm border rounded-lg outline-none transition-colors"
          style={{ borderColor: "#E2E8F0", color: "#0F1E35" }}
          onFocus={(e) => (e.currentTarget.style.borderColor = "#0E7C7B")}
          onBlur={(e) => (e.currentTarget.style.borderColor = "#E2E8F0")}
        />
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border py-16 text-center" style={{ borderColor: "#E2E8F0" }}>
          <svg className="w-12 h-12 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="#cbd5e1" strokeWidth={1.2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-5-3.87M9 20H4v-2a4 4 0 015-3.87m6-4a4 4 0 11-8 0 4 4 0 018 0zm6 0a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <p className="text-sm font-medium" style={{ color: "#64748b" }}>
            {search ? "No students match your search." : "No students found. Upload an Excel file to get started."}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: "#E2E8F0" }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: "#F5F6FA", borderBottom: "1px solid #E2E8F0" }}>
                  {["Application ID", "Full Name", "Gender", "Location", "Learning Track"].map((h) => (
                    <th
                      key={h}
                      className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide whitespace-nowrap"
                      style={{ color: "#64748b" }}
                    >
                      {h}
                    </th>
                  ))}
                  <th
                    className="hidden md:table-cell text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide whitespace-nowrap"
                    style={{ color: "#64748b" }}
                  >
                    Email
                  </th>
                  <th
                    className="hidden md:table-cell text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide whitespace-nowrap"
                    style={{ color: "#64748b" }}
                  >
                    Phone
                  </th>
                  <th
                    className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide whitespace-nowrap"
                    style={{ color: "#64748b" }}
                  >
                    Status
                  </th>
                  {canEdit && (
                    <th
                      className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide whitespace-nowrap"
                      style={{ color: "#64748b" }}
                    >
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {pageStudents.map((s, i) => {
                  const gb = genderBadge(s.gender);
                  const tb = trackBadge(s.learningTrack);
                  return (
                    <tr
                      key={s.id}
                      style={{
                        borderBottom: i < pageStudents.length - 1 ? "1px solid #F1F5F9" : "none",
                      }}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      {/* Application ID */}
                      <td className="px-4 py-3 font-mono text-xs whitespace-nowrap" style={{ color: "#0E7C7B" }}>
                        {s.applicationId}
                      </td>
                      {/* Full Name */}
                      <td className="px-4 py-3 font-medium whitespace-nowrap" style={{ color: "#0F1E35" }}>
                        {s.fullName}
                      </td>
                      {/* Gender */}
                      <td className="px-4 py-3">
                        <span
                          className="inline-block text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{ backgroundColor: gb.bg, color: gb.color }}
                        >
                          {gb.label}
                        </span>
                      </td>
                      {/* Location */}
                      <td className="px-4 py-3 whitespace-nowrap" style={{ color: "#475569" }}>
                        {s.trainingLocation}
                      </td>
                      {/* Learning Track */}
                      <td className="px-4 py-3">
                        <span
                          className="inline-block text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap"
                          style={{ backgroundColor: tb.bg, color: tb.color }}
                        >
                          {s.learningTrack}
                        </span>
                      </td>
                      {/* Email */}
                      <td className="hidden md:table-cell px-4 py-3 text-xs" style={{ color: "#64748b" }}>
                        {s.email ? (
                          <a href={`mailto:${s.email}`} className="hover:underline" style={{ color: "#0E7C7B" }}>
                            {s.email}
                          </a>
                        ) : "—"}
                      </td>
                      {/* Phone */}
                      <td className="hidden md:table-cell px-4 py-3 text-xs whitespace-nowrap" style={{ color: "#64748b" }}>
                        {s.phoneNumber ?? "—"}
                      </td>
                      {/* Status */}
                      <td className="px-4 py-3">
                        <span
                          className="inline-block text-xs px-2 py-0.5 rounded-full font-medium"
                          style={
                            s.isActive
                              ? { backgroundColor: "#dcfce7", color: "#15803d" }
                              : { backgroundColor: "#f1f5f9", color: "#64748b" }
                          }
                        >
                          {s.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      {/* Actions */}
                      {canEdit && (
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setEditStudent(s)}
                              title="Edit"
                              className="p-1.5 rounded-lg hover:bg-blue-50 transition-colors"
                              style={{ color: "#3b82f6" }}
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => setDeleteStudent(s)}
                              title="Remove"
                              className="p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                              style={{ color: "#ef4444" }}
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div
            className="flex items-center justify-between px-4 py-3 border-t"
            style={{ borderColor: "#E2E8F0" }}
          >
            <p className="text-xs" style={{ color: "#64748b" }}>
              Showing {Math.min((safePage - 1) * PAGE_SIZE + 1, filtered.length)}–
              {Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length} student
              {filtered.length !== 1 ? "s" : ""}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage <= 1}
                className="px-3 py-1.5 text-xs rounded-lg border font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ borderColor: "#E2E8F0", color: "#475569" }}
              >
                ← Previous
              </button>
              <span className="text-xs" style={{ color: "#64748b" }}>
                {safePage} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
                className="px-3 py-1.5 text-xs rounded-lg border font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ borderColor: "#E2E8F0", color: "#475569" }}
              >
                Next →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {editStudent && (
        <EditModal
          student={editStudent}
          onClose={() => setEditStudent(null)}
          onSaved={() => {
            setEditStudent(null);
            loadStudents();
          }}
        />
      )}
      {deleteStudent && (
        <DeleteConfirm
          student={deleteStudent}
          onClose={() => setDeleteStudent(null)}
          onDeleted={() => {
            const deletedId = deleteStudent.id;
            setDeleteStudent(null);
            setStudents((prev) => prev.filter((s) => s.id !== deletedId));
          }}
        />
      )}
    </div>
  );
}
