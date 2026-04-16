const express = require('express')
const mongoose = require('mongoose')

const { requireAuth, requireRoles } = require('../middleware/auth')
const IndustrySession = require('../models/IndustrySession')
const SubstituteEntry = require('../models/SubstituteEntry')
const Task = require('../models/Task')
const TeacherTimetable = require('../models/TeacherTimetable')
const User = require('../models/User')
const WorkEntry = require('../models/WorkEntry')
const { CalendarEvent, FAIRNESS_WEIGHTS, EVENT_WORK_TYPE_MAP } = require('../models/CalendarEvent')
const { computeChainSettlements } = require('../utils/substituteSettlement')

const router = express.Router()

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
  const filter = {
    teacherId,
    dayOfWeek,
  }

  if (excludeSlotId) {
    filter._id = { $ne: excludeSlotId }
  }

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

router.use(requireAuth)

router.get('/teachers', async (_req, res, next) => {
  try {
    const teachers = await User.find({ role: 'TEACHER' }).sort({ name: 1 })
    res.json({ teachers: serializeCollection(teachers) })
  } catch (error) {
    next(error)
  }
})

router.get('/bootstrap', async (req, res, next) => {
  try {
    const recordFilter = isTeacher(req.user) ? { teacherId: req.user._id } : {}
    const taskFilter = isTeacher(req.user) ? { assignTo: req.user._id } : {}
    const timetableFilter = isTeacher(req.user) ? { teacherId: req.user._id } : {}

    const [teacherDirectory, workEntries, substituteEntries, tasks, industrySessions, timetableSlots] = await Promise.all([
      User.find({ role: 'TEACHER' }).sort({ name: 1 }),
      WorkEntry.find(recordFilter).sort({ date: -1, createdAt: -1 }),
      SubstituteEntry.find(recordFilter).sort({ date: -1, createdAt: -1 }),
      Task.find(taskFilter).sort({ createdAt: -1, deadline: 1 }),
      IndustrySession.find(recordFilter).sort({ date: -1, createdAt: -1 }),
      TeacherTimetable.find(timetableFilter).sort({ dayOfWeek: 1, startTime: 1, createdAt: -1 }),
    ])

    res.json({
      teacherDirectory: serializeCollection(teacherDirectory),
      workEntries: serializeCollection(workEntries),
      substituteEntries: serializeCollection(substituteEntries),
      tasks: serializeCollection(tasks),
      industrySessions: serializeCollection(industrySessions),
      timetableSlots: serializeCollection(timetableSlots),
    })
  } catch (error) {
    next(error)
  }
})

router.get('/timetable-slots', async (req, res, next) => {
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
})

router.post('/timetable-slots', async (req, res, next) => {
  try {
    const { teacherId, dayOfWeek, startTime, endTime, subject, className, location } = req.body || {}

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
      subject: subject ? String(subject).trim() : '',
      className: className ? String(className).trim() : '',
      location: location ? String(location).trim() : '',
    })

    res.status(201).json({ timetableSlot: slot.toJSON() })
  } catch (error) {
    next(error)
  }
})

router.patch('/timetable-slots/:slotId', async (req, res, next) => {
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

    if (req.body?.subject !== undefined) {
      slot.subject = String(req.body.subject).trim()
    }
    if (req.body?.className !== undefined) {
      slot.className = String(req.body.className).trim()
    }
    if (req.body?.location !== undefined) {
      slot.location = String(req.body.location).trim()
    }
    await slot.save()
    res.json({ timetableSlot: slot.toJSON() })
  } catch (error) {
    next(error)
  }
})

router.delete('/timetable-slots/:slotId', async (req, res, next) => {
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
})

