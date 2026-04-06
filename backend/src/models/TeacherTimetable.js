const mongoose = require('mongoose')

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/

function toMinutes(value) {
  const [hour, minute] = String(value).split(':').map(Number)
  return (hour * 60) + minute
}

const teacherTimetableSchema = new mongoose.Schema(
  {
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    dayOfWeek: {
      type: Number,
      enum: [0, 1, 2, 3, 4, 5, 6],
      required: true,
    },
    startTime: {
      type: String,
      required: true,
      match: timeRegex,
    },
    endTime: {
      type: String,
      required: true,
      match: timeRegex,
    },
    subject: {
      type: String,
      trim: true,
      default: '',
    },
    className: {
      type: String,
      trim: true,
      default: '',
    },
    location: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
  },
)

teacherTimetableSchema.path('endTime').validate(function validateEndTime(endTime) {
  if (!this.startTime || !endTime) return false
  return toMinutes(this.startTime) < toMinutes(endTime)
}, 'endTime must be after startTime')

teacherTimetableSchema.index({ teacherId: 1, dayOfWeek: 1, startTime: 1 })
teacherTimetableSchema.index({ dayOfWeek: 1, startTime: 1, endTime: 1 })

teacherTimetableSchema.set('toJSON', {
  versionKey: false,
  transform: (_doc, ret) => {
    ret.id = String(ret._id)
    ret.teacherId = String(ret.teacherId)
    delete ret._id
    return ret
  },
})

module.exports = mongoose.model('TeacherTimetable', teacherTimetableSchema)
