const mongoose = require('mongoose')
const { Payment, Order, PaymentAllocation, DeductionTransfer } = require('../models')

async function getCompanyBalance(companyId) {
  const map = await getCompanyBalances([companyId])
  return map.get(String(companyId))
}

// Balance = receipts + payment loss - closed orders - legacy allocations to not-yet-closed orders - surplus moved to deduction.
// Payment loss is payable the company will not pay; it settles orders like a receipt but is not money received.
// Payment surplus is extra money the company sent that is not payment for orders; it is taken out of the receipts.
// A closed order's closedAmount already covers what was allocated to it, so those allocations are not counted again.
async function getCompanyBalances(companyIds) {
  const ids = companyIds.map(id => new mongoose.Types.ObjectId(id))

  const [receiptAgg, closedAgg, legacyAllocAgg, surplusAgg, paymentLossAgg, paymentSurplusAgg] = await Promise.all([
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
      { $lookup: { from: Order.collection.name, localField: 'order', foreignField: '_id', as: 'ord' } },
      { $match: { 'ord.status': { $ne: 'closed' } } },
      { $group: { _id: '$company', total: { $sum: '$amount' } } },
    ]),
    DeductionTransfer.aggregate([
      { $match: { company: { $in: ids }, type: 'surplus' } },
      { $group: { _id: '$company', total: { $sum: '$amount' } } },
    ]),
    DeductionTransfer.aggregate([
      { $match: { company: { $in: ids }, type: 'payment_loss' } },
      { $group: { _id: '$company', total: { $sum: '$amount' } } },
    ]),
    DeductionTransfer.aggregate([
      { $match: { company: { $in: ids }, type: 'payment_surplus' } },
      { $group: { _id: '$company', total: { $sum: '$amount' } } },
    ]),
  ])

  const receiptMap = new Map(receiptAgg.map(r => [String(r._id), Number(r.total || 0)]))
  const closedMap = new Map(closedAgg.map(r => [String(r._id), Number(r.total || 0)]))
  const legacyMap = new Map(legacyAllocAgg.map(r => [String(r._id), Number(r.total || 0)]))
  const surplusMap = new Map(surplusAgg.map(r => [String(r._id), Number(r.total || 0)]))
  const paymentLossMap = new Map(paymentLossAgg.map(r => [String(r._id), Number(r.total || 0)]))
  const paymentSurplusMap = new Map(paymentSurplusAgg.map(r => [String(r._id), Number(r.total || 0)]))

  const result = new Map()
  for (const id of companyIds) {
    const key = String(id)
    const totalPaymentSurplus = paymentSurplusMap.get(key) || 0
    const totalReceipts = Math.max(0, (receiptMap.get(key) || 0) - totalPaymentSurplus)
    const totalNewClosed = closedMap.get(key) || 0
    const totalLegacyAllocated = legacyMap.get(key) || 0
    const totalSurplusMoved = surplusMap.get(key) || 0
    const totalPaymentLoss = paymentLossMap.get(key) || 0
    const totalAllocated = totalNewClosed + totalLegacyAllocated + totalSurplusMoved
    result.set(key, {
      totalReceipts,
      totalPaymentSurplus,
      totalPaymentLoss,
      totalClosed: totalNewClosed + totalLegacyAllocated,
      totalNewClosed,
      totalLegacyAllocated,
      totalSurplusMoved,
      balance: totalReceipts + totalPaymentLoss - totalAllocated,
    })
  }
  return result
}

// Deduction position per company (cumulative, company-level).
// due         = deduction of archived orders
// collected   = deduction receipts + surplus moved to deduction
// lost         = deduction entered manually as loss (company will not pay); settles deduction like a receipt but is not money received
// allocated   = collected + lost amount assigned to archived orders
// writtenOff  = outstanding amount forgiven by company write-off
// outstanding = still owed by company for archived orders
// credit      = collected + lost amount not yet assigned to any order
async function getDeductionPositions(companyIds) {
  const ids = companyIds.map(id => new mongoose.Types.ObjectId(id))

  const [deductionAgg, surplusAgg, lossAgg, orderAgg] = await Promise.all([
    Payment.aggregate([
      { $match: { company: { $in: ids }, transactionType: 'deduction' } },
      { $group: { _id: '$company', total: { $sum: '$amount' } } },
    ]),
    DeductionTransfer.aggregate([
      { $match: { company: { $in: ids }, type: 'surplus' } },
      { $group: { _id: '$company', total: { $sum: '$amount' } } },
    ]),
    DeductionTransfer.aggregate([
      { $match: { company: { $in: ids }, type: 'deduction_loss' } },
      { $group: { _id: '$company', total: { $sum: '$amount' } } },
    ]),
    Order.aggregate([
      { $match: { company: { $in: ids }, archived: true } },
      {
        $group: {
          _id: '$company',
          due: { $sum: '$closedDeduction' },
          allocated: { $sum: '$deductionAllocated' },
          writtenOff: { $sum: '$deductionWrittenOff' },
        },
      },
    ]),
  ])

  const depMap = new Map(deductionAgg.map(r => [String(r._id), Number(r.total || 0)]))
  const surMap = new Map(surplusAgg.map(r => [String(r._id), Number(r.total || 0)]))
  const lostMap = new Map(lossAgg.map(r => [String(r._id), Number(r.total || 0)]))
  const ordMap = new Map(orderAgg.map(r => [String(r._id), r]))

  const result = new Map()
  for (const id of companyIds) {
    const key = String(id)
    const o = ordMap.get(key) || {}
    const due = Number(o.due || 0)
    const allocated = Number(o.allocated || 0)
    const writtenOff = Number(o.writtenOff || 0)
    const collected = (depMap.get(key) || 0) + (surMap.get(key) || 0)
    const lost = lostMap.get(key) || 0
    result.set(key, {
      due,
      collected,
      lost,
      allocated,
      writtenOff,
      outstanding: Math.max(0, due - allocated - writtenOff),
      credit: Math.max(0, collected + lost - allocated),
    })
  }
  return result
}

// Legacy allocations already assigned to each (not yet closed) order: orderId -> amount
async function getLegacyAllocatedByOrder(orderIds) {
  if (!orderIds.length) return new Map()
  const rows = await PaymentAllocation.aggregate([
    { $match: { order: { $in: orderIds.map(id => new mongoose.Types.ObjectId(String(id))) } } },
    { $group: { _id: '$order', total: { $sum: '$amount' } } },
  ])
  return new Map(rows.map(r => [String(r._id), Number(r.total || 0)]))
}

module.exports = { getCompanyBalance, getCompanyBalances, getDeductionPositions, getLegacyAllocatedByOrder }
