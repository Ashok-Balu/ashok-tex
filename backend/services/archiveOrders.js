const { Order } = require('../models')
const { allocateDeductionPool } = require('./deductionSettlement')

async function archiveOldClosedOrders({ months = 3 } = {}) {
  const cutoff = new Date()
  cutoff.setMonth(cutoff.getMonth() - Number(months || 3))

  const rows = await Order.find({
    archived: { $ne: true },
    productionClosed: true,
    financialClosed: true,
    updatedAt: { $lt: cutoff },
  }).select('_id company')

  const companies = new Set()
  for (const row of rows) {
    await Order.findByIdAndUpdate(row._id, {
      archived: true,
      archivedAt: new Date(),
    })
    companies.add(String(row.company))
  }
  // Settle deduction for newly archived orders from each company's pool
  for (const companyId of companies) {
    await allocateDeductionPool(companyId)
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
