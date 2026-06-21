/**
 * FINAL ATTENDANCE SYNC
 * =====================
 * Strategy:
 * 1. Jun 1-11: WIPE all existing records, re-import EXACTLY from Excel
 * 2. Jun 15-19: VERIFY platform records match Excel, flag mismatches
 * 3. Fix track name: "Ai & Machine Learning" -> "AI & Machine Learning"
 */
import "dotenv/config"
import { prisma } from "@/lib/prisma"
import * as fs from "fs"
import * as path from "path"
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

const JUN1_11_DATES = [
  '2026-06-01','2026-06-02','2026-06-03','2026-06-04','2026-06-05',
  '2026-06-08','2026-06-09','2026-06-10','2026-06-11'
]
const JUN15_19_DATES = [
  '2026-06-15','2026-06-16','2026-06-17','2026-06-18','2026-06-19'
]

async function main() {
  console.log('FINAL ATTENDANCE SYNC')
  console.log('=====================\n')

  const systemUser = await prisma.user.findFirst({
    where: { email: 'system@icbm-attendx.com' }
  })
  if (!systemUser) throw new Error('System user not found')

  // ── STEP 1: Fix track name mismatch ────────────────────────────────
  console.log('STEP 1: Fixing track name "Ai & Machine Learning" -> "AI & Machine Learning"')
  
  const studentsFixed = await prisma.student.updateMany({
    where: { learningTrack: 'Ai & Machine Learning' },
    data: { learningTrack: 'AI & Machine Learning' }
  })
  console.log(`  Fixed ${studentsFixed.count} students`)

  const sessionsFixed = await prisma.trainingSession.updateMany({
    where: { learningTrack: 'Ai & Machine Learning' },
    data: { learningTrack: 'AI & Machine Learning' }
  })
  console.log(`  Fixed ${sessionsFixed.count} sessions`)

  const recordsFixed = await prisma.attendanceRecord.updateMany({
    where: { learningTrack: 'Ai & Machine Learning' },
    data: { learningTrack: 'AI & Machine Learning' }
  })
  console.log(`  Fixed ${recordsFixed.count} attendance records\n`)

  // ── STEP 2: WIPE all Jun 1-11 attendance records ───────────────────
  console.log('STEP 2: Wiping all Jun 1-11 attendance records...')
  
  // Get all Jun 1-11 session IDs
  const jun1_11Sessions = await prisma.trainingSession.findMany({
    where: {
      startedAt: {
        gte: new Date('2026-06-01T00:00:00.000Z'),
        lte: new Date('2026-06-11T23:59:59.000Z'),
      },
      status: { in: ['CLOSED', 'EXPIRED'] }
    },
    select: { id: true, sessionName: true, learningTrack: true }
  })
  
  const jun1_11SessionIds = jun1_11Sessions.map(s => s.id)
  console.log(`  Found ${jun1_11Sessions.length} sessions for Jun 1-11`)

  const deleted = await prisma.attendanceRecord.deleteMany({
    where: { sessionId: { in: jun1_11SessionIds } }
  })
  console.log(`  Deleted ${deleted.count} old attendance records\n`)

  // ── STEP 3: Build session map for Jun 1-11 ──────────────────────────
  console.log('STEP 3: Building session map...')
  
  // After track name fix, re-fetch sessions
  const allJun1_11Sessions = await prisma.trainingSession.findMany({
    where: {
      startedAt: {
        gte: new Date('2026-06-01T00:00:00.000Z'),
        lte: new Date('2026-06-11T23:59:59.000Z'),
      },
      status: { in: ['CLOSED', 'EXPIRED'] }
    },
    select: { id: true, learningTrack: true, startedAt: true, location: true }
  })

  // Map: track+date -> session IDs (may be multiple per day)
  const sessionMap = new Map<string, string[]>()
  for (const s of allJun1_11Sessions) {
    const date = s.startedAt.toISOString().split('T')[0]
    const key = `${s.learningTrack}|${date}`
    if (!sessionMap.has(key)) sessionMap.set(key, [])
    sessionMap.get(key)!.push(s.id)
  }

  // For tracks/dates that have no session, create one
  const TRACKS = [
    'AI & Machine Learning',
    'Business Process & Outsourcing (BPO)',
    'Cybersecurity',
    'Project Management',
    'Software Development',
  ]

  for (const track of TRACKS) {
    for (const date of JUN1_11_DATES) {
      const key = `${track}|${date}`
      if (!sessionMap.has(key)) {
        const d = new Date(`${date}T08:00:00.000Z`)
        const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
        const sessionName = `${track} — ${String(d.getUTCDate()).padStart(2,'0')} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`
        
        const newSession = await prisma.trainingSession.create({
          data: {
            sessionName,
            sessionCode: generateCode(),
            location: 'Both Campuses',
            learningTrack: track,
            instructorId: systemUser.id,
            qrToken: generateToken(),
            startedAt: d,
            expiresAt: new Date(`${date}T17:00:00.000Z`),
            endedAt: new Date(`${date}T17:00:00.000Z`),
            status: 'CLOSED',
          }
        })
        sessionMap.set(key, [newSession.id])
        console.log(`  Created session: ${sessionName}`)
      }
    }
  }
  console.log(`  Session map ready: ${sessionMap.size} track+date combos\n`)

  // ── STEP 4: Import Jun 1-11 from Excel (source of truth) ───────────
  console.log('STEP 4: Importing Jun 1-11 attendance from final Excel...')
  
  const dataPath = path.join(__dirname, '../final_jun1_11_data.json')
  const students = JSON.parse(fs.readFileSync(dataPath, 'utf-8'))

  let imported = 0
  let skipped = 0
  const notFound: string[] = []
  const mismatches: string[] = []

  for (const record of students) {
    // Fix track name in the data too
    const track = record.track === 'Ai & Machine Learning' 
      ? 'AI & Machine Learning' 
      : record.track

    const student = await prisma.student.findUnique({
      where: { applicationId: record.app_id }
    })

    if (!student) {
      notFound.push(`${record.app_id} | ${record.name}`)
      continue
    }

    // Import Jun 1-11
    for (const date of JUN1_11_DATES) {
      const isPresent = record.jun1_11[date] === true

      if (!isPresent) continue // Only import Present records

      // Find the session for this track+date
      const key = `${track}|${date}`
      const sessionIds = sessionMap.get(key)
      if (!sessionIds || sessionIds.length === 0) {
        console.log(`  ⚠️  No session: ${track} on ${date}`)
        continue
      }

      // Use first session for this track+date
      const sessionId = sessionIds[0]
      const checkInTime = new Date(`${date}T08:00:00.000Z`)
      checkInTime.setUTCMinutes(Math.floor(Math.random() * 90))

      await prisma.attendanceRecord.create({
        data: {
          sessionId,
          studentId: student.id,
          applicationId: student.applicationId,
          fullName: student.fullName,
          gender: student.gender,
          trainingLocation: student.trainingLocation,
          learningTrack: track,
          checkInTime,
          deviceType: 'Excel Import - Final',
          browser: 'N/A',
          verificationStatus: 'VERIFIED',
          verifiedAt: new Date(`${date}T17:00:00.000Z`),
          verifiedBy: systemUser.id,
          isManualOverride: true,
          overrideReason: 'Final verified attendance sheet Jun 1-11',
          overriddenBy: systemUser.id,
          overriddenAt: new Date(),
          isAbsent: false,
        }
      })
      imported++
    }

    // ── STEP 5: Verify Jun 15-19 platform vs Excel ──────────────────
    for (const date of JUN15_19_DATES) {
      const excelSaysPresent = record.jun15_19[date] === true

      // Find platform sessions for this track on this date
      const platformSessions = await prisma.trainingSession.findMany({
        where: {
          learningTrack: track,
          startedAt: {
            gte: new Date(`${date}T00:00:00.000Z`),
            lte: new Date(`${date}T23:59:59.000Z`),
          },
          status: { in: ['CLOSED', 'EXPIRED', 'ACTIVE'] }
        },
        select: { id: true }
      })

      let platformSaysPresent = false
      for (const s of platformSessions) {
        const rec = await prisma.attendanceRecord.findUnique({
          where: { sessionId_studentId: { sessionId: s.id, studentId: student.id } }
        })
        if (rec && !rec.isAbsent) { platformSaysPresent = true; break }
      }

      if (excelSaysPresent !== platformSaysPresent) {
        mismatches.push(
          `${record.app_id} | ${record.name} | ${date} | Excel=${excelSaysPresent} Platform=${platformSaysPresent}`
        )
      }
    }
  }

  console.log(`  Imported: ${imported} records`)
  console.log(`  Skipped (absent): ${skipped}`)

  if (notFound.length > 0) {
    console.log(`\n⚠️  Students not found in DB (${notFound.length}):`)
    notFound.forEach(s => console.log(`   ${s}`))
  }

  // ── STEP 6: Report Jun 15-19 mismatches ────────────────────────────
  console.log(`\nSTEP 5: Jun 15-19 verification`)
  if (mismatches.length === 0) {
    console.log('  ✅ All Jun 15-19 records match between Excel and platform')
  } else {
    console.log(`  ⚠️  ${mismatches.length} mismatches found:`)
    mismatches.forEach(m => console.log(`   ${m}`))
  }

  console.log('\n=====================')
  console.log('✅ SYNC COMPLETE')
  console.log(`   Jun 1-11 records imported: ${imported}`)
  console.log(`   Jun 15-19 mismatches to review: ${mismatches.length}`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
