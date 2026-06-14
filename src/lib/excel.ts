import * as XLSX from "xlsx";

export function generateStudentTemplate(): Buffer {
  const headers = [
    "Full Name",
    "Application ID",
    "Gender",
    "Training Location",
    "Learning Track",
  ];

  const exampleRows = [
    ["Amina Bello", "ICBM-2026-0001", "Female", "Abuja", "Cybersecurity"],
    ["Chukwuemeka Obi", "ICBM-2026-0002", "Male", "Enugu", "BPO"],
  ];

  const ws = XLSX.utils.aoa_to_sheet([headers, ...exampleRows]);

  // Column widths
  ws["!cols"] = [{ wch: 25 }, { wch: 18 }, { wch: 10 }, { wch: 20 }, { wch: 25 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Students");

  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

export function parseStudentExcel(buffer: Buffer): Array<{
  fullName: string;
  applicationId: string;
  gender: string;
  trainingLocation: string;
  learningTrack: string;
}> {
  const wb = XLSX.read(buffer, { type: "buffer" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: "" });

  return rows.map((row) => ({
    fullName: String(
      row["Full Name"] ?? row["full_name"] ?? row["fullName"] ?? ""
    ).trim(),
    applicationId: String(
      row["Application ID"] ?? row["application_id"] ?? row["applicationId"] ?? ""
    ).trim(),
    gender: String(row["Gender"] ?? row["gender"] ?? "").trim(),
    trainingLocation: String(
      row["Training Location"] ?? row["training_location"] ?? row["trainingLocation"] ?? ""
    ).trim(),
    learningTrack: String(
      row["Learning Track"] ?? row["learning_track"] ?? row["learningTrack"] ?? ""
    ).trim(),
  }));
}

export function normalizeGender(value: string): "MALE" | "FEMALE" | "OTHER" {
  const v = value.toLowerCase().trim();
  if (v === "male" || v === "m") return "MALE";
  if (v === "female" || v === "f") return "FEMALE";
  return "OTHER";
}
