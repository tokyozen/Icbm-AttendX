import { PrismaClient } from '../src/generated/prisma/client'

const prisma = new PrismaClient()

const MISSING_15 = [
  { app_id: 'APP-2025-10297', name: 'NNAJI CHINASA MARIA' },
  { app_id: 'APP-2025-16665', name: 'Ani Humphery Nnamdi' },
  { app_id: 'APP-2025-24882', name: 'Madu Miracle Kosi' },
  { app_id: 'APP-2025-24991', name: 'UCHEME PETRUS CHIMOBI' },
  { app_id: 'APP-2025–38454', name: 'ODO PATIENCE AMUCHECHUKWU' },
  { app_id: 'APP-2025-39428', name: 'EGBO CHRISTIAN UGOCHUKWU' },
  { app_id: 'APP-2025-44962', name: 'ONWUEMELIE OBIANUJU GLORIA' },
  { app_id: 'APP-2025-72292', name: 'LEONARD DESTINY CHIKA' },
  { app_id: 'APP-2025-79785', name: 'ODUMEGBO CHIAMAKA JULIET' },
  { app_id: 'APP-2025-82521', name: 'BLESSING SHARON OBI' },
  { app_id: 'APP-2025-96362', name: 'NWEKE JENNIFER CHIKAODILI' },
  { app_id: 'APP-2025-97369', name: 'Clintin Udeigwe Ebubechukwu' },
  { app_id: 'APP-2026-33648', name: 'Okuli Chinenye Leticia' },
  { app_id: 'APP-2026-59865', name: 'Odo Chiedozie' },
  { app_id: 'APP-2026-73311', name: 'Uwakwe Chukwuebuka' },
]

async function main() {
  console.log('Checking attendance records for 15 missing students...\n')

  for (const s of MISSING_15) {
    const student = await prisma.student.findUnique({
      where: { applicationId: s.app_id }
    })

    if (!student) {
      console.log(`NOT IN DB: ${s.app_id} | ${s.name}`)
      continue
    }

    const records = await prisma.attendanceRecord.findMany({
      where: { studentId: student.id },
      include: { session: { select: { sessionName: true, startedAt: true } } },
      orderBy: { checkInTime: 'asc' }
    })

    console.log(`${s.app_id} | ${s.name} | ${records.length} records`)
    for (const r of records) {
      const date = r.checkInTime.toISOString().split('T')[0]
      console.log(`  ${date} | ${r.session.sessionName} | ${r.deviceType} | absent:${r.isAbsent}`)
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect())
