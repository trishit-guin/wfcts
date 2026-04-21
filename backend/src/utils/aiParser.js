const Groq = require('groq-sdk')
const pdfParse = require('pdf-parse')

const VALID_EVENT_TYPES = new Set(['LECTURE', 'LAB', 'ADMIN', 'EXTRA_DUTY', 'MEETING'])

const LAB_RE = /\b(lab|laboratory|practical|prac|workshop|dsbdal|wadl|cnsl|ccl|tl|pl)\b/i

const SYSTEM_PROMPT = `You are a precise timetable data extraction engine. Your only job is to read a teaching timetable and output structured JSON. You never explain, never add commentary — output raw JSON only.`

const EXTRACTION_PROMPT = `Extract every teaching slot from this timetable.

OUTPUT: A single raw JSON array — nothing before or after it, no markdown fences.

Each slot object must have exactly these fields:
{
  "day": <integer: 0=Sunday 1=Monday 2=Tuesday 3=Wednesday 4=Thursday 5=Friday 6=Saturday>,
  "startTime": "<HH:MM in strict 24-hour format>",
  "endTime": "<HH:MM in strict 24-hour format>",
  "subject": "<full subject name or code, empty string if truly unknown>",
  "className": "<class, batch, or division e.g. BCA-3A, SE-B, empty string if not shown>",
  "location": "<room or lab name, empty string if not shown>",
  "eventType": "<LECTURE | LAB | ADMIN | EXTRA_DUTY | MEETING>"
}

── TIME RULES (strictly follow) ──────────────────────────────────────────
• Convert ALL times to 24-hour HH:MM — zero-pad hours (09:00 not 9:00)
• 9:00 AM → "09:00" | 12:00 PM → "12:00" | 1:00 PM → "13:00" | 2:30 PM → "14:30"
• Time shown as "9-10" → startTime "09:00" endTime "10:00"
• Time shown as "9.00-10.00" → startTime "09:00" endTime "10:00"
• Single hour like "9" → startTime "09:00" endTime "10:00"
• endTime must always be after startTime — if it is not, correct it

── DAY RULES ─────────────────────────────────────────────────────────────
• Mon/Monday=1 Tue/Tuesday=2 Wed/Wednesday=3 Thu/Thursday=4 Fri/Friday=5 Sat/Saturday=6 Sun/Sunday=0
• In a grid table the day is the column header — map each cell to its column's day

── SLOT RULES ────────────────────────────────────────────────────────────
• SKIP: Break, Lunch, Recess, Free, Library, ---, empty or whitespace-only cells
• LAB eventType for: Lab, Laboratory, Practical, Prac, Workshop, or any subject whose name contains L (as suffix), Lab, Pr, DSBDAL, WADL, CNS Lab etc.
• LAB eventType also for: any slot whose duration is 2 hours or more (labs are always 2h, lectures are 1h)
• If one cell contains multiple subjects or classes (e.g. "A: Math | B: Physics"), emit ONE slot per subject/class
• Do NOT emit duplicate slots — same day + startTime + subject combination must appear only once
• If teacher name appears in a cell, put it in the subject field if no separate subject is visible

Return ONLY the raw JSON array. Do not wrap in an object.`

// ─── Time normaliser ─────────────────────────────────────────────────────────

function normaliseTime(t) {
  if (!t) return null
  // Already HH:MM
  if (/^\d{2}:\d{2}$/.test(t)) return t
  // H:MM → pad hour
  if (/^\d{1}:\d{2}$/.test(t)) return `0${t}`
  // H or HH with no minutes
  if (/^\d{1,2}$/.test(t)) return `${String(t).padStart(2, '0')}:00`
  return null
}

function toMinutes(hhmm) {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

// ─── Slot normaliser + deduplicator ──────────────────────────────────────────

function normaliseSlots(rawSlots) {
  const seen = new Set()
  const result = []

  for (let i = 0; i < rawSlots.length; i++) {
    const s = rawSlots[i]
    const day = Number(s.day)
    if (day < 0 || day > 6 || !s.startTime || !s.endTime) continue

    const start = normaliseTime(String(s.startTime))
    const end = normaliseTime(String(s.endTime))
    if (!start || !end) continue
    if (toMinutes(start) >= toMinutes(end)) continue // invalid range

    const subject = String(s.subject || '').trim()
    const className = String(s.className || '').trim()
    const location = String(s.location || '').trim()

    // Deduplicate on day + startTime + subject
    const key = `${day}|${start}|${subject.toLowerCase()}`
    if (seen.has(key)) continue
    seen.add(key)

    // Detect LAB: keyword match OR slot duration >= 2 hours
    const durationHours = (toMinutes(end) - toMinutes(start)) / 60
    const isLab = LAB_RE.test(subject) || LAB_RE.test(location) || durationHours >= 2
    let eventType = s.eventType
    if (!VALID_EVENT_TYPES.has(eventType)) eventType = 'LECTURE'
    if (isLab && eventType === 'LECTURE') eventType = 'LAB'

    result.push({
      day,
      startTime: start,
      endTime: end,
      subject,
      className,
      location,
      eventType,
      confidence: 0.95,
      _rowId: `ai${i}`,
    })
  }

  // Sort by day then startTime
  result.sort((a, b) => a.day - b.day || toMinutes(a.startTime) - toMinutes(b.startTime))
  return result
}

// ─── Parse raw model output ───────────────────────────────────────────────────

function parseModelOutput(raw) {
  // Strip markdown fences if model adds them
  const json = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim()

  // Model sometimes wraps in {"slots": [...]} — unwrap if so
  let parsed = JSON.parse(json)
  if (!Array.isArray(parsed)) {
    const key = Object.keys(parsed).find((k) => Array.isArray(parsed[k]))
    if (key) parsed = parsed[key]
    else throw new Error('Model did not return a JSON array')
  }

  return normaliseSlots(parsed)
}

// ─── Main export ─────────────────────────────────────────────────────────────

async function extractTimetableWithAI(buffer, mimeType) {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) throw new Error('GROQ_API_KEY is not set')

  const groq = new Groq({ apiKey })

  let messages
  if (mimeType === 'application/pdf') {
    const { text } = await pdfParse(buffer)
    messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: `${EXTRACTION_PROMPT}\n\nTimetable text:\n${text}` },
    ]
  } else {
    messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: [
          { type: 'text', text: EXTRACTION_PROMPT },
          { type: 'image_url', image_url: { url: `data:${mimeType};base64,${buffer.toString('base64')}` } },
        ],
      },
    ]
  }

  const completion = await groq.chat.completions.create({
    model: 'meta-llama/llama-4-scout-17b-16e-instruct',
    messages,
    temperature: 0,      // fully deterministic
    max_tokens: 8192,    // large timetables need space
  })

  const raw = completion.choices[0]?.message?.content || ''
  return parseModelOutput(raw)
}

module.exports = { extractTimetableWithAI }
