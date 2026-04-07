const mongoose = require('mongoose')

const industrySessionSchema = new mongoose.Schema(
  {
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    speaker: {
      type: String,
      required: true,
      trim: true,
    },
    date: {
      type: Date,
      required: true,
    },
    proofUploaded: {
      type: Boolean,
      default: false,
    },
    proofName: {
      type: String,
      default: '',
      trim: true,
    },
    proofUrl: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  },
)

industrySessionSchema.set('toJSON', {
  versionKey: false,
  transform: (_doc, ret) => {
    ret.id = String(ret._id)
    ret.teacherId = String(ret.teacherId)
    ret.date = ret.date ? new Date(ret.date).toISOString().slice(0, 10) : ''
    delete ret._id
    return ret
  },
})

module.exports = mongoose.model('IndustrySession', industrySessionSchema)
