import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AttendX API Documentation",
  description: "REST API v1 documentation for the AttendX attendance platform.",
};

const NAVY = "#0F1E35";
const TEAL = "#0E7C7B";
const GOLD = "#C9922A";
const BG = "#F5F6FA";

const SIDEBAR_LINKS = [
  { href: "#overview", label: "Overview" },
  { href: "#authentication", label: "Authentication" },
  { href: "#error-handling", label: "Error Handling" },
];

const ENDPOINTS = [
  { href: "#get-attendance-live", method: "GET", path: "/attendance/live" },
  { href: "#get-students", method: "GET", path: "/students" },
  { href: "#get-student-by-id", method: "GET", path: "/students/:applicationId" },
  { href: "#get-sessions", method: "GET", path: "/sessions" },
  { href: "#get-session-by-id", method: "GET", path: "/sessions/:id" },
  { href: "#get-attendance-summary", method: "GET", path: "/attendance/summary" },
];

const FOOTER_LINKS = [
  { href: "#data-models", label: "Data Models" },
  { href: "#learning-tracks", label: "Learning Tracks" },
  { href: "#code-examples", label: "Code Examples" },
];

function MetaPill({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="flex items-center gap-2 rounded-full px-4 py-2 text-xs sm:text-sm"
      style={{
        background: "rgba(255,255,255,0.08)",
        border: "1px solid rgba(255,255,255,0.16)",
        backdropFilter: "blur(6px)",
      }}
    >
      <span style={{ color: "rgba(255,255,255,0.55)" }}>{label}</span>
      <span className="font-semibold" style={{ color: "white" }}>
        {value}
      </span>
    </div>
  );
}

function MethodBadge({ method }: { method: string }) {
  return (
    <span
      className="inline-flex items-center justify-center rounded-md px-2 py-0.5 text-[11px] font-bold tracking-wide"
      style={{ backgroundColor: "rgba(14,124,123,0.12)", color: TEAL }}
    >
      {method}
    </span>
  );
}

function CodeBlock({ children, label }: { children: string; label?: string }) {
  return (
    <div className="rounded-xl overflow-hidden border" style={{ borderColor: "#1f2f47" }}>
      {label && (
        <div
          className="px-4 py-2 text-xs font-semibold tracking-wide"
          style={{ backgroundColor: "#16263f", color: "rgba(255,255,255,0.6)" }}
        >
          {label}
        </div>
      )}
      <pre
        className="overflow-x-auto px-4 py-4 text-[13px] leading-relaxed"
        style={{ backgroundColor: NAVY, color: "#d6e4f0" }}
      >
        <code>{children}</code>
      </pre>
    </div>
  );
}

