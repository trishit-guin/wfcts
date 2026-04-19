const CalendarEvent = require('../models/CalendarEvent').CalendarEvent
const WorkEntry = require('../models/WorkEntry')

// ─── Week helpers ─────────────────────────────────────────────────────────────

function getISOWeekId(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7))
  const week1 = new Date(d.getFullYear(), 0, 4)
  const weekNum = 1 + Math.round(((d - week1) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7)
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`
}

function getWeekBounds(weekId) {
  const [yearStr, weekStr] = weekId.split('-W')
  const year = Number(yearStr)
  const week = Number(weekStr)
  const jan4 = new Date(year, 0, 4)
  const startOfWeek1 = new Date(jan4)
  startOfWeek1.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7))
  const weekStart = new Date(startOfWeek1)
  weekStart.setDate(startOfWeek1.getDate() + (week - 1) * 7)
  weekStart.setHours(0, 0, 0, 0)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)
  weekEnd.setHours(23, 59, 59, 999)
  return { weekStart, weekEnd }
}

function calcHours(startTime, endTime) {
  const [sh, sm] = startTime.split(':').map(Number)
  const [eh, em] = endTime.split(':').map(Number)
  return Math.max(0.5, ((eh * 60 + em) - (sh * 60 + sm)) / 60)
}

// ─── Core computation ─────────────────────────────────────────────────────────

async function computeWeekProgress(userId, weekId) {
  const { weekStart, weekEnd } = getWeekBounds(weekId)

  const [events, manualLogs] = await Promise.all([
    CalendarEvent.find({
      assignedTo: userId,
      date: { $gte: weekStart, $lte: weekEnd },
      status: 'COMPLETED',
    }),
    WorkEntry.find({
      teacherId: userId,
      date: { $gte: weekStart, $lte: weekEnd },
      source: 'manual',
    }),
  ])

  const breakdown = {
    lectureHours: 0,
    labHours: 0,
    subCoverHours: 0,
    adminHours: 0,
    extraDutyHours: 0,
    meetingHours: 0,
    manualLogHours: 0,
  }

  for (const evt of events) {
    // Skip events that were substituted away (teacher didn't actually do the work)
    if (evt.status === 'SUBSTITUTED') continue

    const hrs = calcHours(evt.startTime, evt.endTime)
    switch (evt.eventType) {
      case 'LECTURE':         breakdown.lectureHours   += hrs; break
      case 'LAB':             breakdown.labHours       += hrs; break
      case 'SUBSTITUTE_COVER':breakdown.subCoverHours  += hrs; break
      case 'ADMIN':           breakdown.adminHours     += hrs; break
      case 'EXTRA_DUTY':      breakdown.extraDutyHours += hrs; break
      case 'MEETING':         breakdown.meetingHours   += hrs; break
      default: break
    }
  }

  for (const log of manualLogs) {
    breakdown.manualLogHours += Number(log.hours) || 0
  }

  const teachingHours = Number((breakdown.lectureHours + breakdown.labHours + breakdown.subCoverHours).toFixed(2))
  const otherHours = Number((breakdown.adminHours + breakdown.extraDutyHours + breakdown.meetingHours + breakdown.manualLogHours).toFixed(2))
  const totalHours = Number((teachingHours + otherHours).toFixed(2))

  // Round breakdown values
  for (const key of Object.keys(breakdown)) {
    breakdown[key] = Number(breakdown[key].toFixed(2))
  }

  return {
    weekId,
    weekStart: weekStart.toISOString().slice(0, 10),
    weekEnd: weekEnd.toISOString().slice(0, 10),
    teachingHours,
    otherHours,
    totalHours,
    breakdown,
    targets: { teaching: 20, other: 20, total: 40 },
    percentages: {
      teaching: Math.min(100, Math.round((teachingHours / 20) * 100)),
      other: Math.min(100, Math.round((otherHours / 20) * 100)),
      total: Math.min(100, Math.round((totalHours / 40) * 100)),
    },
  }
}

// ─── Calendar event bulk creation for timetable slot (16 weeks) ───────────────

async function createTimetableCalendarEvents(slot, assignedById) {
  const { CalendarEvent: CE, FAIRNESS_WEIGHTS } = require('../models/CalendarEvent')
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const slotDay = slot.dayOfWeek
  const currentDay = today.getDay()
  const daysUntil = (slotDay - currentDay + 7) % 7

  const eventsToCreate = []
  for (let week = 0; week < 16; week++) {
    const eventDate = new Date(today)
    eventDate.setDate(today.getDate() + daysUntil + week * 7)

    eventsToCreate.push({
      title: `${slot.subject || 'Class'}${slot.className ? ` — ${slot.className}` : ''}`,
      description: slot.location ? `Room: ${slot.location}` : '',
      date: eventDate,
      startTime: slot.startTime,
      endTime: slot.endTime,
      eventType: slot.eventType || 'LECTURE',
      fairnessWeight: FAIRNESS_WEIGHTS[slot.eventType || 'LECTURE'] || 1.0,
      assignedTo: slot.teacherId,
      createdBy: assignedById,
      status: 'SCHEDULED',
      source: 'timetable',
      timetableSlotId: slot._id,
      subject: slot.subject || '',
      className: slot.className || '',
      location: slot.location || '',
    })
  }

  await CE.insertMany(eventsToCreate)
  return eventsToCreate.length
}

module.exports = { computeWeekProgress, getISOWeekId, getWeekBounds, createTimetableCalendarEvents }
