const express = require('express')
const mongoose = require('mongoose')

const { requireAuth, requireRoles } = require('../middleware/auth')
const IndustrySession = require('../models/IndustrySession')
const SubstituteEntry = require('../models/SubstituteEntry')
const Task = require('../models/Task')
const User = require('../models/User')
const WorkEntry = require('../models/WorkEntry')
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

    const [teacherDirectory, workEntries, substituteEntries, tasks, industrySessions] = await Promise.all([
      User.find({ role: 'TEACHER' }).sort({ name: 1 }),
      WorkEntry.find(recordFilter).sort({ date: -1, createdAt: -1 }),
      SubstituteEntry.find(recordFilter).sort({ date: -1, createdAt: -1 }),
      Task.find(taskFilter).sort({ createdAt: -1, deadline: 1 }),
      IndustrySession.find(recordFilter).sort({ date: -1, createdAt: -1 }),
    ])

    res.json({
      teacherDirectory: serializeCollection(teacherDirectory),
      workEntries: serializeCollection(workEntries),
      substituteEntries: serializeCollection(substituteEntries),
      tasks: serializeCollection(tasks),
      industrySessions: serializeCollection(industrySessions),
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

module.exports = router
