export type AttendanceStatusFilter = "present" | "absent" | "verified" | "flagged" | "pending";

export interface AttendanceFilterParams {
  sessionId?: string | null;
  date?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  location?: string | null;
  track?: string | null;
  attendanceStatus?: string | null;
  instructorId?: string | null;
}

export function readAttendanceFilterParams(searchParams: URLSearchParams): AttendanceFilterParams {
  return {
    sessionId: searchParams.get("sessionId"),
    date: searchParams.get("date"),
    startDate: searchParams.get("startDate"),
    endDate: searchParams.get("endDate"),
    location: searchParams.get("location"),
    track: searchParams.get("track"),
    attendanceStatus: searchParams.get("attendanceStatus"),
    instructorId: searchParams.get("instructorId"),
  };
}

/**
 * Builds the Prisma `where` clause for AttendanceRecord queries. Shared by
 * the Reports preview list and the export endpoint so a filter behaves
 * identically wherever it's applied — a date range or status filter that
 * works in the table must produce the same rows in CSV/Excel/PDF.
 */
export function buildAttendanceRecordWhere(
  params: AttendanceFilterParams,
  scope: { role: string; userId: string }
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: Record<string, any> = {};

  if (params.sessionId) where.sessionId = params.sessionId;
  if (params.location) where.trainingLocation = params.location;
  if (params.track) where.learningTrack = params.track;

  if (params.date) {
    const day = new Date(params.date);
    const next = new Date(day);
    next.setDate(next.getDate() + 1);
    where.checkInTime = { gte: day, lt: next };
  } else if (params.startDate || params.endDate) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const range: Record<string, any> = {};
    if (params.startDate) range.gte = new Date(params.startDate);
    if (params.endDate) {
      const end = new Date(params.endDate);
      end.setDate(end.getDate() + 1);
      range.lt = end;
    }
    where.checkInTime = range;
  }

  switch (params.attendanceStatus as AttendanceStatusFilter | null | undefined) {
    case "present":
      where.isAbsent = false;
      break;
    case "absent":
      where.isAbsent = true;
      break;
    case "verified":
      where.verificationStatus = "VERIFIED";
      break;
    case "flagged":
      where.verificationStatus = "FLAGGED";
      break;
    case "pending":
      where.verificationStatus = "PENDING";
      break;
  }

  // INSTRUCTOR is always scoped to their own sessions; the facilitator
  // filter only applies on top of that scope for admins.
  if (scope.role === "INSTRUCTOR") {
    where.session = { instructorId: scope.userId };
  } else if (params.instructorId) {
    where.session = { instructorId: params.instructorId };
  }

  return where;
}

/** Where clause for TrainingSession queries (e.g. "Active Sessions" summary card). */
export function buildSessionWhere(
  params: Pick<AttendanceFilterParams, "location" | "track" | "instructorId">,
  scope: { role: string; userId: string }
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: Record<string, any> = {};
  if (params.location) where.location = params.location;
  if (params.track) where.learningTrack = params.track;

  if (scope.role === "INSTRUCTOR") {
    where.instructorId = scope.userId;
  } else if (params.instructorId) {
    where.instructorId = params.instructorId;
  }

  return where;
}
