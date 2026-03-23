const express = require('express')

const { requireAuth } = require('../middleware/auth')
const User = require('../models/User')
const { hashPassword, verifyPassword } = require('../utils/password')
const { createToken } = require('../utils/token')

const router = express.Router()

router.post('/signup', async (req, res, next) => {
  try {
    const name = String(req.body?.name || '').trim()
    const email = String(req.body?.email || '').trim().toLowerCase()
    const password = String(req.body?.password || '')
    const department = String(req.body?.department || 'Computer Science').trim()

    if (!name || !email || !password) {
      const error = new Error('Name, email, and password are required')
      error.statusCode = 400
      throw error
    }

    if (password.length < 6) {
      const error = new Error('Password must be at least 6 characters long')
      error.statusCode = 400
      throw error
    }

    const existingUser = await User.findOne({ email })
    if (existingUser) {
      const error = new Error('An account with this email already exists')
      error.statusCode = 409
      throw error
    }

    const user = await User.create({
      name,
      email,
      passwordHash: hashPassword(password),
      department: department || 'Computer Science',
      role: 'TEACHER',
    })

    const token = createToken({ userId: String(user._id), role: user.role })

    res.status(201).json({
      token,
      user: user.toJSON(),
    })
  } catch (error) {
    next(error)
  }
})

router.post('/login', async (req, res, next) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase()
    const password = String(req.body?.password || '')

    if (!email || !password) {
      const error = new Error('Email and password are required')
      error.statusCode = 400
      throw error
    }

    const user = await User.findOne({ email })

    if (!user || !verifyPassword(password, user.passwordHash)) {
      const error = new Error('Invalid email or password')
      error.statusCode = 401
      throw error
    }

    const token = createToken({ userId: String(user._id), role: user.role })

    res.json({
      token,
      user: user.toJSON(),
    })
  } catch (error) {
    next(error)
  }
})

router.get('/me', requireAuth, async (req, res) => {
  res.json({ user: req.user.toJSON() })
})

module.exports = router
