const router   = require('express').Router()
const ah       = require('express-async-handler')
const auth     = require('../middleware/auth')
const { Production, MachineSetting, Order } = require('../models')
const { recalcProduced, withComputedOrderFields } = require('./orders')

router.use(auth)

router.get('/machines', ah(async (_, res) => {
  let s = await MachineSetting.findOne()
  if (!s) s = await MachineSetting.create({ count: 16 })
  res.json({ count: s.count })
}))

router.put('/machines', ah(async (req, res) => {
  let s = await MachineSetting.findOne()
  if (!s) s = await MachineSetting.create({ count: req.body.count })
  else    { s.count = req.body.count; await s.save() }
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
  const order = await Order.findById(req.body.order).select('productionClosed')
  if (!order) return res.status(404).json({ message: 'Order not found' })
  if (order.productionClosed) {
    return res.status(400).json({ message: 'Order production is closed. Entry not allowed.' })
  }

  const doc = await Production.create(req.body)
  await recalcProduced(doc.order)
  const updatedOrderDoc = await Order.findById(doc.order).populate('company', 'name defaultDeduction')
  res.status(201).json({
    entry: doc,
    order: updatedOrderDoc ? withComputedOrderFields(updatedOrderDoc) : null,
  })
}))

router.put('/:id', ah(async (req, res) => {
  const existing = await Production.findById(req.params.id).select('order')
  if (!existing) return res.status(404).json({ message: 'Not found' })
  const order = await Order.findById(existing.order).select('productionClosed')
  if (order?.productionClosed) {
    return res.status(400).json({ message: 'Order production is closed. Entry cannot be edited.' })
  }

  const doc = await Production.findByIdAndUpdate(req.params.id, req.body, { new: true })
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
