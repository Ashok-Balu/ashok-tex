const router   = require('express').Router()
const ah       = require('express-async-handler')
const auth     = require('../middleware/auth')
const mongoose = require('mongoose')
const { Order, Production, Rejection, Payment, PaymentAllocation, Nool } = require('../models')
const { uploadOrderSampleImage } = require('../cloudinary')

router.use(auth)

router.get('/', ah(async (req, res) => {
  const f = {}
  if (req.query.status)    f.status  = req.query.status
  if (req.query.companyId) f.company = req.query.companyId
  if (req.query.includeArchived !== '1') f.archived = { $ne: true }
  else if (req.query.archived === '1') f.archived = true
  const rows = await Order.find(f)
    .select('orderName company status archived producedMeter rejectedMeter acceptedMeter expectedMeter ratePerMeter deductionPct totalReceived startDate endDate reedPick size manuallyCompleted productionClosed financialClosed createdAt updatedAt lossMeter')
    .populate('company', 'name defaultDeduction')
    .sort({ createdAt: -1 })
    .lean()
  res.json(rows.map(withComputedOrderFields))
}))

router.get('/:id', ah(async (req, res) => {
  const doc = await Order.findById(req.params.id).populate('company', 'name defaultDeduction')
  doc ? res.json(withComputedOrderFields(doc)) : res.status(404).json({ message: 'Not found' })
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
    totalReceived: 0,
    status: 'active',
    sampleImage: source.sampleImage || '',
    manuallyCompleted: false,
    productionClosed: false,
    financialClosed: false,
    archived: false,
    archivedAt: null,
  })

  await repeated.populate('company', 'name defaultDeduction')
  res.status(201).json(withComputedOrderFields(repeated))
}))

router.get('/:id/nool-stats', ah(async (req, res) => {
  const { Nool } = require('../models')
  const rows = await Nool.find({ order: req.params.id })
  const received = rows.filter(r => (r.entryType || 'receipt') === 'receipt').reduce((s, r) => s + (r.qty || 0), 0)
  const used = rows.filter(r => ['used', 'return'].includes(r.entryType)).reduce((s, r) => s + (r.qty || 0), 0)
  res.json({ received, used, remaining: Math.max(0, received - used) })
}))

router.post('/', ah(async (req, res) => {
  let payload
  try { payload = await normalizeOrderPayload(req.body) }
  catch (e) { return res.status(400).json({ message: e.message }) }
  const doc = await Order.create(payload)
  await doc.populate('company', 'name defaultDeduction')
  res.status(201).json(withComputedOrderFields(doc))
}))

router.put('/:id', ah(async (req, res) => {
  let payload
  try { payload = await normalizeOrderPayload(req.body) }
  catch (e) { return res.status(400).json({ message: e.message }) }
  const doc = await Order.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true })
    .populate('company', 'name defaultDeduction')
  if (!doc) return res.status(404).json({ message: 'Not found' })
  // Recalc status now that expectedMeter may have changed
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

router.delete('/:id', ah(async (req, res) => {
  const order = await Order.findById(req.params.id).select('_id archived').lean()
  if (!order) return res.status(404).json({ message: 'Not found' })

  const isAdmin = req.user?.role === 'admin'
  if (!isAdmin && !order.archived) {
    return res.status(403).json({ message: 'Only admin can delete non-archived orders' })
  }

  const orderId = order._id

  // For archived orders, payment impact is already adjusted during archive.
  // For non-archived orders (admin only), reduce receipt totals now.
  await adjustOrderFinancialsForArchive(orderId, { adjustReceipts: !order.archived })

  // Now delete all related records
  await Promise.all([
    PaymentAllocation.deleteMany({ order: orderId }),
    Payment.deleteMany({ order: orderId }),
    Production.deleteMany({ order: orderId }),
    Rejection.deleteMany({ order: orderId }),
    Nool.deleteMany({ order: orderId }),
  ])
  await Order.findByIdAndDelete(orderId)
  res.json({ message: 'Deleted' })
}))

async function ensureProductionHistoryExists(orderId) {
  const hasProductionHistory = await Production.exists({ order: orderId })
  return !!hasProductionHistory
}

// Manually complete an order (even if expectedMeter not fully produced)
router.patch('/:id/complete', ah(async (req, res) => {
  const hasProductionHistory = await ensureProductionHistoryExists(req.params.id)
  if (!hasProductionHistory) {
    return res.status(400).json({ message: 'Cannot complete order without production history.' })
  }

  const doc = await Order.findByIdAndUpdate(
    req.params.id,
    { status: 'completed', manuallyCompleted: true, productionClosed: true },
    { new: true }
  ).populate('company', 'name defaultDeduction')
  if (!doc) return res.status(404).json({ message: 'Not found' })

  const computed = withComputedOrderFields(doc)
  const shouldAutoFinancialClose = computed.paymentRemaining <= 0.001
  if (doc.financialClosed !== shouldAutoFinancialClose) {
    doc.financialClosed = shouldAutoFinancialClose
    await doc.save()
  }

  res.json(withComputedOrderFields(doc))
}))

router.patch('/:id/close-production', ah(async (req, res) => {
  const hasProductionHistory = await ensureProductionHistoryExists(req.params.id)
  if (!hasProductionHistory) {
    return res.status(400).json({ message: 'Cannot complete order without production history.' })
  }

  const doc = await Order.findByIdAndUpdate(
    req.params.id,
    { status: 'completed', manuallyCompleted: true, productionClosed: true },
    { new: true }
  ).populate('company', 'name defaultDeduction')
  if (!doc) return res.status(404).json({ message: 'Not found' })

  const computed = withComputedOrderFields(doc)
  const shouldAutoFinancialClose = computed.paymentRemaining <= 0.001
  if (doc.financialClosed !== shouldAutoFinancialClose) {
    doc.financialClosed = shouldAutoFinancialClose
    await doc.save()
  }

  res.json(withComputedOrderFields(doc))
}))

router.patch('/:id/archive', ah(async (req, res) => {
  const order = await Order.findById(req.params.id).populate('company', 'name defaultDeduction')
  if (!order) return res.status(404).json({ message: 'Not found' })
  if (!order.productionClosed || !order.financialClosed) {
    return res.status(400).json({ message: 'Order must be production-closed and financial-closed before archive.' })
  }

  await adjustOrderFinancialsForArchive(order._id)

  order.archived = true
  order.archivedAt = new Date()
  order.totalReceived = 0
  await order.save()
  res.json(withComputedOrderFields(order))
}))

// Helper exported for production & payment routes to call
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

  const order = await Order.findById(orderId).select('expectedMeter manuallyCompleted ratePerMeter productionClosed')
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
  // Don't auto-reset status if user manually completed the order
  if (!order.manuallyCompleted && !order.productionClosed) {
    updatePayload.status = acceptedMeter >= (order.expectedMeter || 0) && (order.expectedMeter || 0) > 0 ? 'completed' : 'active'
  }
  await Order.findByIdAndUpdate(orderId, updatePayload)
}