router.get('/available-teachers', async (req, res, next) => {
  try {
    const { dayOfWeek, startTime, endTime, excludeTeacherId, referenceTeacherId } = req.query

    const day = Number(dayOfWeek)
    if (!Number.isInteger(day) || day < 0 || day > 6) {
      const error = new Error('dayOfWeek must be an integer between 0 and 6')
      error.statusCode = 400
      throw error
    }

    const requestedStart = toMinutes(startTime, 'startTime')
    const requestedEnd = toMinutes(endTime, 'endTime')
    if (requestedStart >= requestedEnd) {
      const error = new Error('endTime must be later than startTime')
      error.statusCode = 400
      throw error
    }

    let department = req.user.department
    if (referenceTeacherId) {
      const referenceTeacher = await User.findOne({ _id: referenceTeacherId, role: 'TEACHER' })
      if (!referenceTeacher) {
        const error = new Error('Reference teacher was not found')
        error.statusCode = 404
        throw error
      }
      department = referenceTeacher.department
    }

    const candidates = await User.find({
      role: 'TEACHER',
      department,
    }).sort({ name: 1 })

    const excludedId = excludeTeacherId || (isTeacher(req.user) ? String(req.user._id) : '')
    const filteredCandidates = candidates.filter((teacher) => String(teacher._id) !== String(excludedId))
    const candidateIds = filteredCandidates.map((teacher) => teacher._id)

    const daySlots = await TeacherTimetable.find({
      teacherId: { $in: candidateIds },
      dayOfWeek: day,
    })

    const busyTeacherIds = new Set(
      daySlots
        .filter((slot) => {
          const slotStart = toMinutes(slot.startTime, 'startTime')
          const slotEnd = toMinutes(slot.endTime, 'endTime')
          return hasOverlap(requestedStart, requestedEnd, slotStart, slotEnd)
        })
        .map((slot) => String(slot.teacherId)),
    )

    const availableTeachers = filteredCandidates.filter(
      (teacher) => !busyTeacherIds.has(String(teacher._id)),
    )

    res.json({
      dayOfWeek: day,
      startTime: String(startTime).trim(),
      endTime: String(endTime).trim(),
      availableTeachers: serializeCollection(availableTeachers),
    })
  } catch (error) {
    next(error)
  }
})

router.post('/work-entries', async (req, res, next) => {
  try {
    const { subject, className, hours, workType, description, date } = req.body || {}

    if (!subject || !className || !hours || !workType || !description || !date) {
      const error = new Error('Subject, class, hours, work type, description, and date are required')
      error.statusCode = 400
      throw error
    }

    const entry = await WorkEntry.create({
      teacherId: req.user._id,
      subject: String(subject).trim(),
      className: String(className).trim(),
      hours: Number(hours),
      workType: String(workType).trim(),
      description: String(description).trim(),
      date: toDate(date, 'date'),
    })

    res.status(201).json({ workEntry: entry.toJSON() })
  } catch (error) {
    next(error)
  }
})

router.patch('/work-entries/:entryId', async (req, res, next) => {
  try {
    const entry = await WorkEntry.findById(req.params.entryId)

    if (!entry) {
      const error = new Error('Work entry not found')
      error.statusCode = 404
      throw error
    }

    const isOwner = String(entry.teacherId) === String(req.user._id)
    const isManager = !isTeacher(req.user)
    if (!isOwner && !isManager) {
      const error = new Error('You can only update your own work entries')
      error.statusCode = 403
      throw error
    }

    if (req.body?.subject !== undefined) {
      const value = String(req.body.subject).trim()
      if (!value) {
        const error = new Error('Subject cannot be empty')
        error.statusCode = 400
        throw error
      }
      entry.subject = value
    }

    if (req.body?.className !== undefined) {
      const value = String(req.body.className).trim()
      if (!value) {
        const error = new Error('Class name cannot be empty')
        error.statusCode = 400
        throw error
      }
      entry.className = value
    }

    if (req.body?.hours !== undefined) {
      const hours = Number(req.body.hours)
      if (!Number.isFinite(hours) || hours < 0.5) {
        const error = new Error('hours must be at least 0.5')
        error.statusCode = 400
        throw error
      }
      entry.hours = hours
    }

    if (req.body?.workType !== undefined) {
      const value = String(req.body.workType).trim()
      if (!value) {
        const error = new Error('Work type cannot be empty')
        error.statusCode = 400
        throw error
      }
      entry.workType = value
    }

    if (req.body?.description !== undefined) {
      const value = String(req.body.description).trim()
      if (!value) {
        const error = new Error('Description cannot be empty')
        error.statusCode = 400
        throw error
      }
      entry.description = value
    }

    if (req.body?.date !== undefined) {
      entry.date = toDate(req.body.date, 'date')
    }

    await entry.save()
    res.json({ workEntry: entry.toJSON() })
  } catch (error) {
    next(error)
  }
})

