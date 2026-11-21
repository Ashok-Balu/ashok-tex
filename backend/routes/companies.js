// ── companies.js ─────────────────────────────────────────────────────────────
const router  = require('express').Router()
const ah      = require('express-async-handler')
const auth    = require('../middleware/auth')
const mongoose = require('mongoose')
const { Company, Order, Payment, PaymentAllocation, Production, Rejection, Nool, ColourProduction, OrderHistory, Settlement, DeductionTransfer } = require('../models')

router.use(auth)

const nameTaken = async (name, excludeId = null) => {
  const q = { name: String(name || '').trim() }
  if (excludeId) q._id = { $ne: excludeId }
  return !!(await Company.exists(q).collation({ locale: 'en', strength: 2 }))
}
const pickCompany = (body) => {
  const data = {}
  if (body.name !== undefined) data.name = body.name
  if (body.defaultDeduction !== undefined) data.defaultDeduction = body.defaultDeduction
  return data
}

router.get('/',     ah(async (_, res) => res.json(await Company.find().sort({ name: 1 }).lean())))
router.post('/',    ah(async (req, res) => {
  const data = pickCompany(req.body)
  if (data.name && await nameTaken(data.name)) return res.status(409).json({ message: 'A company with this name already exists' })
  res.status(201).json(await Company.create(data))
}))
router.put('/:id',  ah(async (req, res) => {
  const data = pickCompany(req.body)
  if (data.name && mongoose.Types.ObjectId.isValid(req.params.id) && await nameTaken(data.name, req.params.id)) {
    return res.status(409).json({ message: 'A company with this name already exists' })
  }
  const doc = await Company.findByIdAndUpdate(req.params.id, data, { new: true, runValidators: true })
  doc ? res.json(doc) : res.status(404).json({ message: 'Not found' })
}))

// Get deletion impact stats
router.get('/:id/deletion-stats', ah(async (req, res) => {
  const { id } = req.params
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'Invalid company id' })
  }

  const company = await Company.findById(id)
  if (!company) {
    return res.status(404).json({ message: 'Company not found' })
  }

  // Find all orders for this company
  const orders = await Order.find({ company: id }).select('_id').lean()
  const orderIds = orders.map(o => o._id)

  // Count deletions
  const ordersCount = orders.length
  const paymentsCount = await Payment.countDocuments({ company: id })
  const productionCount = await Production.countDocuments({ order: { $in: orderIds } })
  const noolCount = await Nool.countDocuments({ order: { $in: orderIds } })

  res.json({
    company: company.name,
    ordersCount,
    paymentsCount,
    productionCount,
    noolCount,
    totalItems: ordersCount + paymentsCount + productionCount + noolCount,
  })
}))

// Delete company with cascading deletes
router.delete('/:id', ah(async (req, res) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Forbidden – admin only' })
  }

  const { id } = req.params
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'Invalid company id' })
  }

  const company = await Company.findById(id)
  if (!company) {
    return res.status(404).json({ message: 'Company not found' })
  }

  // Find all orders for this company
  const orders = await Order.find({ company: id }).select('_id').lean()
  const orderIds = orders.map(o => o._id)

  // Delete all related data in order
  await Production.deleteMany({ order: { $in: orderIds } })
  await Rejection.deleteMany({ order: { $in: orderIds } })
  await Nool.deleteMany({ order: { $in: orderIds } })
  await ColourProduction.deleteMany({ order: { $in: orderIds } })
  await OrderHistory.deleteMany({ order: { $in: orderIds } })
  await PaymentAllocation.deleteMany({ company: id })
  await Payment.deleteMany({ $or: [{ company: id }, { order: { $in: orderIds } }] })
  await Settlement.deleteMany({ company: id })
  await DeductionTransfer.deleteMany({ company: id })
  await Order.deleteMany({ company: id })

  // Finally delete the company
  await Company.findByIdAndDelete(id)

  res.json({ 
    message: 'Company and all associated data deleted',
    deletedCompany: company.name,
  })
}))

module.exports = router
