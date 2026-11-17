const router   = require('express').Router()
const ah       = require('express-async-handler')
const mongoose = require('mongoose')
const auth     = require('../middleware/auth')
const { Production, MachineSetting, Order, Rejection } = require('../models')
const { recalcProduced, withComputedOrderFields } = require('./orders')

router.use(auth)

const ENTRY_FIELDS = ['machineNo', 'shift', 'dcNumber', 'meter', 'weightKg', 'date', 'notes']

function pickEntry(body) {
  const data = {}
  for (const k of ENTRY_FIELDS) if (Object.prototype.hasOwnProperty.call(body, k)) data[k] = body[k]
  return data
}

function validMeter(v) {
  const n = Number(v)
  return Number.isFinite(n) && n > 0
}

// Rejections may never exceed what was produced (same rule enforced when rejections are added).
async function rejectionBlocksProduction(orderId, newProducedTotal) {
  const [{ total = 0 } = {}] = await Rejection.aggregate([
    { $match: { order: new mongoose.Types.ObjectId(String(orderId)) } },
    { $group: { _id: null, total: { $sum: '$rejectedQty' } } },
  ])
  return total > newProducedTotal + 1e-9
}

async function producedTotal(orderId, excludeId = null) {
  const match = { order: new mongoose.Types.ObjectId(String(orderId)) }
  if (excludeId) match._id = { $ne: new mongoose.Types.ObjectId(String(excludeId)) }
  const [{ total = 0 } = {}] = await Production.aggregate([
    { $match: match },
    { $group: { _id: null, total: { $sum: '$meter' } } },
  ])
  return total
}

router.get('/machines', ah(async (_, res) => {
  let s = await MachineSetting.findOne()
  if (!s) s = await MachineSetting.create({ count: 16 })
  res.json({ count: s.count })
}))

router.put('/machines', ah(async (req, res) => {
  const count = Number(req.body.count)
  if (!Number.isInteger(count) || count < 1 || count > 1000) {
    return res.status(400).json({ message: 'Machine count must be a whole number between 1 and 1000' })
  }
  let s = await MachineSetting.findOne()
  if (!s) s = await MachineSetting.create({ count })
  else    { s.count = count; await s.save() }
  res.json({ count: s.count })
}))

router.get('/', ah(async (req, res) => {
  const f = {}
  if (req.query.orderId) f.order = req.query.orderId
  if (req.query.shift)   f.shift = req.query.shift
  if (req.query.date) {
    const d = new Date(req.query.date)
    f.date  = { $gte: new Date(d.setHours(0,0,0,0)), $lte: new Date(d.setHours(23,59,59,999)) }
  } else if (req.query.from || req.query.to) {
    f.date = {}
    if (req.query.from) {
      const from = new Date(req.query.from)
      from.setHours(0, 0, 0, 0)
      f.date.$gte = from
    }
    if (req.query.to) {
      const to = new Date(req.query.to)
      to.setHours(23, 59, 59, 999)
      f.date.$lte = to
    }
  }
  let query = Production.find(f).sort({ date: -1, machineNo: 1 })
  if (!req.query.orderId) {
    query = query.populate('order', 'orderName')
  }
  res.json(await query.lean())
}))

router.post('/', ah(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.body.order)) return res.status(400).json({ message: 'Invalid order id' })
  if (!validMeter(req.body.meter)) return res.status(400).json({ message: 'Meter must be greater than 0' })
  const order = await Order.findById(req.body.order).select('productionClosed deletedAt')
  if (!order || order.deletedAt) return res.status(404).json({ message: 'Order not found' })
  if (order.productionClosed) {
    return res.status(400).json({ message: 'Order production is closed. Entry not allowed.' })
  }

  const doc = await Production.create({ ...pickEntry(req.body), order: order._id })
  await recalcProduced(doc.order)
  const updatedOrderDoc = await Order.findById(doc.order).populate('company', 'name defaultDeduction')
  res.status(201).json({
    entry: doc,
    order: updatedOrderDoc ? withComputedOrderFields(updatedOrderDoc) : null,
  })
}))

router.put('/:id', ah(async (req, res) => {
  const existing = await Production.findById(req.params.id).select('order meter')
  if (!existing) return res.status(404).json({ message: 'Not found' })
  const order = await Order.findById(existing.order).select('productionClosed')
  if (order?.productionClosed) {
    return res.status(400).json({ message: 'Order production is closed. Entry cannot be edited.' })
  }

  const data = pickEntry(req.body)
  if (Object.prototype.hasOwnProperty.call(data, 'meter')) {
    if (!validMeter(data.meter)) return res.status(400).json({ message: 'Meter must be greater than 0' })
    const newTotal = (await producedTotal(existing.order, existing._id)) + Number(data.meter)
    if (await rejectionBlocksProduction(existing.order, newTotal)) {
      return res.status(400).json({ message: 'Produced quantity cannot drop below the rejected quantity' })
    }
  }

  const doc = await Production.findByIdAndUpdate(req.params.id, data, { new: true, runValidators: true })
  const oid = doc.order
  await recalcProduced(oid)
  const updatedOrderDoc = await Order.findById(oid).populate('company', 'name defaultDeduction')
  res.json({
    entry: doc,
    order: updatedOrderDoc ? withComputedOrderFields(updatedOrderDoc) : null,
  })
}))

router.delete('/:id', ah(async (req, res) => {
  const existing = await Production.findById(req.params.id).select('order')
  if (!existing) return res.status(404).json({ message: 'Not found' })
  const order = await Order.findById(existing.order).select('productionClosed')
  if (order?.productionClosed) {
    return res.status(400).json({ message: 'Order production is closed. Entry cannot be deleted.' })
  }
  if (await rejectionBlocksProduction(existing.order, await producedTotal(existing.order, existing._id))) {
    return res.status(400).json({ message: 'Cannot delete: remaining production would be less than the rejected quantity' })
  }

  const doc = await Production.findByIdAndDelete(req.params.id)
  if (doc) {
    await recalcProduced(doc.order)
    const updatedOrderDoc = await Order.findById(doc.order).populate('company', 'name defaultDeduction')
    return res.json({
      message: 'Deleted',
      deletedId: req.params.id,
      order: updatedOrderDoc ? withComputedOrderFields(updatedOrderDoc) : null,
    })
  }
  res.json({ message: 'Deleted', deletedId: req.params.id, order: null })
}))

module.exports = router
