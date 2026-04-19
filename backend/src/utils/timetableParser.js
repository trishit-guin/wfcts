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

// Detect lab/practical keywords
const LAB_RE = /\b(lab|laboratory|practical|prac|workshop)\b/i

function normaliseTime(raw) {
  if (!raw) return null
  // Remove spaces and normalise separators
  let t = raw.trim().replace(/\./g, ':').replace(/\s+/g, '')
  // Handle 12h format
  const ampm = /([ap]m)$/i.exec(t)
  if (ampm) {
    t = t.replace(/[ap]m$/i, '').trim()
    const [h, m = '00'] = t.split(':')
    let hour = Number(h)
    if (ampm[1].toLowerCase() === 'pm' && hour !== 12) hour += 12
    if (ampm[1].toLowerCase() === 'am' && hour === 12) hour = 0
    return `${String(hour).padStart(2, '0')}:${m.padStart(2, '0')}`
  }
  // Already HH:MM
  if (/^\d{1,2}:\d{2}$/.test(t)) {
    const [h, m] = t.split(':')
    return `${String(Number(h)).padStart(2, '0')}:${m}`
  }
  // Just hours  e.g. "9" or "14"
  if (/^\d{1,2}$/.test(t)) {
    return `${String(Number(t)).padStart(2, '0')}:00`
  }
  return null
}

// Extract a time range from a string like "09:00-10:00" or "9:00 to 10:30"
function extractTimeRange(str) {
  const rangeRe = /(\d{1,2}[.:]\d{2}|\d{1,2})\s*[-–—to]+\s*(\d{1,2}[.:]\d{2}|\d{1,2})\s*(am|pm)?/i
  const m = rangeRe.exec(str)
  if (!m) return null
  const start = normaliseTime(m[1] + (m[3] ? m[3] : ''))
  const end = normaliseTime(m[2] + (m[3] ? m[3] : ''))
  if (start && end && start < end) return { startTime: start, endTime: end }
  return null
}

// Extract a single time from a string
function extractSingleTime(str) {
  const re = /\b(\d{1,2}[.:]\d{2})\s*(am|pm)?\b/i
  const m = re.exec(str)
  if (!m) return null
  return normaliseTime(m[1] + (m[2] || ''))
}

// Find the day in a string
function extractDay(str) {
  const lower = str.toLowerCase()
  for (const [name, num] of Object.entries(DAY_MAP)) {
    if (lower.includes(name)) return num
  }
  return null
}

// Extract a subject code — usually ALPHANUMERIC e.g. CS401, MATH3, BCA-3
function extractSubject(str) {
  // Remove time patterns first
  const clean = str.replace(/\d{1,2}[.:]\d{2}\s*(am|pm)?/gi, '').trim()
  const re = /\b([A-Z]{2,6}[-_]?\d{1,3}[A-Z]?|[A-Z]{3,10})\b/
  const m = re.exec(clean.toUpperCase())
  return m ? m[1] : ''
}

// Extract class/section — e.g. CS-7A, BCA3, BTECH-CSE-3B
function extractClass(str) {
  const re = /\b([A-Z]{2,6}[-_]?\d[A-Z]?|SEM[-_]?\d)\b/i
  const m = re.exec(str)
  return m ? m[1].toUpperCase() : ''
}

// ─── Strategy 1: Line-by-line (list format) ───────────────────────────────────

function parseListFormat(lines) {
  const slots = []
  let currentDay = null

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    // Check if this line is a day header
    const dayFromLine = extractDay(trimmed)
    if (dayFromLine !== null && trimmed.length < 20) {
      currentDay = dayFromLine
      continue
    }

    if (currentDay === null) continue

    // Try to find a time range in this line
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

// ─── Strategy 2: Grid format ──────────────────────────────────────────────────

function parseGridFormat(lines) {
  const slots = []

  // Find header row (contains multiple day names)
  let headerIdx = -1
  let dayColumns = []

  for (let i = 0; i < lines.length; i++) {
    const parts = lines[i].split(/\s{2,}|\t/)
    const daysFound = parts.map((p, ci) => ({ ci, day: extractDay(p) })).filter((x) => x.day !== null)
    if (daysFound.length >= 2) {
      headerIdx = i
      dayColumns = daysFound
      break
    }
  }

  if (headerIdx === -1 || dayColumns.length === 0) return []

  // Parse rows after header
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const row = lines[i]
    if (!row.trim()) continue

    const parts = row.split(/\s{2,}|\t/)
    // First column might be a time
    const timePart = parts[0]
    const range = extractTimeRange(timePart) || (extractSingleTime(timePart) ? {
      startTime: extractSingleTime(timePart),
      endTime: normaliseTime(String(Number(extractSingleTime(timePart).split(':')[0]) + 1) + ':00'),
    } : null)

    if (!range) continue

    // Each subsequent column corresponds to a day
    for (const { ci, day } of dayColumns) {
      const cell = parts[ci] || ''
      if (!cell.trim() || cell.trim() === '-') continue
      const subject = extractSubject(cell)
      const className = extractClass(cell)
      const isLab = LAB_RE.test(cell)
      if (!subject && !cell.trim()) continue

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

  return slots
}

// ─── Main entry ───────────────────────────────────────────────────────────────

function parseTimetableText(rawText) {
  if (!rawText || !rawText.trim()) return []

  const lines = rawText.split(/\r?\n/)

  // Try list format first (more reliable)
  const listSlots = parseListFormat(lines)
  if (listSlots.length > 0) return listSlots

  // Fall back to grid format
  const gridSlots = parseGridFormat(lines)
  if (gridSlots.length > 0) return gridSlots

  // Last resort: scan all lines for any time ranges with adjacent text
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

module.exports = { parseTimetableText }
