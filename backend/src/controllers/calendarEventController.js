const mongoose = require('mongoose')
const { CalendarEvent, FAIRNESS_WEIGHTS, EVENT_WORK_TYPE_MAP } = require('../models/CalendarEvent')
const SubstituteEntry = require('../models/SubstituteEntry')
const WorkEntry = require('../models/WorkEntry')
const Task = require('../models/Task')
const User = require('../models/User')
const { isTeacher, serializeCollection, toDate, toMinutes } = require('../utils/routeHelpers')

async function getCalendarEvents(req, res, next) {
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
}

async function createCalendarEvent(req, res, next) {
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
}

async function updateCalendarEvent(req, res, next) {
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
      if (toMinutes(nextStart, 'startTime') >= toMinutes(nextEnd, 'endTime')) {
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
}

async function approveCalendarEvent(req, res, next) {
  try {
    const event = await CalendarEvent.findById(req.params.id)
    if (!event) { const e = new Error('Calendar event not found'); e.statusCode = 404; throw e }
    if (event.status !== 'PENDING_APPROVAL') {
      const e = new Error('Event is not pending approval'); e.statusCode = 400; throw e
    }
    event.status = 'SCHEDULED'
    await event.save()
    res.json({ calendarEvent: event.toJSON() })
  } catch (error) {
    next(error)
  }
}

async function rejectCalendarEvent(req, res, next) {
  try {
    const event = await CalendarEvent.findById(req.params.id)
    if (!event) { const e = new Error('Calendar event not found'); e.statusCode = 404; throw e }
    if (event.status !== 'PENDING_APPROVAL') {
      const e = new Error('Event is not pending approval'); e.statusCode = 400; throw e
    }
    event.status = 'CANCELLED'
    await event.save()
    res.json({ calendarEvent: event.toJSON() })
  } catch (error) {
    next(error)
  }
}

async function completeCalendarEvent(req, res, next) {
  try {
    const event = await CalendarEvent.findById(req.params.id)
    if (!event) { const e = new Error('Calendar event not found'); e.statusCode = 404; throw e }

    const isAssignee = String(event.assignedTo) === String(req.user._id)
    if (!isAssignee && isTeacher(req.user)) {
      const e = new Error('You can only complete events assigned to you'); e.statusCode = 403; throw e
    }

    if (event.status !== 'SCHEDULED') {
      const e = new Error('Only scheduled events can be marked complete'); e.statusCode = 400; throw e
    }

    if (event.linkedWorkEntryId) {
      const e = new Error('Event already completed and work entry exists'); e.statusCode = 400; throw e
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
}

async function substituteCalendarEvent(req, res, next) {
  try {
    const { substituteTeacherId } = req.body || {}
    if (!substituteTeacherId) {
      const e = new Error('substituteTeacherId is required'); e.statusCode = 400; throw e
    }

    const event = await CalendarEvent.findById(req.params.id)
    if (!event) { const e = new Error('Calendar event not found'); e.statusCode = 404; throw e }

    if (event.status !== 'SCHEDULED') {
      const e = new Error('Only scheduled events can be substituted'); e.statusCode = 400; throw e
    }

    const isAssignee = String(event.assignedTo) === String(req.user._id)
    if (!isAssignee && isTeacher(req.user)) {
      const e = new Error('You can only substitute your own events'); e.statusCode = 403; throw e
    }

    const substituteTeacher = await User.findOne({ _id: substituteTeacherId, role: 'TEACHER' })
    if (!substituteTeacher) {
      const e = new Error('Substitute teacher not found'); e.statusCode = 404; throw e
    }

    if (String(substituteTeacher._id) === String(event.assignedTo)) {
      const e = new Error('Substitute cannot be the same as the original assignee'); e.statusCode = 400; throw e
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
}

async function cancelCalendarEvent(req, res, next) {
  try {
    const event = await CalendarEvent.findById(req.params.id)
    if (!event) { const e = new Error('Calendar event not found'); e.statusCode = 404; throw e }

    const isAssignee = String(event.assignedTo) === String(req.user._id)
    const isCreator = String(event.createdBy) === String(req.user._id)
    if (!isAssignee && !isCreator && isTeacher(req.user)) {
      const e = new Error('You cannot cancel this event'); e.statusCode = 403; throw e
    }

    if (['COMPLETED', 'CANCELLED'].includes(event.status)) {
      const e = new Error('Event cannot be cancelled in its current state'); e.statusCode = 400; throw e
    }

    event.status = 'CANCELLED'
    await event.save()
    res.json({ calendarEvent: event.toJSON() })
  } catch (error) {
    next(error)
  }
}

async function getUserCalendarEvents(req, res, next) {
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
}

module.exports = {
  getCalendarEvents,
  createCalendarEvent,
  updateCalendarEvent,
  approveCalendarEvent,
  rejectCalendarEvent,
  completeCalendarEvent,
  substituteCalendarEvent,
  cancelCalendarEvent,
  getUserCalendarEvents,
}
