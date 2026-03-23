const mongoose = require('mongoose')

const workEntrySchema = new mongoose.Schema(
  {
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    className: {
      type: String,
      required: true,
      trim: true,
    },
    hours: {
      type: Number,
      required: true,
      min: 0.5,
    },
    workType: {
      type: String,
      enum: ['Lecture', 'Lab', 'Admin', 'Extra Duty'],
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  },
)

workEntrySchema.set('toJSON', {
  versionKey: false,
  transform: (_doc, ret) => {
    ret.id = String(ret._id)
    ret.teacherId = String(ret.teacherId)
    ret.date = ret.date ? new Date(ret.date).toISOString().slice(0, 10) : ''
    delete ret._id
    return ret
  },
})

module.exports = mongoose.model('WorkEntry', workEntrySchema)
