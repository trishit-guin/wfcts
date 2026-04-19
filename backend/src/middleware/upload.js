const multer = require('multer')

const timetableUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf']
    if (allowed.includes(file.mimetype)) return cb(null, true)
    cb(new Error('Only JPG, PNG, WebP, or PDF files are allowed'))
  },
})

module.exports = { timetableUpload }
