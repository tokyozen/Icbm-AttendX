import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ExcelJS from "exceljs";

const C = {
  navyBg: "1F3864",
  blueBg: "2E75B6",
  blueLight: "BDD7EE",
  tealBg: "1A6B8A",
  navyText: "1F3864",
  white: "FFFFFFFF",
  presentBg: "E2EFDA",
  presentText: "375623",
  absBg: "FCE4D6",
  absText: "C00000",
};

function fillColor(argb: string) {
  return { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb } };
}

function applyCell(
  cell: ExcelJS.Cell,
  value: string | number | null,
  options: {
    bold?: boolean;
    fontColor?: string;
    bgColor?: string;
    hAlign?: ExcelJS.Alignment["horizontal"];
    vAlign?: ExcelJS.Alignment["vertical"];
    wrap?: boolean;
    fontSize?: number;
  } = {}
) {
  if (value !== null) cell.value = value;
  cell.font = {
    name: "Arial",
    bold: options.bold ?? false,
    color: { argb: options.fontColor ?? "FF000000" },
    size: options.fontSize ?? 10,
  };
  if (options.bgColor) cell.fill = fillColor(options.bgColor);
  cell.alignment = {
    horizontal: options.hAlign ?? "center",
    vertical: options.vAlign ?? "middle",
    wrapText: options.wrap ?? false,
  };
}

