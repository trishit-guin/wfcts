const express = require('express')
const cors = require('cors')

const { connectToDatabase } = require('./src/config/db')
const { seedDatabase } = require('./src/utils/seed')
const authRoutes = require('./src/routes/auth')
const dataRoutes = require('./src/routes/data')

const PORT = Number(process.env.PORT) || 5000

const app = express()

app.use(
  cors({
    origin: process.env.CLIENT_URL ? [process.env.CLIENT_URL] : true,
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

async function startServer() {
  await connectToDatabase()

  if (process.env.SEED_ON_START !== 'false') {
    await seedDatabase()
  }

  app.listen(PORT, () => {
    console.log(`WFCTS backend listening on port ${PORT}`)
  })
}

startServer().catch((error) => {
  console.error('Failed to start server', error)
  process.exit(1)
})

