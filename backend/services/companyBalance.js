const mongoose = require('mongoose')
const { Payment, Order, PaymentAllocation } = require('../models')

async function getCompanyBalance(companyId) {
  const id = new mongoose.Types.ObjectId(companyId)

  const [receiptAgg, closedAgg, legacyAllocAgg] = await Promise.all([
    // Total receipts (money in)
    Payment.aggregate([
      { $match: { company: id, transactionType: { $in: ['receipt', 'payment'] } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    // New-flow closed orders
    Order.aggregate([
      { $match: { company: id, status: 'closed', closedAmount: { $gt: 0 } } },
      { $group: { _id: null, total: { $sum: '$closedAmount' } } },
    ]),
    // Legacy: total allocated via old PaymentAllocation system
    PaymentAllocation.aggregate([
      { $match: { company: id } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
  ])

  const totalReceipts = Number(receiptAgg[0]?.total || 0)
  const totalNewClosed = Number(closedAgg[0]?.total || 0)
  const totalLegacyAllocated = Number(legacyAllocAgg[0]?.total || 0)
  // Total allocated = new closed + legacy allocations (no double-count since new orders don't use allocations)
  const totalAllocated = totalNewClosed + totalLegacyAllocated

  return {
    totalReceipts,
    totalClosed: totalAllocated,
    totalNewClosed,
    totalLegacyAllocated,
    balance: totalReceipts - totalAllocated,
  }
}

async function getCompanyBalances(companyIds) {
  const ids = companyIds.map(id => new mongoose.Types.ObjectId(id))

  const [receiptAgg, closedAgg, legacyAllocAgg] = await Promise.all([
    Payment.aggregate([
      { $match: { company: { $in: ids }, transactionType: { $in: ['receipt', 'payment'] } } },
      { $group: { _id: '$company', total: { $sum: '$amount' } } },
    ]),
    Order.aggregate([
      { $match: { company: { $in: ids }, status: 'closed', closedAmount: { $gt: 0 } } },
      { $group: { _id: '$company', total: { $sum: '$closedAmount' } } },
    ]),
    PaymentAllocation.aggregate([
      { $match: { company: { $in: ids } } },
      { $group: { _id: '$company', total: { $sum: '$amount' } } },
    ]),
  ])

  const receiptMap = new Map(receiptAgg.map(r => [String(r._id), Number(r.total || 0)]))
  const closedMap = new Map(closedAgg.map(r => [String(r._id), Number(r.total || 0)]))
  const legacyMap = new Map(legacyAllocAgg.map(r => [String(r._id), Number(r.total || 0)]))

  const result = new Map()
  for (const id of companyIds) {
    const key = String(id)
    const totalReceipts = receiptMap.get(key) || 0
    const totalNewClosed = closedMap.get(key) || 0
    const totalLegacyAllocated = legacyMap.get(key) || 0
    const totalAllocated = totalNewClosed + totalLegacyAllocated
    result.set(key, {
      totalReceipts,
      totalClosed: totalAllocated,
      totalNewClosed,
      totalLegacyAllocated,
      balance: totalReceipts - totalAllocated,
    })
  }
  return result
}

module.exports = { getCompanyBalance, getCompanyBalances }
