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
    adminHoursTarget: {
      type: Number,
      default: null,
    },
    profileImage: {
      data: Buffer,
      contentType: String,
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
    
    // Convert Buffer back to displayable Base64 string for frontend
    if (ret.profileImage && (ret.profileImage.data || Buffer.isBuffer(ret.profileImage))) {
      let imageData = ret.profileImage.data || ret.profileImage
      let contentType = ret.profileImage.contentType || 'image/png'
      
      // Handle Mongoose Buffer serialization
      if (!Buffer.isBuffer(imageData) && imageData && imageData.type === 'Buffer') {
        imageData = Buffer.from(imageData.data)
      }
      
      if (Buffer.isBuffer(imageData)) {
        const b64 = imageData.toString('base64')
        ret.profileImage = `data:${contentType};base64,${b64}`
      } else {
        ret.profileImage = ''
      }
    } else {
      ret.profileImage = ''
    }

    delete ret._id
    delete ret.passwordHash
    return ret
  },
})

module.exports = mongoose.model('User', userSchema)
