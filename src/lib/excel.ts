import * as XLSX from "xlsx";

export function generateStudentTemplate(): Buffer {
  const headers = [
    "Full Name",
    "Application ID",
    "Phone Number",
    "Email Address",
    "Gender",
    "Training Location",
    "Learning Track",
  ];

  const exampleRows = [
    ["Amina Bello", "ICBM-2026-0001", "+2348012345678", "amina.bello@example.com", "Female", "Abuja", "Cybersecurity"],
    ["Chukwuemeka Obi", "ICBM-2026-0002", "+2348098765432", "chukwuemeka.obi@example.com", "Male", "Enugu", "Software Development"],
    ["Fatima Yusuf", "ICBM-2026-0003", "+2347011223344", "fatima.yusuf@example.com", "Female", "Abuja", "AI & Machine Learning"],
    ["Emeka Nwosu", "ICBM-2026-0004", "", "", "Male", "Enugu", "Business Process & Outsourcing (BPO)"],
    ["Ngozi Adeyemi", "ICBM-2026-0005", "+2348155667788", "ngozi.adeyemi@example.com", "Female", "Abuja", "Project Management"],
  ];

  const ws = XLSX.utils.aoa_to_sheet([headers, ...exampleRows]);

  ws["!cols"] = [
    { wch: 25 }, // Full Name
    { wch: 18 }, // Application ID
    { wch: 18 }, // Phone Number
    { wch: 30 }, // Email Address
    { wch: 10 }, // Gender
    { wch: 20 }, // Training Location
    { wch: 38 }, // Learning Track
  ];

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
  email: string;
  phoneNumber: string;
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
    email: String(
      row["Email Address"] ?? row["Email"] ?? row["email"] ?? ""
    ).trim(),
    phoneNumber: String(
      row["Phone Number"] ?? row["Phone"] ?? row["phone_number"] ?? row["phoneNumber"] ?? ""
    ).trim(),
  }));
}

export function normalizeGender(value: string): "MALE" | "FEMALE" | "OTHER" {
  const v = value.toLowerCase().trim();
  if (v === "male" || v === "m") return "MALE";
  if (v === "female" || v === "f") return "FEMALE";
  return "OTHER";
}
