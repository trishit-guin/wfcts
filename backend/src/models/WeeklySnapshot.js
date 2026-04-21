const mongoose = require('mongoose')

const weeklySnapshotSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    weekId: { type: String, required: true }, // e.g. '2026-W16'
    weekStart: { type: Date, required: true },
    weekEnd: { type: Date, required: true },

    teachingHours: { type: Number, default: 0 },
    otherHours: { type: Number, default: 0 },
    totalHours: { type: Number, default: 0 },
    teachingTarget: { type: Number, default: 20 },

    breakdown: {
      lectureHours:    { type: Number, default: 0 },
      labHours:        { type: Number, default: 0 },
      subCoverHours:   { type: Number, default: 0 },
      adminHours:      { type: Number, default: 0 },
      extraDutyHours:  { type: Number, default: 0 },
      meetingHours:    { type: Number, default: 0 },
      manualLogHours:  { type: Number, default: 0 },
    },
  },
  { timestamps: true },
)

weeklySnapshotSchema.index({ userId: 1, weekId: 1 }, { unique: true })

weeklySnapshotSchema.set('toJSON', {
  versionKey: false,
  transform: (_doc, ret) => {
    ret.id = String(ret._id)
    ret.userId = String(ret.userId)
    ret.weekStart = ret.weekStart ? ret.weekStart.toISOString().slice(0, 10) : ''
    ret.weekEnd = ret.weekEnd ? ret.weekEnd.toISOString().slice(0, 10) : ''
    delete ret._id
    return ret
  },
})

module.exports = mongoose.model('WeeklySnapshot', weeklySnapshotSchema)
