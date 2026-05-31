#!/usr/bin/env node
/**
 * MONGODB RESTORE SCRIPT
 * ──────────────────────
 * Restores a MongoDB backup using mongorestore
 * 
 * Usage:
 *   npm run db:restore /path/to/backup
 * 
 * Example:
 *   npm run db:restore "backups/development/2024-05-09T10-30-45"
 */

require('dotenv').config()
const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const backupPath = process.argv[2]
const MONGO_URI = process.env.MONGO_URI
const NODE_ENV = process.env.NODE_ENV || 'development'

if (!backupPath) {
  console.error('❌ ERROR: Backup path required')
  console.error('   Usage: npm run db:restore <path-to-backup>')
  console.error('   Example: npm run db:restore "backups/development/2024-05-09T10-30-45"')
  process.exit(1)
}

const fullPath = path.resolve(backupPath)

if (!fs.existsSync(fullPath)) {
  console.error(`❌ ERROR: Backup directory not found: ${fullPath}`)
  process.exit(1)
}

console.log('⚠️  WARNING: This will RESTORE a backup to your database!')
console.log(`   Environment: ${NODE_ENV}`)
console.log(`   Database: ${MONGO_URI.split('@')[1] || 'local'}`)
console.log(`   Backup: ${backupPath}`)
console.log('\n   Press Ctrl+C to cancel (5 seconds)...\n')

setTimeout(() => {
  try {
    console.log('⏳ Restoring backup...\n')
    execSync(`mongorestore --uri="${MONGO_URI}" "${fullPath}"`, { 
      stdio: 'inherit',
      shell: true 
    })

    console.log('\n✅ Restore completed successfully!')
    console.log(`   Database has been restored from: ${backupPath}\n`)

  } catch (error) {
    console.error('\n❌ Restore failed:', error.message)
    console.error('\n⚠️  Make sure MongoDB Database Tools is installed:')
    console.error('   Download: https://www.mongodb.com/try/download/database-tools')
    process.exit(1)
  }
}, 5000)
