const IndustrySession = require('../models/IndustrySession')
const SubstituteEntry = require('../models/SubstituteEntry')
const Task = require('../models/Task')
const User = require('../models/User')
const WorkEntry = require('../models/WorkEntry')
const { hashPassword } = require('./password')
const {
  seedUsers,
  seedWorkEntries,
  seedSubstituteEntries,
  seedTasks,
  seedIndustrySessions,
} = require('../constants/seedData')

function asDate(value) {
  return new Date(value)
}

async function seedDatabase() {
  const existingUsers = await User.countDocuments()

  if (existingUsers > 0) {
    return
  }

  const users = await User.insertMany(
    seedUsers.map((user) => ({
      name: user.name,
      email: user.email,
      passwordHash: hashPassword(user.password),
      role: user.role,
      department: user.department,
    })),
  )

  const usersByEmail = new Map(users.map((user) => [user.email, user]))

  await WorkEntry.insertMany(
    seedWorkEntries.map((entry) => ({
      teacherId: usersByEmail.get(entry.teacherEmail)._id,
      subject: entry.subject,
      className: entry.className,
      hours: entry.hours,
      workType: entry.workType,
      date: asDate(entry.date),
    })),
  )

  await SubstituteEntry.insertMany(
    seedSubstituteEntries.map((entry) => ({
      teacherId: usersByEmail.get(entry.teacherEmail)._id,
      coveredFor: entry.coveredFor,
      date: asDate(entry.date),
      status: entry.status,
      direction: entry.direction,
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
    })),
  )

  console.log('Seeded initial WFCTS data')
}

module.exports = { seedDatabase }
