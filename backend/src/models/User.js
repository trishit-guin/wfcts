const mongoose = require('mongoose')

const allowedRoles = ['TEACHER', 'ADMIN', 'HOD']

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    department: {
      type: String,
      default: 'Computer Science',
      trim: true,
    },
    role: {
      type: String,
      enum: allowedRoles,
      required: true,
    },
  },
  {
    timestamps: true,
  },
)

userSchema.set('toJSON', {
  versionKey: false,
  transform: (_doc, ret) => {
    ret.id = String(ret._id)
    delete ret._id
    delete ret.passwordHash
    return ret
  },
})

module.exports = mongoose.model('User', userSchema)
