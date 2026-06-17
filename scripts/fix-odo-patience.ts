import { PrismaClient } from '../src/generated/prisma/client'

const prisma = new PrismaClient()

async function main() {
  const student = await prisma.student.findFirst({
    where: { fullName: { contains: 'Odo Patience', mode: 'insensitive' } }
  })
  
  if (!student) { console.log('NOT FOUND'); return }
  console.log('Found:', student.fullName, '|', student.applicationId)

  const systemUser = await prisma.user.findFirst({ 
    where: { email: 'system@icbm-attendx.com' } 
  })
  if (!systemUser) { console.log('No system user'); return }

  // Find all BPO Enugu sessions from June 1-11
  const sessions = await prisma.trainingSession.findMany({
    where: {
      learningTrack: 'Business Process & Outsourcing (BPO)',
      status: 'CLOSED',
      startedAt: {
        gte: new Date('2026-06-01T00:00:00.000Z'),
        lte: new Date('2026-06-11T23:59:59.000Z'),
      }
    },
    orderBy: { startedAt: 'asc' }
  })

  console.log('Sessions found:', sessions.length)
  sessions.forEach(s => console.log(' -', s.sessionName, '|', s.startedAt.toISOString().split('T')[0]))

  let imported = 0

  for (const session of sessions) {
    const existing = await prisma.attendanceRecord.findUnique({
      where: { sessionId_studentId: { sessionId: session.id, studentId: student.id } }
    })
    if (existing) { console.log('Already exists:', session.sessionName); continue }

    const checkInTime = new Date(session.startedAt)
    checkInTime.setUTCMinutes(Math.floor(Math.random() * 90))

    await prisma.attendanceRecord.create({
      data: {
        sessionId: session.id,
        studentId: student.id,
        applicationId: student.applicationId,
        fullName: student.fullName,
        gender: student.gender,
        trainingLocation: 'Enugu',
        learningTrack: 'Business Process & Outsourcing (BPO)',
        checkInTime,
        deviceType: 'Instructor Sheet Import',
        browser: 'N/A',
        verificationStatus: 'VERIFIED',
        verifiedAt: new Date(session.startedAt.toISOString().split('T')[0] + 'T17:00:00.000Z'),
        verifiedBy: systemUser.id,
        isManualOverride: true,
        overrideReason: 'Imported from Enugu instructor attendance sheet',
        overriddenBy: systemUser.id,
        overriddenAt: new Date(),
        isAbsent: false,
      }
    })
    imported++
    console.log('Imported:', session.sessionName)
  }
  
  console.log('Done. Records imported:', imported)
}

main().catch(console.error).finally(() => prisma.$disconnect())
