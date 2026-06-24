import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";
import { buildAttendanceRecordWhere, readAttendanceFilterParams } from "@/lib/attendance-filters";

function formatDateLabel(date: Date): string {
  return date.toLocaleDateString("en-NG", { day: "2-digit", month: "short", year: "numeric" });
}

const STATUS_LABELS: Record<string, string> = {
  present: "Present",
  absent: "Absent",
  verified: "Verified",
  flagged: "Flagged",
  pending: "Pending",
};

async function buildFilterDesc(params: URLSearchParams): Promise<string> {
  const parts: string[] = [];
  const location = params.get("location");
  const track = params.get("track");
  const date = params.get("date");
  const start = params.get("startDate");
  const end = params.get("endDate");
  const status = params.get("attendanceStatus");
  const instructorId = params.get("instructorId");

  if (location) parts.push(`Location: ${location}`);
  if (track) parts.push(`Track: ${track}`);
  if (date) parts.push(`Date: ${formatDateLabel(new Date(date))}`);
  else {
    if (start && end) parts.push(`${formatDateLabel(new Date(start))} – ${formatDateLabel(new Date(end))}`);
    else if (start) parts.push(`From: ${formatDateLabel(new Date(start))}`);
    else if (end) parts.push(`To: ${formatDateLabel(new Date(end))}`);
  }
  if (status && STATUS_LABELS[status]) parts.push(`Status: ${STATUS_LABELS[status]}`);
  if (instructorId) {
    const instructor = await prisma.user.findUnique({ where: { id: instructorId }, select: { name: true } });
    if (instructor) parts.push(`Facilitator: ${instructor.name}`);
  }

  return parts.length ? parts.join(" | ") : "All Records";
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = (session.user as { role?: string }).role ?? "";
  if (!["ADMIN", "SUPER_ADMIN"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") ?? "csv";
  const userId = session.user.id as string;

  const where = buildAttendanceRecordWhere(readAttendanceFilterParams(searchParams), { role, userId });

  const records = await prisma.attendanceRecord.findMany({
    where,
    include: {
      session: {
        select: { sessionName: true, sessionCode: true, instructor: { select: { name: true } } },
      },
    },
    orderBy: { checkInTime: "asc" },
  });

  const dateTag = new Date().toISOString().slice(0, 10);

  // ── Shared row mapper ──
  const rows = records.map((r) => ({
    "Full Name": r.fullName,
    "Application ID": r.applicationId,
    Gender: r.gender,
    "Training Location": r.trainingLocation,
    "Learning Track": r.learningTrack,
    "Session Name": r.session.sessionName,
    "Session Code": r.session.sessionCode,
    "Instructor": r.session.instructor.name,
    Date: r.checkInTime.toLocaleDateString("en-NG"),
    "Check-In Time": r.checkInTime.toLocaleTimeString("en-NG", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }),
    "Verification Status": r.verificationStatus,
    Device: r.deviceType ?? "",
    Browser: r.browser ?? "",
  }));

  const headers = Object.keys(rows[0] ?? {
    "Full Name": "",
    "Application ID": "",
    Gender: "",
    "Training Location": "",
    "Learning Track": "",
    "Session Name": "",
    "Session Code": "",
    Instructor: "",
    Date: "",
    "Check-In Time": "",
    "Verification Status": "",
    Device: "",
    Browser: "",
  });

  // ─────────────────────────────── CSV ──
  if (format === "csv") {
    const escape = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
    const lines = [
      headers.map(escape).join(","),
      ...rows.map((r) => headers.map((h) => escape(String(r[h as keyof typeof r] ?? ""))).join(",")),
    ];
    const csv = lines.join("\r\n");

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="attendance-${dateTag}.csv"`,
      },
    });
  }

  // ─────────────────────────────── Excel ──
  if (format === "excel") {
    const wsData = [headers, ...rows.map((r) => headers.map((h) => r[h as keyof typeof r] ?? ""))];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    const verColIdx = headers.indexOf("Verification Status");

    // Bold header row + color-code Verification Status cells
    const headerRange = XLSX.utils.decode_range(ws["!ref"] ?? "A1:M1");
    for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
      const cellRef = XLSX.utils.encode_cell({ r: 0, c: col });
      if (!ws[cellRef]) continue;
      ws[cellRef].s = { font: { bold: true } };
    }

    // Color-code verification status column
    if (verColIdx >= 0) {
      const fills: Record<string, string> = {
        VERIFIED: "C6EFCE",  // green
        FLAGGED:  "FFC7CE",  // red
        PENDING:  "FFEB9C",  // yellow
      };
      for (let row = 1; row <= rows.length; row++) {
        const cellRef = XLSX.utils.encode_cell({ r: row, c: verColIdx });
        if (!ws[cellRef]) continue;
        const val = String(ws[cellRef].v ?? "");
        const fgColor = fills[val];
        if (fgColor) {
          ws[cellRef].s = { fill: { patternType: "solid", fgColor: { rgb: fgColor } } };
        }
      }
    }

    // Auto-width columns
    const colWidths = headers.map((h) => {
      const maxLen = Math.max(
        h.length,
        ...rows.map((r) => String(r[h as keyof typeof r] ?? "").length)
      );
      return { wch: Math.min(maxLen + 2, 40) };
    });
    ws["!cols"] = colWidths;

    XLSX.utils.book_append_sheet(wb, ws, "Attendance");
    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="attendance-${dateTag}.xlsx"`,
      },
    });
  }

  // ─────────────────────────────── PDF ──
  if (format === "pdf") {
    // Dynamic import keeps jspdf out of the edge bundle if ever moved there
    const { default: jsPDF } = await import("jspdf");
    const { autoTable } = await import("jspdf-autotable");

    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

    const filterDesc = await buildFilterDesc(searchParams);
    const genTime = new Date().toLocaleString("en-NG", {
      dateStyle: "medium",
      timeStyle: "short",
    });

    // Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(15, 30, 53); // #0F1E35 navy
    doc.text("ICBM-AttendX — Attendance Report", 14, 18);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139); // #64748b
    doc.text(filterDesc, 14, 25);

    // Table
    autoTable(doc, {
      startY: 30,
      head: [headers],
      body: rows.map((r) => headers.map((h) => String(r[h as keyof typeof r] ?? ""))),
      styles: { fontSize: 7.5, cellPadding: 2 },
      headStyles: {
        fillColor: [15, 30, 53],  // navy
        textColor: 255,
        fontStyle: "bold",
        fontSize: 8,
      },
      alternateRowStyles: { fillColor: [245, 246, 250] },
      margin: { left: 14, right: 14 },
      didDrawPage: (data) => {
        // Footer on each page
        const pageCount = doc.getNumberOfPages();
        doc.setFontSize(7);
        doc.setTextColor(148, 163, 184); // #94a3b8
        doc.text(
          `Page ${data.pageNumber} of ${pageCount}  ·  Generated: ${genTime}`,
          data.settings.margin.left,
          doc.internal.pageSize.height - 8
        );
      },
    });

    const pdfBuffer = Buffer.from(doc.output("arraybuffer"));

    return new Response(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="attendance-${dateTag}.pdf"`,
      },
    });
  }

  return NextResponse.json({ error: "Invalid format. Use csv, excel, or pdf." }, { status: 400 });
}
