require('dotenv').config()
const mongoose = require('mongoose')
const bcrypt   = require('bcryptjs')
const { User, Company, MachineSetting } = require('./models')

async function seed() {
  await mongoose.connect(process.env.MONGO_URI)
  console.log('🔌  Connected to MongoDB')

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
