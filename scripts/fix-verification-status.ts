import "dotenv/config"
import { PrismaClient } from "../src/generated/prisma/client"

const prisma = new PrismaClient()

async function main() {
  const result = await prisma.$executeRaw`
    UPDATE attendance_records
    SET verification_status = 'PENDING'
    WHERE verification_status IS NULL
  `

  console.log(`Updated ${result} attendance records to PENDING status`)

  const total = await prisma.attendanceRecord.count()
  const pending = await prisma.attendanceRecord.count({
    where: { verificationStatus: 'PENDING' }
  })
  const verified = await prisma.attendanceRecord.count({
    where: { verificationStatus: 'VERIFIED' }
  })
  const flagged = await prisma.attendanceRecord.count({
    where: { verificationStatus: 'FLAGGED' }
  })

  console.log(`Total records: ${total}`)
  console.log(`PENDING: ${pending}`)
  console.log(`VERIFIED: ${verified}`)
  console.log(`FLAGGED: ${flagged}`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