router.post('/substitute-entries', async (req, res, next) => {
  try {
    const { coveredFor, date, status, direction, counterpartTeacherId } = req.body || {}

    if (!date) {
      const error = new Error('Date is required')
      error.statusCode = 400
      throw error
    }

    const normalizedDirection = normalizeDirection(direction)
    const normalizedStatus = status === 'Repaid' ? 'Repaid' : 'Pending'
    const normalizedDate = toDate(date, 'date')
    const normalizedCoveredFor = coveredFor ? String(coveredFor).trim() : ''

    let counterpart = null
    if (counterpartTeacherId) {
      counterpart = await User.findOne({ _id: counterpartTeacherId, role: 'TEACHER' })
      if (!counterpart) {
        const error = new Error('Counterpart teacher was not found')
        error.statusCode = 404
        throw error
      }

      if (String(counterpart._id) === String(req.user._id)) {
        const error = new Error('Counterpart teacher cannot be yourself')
        error.statusCode = 400
        throw error
      }
    }

    if (!counterpart && !normalizedCoveredFor) {
      const error = new Error('Covered-for name or counterpart teacher is required')
      error.statusCode = 400
      throw error
    }

    const pairingKey = counterpart ? String(new mongoose.Types.ObjectId()) : ''
    const entryPayload = {
      teacherId: req.user._id,
      coveredFor: counterpart ? counterpart.name : normalizedCoveredFor,
      counterpartTeacherId: counterpart ? counterpart._id : null,
      date: normalizedDate,
      status: normalizedStatus,
      direction: normalizedDirection,
      pairingKey,
    }

    const createdEntries = counterpart
      ? await SubstituteEntry.insertMany([
        entryPayload,
        {
          teacherId: counterpart._id,
          coveredFor: req.user.name,
          counterpartTeacherId: req.user._id,
          date: normalizedDate,
          status: normalizedStatus,
          direction: oppositeDirection(normalizedDirection),
          pairingKey,
        },
      ])
      : [await SubstituteEntry.create(entryPayload)]

    const ownerEntry = createdEntries.find((item) => String(item.teacherId) === String(req.user._id))

    res.status(201).json({
      substituteEntry: ownerEntry.toJSON(),
      mirrorCreated: Boolean(counterpart),
    })
  } catch (error) {
    next(error)
  }
})

