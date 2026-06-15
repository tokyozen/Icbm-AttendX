import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient();

const TEST_APP_IDS = [
  "ICBM-2026-0001",
  "ICBM-2026-0002",
  "ICBM-2026-0003",
  "ICBM-2026-0004",
  "ICBM-2026-0005",
];

const INSTRUCTOR_EMAIL = "instructor@icbm-attendx.com";
const SUPER_ADMIN_EMAIL = "admin@icbm-attendx.com"; // NEVER deleted

async function main() {
  console.log("Starting cleanup — super admin will NOT be touched.");

  // 1. Delete attendance records for test students
  const delAttendance = await prisma.attendanceRecord.deleteMany({
    where: { applicationId: { in: TEST_APP_IDS } },
  });
  console.log(`Deleted ${delAttendance.count} attendance record(s) for test students.`);

  // 2. Find and remove sessions belonging to the test instructor
  const instructor = await prisma.user.findUnique({ where: { email: INSTRUCTOR_EMAIL } });
  if (instructor) {
    // Delete attendance records tied to those sessions first
    const instructorSessions = await prisma.trainingSession.findMany({
      where: { instructorId: instructor.id },
      select: { id: true },
    });
    if (instructorSessions.length > 0) {
      const sessionIds = instructorSessions.map((s) => s.id);
      const delAtt = await prisma.attendanceRecord.deleteMany({
        where: { sessionId: { in: sessionIds } },
      });
      console.log(`Deleted ${delAtt.count} attendance record(s) tied to instructor sessions.`);
    }
    const delSessions = await prisma.trainingSession.deleteMany({
      where: { instructorId: instructor.id },
    });
    console.log(`Deleted ${delSessions.count} training session(s) for test instructor.`);
  }

  // 3. Delete test students
  const delStudents = await prisma.student.deleteMany({
    where: { applicationId: { in: TEST_APP_IDS } },
  });
  console.log(`Deleted ${delStudents.count} test student(s).`);

  // 4. Delete the test instructor account — NOT the super admin
  if (instructor) {
    await prisma.user.delete({ where: { email: INSTRUCTOR_EMAIL } });
    console.log(`Deleted test instructor account (${INSTRUCTOR_EMAIL}).`);
  } else {
    console.log(`Test instructor (${INSTRUCTOR_EMAIL}) not found — skipping.`);
  }

  const superAdmin = await prisma.user.findUnique({ where: { email: SUPER_ADMIN_EMAIL } });
  console.log(`\nSuper admin (${SUPER_ADMIN_EMAIL}) status: ${superAdmin ? "EXISTS ✓" : "NOT FOUND ✗"}`);
  console.log("Cleanup complete.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
