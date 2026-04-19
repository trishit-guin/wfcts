const mongoose = require('mongoose')

const parsedSlotSchema = new mongoose.Schema({
  day: { type: Number, min: 0, max: 6 },       // 0=Sun…6=Sat
  startTime: { type: String },                   // HH:MM
  endTime: { type: String },                     // HH:MM
  subject: { type: String, default: '' },
  className: { type: String, default: '' },
  location: { type: String, default: '' },
  eventType: { type: String, enum: ['LECTURE', 'LAB', 'ADMIN', 'EXTRA_DUTY', 'MEETING'], default: 'LECTURE' },
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  confidence: { type: Number, default: 1 },     // 0–1, parser confidence
  _rowId: { type: String },                      // client-side stable key
}, { _id: false })

const timetableUploadSchema = new mongoose.Schema(
  {
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    filename: { type: String, required: true },
    mimeType: { type: String, default: '' },
    rawOCRText: { type: String, default: '' },
    parsedSlots: { type: [parsedSlotSchema], default: [] },
    status: {
      type: String,
      enum: ['parsed', 'assigned', 'saved'],
      default: 'parsed',
    },
  },
  { timestamps: true },
)

timetableUploadSchema.set('toJSON', {
  versionKey: false,
  transform: (_doc, ret) => {
    ret.id = String(ret._id)
    ret.uploadedBy = String(ret.uploadedBy)
    ret.parsedSlots = (ret.parsedSlots || []).map((s) => ({
      ...s,
      teacherId: s.teacherId ? String(s.teacherId) : '',
    }))
    delete ret._id
    return ret
  },
})

module.exports = mongoose.model('TimetableUpload', timetableUploadSchema)
