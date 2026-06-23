import "dotenv/config"
import { prisma } from "@/lib/prisma"

async function main() {
  const dates = ['2026-06-15','2026-06-16','2026-06-17','2026-06-19']
  const tracks = [
    'Software Development',
    'Business Process & Outsourcing (BPO)',
    'Project Management',
  ]

  for (const track of tracks) {
    console.log(`\n=== ${track} ===`)
    for (const date of dates) {
      const sessions = await prisma.trainingSession.findMany({
        where: {
          learningTrack: track,
          startedAt: {
            gte: new Date(`${date}T00:00:00.000Z`),
            lte: new Date(`${date}T23:59:59.000Z`),
          },
          status: { in: ['CLOSED', 'EXPIRED', 'ACTIVE'] }
        },
        select: { id: true, sessionName: true, location: true, _count: { select: { attendanceRecords: true } } }
      })
      if (sessions.length === 0) {
        console.log(`  ${date}: NO SESSION`)
      } else {
        for (const s of sessions) {
          console.log(`  ${date}: [${s.location}] ${s.sessionName} — ${s._count.attendanceRecords} records`)
        }
      }
    }
  }

  // Also check if these specific students have records for these dates
  console.log('\n\n=== STUDENT RECORD CHECK ===')
  
  const checks = [
    // Abuja Software Dev - Jun 15
    { app_id: 'APP-2025-45655', name: 'Binta Lawrence', date: '2026-06-15', track: 'Software Development' },
    // Enugu BPO - Jun 15
    { app_id: 'APP-2025-39428', name: 'EGBO CHRISTIAN UGOCHUKWU', date: '2026-06-15', track: 'Business Process & Outsourcing (BPO)' },
    { app_id: 'APP-2025-39428', name: 'EGBO CHRISTIAN UGOCHUKWU', date: '2026-06-16', track: 'Business Process & Outsourcing (BPO)' },
    { app_id: 'APP-2025-39428', name: 'EGBO CHRISTIAN UGOCHUKWU', date: '2026-06-17', track: 'Business Process & Outsourcing (BPO)' },
    // Enugu PM - Jun 15
    { app_id: 'APP-2025-29118', name: 'AFONNE CHINWENDU NANCY', date: '2026-06-15', track: 'Project Management' },
    { app_id: 'APP-2025-29118', name: 'AFONNE CHINWENDU NANCY', date: '2026-06-16', track: 'Project Management' },
    { app_id: 'APP-2025-29118', name: 'AFONNE CHINWENDU NANCY', date: '2026-06-19', track: 'Project Management' },
  ]

  for (const check of checks) {
    const student = await prisma.student.findUnique({ where: { applicationId: check.app_id } })
    if (!student) { console.log(`NOT FOUND: ${check.app_id}`); continue }

    const sessions = await prisma.trainingSession.findMany({
      where: {
        learningTrack: check.track,
        startedAt: { gte: new Date(`${check.date}T00:00:00.000Z`), lte: new Date(`${check.date}T23:59:59.000Z`) },
        status: { in: ['CLOSED', 'EXPIRED', 'ACTIVE'] }
      },
      select: { id: true, sessionName: true, location: true }
    })

    let found = false
    for (const s of sessions) {
      const rec = await prisma.attendanceRecord.findUnique({
        where: { sessionId_studentId: { sessionId: s.id, studentId: student.id } }
      })
      if (rec && !rec.isAbsent) found = true
    }

    console.log(`  ${check.date} | ${check.name} | ${check.track} | ${found ? '✅ Present' : '❌ MISSING'} | Sessions: ${sessions.map(s => s.location).join(', ')}`)
  }
}

main().catch(console.error).finally(() => prisma.$disconnect())
