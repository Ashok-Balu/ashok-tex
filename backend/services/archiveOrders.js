const { Order, Payment, PaymentAllocation } = require('../models')

async function adjustOrderFinancialsForArchive(orderId) {
  const allocations = await PaymentAllocation.find({ order: orderId }).lean()

  const receiptReductionMap = new Map()
  for (const alloc of allocations) {
    const receiptId = alloc.receipt ? String(alloc.receipt) : ''
    if (!receiptId) continue
    const prev = Number(receiptReductionMap.get(receiptId) || 0)
    receiptReductionMap.set(receiptId, prev + Number(alloc.amount || 0))
  }

  for (const [receiptId, reductionAmount] of receiptReductionMap.entries()) {
    const receipt = await Payment.findById(receiptId)
    if (!receipt) continue
    const newAmount = Number(receipt.amount || 0) - Number(reductionAmount || 0)
    if (newAmount <= 0.001) {
      await Payment.findByIdAndDelete(receiptId)
    } else {
      receipt.amount = Math.round(newAmount * 100) / 100
      await receipt.save()
    }
  }

  await Promise.all([
    PaymentAllocation.deleteMany({ order: orderId }),
    Payment.deleteMany({ order: orderId }),
    Order.findByIdAndUpdate(orderId, { totalReceived: 0 }),
  ])
}

async function archiveOldClosedOrders({ months = 3 } = {}) {
  const cutoff = new Date()
  cutoff.setMonth(cutoff.getMonth() - Number(months || 3))

  const rows = await Order.find({
    archived: { $ne: true },
    productionClosed: true,
    financialClosed: true,
    updatedAt: { $lt: cutoff },
  }).select('_id')

  for (const row of rows) {
    await adjustOrderFinancialsForArchive(row._id)
    await Order.findByIdAndUpdate(row._id, {
      archived: true,
      archivedAt: new Date(),
      totalReceived: 0,
    })
  }

  return {
    matched: Number(rows.length || 0),
    archived: Number(rows.length || 0),
    cutoff,
  }
}

module.exports = {
  archiveOldClosedOrders,
}
