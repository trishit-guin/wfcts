const WorkEntry = require('../models/WorkEntry')
const { isTeacher, toDate } = require('../utils/routeHelpers')

async function createWorkEntry(req, res, next) {
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
}

async function updateWorkEntry(req, res, next) {
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
      if (!value) { const e = new Error('Subject cannot be empty'); e.statusCode = 400; throw e }
      entry.subject = value
    }

    if (req.body?.className !== undefined) {
      const value = String(req.body.className).trim()
      if (!value) { const e = new Error('Class name cannot be empty'); e.statusCode = 400; throw e }
      entry.className = value
    }

    if (req.body?.hours !== undefined) {
      const hours = Number(req.body.hours)
      if (!Number.isFinite(hours) || hours < 0.5) {
        const e = new Error('hours must be at least 0.5'); e.statusCode = 400; throw e
      }
      entry.hours = hours
    }

    if (req.body?.workType !== undefined) {
      const value = String(req.body.workType).trim()
      if (!value) { const e = new Error('Work type cannot be empty'); e.statusCode = 400; throw e }
      entry.workType = value
    }

    if (req.body?.description !== undefined) {
      const value = String(req.body.description).trim()
      if (!value) { const e = new Error('Description cannot be empty'); e.statusCode = 400; throw e }
      entry.description = value
    }

    if (req.body?.date !== undefined) entry.date = toDate(req.body.date, 'date')

    await entry.save()
    res.json({ workEntry: entry.toJSON() })
  } catch (error) {
    next(error)
  }
}

module.exports = { createWorkEntry, updateWorkEntry }
