const mongoose = require('mongoose')
const SubstituteEntry = require('../models/SubstituteEntry')
const User = require('../models/User')
const { computeChainSettlements } = require('../utils/substituteSettlement')
const { isTeacher, serializeCollection, normalizeDirection, oppositeDirection, toDate } = require('../utils/routeHelpers')

async function createSubstituteEntry(req, res, next) {
  try {
    const { coveredFor, date, status, direction, counterpartTeacherId, startTime, endTime, className, subject } = req.body || {}

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
      if (req.user.department && counterpart.department && req.user.department !== counterpart.department) {
        const error = new Error(`Substitutions must be within the same department (${req.user.department})`)
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
    const slotFields = {
      startTime: startTime ? String(startTime).trim() : '',
      endTime: endTime ? String(endTime).trim() : '',
      className: className ? String(className).trim() : '',
      subject: subject ? String(subject).trim() : '',
    }
    const entryPayload = {
      teacherId: req.user._id,
      coveredFor: counterpart ? counterpart.name : normalizedCoveredFor,
      counterpartTeacherId: counterpart ? counterpart._id : null,
      date: normalizedDate,
      status: normalizedStatus,
      direction: normalizedDirection,
      pairingKey,
      ...slotFields,
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
          ...slotFields,
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
}

async function getSubstituteSettlements(req, res, next) {
  try {
    const baseFilter = {
      status: 'Pending',
      direction: 'CREDIT',
      counterpartTeacherId: { $ne: null },
    }

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
}

module.exports = { createSubstituteEntry, getSubstituteSettlements }
