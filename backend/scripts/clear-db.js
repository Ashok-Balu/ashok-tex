#!/usr/bin/env node
require('dotenv').config()
const mongoose = require('mongoose')
const { User, Company, MachineSetting } = require('../models')

const hasForceFlag = process.argv.includes('--force')
const hasYesFlag = process.argv.includes('--yes')

async function clearDatabase() {
  if (!hasForceFlag) {
    console.error('❌  ERROR: Database clear requires explicit --force flag')
    console.error('   Usage: npm run db:clear -- --force')
    console.error('   Or: npm run db:clear -- --force --yes (to skip confirmation)')
    process.exit(1)
  }

  await mongoose.connect(process.env.MONGO_URI)
  console.log('🔌  Connected to MongoDB\n')

  console.warn('⚠️  WARNING: This will DELETE ALL DATA from the following collections:')
  console.warn('   • Users')
  console.warn('   • Companies')
  console.warn('   • MachineSetting')
  console.warn('   • And ALL other collections in the database\n')

  if (!hasYesFlag) {
    console.log('Press Ctrl+C now to cancel (you have 5 seconds)...\n')
    await new Promise(resolve => setTimeout(resolve, 5000))
  }

  try {
    // Get all collections and drop them
    const collections = await mongoose.connection.db.listCollections().toArray()
    
    for (const collection of collections) {
      await mongoose.connection.db.dropCollection(collection.name)
      console.log(`✅  Dropped collection: ${collection.name}`)
    }

    console.log('\n🎉  Database cleared successfully!')
    console.log('   Run "npm run seed -- --force" to seed with initial data\n')
  } catch (error) {
    console.error('❌  Error clearing database:', error.message)
    process.exit(1)
  } finally {
    await mongoose.disconnect()
  }
}

clearDatabase()
