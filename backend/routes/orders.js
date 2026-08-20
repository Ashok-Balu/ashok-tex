const router   = require('express').Router()
const ah       = require('express-async-handler')
const auth     = require('../middleware/auth')
const mongoose = require('mongoose')
const { Order, Production, Rejection, Payment, Nool, OrderHistory } = require('../models')
const { uploadOrderSampleImage } = require('../cloudinary')
const { getCompanyBalance } = require('../services/companyBalance')

function logOrderHistory(order, action, by, reason, details) {
  return OrderHistory.create({ order, action, by: by || '', reason: reason || '', details: details || {} }).catch(() => {})
}

router.use(auth)

router.get('/', ah(async (req, res) => {
  const f = { deletedAt: null }
  if (req.query.status) f.status = req.query.status
  if (req.query.companyId) f.company = req.query.companyId

  // Archive scope filters (include legacy status values for unmigrated data)
  if (req.query.scope === 'closed') {
    f.status = 'closed'
  } else if (req.query.scope === 'active') {
    f.status = { $in: ['open', 'production_complete', 'active', 'completed'] }
    f.archived = { $ne: true }
  }

  // Legacy filter support
  if (req.query.includeArchived === '1') {
    delete f.status
    if (req.query.archived === '1') f.status = 'closed'
  } else if (!f.status) {
    // Default: show all non-deleted
  }

  const rows = await Order.find(f)
    .select('orderName company status producedMeter rejectedMeter acceptedMeter expectedMeter ratePerMeter deductionPct startDate endDate reedPick size manuallyCompleted productionClosed financialClosed archived closedAmount closedDeduction closedAt deletedAt createdAt updatedAt lossMeter averageWeightPerMeter yarnShortageEnteredAmount totalReceived')
    .populate('company', 'name defaultDeduction')
    .sort({ updatedAt: -1 })
    .lean()

  const orderIds = rows.map(row => row._id).filter(Boolean)
  const noolWeightsByOrder = await buildNoolWeightsByOrder(orderIds)

  res.json(rows.map((row) => {
    const weights = noolWeightsByOrder.get(String(row._id)) || { totalYarnWeight: 0, totalReturnWeight: 0 }
    return withComputedOrderFields({ ...row, ...weights })
  }))
}))

router.get('/:id', ah(async (req, res) => {
  const doc = await Order.findById(req.params.id).populate('company', 'name defaultDeduction')
  if (!doc || doc.deletedAt) return res.status(404).json({ message: 'Not found' })
  res.json(withComputedOrderFields(doc))
}))

router.post('/:id/repeat', ah(async (req, res) => {
  const source = await Order.findById(req.params.id)
  if (!source) return res.status(404).json({ message: 'Source order not found' })

  const startDateRaw = req.body?.startDate
  if (!startDateRaw) {
    return res.status(400).json({ message: 'Start date is required' })
  }

  const startDate = new Date(startDateRaw)
  if (Number.isNaN(startDate.getTime())) {
    return res.status(400).json({ message: 'Invalid start date' })
  }

  const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
  const now = new Date()
  const suffix = `${monthNames[now.getMonth()]}-${now.getFullYear()}`

  const sourceName = String(source.orderName || '').trim()
  const baseName = sourceName.replace(/\s-\s[A-Z]{3}-\d{4}(?:-\d+)?$/, '') || sourceName

  let nextName = `${baseName} - ${suffix}`
  let seq = 2
  while (await Order.exists({ company: source.company, orderName: nextName })) {
    nextName = `${baseName} - ${suffix}-${seq}`
    seq += 1
  }

  const repeated = await Order.create({
    orderName: nextName,
    company: source.company,
    reedPick: source.reedPick || '',
    size: source.size || '',
    startDate,
    endDate: source.endDate || null,
    expectedMeter: Number(source.expectedMeter || 0),
    producedMeter: 0,
    ratePerMeter: Number(source.ratePerMeter || 0),
    deductionPct: Number(source.deductionPct || 0),
    status: 'open',
    sampleImage: source.sampleImage || '',
  })

  await repeated.populate('company', 'name defaultDeduction')
  res.status(201).json(withComputedOrderFields(repeated))
}))

