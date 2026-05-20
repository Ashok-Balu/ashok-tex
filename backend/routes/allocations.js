const router = require('express').Router()
const ah = require('express-async-handler')
const mongoose = require('mongoose')
const auth = require('../middleware/auth')
const { Payment, PaymentAllocation, Order } = require('../models')
const { recalcReceived } = require('./orders')

router.use(auth)

function toObjectId(value) {
  return new mongoose.Types.ObjectId(value)
}

function computePayable(order) {
  const produced = Number(order.producedMeter || 0)
  const rejected = Number(order.rejectedMeter || 0)
  const accepted = Number(order.acceptedMeter || Math.max(0, produced - rejected))
  const totalValue = accepted * Number(order.ratePerMeter || 0)
  const deduction = totalValue * (Number(order.deductionPct || 0) / 100)
  return Math.max(0, totalValue - deduction)
}

async function cleanupOrphanAllocations(companyId) {
  const orphanRows = await PaymentAllocation.aggregate([
    { $match: { company: toObjectId(companyId) } },
    {
      $lookup: {
        from: 'orders',
        localField: 'order',
        foreignField: '_id',
        as: 'orderDoc',
      },
    },
    { $match: { orderDoc: { $size: 0 } } },
    { $project: { _id: 1 } },
  ])

  const orphanIds = orphanRows.map(r => r._id)
  if (orphanIds.length) {
    await PaymentAllocation.deleteMany({ _id: { $in: orphanIds } })
  }
}

router.get('/company/:companyId/summary', ah(async (req, res) => {
  const { companyId } = req.params
  if (!mongoose.Types.ObjectId.isValid(companyId)) {
    return res.status(400).json({ message: 'Invalid company id' })
  }

  await cleanupOrphanAllocations(companyId)

  const companyObjectId = toObjectId(companyId)

  const receipts = await Payment.find({
    company: companyId,
    transactionType: 'payment',
    $or: [{ order: { $exists: false } }, { order: null }],
  }).sort({ date: -1 }).lean()

  const receiptIds = receipts.map(r => r._id)
  const allocAgg = receiptIds.length
    ? await PaymentAllocation.aggregate([
      { $match: { receipt: { $in: receiptIds } } },
      { $group: { _id: '$receipt', total: { $sum: '$amount' } } },
    ])
    : []

  const allocatedByReceipt = new Map(allocAgg.map(a => [String(a._id), Number(a.total || 0)]))
  const receiptRows = receipts.map(r => {
    const allocated = allocatedByReceipt.get(String(r._id)) || 0
    return {
      ...r,
      allocated,
      unallocated: Math.max(0, Number(r.amount || 0) - allocated),
    }
  })

  const orders = await Order.find({
    company: companyId,
    archived: { $ne: true },
    financialClosed: { $ne: true },
  }).select('orderName producedMeter rejectedMeter acceptedMeter ratePerMeter deductionPct totalReceived').lean()

  const orderRows = orders.map(o => {
    const payable = computePayable(o)
    const paid = Number(o.totalReceived || 0)
    return {
      _id: o._id,
      orderName: o.orderName,
      payableAmount: payable,
      paidAmount: paid,
      pendingAmount: Math.max(0, payable - paid),
    }
  }).filter(o => o.pendingAmount > 0)

  res.json({
    receipts: receiptRows,
    openOrders: orderRows,
  })
}))

router.get('/company/:companyId', ah(async (req, res) => {
  const { companyId } = req.params
  if (!mongoose.Types.ObjectId.isValid(companyId)) {
    return res.status(400).json({ message: 'Invalid company id' })
  }

  await cleanupOrphanAllocations(companyId)

  const rows = await PaymentAllocation.find({ company: companyId })
    .populate('receipt', 'amount date notes')
    .populate('order', 'orderName')
    .sort({ date: -1 })
    .lean()

  const safeRows = rows.filter(r => !!r.order?._id)

  res.json(safeRows)
}))

