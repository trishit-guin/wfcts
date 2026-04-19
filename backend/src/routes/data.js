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
const WeeklySnapshot = require('../models/WeeklySnapshot')
const TimetableUpload = require('../models/TimetableUpload')
const { computeChainSettlements } = require('../utils/substituteSettlement')
const { computeWeekProgress, getISOWeekId, createTimetableCalendarEvents } = require('../utils/weeklyProgress')
const { extractText } = require('../utils/ocrParser')
const { parseTimetableText } = require('../utils/timetableParser')
const AcademicCalendarEvent = require('../models/AcademicCalendarEvent')
const multer = require('multer')

const router = express.Router()

const timetableUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB — PDFs can be large
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf']
    if (allowed.includes(file.mimetype)) return cb(null, true)
    cb(new Error('Only JPG, PNG, WebP, or PDF files are allowed'))
  },
})

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

    // Duplicate guard — if already completed, return existing entry
    if (event.linkedWorkEntryId) {
      const error = new Error('Event already completed and work entry exists')
      error.statusCode = 400
      throw error
    }

    const workEntry = await WorkEntry.create({
      teacherId: event.assignedTo,
      subject: event.subject || event.title,
      className: event.className || '-',
      hours,
      workType: EVENT_WORK_TYPE_MAP[event.eventType] || 'Admin',
      description: `Logged via calendar: ${event.title}`,
      date: event.date,
      source: 'calendar',
      calendarEventId: event._id,
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

// ─── Weekly Progress ──────────────────────────────────────────────────────────

router.get('/weekly-progress', async (req, res, next) => {
  try {
    const weekId = req.query.weekId || getISOWeekId(new Date())
    let targetUserId = req.user._id

    if (!isTeacher(req.user) && req.query.teacherId) {
      targetUserId = req.query.teacherId
    }

    const progress = await computeWeekProgress(targetUserId, weekId)
    res.json(progress)
  } catch (error) {
    next(error)
  }
})

router.get('/weekly-progress/history', async (req, res, next) => {
  try {
    let targetUserId = req.user._id
    if (!isTeacher(req.user) && req.query.teacherId) {
      targetUserId = req.query.teacherId
    }

    const limit = Math.min(Number(req.query.limit) || 12, 52)
    const snapshots = await WeeklySnapshot.find({ userId: targetUserId })
      .sort({ weekId: -1 })
      .limit(limit)

    res.json({ snapshots: serializeCollection(snapshots) })
  } catch (error) {
    next(error)
  }
})

router.post('/weekly-progress/snapshot', async (req, res, next) => {
  try {
    let targetUserId = req.user._id
    if (!isTeacher(req.user) && req.body?.teacherId) {
      targetUserId = req.body.teacherId
    }

    const weekId = req.body?.weekId || getISOWeekId(new Date())
    const progress = await computeWeekProgress(targetUserId, weekId)

    const snapshot = await WeeklySnapshot.findOneAndUpdate(
      { userId: targetUserId, weekId },
      {
        userId: targetUserId,
        weekId,
        weekStart: new Date(progress.weekStart),
        weekEnd: new Date(progress.weekEnd),
        teachingHours: progress.teachingHours,
        otherHours: progress.otherHours,
        totalHours: progress.totalHours,
        breakdown: progress.breakdown,
      },
      { upsert: true, new: true },
    )

    res.json({ snapshot: snapshot.toJSON(), progress })
  } catch (error) {
    next(error)
  }
})

// ─── Timetable Upload (OCR → Parse → Preview) ─────────────────────────────────

router.post('/timetable-upload', requireRoles('TEACHER', 'ADMIN', 'HOD'), timetableUpload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      const error = new Error('No file uploaded')
      error.statusCode = 400
      throw error
    }

    const { buffer, mimetype, originalname } = req.file
    const rawOCRText = await extractText(buffer, mimetype)
    let parsedSlots = parseTimetableText(rawOCRText)

    // Auto-assign slots: teacher → self, admin/HOD with targetUserId → that user
    if (req.user.role === 'TEACHER') {
      const selfId = String(req.user._id)
      parsedSlots = parsedSlots.map((s) => ({ ...s, teacherId: selfId }))
    } else if (req.body.targetUserId) {
      const targetId = String(req.body.targetUserId)
      parsedSlots = parsedSlots.map((s) => ({ ...s, teacherId: targetId }))
    }

    const upload = await TimetableUpload.create({
      uploadedBy: req.user._id,
      filename: originalname,
      mimeType: mimetype,
      rawOCRText,
      parsedSlots,
      status: 'parsed',
    })

    res.status(201).json({ upload: upload.toJSON() })
  } catch (error) {
    next(error)
  }
})

router.get('/timetable-upload/:uploadId', requireRoles('TEACHER', 'ADMIN', 'HOD'), async (req, res, next) => {
  try {
    const upload = await TimetableUpload.findById(req.params.uploadId)
    if (!upload) {
      const error = new Error('Upload not found')
      error.statusCode = 404
      throw error
    }
    res.json({ upload: upload.toJSON() })
  } catch (error) {
    next(error)
  }
})

