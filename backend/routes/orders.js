const router   = require('express').Router()
const ah       = require('express-async-handler')
const auth     = require('../middleware/auth')
const mongoose = require('mongoose')
const { Order, Production, Payment } = require('../models')
const { uploadOrderSampleImage } = require('../cloudinary')

router.use(auth)

router.get('/', ah(async (req, res) => {
  const f = {}
  if (req.query.status)    f.status  = req.query.status
  if (req.query.companyId) f.company = req.query.companyId
  const rows = await Order.find(f).populate('company', 'name defaultDeduction').sort({ createdAt: -1 }).lean()
  res.json(rows.map(withComputedOrderFields))
}))

router.get('/:id', ah(async (req, res) => {
  const doc = await Order.findById(req.params.id).populate('company', 'name defaultDeduction')
  doc ? res.json(withComputedOrderFields(doc)) : res.status(404).json({ message: 'Not found' })
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

router.delete('/:id', ah(async (req, res) => {
  await Order.findByIdAndDelete(req.params.id)
  res.json({ message: 'Deleted' })
}))

// Manually complete an order (even if expectedMeter not fully produced)
router.patch('/:id/complete', ah(async (req, res) => {
  const doc = await Order.findByIdAndUpdate(
    req.params.id,
    { status: 'completed', manuallyCompleted: true },
    { new: true }
  ).populate('company', 'name defaultDeduction')
  if (!doc) return res.status(404).json({ message: 'Not found' })
  res.json(withComputedOrderFields(doc))
}))

// Helper exported for production & payment routes to call
async function recalcProduced(orderId) {
  const agg = await Production.aggregate([
    { $match: { order: new mongoose.Types.ObjectId(orderId) } },
    { $group: { _id: null, total: { $sum: '$meter' } } },
  ])
  const producedMeter = agg[0]?.total || 0
  const order = await Order.findById(orderId).select('expectedMeter manuallyCompleted')
  if (!order) return

  const updatePayload = { producedMeter }
  // Don't auto-reset status if user manually completed the order
  if (!order.manuallyCompleted) {
    updatePayload.status = producedMeter >= (order.expectedMeter || 0) && (order.expectedMeter || 0) > 0 ? 'completed' : 'active'
  }
  await Order.findByIdAndUpdate(orderId, updatePayload)
}

async function recalcReceived(orderId) {
  const agg = await Payment.aggregate([
    { $match: { order: new mongoose.Types.ObjectId(orderId) } },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ])
  await Order.findByIdAndUpdate(orderId, { totalReceived: agg[0]?.total || 0 })
}

async function normalizeOrderPayload(body = {}) {
  const payload = { ...body }
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
  const totalValue = (o.producedMeter || 0) * (o.ratePerMeter || 0)
  const deductionHoldAmount = totalValue * ((o.deductionPct || 0) / 100)
  const payableAmount = totalValue - deductionHoldAmount
  const remainingPayment = Math.max(0, payableAmount - (o.totalReceived || 0))
  const paymentStatus = (o.totalReceived || 0) > 0 && remainingPayment === 0 ? 'completed' : 'pending'
  // Respect manuallyCompleted flag; otherwise derive from production vs expected
  const status = o.manuallyCompleted
    ? 'completed'
    : ((o.producedMeter || 0) >= (o.expectedMeter || 0) && (o.expectedMeter || 0) > 0 ? 'completed' : 'active')

  return {
    ...o,
    status,
    remainingQty: Math.max(0, (o.expectedMeter || 0) - (o.producedMeter || 0)),
    totalValue,
    deductionHoldAmount,
    payableAmount,
    paymentStatus,
    paymentRemaining: remainingPayment,
  }
}

module.exports = router
module.exports.recalcProduced = recalcProduced
module.exports.recalcReceived = recalcReceived
