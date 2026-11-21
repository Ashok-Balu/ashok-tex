const router = require('express').Router()
const ah = require('express-async-handler')
const auth = require('../middleware/auth')
const mongoose = require('mongoose')
const { Rejection, Order, Production } = require('../models')
const { recalcProduced, withComputedOrderFields } = require('./orders')

router.use(auth)

async function totalProduced(orderId) {
  const agg = await Production.aggregate([
    { $match: { order: new mongoose.Types.ObjectId(orderId) } },
    { $group: { _id: null, total: { $sum: '$meter' } } },
  ])
  return Number(agg[0]?.total || 0)
}

async function totalRejected(orderId, excludeId = null) {
  const match = { order: new mongoose.Types.ObjectId(orderId) }
  if (excludeId) match._id = { $ne: new mongoose.Types.ObjectId(excludeId) }
  const agg = await Rejection.aggregate([
    { $match: match },
    { $group: { _id: null, total: { $sum: '$rejectedQty' } } },
  ])
  return Number(agg[0]?.total || 0)
}

router.get('/', ah(async (req, res) => {
  const f = {}
  if (req.query.orderId) f.order = req.query.orderId
  res.json(await Rejection.find(f).sort({ date: -1 }).lean())
}))

router.post('/', ah(async (req, res) => {
  const orderId = req.body.order
  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    return res.status(400).json({ message: 'Invalid order id' })
  }

  const order = await Order.findById(orderId).select('productionClosed')
  if (!order) return res.status(404).json({ message: 'Order not found' })
  if (order.productionClosed) {
    return res.status(400).json({ message: 'Order production is closed. Rejection cannot be added.' })
  }

  const qty = Number(req.body.rejectedQty || 0)
  if (qty <= 0) return res.status(400).json({ message: 'Rejected quantity must be greater than zero' })

  const [produced, rejected] = await Promise.all([
    totalProduced(orderId),
    totalRejected(orderId),
  ])

  if (rejected + qty > produced + 1e-9) {
    return res.status(400).json({ message: 'Rejected quantity cannot exceed produced quantity' })
  }

  const doc = await Rejection.create({
    order: orderId,
    rejectedQty: qty,
    date: req.body.date ? new Date(req.body.date) : new Date(),
    reason: req.body.reason || '',
    notes: req.body.notes || '',
  })

  await recalcProduced(orderId)
  const updatedOrderDoc = await Order.findById(orderId).populate('company', 'name defaultDeduction')
  res.status(201).json({
    entry: doc,
    order: updatedOrderDoc ? withComputedOrderFields(updatedOrderDoc) : null,
  })
}))

router.put('/:id', ah(async (req, res) => {
  const existing = await Rejection.findById(req.params.id)
  if (!existing) return res.status(404).json({ message: 'Not found' })

  const order = await Order.findById(existing.order).select('productionClosed')
  if (!order) return res.status(404).json({ message: 'Order not found' })
  if (order.productionClosed) {
    return res.status(400).json({ message: 'Order production is closed. Rejection cannot be edited.' })
  }

  const qty = Number(req.body.rejectedQty || existing.rejectedQty || 0)
  if (qty <= 0) return res.status(400).json({ message: 'Rejected quantity must be greater than zero' })

  const [produced, rejectedExcluding] = await Promise.all([
    totalProduced(existing.order),
    totalRejected(existing.order, existing._id),
  ])

  if (rejectedExcluding + qty > produced + 1e-9) {
    return res.status(400).json({ message: 'Rejected quantity cannot exceed produced quantity' })
  }

  existing.rejectedQty = qty
  if (req.body.date) existing.date = new Date(req.body.date)
  if (Object.prototype.hasOwnProperty.call(req.body, 'reason')) existing.reason = req.body.reason || ''
  if (Object.prototype.hasOwnProperty.call(req.body, 'notes')) existing.notes = req.body.notes || ''
  await existing.save()

  await recalcProduced(existing.order)
  const updatedOrderDoc = await Order.findById(existing.order).populate('company', 'name defaultDeduction')
  res.json({
    entry: existing,
    order: updatedOrderDoc ? withComputedOrderFields(updatedOrderDoc) : null,
  })
}))

router.delete('/:id', ah(async (req, res) => {
  const existing = await Rejection.findById(req.params.id)
  if (!existing) return res.status(404).json({ message: 'Not found' })

  const order = await Order.findById(existing.order).select('productionClosed')
  if (!order) return res.status(404).json({ message: 'Order not found' })
  if (order.productionClosed) {
    return res.status(400).json({ message: 'Order production is closed. Rejection cannot be deleted.' })
  }

  await existing.deleteOne()
  await recalcProduced(existing.order)
  const updatedOrderDoc = await Order.findById(existing.order).populate('company', 'name defaultDeduction')
  res.json({
    message: 'Deleted',
    deletedId: req.params.id,
    order: updatedOrderDoc ? withComputedOrderFields(updatedOrderDoc) : null,
  })
}))

module.exports = router
