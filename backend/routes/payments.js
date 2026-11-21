const router   = require('express').Router()
const ah       = require('express-async-handler')
const mongoose = require('mongoose')
const auth     = require('../middleware/auth')
const { Payment, Company } = require('../models')
const { getCompanyBalance, getDeductionPositions } = require('../services/companyBalance')
const { allocateDeductionPool } = require('../services/deductionSettlement')
const { withCompanyLock } = require('../services/companyLock')

router.use(auth)

const PAYMENT_FIELDS = ['company', 'transactionType', 'amount', 'mode', 'reference', 'chequeNo', 'bankRef', 'date', 'notes']

function pickPayment(body) {
  const payload = {}
  for (const k of PAYMENT_FIELDS) if (body[k] !== undefined) payload[k] = body[k]
  const company = body.company || body.companyId
  if (company !== undefined) payload.company = company
  return payload
}

// Returns an error response descriptor, or null when the (partial) payload is acceptable.
async function checkPayload(payload, { requireAll }) {
  if (requireAll || payload.company !== undefined) {
    if (!mongoose.Types.ObjectId.isValid(payload.company)) return { status: 400, message: 'Valid company is required' }
    if (!(await Company.exists({ _id: payload.company }))) return { status: 404, message: 'Company not found' }
  }
  if (requireAll || payload.amount !== undefined) {
    const n = Number(payload.amount)
    if (!Number.isFinite(n) || n <= 0) return { status: 400, message: 'Amount must be greater than zero' }
    payload.amount = n
  }
  if (requireAll && !payload.mode) return { status: 400, message: 'Payment mode is required' }
  return null
}

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
  if (req.body.order) {
    return res.status(400).json({ message: 'Direct order payment is disabled. Use allocation module.' })
  }
  const payload = pickPayment(req.body)
  const invalid = await checkPayload(payload, { requireAll: true })
  if (invalid) return res.status(invalid.status).json({ message: invalid.message })

  const doc = await Payment.create(payload)
  if (doc.transactionType === 'deduction') await allocateDeductionPool(String(doc.company))
  await doc.populate('company', 'name')
  await doc.populate('order', 'orderName deductionPct')
  res.status(201).json(doc)
}))

router.put('/:id', ah(async (req, res) => {
  if (req.body.order) {
    return res.status(400).json({ message: 'Direct order payment is disabled. Use allocation module.' })
  }
  const existing = await Payment.findById(req.params.id).lean()
  if (!existing) return res.status(404).json({ message: 'Not found' })

  const payload = pickPayment(req.body)
  const invalid = await checkPayload(payload, { requireAll: false })
  if (invalid) return res.status(invalid.status).json({ message: invalid.message })

  return withCompanyLock(existing.company, async () => {
    // Lowering a deduction (or turning it into a receipt) is only allowed while the amount is still unassigned.
    if (existing.transactionType === 'deduction') {
      const newAmount = payload.amount ?? existing.amount
      const stillDeduction = (payload.transactionType ?? existing.transactionType) === 'deduction'
      const removed = stillDeduction ? Number(existing.amount) - Number(newAmount) : Number(existing.amount)
      if (removed > 0.01) {
        const pos = (await getDeductionPositions([String(existing.company)])).get(String(existing.company))
        if (pos && pos.credit < removed - 0.01) {
          return res.status(400).json({ message: 'This deduction is already assigned to archived orders and cannot be reduced' })
        }
      }
      if (payload.company && String(payload.company) !== String(existing.company)) {
        return res.status(400).json({ message: 'A deduction cannot be moved to another company' })
      }
    }

    const doc = await Payment.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true })
      .populate('company', 'name')
      .populate('order', 'orderName deductionPct')
    if (!doc) return res.status(404).json({ message: 'Not found' })
    if (doc.transactionType === 'deduction') await allocateDeductionPool(String(doc.company._id || doc.company))
    res.json(doc)
  })
}))

router.delete('/:id', ah(async (req, res) => {
  const payment = await Payment.findById(req.params.id).lean()
  if (!payment) return res.status(404).json({ message: 'Not found' })

  return withCompanyLock(payment.company, async () => {
    if (payment.transactionType === 'deduction') {
      const pos = (await getDeductionPositions([String(payment.company)])).get(String(payment.company))
      if (pos && pos.credit < Number(payment.amount || 0) - 0.01) {
        return res.status(400).json({ message: 'This deduction is already assigned to archived orders and cannot be deleted' })
      }
    }

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
  })
}))

module.exports = router

