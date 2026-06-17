import { PrismaClient, VerificationStatus, Gender } from "../src/generated/prisma/client"
import * as fs from "fs"
import * as path from "path"
import * as crypto from "crypto"

const prisma = new PrismaClient()

// ============================================================
// HISTORICAL ATTENDANCE IMPORT SCRIPT
// Imports: June 1-11, June 15, June 16 2026
// ============================================================

const WORKING_DAYS_JUNE1_11 = [
  '2026-06-01', '2026-06-02', '2026-06-03', '2026-06-04', '2026-06-05',
  '2026-06-08', '2026-06-09', '2026-06-10', '2026-06-11'
]

function distributeEvenly(daysPresent: number, allDays: string[]): string[] {
  if (daysPresent >= allDays.length) return [...allDays]
  if (daysPresent === 0) return []
  if (daysPresent === 1) return [allDays[Math.floor(allDays.length / 2)]]
  const indices = Array.from({ length: daysPresent }, (_, i) =>
    Math.round(i * (allDays.length - 1) / (daysPresent - 1))
  )
  return indices.map(i => allDays[i])
}

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

function normalizeGender(g: string): Gender {
  const upper = (g || '').toUpperCase().trim()
  if (upper === 'FEMALE' || upper === 'F') return 'FEMALE'
  if (upper === 'OTHER') return 'OTHER'
  return 'MALE'
}

function parseCheckInTime(date: string, timeStr: string): Date {
  try {
    const cleanTime = timeStr.trim().toLowerCase()
    const d = new Date(`${date}T00:00:00.000Z`)
    const [time, ampm] = cleanTime.split(' ')
    const [hours, minutes] = time.split(':').map(Number)
    let h = hours
    if (ampm === 'pm' && h !== 12) h += 12
    if (ampm === 'am' && h === 12) h = 0
    d.setUTCHours(h - 1, minutes || 0, 0, 0) // -1 for WAT (UTC+1)
    return d
  } catch {
    return new Date(`${date}T08:00:00.000Z`)
  }
}

async function findOrCreateSystemUser() {
  let systemUser = await prisma.user.findFirst({
    where: { email: 'system@icbm-attendx.com' }
  })
  if (!systemUser) {
    systemUser = await prisma.user.create({
      data: {
        name: 'System Import',
        email: 'system@icbm-attendx.com',
        passwordHash: 'system-import-no-login',
        role: 'ADMIN',
        isActive: true,
        isApproved: true,
      }
    })
    console.log('Created system import user')
  }
  return systemUser
}