router.get('/:id/nool-stats', ah(async (req, res) => {
  const rows = await Nool.find({ order: req.params.id })
  const received = rows.filter(r => (r.entryType || 'receipt') === 'receipt').reduce((s, r) => s + (r.qty || 0), 0)
  const used = rows.filter(r => ['used', 'return'].includes(r.entryType)).reduce((s, r) => s + (r.qty || 0), 0)
  res.json({ received, used, remaining: Math.max(0, received - used) })
}))

router.post('/', ah(async (req, res) => {
  let payload
  try { payload = await normalizeOrderPayload(req.body) }
  catch (e) { return res.status(400).json({ message: e.message }) }
  payload.status = 'open'
  const doc = await Order.create(payload)
  await doc.populate('company', 'name defaultDeduction')
  logOrderHistory(doc._id, 'created', req.user?.username, '', { orderName: doc.orderName, company: doc.company?.name })
  res.status(201).json(withComputedOrderFields(doc))
}))

router.put('/:id', ah(async (req, res) => {
  const existing = await Order.findById(req.params.id).lean()
  if (!existing || existing.deletedAt) return res.status(404).json({ message: 'Not found' })
  if (existing.status === 'closed') {
    return res.status(400).json({ message: 'Cannot edit a closed order' })
  }

  let payload
  try { payload = await normalizeOrderPayload(req.body) }
  catch (e) { return res.status(400).json({ message: e.message }) }

  const doc = await Order.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true })
    .populate('company', 'name defaultDeduction')
  if (!doc) return res.status(404).json({ message: 'Not found' })
  await recalcProduced(req.params.id)
  const updated = await Order.findById(req.params.id).populate('company', 'name defaultDeduction')
  res.json(withComputedOrderFields(updated))
}))

router.patch('/:id/average-weight', ah(async (req, res) => {
  const raw = req.body?.averageWeightPerMeter
  const value = Number(raw)
  if (!Number.isFinite(value) || value < 0) {
    return res.status(400).json({ message: 'Invalid averageWeightPerMeter' })
  }

  const doc = await Order.findByIdAndUpdate(
    req.params.id,
    { averageWeightPerMeter: value },
    { new: true, runValidators: true }
  )
  if (!doc) return res.status(404).json({ message: 'Not found' })

  res.json({ averageWeightPerMeter: Number(doc.averageWeightPerMeter || 0) })
}))

router.patch('/:id/yarn-shortage-entered-amount', ah(async (req, res) => {
  const raw = req.body?.yarnShortageEnteredAmount
  const value = Number(raw)
  if (!Number.isFinite(value) || value < 0) {
    return res.status(400).json({ message: 'Invalid yarnShortageEnteredAmount' })
  }

  const doc = await Order.findByIdAndUpdate(
    req.params.id,
    { yarnShortageEnteredAmount: value },
    { new: true, runValidators: true }
  )
  if (!doc) return res.status(404).json({ message: 'Not found' })

  res.json({ yarnShortageEnteredAmount: Number(doc.yarnShortageEnteredAmount || 0) })
}))

// ── Mark Production Complete ──────────────────────────────────────────────────
router.patch('/:id/production-complete', ah(async (req, res) => {
  const order = await Order.findById(req.params.id).populate('company', 'name defaultDeduction')
  if (!order || order.deletedAt) return res.status(404).json({ message: 'Not found' })
  if (order.status === 'closed') {
    return res.status(400).json({ message: 'Order is already closed' })
  }

  const hasProduction = await Production.exists({ order: order._id })
  if (!hasProduction) {
    return res.status(400).json({ message: 'Cannot mark production complete without production history' })
  }

  order.status = 'production_complete'
  order.productionClosed = true
  order.manuallyCompleted = true
  await order.save()
  logOrderHistory(order._id, 'production_complete', req.user?.username, '', { producedMeter: order.producedMeter, acceptedMeter: order.acceptedMeter })
  res.json(withComputedOrderFields(order))
}))

