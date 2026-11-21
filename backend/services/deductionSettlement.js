const mongoose = require('mongoose')
const { Order, DeductionTransfer } = require('../models')
const { getDeductionPositions } = require('./companyBalance')

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100

// Assigns available deduction credit to archived orders that still have an outstanding deduction (oldest first).
async function allocateDeductionPool(companyId) {
  const position = (await getDeductionPositions([companyId])).get(String(companyId))
  let pool = round2(position?.credit || 0)
  if (pool <= 0) return 0

  const orders = await Order.find({ company: companyId, archived: true })
    .sort({ archivedAt: 1, _id: 1 })
    .select('closedDeduction deductionAllocated deductionWrittenOff')
    .lean()

  let allocatedTotal = 0
  for (const o of orders) {
    if (pool <= 0) break
    const remaining = round2(Number(o.closedDeduction || 0) - Number(o.deductionAllocated || 0) - Number(o.deductionWrittenOff || 0))
    if (remaining <= 0) continue
    const take = round2(Math.min(pool, remaining))
    await Order.updateOne({ _id: o._id }, { $inc: { deductionAllocated: take } })
    pool = round2(pool - take)
    allocatedTotal = round2(allocatedTotal + take)
  }
  return allocatedTotal
}

// Records a surplus amount (company balance) moved into the deduction pool. Caller must validate the amount.
async function moveSurplusToDeduction(companyId, amount, by, settlementId = null) {
  const value = round2(amount)
  if (value <= 0) return 0
  await DeductionTransfer.create({
    company: new mongoose.Types.ObjectId(companyId),
    type: 'surplus',
    amount: value,
    by: by || '',
    settlementId,
    date: new Date(),
  })
  return value
}

module.exports = { allocateDeductionPool, moveSurplusToDeduction, round2 }
