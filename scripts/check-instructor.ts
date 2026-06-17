import { PrismaClient } from '../src/generated/prisma/client'

const prisma = new PrismaClient()

async function main() {
  const instructor = await prisma.user.findFirst({
    where: { name: { contains: 'Nwabueze', mode: 'insensitive' } }
  })
  
  if (!instructor) {
    console.log('Instructor not found in database')
    return
  }
  
  console.log('Found instructor:', instructor.name, '| ID:', instructor.id)
  
  const sessions = await prisma.trainingSession.findMany({
    where: { instructorId: instructor.id },
    include: { _count: { select: { attendanceRecords: true } } },
    orderBy: { startedAt: 'asc' }
  })
  
  console.log('Total sessions:', sessions.length)
  
  for (const s of sessions) {
    console.log(s.startedAt?.toDateString(), '|', s.sessionName, '|', s.sessionCode, '| Records:', s._count.attendanceRecords)
  }
}

main().finally(() => prisma.$disconnect())
