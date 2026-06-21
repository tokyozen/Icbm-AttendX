/**
 * Import Abuja Cybersecurity attendance June 1-11
 * Source: Cybersecurity_attendance_1st_june_-_11th_june.xlsx
 * Dates covered: Jun 2, 3, 4, 5, 9, 11 (Jun 1, 8, 10 not in file — untouched)
 */
import "dotenv/config"
import { prisma } from "@/lib/prisma"
import * as crypto from "crypto"

function generateToken(): string {
  const uuid = crypto.randomUUID()
  const hmac = crypto.createHmac('sha256', process.env.QR_SIGNING_SECRET || 'fallback')
  hmac.update(uuid)
  return `${uuid}-${hmac.digest('hex').slice(0, 16)}`
}

function generateSessionCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

// Data extracted from Excel
const ATTENDANCE_DATA = [
  { app_id: 'APP-2025-22016', name: 'Abalu Onochie Norbert',        dates: ['2026-06-02','2026-06-03','2026-06-04','2026-06-05','2026-06-11'] },
  { app_id: 'APP-2025-41414', name: 'Adenike Ruth Adigun',           dates: ['2026-06-09','2026-06-11'] },
  { app_id: 'APP-2025-33919', name: 'Adikwu Emmanuel Oche',          dates: ['2026-06-04'] },
  { app_id: 'APP-2025-66437', name: 'Agwo Inalegwu James',           dates: ['2026-06-02','2026-06-04','2026-06-09','2026-06-11'] },
  { app_id: 'APP-2025-58976', name: 'Aigbomian Charles Ehime',       dates: ['2026-06-02','2026-06-03','2026-06-04','2026-06-05'] },
  { app_id: 'APP-2025-54796', name: 'Aliko Magaji Doma',             dates: ['2026-06-02','2026-06-04','2026-06-11'] },
  { app_id: 'APP-2025-31276', name: 'Anthony Celestine Aruma',       dates: ['2026-06-02'] },
  { app_id: 'APP-2025-76783', name: 'Atsomhe Augustina Atsosimhe',   dates: ['2026-06-02','2026-06-03','2026-06-04','2026-06-05','2026-06-09','2026-06-11'] },
  { app_id: 'APP-2025-38550', name: 'Chidiebere Philip Chukwukere',  dates: ['2026-06-02','2026-06-03','2026-06-04','2026-06-05','2026-06-09'] },
  { app_id: 'APP-2025-28519', name: 'Chinonso Ogunedo',              dates: ['2026-06-02','2026-06-03','2026-06-04','2026-06-05','2026-06-09','2026-06-11'] },
  { app_id: 'APP-2025-18199', name: 'Daniel Zibom Duniya',           dates: ['2026-06-02','2026-06-03','2026-06-04','2026-06-05','2026-06-09'] },
  { app_id: 'APP-2025-66447', name: 'Dauda Sonia',                   dates: ['2026-06-02','2026-06-04','2026-06-09','2026-06-11'] },
  { app_id: 'APP-2025-38215', name: 'David Chukwu',                  dates: ['2026-06-02','2026-06-03','2026-06-05'] },
  { app_id: 'APP-2025-41626', name: 'Emmanuel Dominic Igwe',         dates: ['2026-06-02'] },
  { app_id: 'APP-2025-32112', name: 'Emmanuel Yohanna Kwedo',        dates: ['2026-06-02','2026-06-04'] },
  { app_id: 'APP-2025-23100', name: 'Friday Iji Ogbaka',             dates: ['2026-06-02','2026-06-04','2026-06-09','2026-06-11'] },
  { app_id: 'APP-2025-88523', name: 'Godstime Davies',               dates: ['2026-06-02','2026-06-03','2026-06-04','2026-06-05'] },
  { app_id: 'APP-2025-70826', name: 'Gyang Michael Rwang',           dates: ['2026-06-02','2026-06-04','2026-06-09','2026-06-11'] },
  { app_id: 'APP-2025-52711', name: 'Amos Ibrahim',                  dates: ['2026-06-02','2026-06-04','2026-06-09','2026-06-11'] },
  { app_id: 'APP-2025-94361', name: 'Ikwulono Ene Patience',         dates: ['2026-06-02','2026-06-04','2026-06-09','2026-06-11'] },
  { app_id: 'APP-2025-78826', name: 'Jibrin Moses',                  dates: ['2026-06-02','2026-06-03','2026-06-04','2026-06-05'] },
  { app_id: 'APP-2025-34676', name: 'KALADI Hassan Daniel',          dates: ['2026-06-04'] },
  { app_id: 'APP-2025-69302', name: 'Msughter Matthew ABAA',         dates: ['2026-06-11'] },
  { app_id: 'APP-2025-38532', name: 'Nenrangtin Yafet Wakyur',       dates: ['2026-06-04','2026-06-11'] },
  { app_id: 'APP-2026-51858', name: 'Nwokeabia Ogochukwu Precious',  dates: ['2026-06-03','2026-06-04','2026-06-05'] },
  { app_id: 'APP-2025-52629', name: 'Okeke Geraldine Chidimma',      dates: ['2026-06-02','2026-06-04','2026-06-09','2026-06-11'] },
  { app_id: 'APP-2025-93042', name: 'Okwoli Peter',                  dates: ['2026-06-02','2026-06-03','2026-06-04'] },
  { app_id: 'APP-2026-74955', name: 'Okwudili Collins',              dates: ['2026-06-02','2026-06-04','2026-06-05'] },
  { app_id: 'APP-2025-25041', name: 'Olom Gabriel Otogbo',           dates: ['2026-06-02'] },
  { app_id: 'APP-2025-63342', name: 'Oluwaseun Stephen Adeoti',      dates: ['2026-06-02','2026-06-09'] },
  { app_id: 'APP-2025-16645', name: 'Onyenwe Godswill Okoludoh',     dates: ['2026-06-02','2026-06-04'] },
  { app_id: 'APP-2025-94056', name: 'Onyia Chidozie Alvin',          dates: ['2026-06-03'] },
  { app_id: 'APP-2025-91994', name: 'Oyatogun Oluwaseun Samuel',     dates: ['2026-06-02','2026-06-04','2026-06-09'] },
  { app_id: 'APP-2025-35072', name: 'Peter Odili',                   dates: ['2026-06-02','2026-06-03','2026-06-04','2026-06-05'] },
  { app_id: 'APP-2025-46528', name: 'Racheal Achele Ibidun',         dates: ['2026-06-02','2026-06-04'] },
  { app_id: 'APP-2025-21642', name: 'Raymond Peter Bagram',          dates: ['2026-06-02','2026-06-04'] },
  { app_id: 'APP-2025-20757', name: 'Sakinah Abubakar',              dates: ['2026-06-02','2026-06-04','2026-06-05','2026-06-09','2026-06-11'] },
  { app_id: 'APP-2025-68897', name: 'Samuel Igbomiye',               dates: ['2026-06-02','2026-06-04'] },
  { app_id: 'APP-2026-73285', name: 'Theophilus Danjuma Matthew',    dates: ['2026-06-03','2026-06-04','2026-06-05'] },
  { app_id: 'APP-2025-80116', name: 'Torty Jennifer',                dates: ['2026-06-04','2026-06-05'] },
  { app_id: 'APP-2025-22475', name: 'Uche Peter Uche',               dates: ['2026-06-03','2026-06-04','2026-06-05'] },
  { app_id: 'APP-2025-14288', name: 'Ugbede Ogah Omale',             dates: ['2026-06-02','2026-06-04','2026-06-09','2026-06-11'] },
  { app_id: 'APP-2025-18172', name: 'Yakubu Mohammed Elijah',        dates: ['2026-06-02','2026-06-03','2026-06-04','2026-06-05'] },
]

