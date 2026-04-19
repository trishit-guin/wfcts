const AcademicCalendarEvent = require('../models/AcademicCalendarEvent')
const { toDate } = require('../utils/routeHelpers')

async function getAcademicCalendar(_req, res, next) {
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
}

async function createAcademicEvent(req, res, next) {
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
}

async function deleteAcademicEvent(req, res, next) {
  try {
    await AcademicCalendarEvent.findByIdAndDelete(req.params.id)
    res.json({ ok: true })
  } catch (error) {
    next(error)
  }
}

module.exports = { getAcademicCalendar, createAcademicEvent, deleteAcademicEvent }
