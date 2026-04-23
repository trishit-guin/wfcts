const TeachingAllocation = require('../models/TeachingAllocation')
const { CalendarEvent } = require('../models/CalendarEvent')
const User = require('../models/User')
const { isTeacher, serializeCollection } = require('../utils/routeHelpers')

function slotDurationHours(startTime, endTime) {
  const [sh, sm] = String(startTime).split(':').map(Number)
  const [eh, em] = String(endTime).split(':').map(Number)
  return ((eh * 60 + em) - (sh * 60 + sm)) / 60
}

async function createAllocation(req, res, next) {
  try {
    const { teacherId, subject, className, requiredHours, academicYear } = req.body

    if (!teacherId || !subject || !className || requiredHours === undefined || !academicYear) {
      const e = new Error('teacherId, subject, className, requiredHours, and academicYear are all required')
      e.statusCode = 400
      throw e
    }

    const teacher = await User.findOne({ _id: teacherId, role: 'TEACHER' })
    if (!teacher) {
      const e = new Error('Teacher not found')
      e.statusCode = 404
      throw e
    }

    const hours = Number(requiredHours)
    if (Number.isNaN(hours) || hours < 0) {
      const e = new Error('requiredHours must be a non-negative number')
      e.statusCode = 400
      throw e
    }

    const allocation = await TeachingAllocation.create({
      teacherId,
      subject: subject.trim(),
      className: className.trim(),
      requiredHours: hours,
      academicYear: academicYear.trim(),
    })

    res.status(201).json({ allocation: allocation.toJSON() })
  } catch (error) {
    if (error.code === 11000) {
      const e = new Error('An allocation for this teacher, subject, class, and academic year already exists')
      e.statusCode = 409
      next(e)
    } else {
      next(error)
    }
  }
}

async function getAllocations(req, res, next) {
  try {
    const filter = {}

    if (isTeacher(req.user)) {
      filter.teacherId = req.user._id
    } else if (req.query.teacherId) {
      filter.teacherId = req.query.teacherId
    }

    if (req.query.academicYear) filter.academicYear = req.query.academicYear

    const allocations = await TeachingAllocation.find(filter).sort({ className: 1, subject: 1 })
    res.json({ allocations: serializeCollection(allocations) })
  } catch (error) {
    next(error)
  }
}

async function updateAllocation(req, res, next) {
  try {
    const { id } = req.params
    const { requiredHours, subject, className, academicYear } = req.body

    const update = {}
    if (subject !== undefined) update.subject = String(subject).trim()
    if (className !== undefined) update.className = String(className).trim()
    if (academicYear !== undefined) update.academicYear = String(academicYear).trim()
    if (requiredHours !== undefined) {
      const hours = Number(requiredHours)
      if (Number.isNaN(hours) || hours < 0) {
        const e = new Error('requiredHours must be a non-negative number')
        e.statusCode = 400
        throw e
      }
      update.requiredHours = hours
    }

    const allocation = await TeachingAllocation.findByIdAndUpdate(id, { $set: update }, { new: true })
    if (!allocation) {
      const e = new Error('Allocation not found')
      e.statusCode = 404
      throw e
    }

    res.json({ allocation: allocation.toJSON() })
  } catch (error) {
    next(error)
  }
}

async function deleteAllocation(req, res, next) {
  try {
    const allocation = await TeachingAllocation.findByIdAndDelete(req.params.id)
    if (!allocation) {
      const e = new Error('Allocation not found')
      e.statusCode = 404
      throw e
    }
    res.json({ ok: true })
  } catch (error) {
    next(error)
  }
}

async function getHoursCompletion(req, res, next) {
  try {
    const filter = {}

    if (isTeacher(req.user)) {
      filter.teacherId = req.user._id
    } else if (req.query.teacherId) {
      filter.teacherId = req.query.teacherId
    }

    if (req.query.academicYear) filter.academicYear = req.query.academicYear

    const allocations = await TeachingAllocation.find(filter).sort({ className: 1, subject: 1 })
    if (allocations.length === 0) {
      return res.json({ completion: [] })
    }

    const teacherIds = [...new Set(allocations.map((a) => a.teacherId))]

    // Only own teaching events — excludes SUBSTITUTE_COVER so subs done for others don't count
    const events = await CalendarEvent.find({
      assignedTo: { $in: teacherIds },
      eventType: { $in: ['LECTURE', 'LAB'] },
      status: { $in: ['COMPLETED', 'SUBSTITUTED'] },
    })

    // key: `${teacherId}|${subject}|${className}|${status}`
    const hoursMap = new Map()
    for (const event of events) {
      const duration = slotDurationHours(event.startTime, event.endTime)
      if (Number.isNaN(duration) || duration <= 0) continue

      const tid = String(event.assignedTo)
      const sub = (event.subject || '').trim().toLowerCase()
      const cls = (event.className || '').trim().toLowerCase()

      const key = `${tid}|${sub}|${cls}|${event.status}`
      hoursMap.set(key, (hoursMap.get(key) || 0) + duration)
    }

    const completion = allocations.map((allocation) => {
      const tid = String(allocation.teacherId)
      const sub = allocation.subject.trim().toLowerCase()
      const cls = allocation.className.trim().toLowerCase()

      const hoursActuallyTaught = hoursMap.get(`${tid}|${sub}|${cls}|COMPLETED`) || 0
      const hoursLostToSubs = hoursMap.get(`${tid}|${sub}|${cls}|SUBSTITUTED`) || 0
      const shortfall = Math.max(0, allocation.requiredHours - hoursActuallyTaught)
      const completionPct = allocation.requiredHours > 0
        ? Math.min(100, Math.round((hoursActuallyTaught / allocation.requiredHours) * 100))
        : 100
      // at risk if substitutions account for more than 15% of required hours
      const atRisk = allocation.requiredHours > 0 && (hoursLostToSubs / allocation.requiredHours) > 0.15

      return {
        ...allocation.toJSON(),
        hoursActuallyTaught: Math.round(hoursActuallyTaught * 10) / 10,
        hoursLostToSubs: Math.round(hoursLostToSubs * 10) / 10,
        shortfall: Math.round(shortfall * 10) / 10,
        completionPct,
        atRisk,
      }
    })

    res.json({ completion })
  } catch (error) {
    next(error)
  }
}

module.exports = {
  createAllocation,
  getAllocations,
  updateAllocation,
  deleteAllocation,
  getHoursCompletion,
}