router.patch('/timetable-upload/:uploadId', requireRoles('TEACHER', 'ADMIN', 'HOD'), async (req, res, next) => {
  try {
    const upload = await TimetableUpload.findById(req.params.uploadId)
    if (!upload) {
      const error = new Error('Upload not found')
      error.statusCode = 404
      throw error
    }

    if (req.body?.parsedSlots !== undefined) {
      upload.parsedSlots = req.body.parsedSlots
    }
    await upload.save()
    res.json({ upload: upload.toJSON() })
  } catch (error) {
    next(error)
  }
})

router.post('/timetable-upload/:uploadId/save', requireRoles('TEACHER', 'ADMIN', 'HOD'), async (req, res, next) => {
  try {
    const upload = await TimetableUpload.findById(req.params.uploadId)
    if (!upload) {
      const error = new Error('Upload not found')
      error.statusCode = 404
      throw error
    }

    const slots = upload.parsedSlots.filter((s) => s.teacherId && s.startTime && s.endTime && s.day !== undefined)
    if (slots.length === 0) {
      const error = new Error('No valid assigned slots to save. Please assign teachers first.')
      error.statusCode = 400
      throw error
    }

    const createdSlots = []
    const skipped = []

    for (const s of slots) {
      try {
        await ensureNoSlotConflict({
          teacherId: s.teacherId,
          dayOfWeek: s.day,
          startTime: s.startTime,
          endTime: s.endTime,
        })

        const slot = await TeacherTimetable.create({
          teacherId: s.teacherId,
          dayOfWeek: s.day,
          startTime: s.startTime,
          endTime: s.endTime,
          subject: s.subject || '',
          className: s.className || '',
          location: s.location || '',
          eventType: s.eventType || 'LECTURE',
          assignedBy: req.user._id,
        })

        await createTimetableCalendarEvents(slot, req.user._id)
        createdSlots.push(slot.toJSON())
      } catch {
        skipped.push({ slot: s, reason: 'conflict or invalid' })
      }
    }

    upload.status = 'saved'
    await upload.save()

    res.json({
      saved: createdSlots.length,
      skipped: skipped.length,
      timetableSlots: createdSlots,
    })
  } catch (error) {
    next(error)
  }
})

// ─── Timetable Assignment (conflict check + direct assign) ────────────────────

router.post('/timetable-slots/check-conflict', requireRoles('ADMIN', 'HOD'), async (req, res, next) => {
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
})

router.patch('/timetable-slots/:slotId/assign', requireRoles('ADMIN', 'HOD'), async (req, res, next) => {
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

    // Check conflict with new teacher (excluding current slot)
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

    // Auto-create 16 weeks of CalendarEvents for this teacher
    await createTimetableCalendarEvents(slot, req.user._id)

    res.json({ timetableSlot: slot.toJSON() })
  } catch (error) {
    next(error)
  }
})

// ─── Export ───────────────────────────────────────────────────────────────────

router.get('/export/monthly', async (req, res, next) => {
  try {
    const XLSX = require('xlsx')
    const { year, month, format = 'xlsx' } = req.query

    const y = Number(year) || new Date().getFullYear()
    const m = Number(month) || new Date().getMonth() + 1

    const rangeStart = new Date(y, m - 1, 1)
    const rangeEnd = new Date(y, m, 0, 23, 59, 59, 999)

    let targetFilter = {}
    if (isTeacher(req.user)) {
      targetFilter = { teacherId: req.user._id }
    } else if (req.query.teacherId) {
      targetFilter = { teacherId: req.query.teacherId }
    }

    const teachers = await User.find({ role: 'TEACHER' })
    const nameMap = new Map(teachers.map((t) => [String(t._id), t.name]))

    // Gather completed calendar events
    const evtFilter = { date: { $gte: rangeStart, $lte: rangeEnd }, status: 'COMPLETED' }
    if (isTeacher(req.user)) evtFilter.assignedTo = req.user._id
    else if (req.query.teacherId) evtFilter.assignedTo = req.query.teacherId

    const [events, workLogs] = await Promise.all([
      CalendarEvent.find(evtFilter).sort({ date: 1 }),
      WorkEntry.find({ ...targetFilter, date: { $gte: rangeStart, $lte: rangeEnd }, source: 'manual' }).sort({ date: 1 }),
    ])

    const rows = []

    for (const evt of events) {
      const [sh, sm] = evt.startTime.split(':').map(Number)
      const [eh, em] = evt.endTime.split(':').map(Number)
      const hrs = Math.max(0.5, ((eh * 60 + em) - (sh * 60 + sm)) / 60)
      rows.push({
        Date: new Date(evt.date).toISOString().slice(0, 10),
        Teacher: nameMap.get(String(evt.assignedTo)) || String(evt.assignedTo),
        Title: evt.title,
        Type: evt.eventType,
        Subject: evt.subject || '',
        Class: evt.className || '',
        Location: evt.location || '',
        'Start Time': evt.startTime,
        'End Time': evt.endTime,
        Hours: Number(hrs.toFixed(2)),
        Source: evt.source || 'manual',
        Status: evt.status,
        'Fairness Weight': evt.fairnessWeight,
        'Fairness Points': Number((evt.fairnessWeight * hrs).toFixed(2)),
      })
    }

    for (const log of workLogs) {
      rows.push({
        Date: log.date ? new Date(log.date).toISOString().slice(0, 10) : '',
        Teacher: nameMap.get(String(log.teacherId)) || String(log.teacherId),
        Title: log.description || log.subject,
        Type: log.workType,
        Subject: log.subject || '',
        Class: log.className || '',
        Location: '',
        'Start Time': '',
        'End Time': '',
        Hours: Number(log.hours),
        Source: 'manual',
        Status: 'Completed',
        'Fairness Weight': '',
        'Fairness Points': '',
      })
    }

    rows.sort((a, b) => a.Date.localeCompare(b.Date))

    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, `${y}-${String(m).padStart(2, '0')}`)

    const filename = `wfcts-export-${y}-${String(m).padStart(2, '0')}.${format === 'csv' ? 'csv' : 'xlsx'}`
    const contentType = format === 'csv'
      ? 'text/csv'
      : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

    const fileBuffer = format === 'csv'
      ? Buffer.from(XLSX.utils.sheet_to_csv(ws))
      : XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    res.setHeader('Content-Type', contentType)
    res.send(fileBuffer)
  } catch (error) {
    next(error)
  }
})