// Legacy endpoint - maps to production-complete
router.patch('/:id/complete', ah(async (req, res) => {
  const order = await Order.findById(req.params.id).populate('company', 'name defaultDeduction')
  if (!order || order.deletedAt) return res.status(404).json({ message: 'Not found' })
  if (order.status === 'closed') {
    return res.status(400).json({ message: 'Order is already closed' })
  }

  const hasProduction = await Production.exists({ order: order._id })
  if (!hasProduction) {
    return res.status(400).json({ message: 'Cannot complete order without production history' })
  }

  order.status = 'production_complete'
  order.productionClosed = true
  order.manuallyCompleted = true
  await order.save()
  res.json(withComputedOrderFields(order))
}))

// Legacy endpoint
router.patch('/:id/close-production', ah(async (req, res) => {
  const order = await Order.findById(req.params.id).populate('company', 'name defaultDeduction')
  if (!order || order.deletedAt) return res.status(404).json({ message: 'Not found' })
  if (order.status === 'closed') {
    return res.status(400).json({ message: 'Order is already closed' })
  }

  const hasProduction = await Production.exists({ order: order._id })
  if (!hasProduction) {
    return res.status(400).json({ message: 'Cannot complete order without production history' })
  }

  order.status = 'production_complete'
  order.productionClosed = true
  order.manuallyCompleted = true
  await order.save()
  res.json(withComputedOrderFields(order))
}))

// ── Close Order (allocate payment from company balance) ───────────────────────
router.patch('/:id/close', ah(async (req, res) => {
  const order = await Order.findById(req.params.id).populate('company', 'name defaultDeduction')
  if (!order || order.deletedAt) return res.status(404).json({ message: 'Not found' })

  if (order.status === 'closed') {
    return res.status(400).json({ message: 'Order is already closed' })
  }
  // Allow close for production_complete OR legacy 'completed' status with productionClosed flag
  const canClose = order.status === 'production_complete'
    || (order.status === 'completed' && order.productionClosed)
  if (!canClose) {
    return res.status(400).json({ message: 'Order must be production complete before closing' })
  }

  const computed = computeOrderFinancials(order)
  const payable = computed.payableAmount

  // Check company balance
  const { balance } = await getCompanyBalance(order.company._id || order.company)
  if (balance < payable - 0.01) {
    return res.status(400).json({
      message: `Insufficient company balance. Need ₹${Math.ceil(payable)}, available ₹${Math.floor(balance)}`,
      required: payable,
      available: balance,
    })
  }

  // Close the order
  order.status = 'closed'
  order.closedAmount = payable
  order.closedDeduction = computed.deductionAmount
  order.closedAt = new Date()
  order.closedBy = req.user?.username || ''
  order.financialClosed = true
  order.archived = true
  order.archivedAt = new Date()
  order.totalReceived = payable
  await order.save()

  const balanceAfter = balance - payable
  logOrderHistory(order._id, 'closed', req.user?.username, '', { closedAmount: payable, deduction: computed.deductionAmount, balanceAfter })
  res.json({ ...withComputedOrderFields(order), balanceAfter })
}))

// ── Get company balance for close order UI ────────────────────────────────────
router.get('/:id/close-info', ah(async (req, res) => {
  const order = await Order.findById(req.params.id).populate('company', 'name defaultDeduction').lean()
  if (!order || order.deletedAt) return res.status(404).json({ message: 'Not found' })

  const computed = computeOrderFinancials(order)
  const { balance, totalReceipts, totalClosed } = await getCompanyBalance(order.company._id || order.company)
  const balanceAfter = balance - computed.payableAmount

  // Find other orders waiting to close for this company
  const pendingOrders = await Order.find({
    company: order.company._id || order.company,
    status: { $in: ['production_complete', 'completed'] },
    deletedAt: null,
    _id: { $ne: order._id },
  }).select('orderName producedMeter rejectedMeter acceptedMeter ratePerMeter deductionPct').lean()

  const pendingOrdersList = pendingOrders.map(o => {
    const f = computeOrderFinancials(o)
    return { _id: o._id, orderName: o.orderName, payableAmount: f.payableAmount }
  })

  res.json({
    payable: computed.payableAmount,
    deduction: computed.deductionAmount,
    grossValue: computed.totalValue,
    companyBalance: balance,
    balanceAfter,
    companyTotalReceipts: totalReceipts,
    companyTotalClosed: totalClosed,
    canClose: balance >= computed.payableAmount - 0.01,
    pendingOrders: pendingOrdersList.length,
    pendingCloseTotal: pendingOrdersList.reduce((s, o) => s + o.payableAmount, 0),
    pendingOrdersList,
  })
}))

