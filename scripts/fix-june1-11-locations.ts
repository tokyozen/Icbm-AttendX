import { PrismaClient } from '../src/generated/prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Update all June 1-11 sessions to Both Campuses
  const result = await prisma.trainingSession.updateMany({
    where: {
      startedAt: {
        gte: new Date('2026-06-01T00:00:00.000Z'),
        lte: new Date('2026-06-11T23:59:59.000Z'),
      },
      status: 'CLOSED',
    },
    data: {
      location: 'Both Campuses',
    }
  })

  console.log(`Updated ${result.count} sessions to Both Campuses`)

  // Verify
  const sessions = await prisma.trainingSession.findMany({
    where: {
      startedAt: {
        gte: new Date('2026-06-01T00:00:00.000Z'),
        lte: new Date('2026-06-11T23:59:59.000Z'),
      },
      status: 'CLOSED',
    },
    orderBy: { startedAt: 'asc' },
    select: { sessionName: true, location: true, startedAt: true }
  })

  console.log(`\nVerification — ${sessions.length} sessions:`)
  sessions.forEach(s => {
    console.log(`  ${s.startedAt.toISOString().split('T')[0]} | ${s.sessionName} | ${s.location}`)
  })
}

main().catch(console.error).finally(() => prisma.$disconnect())
