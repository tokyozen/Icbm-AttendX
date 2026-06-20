/**
 * ICBM-AttendX Master Attendance Generator
 * =========================================
 * Generates a comprehensive Excel workbook with:
 *   - Abuja sheet: all Abuja students x all sessions
 *   - Enugu sheet: all Enugu students x all sessions
 *
 * Usage:
 *   npx tsx scripts/generate-master-attendance.ts
 *
 * Output:
 *   ICBM_Master_Attendance_[date].xlsx in project root
 */

import { PrismaClient } from '../src/generated/prisma/client'
import ExcelJS from 'exceljs'
import * as path from 'path'

const prisma = new PrismaClient()

// ── Colours (matching your template exactly) ──────────────────────────
const C = {
  navyBg:       '1F3864',  // title row bg
  blueBg:       '2E75B6',  // static header cols bg
  blueLight:    'BDD7EE',  // standard date col bg
  tealBg:       '1A6B8A',  // alternating week bg
  goldBg:       'FFF0B3',  // special day bg
  goldText:     'BF8F00',  // special day text
  navyText:     '1F3864',  // standard date text
  white:        'FFFFFFFF',
  presentBg:    'E2EFDA',  // green tint
  presentText:  '375623',  // dark green
  absBg:        'FCE4D6',  // light orange
  absText:      'C00000',  // dark red
  summaryBg:    '1F3864',  // Days Present col bg
  rowAlt1:      'F2F7FF',  // light blue alternating row
  rowAlt2:      'FFFFFF',  // white alternating row
}

// ── Helpers ───────────────────────────────────────────────────────────
function hex(s: string) { return s.replace(/^FF/, '') }

function fillColor(argb: string) {
  return { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb } }
}

function applyCell(
  cell: ExcelJS.Cell,
  value: string | number | null,
  options: {
    bold?: boolean
    fontColor?: string
    bgColor?: string
    hAlign?: ExcelJS.Alignment['horizontal']
    vAlign?: ExcelJS.Alignment['vertical']
    wrap?: boolean
    fontSize?: number
  } = {}
) {
  if (value !== null) cell.value = value
  cell.font = {
    name: 'Arial',
    bold: options.bold ?? false,
    color: { argb: options.fontColor ?? 'FF000000' },
    size: options.fontSize ?? 10,
  }
  if (options.bgColor) {
    cell.fill = fillColor(options.bgColor)
  }
  cell.alignment = {
    horizontal: options.hAlign ?? 'center',
    vertical: options.vAlign ?? 'middle',
    wrapText: options.wrap ?? false,
  }
}

