"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LEARNING_TRACKS, TRAINING_LOCATIONS } from "@/types/index";
import { formatTime, formatDate } from "@/lib/utils";

const DURATION_OPTIONS = [
  { value: 30, label: "30 minutes" },
  { value: 60, label: "60 minutes" },
  { value: 90, label: "90 minutes" },
  { value: 120, label: "120 minutes" },
];

export default function NewSessionPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    sessionName: "",
    location: TRAINING_LOCATIONS[0] as string,
    learningTrack: LEARNING_TRACKS[0] as string,
    durationMinutes: 60,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const now = useMemo(() => new Date(), []);
  const expiry = useMemo(
    () => new Date(now.getTime() + form.durationMinutes * 60 * 1000),
    [now, form.durationMinutes]
  );

  function set(field: string, value: string | number) {
    setForm((p) => ({ ...p, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.sessionName.trim()) {
      setError("Please enter a session name.");
      return;
    }
    setError("");
    setSubmitting(true);

    const res = await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    setSubmitting(false);

    if (res.ok) {
      const data = await res.json();
      router.push(`/sessions/${data.session.id}`);
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to create session. Please try again.");
    }
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/sessions"
          className="text-sm"
          style={{ color: "#64748b" }}
        >
          ← Sessions
        </Link>
        <span style={{ color: "#E2E8F0" }}>/</span>
        <span className="text-sm font-medium" style={{ color: "#0F1E35" }}>
          New Session
        </span>
      </div>

      <div className="max-w-lg mx-auto">
        <div className="bg-white rounded-xl border p-6 lg:p-8" style={{ borderColor: "#E2E8F0" }}>
          <h1 className="text-xl font-bold mb-1" style={{ color: "#0F1E35" }}>
            Start Attendance Session
          </h1>
          <p className="text-sm mb-6" style={{ color: "#64748b" }}>
            Fill in the details below. A QR code will be generated automatically.
          </p>

          {error && (
            <p className="text-sm px-3 py-2 bg-red-50 border border-red-200 text-red-600 rounded-lg mb-5">
              {error}
            </p>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <Field label="Session Name">
              <input
                type="text"
                value={form.sessionName}
                onChange={(e) => set("sessionName", e.target.value)}
                className="inp"
                placeholder="e.g. Abuja Cybersecurity Cohort 5"
                required
              />
            </Field>

            <Field label="Training Location">
              <select
                value={form.location}
                onChange={(e) => set("location", e.target.value)}
                className="inp"
              >
                {TRAINING_LOCATIONS.map((loc) => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
            </Field>

            <Field label="Learning Track">
              <select
                value={form.learningTrack}
                onChange={(e) => set("learningTrack", e.target.value)}
                className="inp"
              >
                {LEARNING_TRACKS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </Field>

            <Field label="Duration">
              <select
                value={form.durationMinutes}
                onChange={(e) => set("durationMinutes", parseInt(e.target.value, 10))}
                className="inp"
              >
                {DURATION_OPTIONS.map((d) => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
            </Field>

            {/* Preview box */}
            <div className="rounded-xl p-4 space-y-2" style={{ backgroundColor: "#F5F6FA", border: "1px solid #E2E8F0" }}>
              <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: "#94a3b8" }}>
                Session Preview
              </p>
              <PreviewRow label="Session Code" value="Will be generated" mono />
              <PreviewRow label="Start Time" value={`${formatDate(now)}, ${formatTime(now)}`} />
              <PreviewRow
                label="Expiry Time"
                value={`${formatDate(expiry)}, ${formatTime(expiry)}`}
              />
              <PreviewRow label="Duration" value={`${form.durationMinutes} minutes`} />
            </div>

            <div className="flex gap-3 pt-1">
              <Link
                href="/sessions"
                className="flex-1 text-center px-4 py-2.5 rounded-lg border text-sm font-medium"
                style={{ borderColor: "#E2E8F0", color: "#64748b" }}
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-60"
                style={{ backgroundColor: "#0E7C7B" }}
              >
                {submitting ? "Starting…" : "Start Session"}
              </button>
            </div>
          </form>
        </div>
      </div>

      <style>{`
        .inp {
          width: 100%;
          border: 1px solid #E2E8F0;
          border-radius: 0.5rem;
          padding: 0.5rem 0.875rem;
          font-size: 0.875rem;
          color: #0F1E35;
          outline: none;
          background: white;
          transition: border-color 0.15s;
        }
        .inp:focus { border-color: #0E7C7B; box-shadow: 0 0 0 3px rgba(14,124,123,0.15); }
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

function PreviewRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs" style={{ color: "#64748b" }}>{label}</span>
      <span
        className={`text-xs font-semibold ${mono ? "font-mono" : ""}`}
        style={{ color: "#0F1E35" }}
      >
        {value}
      </span>
    </div>
  );
}
