"use client";

import { useRef, useState } from "react";

interface UploadResult {
  inserted: number;
  updated: number;
  skipped: number;
  errors: string[];
}

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

export default function UploadModal({ onClose, onSuccess }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [uploadError, setUploadError] = useState("");

  function handleFileChange(f: File | null | undefined) {
    if (!f) return;
    const ext = f.name.split(".").pop()?.toLowerCase();
    if (ext !== "xlsx" && ext !== "xls") {
      setUploadError("Only .xlsx and .xls files are accepted.");
      return;
    }
    setUploadError("");
    setFile(f);
  }

  async function handleDownloadTemplate() {
    const res = await fetch("/api/students/template");
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "student_template.xlsx";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleUpload() {
    if (!file) return;
    setUploading(true);
    setUploadError("");

    const fd = new FormData();
    fd.append("file", file);

    const res = await fetch("/api/students/upload", {
      method: "POST",
      body: fd,
    });

    setUploading(false);

    if (res.ok) {
      const data: UploadResult = await res.json();
      setResult(data);
      onSuccess();
    } else {
      const data = await res.json().catch(() => ({}));
      setUploadError(data.error ?? "Upload failed. Please try again.");
    }
  }

  function handleReset() {
    setFile(null);
    setResult(null);
    setUploadError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b"
          style={{ borderColor: "#E2E8F0" }}
        >
          <h2 className="text-base font-semibold" style={{ color: "#0F1E35" }}>
            Upload Student Database
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

        <div className="px-6 py-5">
          {result ? (
            /* Results view */
            <div className="space-y-4">
              <div className="space-y-2">
                <ResultRow emoji="✅" label="Students added" value={result.inserted} color="#16a34a" />
                <ResultRow emoji="🔄" label="Records updated" value={result.updated} color="#0E7C7B" />
                <ResultRow emoji="⚠️" label="Rows skipped" value={result.skipped} color="#C9922A" />
              </div>

              {result.errors.length > 0 && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-3 max-h-32 overflow-y-auto">
                  <p className="text-xs font-semibold text-red-700 mb-1">Errors:</p>
                  {result.errors.map((err, i) => (
                    <p key={i} className="text-xs text-red-600">
                      {err}
                    </p>
                  ))}
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  onClick={handleReset}
                  className="flex-1 px-4 py-2.5 rounded-lg border text-sm font-medium"
                  style={{ borderColor: "#E2E8F0", color: "#64748b" }}
                >
                  Upload Another
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold text-white"
                  style={{ backgroundColor: "#0E7C7B" }}
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            /* Upload view */
            <div className="space-y-4">
              {/* Drag-and-drop zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragging(false);
                  handleFileChange(e.dataTransfer.files[0]);
                }}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors"
                style={{
                  borderColor: dragging ? "#0E7C7B" : "#E2E8F0",
                  backgroundColor: dragging ? "#f0fafa" : "#F5F6FA",
                }}
              >
                <svg
                  className="w-10 h-10 mx-auto mb-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke={dragging ? "#0E7C7B" : "#94a3b8"}
                  strokeWidth={1.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>

                {file ? (
                  <div>
                    <p className="text-sm font-medium" style={{ color: "#0F1E35" }}>
                      {file.name}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: "#64748b" }}>
                      {(file.size / 1024).toFixed(1)} KB — click to change
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm font-medium" style={{ color: "#0F1E35" }}>
                      Drag & drop your Excel file here
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: "#64748b" }}>
                      or click to browse — .xlsx and .xls only
                    </p>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={(e) => handleFileChange(e.target.files?.[0])}
                />
              </div>

              {uploadError && (
                <p className="text-sm px-3 py-2 bg-red-50 border border-red-200 text-red-600 rounded-lg">
                  {uploadError}
                </p>
              )}

              {/* Template download */}
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="flex items-center gap-2 text-sm transition-colors"
                style={{ color: "#0E7C7B" }}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download Excel Template
              </button>

              <div className="text-xs space-y-0.5" style={{ color: "#94a3b8" }}>
                <p>Required columns: <strong>Full Name, Application ID, Gender, Training Location, Learning Track</strong></p>
                <p>Existing Application IDs will be updated, new ones will be created.</p>
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2.5 rounded-lg border text-sm font-medium"
                  style={{ borderColor: "#E2E8F0", color: "#64748b" }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpload}
                  disabled={!file || uploading}
                  className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
                  style={{ backgroundColor: "#0E7C7B" }}
                >
                  {uploading ? "Uploading…" : "Upload"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ResultRow({
  emoji,
  label,
  value,
  color,
}: {
  emoji: string;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-gray-50">
      <span className="text-sm">
        {emoji} {label}
      </span>
      <span className="text-sm font-bold" style={{ color }}>
        {value}
      </span>
    </div>
  );
}