function ParamTable({
  rows,
}: {
  rows: { name: string; type: string; required: boolean; description: string }[];
}) {
  return (
    <div className="overflow-x-auto rounded-xl border" style={{ borderColor: "#E2E8F0" }}>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left" style={{ backgroundColor: "#F8FAFC", color: "#64748b" }}>
            <th className="px-4 py-2.5 font-semibold">Parameter</th>
            <th className="px-4 py-2.5 font-semibold">Type</th>
            <th className="px-4 py-2.5 font-semibold">Required</th>
            <th className="px-4 py-2.5 font-semibold">Description</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.name} className="border-t" style={{ borderColor: "#F1F5F9" }}>
              <td className="px-4 py-2.5 font-mono text-xs" style={{ color: NAVY }}>
                {row.name}
              </td>
              <td className="px-4 py-2.5 text-xs" style={{ color: "#64748b" }}>
                {row.type}
              </td>
              <td className="px-4 py-2.5 text-xs">
                {row.required ? (
                  <span style={{ color: "#b91c1c" }}>required</span>
                ) : (
                  <span style={{ color: "#64748b" }}>optional</span>
                )}
              </td>
              <td className="px-4 py-2.5 text-sm" style={{ color: "#334155" }}>
                {row.description}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="pt-2 pb-12 scroll-mt-24">
      <h2 className="text-2xl font-extrabold mb-4" style={{ color: NAVY }}>
        {title}
      </h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Endpoint({
  id,
  method,
  path,
  description,
  params,
  pathParam,
  response,
  errorNote,
}: {
  id: string;
  method: string;
  path: string;
  description: string;
  params?: { name: string; type: string; required: boolean; description: string }[];
  pathParam?: { name: string; type: string; required: boolean; description: string };
  response: string;
  errorNote?: string;
}) {
  return (
    <section id={id} className="pt-2 pb-12 scroll-mt-24 border-t first:border-t-0" style={{ borderColor: "#E2E8F0" }}>
      <div className="flex items-center gap-3 mt-8 mb-2">
        <MethodBadge method={method} />
        <code className="text-base font-bold" style={{ color: NAVY }}>
          {path}
        </code>
      </div>
      <p className="text-sm mb-4" style={{ color: "#64748b" }}>
        {description}
      </p>

      {pathParam && (
        <>
          <h4 className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: "#94a3b8" }}>
            Path Parameter
          </h4>
          <ParamTable rows={[pathParam]} />
        </>
      )}

      {params && params.length > 0 && (
        <>
          <h4 className="text-xs font-bold uppercase tracking-wide mb-2 mt-4" style={{ color: "#94a3b8" }}>
            Query Parameters
          </h4>
          <ParamTable rows={params} />
        </>
      )}

      <h4 className="text-xs font-bold uppercase tracking-wide mb-2 mt-4" style={{ color: "#94a3b8" }}>
        Example Response
      </h4>
      <CodeBlock label="200 OK">{response}</CodeBlock>

      {errorNote && (
        <p className="text-xs mt-2" style={{ color: "#64748b" }}>
          {errorNote}
        </p>
      )}
    </section>
  );
}

