const User = require('../models/User')
const { verifyToken } = require('../utils/token')

async function requireAuth(req, _res, next) {
  try {
    const header = req.headers.authorization || ''
    const token = header.startsWith('Bearer ') ? header.slice(7).trim() : ''

    if (!token) {
      const error = new Error('Authentication required')
      error.statusCode = 401
      throw error
    }

    const payload = verifyToken(token)
    const user = await User.findById(payload.userId)

    if (!user) {
      const error = new Error('User not found for this session')
      error.statusCode = 401
      throw error
    }

    req.user = user
    req.token = token
    next()
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 401
      error.message = 'Invalid or expired session'
    }
    next(error)
  }
}

function requireRoles(...roles) {
  return (req, _res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      const error = new Error('You do not have access to this action')
      error.statusCode = 403
      return next(error)
    }

    next()
  }
}

module.exports = { requireAuth, requireRoles }
