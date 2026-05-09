#!/usr/bin/env node
/**
 * SAFE SEED SCRIPT
 * ────────────────
 * ✅ Uses upsert (update or insert) instead of delete
 * ✅ Protects production database
 * ✅ Requires explicit --force flag
 * ✅ Never deletes existing data
 */

const path = require('path')
const ENV  = process.env.NODE_ENV || 'development'
require('dotenv').config({ path: path.resolve(__dirname, `.env.${ENV}`) })
const mongoose = require('mongoose')
const bcrypt   = require('bcryptjs')
const { User, Company, MachineSetting } = require('./models')

// ── Safety Checks ──────────────────────────────────────────────────────────
const NODE_ENV      = process.env.NODE_ENV || 'development'
const hasForceFlag  = process.argv.includes('--force')
const allowProd     = process.argv.includes('--allow-prod')

// Prevent running seed in production unless --allow-prod is explicitly passed
if (NODE_ENV === 'production' && !allowProd) {
  console.error('❌ ERROR: Cannot run seed script in production environment')
  console.error('   Use: npm run seed:prod   (requires deliberate intent)')
  process.exit(1)
}

// Require --force flag
if (!hasForceFlag) {
  console.error('❌ ERROR: Seeding requires explicit --force flag')
  console.error(`   Environment: ${NODE_ENV}`)
  console.error('   Usage: npm run seed:safe -- --force')
  console.error('   Or: node seed-safe.js --force')
  process.exit(1)
}

// Sample Data
const USERS_DATA = [
  { username: 'admin',    email: 'admin@ashok-tex.local',    password: 'ashoktex', role: 'admin' },
  { username: 'ashok',    email: 'ashok@ashok-tex.local',    password: 'ashoktex', role: 'user'  },
  { username: 'arvinth',  email: 'arvinth@ashok-tex.local',  password: 'ashoktex', role: 'user'  },
  { username: 'balusamy', email: 'balusamy@ashok-tex.local', password: 'ashoktex', role: 'user'  },
]

const COMPANIES_DATA = [
  { name: 'Sri Exports',   defaultDeduction: 3   },
  { name: 'Raj Textiles',  defaultDeduction: 2.5 },
  { name: 'Lakshmi Co.',   defaultDeduction: 3.5 },
  { name: 'Murugan Tex',   defaultDeduction: 2   },
]

async function seed() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI)
    console.log(`🔌 Connected to MongoDB (${NODE_ENV})`)

    console.warn('\n⚠️  SEEDING IN SAFE MODE')
    console.warn('   Using UPSERT: Updates existing records, inserts new ones')
    console.warn('   NO DATA WILL BE DELETED\n')

    // ── Seed Users ──────────────────────────────────────────────────────────
    console.log('📝 Processing users...')
    let usersCreated = 0
    let usersUpdated = 0

    for (const userData of USERS_DATA) {
      const hashedPassword = await bcrypt.hash(userData.password, 12)
      
      const result = await User.updateOne(
        { username: userData.username.toLowerCase() },
        {
          $set: {
            username: userData.username.toLowerCase(),
            email: userData.email,
            password: hashedPassword,
            role: userData.role,
          }
        },
        { upsert: true }
      )

      if (result.upsertedId) {
        usersCreated++
        console.log(`  ✅ Created: ${userData.username}`)
      } else if (result.modifiedCount > 0) {
        usersUpdated++
        console.log(`  🔄 Updated: ${userData.username}`)
      } else {
        console.log(`  ⊘ Already exists: ${userData.username}`)
      }
    }
    console.log(`\n   Created: ${usersCreated} | Updated: ${usersUpdated}\n`)

    // ── Seed Companies ──────────────────────────────────────────────────────
    console.log('📝 Processing companies...')
    let companiesCreated = 0
    let companiesUpdated = 0

    for (const companyData of COMPANIES_DATA) {
      const result = await Company.updateOne(
        { name: companyData.name },
        {
          $set: {
            name: companyData.name,
            defaultDeduction: companyData.defaultDeduction,
          }
        },
        { upsert: true }
      )

      if (result.upsertedId) {
        companiesCreated++
        console.log(`  ✅ Created: ${companyData.name}`)
      } else if (result.modifiedCount > 0) {
        companiesUpdated++
        console.log(`  🔄 Updated: ${companyData.name}`)
      } else {
        console.log(`  ⊘ Already exists: ${companyData.name}`)
      }
    }
    console.log(`\n   Created: ${companiesCreated} | Updated: ${companiesUpdated}\n`)

    // ── Seed Machine Setting ────────────────────────────────────────────────
    console.log('📝 Processing machine settings...')
    const machineResult = await MachineSetting.updateOne(
      {},
      { $set: { count: 16 } },
      { upsert: true }
    )

    if (machineResult.upsertedId) {
      console.log(`  ✅ Created: Machine settings (16 machines)`)
    } else if (machineResult.modifiedCount > 0) {
      console.log(`  🔄 Updated: Machine settings (16 machines)`)
    } else {
      console.log(`  ⊘ Already exists: Machine settings`)
    }

    console.log('\n🎉 Seed complete!')
    console.log('   All data safely processed in UPSERT mode')
    console.log('   No existing data was deleted\n')

  } catch (error) {
    console.error('❌ Seed failed:', error.message)
    process.exit(1)
  } finally {
    await mongoose.disconnect()
  }
}

// Run seed
seed()
