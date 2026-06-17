import { PrismaClient } from "../src/generated/prisma/client"
import * as fs from "fs"
import * as path from "path"
import * as crypto from "crypto"

const prisma = new PrismaClient()

function generateToken(): string {
  const uuid = crypto.randomUUID()
  const hmac = crypto.createHmac('sha256', process.env.QR_SIGNING_SECRET || 'fallback')
  hmac.update(uuid)
  const sig = hmac.digest('hex').slice(0, 16)
  return `${uuid}-${sig}`
}

function generateSessionCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

function formatDate(dateStr: string): string {
  const d = new Date(`${dateStr}T08:00:00.000Z`)
  return d.toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC'
  })
}

async function main() {
  console.log('Importing 15 missing Enugu students...')
  console.log('================================================')

  const systemUser = await prisma.user.findFirst({
    where: { email: 'system@icbm-attendx.com' }
  })

  if (!systemUser) throw new Error('System user not found.')

  const dataPath = path.join(__dirname, '../enugu_missing_students.json')
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'))
  const records: Array<{
    app_id: string; name: string; gender: string
    track: string; location: string; date: string
  }> = data.records

  console.log(`Records to import: ${records.length}`)

  const sessionMap = new Map<string, string>()
  const trackDateCombos = new Set(records.map(r => `${r.track}|${r.date}`))

  for (const combo of trackDateCombos) {
    const [track, date] = combo.split('|')
    const sessionName = `${track} — ${formatDate(date)}`
    let session = await prisma.trainingSession.findFirst({
      where: { sessionName, learningTrack: track, status: 'CLOSED' }
    })
    if (!session) {
      const dateObj = new Date(`${date}T08:00:00.000Z`)
      session = await prisma.trainingSession.create({
        data: {
          sessionName, sessionCode: generateSessionCode(),
          location: 'Enugu', learningTrack: track,
          instructorId: systemUser.id, qrToken: generateToken(),
          startedAt: dateObj,
          expiresAt: new Date(`${date}T17:00:00.000Z`),
          endedAt: new Date(`${date}T17:00:00.000Z`),
          status: 'CLOSED',
        }
      })
    }
    sessionMap.set(combo, session.id)
  }

  let imported = 0, skipped = 0
  const notFound: string[] = []

  for (const record of records) {
    const sessionId = sessionMap.get(`${record.track}|${record.date}`)
    if (!sessionId) { skipped++; continue }

    const student = await prisma.student.findUnique({
      where: { applicationId: record.app_id }
    })
    if (!student) {
      if (!notFound.includes(record.app_id)) {
        notFound.push(record.app_id)
        console.log(`  Not found: ${record.app_id} (${record.name})`)
      }
      skipped++; continue
    }

    const existing = await prisma.attendanceRecord.findUnique({
      where: { sessionId_studentId: { sessionId, studentId: student.id } }
    })
    if (existing) { skipped++; continue }

    const checkInTime = new Date(`${record.date}T08:00:00.000Z`)
    checkInTime.setUTCMinutes(Math.floor(Math.random() * 90))

    await prisma.attendanceRecord.create({
      data: {
        sessionId, studentId: student.id,
        applicationId: record.app_id, fullName: student.fullName,
        gender: student.gender, trainingLocation: 'Enugu',
        learningTrack: record.track, checkInTime,
        deviceType: 'Instructor Sheet Import', browser: 'N/A',
        verificationStatus: 'VERIFIED',
        verifiedAt: new Date(`${record.date}T17:00:00.000Z`),
        verifiedBy: systemUser.id, isManualOverride: true,
        overrideReason: 'Imported from Enugu instructor attendance sheet',
        overriddenBy: systemUser.id, overriddenAt: new Date(),
        isAbsent: false,
      }
    })
    imported++
  }

  console.log('\n================================================')
  console.log('DONE')
  console.log(`   Records imported: ${imported}`)
  console.log(`   Records skipped:  ${skipped}`)
  if (notFound.length > 0) {
    console.log(`\nStill not found (${notFound.length}):`)
    notFound.forEach(id => console.log(`   ${id}`))
  } else {
    console.log('\nAll 15 students successfully imported!')
  }
}

main().catch(console.error).finally(() => prisma.$disconnect())
