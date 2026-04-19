/**
 * Create an ADMIN or HOD user from the command line.
 *
 * Usage:
 *   node scripts/create-user.js --role ADMIN --name "Admin User" --email admin@school.edu --password Admin123
 *   node scripts/create-user.js --role HOD   --name "Dr. Khan"   --email hod@school.edu   --password Hod12345
 *
 * Options:
 *   --role        ADMIN | HOD | TEACHER  (default: ADMIN)
 *   --name        Full name
 *   --email       Login email
 *   --password    Min 6 characters
 *   --department  Department name (default: "Administration")
 *   --update      If email already exists, update the role instead of erroring
 */

require('dotenv').config()
const { connectToDatabase } = require('../src/config/db')
const User = require('../src/models/User')
const { hashPassword } = require('../src/utils/password')

function arg(flag) {
  const idx = process.argv.indexOf(flag)
  return idx !== -1 ? process.argv[idx + 1] : null
}

const role       = (arg('--role')       || 'ADMIN').toUpperCase()
const name       = arg('--name')        || 'Admin User'
const email      = (arg('--email')      || '').toLowerCase().trim()
const password   = arg('--password')    || ''
const department = arg('--department')  || 'Administration'
const doUpdate   = process.argv.includes('--update')

const VALID_ROLES = ['ADMIN', 'HOD', 'TEACHER']

async function main() {
  if (!VALID_ROLES.includes(role)) {
    console.error(`❌  Invalid role "${role}". Must be one of: ${VALID_ROLES.join(', ')}`)
    process.exit(1)
  }
  if (!email) {
    console.error('❌  --email is required')
    process.exit(1)
  }
  if (password.length < 6) {
    console.error('❌  --password must be at least 6 characters')
    process.exit(1)
  }

  await connectToDatabase()

  const existing = await User.findOne({ email })

  if (existing) {
    if (!doUpdate) {
      console.error(`❌  A user with email "${email}" already exists.`)
      console.error('    Add --update to change their role instead.')
      process.exit(1)
    }
    existing.role = role
    existing.name = name
    existing.department = department
    existing.passwordHash = hashPassword(password)
    await existing.save()
    console.log(`✅  Updated existing user:`)
    console.log(`    Name:  ${existing.name}`)
    console.log(`    Email: ${existing.email}`)
    console.log(`    Role:  ${existing.role}`)
  } else {
    const user = await User.create({
      name,
      email,
      passwordHash: hashPassword(password),
      department,
      role,
    })
    console.log(`✅  Created new user:`)
    console.log(`    Name:  ${user.name}`)
    console.log(`    Email: ${user.email}`)
    console.log(`    Role:  ${user.role}`)
    console.log(`    ID:    ${user._id}`)
  }

  process.exit(0)
}

main().catch((err) => {
  console.error('❌  Error:', err.message)
  process.exit(1)
})
