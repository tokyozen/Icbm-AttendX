"use client";

import { useState } from "react";
import { LEARNING_TRACKS, TRAINING_LOCATIONS } from "@/types/index";

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

const GENDERS = [
  { label: "Male", value: "MALE" },
  { label: "Female", value: "FEMALE" },
  { label: "Other", value: "OTHER" },
];

export default function AddStudentModal({ onClose, onSuccess }: Props) {
  const [form, setForm] = useState({
    fullName: "",
    applicationId: "",
    gender: "MALE",
    trainingLocation: TRAINING_LOCATIONS[0],
    learningTrack: LEARNING_TRACKS[0],
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.fullName.trim() || !form.applicationId.trim()) {
      setError("Full Name and Application ID are required.");
      return;
    }
    setError("");
    setSubmitting(true);

    const res = await fetch("/api/students", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    setSubmitting(false);

    if (res.ok) {
      onSuccess();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to create student.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b"
          style={{ borderColor: "#E2E8F0" }}
        >
          <h2 className="text-base font-semibold" style={{ color: "#0F1E35" }}>
            Add New Student
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
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

          <Field label="Full Name">
            <input
              type="text"
              value={form.fullName}
              onChange={(e) => set("fullName", e.target.value)}
              className="input"
              placeholder="e.g. Amina Bello"
              required
            />
          </Field>

          <Field label="Application ID">
            <input
              type="text"
              value={form.applicationId}
              onChange={(e) => set("applicationId", e.target.value)}
              className="input"
              placeholder="e.g. ICBM-2026-0001"
              required
            />
          </Field>

          <Field label="Gender">
            <select
              value={form.gender}
              onChange={(e) => set("gender", e.target.value)}
              className="input"
            >
              {GENDERS.map((g) => (
                <option key={g.value} value={g.value}>
                  {g.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Training Location">
            <select
              value={form.trainingLocation}
              onChange={(e) => set("trainingLocation", e.target.value)}
              className="input"
            >
              {TRAINING_LOCATIONS.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Learning Track">
            <select
              value={form.learningTrack}
              onChange={(e) => set("learningTrack", e.target.value)}
              className="input"
            >
              {LEARNING_TRACKS.map((track) => (
                <option key={track} value={track}>
                  {track}
                </option>
              ))}
            </select>
          </Field>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors"
              style={{ borderColor: "#E2E8F0", color: "#64748b" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold text-white transition-colors disabled:opacity-60"
              style={{ backgroundColor: "#0E7C7B" }}
            >
              {submitting ? "Saving…" : "Add Student"}
            </button>
          </div>
        </form>
      </div>

      <style>{`
        .input {
          width: 100%;
          border: 1px solid #E2E8F0;
          border-radius: 0.5rem;
          padding: 0.5rem 0.875rem;
          font-size: 0.875rem;
          color: #0F1E35;
          outline: none;
          transition: border-color 0.15s;
          background: white;
        }
        .input:focus { border-color: #0E7C7B; }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5" style={{ color: "#0F1E35" }}>
        {label}
      </label>
      {children}
    </div>
  );
}