async function importJune1to11(systemUserId: string) {
  console.log('\n=== IMPORTING JUNE 1-11 ===')

  const data = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../import_data_june1_11.json'), 'utf-8')
  )

  const matchedStudents: Array<{
    app_id: string
    name: string
    gender: string
    track: string
    location: string
    days_present: number
    attended_dates: string[]
  }> = data.matched_students

  let sessionCount = 0
  let recordCount = 0
  let skippedCount = 0

  // Group by track + date
  const sessionMap: Record<string, {
    track: string
    date: string
    records: Array<{ app_id: string; name: string; gender: string; location: string }>
  }> = {}

  for (const student of matchedStudents) {
    for (const date of student.attended_dates) {
      const key = `${student.track}_${date}`
      if (!sessionMap[key]) {
        sessionMap[key] = { track: student.track, date, records: [] }
      }
      sessionMap[key].records.push({
        app_id: student.app_id,
        name: student.name,
        gender: student.gender,
        location: student.location,
      })
    }
  }

  for (const [key, session] of Object.entries(sessionMap)) {
    const dateObj = new Date(`${session.date}T08:00:00.000Z`)
    const expiresAt = new Date(`${session.date}T17:00:00.000Z`)
    const endedAt = new Date(`${session.date}T17:00:00.000Z`)

    const month = dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })
    const sessionName = `${session.track} — ${month}`

    // Check if session already exists
    const existing = await prisma.trainingSession.findFirst({
      where: { sessionName, status: 'CLOSED' }
    })

    let trainingSession = existing
    if (!trainingSession) {
      trainingSession = await prisma.trainingSession.create({
        data: {
          sessionName,
          sessionCode: generateSessionCode(),
          location: session.records[0]?.location || 'Abuja',
          learningTrack: session.track,
          instructorId: systemUserId,
          qrToken: generateToken(),
          startedAt: dateObj,
          expiresAt,
          endedAt,
          status: 'CLOSED',
        }
      })
      sessionCount++
    }

    for (const record of session.records) {
      // Find student in DB
      const student = await prisma.student.findUnique({
        where: { applicationId: record.app_id }
      })

      if (!student) {
        skippedCount++
        continue
      }

      // Check for duplicate
      const existingRecord = await prisma.attendanceRecord.findUnique({
        where: { sessionId_studentId: { sessionId: trainingSession.id, studentId: student.id } }
      })

      if (!existingRecord) {
        // Stagger check-in times 8:00 AM - 9:30 AM
        const checkInTime = new Date(dateObj)
        checkInTime.setUTCMinutes(checkInTime.getUTCMinutes() + Math.floor(Math.random() * 90))

        await prisma.attendanceRecord.create({
          data: {
            sessionId: trainingSession.id,
            studentId: student.id,
            applicationId: record.app_id,
            fullName: student.fullName,
            gender: student.gender,
            trainingLocation: record.location,
            learningTrack: session.track,
            checkInTime,
            deviceType: 'Mobile',
            browser: 'Chrome',
            verificationStatus: 'VERIFIED',
            verifiedAt: endedAt,
            verifiedBy: systemUserId,
          }
        })
        recordCount++
      } else {
        skippedCount++
      }
    }
  }

  console.log(`✅ June 1-11: Created ${sessionCount} sessions, ${recordCount} records, ${skippedCount} skipped`)
  return recordCount
}

async function importJune15(systemUserId: string) {
  console.log('\n=== IMPORTING JUNE 15 ===')

  const data = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../import_data_june15.json'), 'utf-8')
  )

  let sessionCount = 0
  let recordCount = 0
  let skippedCount = 0

  for (const session of data.sessions) {
    // Find or get instructor
    let instructor = await prisma.user.findFirst({
      where: { name: { contains: session.instructor.split(' ')[0] } }
    })
    if (!instructor) instructor = await prisma.user.findFirst({ where: { role: 'SUPER_ADMIN' } })
    const instructorId = instructor?.id || systemUserId

    // Check if session exists by session code
    let trainingSession = await prisma.trainingSession.findFirst({
      where: { sessionCode: session.session_code }
    })

    if (!trainingSession) {
      const dateObj = new Date(`${session.date}T08:00:00.000Z`)
      trainingSession = await prisma.trainingSession.create({
        data: {
          sessionName: session.session_name,
          sessionCode: session.session_code,
          location: session.records[0]?.location || 'Abuja',
          learningTrack: session.records[0]?.track || 'Cybersecurity',
          instructorId,
          qrToken: generateToken(),
          startedAt: dateObj,
          expiresAt: new Date(`${session.date}T17:00:00.000Z`),
          endedAt: new Date(`${session.date}T17:00:00.000Z`),
          status: 'CLOSED',
        }
      })
      sessionCount++
    }

    for (const record of session.records) {
      const student = await prisma.student.findUnique({
        where: { applicationId: record.app_id }
      })

      if (!student) {
        console.log(`  ⚠️  Student not found: ${record.app_id} (${record.name})`)
        skippedCount++
        continue
      }

      const existingRecord = await prisma.attendanceRecord.findUnique({
        where: { sessionId_studentId: { sessionId: trainingSession.id, studentId: student.id } }
      })

      if (!existingRecord) {
        const checkInTime = parseCheckInTime(session.date, record.check_in_time)
        await prisma.attendanceRecord.create({
          data: {
            sessionId: trainingSession.id,
            studentId: student.id,
            applicationId: record.app_id,
            fullName: student.fullName,
            gender: student.gender,
            trainingLocation: record.location,
            learningTrack: record.track,
            checkInTime,
            deviceType: record.device || 'Mobile',
            browser: record.browser || 'Chrome',
            verificationStatus: 'VERIFIED',
            verifiedAt: new Date(`${session.date}T17:00:00.000Z`),
            verifiedBy: systemUserId,
          }
        })
        recordCount++
      } else {
        skippedCount++
      }
    }
  }

  console.log(`✅ June 15: Created ${sessionCount} sessions, ${recordCount} records, ${skippedCount} skipped`)
  return recordCount
}

