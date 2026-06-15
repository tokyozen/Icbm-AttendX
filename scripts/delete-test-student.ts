import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Delete any attendance records first (foreign key constraint)
  const attendance = await prisma.attendanceRecord.deleteMany({
    where: { student: { applicationId: { contains: "TEST" } } },
  });
  console.log(`Deleted ${attendance.count} attendance record(s)`);

  // Hard delete the test student
  const result = await prisma.student.deleteMany({
    where: {
      OR: [
        { applicationId: { contains: "TEST" } },
        { fullName: { contains: "Test Student" } },
        { trainingLocation: "Lagos" }, // only seed/test data used Lagos
      ],
    },
  });
  console.log(`Deleted ${result.count} test student(s)`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
