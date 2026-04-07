const mongoose = require('mongoose')

const { connectToDatabase } = require('../src/config/db')
const User = require('../src/models/User')
const WorkEntry = require('../src/models/WorkEntry')
const SubstituteEntry = require('../src/models/SubstituteEntry')
const TeacherTimetable = require('../src/models/TeacherTimetable')
const Task = require('../src/models/Task')
const IndustrySession = require('../src/models/IndustrySession')
const { hashPassword } = require('../src/utils/password')

const USERS = [
  {
    key: 'ananya',
    name: 'Prof. Ananya Sharma',
    email: 'teacher@wfcts.edu',
    password: 'teacher123',
    role: 'TEACHER',
    department: 'Computer Science',
  },
  {
    key: 'neha',
    name: 'Prof. Neha Joshi',
    email: 'neha@wfcts.edu',
    password: 'teacher123',
    role: 'TEACHER',
    department: 'Computer Science',
  },
  {
    key: 'arjun',
    name: 'Prof. Arjun Mehta',
    email: 'arjun@wfcts.edu',
    password: 'teacher123',
    role: 'TEACHER',
    department: 'Computer Science',
  },
  {
    key: 'admin',
    name: 'Admin User',
    email: 'admin@wfcts.edu',
    password: 'admin123',
    role: 'ADMIN',
    department: 'Administration',
  },
  {
    key: 'hod',
    name: 'Dr. N. Verma',
    email: 'hod@wfcts.edu',
    password: 'hod123',
    role: 'HOD',
    department: 'Computer Science',
  },
]

function startOfUtcDay(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
}

function parseDaysArg() {
  const match = process.argv.find((arg) => arg.startsWith('--days='))
  const raw = match ? Number(match.split('=')[1]) : 10
  if (!Number.isInteger(raw) || raw < 1 || raw > 60) {
    throw new Error('Invalid --days argument. Use an integer from 1 to 60.')
  }
  return raw
}

async function ensureUsers() {
  const userIds = {}

  for (const user of USERS) {
    let doc = await User.findOne({ email: user.email })

    if (!doc) {
      doc = await User.create({
        name: user.name,
        email: user.email,
        passwordHash: hashPassword(user.password),
        role: user.role,
        department: user.department,
      })
    } else {
      doc.name = user.name
      doc.role = user.role
      doc.department = user.department
      await doc.save()
    }

    userIds[user.key] = doc._id
  }

  return userIds
}

function buildTimetable(teacherIds) {
  return [
    { teacherId: teacherIds.ananya, dayOfWeek: 1, startTime: '09:00', endTime: '10:00', subject: 'Data Structures', className: 'FY-A', location: 'WFCTS-Room-CS-101' },
    { teacherId: teacherIds.ananya, dayOfWeek: 3, startTime: '11:00', endTime: '12:00', subject: 'Algorithms', className: 'SY-B', location: 'WFCTS-Lab-CS-2' },
    { teacherId: teacherIds.ananya, dayOfWeek: 5, startTime: '10:00', endTime: '11:00', subject: 'DBMS', className: 'SY-A', location: 'WFCTS-Room-CS-103' },
    { teacherId: teacherIds.neha, dayOfWeek: 2, startTime: '10:00', endTime: '11:00', subject: 'Computer Networks', className: 'SY-A', location: 'WFCTS-Room-CS-201' },
    { teacherId: teacherIds.neha, dayOfWeek: 4, startTime: '09:00', endTime: '10:00', subject: 'Software Engineering', className: 'TY-A', location: 'WFCTS-Room-CS-204' },
    { teacherId: teacherIds.neha, dayOfWeek: 6, startTime: '12:00', endTime: '13:00', subject: 'Operating Systems', className: 'TY-B', location: 'WFCTS-Room-CS-210' },
    { teacherId: teacherIds.arjun, dayOfWeek: 1, startTime: '10:00', endTime: '11:00', subject: 'Physics', className: 'FY-B', location: 'WFCTS-Room-PHY-01' },
    { teacherId: teacherIds.arjun, dayOfWeek: 3, startTime: '09:00', endTime: '10:00', subject: 'Mathematics II', className: 'FY-A', location: 'WFCTS-Room-MATH-11' },
    { teacherId: teacherIds.arjun, dayOfWeek: 5, startTime: '13:00', endTime: '14:00', subject: 'Engineering Math', className: 'FY-C', location: 'WFCTS-Room-MATH-09' },
  ]
}

function buildDateWindow(days) {
  const end = startOfUtcDay(new Date())
  const start = new Date(end)
  start.setUTCDate(end.getUTCDate() - (days - 1))
  return { start, end }
}

