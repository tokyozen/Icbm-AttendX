import { PrismaClient } from "../src/generated/prisma/client"
import * as fs from "fs"
import * as path from "path"
import * as crypto from "crypto"

const prisma = new PrismaClient()

// ============================================================
// ENUGU HISTORICAL ATTENDANCE IMPORT
// Imports real day-by-day attendance for June 1-11 2026
// Source: Instructor Google Sheets (Enugu Campus)
// ============================================================

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

async function findOrCreateSystemUser() {
  let user = await prisma.user.findFirst({
    where: { email: 'system@icbm-attendx.com' }
  })
  if (!user) {
    user = await prisma.user.create({
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
  return user
}

async function main() {
  console.log('🚀 Starting Enugu historical attendance import...')
  console.log('================================================')

  const systemUser = await findOrCreateSystemUser()

  // Load data
  const dataPath = path.join(__dirname, '../enugu_attendance_june1_11.json')
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'))
  const records: Array<{
    app_id: string
    name: string
    gender: string
    track: string
    location: string
    date: string
  }> = data.records

  console.log(`Total records to process: ${records.length}`)

  // Group by track + date to create/find sessions
  const sessionMap = new Map<string, string>() // key -> session ID

  let sessionsCreated = 0
  let sessionsFound = 0
  let recordsImported = 0
  let recordsUpdated = 0
  let recordsSkipped = 0
  let studentsNotFound: string[] = []

  // Get all unique track+date combos
  const trackDateCombos = new Set(records.map(r => `${r.track}|${r.date}`))

  console.log(`\nCreating/finding ${trackDateCombos.size} sessions...`)

  for (const combo of trackDateCombos) {
    const [track, date] = combo.split('|')
    const dateObj = new Date(`${date}T08:00:00.000Z`)
    const sessionName = `${track} — ${formatDate(date)}`

    // Check if session already exists
    const existing = await prisma.trainingSession.findFirst({
      where: {
        sessionName,
        learningTrack: track,
        status: 'CLOSED',
      }
    })

    if (existing) {
      sessionMap.set(combo, existing.id)
      sessionsFound++
    } else {
      const newSession = await prisma.trainingSession.create({
        data: {
          sessionName,
          sessionCode: generateSessionCode(),
          location: 'Enugu',
          learningTrack: track,
          instructorId: systemUser.id,
          qrToken: generateToken(),
          startedAt: dateObj,
          expiresAt: new Date(`${date}T17:00:00.000Z`),
          endedAt: new Date(`${date}T17:00:00.000Z`),
          status: 'CLOSED',
        }
      })
      sessionMap.set(combo, newSession.id)
      sessionsCreated++
    }
  }

  console.log(`  Sessions created: ${sessionsCreated}`)
  console.log(`  Sessions found (existing): ${sessionsFound}`)

  // Now import attendance records
  console.log(`\nImporting attendance records...`)

  for (const record of records) {
    const combo = `${record.track}|${record.date}`
    const sessionId = sessionMap.get(combo)

    if (!sessionId) {
      console.log(`  ⚠️  No session found for ${combo}`)
      recordsSkipped++
      continue
    }

    // Find student by Application ID
    const student = await prisma.student.findUnique({
      where: { applicationId: record.app_id }
    })

    if (!student) {
      if (!studentsNotFound.includes(record.app_id)) {
        studentsNotFound.push(record.app_id)
      }
      recordsSkipped++
      continue
    }

    // Check if record already exists
    const existing = await prisma.attendanceRecord.findUnique({
      where: {
        sessionId_studentId: {
          sessionId,
          studentId: student.id
        }
      }
    })

    const checkInTime = new Date(`${record.date}T08:00:00.000Z`)
    // Stagger check-in times 8:00 - 9:30 AM
    checkInTime.setUTCMinutes(Math.floor(Math.random() * 90))

    if (existing) {
      // Update existing record with real data
      // Only update if it was a system import (not a real check-in)
      if (existing.deviceType === 'Mobile' || existing.deviceType === 'Manual Override') {
        // This was an estimated record — update with real data
        await prisma.attendanceRecord.update({
          where: { id: existing.id },
          data: {
            isManualOverride: true,
            overrideReason: 'Updated from Enugu instructor attendance sheet',
            overriddenBy: systemUser.id,
            overriddenAt: new Date(),
            verificationStatus: 'VERIFIED',
            verifiedAt: new Date(`${record.date}T17:00:00.000Z`),
            verifiedBy: systemUser.id,
            isAbsent: false,
          }
        })
        recordsUpdated++
      } else {
        // Real check-in record — don't touch it
        recordsSkipped++
      }
    } else {
      // Create new record
      await prisma.attendanceRecord.create({
        data: {
          sessionId,
          studentId: student.id,
          applicationId: record.app_id,
          fullName: student.fullName,
          gender: student.gender,
          trainingLocation: 'Enugu',
          learningTrack: record.track,
          checkInTime,
          deviceType: 'Instructor Sheet Import',
          browser: 'N/A',
          verificationStatus: 'VERIFIED',
          verifiedAt: new Date(`${record.date}T17:00:00.000Z`),
          verifiedBy: systemUser.id,
          isManualOverride: true,
          overrideReason: 'Imported from Enugu instructor attendance sheet',
          overriddenBy: systemUser.id,
          overriddenAt: new Date(),
          isAbsent: false,
        }
      })
      recordsImported++
    }
  }

  console.log('\n================================================')
  console.log('🎉 IMPORT COMPLETE')
  console.log(`   Sessions created:   ${sessionsCreated}`)
  console.log(`   Sessions found:     ${sessionsFound}`)
  console.log(`   Records imported:   ${recordsImported}`)
  console.log(`   Records updated:    ${recordsUpdated}`)
  console.log(`   Records skipped:    ${recordsSkipped}`)

  if (studentsNotFound.length > 0) {
    console.log(`\n⚠️  Students not found in platform (${studentsNotFound.length}):`)
    studentsNotFound.forEach(id => console.log(`   ${id}`))
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