router.post('/company/:companyId', ah(async (req, res) => {
  const { companyId } = req.params
  const { receiptId, allocations = [], notes = '' } = req.body || {}

  if (!mongoose.Types.ObjectId.isValid(companyId)) {
    return res.status(400).json({ message: 'Invalid company id' })
  }
  const hasReceiptId = typeof receiptId === 'string' && receiptId.trim() !== ''
  if (hasReceiptId && !mongoose.Types.ObjectId.isValid(receiptId)) {
    return res.status(400).json({ message: 'Invalid receipt id' })
  }
  if (!Array.isArray(allocations) || allocations.length === 0) {
    return res.status(400).json({ message: 'At least one allocation row is required' })
  }

  const normalized = []
  let reqTotal = 0
  for (const row of allocations) {
    if (!mongoose.Types.ObjectId.isValid(row.orderId)) {
      return res.status(400).json({ message: 'Invalid order id in allocation' })
    }
    const amount = Number(row.amount || 0)
    if (amount <= 0) {
      return res.status(400).json({ message: 'Allocation amount must be greater than zero' })
    }
    normalized.push({ orderId: row.orderId, amount })
    reqTotal += amount
  }

  const receiptMatch = {
    company: companyId,
    transactionType: 'payment',
    $or: [{ order: { $exists: false } }, { order: null }],
    ...(hasReceiptId ? { _id: receiptId } : {}),
  }
  const receipts = await Payment.find(receiptMatch)
    .select('_id amount date createdAt')
    .sort({ date: 1, createdAt: 1, _id: 1 })
    .lean()

  if (hasReceiptId && !receipts.length) {
    return res.status(404).json({ message: 'Receipt not found' })
  }

  const receiptIds = receipts.map(r => r._id)
  const allocatedAgg = receiptIds.length
    ? await PaymentAllocation.aggregate([
      { $match: { receipt: { $in: receiptIds } } },
      { $group: { _id: '$receipt', total: { $sum: '$amount' } } },
    ])
    : []
  const allocatedMap = new Map(allocatedAgg.map(a => [String(a._id), Number(a.total || 0)]))
  const receiptBuckets = receipts
    .map(r => {
      const allocated = allocatedMap.get(String(r._id)) || 0
      return {
        receiptId: r._id,
        unallocated: Math.max(0, Number(r.amount || 0) - allocated),
      }
    })
    .filter(r => r.unallocated > 0)

  const available = receiptBuckets.reduce((sum, row) => sum + row.unallocated, 0)
  if (reqTotal > available + 1e-9) {
    return res.status(400).json({ message: 'Allocation exceeds company total unallocated amount' })
  }

  const orderIds = normalized.map(r => r.orderId)
  const orders = await Order.find({ _id: { $in: orderIds }, company: companyId, archived: { $ne: true } })
    .select('producedMeter rejectedMeter acceptedMeter ratePerMeter deductionPct totalReceived financialClosed')
    .lean()

  const orderMap = new Map(orders.map(o => [String(o._id), o]))

  for (const row of normalized) {
    const order = orderMap.get(String(row.orderId))
    if (!order) return res.status(400).json({ message: 'Order not found for allocation' })
    if (order.financialClosed) {
      return res.status(400).json({ message: 'Cannot allocate to financial-closed order' })
    }
    const pending = Math.max(0, computePayable(order) - Number(order.totalReceived || 0))
    if (row.amount > pending + 1e-9) {
      return res.status(400).json({ message: 'Allocation exceeds order pending amount' })
    }
  }

  const docs = []
  let bucketIdx = 0
  for (const row of normalized) {
    let remaining = row.amount
    while (remaining > 1e-9 && bucketIdx < receiptBuckets.length) {
      const bucket = receiptBuckets[bucketIdx]
      if (bucket.unallocated <= 1e-9) {
        bucketIdx += 1
        continue
      }

      const allocatedAmount = Math.min(remaining, bucket.unallocated)
      docs.push({
        company: companyId,
        receipt: bucket.receiptId,
        order: row.orderId,
        amount: allocatedAmount,
        date: new Date(),
        notes,
      })

      remaining -= allocatedAmount
      bucket.unallocated -= allocatedAmount
      if (bucket.unallocated <= 1e-9) bucketIdx += 1
    }

    if (remaining > 1e-9) {
      return res.status(400).json({ message: 'Not enough unallocated receipt balance for allocation' })
    }
  }

  const created = await PaymentAllocation.insertMany(docs)

  await Promise.all([...new Set(normalized.map(r => String(r.orderId)))].map(id => recalcReceived(id)))

  res.status(201).json(created)
}))

