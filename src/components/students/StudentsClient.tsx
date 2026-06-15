"use client";

import { useState, useCallback } from "react";
import StudentTable, { type Student } from "@/components/students/StudentTable";
import AddStudentModal from "@/components/students/AddStudentModal";
import UploadModal from "@/components/students/UploadModal";

interface Stats {
  total: number;
  active: number;
  inactive: number;
}

interface Props {
  initialStudents: Student[];
  stats: Stats;
  canEdit?: boolean;
}

export default function StudentsClient({ initialStudents, stats: initialStats, canEdit = true }: Props) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [students, setStudents] = useState<Student[]>(initialStudents);
  const [stats, setStats] = useState<Stats>(initialStats);

  const refreshStudents = useCallback(async () => {
    const res = await fetch("/api/students?limit=500");
    if (!res.ok) return;
    const data = await res.json();
    setStudents(data.students ?? []);
    // Recalculate stats from fetched data
    const all: Student[] = data.students ?? [];
    setStats({
      total: data.total ?? all.length,
      active: all.filter((s) => s.isActive).length,
      inactive: all.filter((s) => !s.isActive).length,
    });
  }, []);

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <h1 className="text-4xl font-black tracking-tight text-[#0F1E35]">
          Students
        </h1>
        {canEdit && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowUploadModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white transition-colors"
              style={{ backgroundColor: "#C9922A" }}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Upload Excel
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white transition-colors"
              style={{ backgroundColor: "#0E7C7B" }}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Add Student
            </button>
          </div>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard label="Total Students" value={stats.total} color="#0F1E35" />
        <StatCard label="Active" value={stats.active} color="#0E7C7B" />
        <StatCard label="Inactive" value={stats.inactive} color="#94a3b8" />
      </div>

      {/* Table */}
      <StudentTable
        initialStudents={students}
        canEdit={canEdit}
        key={students.length} // re-mount clears search/page when list changes size
      />

      {/* Modals */}
      {showAddModal && (
        <AddStudentModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            refreshStudents();
          }}
        />
      )}
      {showUploadModal && (
        <UploadModal
          onClose={() => setShowUploadModal(false)}
          onSuccess={() => {
            refreshStudents();
          }}
        />
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="bg-white rounded-xl border px-5 py-4" style={{ borderColor: "#E2E8F0" }}>
      <p className="text-2xl font-bold" style={{ color }}>
        {value}
      </p>
      <p className="text-xs mt-0.5 font-medium" style={{ color: "#64748b" }}>
        {label}
      </p>
    </div>
  );
}