async function recalcReceived(orderId) {
  const agg = await PaymentAllocation.aggregate([
    { $match: { order: new mongoose.Types.ObjectId(orderId) } },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ])
  const totalReceived = Number(agg[0]?.total || 0)
  const order = await Order.findById(orderId)
    .select('producedMeter rejectedMeter acceptedMeter ratePerMeter deductionPct productionClosed')
    .lean()
  if (!order) return

  const producedMeter = Number(order.producedMeter || 0)
  const rejectedMeter = Number(order.rejectedMeter || 0)
  const acceptedMeter = Number(order.acceptedMeter || Math.max(0, producedMeter - rejectedMeter))
  const totalValue = acceptedMeter * Number(order.ratePerMeter || 0)
  const deductionHoldAmount = totalValue * (Number(order.deductionPct || 0) / 100)
  const payableAmount = Math.max(0, totalValue - deductionHoldAmount)
  const paymentRemaining = Math.max(0, payableAmount - totalReceived)
  const shouldAutoFinancialClose = !!order.productionClosed && paymentRemaining <= 0.001

  await Order.findByIdAndUpdate(orderId, {
    totalReceived,
    financialClosed: shouldAutoFinancialClose,
  })
}

async function adjustOrderFinancialsForArchive(orderId, { adjustReceipts = true } = {}) {
  const allocations = await PaymentAllocation.find({ order: orderId }).lean()

  if (adjustReceipts) {
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
  }

  await Promise.all([
    PaymentAllocation.deleteMany({ order: orderId }),
    Payment.deleteMany({ order: orderId }),
    Order.findByIdAndUpdate(orderId, { totalReceived: 0 }),
  ])
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

  // Ensure averageWeightPerMeter is a number if present
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
      // Throws with a descriptive message if type/size invalid — caught by error handler
      payload.sampleImage = await uploadOrderSampleImage(payload.sampleImage)
    }
  }
  return payload
}

function withComputedOrderFields(orderDoc) {
  const o = orderDoc.toObject ? orderDoc.toObject() : orderDoc
  const isArchived = !!o.archived
  const producedMeter = Number(o.producedMeter || 0)
  const rejectedMeter = Number(o.rejectedMeter || 0)
  const acceptedMeter = Number(o.acceptedMeter || Math.max(0, producedMeter - rejectedMeter))
  const totalValue = acceptedMeter * (o.ratePerMeter || 0)
  const deductionHoldAmount = totalValue * ((o.deductionPct || 0) / 100)
  const payableAmount = totalValue - deductionHoldAmount
  const remainingPayment = Math.max(0, payableAmount - (o.totalReceived || 0))
  const paidAmount = Number(o.totalReceived || 0)
  const paymentStatus = isArchived
    ? 'archived'
    : payableAmount <= 0.001
      ? (paidAmount > 0.001 ? 'partially_paid' : 'unpaid')
      : remainingPayment <= 0.001
        ? 'fully_paid'
        : paidAmount > 0.001
          ? 'partially_paid'
          : 'unpaid'
  const paymentStatusLabel = paymentStatus === 'archived'
    ? 'Archived'
    : paymentStatus === 'fully_paid'
      ? 'Fully Paid'
      : paymentStatus === 'partially_paid'
        ? 'Partially Paid'
        : 'Unpaid'
  // Respect manuallyCompleted flag; otherwise derive from production vs expected
  const status = o.manuallyCompleted
    ? 'completed'
    : (acceptedMeter >= (o.expectedMeter || 0) && (o.expectedMeter || 0) > 0 ? 'completed' : 'active')

  return {
    ...o,
    status,
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
    averageWeightPerMeter: o.averageWeightPerMeter || 0,
    yarnShortageEnteredAmount: o.yarnShortageEnteredAmount || 0,
  }
}

module.exports = router
module.exports.recalcProduced = recalcProduced
module.exports.recalcReceived = recalcReceived
module.exports.withComputedOrderFields = withComputedOrderFields
