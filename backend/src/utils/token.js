const jwt = require('jsonwebtoken')

function getSecret() {
  const secret = process.env.JWT_SECRET || process.env.TOKEN_SECRET
  if (!secret) throw new Error('JWT_SECRET environment variable is not set')
  return secret
}

function createToken(payload) {
  return jwt.sign(payload, getSecret(), { expiresIn: '7d' })
}

function verifyToken(token) {
  return jwt.verify(token, getSecret())
}

module.exports = { createToken, verifyToken }
