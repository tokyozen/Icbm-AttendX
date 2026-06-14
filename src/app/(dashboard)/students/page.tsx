"use server";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import StudentsClient from "@/components/students/StudentsClient";

export default async function StudentsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const role = (session.user as any).role as string;
  if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
    redirect("/dashboard");
  }

  const [students, totalCount, activeCount, inactiveCount] = await Promise.all([
    prisma.student.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.student.count(),
    prisma.student.count({ where: { isActive: true } }),
    prisma.student.count({ where: { isActive: false } }),
  ]);

  // Serialize: next can't pass Date objects across the server/client boundary
  const serialized = students.map((s) => ({
    id: s.id,
    applicationId: s.applicationId,
    fullName: s.fullName,
    gender: s.gender as string,
    trainingLocation: s.trainingLocation,
    learningTrack: s.learningTrack,
    isActive: s.isActive,
  }));

  return (
    <StudentsClient
      initialStudents={serialized}
      stats={{ total: totalCount, active: activeCount, inactive: inactiveCount }}
    />
  );
}