router.put('/:id', ah(async (req, res) => {
  const { id } = req.params
  const nextAmount = Number(req.body?.amount || 0)
  const nextNotes = String(req.body?.notes || '')

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'Invalid allocation id' })
  }
  if (nextAmount <= 0) {
    return res.status(400).json({ message: 'Allocation amount must be greater than zero' })
  }

  const existing = await PaymentAllocation.findById(id).lean()
  if (!existing) return res.status(404).json({ message: 'Allocation not found' })

  const [receipt, order] = await Promise.all([
    Payment.findById(existing.receipt).lean(),
    Order.findById(existing.order)
      .select('company archived financialClosed producedMeter rejectedMeter acceptedMeter ratePerMeter deductionPct totalReceived')
      .lean(),
  ])

  if (!receipt) return res.status(404).json({ message: 'Receipt not found' })
  if (!order) return res.status(404).json({ message: 'Order not found' })
  if (order.archived) return res.status(400).json({ message: 'Cannot edit allocation for archived order' })
  if (order.financialClosed) return res.status(400).json({ message: 'Cannot edit allocation for financial-closed order' })

  const receiptAgg = await PaymentAllocation.aggregate([
    { $match: { receipt: toObjectId(existing.receipt), _id: { $ne: toObjectId(id) } } },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ])
  const allocatedExcludingCurrent = Number(receiptAgg[0]?.total || 0)
  const receiptAvailable = Math.max(0, Number(receipt.amount || 0) - allocatedExcludingCurrent)

  if (nextAmount > receiptAvailable + 1e-9) {
    return res.status(400).json({ message: 'Allocation exceeds receipt unallocated amount' })
  }

  const payable = computePayable(order)
  const paidExcludingCurrent = Math.max(0, Number(order.totalReceived || 0) - Number(existing.amount || 0))
  const orderPending = Math.max(0, payable - paidExcludingCurrent)
  if (nextAmount > orderPending + 1e-9) {
    return res.status(400).json({ message: 'Allocation exceeds order pending amount' })
  }

  const updated = await PaymentAllocation.findByIdAndUpdate(
    id,
    { amount: nextAmount, notes: nextNotes },
    { new: true, runValidators: true }
  )
    .populate('receipt', 'amount date notes')
    .populate('order', 'orderName')

  await recalcReceived(existing.order)
  res.json(updated)
}))

router.delete('/:id', ah(async (req, res) => {
  const { id } = req.params
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'Invalid allocation id' })
  }

  const existing = await PaymentAllocation.findById(id).lean()
  if (!existing) return res.status(404).json({ message: 'Allocation not found' })

  const order = await Order.findById(existing.order).select('archived financialClosed').lean()
  if (!order) return res.status(404).json({ message: 'Order not found' })
  if (order.archived) return res.status(400).json({ message: 'Cannot delete allocation for archived order' })
  if (order.financialClosed) return res.status(400).json({ message: 'Cannot delete allocation for financial-closed order' })

  await PaymentAllocation.findByIdAndDelete(id)
  await recalcReceived(existing.order)
  res.json({ message: 'Allocation deleted' })
}))

module.exports = router
