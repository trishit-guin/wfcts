const express = require('express')
const { requireAuth, requireRoles } = require('../middleware/auth')
const { timetableUpload } = require('../middleware/upload')

const misc = require('../controllers/miscController')
const timetable = require('../controllers/timetableController')
const workEntry = require('../controllers/workEntryController')
const substitute = require('../controllers/substituteController')
const task = require('../controllers/taskController')
const industrySession = require('../controllers/industrySessionController')
const calendarEvent = require('../controllers/calendarEventController')
const weeklyProgress = require('../controllers/weeklyProgressController')
const timetableUploadCtrl = require('../controllers/timetableUploadController')
const exportCtrl = require('../controllers/exportController')
const academicCalendar = require('../controllers/academicCalendarController')

const router = express.Router()
router.use(requireAuth)

// ─── Misc ─────────────────────────────────────────────────────────────────────
router.get('/teachers', misc.getTeachers)
router.get('/bootstrap', misc.getBootstrap)
router.get('/managers', misc.getManagers)
router.get('/available-teachers', misc.getAvailableTeachers)
router.patch('/teachers/:teacherId/targets', requireRoles('ADMIN', 'HOD'), misc.patchTeacherTargets)

// ─── Timetable Slots ──────────────────────────────────────────────────────────
router.get('/timetable-slots', timetable.getTimetableSlots)
router.post('/timetable-slots', timetable.createTimetableSlot)
router.post('/timetable-slots/check-conflict', requireRoles('ADMIN', 'HOD'), timetable.checkSlotConflict)
router.patch('/timetable-slots/:slotId', timetable.updateTimetableSlot)
router.patch('/timetable-slots/:slotId/assign', requireRoles('ADMIN', 'HOD'), timetable.assignTimetableSlot)
router.delete('/timetable-slots/:slotId', timetable.deleteTimetableSlot)

// ─── Work Entries ─────────────────────────────────────────────────────────────
router.post('/work-entries', workEntry.createWorkEntry)
router.patch('/work-entries/:entryId', workEntry.updateWorkEntry)

// ─── Substitute ───────────────────────────────────────────────────────────────
router.post('/substitute-entries', substitute.createSubstituteEntry)
router.get('/substitute-settlements', substitute.getSubstituteSettlements)

// ─── Tasks ────────────────────────────────────────────────────────────────────
router.post('/tasks', requireRoles('ADMIN', 'HOD'), task.createTask)
router.patch('/tasks/:taskId', requireRoles('ADMIN', 'HOD'), task.updateTask)
router.patch('/tasks/:taskId/cancel', requireRoles('ADMIN', 'HOD'), task.cancelTask)
router.patch('/tasks/:taskId/complete', task.completeTask)

// ─── Industry Sessions ────────────────────────────────────────────────────────
router.post('/industry-sessions', industrySession.createIndustrySession)
router.patch('/industry-sessions/:sessionId', industrySession.updateIndustrySession)

// ─── Calendar Events ──────────────────────────────────────────────────────────
router.get('/calendar-events', calendarEvent.getCalendarEvents)
router.post('/calendar-events', calendarEvent.createCalendarEvent)
router.patch('/calendar-events/:id', calendarEvent.updateCalendarEvent)
router.patch('/calendar-events/:id/approve', requireRoles('ADMIN', 'HOD'), calendarEvent.approveCalendarEvent)
router.patch('/calendar-events/:id/reject', requireRoles('ADMIN', 'HOD'), calendarEvent.rejectCalendarEvent)
router.patch('/calendar-events/:id/complete', calendarEvent.completeCalendarEvent)
router.patch('/calendar-events/:id/substitute', calendarEvent.substituteCalendarEvent)
router.patch('/calendar-events/:id/cancel', calendarEvent.cancelCalendarEvent)

// ─── Weekly Progress ──────────────────────────────────────────────────────────
router.get('/weekly-progress/history', weeklyProgress.getWeeklyProgressHistory)
router.get('/weekly-progress', weeklyProgress.getWeeklyProgress)
router.post('/weekly-progress/snapshot', weeklyProgress.snapshotWeeklyProgress)

// ─── Timetable Upload ─────────────────────────────────────────────────────────
router.post('/timetable-upload', requireRoles('TEACHER', 'ADMIN', 'HOD'), timetableUpload.single('file'), timetableUploadCtrl.uploadTimetable)
router.get('/timetable-upload/:uploadId', requireRoles('TEACHER', 'ADMIN', 'HOD'), timetableUploadCtrl.getTimetableUpload)
router.patch('/timetable-upload/:uploadId', requireRoles('TEACHER', 'ADMIN', 'HOD'), timetableUploadCtrl.updateTimetableUpload)
router.post('/timetable-upload/:uploadId/save', requireRoles('TEACHER', 'ADMIN', 'HOD'), timetableUploadCtrl.saveTimetableUpload)

// ─── Export ───────────────────────────────────────────────────────────────────
router.get('/export/monthly', exportCtrl.exportMonthly)

// ─── Academic Calendar ────────────────────────────────────────────────────────
router.get('/academic-calendar', academicCalendar.getAcademicCalendar)
router.post('/academic-calendar', requireRoles('ADMIN'), academicCalendar.createAcademicEvent)
router.delete('/academic-calendar/:id', requireRoles('ADMIN'), academicCalendar.deleteAcademicEvent)

// ─── Admin: view another user's calendar ──────────────────────────────────────
router.get('/calendar/user/:userId', requireRoles('ADMIN', 'HOD'), calendarEvent.getUserCalendarEvents)

module.exports = router
