const User = require('../models/User')
const TeacherTimetable = require('../models/TeacherTimetable')
const { isTeacher, serializeCollection, toMinutes, hasOverlap, ensureNoSlotConflict } = require('../utils/routeHelpers')
const { createTimetableCalendarEvents } = require('../utils/weeklyProgress')

async function getTimetableSlots(req, res, next) {
  try {
    const { teacherId, dayOfWeek } = req.query
    const filter = {}

    if (isTeacher(req.user)) {
      if (teacherId && String(teacherId) !== String(req.user._id)) {
        const error = new Error('You can only access your own timetable slots')
        error.statusCode = 403
        throw error
      }
      filter.teacherId = req.user._id
    } else if (teacherId) {
      filter.teacherId = teacherId
    }

    if (dayOfWeek !== undefined) {
      const day = Number(dayOfWeek)
      if (!Number.isInteger(day) || day < 0 || day > 6) {
        const error = new Error('dayOfWeek must be an integer between 0 and 6')
        error.statusCode = 400
        throw error
      }
      filter.dayOfWeek = day
    }

    const slots = await TeacherTimetable.find(filter).sort({ dayOfWeek: 1, startTime: 1, createdAt: -1 })
    res.json({ timetableSlots: serializeCollection(slots) })
  } catch (error) {
    next(error)
  }
}

async function createTimetableSlot(req, res, next) {
  try {
    const { teacherId, dayOfWeek, startTime, endTime, eventType, subject, className, location } = req.body || {}

    const day = Number(dayOfWeek)
    if (!Number.isInteger(day) || day < 0 || day > 6) {
      const error = new Error('dayOfWeek must be an integer between 0 and 6')
      error.statusCode = 400
      throw error
    }

    if (!startTime || !endTime) {
      const error = new Error('startTime and endTime are required')
      error.statusCode = 400
      throw error
    }

    const targetTeacherId = teacherId || req.user._id
    if (isTeacher(req.user) && String(targetTeacherId) !== String(req.user._id)) {
      const error = new Error('You can only create your own timetable slots')
      error.statusCode = 403
      throw error
    }

    const targetTeacher = await User.findOne({ _id: targetTeacherId, role: 'TEACHER' })
    if (!targetTeacher) {
      const error = new Error('Teacher was not found')
      error.statusCode = 404
      throw error
    }

    await ensureNoSlotConflict({
      teacherId: targetTeacher._id,
      dayOfWeek: day,
      startTime: String(startTime).trim(),
      endTime: String(endTime).trim(),
    })

    const slot = await TeacherTimetable.create({
      teacherId: targetTeacher._id,
      dayOfWeek: day,
      startTime: String(startTime).trim(),
      endTime: String(endTime).trim(),
      eventType: eventType || 'LECTURE',
      subject: subject ? String(subject).trim() : '',
      className: className ? String(className).trim() : '',
      location: location ? String(location).trim() : '',
      assignedBy: req.user._id,
    })

    await createTimetableCalendarEvents(slot, req.user._id)

    res.status(201).json({ timetableSlot: slot.toJSON() })
  } catch (error) {
    next(error)
  }
}