function dayLabel(d: Date): string {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${days[d.getUTCDay()]}\n${String(d.getUTCDate()).padStart(2, "0")} ${months[d.getUTCMonth()]}`;
}

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = session.user as { role: string; learningTrack?: string | null };
  const effectiveTrack = user.role === "INSTRUCTOR" ? user.learningTrack ?? null : null;

  const students = await prisma.student.findMany({
    where: {
      isActive: true,
      ...(effectiveTrack && { learningTrack: effectiveTrack }),
    },
    orderBy: [{ trainingLocation: "asc" }, { learningTrack: "asc" }, { fullName: "asc" }],
  });

  const sessions = await prisma.trainingSession.findMany({
    where: {
      status: { in: ["CLOSED", "EXPIRED"] },
      ...(effectiveTrack && { learningTrack: effectiveTrack }),
    },
    orderBy: { startedAt: "asc" },
  });

  const records = await prisma.attendanceRecord.findMany({ where: { isAbsent: false } });
  const attended = new Set(records.map((r) => `${r.studentId}|${r.sessionId}`));

  const dateTrackMap = new Map<string, string[]>();
  for (const s of sessions) {
    const dateKey = s.startedAt.toISOString().split("T")[0];
    const key = `${dateKey}|${s.learningTrack}`;
    if (!dateTrackMap.has(key)) dateTrackMap.set(key, []);
    dateTrackMap.get(key)!.push(s.id);
  }

  const allDates = [...new Set(sessions.map((s) => s.startedAt.toISOString().split("T")[0]))].sort();

  const wb = new ExcelJS.Workbook();
  wb.creator = "ICBM-AttendX";
  wb.created = new Date();

  for (const campus of ["Abuja", "Enugu"]) {
    const campusStudents = students.filter(
      (s) => s.trainingLocation === campus || s.trainingLocation === "Both Campuses"
    );
    if (campusStudents.length === 0) continue;

    const ws = wb.addWorksheet(campus, {
      pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1 },
    });

    const fixedCols = [
      { header: "S/N", width: 5 },
      { header: "Application ID", width: 22 },
      { header: "Full Name", width: 30 },
      { header: "Gender", width: 10 },
      { header: "Learning Track", width: 28 },
      { header: "Location", width: 14 },
    ];
    const totalFixedCols = fixedCols.length;
    const totalCols = totalFixedCols + allDates.length + 1;

    fixedCols.forEach((col, i) => ws.getColumn(i + 1).width = col.width);
    for (let d = 0; d < allDates.length; d++) ws.getColumn(totalFixedCols + d + 1).width = 8;
    ws.getColumn(totalCols).width = 9;

    ws.getRow(1).height = 32;
    const title = ws.getCell(1, 1);
    title.value = `SBTS GROUP GLOBAL  |  ICBM BPO DIVISION  |  ATTENDx MASTER  |  ${campus.toUpperCase()} CAMPUS`;
    applyCell(title, null, { bold: true, fontColor: C.white, bgColor: "FF" + C.navyBg, fontSize: 12, hAlign: "center" });
    ws.mergeCells(1, 1, 1, totalCols);

    ws.getRow(2).height = 42;
    fixedCols.forEach((col, i) =>
      applyCell(ws.getCell(2, i + 1), col.header, { bold: true, fontColor: C.white, bgColor: "FF" + C.blueBg, hAlign: "center", wrap: true })
    );
    for (let d = 0; d < allDates.length; d++) {
      const dateObj = new Date(allDates[d] + "T00:00:00Z");
      const weekNum = Math.floor(d / 5);
      const bgColor = weekNum % 3 === 0 ? "FF" + C.blueLight : weekNum % 3 === 1 ? "FF" + C.tealBg : "FF" + C.blueBg;
      const fontColor = weekNum % 3 === 0 ? "FF" + C.navyText : C.white;
      applyCell(ws.getCell(2, totalFixedCols + d + 1), dayLabel(dateObj), { bold: true, fontColor, bgColor, hAlign: "center", wrap: true });
    }
    applyCell(ws.getCell(2, totalCols), "Days\nPresent", { bold: true, fontColor: C.white, bgColor: "FF" + C.navyBg, hAlign: "center", wrap: true });

    let rowNum = 3;
    let sn = 1;
    const tracks = [...new Set(campusStudents.map((s) => s.learningTrack))].sort();

    for (const track of tracks) {
      const trackStudents = campusStudents.filter((s) => s.learningTrack === track);
      if (!trackStudents.length) continue;

      ws.getRow(rowNum).height = 18;
      const tc = ws.getCell(rowNum, 1);
      tc.value = `— ${track} —`;
      applyCell(tc, null, { bold: true, fontColor: C.white, bgColor: "FF" + C.tealBg, hAlign: "left" });
      ws.mergeCells(rowNum, 1, rowNum, totalCols);
      rowNum++;

      for (const student of trackStudents) {
        ws.getRow(rowNum).height = 16;
        const rowBg = rowNum % 2 === 0 ? "FFF2F7FF" : "FFFFFFFF";

        applyCell(ws.getCell(rowNum, 1), sn, { bgColor: rowBg, hAlign: "center" });
        applyCell(ws.getCell(rowNum, 2), student.applicationId, { bgColor: rowBg, hAlign: "left", bold: true, fontColor: "FF" + C.navyBg });
        applyCell(ws.getCell(rowNum, 3), student.fullName, { bgColor: rowBg, hAlign: "left" });
        applyCell(ws.getCell(rowNum, 4), student.gender === "MALE" ? "M" : student.gender === "FEMALE" ? "F" : "O", { bgColor: rowBg, hAlign: "center" });
        applyCell(ws.getCell(rowNum, 5), student.learningTrack, { bgColor: rowBg, hAlign: "left" });
        applyCell(ws.getCell(rowNum, 6), student.trainingLocation, { bgColor: rowBg, hAlign: "center" });

        let daysPresent = 0;
        for (let d = 0; d < allDates.length; d++) {
          const cell = ws.getCell(rowNum, totalFixedCols + d + 1);
          const dtEntry = dateTrackMap.get(`${allDates[d]}|${student.learningTrack}`);
          if (!dtEntry) {
            applyCell(cell, "—", { bgColor: "FFE8E8E8", fontColor: "FFAAAAAA", hAlign: "center", fontSize: 9 });
            continue;
          }
          const present = dtEntry.some((sid) => attended.has(`${student.id}|${sid}`));
          if (present) {
            daysPresent++;
            applyCell(cell, "Present", { bold: true, fontColor: "FF" + C.presentText, bgColor: "FF" + C.presentBg, hAlign: "center" });
          } else {
            applyCell(cell, "ABS", { bold: true, fontColor: "FF" + C.absText, bgColor: "FF" + C.absBg, hAlign: "center" });
          }
        }

        applyCell(ws.getCell(rowNum, totalCols), daysPresent, {
          bold: true,
          fontColor: C.white,
          bgColor: daysPresent === 0 ? "FF" + C.absText : "FF" + C.navyBg,
          hAlign: "center",
        });

        rowNum++;
        sn++;
      }
    }

    ws.views = [{ state: "frozen", xSplit: totalFixedCols, ySplit: 2, activeCell: "G3" }];
    for (let c = 1; c <= totalCols; c++) {
      ws.getCell(2, c).border = { bottom: { style: "medium", color: { argb: "FF" + C.navyBg } } };
    }
  }

  const buffer = await wb.xlsx.writeBuffer();
  const today = new Date().toISOString().split("T")[0];
  const filename = `ICBM_Master_Attendance_${today}.xlsx`;

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