router.get('/substitute-settlements', async (req, res, next) => {
  try {
    const baseFilter = {
      status: 'Pending',
      direction: 'CREDIT',
      counterpartTeacherId: { $ne: null },
    }

    // Compute settlements on the full pending linked graph so transitive chains
    // (A -> B -> C) can collapse correctly to (C -> A).
    const entries = await SubstituteEntry.find(baseFilter)
    const teachers = await User.find({ role: 'TEACHER' })
    const teacherNames = new Map(teachers.map((teacher) => [String(teacher._id), teacher.name]))
    const { settlements, balances } = computeChainSettlements(entries)

    const allBalances = balances
      .filter((item) => item.balance !== 0)
      .map((item) => ({
        ...item,
        teacherName: teacherNames.get(item.teacherId) || item.teacherId,
      }))

    const allSettlements = settlements.map((item) => ({
      ...item,
      fromTeacherName: teacherNames.get(item.fromTeacherId) || item.fromTeacherId,
      toTeacherName: teacherNames.get(item.toTeacherId) || item.toTeacherId,
    }))

    const teacherId = String(req.user._id)
    const visibleBalances = isTeacher(req.user)
      ? allBalances.filter((item) => item.teacherId === teacherId)
      : allBalances

    const visibleSettlements = isTeacher(req.user)
      ? allSettlements.filter(
        (item) => item.fromTeacherId === teacherId || item.toTeacherId === teacherId,
      )
      : allSettlements

    res.json({
      generatedAt: new Date().toISOString(),
      totalPendingLinkedCredits: entries.length,
      unsettledTeachers: allBalances.length,
      balances: visibleBalances,
      settlements: visibleSettlements,
    })
  } catch (error) {
    next(error)
  }
})

router.post('/tasks', requireRoles('ADMIN', 'HOD'), async (req, res, next) => {
  try {
    const { title, description, assignTo, deadline } = req.body || {}

    if (!title || !description || !assignTo || !deadline) {
      const error = new Error('Title, description, assignee, and deadline are required')
      error.statusCode = 400
      throw error
    }

    const assignee = await User.findOne({ _id: assignTo, role: 'TEACHER' })
    if (!assignee) {
      const error = new Error('Assigned teacher was not found')
      error.statusCode = 404
      throw error
    }

    const task = await Task.create({
      title: String(title).trim(),
      description: String(description).trim(),
      assignedBy: req.user.name,
      assignTo: assignee._id,
      deadline: toDate(deadline, 'deadline'),
      status: 'Pending',
    })

    res.status(201).json({ task: task.toJSON() })
  } catch (error) {
    next(error)
  }
})

router.patch('/tasks/:taskId', requireRoles('ADMIN', 'HOD'), async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.taskId)

    if (!task) {
      const error = new Error('Task not found')
      error.statusCode = 404
      throw error
    }

    if (req.body?.title !== undefined) {
      const value = String(req.body.title).trim()
      if (!value) {
        const error = new Error('Title cannot be empty')
        error.statusCode = 400
        throw error
      }
      task.title = value
    }

    if (req.body?.description !== undefined) {
      const value = String(req.body.description).trim()
      if (!value) {
        const error = new Error('Description cannot be empty')
        error.statusCode = 400
        throw error
      }
      task.description = value
    }

    if (req.body?.deadline !== undefined) {
      task.deadline = toDate(req.body.deadline, 'deadline')
    }

    if (req.body?.assignTo !== undefined) {
      const assignee = await User.findOne({ _id: req.body.assignTo, role: 'TEACHER' })
      if (!assignee) {
        const error = new Error('Assigned teacher was not found')
        error.statusCode = 404
        throw error
      }
      task.assignTo = assignee._id
    }

    if (req.body?.status !== undefined) {
      const status = String(req.body.status)
      if (!['Pending', 'Completed', 'Cancelled'].includes(status)) {
        const error = new Error('Invalid task status')
        error.statusCode = 400
        throw error
      }
      task.status = status
    }

    await task.save()
    res.json({ task: task.toJSON() })
  } catch (error) {
    next(error)
  }
})

router.patch('/tasks/:taskId/cancel', requireRoles('ADMIN', 'HOD'), async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.taskId)

    if (!task) {
      const error = new Error('Task not found')
      error.statusCode = 404
      throw error
    }

    task.status = 'Cancelled'
    await task.save()

    res.json({ task: task.toJSON() })
  } catch (error) {
    next(error)
  }
})

router.patch('/tasks/:taskId/complete', async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.taskId)

    if (!task) {
      const error = new Error('Task not found')
      error.statusCode = 404
      throw error
    }

    const isOwner = String(task.assignTo) === String(req.user._id)
    const isManager = !isTeacher(req.user)

    if (!isOwner && !isManager) {
      const error = new Error('You can only complete your own tasks')
      error.statusCode = 403
      throw error
    }

    task.status = 'Completed'
    await task.save()

    res.json({ task: task.toJSON() })
  } catch (error) {
    next(error)
  }
})

