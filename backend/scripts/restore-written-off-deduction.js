/**
 * Restores deduction that earlier settlements wrote off as a loss, so it shows again as "deduction to get".
 *
 * Usage (dry run by default; pass --apply to write):
 *   node scripts/restore-written-off-deduction.js "melvin"
 *   node scripts/restore-written-off-deduction.js "melvin" --apply
 *
 * Take a database backup before applying against production.
 */

const path = require('path')
const ENV = process.env.NODE_ENV || 'development'
require('dotenv').config({ path: path.resolve(__dirname, `../.env.${ENV}`) })
require('dotenv').config({ path: path.resolve(__dirname, '../.env') })
const mongoose = require('mongoose')
const { Company, Order, DeductionTransfer, Settlement } = require('../models')

const args = process.argv.slice(2)
const APPLY = args.includes('--apply')
const nameFilter = args.find(a => !a.startsWith('--'))

async function run() {
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI not set')
  await mongoose.connect(process.env.MONGO_URI)

  const companies = await Company.find(nameFilter ? { name: new RegExp(nameFilter.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') } : {}).select('name').lean()
  console.log(`${APPLY ? 'APPLY' : 'DRY RUN'} — ${companies.length} company(ies) matched`)

  for (const c of companies) {
    const orders = await Order.find({ company: c._id, deductionWrittenOff: { $gt: 0 } }).select('orderName deductionWrittenOff').lean()
    const losses = await DeductionTransfer.find({ company: c._id, type: { $in: ['loss', 'writeoff'] } }).select('amount').lean()
    const total = orders.reduce((s, o) => s + Number(o.deductionWrittenOff || 0), 0)
    if (!orders.length && !losses.length) continue
    console.log(`${c.name}: ${orders.length} orders, written off ₹${total}, ${losses.length} loss entries`)

    if (!APPLY) continue
    await Order.updateMany({ company: c._id, deductionWrittenOff: { $gt: 0 } }, { $set: { deductionWrittenOff: 0 } })
    await DeductionTransfer.deleteMany({ company: c._id, type: { $in: ['loss', 'writeoff'] } })
    await Settlement.updateMany({ company: c._id, lossAmount: { $gt: 0 } }, { $set: { lossAmount: 0, lossReason: '' } })
  }

  await mongoose.disconnect()
}

run().catch(err => { console.error(err); process.exit(1) })
