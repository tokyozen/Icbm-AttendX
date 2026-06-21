import "dotenv/config"
import { prisma } from "@/lib/prisma"

const TRACK = 'Cybersecurity'

const STUDENTS = [
  {
    app_id: 'APP-2025-78827',
    name: 'Jibrin Moses',
    dates: ['2026-06-02','2026-06-03','2026-06-04','2026-06-05']
  },
  {
    app_id: 'APP-2025-74955',
    name: 'Okwudili Collins Chiweluotito',
    dates: ['2026-06-02','2026-06-04','2026-06-05']
  },
]

async function main() {
  const systemUser = await prisma.user.findFirst({
    where: { email: 'system@icbm-attendx.com' }
  })
  if (!systemUser) throw new Error('System user not found')

  let imported = 0
  const notFound: string[] = []

  for (const record of STUDENTS) {
    const student = await prisma.student.findUnique({
      where: { applicationId: record.app_id }
    })

    if (!student) {
      notFound.push(`${record.app_id} | ${record.name}`)
      continue
    }

    console.log(`Found: ${student.applicationId} | ${student.fullName}`)

    for (const date of record.dates) {
      // Find session
      const session = await prisma.trainingSession.findFirst({
        where: {
          learningTrack: TRACK,
          status: { in: ['CLOSED', 'EXPIRED'] },
          startedAt: {
            gte: new Date(`${date}T00:00:00.000Z`),
            lte: new Date(`${date}T23:59:59.000Z`),
          }
        }
      })

      if (!session) { console.log(`  No session for ${date}`); continue }

      const existing = await prisma.attendanceRecord.findUnique({
        where: { sessionId_studentId: { sessionId: session.id, studentId: student.id } }
      })

      if (existing && !existing.isAbsent) {
        console.log(`  ${date}: already present`)
        continue
      }

      const checkInTime = new Date(`${date}T08:00:00.000Z`)
      checkInTime.setUTCMinutes(Math.floor(Math.random() * 90))

      await prisma.attendanceRecord.upsert({
        where: { sessionId_studentId: { sessionId: session.id, studentId: student.id } },
        create: {
          sessionId: session.id,
          studentId: student.id,
          applicationId: student.applicationId,
          fullName: student.fullName,
          gender: student.gender,
          trainingLocation: student.trainingLocation,
          learningTrack: TRACK,
          checkInTime,
          deviceType: 'Manual Sheet Import',
          browser: 'N/A',
          verificationStatus: 'VERIFIED',
          verifiedAt: new Date(`${date}T17:00:00.000Z`),
          verifiedBy: systemUser.id,
          isManualOverride: true,
          overrideReason: 'Imported from Cybersecurity manual attendance sheet Jun 1-11',
          overriddenBy: systemUser.id,
          overriddenAt: new Date(),
          isAbsent: false,
        },
        update: {
          isAbsent: false,
          isManualOverride: true,
          overrideReason: 'Imported from Cybersecurity manual attendance sheet Jun 1-11',
          overriddenBy: systemUser.id,
          overriddenAt: new Date(),
          verificationStatus: 'VERIFIED',
          verifiedAt: new Date(`${date}T17:00:00.000Z`),
          verifiedBy: systemUser.id,
        }
      })

      console.log(`  ✅ ${date}: imported`)
      imported++
    }
  }

  console.log(`\n✅ Done. ${imported} records imported.`)

  if (notFound.length > 0) {
    console.log(`\n❌ Still not found:`)
    notFound.forEach(s => console.log(`   ${s}`))
  }
}

main().catch(console.error).finally(() => prisma.$disconnect())