function buildDailyData(teacherIds, start, days) {
  const workTypes = ['Lecture', 'Lab', 'Admin', 'Extra Duty']
  const workEntries = []
  const substituteEntries = []
  const industrySessions = []
  const tasks = []

  for (let i = 0; i < days; i += 1) {
    const date = new Date(start)
    date.setUTCDate(start.getUTCDate() + i)

    workEntries.push(
      {
        teacherId: teacherIds.ananya,
        subject: 'Data Structures',
        className: 'FY-A',
        hours: 2 + (i % 2),
        workType: workTypes[i % workTypes.length],
        description: `WFCTS seed: completed teaching and mentoring activities for day ${i + 1}`,
        date,
      },
      {
        teacherId: teacherIds.neha,
        subject: 'Computer Networks',
        className: 'SY-A',
        hours: 2,
        workType: workTypes[(i + 1) % workTypes.length],
        description: `WFCTS seed: practical delivery and assessment updates for day ${i + 1}`,
        date,
      },
      {
        teacherId: teacherIds.arjun,
        subject: 'Mathematics II',
        className: 'FY-B',
        hours: 1.5 + (i % 2),
        workType: workTypes[(i + 2) % workTypes.length],
        description: `WFCTS seed: classwork and remedial support for day ${i + 1}`,
        date,
      },
    )

    const pairingKey = `WFCTS-PAIR-${date.toISOString().slice(0, 10)}`

    substituteEntries.push(
      {
        teacherId: teacherIds.ananya,
        coveredFor: 'Prof. Neha Joshi',
        counterpartTeacherId: teacherIds.neha,
        date,
        status: i % 2 === 0 ? 'Pending' : 'Repaid',
        direction: 'CREDIT',
        pairingKey,
      },
      {
        teacherId: teacherIds.neha,
        coveredFor: 'Prof. Ananya Sharma',
        counterpartTeacherId: teacherIds.ananya,
        date,
        status: i % 2 === 0 ? 'Pending' : 'Repaid',
        direction: 'SUBSTITUTION',
        pairingKey,
      },
    )

    if (i % 2 === 0) {
      industrySessions.push({
        teacherId: i % 4 === 0 ? teacherIds.ananya : teacherIds.arjun,
        title: `Industry Talk Day ${i + 1}`,
        speaker: i % 4 === 0 ? 'Dr. Ritu Malhotra' : 'Mr. Karan Joshi',
        date,
        proofUploaded: i % 4 === 0,
        proofName: i % 4 === 0 ? `session-proof-day-${i + 1}.pdf` : '',
      })
    }

    tasks.push({
      title: `[SEED] Department Task Day ${i + 1}`,
      description: `Seeded departmental task for day ${i + 1}`,
      assignedBy: i % 2 === 0 ? 'Dr. N. Verma (HOD)' : 'Admin Office',
      assignTo: i % 3 === 0 ? teacherIds.ananya : i % 3 === 1 ? teacherIds.neha : teacherIds.arjun,
      deadline: date,
      status: i % 5 === 0 ? 'Completed' : 'Pending',
    })
  }

  return { workEntries, substituteEntries, industrySessions, tasks }
}

async function clearExistingSeedData(teacherIds, start, end) {
  const teacherList = [teacherIds.ananya, teacherIds.neha, teacherIds.arjun]

  await WorkEntry.deleteMany({
    teacherId: { $in: teacherList },
    date: { $gte: start, $lte: end },
  })

  await SubstituteEntry.deleteMany({
    teacherId: { $in: teacherList },
    date: { $gte: start, $lte: end },
    pairingKey: { $regex: '^WFCTS-PAIR-' },
  })

  await IndustrySession.deleteMany({
    teacherId: { $in: teacherList },
    date: { $gte: start, $lte: end },
    title: { $regex: '^Industry Talk Day ' },
  })

  await Task.deleteMany({
    assignTo: { $in: teacherList },
    title: { $regex: '^\[SEED\]' },
  })

  await TeacherTimetable.deleteMany({
    teacherId: { $in: teacherList },
    location: { $regex: '^WFCTS-' },
  })
}

async function run() {
  const days = parseDaysArg()
  await connectToDatabase()

  const teacherIds = await ensureUsers()
  const { start, end } = buildDateWindow(days)

  await clearExistingSeedData(teacherIds, start, end)

  const timetable = buildTimetable(teacherIds)
  const { workEntries, substituteEntries, industrySessions, tasks } = buildDailyData(teacherIds, start, days)

  await TeacherTimetable.insertMany(timetable)
  await WorkEntry.insertMany(workEntries)
  await SubstituteEntry.insertMany(substituteEntries)
  await IndustrySession.insertMany(industrySessions)
  await Task.insertMany(tasks)

  console.log(`Seed complete for ${days} days.`)
  console.log(`Users: ${USERS.length}, Timetable: ${timetable.length}`)
  console.log(`WorkEntries: ${workEntries.length}, SubstituteEntries: ${substituteEntries.length}`)
  console.log(`IndustrySessions: ${industrySessions.length}, Tasks: ${tasks.length}`)
}

run()
  .catch((error) => {
    console.error('Seed script failed:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await mongoose.disconnect()
  })
