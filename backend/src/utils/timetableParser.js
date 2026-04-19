// Rule-based timetable parser — handles list, grid and teacher-centric formats

const DAY_MAP = {
  sunday: 0, sun: 0,
  monday: 1, mon: 1,
  tuesday: 2, tue: 2, tues: 2,
  wednesday: 3, wed: 3,
  thursday: 4, thu: 4, thur: 4, thurs: 4,
  friday: 5, fri: 5,
  saturday: 6, sat: 6,
}

// Cells with these values are intentionally empty
const EMPTY_CELL_RE = /^(-{1,3}|break|free|nil|empty)$/i

const LAB_RE = /\b(lab|laboratory|practical|prac|workshop|dsbdal|wadl|cnsl|ccl)\b/i

function normaliseTime(raw) {
  if (!raw) return null
  let t = raw.trim().replace(/\./g, ':').replace(/\s+/g, '')
  const ampm = /([ap]m)$/i.exec(t)
  if (ampm) {
    t = t.replace(/[ap]m$/i, '').trim()
    const [h, m = '00'] = t.split(':')
    let hour = Number(h)
    if (ampm[1].toLowerCase() === 'pm' && hour !== 12) hour += 12
    if (ampm[1].toLowerCase() === 'am' && hour === 12) hour = 0
    return `${String(hour).padStart(2, '0')}:${m.padStart(2, '0')}`
  }
  if (/^\d{1,2}:\d{2}$/.test(t)) {
    const [h, m] = t.split(':')
    return `${String(Number(h)).padStart(2, '0')}:${m}`
  }
  if (/^\d{1,2}$/.test(t)) {
    return `${String(Number(t)).padStart(2, '0')}:00`
  }
  return null
}

// Matches "9.00 to 10.00", "09:00-10:00", "9–10", etc.
const TIME_RANGE_RE = /(\d{1,2}[.:]\d{2}|\d{1,2})\s*(?:to|[-–—])\s*(\d{1,2}[.:]\d{2}|\d{1,2})\s*(am|pm)?/i

function extractTimeRange(str) {
  const m = TIME_RANGE_RE.exec(str)
  if (!m) return null
  const start = normaliseTime(m[1] + (m[3] || ''))
  const end = normaliseTime(m[2] + (m[3] || ''))
  if (start && end && start < end) return { startTime: start, endTime: end }
  return null
}

function extractSingleTime(str) {
  const re = /\b(\d{1,2}[.:]\d{2})\s*(am|pm)?\b/i
  const m = re.exec(str)
  if (!m) return null
  return normaliseTime(m[1] + (m[2] || ''))
}

function extractDay(str) {
  const lower = str.toLowerCase()
  for (const [name, num] of Object.entries(DAY_MAP)) {
    if (lower.includes(name)) return num
  }
  return null
}

// Subject codes: handles "K10-CCL", "DSBDA", "WAD", "Hons TH", "CNS"
function extractSubject(str) {
  const clean = str.replace(/\d{1,2}[.:]\d{2}\s*(am|pm)?/gi, '').trim()
  // Try labelled subjects like "K10-CCL" or "L10-CNSL" first
  const labelledRe = /\b([A-Z][0-9]{1,2}[-_][A-Z]{2,8})\b/g
  const labelled = [...clean.toUpperCase().matchAll(labelledRe)].map((m) => m[1])
  if (labelled.length) return labelled.join(', ')
  // Plain subject codes
  const re = /\b([A-Z]{2,6}[-_]?\d{1,3}[A-Z]?|[A-Z]{2,10}(?:\s+TH)?)\b/
  const m = re.exec(clean.toUpperCase())
  return m ? m[1] : ''
}

function extractClass(str) {
  const re = /\b([A-Z]{2,6}[-_]?\d[A-Z]?|SEM[-_]?\d)\b/i
  const m = re.exec(str)
  return m ? m[1].toUpperCase() : ''
}

// Split a line by pipe `|` or by 2+ spaces/tabs — whichever produces more columns
function splitRow(line) {
  const byPipe = line.split('|').map((c) => c.trim())
  const bySpace = line.split(/\s{2,}|\t/).map((c) => c.trim())
  return byPipe.length >= bySpace.length ? byPipe : bySpace
}

// ─── Strategy 1: Line-by-line (list format) ───────────────────────────────────