async function updateTimetableSlot(req, res, next) {
  try {
    const slot = await TeacherTimetable.findById(req.params.slotId)
    if (!slot) {
      const error = new Error('Timetable slot not found')
      error.statusCode = 404
      throw error
    }

    if (isTeacher(req.user) && String(slot.teacherId) !== String(req.user._id)) {
      const error = new Error('You can only update your own timetable slots')
      error.statusCode = 403
      throw error
    }

    const nextDay = req.body?.dayOfWeek !== undefined ? Number(req.body.dayOfWeek) : slot.dayOfWeek
    if (!Number.isInteger(nextDay) || nextDay < 0 || nextDay > 6) {
      const error = new Error('dayOfWeek must be an integer between 0 and 6')
      error.statusCode = 400
      throw error
    }

    const nextStart = req.body?.startTime !== undefined ? String(req.body.startTime).trim() : slot.startTime
    const nextEnd = req.body?.endTime !== undefined ? String(req.body.endTime).trim() : slot.endTime

    await ensureNoSlotConflict({
      teacherId: slot.teacherId,
      dayOfWeek: nextDay,
      startTime: nextStart,
      endTime: nextEnd,
      excludeSlotId: slot._id,
    })

    slot.dayOfWeek = nextDay
    slot.startTime = nextStart
    slot.endTime = nextEnd

    if (req.body?.subject !== undefined) slot.subject = String(req.body.subject).trim()
    if (req.body?.className !== undefined) slot.className = String(req.body.className).trim()
    if (req.body?.location !== undefined) slot.location = String(req.body.location).trim()

    await slot.save()
    res.json({ timetableSlot: slot.toJSON() })
  } catch (error) {
    next(error)
  }
}

async function deleteTimetableSlot(req, res, next) {
  try {
    const slot = await TeacherTimetable.findById(req.params.slotId)
    if (!slot) {
      const error = new Error('Timetable slot not found')
      error.statusCode = 404
      throw error
    }

    if (isTeacher(req.user) && String(slot.teacherId) !== String(req.user._id)) {
      const error = new Error('You can only delete your own timetable slots')
      error.statusCode = 403
      throw error
    }

    await TeacherTimetable.deleteOne({ _id: slot._id })
    res.json({ success: true })
  } catch (error) {
    next(error)
  }
}

async function checkSlotConflict(req, res, next) {
  try {
    const { teacherId, dayOfWeek, startTime, endTime } = req.body || {}

    const day = Number(dayOfWeek)
    if (!teacherId || !startTime || !endTime || !Number.isInteger(day)) {
      const error = new Error('teacherId, dayOfWeek, startTime, and endTime are required')
      error.statusCode = 400
      throw error
    }

    const startMin = toMinutes(startTime, 'startTime')
    const endMin = toMinutes(endTime, 'endTime')

    const existingSlots = await TeacherTimetable.find({ teacherId, dayOfWeek: day })
    const conflictSlot = existingSlots.find((slot) => {
      const slotStart = toMinutes(slot.startTime, 'startTime')
      const slotEnd = toMinutes(slot.endTime, 'endTime')
      return hasOverlap(startMin, endMin, slotStart, slotEnd)
    })

    res.json({
      hasConflict: Boolean(conflictSlot),
      conflictingSlot: conflictSlot ? conflictSlot.toJSON() : null,
    })
  } catch (error) {
    next(error)
  }
}

async function assignTimetableSlot(req, res, next) {
  try {
    const slot = await TeacherTimetable.findById(req.params.slotId)
    if (!slot) {
      const error = new Error('Timetable slot not found')
      error.statusCode = 404
      throw error
    }

    const { teacherId } = req.body || {}
    if (!teacherId) {
      const error = new Error('teacherId is required')
      error.statusCode = 400
      throw error
    }

    const teacher = await User.findOne({ _id: teacherId, role: 'TEACHER' })
    if (!teacher) {
      const error = new Error('Teacher not found')
      error.statusCode = 404
      throw error
    }

    await ensureNoSlotConflict({
      teacherId: teacher._id,
      dayOfWeek: slot.dayOfWeek,
      startTime: slot.startTime,
      endTime: slot.endTime,
      excludeSlotId: slot._id,
    })

    slot.teacherId = teacher._id
    slot.assignedBy = req.user._id
    await slot.save()

    await createTimetableCalendarEvents(slot, req.user._id)

    res.json({ timetableSlot: slot.toJSON() })
  } catch (error) {
    next(error)
  }
}

module.exports = {
  getTimetableSlots,
  createTimetableSlot,
  updateTimetableSlot,
  deleteTimetableSlot,
  checkSlotConflict,
  assignTimetableSlot,
}
