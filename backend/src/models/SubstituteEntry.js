const mongoose = require('mongoose')

const substituteEntrySchema = new mongoose.Schema(
  {
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    coveredFor: {
      type: String,
      required: true,
      trim: true,
    },
    date: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ['Pending', 'Repaid'],
      default: 'Pending',
    },
    direction: {
      type: String,
      enum: ['CREDIT', 'SUBSTITUTION'],
      default: 'CREDIT',
    },
  },
  {
    timestamps: true,
  },
)

substituteEntrySchema.set('toJSON', {
  versionKey: false,
  transform: (_doc, ret) => {
    ret.id = String(ret._id)
    ret.teacherId = String(ret.teacherId)
    ret.date = ret.date ? new Date(ret.date).toISOString().slice(0, 10) : ''
    delete ret._id
    return ret
  },
})

module.exports = mongoose.model('SubstituteEntry', substituteEntrySchema)
