require('dotenv').config()
const mongoose = require('mongoose')

const MONGO_URI = process.env.MONGO_URI

if (!MONGO_URI) {
  console.error('MONGO_URI is not set in environment')
  process.exit(1)
}

const args = new Set(process.argv.slice(2))
const shouldDrop = args.has('--drop')
const forceYes = args.has('--yes')

// Collection names actually used by current backend models.
const managedCollections = new Set([
  'users',
  'companies',
  'orders',
  'nools',
  'productions',
  'machinesettings',
  'expenses',
  'payments',
])

// Never touch MongoDB system collections.
const systemCollections = new Set([
  'system.indexes',
  'system.profile',
  'system.js',
])

async function run() {
  await mongoose.connect(MONGO_URI)
  const db = mongoose.connection.db

  const collections = await db.listCollections({}, { nameOnly: true }).toArray()
  const names = collections.map(c => c.name).sort()

  const rows = []
  for (const name of names) {
    const count = await db.collection(name).estimatedDocumentCount()
    rows.push({ name, count })
  }

  const orphan = rows.filter(r => !managedCollections.has(r.name) && !systemCollections.has(r.name))
  const managed = rows.filter(r => managedCollections.has(r.name))
  const emptyManaged = managed.filter(r => r.count === 0)

  console.log('\n=== DB Collection Audit ===')
  console.log(`Total collections: ${rows.length}`)
  console.log(`Managed collections found: ${managed.length}`)
  console.log(`Potential orphan collections: ${orphan.length}`)

  if (managed.length) {
    console.log('\nManaged collections:')
    for (const r of managed) {
      console.log(`- ${r.name}: ${r.count}`)
    }
  }

  if (emptyManaged.length) {
    console.log('\nManaged but empty (safe to keep; optional cleanup depending on use):')
    for (const r of emptyManaged) {
      console.log(`- ${r.name}`)
    }
  }

  if (orphan.length) {
    console.log('\nPotential orphan collections (not in current model list):')
    for (const r of orphan) {
      console.log(`- ${r.name}: ${r.count}`)
    }
  } else {
    console.log('\nNo potential orphan collections found.')
  }

  if (shouldDrop) {
    if (!forceYes) {
      console.log('\nDrop skipped: pass both --drop and --yes to confirm destructive action.')
    } else if (!orphan.length) {
      console.log('\nNothing to drop.')
    } else {
      console.log('\nDropping orphan collections...')
      for (const r of orphan) {
        await db.dropCollection(r.name)
        console.log(`Dropped: ${r.name}`)
      }
      console.log('Done.')
    }
  }

  await mongoose.disconnect()
}

run().catch(async err => {
  console.error(err)
  try { await mongoose.disconnect() } catch (_) {}
  process.exit(1)
})
