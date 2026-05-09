require('dotenv').config()
const mongoose = require('mongoose')
const bcrypt   = require('bcryptjs')
const { User, Company, MachineSetting } = require('./models')

// Safety check: require --force flag to prevent accidental data loss
const hasForceFlag = process.argv.includes('--force')
if (!hasForceFlag) {
  console.error('❌  ERROR: Seeding requires explicit --force flag to prevent accidental data loss')
  console.error('   Usage: npm run seed -- --force')
  console.error('   Or: node seed.js --force')
  process.exit(1)
}

async function seed() {
  await mongoose.connect(process.env.MONGO_URI)
  console.log('🔌  Connected to MongoDB')

  console.warn('⚠️  WARNING: This will DELETE all existing data in Users, Companies, and MachineSetting collections!')
  console.warn('   Press Ctrl+C now if this was not intentional (you have 3 seconds)...\n')
  
  // Give user time to cancel
  await new Promise(resolve => setTimeout(resolve, 3000))

  // Users
  await User.deleteMany({})
  await User.insertMany([
    { username: 'admin',    password: await bcrypt.hash('ashoktex', 10), role: 'admin' },
    { username: 'ashok',    password: await bcrypt.hash('ashoktex', 10), role: 'user'  },
    { username: 'arvinth',  password: await bcrypt.hash('ashoktex', 10), role: 'user'  },
    { username: 'balusamy', password: await bcrypt.hash('ashoktex', 10), role: 'user'  },
  ])
  console.log('✅  Users seeded')

  // Companies
  await Company.deleteMany({})
  await Company.insertMany([
    { name: 'Sri Exports',   defaultDeduction: 3   },
    { name: 'Raj Textiles',  defaultDeduction: 2.5 },
    { name: 'Lakshmi Co.',   defaultDeduction: 3.5 },
    { name: 'Murugan Tex',   defaultDeduction: 2   },
  ])
  console.log('✅  Companies seeded')

  // Machine setting
  await MachineSetting.deleteMany({})
  await MachineSetting.create({ count: 16 })
  console.log('✅  Machine settings seeded')

  console.log('\n🎉  Seed complete!')
  console.log('   admin     / ashoktex')
  console.log('   ashok     / ashoktex')
  console.log('   arvinth   / ashoktex')
  console.log('   balusamy  / ashoktex')

  await mongoose.disconnect()
}

seed().catch(e => { console.error(e); process.exit(1) })