router.post('/industry-sessions', async (req, res, next) => {
  try {
    const { title, speaker, date, proofName } = req.body || {}

    if (!title || !speaker || !date) {
      const error = new Error('Title, speaker, and date are required')
      error.statusCode = 400
      throw error
    }

    const session = await IndustrySession.create({
      teacherId: req.user._id,
      title: String(title).trim(),
      speaker: String(speaker).trim(),
      date: toDate(date, 'date'),
      proofUploaded: Boolean(proofName),
      proofName: proofName ? String(proofName).trim() : '',
    })

    res.status(201).json({ industrySession: session.toJSON() })
  } catch (error) {
    next(error)
  }
})

router.patch('/industry-sessions/:sessionId', async (req, res, next) => {
  try {
    const session = await IndustrySession.findById(req.params.sessionId)

    if (!session) {
      const error = new Error('Industry session not found')
      error.statusCode = 404
      throw error
    }

    const isOwner = String(session.teacherId) === String(req.user._id)
    const isManager = !isTeacher(req.user)

    if (!isOwner && !isManager) {
      const error = new Error('You can only update your own industry sessions')
      error.statusCode = 403
      throw error
    }

    if (req.body?.title !== undefined) {
      const value = String(req.body.title).trim()
      if (!value) {
        const error = new Error('Title cannot be empty')
        error.statusCode = 400
        throw error
      }
      session.title = value
    }

    if (req.body?.speaker !== undefined) {
      const value = String(req.body.speaker).trim()
      if (!value) {
        const error = new Error('Speaker cannot be empty')
        error.statusCode = 400
        throw error
      }
      session.speaker = value
    }

    if (req.body?.date !== undefined) {
      session.date = toDate(req.body.date, 'date')
    }

    if (req.body?.proofName !== undefined) {
      const value = String(req.body.proofName).trim()
      session.proofName = value
      session.proofUploaded = Boolean(value)
    }

    await session.save()

    res.json({ industrySession: session.toJSON() })
  } catch (error) {
    next(error)
  }
})

// ─── Managers list (for delegation picker) ───────────────────────────────────

router.get('/managers', async (_req, res, next) => {
  try {
    const managers = await User.find({ role: { $in: ['ADMIN', 'HOD'] } }).sort({ name: 1 })
    res.json({ managers: serializeCollection(managers) })
  } catch (error) {
    next(error)
  }
})

// ─── Calendar Events ──────────────────────────────────────────────────────────

router.get('/calendar-events', async (req, res, next) => {
  try {
    const { startDate, endDate, teacherId } = req.query
    const filter = {}

    if (startDate || endDate) {
      filter.date = {}
      if (startDate) filter.date.$gte = toDate(startDate, 'startDate')
      if (endDate) {
        const end = toDate(endDate, 'endDate')
        end.setHours(23, 59, 59, 999)
        filter.date.$lte = end
      }
    }

    if (isTeacher(req.user)) {
      filter.$or = [{ assignedTo: req.user._id }, { createdBy: req.user._id }]
    } else if (teacherId) {
      filter.$or = [{ assignedTo: teacherId }, { createdBy: teacherId }]
    }

    const events = await CalendarEvent.find(filter).sort({ date: 1, startTime: 1 })
    res.json({ calendarEvents: serializeCollection(events) })
  } catch (error) {
    next(error)
  }
})

