/**
 * ICBM-AttendX Master Attendance Sync
 * =====================================
 * Syncs the final corrected master attendance Excel into the database.
 * 
 * What this script does:
 * 1. Reads final_attendance_data.json (generated from the Excel)
 * 2. Updates student records (name, gender, track, location)
 * 3. For each student x date:
 *    - Present → upsert attendance record
 *    - ABS     → mark as absent (isAbsent=true) or remove record
 *    - —/blank → leave untouched (no session that day)
 * 4. Recalculates nothing — trusts the Excel as the source of truth
 * 
 * Usage:
 *   npx tsx scripts/sync-master-attendance.ts
 */

import { PrismaClient } from '../src/generated/prisma/client'
import * as fs from 'fs'
import * as path from 'path'
import * as crypto from 'crypto'

const prisma = new PrismaClient()

// Date column index -> actual date string
const COL_TO_DATE: Record<number, string> = {
  7:  '2026-06-01',
  8:  '2026-06-02',
  9:  '2026-06-03',
  10: '2026-06-04',
  11: '2026-06-05',
  12: '2026-06-08',
  13: '2026-06-09',
  14: '2026-06-10',
  15: '2026-06-11',
  16: '2026-06-15',
  17: '2026-06-16',
  18: '2026-06-17',
  19: '2026-06-18',
  20: '2026-06-19',
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

function normalizeGender(g: string): 'MALE' | 'FEMALE' | 'OTHER' {
  const gl = g.trim().toUpperCase()
  if (gl === 'M' || gl === 'MALE') return 'MALE'
  if (gl === 'F' || gl === 'FEMALE') return 'FEMALE'
  return 'OTHER'
}

async function main() {
  console.log('🚀 Starting Master Attendance Sync...')
  console.log('======================================')

  const systemUser = await prisma.user.findFirst({
    where: { email: 'system@icbm-attendx.com' }
  })
  if (!systemUser) throw new Error('System user not found. Run initial import first.')

  const dataPath = path.join(__dirname, '../final_attendance_data.json')
  const students: Array<{
    campus: string
    app_id: string
    name: string
    gender: string
    track: string
    location: string
    days_present: number
    days_abs: number
    row_data: Record<string, string>
  }> = JSON.parse(fs.readFileSync(dataPath, 'utf-8'))

  console.log(`Students to process: ${students.length}`)

  // Build session map: date+track -> session ID
  // Sessions already exist from previous imports
  const sessionCache = new Map<string, string>()

  async function getOrCreateSession(date: string, track: string, location: string): Promise<string> {
    const key = `${date}|${track}`
    if (sessionCache.has(key)) return sessionCache.get(key)!

    // Try to find existing session
    const dateObj = new Date(`${date}T08:00:00.000Z`)
    const existing = await prisma.trainingSession.findFirst({
      where: {
        learningTrack: track,
        startedAt: {
          gte: new Date(`${date}T00:00:00.000Z`),
          lte: new Date(`${date}T23:59:59.000Z`),
        },
        status: { in: ['CLOSED', 'EXPIRED'] }
      }
    })

    if (existing) {
      sessionCache.set(key, existing.id)
      return existing.id
    }

    // Create new session
    const sessionName = `${track} — ${dateObj.toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC'
    })}`

    const newSession = await prisma.trainingSession.create({
      data: {
        sessionName,
        sessionCode: generateSessionCode(),
        location: 'Both Campuses',
        learningTrack: track,
        instructorId: systemUser.id,
        qrToken: generateToken(),
        startedAt: dateObj,
        expiresAt: new Date(`${date}T17:00:00.000Z`),
        endedAt: new Date(`${date}T17:00:00.000Z`),
        status: 'CLOSED',
      }
    })

    sessionCache.set(key, newSession.id)
    return newSession.id
  }

  let studentsUpdated = 0
  let recordsPresent = 0
  let recordsAbsent = 0
  let recordsSkipped = 0
  const errors: string[] = []

  for (const studentData of students) {
    try {
      // 1. Find or update student
      let student = await prisma.student.findUnique({
        where: { applicationId: studentData.app_id }
      })

      if (!student) {
        // Create student if not exists
        student = await prisma.student.create({
          data: {
            applicationId: studentData.app_id,
            fullName: studentData.name,
            gender: normalizeGender(studentData.gender),
            trainingLocation: studentData.location,
            learningTrack: studentData.track,
            isActive: true,
          }
        })
        console.log(`  ➕ Created student: ${studentData.app_id} | ${studentData.name}`)
      } else {
        // Update student details to match Excel
        await prisma.student.update({
          where: { id: student.id },
          data: {
            fullName: studentData.name,
            gender: normalizeGender(studentData.gender),
            trainingLocation: studentData.location,
            learningTrack: studentData.track,
            isActive: true,
          }
        })
      }
      studentsUpdated++

      // 2. Process each date column
      for (const [colStr, attendanceVal] of Object.entries(studentData.row_data)) {
        const date = COL_TO_DATE[parseInt(colStr)]
        if (!date) continue

        if (attendanceVal === 'Present') {
          // Ensure attendance record exists
          const sessionId = await getOrCreateSession(date, studentData.track, studentData.location)
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
              trainingLocation: studentData.location,
              learningTrack: studentData.track,
              checkInTime,
              deviceType: 'Master Attendance Import',
              browser: 'N/A',
              verificationStatus: 'VERIFIED',
              verifiedAt: new Date(`${date}T17:00:00.000Z`),
              verifiedBy: systemUser.id,
              isManualOverride: true,
              overrideReason: 'Imported from corrected master attendance sheet',
              overriddenBy: systemUser.id,
              overriddenAt: new Date(),
              isAbsent: false,
            },
            update: {
              isAbsent: false,
              isManualOverride: true,
              overrideReason: 'Updated from corrected master attendance sheet',
              overriddenBy: systemUser.id,
              overriddenAt: new Date(),
              verificationStatus: 'VERIFIED',
              verifiedAt: new Date(`${date}T17:00:00.000Z`),
              verifiedBy: systemUser.id,
            }
          })
          recordsPresent++

        } else if (attendanceVal === 'ABS') {
          // Mark existing record as absent, or create absent record
          const sessionId = await getOrCreateSession(date, studentData.track, studentData.location)

          const existing = await prisma.attendanceRecord.findUnique({
            where: { sessionId_studentId: { sessionId, studentId: student.id } }
          })

          if (existing) {
            await prisma.attendanceRecord.update({
              where: { id: existing.id },
              data: {
                isAbsent: true,
                isManualOverride: true,
                overrideReason: 'Marked absent in corrected master attendance sheet',
                overriddenBy: systemUser.id,
                overriddenAt: new Date(),
              }
            })
            recordsAbsent++
          }
          // If no record exists and student is ABS, nothing to do

        } else {
          // '—' or blank — no session, skip
          recordsSkipped++
        }
      }

    } catch (err: any) {
      errors.push(`${studentData.app_id}: ${err?.message}`)
    }
  }

  console.log('\n======================================')
  console.log('🎉 SYNC COMPLETE')
  console.log(`   Students updated:    ${studentsUpdated}`)
  console.log(`   Records → Present:   ${recordsPresent}`)
  console.log(`   Records → Absent:    ${recordsAbsent}`)
  console.log(`   Date slots skipped:  ${recordsSkipped}`)
  
  if (errors.length > 0) {
    console.log(`\n⚠️  Errors (${errors.length}):`)
    errors.forEach(e => console.log(`   ${e}`))
  }
}

main().catch(console.error).finally(() => prisma.$disconnect())