async function importJune16(systemUserId: string) {
  console.log('\n=== IMPORTING JUNE 16 ===')

  const data = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../import_data_june16.json'), 'utf-8')
  )

  let sessionCount = 0
  let recordCount = 0
  let skippedCount = 0

  for (const session of data.sessions) {
    let instructor = await prisma.user.findFirst({
      where: { name: { contains: session.instructor.split(' ')[0] } }
    })
    if (!instructor) instructor = await prisma.user.findFirst({ where: { role: 'SUPER_ADMIN' } })
    const instructorId = instructor?.id || systemUserId

    let trainingSession = await prisma.trainingSession.findFirst({
      where: { sessionCode: session.session_code }
    })

    if (!trainingSession) {
      const dateObj = new Date(`${session.date}T08:00:00.000Z`)
      trainingSession = await prisma.trainingSession.create({
        data: {
          sessionName: session.session_name,
          sessionCode: session.session_code,
          location: session.records[0]?.location || 'Abuja',
          learningTrack: session.records[0]?.track || 'Business Process & Outsourcing (BPO)',
          instructorId,
          qrToken: generateToken(),
          startedAt: dateObj,
          expiresAt: new Date(`${session.date}T17:00:00.000Z`),
          endedAt: new Date(`${session.date}T17:00:00.000Z`),
          status: 'CLOSED',
        }
      })
      sessionCount++
    }

    for (const record of session.records) {
      const student = await prisma.student.findUnique({
        where: { applicationId: record.app_id }
      })

      if (!student) {
        console.log(`  ⚠️  Student not found: ${record.app_id} (${record.name})`)
        skippedCount++
        continue
      }

      const existingRecord = await prisma.attendanceRecord.findUnique({
        where: { sessionId_studentId: { sessionId: trainingSession.id, studentId: student.id } }
      })

      if (!existingRecord) {
        const checkInTime = parseCheckInTime(session.date, record.check_in_time)
        const vs = record.verification_status as VerificationStatus
        await prisma.attendanceRecord.create({
          data: {
            sessionId: trainingSession.id,
            studentId: student.id,
            applicationId: record.app_id,
            fullName: student.fullName,
            gender: student.gender,
            trainingLocation: record.location,
            learningTrack: record.track,
            checkInTime,
            deviceType: record.device || 'Mobile',
            browser: record.browser || 'Chrome',
            verificationStatus: vs || 'VERIFIED',
            verifiedAt: vs !== 'PENDING' ? new Date(`${session.date}T17:00:00.000Z`) : null,
            verifiedBy: vs !== 'PENDING' ? systemUserId : null,
          }
        })
        recordCount++
      } else {
        skippedCount++
      }
    }
  }

  console.log(`✅ June 16: Created ${sessionCount} sessions, ${recordCount} records, ${skippedCount} skipped`)
  return recordCount
}

async function main() {
  console.log('🚀 Starting historical attendance import...')
  console.log('================================================')

  const systemUser = await findOrCreateSystemUser()

  const r1 = await importJune1to11(systemUser.id)
  const r2 = await importJune15(systemUser.id)
  const r3 = await importJune16(systemUser.id)

  console.log('\n================================================')
  console.log(`🎉 IMPORT COMPLETE`)
  console.log(`   June 1-11:  ${r1} records`)
  console.log(`   June 15:    ${r2} records`)
  console.log(`   June 16:    ${r3} records`)
  console.log(`   TOTAL:      ${r1 + r2 + r3} records imported`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
