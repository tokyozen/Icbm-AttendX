import { prisma } from "@/lib/prisma";

export const COUNTED_SESSION_STATUSES = ["CLOSED", "EXPIRED"] as const;

export interface SessionMeta {
  id: string;
  sessionName: string;
  sessionCode: string;
  learningTrack: string;
  location: string;
  startedAt: Date;
}

export interface DateTrackGroup {
  date: string;
  learningTrack: string;
  sessionIds: string[];
  sessions: SessionMeta[];
}

/**
 * Sessions that share a date+track are one logical attendance day (e.g. a
 * "Both Campuses" session plus a campus-specific makeup session). Grouping
 * them here is what Master Attendance, the Override panel, and the student
 * history view all build on, so a day reads the same everywhere.
 */
export async function getDateTrackGroups(learningTrack?: string) {
  const sessions = await prisma.trainingSession.findMany({
    where: {
      status: { in: [...COUNTED_SESSION_STATUSES] },
      ...(learningTrack ? { learningTrack } : {}),
    },
    orderBy: { startedAt: "asc" },
    select: {
      id: true,
      sessionName: true,
      sessionCode: true,
      learningTrack: true,
      startedAt: true,
      location: true,
    },
  });

  const groups = new Map<string, DateTrackGroup>();
  const sessionLocationMap = new Map<string, string>();

  for (const s of sessions) {
    const date = s.startedAt.toISOString().split("T")[0];
    const key = `${date}|${s.learningTrack}`;
    if (!groups.has(key)) {
      groups.set(key, { date, learningTrack: s.learningTrack, sessionIds: [], sessions: [] });
    }
    const group = groups.get(key)!;
    group.sessionIds.push(s.id);
    group.sessions.push(s);
    sessionLocationMap.set(s.id, s.location);
  }

  const dates = [...new Set(sessions.map((s) => s.startedAt.toISOString().split("T")[0]))].sort();

  return { groups, sessionLocationMap, dates };
}

export interface RecordLike {
  checkInTime: Date;
  verificationStatus: string;
  isAbsent: boolean;
}

export type DateStatus<R extends RecordLike> =
  | { status: "no-session" }
  | { status: "present" | "absent"; sessionId: string; record?: R };

/**
 * A date+track group applies to a student if a session that day matched
 * their campus (or either side was "Both Campuses"). The one exception:
 * an explicit record (a real check-in, or a manual absence override) for
 * any session in the group always counts, even if that session happened
 * to be tagged to the other campus — the student's actual record is the
 * source of truth, not the session's location tag.
 */
export function resolveDateStatus<R extends RecordLike>({
  group,
  sessionLocationMap,
  trainingLocation,
  recordsBySessionId,
}: {
  group: DateTrackGroup | undefined;
  sessionLocationMap: Map<string, string>;
  trainingLocation: string;
  recordsBySessionId: Map<string, R>;
}): DateStatus<R> {
  if (!group) return { status: "no-session" };

  let foundSessionId: string | undefined;
  let foundRecord: R | undefined;
  for (const sid of group.sessionIds) {
    const r = recordsBySessionId.get(sid);
    if (r) {
      foundSessionId = sid;
      foundRecord = r;
      break;
    }
  }

  const applies =
    !!foundRecord ||
    group.sessionIds.some((sid) => {
      const loc = sessionLocationMap.get(sid) ?? "Both Campuses";
      return loc === "Both Campuses" || loc === trainingLocation || trainingLocation === "Both Campuses";
    });

  if (!applies) return { status: "no-session" };

  if (foundRecord && !foundRecord.isAbsent) {
    return { status: "present", sessionId: foundSessionId!, record: foundRecord };
  }

  return { status: "absent", sessionId: foundSessionId ?? group.sessionIds[0], record: foundRecord };
}

/** How many active students a session's check-in count should be measured against. */
export function countRegisteredForSession(learningTrack: string, sessionLocation: string) {
  return prisma.student.count({
    where: {
      learningTrack,
      isActive: true,
      ...(sessionLocation === "Both Campuses"
        ? {}
        : { OR: [{ trainingLocation: sessionLocation }, { trainingLocation: "Both Campuses" }] }),
    },
  });
}
