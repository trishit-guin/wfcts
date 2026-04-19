const IndustrySession = require('../models/IndustrySession')
const { isTeacher, toDate } = require('../utils/routeHelpers')

async function createIndustrySession(req, res, next) {
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
}

async function updateIndustrySession(req, res, next) {
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
      if (!value) { const e = new Error('Title cannot be empty'); e.statusCode = 400; throw e }
      session.title = value
    }

    if (req.body?.speaker !== undefined) {
      const value = String(req.body.speaker).trim()
      if (!value) { const e = new Error('Speaker cannot be empty'); e.statusCode = 400; throw e }
      session.speaker = value
    }

    if (req.body?.date !== undefined) session.date = toDate(req.body.date, 'date')

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
}

module.exports = { createIndustrySession, updateIndustrySession }
