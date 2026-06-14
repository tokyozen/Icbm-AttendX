import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";

function formatDateLabel(date: Date): string {
  return date.toLocaleDateString("en-NG", { day: "2-digit", month: "short", year: "numeric" });
}

function buildWhere(params: URLSearchParams) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: Record<string, any> = {};
  const sessionId = params.get("sessionId");
  const date = params.get("date");
  const location = params.get("location");
  const track = params.get("track");
  const startDate = params.get("startDate");
  const endDate = params.get("endDate");

  if (sessionId) where.sessionId = sessionId;
  if (location) where.trainingLocation = location;
  if (track) where.learningTrack = track;

  if (date) {
    const day = new Date(date);
    const next = new Date(day);
    next.setDate(next.getDate() + 1);
    where.checkInTime = { gte: day, lt: next };
  } else if (startDate || endDate) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const range: Record<string, any> = {};
    if (startDate) range.gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setDate(end.getDate() + 1);
      range.lt = end;
    }
    where.checkInTime = range;
  }

  return where;
}

function buildFilterDesc(params: URLSearchParams): string {
  const parts: string[] = [];
  const location = params.get("location");
  const track = params.get("track");
  const date = params.get("date");
  const start = params.get("startDate");
  const end = params.get("endDate");

  if (location) parts.push(`Location: ${location}`);
  if (track) parts.push(`Track: ${track}`);
  if (date) parts.push(`Date: ${formatDateLabel(new Date(date))}`);
  else {
    if (start && end) parts.push(`${formatDateLabel(new Date(start))} – ${formatDateLabel(new Date(end))}`);
    else if (start) parts.push(`From: ${formatDateLabel(new Date(start))}`);
    else if (end) parts.push(`To: ${formatDateLabel(new Date(end))}`);
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

  const where = buildWhere(searchParams);

  const records = await prisma.attendanceRecord.findMany({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    where: where as any,
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

    // Bold header row
    const headerRange = XLSX.utils.decode_range(ws["!ref"] ?? "A1:L1");
    for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
      const cellRef = XLSX.utils.encode_cell({ r: 0, c: col });
      if (!ws[cellRef]) continue;
      ws[cellRef].s = { font: { bold: true } };
    }

    // Auto-width columns
    const colWidths = headers.map((h, colIdx) => {
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

    const filterDesc = buildFilterDesc(searchParams);
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
