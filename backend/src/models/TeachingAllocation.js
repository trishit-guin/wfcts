const mongoose = require('mongoose')

const teachingAllocationSchema = new mongoose.Schema(
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
    requiredHours: {
      type: Number,
      required: true,
      min: 0,
    },
    academicYear: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { timestamps: true },
)

teachingAllocationSchema.index(
  { teacherId: 1, subject: 1, className: 1, academicYear: 1 },
  { unique: true },
)

teachingAllocationSchema.set('toJSON', {
  versionKey: false,
  transform: (_doc, ret) => {
    ret.id = String(ret._id)
    ret.teacherId = String(ret.teacherId)
    delete ret._id
    return ret
  },
})

module.exports = mongoose.model('TeachingAllocation', teachingAllocationSchema)
