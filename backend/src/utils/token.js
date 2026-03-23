const jwt = require('jsonwebtoken')

function getSecret() {
  return process.env.JWT_SECRET || process.env.TOKEN_SECRET || 'wfcts-dev-secret'
}

function createToken(payload) {
  return jwt.sign(payload, getSecret(), { expiresIn: '7d' })
}

function verifyToken(token) {
  return jwt.verify(token, getSecret())
}

module.exports = { createToken, verifyToken }
