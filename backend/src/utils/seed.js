const IndustrySession = require('../models/IndustrySession')
const SubstituteEntry = require('../models/SubstituteEntry')
const Task = require('../models/Task')
const TeacherTimetable = require('../models/TeacherTimetable')
const User = require('../models/User')
const WorkEntry = require('../models/WorkEntry')
const { hashPassword } = require('./password')
const {
  seedUsers,
  seedWorkEntries,
  seedSubstituteEntries,
  seedTimetableSlots,
  seedTasks,
  seedIndustrySessions,
} = require('../constants/seedData')

function asDate(value) {
  return new Date(value)
}

async function seedDatabase() {
  const usersByEmail = new Map()

  for (const user of seedUsers) {
    let doc = await User.findOne({ email: user.email })

    if (!doc) {
      const userData = {
        name: user.name,
        email: user.email,
        passwordHash: hashPassword(user.password),
        role: user.role,
        department: user.department,
      }

      if (user.profileImage && user.profileImage.startsWith('data:')) {
        const [meta, b64] = user.profileImage.split(';base64,')
        userData.profileImage = {
          data: Buffer.from(b64, 'base64'),
          contentType: meta.split(':')[1],
        }
      }

      doc = await User.create(userData)
    } else {
      // Update existing users with latest seed data
      doc.name = user.name
      doc.role = user.role
      doc.department = user.department

      if (user.profileImage && user.profileImage.startsWith('data:')) {
        const [meta, b64] = user.profileImage.split(';base64,')
        doc.profileImage = {
          data: Buffer.from(b64, 'base64'),
          contentType: meta.split(':')[1],
        }
      }

      await doc.save()
    }
    usersByEmail.set(user.email, doc)
  }

  // Check if we need to seed other data (only if work entries are empty)
  const existingWork = await WorkEntry.countDocuments()
  if (existingWork > 0) {
    console.log('Users updated, skipping other seed data as it already exists')
    return
  }

  await WorkEntry.insertMany(
    seedWorkEntries.map((entry) => ({
      teacherId: usersByEmail.get(entry.teacherEmail)._id,
      subject: entry.subject,
      className: entry.className,
      hours: entry.hours,
      workType: entry.workType,
      description: entry.description || `${entry.workType} work logged during initial seed`,
      date: asDate(entry.date),
    })),
  )

  await SubstituteEntry.insertMany(
    seedSubstituteEntries.map((entry) => ({
      teacherId: usersByEmail.get(entry.teacherEmail)._id,
      coveredFor: entry.coveredFor,
      counterpartTeacherId: entry.counterpartTeacherEmail
        ? usersByEmail.get(entry.counterpartTeacherEmail)?._id || null
        : null,
      date: asDate(entry.date),
      status: entry.status,
      direction: entry.direction,
      pairingKey: entry.pairingKey || '',
    })),
  )

  await TeacherTimetable.insertMany(
    seedTimetableSlots.map((slot) => ({
      teacherId: usersByEmail.get(slot.teacherEmail)._id,
      dayOfWeek: slot.dayOfWeek,
      startTime: slot.startTime,
      endTime: slot.endTime,
      subject: slot.subject || '',
      className: slot.className || '',
      location: slot.location || '',
    })),
  )

  await Task.insertMany(
    seedTasks.map((task) => ({
      title: task.title,
      description: task.description,
      assignedBy: task.assignedBy,
      assignTo: usersByEmail.get(task.assignToEmail)._id,
      deadline: asDate(task.deadline),
      status: task.status,
    })),
  )

  await IndustrySession.insertMany(
    seedIndustrySessions.map((session) => ({
      teacherId: usersByEmail.get(session.teacherEmail)._id,
      title: session.title,
      speaker: session.speaker,
      date: asDate(session.date),
      proofUploaded: session.proofUploaded,
      proofName: session.proofName,
      proofUrl: session.proofUrl || '',
    })),
  )

  console.log('Seeded initial WFCTS data')
}

module.exports = { seedDatabase }
