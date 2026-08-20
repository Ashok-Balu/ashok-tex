const router   = require('express').Router()
const ah       = require('express-async-handler')
const auth     = require('../middleware/auth')
const { Payment } = require('../models')
const { getCompanyBalance } = require('../services/companyBalance')

router.use(auth)

router.get('/', ah(async (req, res) => {
  const f = {}
  if (req.query.companyId) f.company = req.query.companyId
  if (req.query.orderId) f.order = req.query.orderId
  if (req.query.mode)    f.mode  = req.query.mode
  if (req.query.from || req.query.to) {
    f.date = {}
    if (req.query.from) f.date.$gte = new Date(req.query.from)
    if (req.query.to)   { const e = new Date(req.query.to); e.setHours(23,59,59,999); f.date.$lte = e }
  }
  res.json(await Payment.find(f)
    .populate('company', 'name')
    .populate('order', 'orderName deductionPct')
    .sort({ date: -1 })
    .lean())
}))

router.post('/', ah(async (req, res) => {
  const payload = { ...req.body }
  payload.company = payload.company || payload.companyId
  if (payload.order) {
    return res.status(400).json({ message: 'Direct order payment is disabled. Use allocation module.' })
  }
  const doc = await Payment.create(payload)
  await doc.populate('company', 'name')
  await doc.populate('order', 'orderName deductionPct')
  res.status(201).json(doc)
}))

router.put('/:id', ah(async (req, res) => {
  const payload = { ...req.body }
  payload.company = payload.company || payload.companyId
  if (payload.order) {
    return res.status(400).json({ message: 'Direct order payment is disabled. Use allocation module.' })
  }
  const doc = await Payment.findByIdAndUpdate(req.params.id, payload, { new: true })
    .populate('company', 'name')
    .populate('order', 'orderName deductionPct')
  if (!doc) return res.status(404).json({ message: 'Not found' })
  res.json(doc)
}))

router.delete('/:id', ah(async (req, res) => {
  const payment = await Payment.findById(req.params.id).lean()
  if (!payment) return res.status(404).json({ message: 'Not found' })

  // Check if deletion will cause negative balance
  let warning = null
  if (payment.company && payment.transactionType !== 'deduction') {
    const { balance } = await getCompanyBalance(payment.company)
    const balanceAfterDelete = balance - Number(payment.amount || 0)
    if (balanceAfterDelete < 0) {
      warning = `Company balance will become negative (₹${Math.round(balanceAfterDelete)})`
    }
  }

  await Payment.findByIdAndDelete(req.params.id)
  res.json({ message: 'Deleted', warning })
}))

module.exports = router
