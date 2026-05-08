const router   = require('express').Router()
const ah       = require('express-async-handler')
const auth     = require('../middleware/auth')
const { Production, MachineSetting } = require('../models')
const { recalcProduced } = require('./orders')

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
  res.json(await Production.find(f).populate('order', 'orderName').sort({ date: -1, machineNo: 1 }).lean())
}))

router.post('/', ah(async (req, res) => {
  const doc = await Production.create(req.body)
  await recalcProduced(doc.order)
  await doc.populate('order', 'orderName')
  res.status(201).json(doc)
}))

router.put('/:id', ah(async (req, res) => {
  const doc = await Production.findByIdAndUpdate(req.params.id, req.body, { new: true }).populate('order', 'orderName')
  if (!doc) return res.status(404).json({ message: 'Not found' })
  const oid = doc.order?._id || doc.order
  await recalcProduced(oid)
  res.json(doc)
}))

router.delete('/:id', ah(async (req, res) => {
  const doc = await Production.findByIdAndDelete(req.params.id)
  if (doc) await recalcProduced(doc.order)
  res.json({ message: 'Deleted' })
}))

module.exports = router