// ── Get reopen info for admin UI ──────────────────────────────────────────────
router.get('/:id/reopen-info', ah(async (req, res) => {
  const order = await Order.findById(req.params.id).populate('company', 'name defaultDeduction').lean()
  if (!order || order.deletedAt) return res.status(404).json({ message: 'Not found' })
  if (order.status !== 'closed') return res.status(400).json({ message: 'Order is not closed' })

  const { balance } = await getCompanyBalance(order.company._id || order.company)
  res.json({
    freedAmount: Number(order.closedAmount || 0),
    currentBalance: balance,
    companyName: order.company?.name || '',
  })
}))

// ── Legacy archive endpoint (no-op for already closed orders) ─────────────────
router.patch('/:id/archive', ah(async (req, res) => {
  const order = await Order.findById(req.params.id).populate('company', 'name defaultDeduction')
  if (!order) return res.status(404).json({ message: 'Not found' })
  if (order.status !== 'closed') {
    return res.status(400).json({ message: 'Order must be closed before archiving' })
  }
  order.archived = true
  order.archivedAt = order.archivedAt || new Date()
  await order.save()
  res.json(withComputedOrderFields(order))
}))

// ── Reopen (admin only) — reverts closed → production_complete ────────────────
router.patch('/:id/reopen', ah(async (req, res) => {
  const isAdmin = req.user?.role === 'admin'
  if (!isAdmin) {
    return res.status(403).json({ message: 'Only admin can reopen orders' })
  }

  const order = await Order.findById(req.params.id).populate('company', 'name defaultDeduction')
  if (!order || order.deletedAt) return res.status(404).json({ message: 'Not found' })

  if (order.status !== 'closed') {
    return res.status(400).json({ message: 'Only closed orders can be reopened' })
  }

  const freedAmount = Number(order.closedAmount || 0)
  const reason = String(req.body?.reason || '').trim()

  order.status = 'open'
  order.closedAmount = 0
  order.closedDeduction = 0
  order.closedAt = null
  order.closedBy = ''
  order.financialClosed = false
  order.productionClosed = false
  order.manuallyCompleted = false
  order.archived = false
  order.archivedAt = null
  order.totalReceived = 0
  await order.save()

  logOrderHistory(order._id, 'reopened', req.user?.username, reason, { freedAmount })
  res.json(withComputedOrderFields(order))
}))

// ── Order History ─────────────────────────────────────────────────────────────
router.get('/:id/history', ah(async (req, res) => {
  const rows = await OrderHistory.find({ order: req.params.id })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean()
  res.json(rows)
}))

// ── Delete ────────────────────────────────────────────────────────────────────
router.delete('/:id', ah(async (req, res) => {
  const order = await Order.findById(req.params.id).lean()
  if (!order) return res.status(404).json({ message: 'Not found' })

  const isAdmin = req.user?.role === 'admin'

  // Normal users can only delete archived/closed orders
  if (!isAdmin && !order.archived) {
    return res.status(403).json({ message: 'Order must be archived before deleting' })
  }

  // Always soft-delete — preserves audit trail
  await Order.findByIdAndUpdate(order._id, { deletedAt: new Date() })
  logOrderHistory(order._id, 'deleted', req.user?.username, '', { status: order.status, closedAmount: order.closedAmount })
  res.json({ message: 'Order deleted', type: 'soft' })
}))

// ── Helpers ───────────────────────────────────────────────────────────────────