// ─── Academic Calendar (global events visible to all) ─────────────────────────

router.get('/academic-calendar', requireAuth, async (req, res, next) => {
  try {
    const events = await AcademicCalendarEvent.find({}).sort({ date: 1 }).lean()
    res.json({
      events: events.map((e) => ({
        ...e,
        id: String(e._id),
        createdBy: String(e.createdBy),
        date: e.date ? new Date(e.date).toISOString().slice(0, 10) : '',
        endDate: e.endDate ? new Date(e.endDate).toISOString().slice(0, 10) : '',
        _id: undefined,
        __v: undefined,
      })),
    })
  } catch (error) {
    next(error)
  }
})

router.post('/academic-calendar', requireRoles('ADMIN'), async (req, res, next) => {
  try {
    const { title, date, endDate, type, description } = req.body
    if (!title || !date || !type) {
      const error = new Error('title, date, and type are required')
      error.statusCode = 400
      throw error
    }
    const event = await AcademicCalendarEvent.create({
      title: String(title).trim(),
      date: toDate(date, 'date'),
      endDate: endDate ? toDate(endDate, 'endDate') : null,
      type,
      description: description || '',
      createdBy: req.user._id,
    })
    res.status(201).json({ event: event.toJSON() })
  } catch (error) {
    next(error)
  }
})

router.delete('/academic-calendar/:id', requireRoles('ADMIN'), async (req, res, next) => {
  try {
    await AcademicCalendarEvent.findByIdAndDelete(req.params.id)
    res.json({ ok: true })
  } catch (error) {
    next(error)
  }
})

// ─── View / Edit another user's calendar (admin/HOD) ─────────────────────────

router.get('/calendar/user/:userId', requireRoles('ADMIN', 'HOD'), async (req, res, next) => {
  try {
    const filter = { assignedTo: req.params.userId }
    if (req.query.startDate) filter.date = { $gte: toDate(req.query.startDate, 'startDate') }
    if (req.query.endDate) filter.date = { ...filter.date, $lte: toDate(req.query.endDate, 'endDate') }

    const events = await CalendarEvent.find(filter).sort({ date: 1, startTime: 1 }).lean()
    res.json({
      events: events.map((e) => ({
        ...e,
        id: String(e._id),
        assignedTo: String(e.assignedTo),
        createdBy: String(e.createdBy),
        onBehalfOf: e.onBehalfOf ? String(e.onBehalfOf) : '',
        linkedWorkEntryId: e.linkedWorkEntryId ? String(e.linkedWorkEntryId) : '',
        linkedSubstituteEntryId: e.linkedSubstituteEntryId ? String(e.linkedSubstituteEntryId) : '',
        originalEventId: e.originalEventId ? String(e.originalEventId) : '',
        linkedTaskId: e.linkedTaskId ? String(e.linkedTaskId) : '',
        timetableSlotId: e.timetableSlotId ? String(e.timetableSlotId) : '',
        date: e.date ? new Date(e.date).toISOString().slice(0, 10) : '',
        _id: undefined,
        __v: undefined,
      })),
    })
  } catch (error) {
    next(error)
  }
})

module.exports = router
