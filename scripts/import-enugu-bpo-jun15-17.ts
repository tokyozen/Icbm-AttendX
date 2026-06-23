import "dotenv/config"
import { prisma } from "@/lib/prisma"
import * as crypto from "crypto"

function generateToken(): string {
  const uuid = crypto.randomUUID()
  const hmac = crypto.createHmac('sha256', process.env.QR_SIGNING_SECRET || 'fallback')
  hmac.update(uuid)
  return `${uuid}-${hmac.digest('hex').slice(0, 16)}`
}
function generateCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

// 9 Enugu BPO students present on Jun 15, 16, 17
const STUDENTS = [
  'APP-2025-39428',   // EGBO CHRISTIAN UGOCHUKWU
  'APP-2025-72292',   // Leonard destiny chika
  'APP-2025-96362',   // Nweke Jennifer chikaodili
  'APP-2025-22488',   // Nzewi Chidumebi Bianca
  'APP-2025-65488',   // OKOYE MARY CHIKA
  'APP-2025-39030',   // Obiesie Eric Chinonso
  'APP-2025–38454',   // Odo Patience Amuchechukwu (en-dash)
  'APP-2025-63195',   // Onah Edith Ebubechi
  'APP-2025-57886',   // Ugwuja Tochukwu Joseph Prague
]

const DATES = ['2026-06-15', '2026-06-16', '2026-06-17']
const TRACK = 'Business Process & Outsourcing (BPO)'

async function main() {
  console.log('Importing Enugu BPO attendance Jun 15-17...')

  const systemUser = await prisma.user.findFirst({
    where: { email: 'system@icbm-attendx.com' }
  })
  if (!systemUser) throw new Error('System user not found')

  // Get or create Enugu BPO sessions for Jun 15, 16, 17
  const sessionMap = new Map<string, string>()

  for (const date of DATES) {
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
    const d = new Date(`${date}T08:00:00.000Z`)
    const sessionName = `Enugu BPO — ${String(d.getUTCDate()).padStart(2,'0')} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`

    // Check if Enugu BPO session already exists for this date
    const existing = await prisma.trainingSession.findFirst({
      where: {
        learningTrack: TRACK,
        location: 'Enugu',
        startedAt: {
          gte: new Date(`${date}T00:00:00.000Z`),
          lte: new Date(`${date}T23:59:59.000Z`),
        },
        status: { in: ['CLOSED', 'EXPIRED'] }
      }
    })

    if (existing) {
      sessionMap.set(date, existing.id)
      console.log(`  Found: ${date} -> ${existing.sessionName}`)
    } else {
      // Also check Both Campuses BPO session for this date
      const bothCampuses = await prisma.trainingSession.findFirst({
        where: {
          learningTrack: TRACK,
          location: 'Both Campuses',
          startedAt: {
            gte: new Date(`${date}T00:00:00.000Z`),
            lte: new Date(`${date}T23:59:59.000Z`),
          },
          status: { in: ['CLOSED', 'EXPIRED'] }
        }
      })

      if (bothCampuses) {
        sessionMap.set(date, bothCampuses.id)
        console.log(`  Found Both Campuses: ${date} -> ${bothCampuses.sessionName}`)
      } else {
        // Create new Enugu BPO session
        const newSession = await prisma.trainingSession.create({
          data: {
            sessionName,
            sessionCode: generateCode(),
            location: 'Enugu',
            learningTrack: TRACK,
            instructorId: systemUser.id,
            qrToken: generateToken(),
            startedAt: d,
            expiresAt: new Date(`${date}T17:00:00.000Z`),
            endedAt: new Date(`${date}T17:00:00.000Z`),
            status: 'CLOSED',
          }
        })
        sessionMap.set(date, newSession.id)
        console.log(`  Created: ${date} -> ${sessionName}`)
      }
    }
  }

  let imported = 0
  let skipped = 0
  const notFound: string[] = []

  for (const appId of STUDENTS) {
    const student = await prisma.student.findUnique({
      where: { applicationId: appId }
    })
    if (!student) {
      notFound.push(appId)
      continue
    }

    for (const date of DATES) {
      const sessionId = sessionMap.get(date)
      if (!sessionId) continue

      const existing = await prisma.attendanceRecord.findUnique({
        where: { sessionId_studentId: { sessionId, studentId: student.id } }
      })

      if (existing && !existing.isAbsent) {
        skipped++
        continue
      }

      const checkInTime = new Date(`${date}T08:00:00.000Z`)
      checkInTime.setUTCMinutes(Math.floor(Math.random() * 90))

      await prisma.attendanceRecord.upsert({
        where: { sessionId_studentId: { sessionId, studentId: student.id } },
        create: {
          sessionId,
          studentId: student.id,
          applicationId: student.applicationId,
          fullName: student.fullName,
          gender: student.gender,
          trainingLocation: 'Enugu',
          learningTrack: TRACK,
          checkInTime,
          deviceType: 'Manual Import',
          browser: 'N/A',
          verificationStatus: 'VERIFIED',
          verifiedAt: new Date(`${date}T17:00:00.000Z`),
          verifiedBy: systemUser.id,
          isManualOverride: true,
          overrideReason: 'Missing Enugu BPO attendance Jun 15-17 added from Google Sheet',
          overriddenBy: systemUser.id,
          overriddenAt: new Date(),
          isAbsent: false,
        },
        update: {
          isAbsent: false,
          isManualOverride: true,
          overrideReason: 'Missing Enugu BPO attendance Jun 15-17 added from Google Sheet',
          overriddenBy: systemUser.id,
          overriddenAt: new Date(),
          verificationStatus: 'VERIFIED',
          verifiedAt: new Date(`${date}T17:00:00.000Z`),
          verifiedBy: systemUser.id,
        }
      })
      console.log(`  ✅ ${student.fullName} | ${date}`)
      imported++
    }
  }

  console.log(`\n✅ Done. Imported: ${imported}, Skipped: ${skipped}`)
  if (notFound.length > 0) {
    console.log(`❌ Not found: ${notFound.join(', ')}`)
  }
}

main().catch(console.error).finally(() => prisma.$disconnect())
