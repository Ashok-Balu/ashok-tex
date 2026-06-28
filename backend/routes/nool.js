const router = require('express').Router()
const ah     = require('express-async-handler')
const auth   = require('../middleware/auth')
const { Nool, Order } = require('../models')

router.use(auth)

const noolPopulate = {
  path: 'order',
  select: 'orderName company',
  populate: { path: 'company', select: 'name' },
}

router.get('/', ah(async (req, res) => {
  const f = {}
  if (req.query.orderId) f.order = req.query.orderId
  let query = Nool.find(f).sort({ date: -1, createdAt: -1 })
  if (!req.query.orderId) {
    query = query.populate(noolPopulate)
  }
  res.json(await query.lean())
}))

router.post('/', ah(async (req, res) => {
  const order = await Order.findById(req.body.order).select('productionClosed')
  if (!order) return res.status(404).json({ message: 'Order not found' })
  if (order.productionClosed) {
    return res.status(400).json({ message: 'Order production is closed. Nool entry not allowed.' })
  }

  const doc = await Nool.create(req.body)
  await doc.populate(noolPopulate)

  res.status(201).json(doc)
}))

router.put('/:id', ah(async (req, res) => {
  const existing = await Nool.findById(req.params.id).select('order')
  if (!existing) return res.status(404).json({ message: 'Not found' })
  const order = await Order.findById(existing.order).select('productionClosed')
  if (order?.productionClosed) {
    return res.status(400).json({ message: 'Order production is closed. Nool entry cannot be edited.' })
  }

   const doc = await Nool.findByIdAndUpdate(req.params.id, req.body, { new: true }).populate(noolPopulate)
  doc ? res.json(doc) : res.status(404).json({ message: 'Not found' })
}))

router.delete('/:id', ah(async (req, res) => {
  const existing = await Nool.findById(req.params.id).select('order')
  if (!existing) return res.status(404).json({ message: 'Not found' })
  const order = await Order.findById(existing.order).select('productionClosed')
  if (order?.productionClosed) {
    return res.status(400).json({ message: 'Order production is closed. Nool entry cannot be deleted.' })
  }

  await Nool.findByIdAndDelete(req.params.id)
  res.json({ message: 'Deleted' })
}))

module.exports = router