router.post('/calendar-events', async (req, res, next) => {
  try {
    const {
      title, description, date, startTime, endTime, eventType,
      assignedTo, onBehalfOf, subject, className, location, linkedTaskId,
    } = req.body || {}

    if (!title || !date || !startTime || !endTime || !eventType || !assignedTo) {
      const error = new Error('Title, date, start time, end time, event type, and assignee are required')
      error.statusCode = 400
      throw error
    }

    if (!FAIRNESS_WEIGHTS[eventType]) {
      const error = new Error(`Invalid event type. Valid types: ${Object.keys(FAIRNESS_WEIGHTS).join(', ')}`)
      error.statusCode = 400
      throw error
    }

    const startMin = toMinutes(startTime, 'startTime')
    const endMin = toMinutes(endTime, 'endTime')
    if (startMin >= endMin) {
      const error = new Error('endTime must be after startTime')
      error.statusCode = 400
      throw error
    }

    const assignee = await User.findById(assignedTo)
    if (!assignee) {
      const error = new Error('Assigned user not found')
      error.statusCode = 404
      throw error
    }

    const assigneeIsManager = assignee.role === 'ADMIN' || assignee.role === 'HOD'
    const assigneeIsOtherTeacher = assignee.role === 'TEACHER' && String(assignee._id) !== String(req.user._id)

    if (isTeacher(req.user) && assigneeIsOtherTeacher) {
      const error = new Error('Teachers can only create events for themselves or on behalf of a manager')
      error.statusCode = 403
      throw error
    }

    // Teacher scheduling for a manager → requires approval
    let status = 'SCHEDULED'
    let onBehalfOfId = null

    if (isTeacher(req.user) && assigneeIsManager) {
      status = 'PENDING_APPROVAL'
      onBehalfOfId = assignee._id
    } else if (onBehalfOf) {
      const obo = await User.findById(onBehalfOf)
      if (obo) onBehalfOfId = obo._id
    }

    let linkedTaskObjectId = null
    if (linkedTaskId) {
      const task = await Task.findById(linkedTaskId)
      if (!task) {
        const error = new Error('Linked task not found')
        error.statusCode = 404
        throw error
      }
      linkedTaskObjectId = task._id
    }

    const event = await CalendarEvent.create({
      title: String(title).trim(),
      description: description ? String(description).trim() : '',
      date: toDate(date, 'date'),
      startTime: String(startTime).trim(),
      endTime: String(endTime).trim(),
      eventType: String(eventType),
      fairnessWeight: FAIRNESS_WEIGHTS[eventType],
      assignedTo: assignee._id,
      createdBy: req.user._id,
      onBehalfOf: onBehalfOfId,
      status,
      subject: subject ? String(subject).trim() : '',
      className: className ? String(className).trim() : '',
      location: location ? String(location).trim() : '',
      linkedTaskId: linkedTaskObjectId,
    })

    res.status(201).json({ calendarEvent: event.toJSON() })
  } catch (error) {
    next(error)
  }
})

router.patch('/calendar-events/:id', async (req, res, next) => {
  try {
    const event = await CalendarEvent.findById(req.params.id)
    if (!event) {
      const error = new Error('Calendar event not found')
      error.statusCode = 404
      throw error
    }

    if (!['SCHEDULED', 'PENDING_APPROVAL'].includes(event.status)) {
      const error = new Error('Only scheduled or pending events can be edited')
      error.statusCode = 400
      throw error
    }

    const isCreator = String(event.createdBy) === String(req.user._id)
    const isAssignee = String(event.assignedTo) === String(req.user._id)
    if (!isCreator && !isAssignee && isTeacher(req.user)) {
      const error = new Error('You cannot edit this event')
      error.statusCode = 403
      throw error
    }

    if (req.body?.title !== undefined) event.title = String(req.body.title).trim()
    if (req.body?.description !== undefined) event.description = String(req.body.description).trim()
    if (req.body?.date !== undefined) event.date = toDate(req.body.date, 'date')
    if (req.body?.subject !== undefined) event.subject = String(req.body.subject).trim()
    if (req.body?.className !== undefined) event.className = String(req.body.className).trim()
    if (req.body?.location !== undefined) event.location = String(req.body.location).trim()

    if (req.body?.startTime !== undefined || req.body?.endTime !== undefined) {
      const nextStart = req.body?.startTime !== undefined ? String(req.body.startTime).trim() : event.startTime
      const nextEnd = req.body?.endTime !== undefined ? String(req.body.endTime).trim() : event.endTime
      const startMin = toMinutes(nextStart, 'startTime')
      const endMin = toMinutes(nextEnd, 'endTime')
      if (startMin >= endMin) {
        const error = new Error('endTime must be after startTime')
        error.statusCode = 400
        throw error
      }
      event.startTime = nextStart
      event.endTime = nextEnd
    }

    if (req.body?.eventType !== undefined) {
      const type = String(req.body.eventType)
      if (!FAIRNESS_WEIGHTS[type]) {
        const error = new Error('Invalid event type')
        error.statusCode = 400
        throw error
      }
      event.eventType = type
      event.fairnessWeight = FAIRNESS_WEIGHTS[type]
    }

    await event.save()
    res.json({ calendarEvent: event.toJSON() })
  } catch (error) {
    next(error)
  }
})

