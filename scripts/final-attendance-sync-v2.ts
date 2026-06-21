/**
 * FINAL ATTENDANCE SYNC v2
 * - Batches all DB queries to avoid connection timeouts
 * - Jun 1-11: imports from Excel (source of truth)
 * - Jun 15-19: verifies platform vs Excel, reports mismatches only
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
const TRACKS = [
  'AI & Machine Learning',
  'Business Process & Outsourcing (BPO)',
  'Cybersecurity',
  'Project Management',
  'Software Development',
]

async function main() {
  console.log('FINAL ATTENDANCE SYNC v2')
  console.log('========================\n')

  const systemUser = await prisma.user.findFirst({
    where: { email: 'system@icbm-attendx.com' }
  })
  if (!systemUser) throw new Error('System user not found')

  // ── Load Excel data ────────────────────────────────────────────────
  const dataPath = path.join(__dirname, '../final_jun1_11_data.json')
  const students = JSON.parse(fs.readFileSync(dataPath, 'utf-8'))
  console.log(`Loaded ${students.length} students from Excel\n`)

  // ── STEP 1: Fix track name (may already be done, idempotent) ───────
  console.log('STEP 1: Ensuring track names are correct...')
  const sf = await prisma.student.updateMany({
    where: { learningTrack: 'Ai & Machine Learning' },
    data: { learningTrack: 'AI & Machine Learning' }
  })
  const sesf = await prisma.trainingSession.updateMany({
    where: { learningTrack: 'Ai & Machine Learning' },
    data: { learningTrack: 'AI & Machine Learning' }
  })
  const rf = await prisma.attendanceRecord.updateMany({
    where: { learningTrack: 'Ai & Machine Learning' },
    data: { learningTrack: 'AI & Machine Learning' }
  })
  console.log(`  Students: ${sf.count}, Sessions: ${sesf.count}, Records: ${rf.count}\n`)

  // ── STEP 2: Check current Jun 1-11 record count ────────────────────
  const jun1_11Sessions = await prisma.trainingSession.findMany({
    where: {
      startedAt: { gte: new Date('2026-06-01T00:00:00.000Z'), lte: new Date('2026-06-11T23:59:59.000Z') },
      status: { in: ['CLOSED', 'EXPIRED'] }
    },
    select: { id: true, learningTrack: true, startedAt: true }
  })
  const jun1_11Ids = jun1_11Sessions.map(s => s.id)
  const existingCount = await prisma.attendanceRecord.count({
    where: { sessionId: { in: jun1_11Ids } }
  })
  console.log(`STEP 2: Current Jun 1-11 records in DB: ${existingCount}`)

  if (existingCount > 0) {
    console.log('  Wiping existing Jun 1-11 records...')
    const del = await prisma.attendanceRecord.deleteMany({
      where: { sessionId: { in: jun1_11Ids } }
    })
    console.log(`  Deleted ${del.count} records`)
  }
  console.log()

  // ── STEP 3: Build session map ──────────────────────────────────────
  console.log('STEP 3: Building session map for Jun 1-11...')
  
  const freshSessions = await prisma.trainingSession.findMany({
    where: {
      startedAt: { gte: new Date('2026-06-01T00:00:00.000Z'), lte: new Date('2026-06-11T23:59:59.000Z') },
      status: { in: ['CLOSED', 'EXPIRED'] }
    },
    select: { id: true, learningTrack: true, startedAt: true }
  })

  const sessionMap = new Map<string, string>() // track|date -> sessionId
  for (const s of freshSessions) {
    const date = s.startedAt.toISOString().split('T')[0]
    const key = `${s.learningTrack}|${date}`
    if (!sessionMap.has(key)) sessionMap.set(key, s.id)
  }

  // Create missing sessions
  let created = 0
  for (const track of TRACKS) {
    for (const date of JUN1_11_DATES) {
      const key = `${track}|${date}`
      if (!sessionMap.has(key)) {
        const d = new Date(`${date}T08:00:00.000Z`)
        const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
        const name = `${track} — ${String(d.getUTCDate()).padStart(2,'0')} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`
        const s = await prisma.trainingSession.create({
          data: {
            sessionName: name, sessionCode: generateCode(),
            location: 'Both Campuses', learningTrack: track,
            instructorId: systemUser.id, qrToken: generateToken(),
            startedAt: d,
            expiresAt: new Date(`${date}T17:00:00.000Z`),
            endedAt: new Date(`${date}T17:00:00.000Z`),
            status: 'CLOSED',
          }
        })
        sessionMap.set(key, s.id)
        created++
      }
    }
  }
  console.log(`  ${sessionMap.size} sessions mapped, ${created} created\n`)

  // ── STEP 4: Load all students from DB in one query ─────────────────
  console.log('STEP 4: Importing Jun 1-11 from final Excel...')
  
  const allStudents = await prisma.student.findMany({
    where: { isActive: true },
    select: { id: true, applicationId: true, fullName: true, gender: true, trainingLocation: true, learningTrack: true }
  })
  const studentMap = new Map(allStudents.map(s => [s.applicationId, s]))

  // Build all records to create
  const recordsToCreate: any[] = []
  const notFound: string[] = []

  for (const record of students) {
    const track = record.track === 'Ai & Machine Learning'
      ? 'AI & Machine Learning'
      : record.track

    const student = studentMap.get(record.app_id)
    if (!student) {
      notFound.push(`${record.app_id} | ${record.name}`)
      continue
    }

    for (const date of JUN1_11_DATES) {
      if (!record.jun1_11[date]) continue // ABS — skip

      const key = `${track}|${date}`
      const sessionId = sessionMap.get(key)
      if (!sessionId) continue

      const checkInTime = new Date(`${date}T08:00:00.000Z`)
      checkInTime.setUTCMinutes(Math.floor(Math.random() * 90))

      recordsToCreate.push({
        sessionId,
        studentId: student.id,
        applicationId: student.applicationId,
        fullName: student.fullName,
        gender: student.gender,
        trainingLocation: student.trainingLocation,
        learningTrack: track,
        checkInTime,
        deviceType: 'Excel Import - Final Verified',
        browser: 'N/A',
        verificationStatus: 'VERIFIED' as const,
        verifiedAt: new Date(`${date}T17:00:00.000Z`),
        verifiedBy: systemUser.id,
        isManualOverride: true,
        overrideReason: 'Final verified attendance sheet Jun 1-11',
        overriddenBy: systemUser.id,
        overriddenAt: new Date(),
        isAbsent: false,
      })
    }
  }

  console.log(`  Records to import: ${recordsToCreate.length}`)

  // Batch insert in chunks of 100
  const CHUNK = 100
  let imported = 0
  for (let i = 0; i < recordsToCreate.length; i += CHUNK) {
    const chunk = recordsToCreate.slice(i, i + CHUNK)
    await prisma.attendanceRecord.createMany({ data: chunk, skipDuplicates: true })
    imported += chunk.length
    process.stdout.write(`  Progress: ${imported}/${recordsToCreate.length}\r`)
  }
  console.log(`\n  ✅ Imported ${imported} records`)

  if (notFound.length > 0) {
    console.log(`\n  ⚠️  Not found in DB (${notFound.length}):`)
    notFound.forEach(s => console.log(`    ${s}`))
  }

  // ── STEP 5: Verify Jun 15-19 (bulk approach) ───────────────────────
  console.log('\nSTEP 5: Verifying Jun 15-19 platform vs Excel...')

  // Get all Jun 15-19 sessions
  const jun15_19Sessions = await prisma.trainingSession.findMany({
    where: {
      startedAt: { gte: new Date('2026-06-15T00:00:00.000Z'), lte: new Date('2026-06-19T23:59:59.000Z') },
      status: { in: ['CLOSED', 'EXPIRED', 'ACTIVE'] }
    },
    select: { id: true, learningTrack: true, startedAt: true }
  })

  // Get all attendance records for Jun 15-19
  const jun15_19Ids = jun15_19Sessions.map(s => s.id)
  const jun15_19Records = await prisma.attendanceRecord.findMany({
    where: { sessionId: { in: jun15_19Ids }, isAbsent: false },
    select: { studentId: true, sessionId: true }
  })

  // Build lookup: studentId -> Set of dates present on platform
  const platformPresence = new Map<string, Set<string>>()
  for (const rec of jun15_19Records) {
    const session = jun15_19Sessions.find(s => s.id === rec.sessionId)
    if (!session) continue
    const date = session.startedAt.toISOString().split('T')[0]
    if (!platformPresence.has(rec.studentId)) platformPresence.set(rec.studentId, new Set())
    platformPresence.get(rec.studentId)!.add(date)
  }

  const mismatches: string[] = []
  for (const record of students) {
    const student = studentMap.get(record.app_id)
    if (!student) continue

    for (const date of JUN15_19_DATES) {
      const excelPresent = record.jun15_19[date] === true
      const platformPresent = platformPresence.get(student.id)?.has(date) ?? false
      if (excelPresent !== platformPresent) {
        mismatches.push(
          `${record.app_id} | ${record.name} | ${date} | Excel:${excelPresent ? 'Present' : 'ABS'} Platform:${platformPresent ? 'Present' : 'ABS'}`
        )
      }
    }
  }

  if (mismatches.length === 0) {
    console.log('  ✅ All Jun 15-19 records match between Excel and platform')
  } else {
    console.log(`  ⚠️  ${mismatches.length} mismatches (Excel vs Platform):`)
    mismatches.forEach(m => console.log(`    ${m}`))
  }

  // ── Final summary ──────────────────────────────────────────────────
  const finalCount = await prisma.attendanceRecord.count({
    where: { sessionId: { in: [...sessionMap.values()] }, isAbsent: false }
  })

  console.log('\n========================')
  console.log('✅ SYNC COMPLETE')
  console.log(`   Jun 1-11 records in DB: ${finalCount}`)
  console.log(`   Jun 15-19 mismatches:   ${mismatches.length}`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
