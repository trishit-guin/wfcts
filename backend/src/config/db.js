const mongoose = require('mongoose')

const DEFAULT_MONGODB_URI = 'mongodb://127.0.0.1:27017/wfcts'

async function connectToDatabase() {
  const mongoUri = process.env.MONGODB_URI || DEFAULT_MONGODB_URI

  mongoose.set('strictQuery', true)

  await mongoose.connect(mongoUri)
  console.log(`Connected to MongoDB at ${mongoUri}`)
}

module.exports = { connectToDatabase }
