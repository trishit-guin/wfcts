const { CalendarEvent } = require('../models/CalendarEvent')
const WorkEntry = require('../models/WorkEntry')
const User = require('../models/User')
const { isTeacher } = require('../utils/routeHelpers')

async function exportMonthly(req, res, next) {
  try {
    const XLSX = require('xlsx')
    const { year, month, format = 'xlsx' } = req.query

    const y = Number(year) || new Date().getFullYear()
    const m = Number(month) || new Date().getMonth() + 1

    const rangeStart = new Date(y, m - 1, 1)
    const rangeEnd = new Date(y, m, 0, 23, 59, 59, 999)

    let targetFilter = {}
    if (isTeacher(req.user)) {
      targetFilter = { teacherId: req.user._id }
    } else if (req.query.teacherId) {
      targetFilter = { teacherId: req.query.teacherId }
    }

    const teachers = await User.find({ role: 'TEACHER' })
    const nameMap = new Map(teachers.map((t) => [String(t._id), t.name]))

    const evtFilter = { date: { $gte: rangeStart, $lte: rangeEnd }, status: 'COMPLETED' }
    if (isTeacher(req.user)) evtFilter.assignedTo = req.user._id
    else if (req.query.teacherId) evtFilter.assignedTo = req.query.teacherId

    const [events, workLogs] = await Promise.all([
      CalendarEvent.find(evtFilter).sort({ date: 1 }),
      WorkEntry.find({ ...targetFilter, date: { $gte: rangeStart, $lte: rangeEnd }, source: 'manual' }).sort({ date: 1 }),
    ])

    const rows = []

    for (const evt of events) {
      const [sh, sm] = evt.startTime.split(':').map(Number)
      const [eh, em] = evt.endTime.split(':').map(Number)
      const hrs = Math.max(0.5, ((eh * 60 + em) - (sh * 60 + sm)) / 60)
      rows.push({
        Date: new Date(evt.date).toISOString().slice(0, 10),
        Teacher: nameMap.get(String(evt.assignedTo)) || String(evt.assignedTo),
        Title: evt.title,
        Type: evt.eventType,
        Subject: evt.subject || '',
        Class: evt.className || '',
        Location: evt.location || '',
        'Start Time': evt.startTime,
        'End Time': evt.endTime,
        Hours: Number(hrs.toFixed(2)),
        Source: evt.source || 'manual',
        Status: evt.status,
        'Fairness Weight': evt.fairnessWeight,
        'Fairness Points': Number((evt.fairnessWeight * hrs).toFixed(2)),
      })
    }

    for (const log of workLogs) {
      rows.push({
        Date: log.date ? new Date(log.date).toISOString().slice(0, 10) : '',
        Teacher: nameMap.get(String(log.teacherId)) || String(log.teacherId),
        Title: log.description || log.subject,
        Type: log.workType,
        Subject: log.subject || '',
        Class: log.className || '',
        Location: '',
        'Start Time': '',
        'End Time': '',
        Hours: Number(log.hours),
        Source: 'manual',
        Status: 'Completed',
        'Fairness Weight': '',
        'Fairness Points': '',
      })
    }

    rows.sort((a, b) => a.Date.localeCompare(b.Date))

    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, `${y}-${String(m).padStart(2, '0')}`)

    const filename = `wfcts-export-${y}-${String(m).padStart(2, '0')}.${format === 'csv' ? 'csv' : 'xlsx'}`
    const contentType = format === 'csv'
      ? 'text/csv'
      : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

    const fileBuffer = format === 'csv'
      ? Buffer.from(XLSX.utils.sheet_to_csv(ws))
      : XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    res.setHeader('Content-Type', contentType)
    res.send(fileBuffer)
  } catch (error) {
    next(error)
  }
}

module.exports = { exportMonthly }
