"use client";

import { useState } from "react";

interface Props {
  sessionId: string;
  sessionName: string;
}

type Fmt = "csv" | "excel" | "pdf";

export default function ExportSessionButtons({ sessionId, sessionName }: Props) {
  const [downloading, setDownloading] = useState<Fmt | null>(null);

  async function download(format: Fmt) {
    setDownloading(format);
    const res = await fetch(`/api/export?format=${format}&sessionId=${encodeURIComponent(sessionId)}`);
    if (res.ok) {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const ext = format === "excel" ? "xlsx" : format;
      const slug = sessionName.slice(0, 30).replace(/\s+/g, "-").toLowerCase();
      a.href = url;
      a.download = `${slug}-attendance.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
    setDownloading(null);
  }

  const buttons: { fmt: Fmt; label: string; color: string }[] = [
    { fmt: "csv", label: "CSV", color: "#16a34a" },
    { fmt: "excel", label: "Excel", color: "#2563eb" },
    { fmt: "pdf", label: "PDF", color: "#dc2626" },
  ];

  return (
    <div className="flex gap-2">
      {buttons.map(({ fmt, label, color }) => (
        <button
          key={fmt}
          onClick={() => download(fmt)}
          disabled={downloading !== null}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border disabled:opacity-60"
          style={{ borderColor: color, color }}
        >
          {downloading === fmt ? (
            <span
              className="w-3 h-3 border border-t-transparent rounded-full animate-spin"
              style={{ borderColor: color, borderTopColor: "transparent" }}
            />
          ) : (
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          )}
          {downloading === fmt ? "…" : label}
        </button>
      ))}
    </div>
  );
}