function parseListFormat(lines) {
  const slots = []
  let currentDay = null

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    const dayFromLine = extractDay(trimmed)
    if (dayFromLine !== null && trimmed.length < 20) {
      currentDay = dayFromLine
      continue
    }

    if (currentDay === null) continue

    const range = extractTimeRange(trimmed)
    if (range) {
      const subject = extractSubject(trimmed)
      const className = extractClass(trimmed)
      const isLab = LAB_RE.test(trimmed)
      slots.push({
        day: currentDay,
        startTime: range.startTime,
        endTime: range.endTime,
        subject,
        className,
        location: '',
        eventType: isLab ? 'LAB' : 'LECTURE',
        confidence: subject ? 0.85 : 0.6,
        _rowId: `r${slots.length}`,
      })
    }
  }

  return slots
}

// ─── Strategy 2: Grid format (handles OCR output from table images) ───────────

function parseGridFormat(lines) {
  const slots = []

  // Find header row — must contain ≥2 day names
  let headerIdx = -1
  let dayColumns = []

  for (let i = 0; i < lines.length; i++) {
    const parts = splitRow(lines[i])
    const daysFound = parts
      .map((p, ci) => ({ ci, day: extractDay(p) }))
      .filter((x) => x.day !== null)

    if (daysFound.length >= 2) {
      headerIdx = i
      dayColumns = daysFound
      break
    }
  }

  if (headerIdx === -1 || dayColumns.length === 0) return []

  // Process rows after header
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const row = lines[i]
    if (!row.trim()) continue

    const parts = splitRow(row)

    // Skip pure break/header rows
    if (parts.length === 1 && EMPTY_CELL_RE.test(parts[0].replace(/\s+/g, ''))) continue

    // First column is the time range
    const timePart = parts[0]
    let range = extractTimeRange(timePart)

    if (!range) {
      // Maybe the time is embedded in a longer cell — try to extract it
      const singleT = extractSingleTime(timePart)
      if (singleT) {
        const nextHour = String(Number(singleT.split(':')[0]) + 1).padStart(2, '0')
        range = { startTime: singleT, endTime: `${nextHour}:00` }
      } else {
        continue
      }
    }

    // Each subsequent column maps to a day
    for (const { ci, day } of dayColumns) {
      const cell = (parts[ci] || '').trim()
      if (!cell || EMPTY_CELL_RE.test(cell)) continue

      const subject = extractSubject(cell)
      const className = extractClass(cell)
      const isLab = LAB_RE.test(cell)

      // A cell like "K10-CCL L10-CNSL M10-WADL N10-CNSL" has multiple subjects —
      // emit one slot per labelled subject, or one combined slot if none found.
      const labelledRe = /\b([A-Z][0-9]{1,2}[-_][A-Z]{2,8})\b/g
      const labelled = [...cell.toUpperCase().matchAll(labelledRe)]

      if (labelled.length > 1) {
        for (const match of labelled) {
          slots.push({
            day,
            startTime: range.startTime,
            endTime: range.endTime,
            subject: match[1],
            className: match[1].split('-')[0], // e.g. K10
            location: '',
            eventType: 'LAB',
            confidence: 0.8,
            _rowId: `r${slots.length}`,
          })
        }
      } else {
        if (!subject && !cell) continue
        slots.push({
          day,
          startTime: range.startTime,
          endTime: range.endTime,
          subject,
          className,
          location: '',
          eventType: isLab ? 'LAB' : 'LECTURE',
          confidence: subject ? 0.75 : 0.5,
          _rowId: `r${slots.length}`,
        })
      }
    }
  }

  return slots
}

// ─── Strategy 3: Fallback scan ────────────────────────────────────────────────

function parseFallback(lines) {
  const fallback = []
  for (const line of lines) {
    const trimmed = line.trim()
    const range = extractTimeRange(trimmed)
    const day = extractDay(trimmed)
    if (range && day !== null) {
      const subject = extractSubject(trimmed)
      fallback.push({
        day,
        startTime: range.startTime,
        endTime: range.endTime,
        subject,
        className: extractClass(trimmed),
        location: '',
        eventType: LAB_RE.test(trimmed) ? 'LAB' : 'LECTURE',
        confidence: 0.4,
        _rowId: `r${fallback.length}`,
      })
    }
  }
  return fallback
}

// ─── Main entry ───────────────────────────────────────────────────────────────

function parseTimetableText(rawText) {
  if (!rawText || !rawText.trim()) return []

  const lines = rawText.split(/\r?\n/)

  // Grid format first — this image is clearly a grid
  const gridSlots = parseGridFormat(lines)
  if (gridSlots.length > 0) return gridSlots

  // List format next (day-header + entries)
  const listSlots = parseListFormat(lines)
  if (listSlots.length > 0) return listSlots

  // Last resort: scan for time+day on same line
  return parseFallback(lines)
}

module.exports = { parseTimetableText }
