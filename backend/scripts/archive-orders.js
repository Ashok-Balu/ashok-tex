const path = require('path')
const ENV = process.env.NODE_ENV || 'development'
require('dotenv').config({ path: path.resolve(__dirname, `../.env.${ENV}`) })

const mongoose = require('mongoose')
const { archiveOldClosedOrders } = require('../services/archiveOrders')

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI)
    const months = Number(process.env.ARCHIVE_AFTER_MONTHS || 3)
    const result = await archiveOldClosedOrders({ months })
    console.log(`Archive complete: archived=${result.archived}, matched=${result.matched}, cutoff=${result.cutoff.toISOString()}`)
    process.exit(0)
  } catch (e) {
    console.error('Archive failed:', e.message)
    process.exit(1)
  }
}

run()
