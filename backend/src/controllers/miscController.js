const User = require('../models/User')
const WorkEntry = require('../models/WorkEntry')
const SubstituteEntry = require('../models/SubstituteEntry')
const Task = require('../models/Task')
const IndustrySession = require('../models/IndustrySession')
const TeacherTimetable = require('../models/TeacherTimetable')
const { isTeacher, serializeCollection, toMinutes, hasOverlap } = require('../utils/routeHelpers')

async function getTeachers(_req, res, next) {
  try {
    const teachers = await User.find({ role: 'TEACHER' }).sort({ name: 1 })
    res.json({ teachers: serializeCollection(teachers) })
  } catch (error) {
    next(error)
  }
}

async function getBootstrap(req, res, next) {
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
}

async function getManagers(_req, res, next) {
  try {
    const managers = await User.find({ role: { $in: ['ADMIN', 'HOD'] } }).sort({ name: 1 })
    res.json({ managers: serializeCollection(managers) })
  } catch (error) {
    next(error)
  }
}

async function getAvailableTeachers(req, res, next) {
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

    const candidates = await User.find({ role: 'TEACHER', department }).sort({ name: 1 })
    const excludedId = excludeTeacherId || (isTeacher(req.user) ? String(req.user._id) : '')
    const filteredCandidates = candidates.filter((teacher) => String(teacher._id) !== String(excludedId))
    const candidateIds = filteredCandidates.map((teacher) => teacher._id)

    const daySlots = await TeacherTimetable.find({ teacherId: { $in: candidateIds }, dayOfWeek: day })
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
}

async function patchTeacherTargets(req, res, next) {
  try {
    const { teacherId } = req.params
    const { adminHoursTarget } = req.body

    const update = {}
    if (adminHoursTarget !== undefined) {
      const val = adminHoursTarget === null ? null : Number(adminHoursTarget)
      if (adminHoursTarget !== null && (Number.isNaN(val) || val < 0)) {
        const err = new Error('adminHoursTarget must be a non-negative number or null')
        err.statusCode = 400
        throw err
      }
      update.adminHoursTarget = val
    }

    const teacher = await User.findOneAndUpdate(
      { _id: teacherId, role: 'TEACHER' },
      { $set: update },
      { new: true },
    )
    if (!teacher) {
      const err = new Error('Teacher not found')
      err.statusCode = 404
      throw err
    }

    res.json({ teacher: teacher.toJSON() })
  } catch (error) {
    next(error)
  }
}

module.exports = { getTeachers, getBootstrap, getManagers, getAvailableTeachers, patchTeacherTargets }