async function recalcProduced(orderId) {
  const [prodAgg, rejAgg] = await Promise.all([
    Production.aggregate([
      { $match: { order: new mongoose.Types.ObjectId(orderId) } },
      { $group: { _id: null, total: { $sum: '$meter' } } },
    ]),
    Rejection.aggregate([
      { $match: { order: new mongoose.Types.ObjectId(orderId) } },
      { $group: { _id: null, total: { $sum: '$rejectedQty' } } },
    ]),
  ])

  const producedMeter = Number(prodAgg[0]?.total || 0)
  const rejectedMeter = Number(rejAgg[0]?.total || 0)
  const acceptedMeter = Math.max(0, producedMeter - rejectedMeter)

  const order = await Order.findById(orderId).select('expectedMeter manuallyCompleted ratePerMeter status')
  if (!order) return

  const ratePerMeter = Number(order.ratePerMeter || 0)
  const lossMeter = Math.max(0, producedMeter - acceptedMeter)

  const updatePayload = {
    producedMeter,
    rejectedMeter,
    acceptedMeter,
    lossMeter,
    lossAmount: Number((lossMeter * ratePerMeter).toFixed(2)),
  }

  await Order.findByIdAndUpdate(orderId, updatePayload)
}

function computeOrderFinancials(orderDoc) {
  const o = orderDoc.toObject ? orderDoc.toObject() : orderDoc
  const producedMeter = Number(o.producedMeter || 0)
  const rejectedMeter = Number(o.rejectedMeter || 0)
  const acceptedMeter = Number(o.acceptedMeter || Math.max(0, producedMeter - rejectedMeter))
  const totalValue = acceptedMeter * Number(o.ratePerMeter || 0)
  const deductionAmount = totalValue * (Number(o.deductionPct || 0) / 100)
  const payableAmount = Math.max(0, totalValue - deductionAmount)
  return { totalValue, deductionAmount, payableAmount, acceptedMeter }
}

function withComputedOrderFields(orderDoc) {
  const o = orderDoc.toObject ? orderDoc.toObject() : orderDoc
  const producedMeter = Number(o.producedMeter || 0)
  const rejectedMeter = Number(o.rejectedMeter || 0)
  const acceptedMeter = Number(o.acceptedMeter || Math.max(0, producedMeter - rejectedMeter))
  const totalValue = acceptedMeter * (o.ratePerMeter || 0)
  const deductionHoldAmount = totalValue * ((o.deductionPct || 0) / 100)
  const payableAmount = totalValue - deductionHoldAmount

  const isClosed = o.status === 'closed'
  const paidAmount = isClosed ? Number(o.closedAmount || 0) : Number(o.totalReceived || 0)
  const remainingPayment = Math.max(0, payableAmount - paidAmount)

  const averageWeightPerMeter = Number(o.averageWeightPerMeter || 0)
  const totalProductionWeight = Number((averageWeightPerMeter * producedMeter).toFixed(2))
  const totalYarnWeight = Number(o.totalYarnWeight || 0)
  const totalReturnWeight = Number(o.totalReturnWeight || 0)
  const totalWaPassWeight = Number(totalReturnWeight.toFixed(2))
  const totalWeightShortage = Number((
    totalYarnWeight
    - totalProductionWeight
    - totalWaPassWeight
    - Number(o.yarnShortageEnteredAmount || 0)
  ).toFixed(2))

  // Payment status derivation
  let paymentStatus = 'unpaid'
  if (isClosed) {
    paymentStatus = 'fully_paid'
  } else if (paidAmount > 0.001) {
    paymentStatus = 'partially_paid'
  }
  const paymentStatusLabel = paymentStatus === 'fully_paid' ? 'Fully Paid'
    : paymentStatus === 'partially_paid' ? 'Partially Paid' : 'Unpaid'

  // Map new statuses to legacy for frontend compat
  const isArchived = o.status === 'closed' || !!o.archived
  const isProductionClosed = o.status === 'production_complete' || o.status === 'closed' || !!o.productionClosed
  const isFinancialClosed = o.status === 'closed' || !!o.financialClosed

  // Legacy status mapping for frontend
  const legacyStatus = o.status === 'open' ? 'active'
    : o.status === 'production_complete' ? 'completed'
    : o.status === 'closed' ? 'completed'
    : o.status // fallback

  return {
    ...o,
    status: legacyStatus,
    orderStatus: o.status, // new field for frontend to use
    producedMeter,
    rejectedMeter,
    acceptedMeter,
    lossMeter: Math.max(0, producedMeter - acceptedMeter),
    lossAmount: Number((Math.max(0, producedMeter - acceptedMeter) * Number(o.ratePerMeter || 0)).toFixed(2)),
    remainingQty: Math.max(0, (o.expectedMeter || 0) - acceptedMeter),
    totalValue,
    deductionHoldAmount,
    payableAmount,
    paymentStatus,
    paymentStatusLabel,
    paymentRemaining: remainingPayment,
    averageWeightPerMeter,
    yarnShortageEnteredAmount: o.yarnShortageEnteredAmount || 0,
    totalProductionWeight,
    totalWaPassWeight,
    totalYarnWeight,
    totalReturnWeight,
    totalWeightShortage,
    // Legacy compat
    archived: isArchived,
    productionClosed: isProductionClosed,
    financialClosed: isFinancialClosed,
    // New fields
    closedAmount: o.closedAmount || 0,
    closedDeduction: o.closedDeduction || 0,
    closedAt: o.closedAt || null,
  }
}