router.patch('/calendar-events/:id/approve', requireRoles('ADMIN', 'HOD'), async (req, res, next) => {
  try {
    const event = await CalendarEvent.findById(req.params.id)
    if (!event) {
      const error = new Error('Calendar event not found')
      error.statusCode = 404
      throw error
    }
    if (event.status !== 'PENDING_APPROVAL') {
      const error = new Error('Event is not pending approval')
      error.statusCode = 400
      throw error
    }
    event.status = 'SCHEDULED'
    await event.save()
    res.json({ calendarEvent: event.toJSON() })
  } catch (error) {
    next(error)
  }
})

router.patch('/calendar-events/:id/reject', requireRoles('ADMIN', 'HOD'), async (req, res, next) => {
  try {
    const event = await CalendarEvent.findById(req.params.id)
    if (!event) {
      const error = new Error('Calendar event not found')
      error.statusCode = 404
      throw error
    }
    if (event.status !== 'PENDING_APPROVAL') {
      const error = new Error('Event is not pending approval')
      error.statusCode = 400
      throw error
    }
    event.status = 'CANCELLED'
    await event.save()
    res.json({ calendarEvent: event.toJSON() })
  } catch (error) {
    next(error)
  }
})

router.patch('/calendar-events/:id/complete', async (req, res, next) => {
  try {
    const event = await CalendarEvent.findById(req.params.id)
    if (!event) {
      const error = new Error('Calendar event not found')
      error.statusCode = 404
      throw error
    }

    const isAssignee = String(event.assignedTo) === String(req.user._id)
    if (!isAssignee && isTeacher(req.user)) {
      const error = new Error('You can only complete events assigned to you')
      error.statusCode = 403
      throw error
    }

    if (event.status !== 'SCHEDULED') {
      const error = new Error('Only scheduled events can be marked complete')
      error.statusCode = 400
      throw error
    }

    const startMin = toMinutes(event.startTime, 'startTime')
    const endMin = toMinutes(event.endTime, 'endTime')
    const hours = Math.max(0.5, (endMin - startMin) / 60)

    const workEntry = await WorkEntry.create({
      teacherId: event.assignedTo,
      subject: event.subject || event.title,
      className: event.className || '-',
      hours,
      workType: EVENT_WORK_TYPE_MAP[event.eventType] || 'Admin',
      description: `Logged via calendar: ${event.title}`,
      date: event.date,
    })

    event.status = 'COMPLETED'
    event.linkedWorkEntryId = workEntry._id
    await event.save()

    res.json({ calendarEvent: event.toJSON(), workEntry: workEntry.toJSON() })
  } catch (error) {
    next(error)
  }
})