export default function ApiDocsPage() {
  return (
    <div style={{ backgroundColor: BG }} className="min-h-screen">
      {/* Hero */}
      <div
        className="relative overflow-hidden"
        style={{ backgroundColor: NAVY }}
      >
        <style>{`
          @keyframes blobDrift {
            0%   { transform: translate(0,0) scale(1); }
            33%  { transform: translate(-30px, 40px) scale(1.12); }
            66%  { transform: translate(25px, -20px) scale(0.91); }
            100% { transform: translate(-15px, 15px) scale(1.07); }
          }
        `}</style>

        <div
          style={{
            position: "absolute", top: "-160px", right: "-140px",
            width: "550px", height: "550px", borderRadius: "50%",
            background: "radial-gradient(circle, rgba(14,124,123,0.95), rgba(14,124,123,0.3) 50%, rgba(14,124,123,0))",
            filter: "blur(70px)", zIndex: 0, pointerEvents: "none",
            animation: "blobDrift 16s ease-in-out infinite alternate",
          }}
        />
        <div
          style={{
            position: "absolute", bottom: "-160px", left: "-140px",
            width: "500px", height: "500px", borderRadius: "50%",
            background: "radial-gradient(circle, rgba(201,146,42,0.95), rgba(201,146,42,0.3) 50%, rgba(201,146,42,0))",
            filter: "blur(65px)", zIndex: 0, pointerEvents: "none",
            animation: "blobDrift 21s ease-in-out infinite alternate",
            animationDelay: "-8s",
          }}
        />
        <div
          style={{
            position: "absolute", top: "20%", left: "30%",
            width: "320px", height: "320px", borderRadius: "50%",
            background: "radial-gradient(circle, rgba(14,124,123,0.5), rgba(14,124,123,0))",
            filter: "blur(55px)", zIndex: 0, pointerEvents: "none",
            animation: "blobDrift 26s ease-in-out infinite alternate",
            animationDelay: "-14s",
          }}
        />
        <div
          style={{
            position: "absolute", inset: 0,
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            background: "rgba(15,30,53,0.35)",
            zIndex: 1, pointerEvents: "none",
          }}
        />

        <div className="relative z-10 max-w-6xl mx-auto px-6 py-20 text-center">
          <p
            className="text-xs font-bold uppercase tracking-[0.2em] mb-4"
            style={{ color: "rgba(255,255,255,0.55)" }}
          >
            SBTS Group · ICBM BPO Division
          </p>
          <h1
            className="font-black tracking-tight"
            style={{ color: "white", fontSize: "3.25rem", lineHeight: 1.05 }}
          >
            AttendX API
          </h1>
          <p className="mt-3 text-xl font-bold" style={{ color: TEAL }}>
            v1 · REST API Documentation
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 mt-8">
            <MetaPill label="Version" value="v1" />
            <MetaPill label="Base URL" value="attendx-sbts.com/api/v1" />
            <MetaPill label="Format" value="JSON" />
            <MetaPill label="Auth" value="API Key" />
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-6xl mx-auto px-6 py-10 flex gap-10">
        {/* Sidebar */}
        <aside className="hidden lg:block w-56 flex-shrink-0">
          <nav className="sticky top-10 space-y-6">
            <div className="space-y-1">
              {SIDEBAR_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="block text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-white"
                  style={{ color: "#334155" }}
                >
                  {link.label}
                </a>
              ))}
            </div>

            <div>
              <p
                className="px-3 text-xs font-bold uppercase tracking-wide mb-1"
                style={{ color: "#94a3b8" }}
              >
                Endpoints
              </p>
              <div className="space-y-1">
                {ENDPOINTS.map((ep) => (
                  <a
                    key={ep.href}
                    href={ep.href}
                    className="flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-white"
                    style={{ color: "#334155" }}
                  >
                    <span
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                      style={{ backgroundColor: "rgba(14,124,123,0.12)", color: TEAL }}
                    >
                      {ep.method}
                    </span>
                    <code className="truncate text-xs">{ep.path}</code>
                  </a>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              {FOOTER_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="block text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-white"
                  style={{ color: "#334155" }}
                >
                  {link.label}
                </a>
              ))}
            </div>
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0">
          <Section id="overview" title="Overview">
            <p className="text-sm leading-relaxed" style={{ color: "#334155" }}>
              The AttendX API gives partner systems — Learning Management Systems (LMS),
              reporting dashboards, or internal tools — read-only access to live attendance
              data, student records, training sessions, and aggregate statistics across the
              Abuja and Enugu campuses.
            </p>
            <p className="text-sm leading-relaxed" style={{ color: "#334155" }}>
              All endpoints are versioned under <code className="text-xs font-mono px-1.5 py-0.5 rounded" style={{ backgroundColor: "#EEF2F7" }}>/api/v1</code> and
              return JSON. The API is read-only: there are no endpoints to create, update, or
              delete records.
            </p>
            <ParamTable
              rows={[
                { name: "Base URL", type: "string", required: true, description: "https://attendx-sbts.com/api/v1" },
                { name: "Content-Type", type: "header", required: true, description: "application/json (responses only — GET requests carry no body)" },
                { name: "Rate limit", type: "—", required: true, description: "120 requests per minute, per API key" },
              ]}
            />
          </Section>

          <Section id="authentication" title="Authentication">
            <p className="text-sm leading-relaxed" style={{ color: "#334155" }}>
              Every request must include an <code className="text-xs font-mono px-1.5 py-0.5 rounded" style={{ backgroundColor: "#EEF2F7" }}>x-api-key</code> header.
              Keys are generated and managed by a Super Admin from the{" "}
              <strong>API Keys</strong> page inside AttendX.
            </p>
            <CodeBlock label="Request header">{`x-api-key: ax_live_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6`}</CodeBlock>
            <p className="text-sm leading-relaxed" style={{ color: "#334155" }}>
              Keys are shown once at creation time and stored hashed — if a key is lost, revoke
              it and generate a new one. Revoked keys are rejected immediately.
            </p>
          </Section>

          <Section id="error-handling" title="Error Handling">
            <p className="text-sm leading-relaxed" style={{ color: "#334155" }}>
              Errors are returned as a JSON object with a single <code className="text-xs font-mono px-1.5 py-0.5 rounded" style={{ backgroundColor: "#EEF2F7" }}>error</code> field.
            </p>
            <CodeBlock label="Error shape">{`{
  "error": "Invalid or inactive API key."
}`}</CodeBlock>
            <ParamTable
              rows={[
                { name: "401", type: "Unauthorized", required: true, description: "Missing x-api-key header" },
                { name: "403", type: "Forbidden", required: true, description: "API key is invalid or has been revoked" },
                { name: "404", type: "Not Found", required: true, description: "Student or session does not exist" },
                { name: "429", type: "Too Many Requests", required: true, description: "Rate limit exceeded (120 requests/minute/key)" },
              ]}
            />
          </Section>

          <section id="endpoints" className="pt-2 scroll-mt-24">
            <h2 className="text-2xl font-extrabold mb-2" style={{ color: NAVY }}>
              Endpoints
            </h2>
            <p className="text-sm mb-4" style={{ color: "#64748b" }}>
              All six endpoints below are <strong>GET</strong> only.
            </p>

            <Endpoint
              id="get-attendance-live"
              method="GET"
              path="/attendance/live"
              description="Live attendance for sessions that are currently active. Designed to be polled every 30–60 seconds for a real-time view of who has checked in."
              params={[
                { name: "track", type: "string", required: false, description: "Filter by learning track, e.g. Cybersecurity" },
                { name: "location", type: "string", required: false, description: "Filter by campus: Abuja, Enugu, or Both Campuses" },
              ]}
              response={`{
  "timestamp": "2026-06-19T14:32:10.000Z",
  "activeSessions": 1,
  "sessions": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "sessionName": "Cybersecurity — Week 6",
      "sessionCode": "CYB-W6-A1B2",
      "learningTrack": "Cybersecurity",
      "location": "Abuja",
      "startedAt": "2026-06-19T14:00:00.000Z",
      "expiresAt": "2026-06-19T16:00:00.000Z",
      "instructor": "Ada Nwosu",
      "checkedInCount": 2,
      "attendees": [
        {
          "applicationId": "ICBM-2026-0142",
          "fullName": "Chidi Okafor",
          "gender": "MALE",
          "learningTrack": "Cybersecurity",
          "trainingLocation": "Abuja",
          "email": "chidi.okafor@example.com",
          "checkInTime": "2026-06-19T14:05:23.000Z"
        }
      ]
    }
  ]
}`}
            />

            <Endpoint
              id="get-students"
              method="GET"
              path="/students"
              description="All active students, with their attendance rate computed against sessions held in their track and campus."
              params={[
                { name: "track", type: "string", required: false, description: "Filter by learning track" },
                { name: "location", type: "string", required: false, description: "Filter by campus" },
              ]}
              response={`{
  "count": 1,
  "students": [
    {
      "applicationId": "ICBM-2026-0142",
      "fullName": "Chidi Okafor",
      "gender": "MALE",
      "learningTrack": "Cybersecurity",
      "trainingLocation": "Abuja",
      "email": "chidi.okafor@example.com",
      "phone": "+2348012345678",
      "attendance": {
        "sessionsAttended": 18,
        "attendanceRate": 86
      }
    }
  ]
}`}
            />

            <Endpoint
              id="get-student-by-id"
              method="GET"
              path="/students/:applicationId"
              description="Full profile for a single student, including their complete attendance history."
              pathParam={{ name: "applicationId", type: "string", required: true, description: "The student's application ID, e.g. ICBM-2026-0142" }}
              response={`{
  "applicationId": "ICBM-2026-0142",
  "fullName": "Chidi Okafor",
  "gender": "MALE",
  "learningTrack": "Cybersecurity",
  "trainingLocation": "Abuja",
  "email": "chidi.okafor@example.com",
  "phone": "+2348012345678",
  "attendance": {
    "totalSessions": 21,
    "sessionsAttended": 18,
    "sessionsMissed": 3,
    "attendanceRate": 86
  },
  "history": [
    {
      "sessionId": "550e8400-e29b-41d4-a716-446655440000",
      "sessionName": "Cybersecurity — Week 6",
      "date": "2026-06-19T14:00:00.000Z",
      "checkInTime": "2026-06-19T14:05:23.000Z",
      "location": "Abuja",
      "status": "PRESENT"
    }
  ]
}`}
              errorNote='Returns 404 { "error": "Student not found" } if the applicationId does not exist.'
            />

            <Endpoint
              id="get-sessions"
              method="GET"
              path="/sessions"
              description="All training sessions, filterable by status, track, location, and date range."
              params={[
                { name: "status", type: "string", required: false, description: "ACTIVE, EXPIRED, or CLOSED" },
                { name: "track", type: "string", required: false, description: "Filter by learning track" },
                { name: "location", type: "string", required: false, description: "Filter by campus" },
                { name: "from", type: "ISO date", required: false, description: "Sessions started on or after this date" },
                { name: "to", type: "ISO date", required: false, description: "Sessions started on or before this date" },
              ]}
              response={`{
  "count": 1,
  "sessions": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "sessionName": "Cybersecurity — Week 6",
      "sessionCode": "CYB-W6-A1B2",
      "learningTrack": "Cybersecurity",
      "location": "Abuja",
      "status": "CLOSED",
      "startedAt": "2026-06-19T14:00:00.000Z",
      "endedAt": "2026-06-19T16:02:00.000Z",
      "expiresAt": "2026-06-19T16:00:00.000Z",
      "instructor": "Ada Nwosu",
      "attendeeCount": 24
    }
  ]
}`}
            />

            <Endpoint
              id="get-session-by-id"
              method="GET"
              path="/sessions/:id"
              description="A single session's full attendee list and verification status."
              pathParam={{ name: "id", type: "UUID", required: true, description: "The session's unique ID" }}
              response={`{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "sessionName": "Cybersecurity — Week 6",
  "sessionCode": "CYB-W6-A1B2",
  "learningTrack": "Cybersecurity",
  "location": "Abuja",
  "status": "CLOSED",
  "startedAt": "2026-06-19T14:00:00.000Z",
  "endedAt": "2026-06-19T16:02:00.000Z",
  "instructor": "Ada Nwosu",
  "attendeeCount": 1,
  "attendees": [
    {
      "applicationId": "ICBM-2026-0142",
      "fullName": "Chidi Okafor",
      "gender": "MALE",
      "learningTrack": "Cybersecurity",
      "trainingLocation": "Abuja",
      "email": "chidi.okafor@example.com",
      "checkInTime": "2026-06-19T14:05:23.000Z",
      "verificationStatus": "VERIFIED"
    }
  ]
}`}
              errorNote='Returns 404 { "error": "Session not found" } if the id does not exist.'
            />

            <Endpoint
              id="get-attendance-summary"
              method="GET"
              path="/attendance/summary"
              description="Aggregate attendance statistics, broken down by learning track and campus, over an optional date range."
              params={[
                { name: "track", type: "string", required: false, description: "Filter by learning track" },
                { name: "location", type: "string", required: false, description: "Filter by campus" },
                { name: "from", type: "ISO date", required: false, description: "Start of the reporting period" },
                { name: "to", type: "ISO date", required: false, description: "End of the reporting period" },
              ]}
              response={`{
  "period": {
    "from": "2026-06-01",
    "to": "2026-06-19"
  },
  "filters": {
    "track": null,
    "location": null
  },
  "summary": {
    "totalStudents": 312,
    "totalSessions": 21,
    "totalCheckIns": 5614,
    "averageAttendanceRate": 86
  },
  "byTrack": [
    { "track": "Cybersecurity", "checkIns": 1203 },
    { "track": "Software Development", "checkIns": 1180 }
  ],
  "byLocation": [
    { "location": "Abuja", "checkIns": 2890 },
    { "location": "Enugu", "checkIns": 2724 }
  ]
}`}
            />
          </section>

          <Section id="data-models" title="Data Models">
            <div>
              <h3 className="text-sm font-bold mb-2" style={{ color: NAVY }}>Student</h3>
              <ParamTable
                rows={[
                  { name: "applicationId", type: "string", required: true, description: "Unique student identifier, e.g. ICBM-2026-0142" },
                  { name: "fullName", type: "string", required: true, description: "Student's full name" },
                  { name: "gender", type: "MALE | FEMALE | OTHER", required: true, description: "Gender enum" },
                  { name: "learningTrack", type: "string", required: true, description: "One of the five learning tracks" },
                  { name: "trainingLocation", type: "string", required: true, description: "Abuja, Enugu, or Both Campuses" },
                  { name: "email", type: "string | null", required: false, description: "Contact email" },
                  { name: "phone", type: "string | null", required: false, description: "Contact phone number" },
                ]}
              />
            </div>
            <div>
              <h3 className="text-sm font-bold mb-2 mt-6" style={{ color: NAVY }}>Training Session</h3>
              <ParamTable
                rows={[
                  { name: "id", type: "UUID", required: true, description: "Unique session identifier" },
                  { name: "sessionName", type: "string", required: true, description: "Human-readable session name" },
                  { name: "sessionCode", type: "string", required: true, description: "Short code printed on the session QR" },
                  { name: "learningTrack", type: "string", required: true, description: "Track the session belongs to" },
                  { name: "location", type: "string", required: true, description: "Campus the session is held at" },
                  { name: "status", type: "ACTIVE | EXPIRED | CLOSED", required: true, description: "SessionStatus enum" },
                  { name: "startedAt / endedAt / expiresAt", type: "ISO datetime", required: true, description: "Session lifecycle timestamps" },
                  { name: "instructor", type: "string", required: true, description: "Name of the instructor who ran the session" },
                ]}
              />
            </div>
            <div>
              <h3 className="text-sm font-bold mb-2 mt-6" style={{ color: NAVY }}>Attendance Record</h3>
              <ParamTable
                rows={[
                  { name: "checkInTime", type: "ISO datetime", required: true, description: "When the student checked in" },
                  { name: "verificationStatus", type: "PENDING | VERIFIED | FLAGGED", required: true, description: "VerificationStatus enum — manual review state" },
                  { name: "isAbsent", type: "boolean", required: true, description: "True for absence records; the public API only ever returns present (isAbsent=false) records" },
                ]}
              />
            </div>
          </Section>

          <Section id="learning-tracks" title="Learning Tracks">
            <p className="text-sm leading-relaxed mb-3" style={{ color: "#334155" }}>
              Use these exact strings for the <code className="text-xs font-mono px-1.5 py-0.5 rounded" style={{ backgroundColor: "#EEF2F7" }}>track</code> and{" "}
              <code className="text-xs font-mono px-1.5 py-0.5 rounded" style={{ backgroundColor: "#EEF2F7" }}>location</code> query parameters.
            </p>
            <div className="grid sm:grid-cols-2 gap-6">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: "#94a3b8" }}>
                  Learning Tracks
                </h3>
                <ul className="space-y-1.5">
                  {[
                    "Cybersecurity",
                    "Software Development",
                    "AI & Machine Learning",
                    "Business Process & Outsourcing (BPO)",
                    "Project Management",
                  ].map((track) => (
                    <li key={track} className="text-sm flex items-center gap-2" style={{ color: "#334155" }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: TEAL, display: "inline-block" }} />
                      {track}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: "#94a3b8" }}>
                  Training Locations
                </h3>
                <ul className="space-y-1.5">
                  {["Abuja", "Enugu", "Both Campuses"].map((loc) => (
                    <li key={loc} className="text-sm flex items-center gap-2" style={{ color: "#334155" }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: GOLD, display: "inline-block" }} />
                      {loc}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Section>

          <Section id="code-examples" title="Code Examples">
            <h3 className="text-sm font-bold mb-2" style={{ color: NAVY }}>cURL</h3>
            <CodeBlock>{`curl https://attendx-sbts.com/api/v1/students \\
  -H "x-api-key: ax_live_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6"`}</CodeBlock>

            <h3 className="text-sm font-bold mb-2 mt-6" style={{ color: NAVY }}>JavaScript (fetch)</h3>
            <CodeBlock>{`const res = await fetch("https://attendx-sbts.com/api/v1/students?track=Cybersecurity", {
  headers: { "x-api-key": process.env.ATTENDX_API_KEY },
});

const data = await res.json();
console.log(data.students);`}</CodeBlock>

            <h3 className="text-sm font-bold mb-2 mt-6" style={{ color: NAVY }}>Python (requests)</h3>
            <CodeBlock>{`import requests

res = requests.get(
    "https://attendx-sbts.com/api/v1/attendance/summary",
    headers={"x-api-key": "ax_live_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6"},
    params={"track": "Cybersecurity", "from": "2026-06-01"},
)

print(res.json())`}</CodeBlock>
          </Section>

          <footer className="pt-6 pb-16 text-center text-xs" style={{ color: "#94a3b8" }}>
            AttendX API v1 · SBTS Group · ICBM BPO Division
          </footer>
        </main>
      </div>
    </div>
  );
}