async function normalizeOrderPayload(body = {}) {
  const payload = { ...body }

  if (!payload.startDate) {
    throw new Error('Start date is required')
  }

  const startDate = new Date(payload.startDate)
  if (Number.isNaN(startDate.getTime())) {
    throw new Error('Invalid start date')
  }
  payload.startDate = startDate

  if (payload.endDate) {
    const endDate = new Date(payload.endDate)
    if (Number.isNaN(endDate.getTime())) {
      throw new Error('Invalid end date')
    }
    payload.endDate = endDate
  }

  if (payload.hasOwnProperty('averageWeightPerMeter')) {
    payload.averageWeightPerMeter = Number(payload.averageWeightPerMeter) || 0
  }

  if (payload.hasOwnProperty('yarnShortageEnteredAmount')) {
    payload.yarnShortageEnteredAmount = Number(payload.yarnShortageEnteredAmount) || 0
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'sampleImage')) {
    if (!payload.sampleImage) {
      delete payload.sampleImage
    } else {
      payload.sampleImage = await uploadOrderSampleImage(payload.sampleImage)
    }
  }
  return payload
}

async function buildNoolWeightsByOrder(orderIds = []) {
  if (!Array.isArray(orderIds) || !orderIds.length) return new Map()

  const ids = orderIds
    .map((id) => {
      try { return new mongoose.Types.ObjectId(id) }
      catch { return null }
    })
    .filter(Boolean)

  if (!ids.length) return new Map()

  const rows = await Nool.aggregate([
    { $match: { order: { $in: ids } } },
    {
      $group: {
        _id: '$order',
        totalYarnWeight: {
          $sum: {
            $cond: [
              { $eq: [{ $ifNull: ['$entryType', 'receipt'] }, 'receipt'] },
              { $ifNull: ['$qty', 0] },
              0,
            ],
          },
        },
        totalReturnWeight: {
          $sum: {
            $cond: [
              { $in: [{ $ifNull: ['$entryType', 'receipt'] }, ['return', 'used']] },
              { $ifNull: ['$qty', 0] },
              0,
            ],
          },
        },
      },
    },
  ])

  const map = new Map()
  for (const row of rows) {
    map.set(String(row._id), {
      totalYarnWeight: Number(Number(row.totalYarnWeight || 0).toFixed(2)),
      totalReturnWeight: Number(Number(row.totalReturnWeight || 0).toFixed(2)),
    })
  }
  return map
}

async function recalcReceived(orderId) {
  const { PaymentAllocation } = require('../models')
  const agg = await PaymentAllocation.aggregate([
    { $match: { order: new mongoose.Types.ObjectId(orderId) } },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ])
  const totalAllocated = Number(agg[0]?.total || 0)
  await Order.findByIdAndUpdate(orderId, { totalReceived: totalAllocated })
}

module.exports = router
module.exports.recalcProduced = recalcProduced
module.exports.recalcReceived = recalcReceived
module.exports.withComputedOrderFields = withComputedOrderFields
module.exports.computeOrderFinancials = computeOrderFinancials