router.patch('/calendar-events/:id/substitute', async (req, res, next) => {
  try {
    const { substituteTeacherId } = req.body || {}
    if (!substituteTeacherId) {
      const error = new Error('substituteTeacherId is required')
      error.statusCode = 400
      throw error
    }

    const event = await CalendarEvent.findById(req.params.id)
    if (!event) {
      const error = new Error('Calendar event not found')
      error.statusCode = 404
      throw error
    }

    if (event.status !== 'SCHEDULED') {
      const error = new Error('Only scheduled events can be substituted')
      error.statusCode = 400
      throw error
    }

    const isAssignee = String(event.assignedTo) === String(req.user._id)
    if (!isAssignee && isTeacher(req.user)) {
      const error = new Error('You can only substitute your own events')
      error.statusCode = 403
      throw error
    }

    const substituteTeacher = await User.findOne({ _id: substituteTeacherId, role: 'TEACHER' })
    if (!substituteTeacher) {
      const error = new Error('Substitute teacher not found')
      error.statusCode = 404
      throw error
    }

    if (String(substituteTeacher._id) === String(event.assignedTo)) {
      const error = new Error('Substitute cannot be the same as the original assignee')
      error.statusCode = 400
      throw error
    }

    const originalTeacher = await User.findById(event.assignedTo)
    const originalName = originalTeacher ? originalTeacher.name : 'Unknown'

    const pairingKey = String(new mongoose.Types.ObjectId())
    const createdEntries = await SubstituteEntry.insertMany([
      {
        teacherId: substituteTeacher._id,
        coveredFor: originalName,
        counterpartTeacherId: event.assignedTo,
        date: event.date,
        status: 'Pending',
        direction: 'CREDIT',
        pairingKey,
      },
      {
        teacherId: event.assignedTo,
        coveredFor: originalName,
        counterpartTeacherId: substituteTeacher._id,
        date: event.date,
        status: 'Pending',
        direction: 'SUBSTITUTION',
        pairingKey,
      },
    ])

    const creditEntry = createdEntries.find(
      (e) => String(e.teacherId) === String(substituteTeacher._id),
    )

    const substituteEvent = await CalendarEvent.create({
      title: `[SUB COVER] ${event.title}`,
      description: `Substitute cover for ${originalName}${event.description ? `: ${event.description}` : ''}`,
      date: event.date,
      startTime: event.startTime,
      endTime: event.endTime,
      eventType: 'SUBSTITUTE_COVER',
      fairnessWeight: FAIRNESS_WEIGHTS.SUBSTITUTE_COVER,
      assignedTo: substituteTeacher._id,
      createdBy: req.user._id,
      status: 'SCHEDULED',
      subject: event.subject,
      className: event.className,
      location: event.location,
      originalEventId: event._id,
      linkedSubstituteEntryId: creditEntry._id,
    })

    event.status = 'SUBSTITUTED'
    event.linkedSubstituteEntryId = creditEntry._id
    await event.save()

    res.json({
      calendarEvent: event.toJSON(),
      substituteEvent: substituteEvent.toJSON(),
      substituteEntry: creditEntry.toJSON(),
    })
  } catch (error) {
    next(error)
  }
})

router.patch('/calendar-events/:id/cancel', async (req, res, next) => {
  try {
    const event = await CalendarEvent.findById(req.params.id)
    if (!event) {
      const error = new Error('Calendar event not found')
      error.statusCode = 404
      throw error
    }

    const isAssignee = String(event.assignedTo) === String(req.user._id)
    const isCreator = String(event.createdBy) === String(req.user._id)
    if (!isAssignee && !isCreator && isTeacher(req.user)) {
      const error = new Error('You cannot cancel this event')
      error.statusCode = 403
      throw error
    }

    if (['COMPLETED', 'CANCELLED'].includes(event.status)) {
      const error = new Error('Event cannot be cancelled in its current state')
      error.statusCode = 400
      throw error
    }

    event.status = 'CANCELLED'
    await event.save()
    res.json({ calendarEvent: event.toJSON() })
  } catch (error) {
    next(error)
  }
})

module.exports = router
