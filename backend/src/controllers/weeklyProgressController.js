const WeeklySnapshot = require('../models/WeeklySnapshot')
const { computeWeekProgress, getISOWeekId } = require('../utils/weeklyProgress')
const { isTeacher, serializeCollection } = require('../utils/routeHelpers')

async function getWeeklyProgress(req, res, next) {
  try {
    const weekId = req.query.weekId || getISOWeekId(new Date())
    let targetUserId = req.user._id
    if (!isTeacher(req.user) && req.query.teacherId) targetUserId = req.query.teacherId

    const progress = await computeWeekProgress(targetUserId, weekId)
    res.json(progress)
  } catch (error) {
    next(error)
  }
}

async function getWeeklyProgressHistory(req, res, next) {
  try {
    let targetUserId = req.user._id
    if (!isTeacher(req.user) && req.query.teacherId) targetUserId = req.query.teacherId

    const limit = Math.min(Number(req.query.limit) || 12, 52)
    const snapshots = await WeeklySnapshot.find({ userId: targetUserId })
      .sort({ weekId: -1 })
      .limit(limit)

    res.json({ snapshots: serializeCollection(snapshots) })
  } catch (error) {
    next(error)
  }
}

async function snapshotWeeklyProgress(req, res, next) {
  try {
    let targetUserId = req.user._id
    if (!isTeacher(req.user) && req.body?.teacherId) targetUserId = req.body.teacherId

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
}

module.exports = { getWeeklyProgress, getWeeklyProgressHistory, snapshotWeeklyProgress }
