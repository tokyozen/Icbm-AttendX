import "dotenv/config";
import { prisma } from "@/lib/prisma";

async function main() {
  // Confirm current state
  const student = await prisma.student.findUnique({
    where: { applicationId: 'APP-2025-72305' },
    select: { id: true, fullName: true, learningTrack: true, trainingLocation: true }
  })

  if (!student) {
    console.log('❌ Student APP-2025-72305 not found')
    return
  }

  console.log('Current state:')
  console.log(`  Name: ${student.fullName}`)
  console.log(`  Track: ${student.learningTrack}`)
  console.log(`  Location: ${student.trainingLocation}`)

  // Update to correct track and name
  await prisma.student.update({
    where: { applicationId: 'APP-2025-72305' },
    data: {
      fullName: 'ALUMONA CHRISTIAN KENECHI',
      learningTrack: 'Cybersecurity',
    }
  })

  // Remove any AI/ML attendance records for this student
  // (they were incorrectly imported under the wrong track)
  const aimlSessions = await prisma.trainingSession.findMany({
    where: { learningTrack: 'Ai & Machine Learning' },
    select: { id: true }
  })
  const sessionIds = aimlSessions.map(s => s.id)

  const deleted = await prisma.attendanceRecord.deleteMany({
    where: {
      studentId: student.id,
      sessionId: { in: sessionIds }
    }
  })

  console.log(`\n✅ Updated track to Cybersecurity`)
  console.log(`✅ Removed ${deleted.count} incorrect AI/ML attendance records`)

  // Confirm Cybersecurity records remain
  const cyberSessions = await prisma.trainingSession.findMany({
    where: { learningTrack: 'Cybersecurity' },
    select: { id: true }
  })
  const cyberSessionIds = cyberSessions.map(s => s.id)

  const cyberRecords = await prisma.attendanceRecord.count({
    where: { studentId: student.id, sessionId: { in: cyberSessionIds } }
  })

  console.log(`✅ Cybersecurity attendance records intact: ${cyberRecords}`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
