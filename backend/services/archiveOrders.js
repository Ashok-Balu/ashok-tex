const { Order } = require('../models')

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
    await Order.findByIdAndUpdate(row._id, {
      archived: true,
      archivedAt: new Date(),
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