const TRACK = 'Cybersecurity'
const ALL_DATES = ['2026-06-02','2026-06-03','2026-06-04','2026-06-05','2026-06-09','2026-06-11']

async function main() {
  console.log('🚀 Importing Abuja Cybersecurity attendance June 2-11...')
  console.log('=======================================================')

  const systemUser = await prisma.user.findFirst({
    where: { email: 'system@icbm-attendx.com' }
  })
  if (!systemUser) throw new Error('System user not found')

  // Build session map: date -> session ID
  const sessionMap = new Map<string, string>()
  
  for (const date of ALL_DATES) {
    const dateObj = new Date(`${date}T08:00:00.000Z`)
    
    // Find existing session for this date + Cybersecurity
    const existing = await prisma.trainingSession.findFirst({
      where: {
        learningTrack: TRACK,
        status: { in: ['CLOSED', 'EXPIRED'] },
        startedAt: {
          gte: new Date(`${date}T00:00:00.000Z`),
          lte: new Date(`${date}T23:59:59.000Z`),
        }
      }
    })

    if (existing) {
      sessionMap.set(date, existing.id)
      console.log(`  Found session: ${date} -> ${existing.sessionName}`)
    } else {
      // Create new session
      const d = dateObj
      const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
      const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
      const sessionName = `${TRACK} — ${String(d.getUTCDate()).padStart(2,'0')} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`
      
      const session = await prisma.trainingSession.create({
        data: {
          sessionName,
          sessionCode: generateSessionCode(),
          location: 'Both Campuses',
          learningTrack: TRACK,
          instructorId: systemUser.id,
          qrToken: generateToken(),
          startedAt: dateObj,
          expiresAt: new Date(`${date}T17:00:00.000Z`),
          endedAt: new Date(`${date}T17:00:00.000Z`),
          status: 'CLOSED',
        }
      })
      sessionMap.set(date, session.id)
      console.log(`  Created session: ${date} -> ${sessionName}`)
    }
  }

  let imported = 0
  let updated = 0
  let skipped = 0
  const notFound: string[] = []

  for (const record of ATTENDANCE_DATA) {
    const student = await prisma.student.findUnique({
      where: { applicationId: record.app_id }
    })

    if (!student) {
      notFound.push(`${record.app_id} | ${record.name}`)
      continue
    }

    for (const date of ALL_DATES) {
      const sessionId = sessionMap.get(date)
      if (!sessionId) continue

      const isPresent = record.dates.includes(date)
      const checkInTime = new Date(`${date}T08:00:00.000Z`)
      checkInTime.setUTCMinutes(Math.floor(Math.random() * 90))

      const existing = await prisma.attendanceRecord.findUnique({
        where: { sessionId_studentId: { sessionId, studentId: student.id } }
      })

      if (isPresent) {
        if (existing) {
          // Update to present if currently absent
          if (existing.isAbsent) {
            await prisma.attendanceRecord.update({
              where: { id: existing.id },
              data: {
                isAbsent: false,
                isManualOverride: true,
                overrideReason: 'Updated from Cybersecurity manual attendance sheet Jun 1-11',
                overriddenBy: systemUser.id,
                overriddenAt: new Date(),
                verificationStatus: 'VERIFIED',
                verifiedAt: new Date(`${date}T17:00:00.000Z`),
                verifiedBy: systemUser.id,
              }
            })
            updated++
          } else {
            skipped++ // Already present
          }
        } else {
          await prisma.attendanceRecord.create({
            data: {
              sessionId,
              studentId: student.id,
              applicationId: student.applicationId,
              fullName: student.fullName,
              gender: student.gender,
              trainingLocation: student.trainingLocation,
              learningTrack: TRACK,
              checkInTime,
              deviceType: 'Manual Sheet Import',
              browser: 'N/A',
              verificationStatus: 'VERIFIED',
              verifiedAt: new Date(`${date}T17:00:00.000Z`),
              verifiedBy: systemUser.id,
              isManualOverride: true,
              overrideReason: 'Imported from Cybersecurity manual attendance sheet Jun 1-11',
              overriddenBy: systemUser.id,
              overriddenAt: new Date(),
              isAbsent: false,
            }
          })
          imported++
        }
      }
      // If not present, we leave existing records alone (don't overwrite QR check-ins)
    }
  }

  console.log('\n=======================================================')
  console.log('🎉 DONE')
  console.log(`   Records imported: ${imported}`)
  console.log(`   Records updated:  ${updated}`)
  console.log(`   Records skipped:  ${skipped} (already correct)`)

  if (notFound.length > 0) {
    console.log(`\n⚠️  Students not found in platform (${notFound.length}):`)
    notFound.forEach(s => console.log(`   ${s}`))
  } else {
    console.log('\n✅ All 43 students found and processed')
  }
}

main().catch(console.error).finally(() => prisma.$disconnect())
