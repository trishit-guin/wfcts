require('dotenv').config()
const express = require('express')
const cors = require('cors')
const path = require('path')
const cron = require('node-cron')

const { connectToDatabase } = require('./src/config/db')
const { seedDatabase } = require('./src/utils/seed')
const authRoutes = require('./src/routes/auth')
const dataRoutes = require('./src/routes/data')

const PORT = Number(process.env.PORT) || 5000

const app = express()

app.use(
  cors({
    origin: process.env.CLIENT_URL ? [process.env.CLIENT_URL] : [],
  }),
)
app.use(express.json())

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'wfcts-backend' })
})

app.use('/api/auth', authRoutes)
app.use('/api/data', dataRoutes)

app.use((err, _req, res, _next) => {
  console.error(err)
  const status = err.statusCode || 500
  const message = err.message || 'Internal server error'
  res.status(status).json({ message })
})

// Weekly snapshot cron — runs every Monday at 00:05
function scheduleWeeklySnapshots() {
  cron.schedule('5 0 * * 1', async () => {
    try {
      const { getISOWeekId, computeWeekProgress } = require('./src/utils/weeklyProgress')
      const WeeklySnapshot = require('./src/models/WeeklySnapshot')
      const User = require('./src/models/User')

      const lastWeekDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      const weekId = getISOWeekId(lastWeekDate)
      const teachers = await User.find({ role: 'TEACHER' }, '_id').lean()

      for (const teacher of teachers) {
        const progress = await computeWeekProgress(teacher._id, weekId)
        await WeeklySnapshot.findOneAndUpdate(
          { userId: teacher._id, weekId },
          { userId: teacher._id, ...progress },
          { upsert: true },
        )
      }
      console.log(`[cron] Weekly snapshots saved for ${weekId} (${teachers.length} teachers)`)
    } catch (err) {
      console.error('[cron] Weekly snapshot error:', err)
    }
  })
}

async function startServer() {
  await connectToDatabase()

  if (process.env.SEED_ON_START !== 'false') {
    await seedDatabase()
  }

  scheduleWeeklySnapshots()

  app.listen(PORT, () => {
    console.log(`WFCTS backend listening on port ${PORT}`)
  })
}

startServer().catch((error) => {
  console.error('Failed to start server', error)
  process.exit(1)
})

