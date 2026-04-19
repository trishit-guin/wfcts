const mongoose = require('mongoose')

const FAIRNESS_WEIGHTS = {
  LECTURE: 1.0,
  LAB: 1.2,
  ADMIN: 0.8,
  EXTRA_DUTY: 1.5,
  MEETING: 0.5,
  SUBSTITUTE_COVER: 2.0,
}

const EVENT_WORK_TYPE_MAP = {
  LECTURE: 'Lecture',
  LAB: 'Lab',
  ADMIN: 'Admin',
  EXTRA_DUTY: 'Extra Duty',
  MEETING: 'Admin',
  SUBSTITUTE_COVER: 'Lecture',
}

const calendarEventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: '' },
    date: { type: Date, required: true },
    startTime: { type: String, required: true }, // HH:MM
    endTime: { type: String, required: true },   // HH:MM

    eventType: {
      type: String,
      enum: Object.keys(FAIRNESS_WEIGHTS),
      required: true,
    },
    // Stored at creation time so history is preserved even if weights change
    fairnessWeight: { type: Number, required: true },

    // Who does the work
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    // Who scheduled it (may differ from assignedTo for delegation)
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    // Set when a teacher schedules on behalf of a manager (assignedTo = manager)
    onBehalfOf: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    status: {
      type: String,
      enum: ['SCHEDULED', 'PENDING_APPROVAL', 'COMPLETED', 'CANCELLED', 'SUBSTITUTED'],
      default: 'SCHEDULED',
    },

    subject: { type: String, trim: true, default: '' },
    className: { type: String, trim: true, default: '' },
    location: { type: String, trim: true, default: '' },

    // Filled in as the engine progresses
    linkedWorkEntryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'WorkEntry',
      default: null,
    },
    linkedSubstituteEntryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SubstituteEntry',
      default: null,
    },
    // Set on a sub-cover event to point back at the original
    originalEventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CalendarEvent',
      default: null,
    },
    linkedTaskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
      default: null,
    },
    source: {
      type: String,
      enum: ['manual', 'timetable'],
      default: 'manual',
    },
    timetableSlotId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TeacherTimetable',
      default: null,
    },
  },
  { timestamps: true },
)

calendarEventSchema.set('toJSON', {
  versionKey: false,
  transform: (_doc, ret) => {
    ret.id = String(ret._id)
    ret.assignedTo = String(ret.assignedTo)
    ret.createdBy = String(ret.createdBy)
    ret.onBehalfOf = ret.onBehalfOf ? String(ret.onBehalfOf) : ''
    ret.linkedWorkEntryId = ret.linkedWorkEntryId ? String(ret.linkedWorkEntryId) : ''
    ret.linkedSubstituteEntryId = ret.linkedSubstituteEntryId ? String(ret.linkedSubstituteEntryId) : ''
    ret.originalEventId = ret.originalEventId ? String(ret.originalEventId) : ''
    ret.linkedTaskId = ret.linkedTaskId ? String(ret.linkedTaskId) : ''
    ret.timetableSlotId = ret.timetableSlotId ? String(ret.timetableSlotId) : ''
    ret.date = ret.date ? new Date(ret.date).toISOString().slice(0, 10) : ''
    delete ret._id
    return ret
  },
})

module.exports = {
  CalendarEvent: mongoose.model('CalendarEvent', calendarEventSchema),
  FAIRNESS_WEIGHTS,
  EVENT_WORK_TYPE_MAP,
}