function dayLabel(d: Date): string {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${days[d.getUTCDay()]}\n${String(d.getUTCDate()).padStart(2,'0')} ${months[d.getUTCMonth()]}`
}

// ── Main ──────────────────────────────────────────────────────────────
async function main() {
  console.log('Fetching data from database...')

  // All active students
  const students = await prisma.student.findMany({
    where: { isActive: true },
    orderBy: [{ learningTrack: 'asc' }, { fullName: 'asc' }]
  })

  // All sessions (closed/expired/active), ordered by date
  const sessions = await prisma.trainingSession.findMany({
    where: { status: { in: ['CLOSED', 'EXPIRED'] } },
    orderBy: { startedAt: 'asc' }
  })

  // All attendance records
  const records = await prisma.attendanceRecord.findMany({
    where: { isAbsent: false }
  })

  console.log(`Students: ${students.length}`)
  console.log(`Sessions: ${sessions.length}`)
  console.log(`Records:  ${records.length}`)

  // Build fast lookup: "studentId|sessionId" -> true
  const attended = new Set(records.map(r => `${r.studentId}|${r.sessionId}`))

  // ── Deduplicate sessions by date+track ──────────────────────────────
  // Multiple sessions on same date+track → merge into one column
  const dateTrackMap = new Map<string, { date: Date; track: string; sessions: string[] }>()

  for (const s of sessions) {
    const dateKey = s.startedAt.toISOString().split('T')[0]
    const key = `${dateKey}|${s.learningTrack}`
    if (!dateTrackMap.has(key)) {
      dateTrackMap.set(key, { date: s.startedAt, track: s.learningTrack, sessions: [] })
    }
    dateTrackMap.get(key)!.sessions.push(s.id)
  }

  // Get unique sorted dates across all tracks
  const allDates = [...new Set(sessions.map(s => s.startedAt.toISOString().split('T')[0]))]
    .sort()

  // ── Build workbook ───────────────────────────────────────────────────
  const wb = new ExcelJS.Workbook()
  wb.creator = 'ICBM-AttendX'
  wb.created = new Date()

  const campuses = ['Abuja', 'Enugu']

  for (const campus of campuses) {
    const campusStudents = students.filter(s =>
      s.trainingLocation === campus || s.trainingLocation === 'Both Campuses'
    )

    // For Enugu also include Both Campuses students if not already in Abuja
    const sheet = wb.addWorksheet(campus, {
      pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1 }
    })

    // ── Column definitions ─────────────────────────────────────────────
    // Fixed cols: S/N | App ID | Full Name | Gender | Learning Track | Location
    // Then one col per date
    // Last col: Days Present

    const fixedCols = [
      { header: 'S/N',            key: 'sn',       width: 5 },
      { header: 'Application ID', key: 'appId',    width: 22 },
      { header: 'Full Name',      key: 'name',     width: 30 },
      { header: 'Gender',         key: 'gender',   width: 10 },
      { header: 'Learning Track', key: 'track',    width: 28 },
      { header: 'Location',       key: 'location', width: 14 },
    ]

    const totalFixedCols = fixedCols.length
    const totalDateCols = allDates.length
    const totalCols = totalFixedCols + totalDateCols + 1 // +1 for Days Present

    // Set column widths
    fixedCols.forEach((col, i) => {
      sheet.getColumn(i + 1).width = col.width
    })
    for (let d = 0; d < totalDateCols; d++) {
      sheet.getColumn(totalFixedCols + d + 1).width = 8
    }
    sheet.getColumn(totalCols).width = 9

    // ── Row 1: Title banner ────────────────────────────────────────────
    sheet.getRow(1).height = 32
    const titleCell = sheet.getCell(1, 1)
    titleCell.value = `SBTS GROUP GLOBAL  |  ICBM BPO DIVISION  |  ATTENDx MASTER  |  ${campus.toUpperCase()} CAMPUS`
    applyCell(titleCell, null, {
      bold: true, fontColor: C.white, bgColor: 'FF' + C.navyBg,
      fontSize: 12, hAlign: 'center', vAlign: 'middle'
    })
    sheet.mergeCells(1, 1, 1, totalCols)

    // ── Row 2: Column headers ──────────────────────────────────────────
    sheet.getRow(2).height = 42

    // Fixed col headers
    const fixedHeaderStyle = {
      bold: true, fontColor: C.white, bgColor: 'FF' + C.blueBg,
      hAlign: 'center' as const, vAlign: 'middle' as const, wrap: true
    }
    fixedCols.forEach((col, i) => {
      applyCell(sheet.getCell(2, i + 1), col.header, fixedHeaderStyle)
    })

    // Date col headers
    for (let d = 0; d < totalDateCols; d++) {
      const dateStr = allDates[d]
      const dateObj = new Date(dateStr + 'T00:00:00Z')
      const colIdx = totalFixedCols + d + 1

      // Alternate colour by week for visual grouping
      const weekNum = Math.floor(d / 5)
      let bgColor: string
      let fontColor: string

      if (weekNum % 3 === 0) {
        bgColor = 'FF' + C.blueLight
        fontColor = 'FF' + C.navyText
      } else if (weekNum % 3 === 1) {
        bgColor = 'FF' + C.tealBg
        fontColor = C.white
      } else {
        bgColor = 'FF' + C.blueBg
        fontColor = C.white
      }

      applyCell(sheet.getCell(2, colIdx), dayLabel(dateObj), {
        bold: true, fontColor, bgColor,
        hAlign: 'center', vAlign: 'middle', wrap: true
      })
    }

    // Days Present header
    applyCell(sheet.getCell(2, totalCols), 'Days\nPresent', {
      bold: true, fontColor: C.white, bgColor: 'FF' + C.navyBg,
      hAlign: 'center', vAlign: 'middle', wrap: true
    })

    // ── Data rows ──────────────────────────────────────────────────────
    let rowNum = 3
    let globalSN = 1

    // Group by learning track
    const tracks = [...new Set(campusStudents.map(s => s.learningTrack))].sort()

    for (const track of tracks) {
      const trackStudents = campusStudents.filter(s => s.learningTrack === track)
      if (trackStudents.length === 0) continue

      // Track subheader row
      sheet.getRow(rowNum).height = 18
      const trackCell = sheet.getCell(rowNum, 1)
      trackCell.value = `— ${track} —`
      applyCell(trackCell, null, {
        bold: true, fontColor: C.white, bgColor: 'FF' + C.tealBg,
        hAlign: 'left', vAlign: 'middle', fontSize: 10
      })
      sheet.mergeCells(rowNum, 1, rowNum, totalCols)
      rowNum++

      for (const student of trackStudents) {
        sheet.getRow(rowNum).height = 16

        // Alternating row background
        const rowBg = rowNum % 2 === 0 ? 'FFF2F7FF' : 'FFFFFFFF'

        // S/N
        applyCell(sheet.getCell(rowNum, 1), globalSN, {
          bgColor: rowBg, hAlign: 'center', vAlign: 'middle'
        })

        // Application ID
        applyCell(sheet.getCell(rowNum, 2), student.applicationId, {
          bgColor: rowBg, hAlign: 'left', vAlign: 'middle', bold: true,
          fontColor: 'FF' + C.navyBg
        })

        // Full Name
        applyCell(sheet.getCell(rowNum, 3), student.fullName, {
          bgColor: rowBg, hAlign: 'left', vAlign: 'middle'
        })

        // Gender
        const genderDisplay = student.gender === 'MALE' ? 'M' : student.gender === 'FEMALE' ? 'F' : 'O'
        applyCell(sheet.getCell(rowNum, 4), genderDisplay, {
          bgColor: rowBg, hAlign: 'center', vAlign: 'middle'
        })

        // Learning Track
        applyCell(sheet.getCell(rowNum, 5), student.learningTrack, {
          bgColor: rowBg, hAlign: 'left', vAlign: 'middle'
        })

        // Location
        applyCell(sheet.getCell(rowNum, 6), student.trainingLocation, {
          bgColor: rowBg, hAlign: 'center', vAlign: 'middle'
        })

        // Date attendance cols
        let daysPresent = 0

        for (let d = 0; d < allDates.length; d++) {
          const dateStr = allDates[d]
          const colIdx = totalFixedCols + d + 1
          const cell = sheet.getCell(rowNum, colIdx)

          // Find sessions for this student's track on this date
          const key = `${dateStr}|${student.learningTrack}`
          const bothKey = `${dateStr}|Both Campuses`
          const dtEntry = dateTrackMap.get(key) || dateTrackMap.get(bothKey)

          if (!dtEntry) {
            // No session for this track on this day — grey out
            applyCell(cell, '—', {
              bgColor: 'FFE8E8E8', fontColor: 'FFAAAAAA',
              hAlign: 'center', vAlign: 'middle', fontSize: 9
            })
            continue
          }

          // Check if student attended any session this day for their track
          const wasPresent = dtEntry.sessions.some(sessionId =>
            attended.has(`${student.id}|${sessionId}`)
          )

          if (wasPresent) {
            daysPresent++
            applyCell(cell, 'Present', {
              bold: true,
              fontColor: 'FF' + C.presentText,
              bgColor: 'FF' + C.presentBg,
              hAlign: 'center', vAlign: 'middle'
            })
          } else {
            applyCell(cell, 'ABS', {
              bold: true,
              fontColor: 'FF' + C.absText,
              bgColor: 'FF' + C.absBg,
              hAlign: 'center', vAlign: 'middle'
            })
          }
        }

        // Days Present summary
        applyCell(sheet.getCell(rowNum, totalCols), daysPresent, {
          bold: true,
          fontColor: C.white,
          bgColor: daysPresent === 0 ? 'FF' + C.absText : 'FF' + C.navyBg,
          hAlign: 'center', vAlign: 'middle'
        })

        rowNum++
        globalSN++
      }
    }

    // ── Freeze panes ──────────────────────────────────────────────────
    sheet.views = [{
      state: 'frozen',
      xSplit: totalFixedCols,
      ySplit: 2,
      activeCell: 'G3'
    }]

    // ── Thin border on header row ─────────────────────────────────────
    const borderStyle = { style: 'thin' as const, color: { argb: 'FFD9E1F2' } }
    for (let c = 1; c <= totalCols; c++) {
      const cell = sheet.getCell(2, c)
      cell.border = {
        bottom: { style: 'medium' as const, color: { argb: 'FF' + C.navyBg } }
      }
    }

    console.log(`  ✓ ${campus} sheet: ${campusStudents.length} students, ${rowNum - 3} rows`)
  }

  // ── Save file ─────────────────────────────────────────────────────
  const today = new Date().toISOString().split('T')[0]
  const outPath = path.join(process.cwd(), `ICBM_Master_Attendance_${today}.xlsx`)
  await wb.xlsx.writeFile(outPath)
  console.log(`\n✅ Saved: ${outPath}`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
