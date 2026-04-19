const mongoose = require('mongoose')

const academicCalendarEventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    date: { type: Date, required: true },
    endDate: { type: Date, default: null },
    type: {
      type: String,
      enum: ['HOLIDAY', 'EXAM', 'EVENT', 'BREAK'],
      required: true,
    },
    description: { type: String, default: '', trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
)

academicCalendarEventSchema.set('toJSON', {
  versionKey: false,
  transform: (_doc, ret) => {
    ret.id = String(ret._id)
    ret.createdBy = String(ret.createdBy)
    ret.date = ret.date ? new Date(ret.date).toISOString().slice(0, 10) : ''
    ret.endDate = ret.endDate ? new Date(ret.endDate).toISOString().slice(0, 10) : ''
    delete ret._id
    return ret
  },
})

module.exports = mongoose.model('AcademicCalendarEvent', academicCalendarEventSchema)
