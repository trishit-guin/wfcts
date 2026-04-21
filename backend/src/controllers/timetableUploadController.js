const TimetableUpload = require('../models/TimetableUpload')
const TeacherTimetable = require('../models/TeacherTimetable')
const { extractTimetableWithAI } = require('../utils/aiParser')
const { createTimetableCalendarEvents } = require('../utils/weeklyProgress')
const { ensureNoSlotConflict } = require('../utils/routeHelpers')

async function uploadTimetable(req, res, next) {
  try {
    if (!req.file) {
      const error = new Error('No file uploaded')
      error.statusCode = 400
      throw error
    }

    const { buffer, mimetype, originalname } = req.file
    let parsedSlots = await extractTimetableWithAI(buffer, mimetype)

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
      rawOCRText: '',
      parsedSlots,
      status: 'parsed',
    })

    res.status(201).json({ upload: upload.toJSON() })
  } catch (error) {
    next(error)
  }
}

async function getTimetableUpload(req, res, next) {
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
}

async function updateTimetableUpload(req, res, next) {
  try {
    const upload = await TimetableUpload.findById(req.params.uploadId)
    if (!upload) {
      const error = new Error('Upload not found')
      error.statusCode = 404
      throw error
    }
    if (req.body?.parsedSlots !== undefined) upload.parsedSlots = req.body.parsedSlots
    await upload.save()
    res.json({ upload: upload.toJSON() })
  } catch (error) {
    next(error)
  }
}

async function saveTimetableUpload(req, res, next) {
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

    res.json({ saved: createdSlots.length, skipped: skipped.length, timetableSlots: createdSlots })
  } catch (error) {
    next(error)
  }
}

module.exports = { uploadTimetable, getTimetableUpload, updateTimetableUpload, saveTimetableUpload }
