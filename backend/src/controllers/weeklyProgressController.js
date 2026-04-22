const WeeklySnapshot = require('../models/WeeklySnapshot')
const { computeWeekProgress, getISOWeekId } = require('../utils/weeklyProgress')
const { isTeacher, serializeCollection } = require('../utils/routeHelpers')

async function getWeeklyProgress(req, res, next) {
  try {
    const weekId = req.query.weekId || getISOWeekId(new Date())
    let targetUserId = req.user._id
    if (!isTeacher(req.user) && req.query.teacherId) targetUserId = req.query.teacherId

    const progress = await computeWeekProgress(targetUserId, weekId)
    res.json({ progress })
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

    const history = snapshots.map((s) => {
      const obj = s.toJSON()
      const tTeach = obj.teachingTarget || 0
      const tAdmin = obj.adminTarget ?? null
      const tTotal = tAdmin != null ? tTeach + tAdmin : tTeach
      obj.targets = { teaching: tTeach, admin: tAdmin, total: tTotal }
      obj.percentages = {
        teaching: tTeach > 0 ? Math.min(100, Math.round((obj.teachingHours / tTeach) * 100)) : 0,
        other: tAdmin > 0 ? Math.min(100, Math.round((obj.otherHours / tAdmin) * 100)) : 0,
        total: tTotal > 0 ? Math.min(100, Math.round((obj.totalHours / tTotal) * 100)) : 0,
      }
      return obj
    })

    res.json({ history })
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
        teachingTarget: progress.targets.teaching,
        adminTarget: progress.targets.admin,
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
