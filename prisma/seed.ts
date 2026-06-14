import "dotenv/config";
import { PrismaClient, Role, Gender } from "../src/generated/prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  const superAdminPassword = await bcrypt.hash("Admin@2026!", 12);
  await prisma.user.upsert({
    where: { email: "admin@icbm-attendx.com" },
    update: {},
    create: {
      name: "Super Admin",
      email: "admin@icbm-attendx.com",
      passwordHash: superAdminPassword,
      role: Role.SUPER_ADMIN,
    },
  });

  const instructorPassword = await bcrypt.hash("Instructor@2026!", 12);
  await prisma.user.upsert({
    where: { email: "instructor@icbm-attendx.com" },
    update: {},
    create: {
      name: "Test Instructor",
      email: "instructor@icbm-attendx.com",
      passwordHash: instructorPassword,
      role: Role.INSTRUCTOR,
      location: "Abuja",
    },
  });

  const students = [
    {
      applicationId: "ICBM-2026-0001",
      fullName: "Amina Bello",
      gender: Gender.FEMALE,
      trainingLocation: "Abuja",
      learningTrack: "Cybersecurity",
    },
    {
      applicationId: "ICBM-2026-0002",
      fullName: "Chukwuemeka Obi",
      gender: Gender.MALE,
      trainingLocation: "Enugu",
      learningTrack: "BPO",
    },
    {
      applicationId: "ICBM-2026-0003",
      fullName: "Fatima Yusuf",
      gender: Gender.FEMALE,
      trainingLocation: "Abuja",
      learningTrack: "AI & Data Science",
    },
    {
      applicationId: "ICBM-2026-0004",
      fullName: "Tunde Adeyemi",
      gender: Gender.MALE,
      trainingLocation: "Lagos",
      learningTrack: "Software Development",
    },
    {
      applicationId: "ICBM-2026-0005",
      fullName: "Ngozi Eze",
      gender: Gender.FEMALE,
      trainingLocation: "Enugu",
      learningTrack: "Digital Marketing",
    },
  ];

  for (const student of students) {
    await prisma.student.upsert({
      where: { applicationId: student.applicationId },
      update: {},
      create: student,
    });
  }

  console.log("✅ Seed complete.");
  console.log("─────────────────────────────────────────");
  console.log("Super Admin:  admin@icbm-attendx.com / Admin@2026!");
  console.log("Instructor:   instructor@icbm-attendx.com / Instructor@2026!");
  console.log("─────────────────────────────────────────");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
