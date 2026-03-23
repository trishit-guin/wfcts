const mongoose = require('mongoose')

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    assignedBy: {
      type: String,
      required: true,
      trim: true,
    },
    assignTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    deadline: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ['Pending', 'Completed'],
      default: 'Pending',
    },
  },
  {
    timestamps: true,
  },
)

taskSchema.set('toJSON', {
  versionKey: false,
  transform: (_doc, ret) => {
    ret.id = String(ret._id)
    ret.assignTo = String(ret.assignTo)
    ret.deadline = ret.deadline ? new Date(ret.deadline).toISOString().slice(0, 10) : ''
    delete ret._id
    return ret
  },
})

module.exports = mongoose.model('Task', taskSchema)
