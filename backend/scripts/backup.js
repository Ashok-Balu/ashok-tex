#!/usr/bin/env node
/**
 * MONGODB BACKUP SCRIPT
 * ─────────────────────
 * Creates timestamped backups of MongoDB database using mongodump
 * 
 * Requirements:
 *   - MongoDB Database Tools installed
 *   - mongodump available in PATH
 * 
 * Download from:
 *   https://www.mongodb.com/try/download/database-tools
 */

require('dotenv').config()
const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const MONGO_URI = process.env.MONGO_URI
const NODE_ENV = process.env.NODE_ENV || 'development'
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
const backupDir = path.join(__dirname, '..', 'backups', NODE_ENV, timestamp)

console.log('🔄 Starting MongoDB backup...\n')
console.log(`Environment: ${NODE_ENV}`)
console.log(`Database URI: ${MONGO_URI?.split('@')[1] || 'local'}`)
console.log(`Backup location: ${backupDir}\n`)

try {
  // Create backup directory if it doesn't exist
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true })
  }

  // Run mongodump
  console.log('⏳ Dumping database...')
  execSync(`mongodump --uri="${MONGO_URI}" --out="${backupDir}"`, { 
    stdio: 'inherit',
    shell: true 
  })

  // Get backup size
  const getSize = (dir) => {
    let size = 0
    const files = fs.readdirSync(dir, { withFileTypes: true })
    for (const file of files) {
      if (file.isDirectory()) {
        size += getSize(path.join(dir, file.name))
      } else {
        size += fs.statSync(path.join(dir, file.name)).size
      }
    }
    return size
  }

  const backupSize = getSize(backupDir)
  const backupSizeMB = (backupSize / 1024 / 1024).toFixed(2)

  console.log('\n✅ Backup completed successfully!')
  console.log(`📊 Backup size: ${backupSizeMB} MB`)
  console.log(`📁 Location: ${backupDir}\n`)

  // Create info file
  const infoFile = path.join(backupDir, 'BACKUP_INFO.json')
  fs.writeFileSync(infoFile, JSON.stringify({
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
    uri: MONGO_URI.split('@')[1] || 'local',
    sizeBytes: backupSize,
    sizeMB: parseFloat(backupSizeMB),
    restoreCommand: `mongorestore --uri="${MONGO_URI}" "${backupDir}"`
  }, null, 2))

  console.log('📝 Restore command saved to: BACKUP_INFO.json')

} catch (error) {
  console.error('❌ Backup failed:', error.message)
  console.error('\n⚠️  Make sure MongoDB Database Tools is installed:')
  console.error('   Download: https://www.mongodb.com/try/download/database-tools')
  process.exit(1)
}
