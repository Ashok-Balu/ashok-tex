/**
 * Migration script: Convert existing orders to the new close-order flow.
 *
 * What it does:
 * 1. Orders with archived=true & financialClosed=true → status='closed', closedAmount from totalReceived
 * 2. Orders with productionClosed=true (not archived) → status='production_complete'
 * 3. All other orders → status='open'
 * 4. Payments with transactionType='payment' → transactionType='receipt'
 *
 * Safe to run multiple times (idempotent).
 *
 * Usage:
 *   DRY_RUN=1 node scripts/migrate-to-close-flow.js   # preview changes without writing
 *   node scripts/migrate-to-close-flow.js              # apply changes
 *
 * IMPORTANT: Take a database backup before running in production!
 *   mongodump --uri="<your-mongo-uri>" --out=./backup-before-migration
 */

const path = require('path')
const ENV = process.env.NODE_ENV || 'development'
require('dotenv').config({ path: path.resolve(__dirname, `../.env.${ENV}`) })
require('dotenv').config({ path: path.resolve(__dirname, '../.env') })
const mongoose = require('mongoose')
const { Order, Payment } = require('../models')

const DRY_RUN = process.env.DRY_RUN === '1'

async function migrate() {
  const uri = process.env.MONGO_URI
  if (!uri) {
    console.error('MONGO_URI not set')
    process.exit(1)
  }

  await mongoose.connect(uri)
  console.log('Connected to MongoDB')
  if (DRY_RUN) console.log('⚠️  DRY RUN MODE — no changes will be written\n')

  // ── Step 1: Closed orders (archived + financial closed) ─────────────────────
  const closedOrders = await Order.find({
    archived: true,
    financialClosed: true,
    status: { $ne: 'closed' },
  }).lean()

  console.log(`\nStep 1: ${closedOrders.length} orders to mark as 'closed'`)

  for (const order of closedOrders) {
    const producedMeter = Number(order.producedMeter || 0)
    const rejectedMeter = Number(order.rejectedMeter || 0)
    const acceptedMeter = Number(order.acceptedMeter || Math.max(0, producedMeter - rejectedMeter))
    const ratePerMeter = Number(order.ratePerMeter || 0)
    const deductionPct = Number(order.deductionPct || 0)
    const totalValue = acceptedMeter * ratePerMeter
    const deductionAmount = totalValue * (deductionPct / 100)
    const payableAmount = Math.max(0, totalValue - deductionAmount)

    // Use totalReceived if available, otherwise compute payable
    const closedAmount = Number(order.totalReceived || 0) > 0
      ? Number(order.totalReceived)
      : payableAmount

    if (!DRY_RUN) {
      await Order.updateOne(
        { _id: order._id },
        {
          $set: {
            status: 'closed',
            closedAmount: closedAmount,
            closedDeduction: deductionAmount,
            closedAt: order.archivedAt || order.updatedAt || new Date(),
            closedBy: 'migration',
          },
        }
      )
    }
    console.log(`  ${DRY_RUN ? '○' : '✓'} ${order.orderName} → closed (₹${Math.round(closedAmount)})`)
  }

  // ── Step 2: Production complete orders ──────────────────────────────────────
  const prodCompleteOrders = await Order.find({
    productionClosed: true,
    $or: [{ archived: { $ne: true } }, { financialClosed: { $ne: true } }],
    status: { $nin: ['closed', 'production_complete'] },
  }).lean()

  console.log(`\nStep 2: ${prodCompleteOrders.length} orders to mark as 'production_complete'`)

  for (const order of prodCompleteOrders) {
    if (!DRY_RUN) {
      await Order.updateOne(
        { _id: order._id },
        { $set: { status: 'production_complete' } }
      )
    }
    console.log(`  ${DRY_RUN ? '○' : '✓'} ${order.orderName} → production_complete`)
  }

  // ── Step 3: Open orders ─────────────────────────────────────────────────────
  const openOrders = await Order.find({
    productionClosed: { $ne: true },
    archived: { $ne: true },
    status: { $nin: ['open', 'closed', 'production_complete'] },
  }).lean()

  console.log(`\nStep 3: ${openOrders.length} orders to mark as 'open'`)

  for (const order of openOrders) {
    if (!DRY_RUN) {
      await Order.updateOne(
        { _id: order._id },
        { $set: { status: 'open' } }
      )
    }
    console.log(`  ${DRY_RUN ? '○' : '✓'} ${order.orderName} → open`)
  }

  // ── Step 4: Migrate payment transactionType ─────────────────────────────────
  const paymentsToMigrate = await Payment.countDocuments({ transactionType: 'payment' })
  if (!DRY_RUN && paymentsToMigrate > 0) {
    const paymentResult = await Payment.updateMany(
      { transactionType: 'payment' },
      { $set: { transactionType: 'receipt' } }
    )
    console.log(`\nStep 4: ${paymentResult.modifiedCount} payments updated (payment → receipt)`)
  } else {
    console.log(`\nStep 4: ${paymentsToMigrate} payments to update (payment → receipt)${DRY_RUN ? ' [DRY RUN]' : ' (none to update)'}`)
  }

  // ── Summary ─────────────────────────────────────────────────────────────────
  const counts = await Order.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ])
  console.log('\n── Final Order Status Counts ──')
  for (const row of counts) {
    console.log(`  ${row._id}: ${row.count}`)
  }

  const paymentCounts = await Payment.aggregate([
    { $group: { _id: '$transactionType', count: { $sum: 1 } } },
  ])
  console.log('\n── Final Payment Type Counts ──')
  for (const row of paymentCounts) {
    console.log(`  ${row._id}: ${row.count}`)
  }

  console.log('\n✅ Migration complete!')
  await mongoose.disconnect()
}

migrate().catch(err => {
  console.error('Migration failed:', err)
  process.exit(1)
})
