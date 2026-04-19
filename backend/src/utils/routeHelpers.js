const TeacherTimetable = require('../models/TeacherTimetable')

function toDate(value, fieldName) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    const error = new Error(`${fieldName} must be a valid date`)
    error.statusCode = 400
    throw error
  }
  return date
}

function isTeacher(user) {
  return user.role === 'TEACHER'
}

function serializeCollection(items) {
  return items.map((item) => item.toJSON())
}

function normalizeDirection(direction) {
  return direction === 'SUBSTITUTION' ? 'SUBSTITUTION' : 'CREDIT'
}

function oppositeDirection(direction) {
  return direction === 'CREDIT' ? 'SUBSTITUTION' : 'CREDIT'
}

function toMinutes(value, fieldName) {
  const text = String(value || '').trim()
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(text)
  if (!match) {
    const error = new Error(`${fieldName} must be a valid HH:MM time`)
    error.statusCode = 400
    throw error
  }
  return (Number(match[1]) * 60) + Number(match[2])
}

function hasOverlap(startA, endA, startB, endB) {
  return startA < endB && startB < endA
}

async function ensureNoSlotConflict({ teacherId, dayOfWeek, startTime, endTime, excludeSlotId = null }) {
  const filter = { teacherId, dayOfWeek }
  if (excludeSlotId) filter._id = { $ne: excludeSlotId }

  const existingSlots = await TeacherTimetable.find(filter)
  const startMinutes = toMinutes(startTime, 'startTime')
  const endMinutes = toMinutes(endTime, 'endTime')

  if (startMinutes >= endMinutes) {
    const error = new Error('endTime must be later than startTime')
    error.statusCode = 400
    throw error
  }

  const conflict = existingSlots.some((slot) => {
    const slotStart = toMinutes(slot.startTime, 'startTime')
    const slotEnd = toMinutes(slot.endTime, 'endTime')
    return hasOverlap(startMinutes, endMinutes, slotStart, slotEnd)
  })

  if (conflict) {
    const error = new Error('This slot overlaps with an existing active timetable slot')
    error.statusCode = 409
    throw error
  }
}

module.exports = {
  toDate,
  isTeacher,
  serializeCollection,
  normalizeDirection,
  oppositeDirection,
  toMinutes,
  hasOverlap,
  ensureNoSlotConflict,
}
