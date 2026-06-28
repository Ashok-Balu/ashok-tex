const router   = require('express').Router()
const ah       = require('express-async-handler')
const auth     = require('../middleware/auth')
const mongoose = require('mongoose')
const { Payment, PaymentAllocation, Production, Expense, Company, Order } = require('../models')

router.use(auth)

function getRange(req) {
  const now = new Date()
  const from = req.query.from ? new Date(req.query.from) : new Date(now.getFullYear(), now.getMonth(), 1)
  const to   = req.query.to   ? (() => { const d = new Date(req.query.to); d.setHours(23,59,59,999); return d })() : now
  return { from, to }
}

// GET /api/reports/monthly-payment-by-company
router.get('/monthly-payment-by-company', ah(async (req, res) => {
  const { from, to } = getRange(req)
  const [companies, receivedAgg, allocatedAgg, orderAgg] = await Promise.all([
    Company.find({}, 'name'),
    Payment.aggregate([
      { $match: { date: { $gte: from, $lte: to }, transactionType: { $ne: 'deduction' } } },
      { $group: { _id: '$company', received: { $sum: '$amount' } } },
    ]),
    PaymentAllocation.aggregate([
      { $match: { date: { $gte: from, $lte: to } } },
      { $group: { _id: '$company', allocated: { $sum: '$amount' } } },
    ]),
    Order.aggregate([
      { $match: { archived: { $ne: true } } },
      {
        $group: {
          _id: '$company',
          orders: { $sum: 1 },
          deduction: {
            $sum: {
              $multiply: [
                {
                  $ifNull: [
                    '$acceptedMeter',
                    { $max: [0, { $subtract: [{ $ifNull: ['$producedMeter', 0] }, { $ifNull: ['$rejectedMeter', 0] }] }] },
                  ],
                },
                { $ifNull: ['$ratePerMeter', 0] },
                { $divide: [{ $ifNull: ['$deductionPct', 0] }, 100] },
              ],
            },
          },
        },
      },
    ]),
  ])

  const nameMap = new Map(companies.map(c => [String(c._id), c.name]))
  const receivedMap = new Map(receivedAgg.map(r => [String(r._id), r.received || 0]))
  const allocatedMap = new Map(allocatedAgg.map(r => [String(r._id), r.allocated || 0]))
  const orderMap = new Map(orderAgg.map(r => [String(r._id), { orders: r.orders || 0, deduction: r.deduction || 0 }]))
  const keys = new Set([...nameMap.keys(), ...receivedMap.keys(), ...allocatedMap.keys(), ...orderMap.keys()])

  const rows = Array.from(keys).map(id => ({
    company: nameMap.get(id) || 'Unknown',
    orders: orderMap.get(id)?.orders || 0,
    received: receivedMap.get(id) || 0,
    allocated: allocatedMap.get(id) || 0,
    unallocated: Math.max(0, (receivedMap.get(id) || 0) - (allocatedMap.get(id) || 0)),
    deduction: orderMap.get(id)?.deduction || 0,
  }))

  res.json(rows.sort((a, b) => a.company.localeCompare(b.company)))
}))

// GET /api/reports/company-order-statement
router.get('/company-order-statement', ah(async (req, res) => {
  const { companyId } = req.query
  if (!companyId || !mongoose.Types.ObjectId.isValid(companyId)) {
    return res.status(400).json({ message: 'Valid companyId is required' })
  }

  const { from, to } = getRange(req)
  const companyObjectId = new mongoose.Types.ObjectId(companyId)

  const [company, orders] = await Promise.all([
    Company.findById(companyObjectId).select('name'),
    Order.find({ company: companyObjectId })
      .select('orderName status expectedMeter ratePerMeter deductionPct rejectedMeter')
      .sort({ createdAt: 1 }),
  ])

  if (!company) return res.status(404).json({ message: 'Company not found' })
  if (!orders.length) {
    return res.json({
      company: { _id: company._id, name: company.name },
      from,
      to,
      previousBalance: 0,
      rows: [],
    })
  }

  const orderIds = orders.map(o => o._id)

  const [rangeProdAgg, beforeProdAgg, paidBeforeAgg] = await Promise.all([
    Production.aggregate([
      { $match: { order: { $in: orderIds }, date: { $gte: from, $lte: to } } },
      { $group: { _id: '$order', produced: { $sum: '$meter' } } },
    ]),
    Production.aggregate([
      { $match: { order: { $in: orderIds }, date: { $lt: from } } },
      { $group: { _id: '$order', produced: { $sum: '$meter' } } },
    ]),
    PaymentAllocation.aggregate([
      {
        $match: {
          order: { $in: orderIds },
          date: { $lte: to },
        },
      },
      { $group: { _id: null, paid: { $sum: '$amount' } } },
    ]),
  ])

  const producedInRangeMap = new Map(rangeProdAgg.map(r => [String(r._id), Number(r.produced || 0)]))
  const producedBeforeMap = new Map(beforeProdAgg.map(r => [String(r._id), Number(r.produced || 0)]))

  const previousPayableTotal = orders.reduce((sum, order) => {
    const producedBefore = producedBeforeMap.get(String(order._id)) || 0
    const rejected = Number(order.rejectedMeter || 0)
    const acceptedBefore = Math.max(0, producedBefore - rejected)
    const rate = Number(order.ratePerMeter || 0)
    const deductionPct = Number(order.deductionPct || 0)
    const totalBefore = acceptedBefore * rate
    const deductionBefore = totalBefore * (deductionPct / 100)
    return sum + (totalBefore - deductionBefore)
  }, 0)

  const previousPaidTotal = Number(paidBeforeAgg[0]?.paid || 0)
    const previousBalance = Number((previousPayableTotal - previousPaidTotal).toFixed(2))

  const rows = orders.map(order => {
    const produced = producedInRangeMap.get(String(order._id)) || 0
    const accepted = Math.max(0, produced - Number(order.rejectedMeter || 0))
    const ratePerMeter = Number(order.ratePerMeter || 0)
    const deductionPct = Number(order.deductionPct || 0)
    const totalAmount = accepted * ratePerMeter
    const deductionAmt = totalAmount * (deductionPct / 100)
    const payableAmount = totalAmount - deductionAmt

    return {
      order: order.orderName || '-',
      orderState: order.status || 'active',
      expectedQuantity: Number(order.expectedMeter || 0),
      produced: Number(produced.toFixed(2)),
      accepted: Number(accepted.toFixed(2)),
      rejected: Number(Math.max(0, Number(order.rejectedMeter || 0)).toFixed(2)),
      ratePerMeter,
      totalAmount: Number(totalAmount.toFixed(2)),
      deductionPct,
      deductionAmt: Number(deductionAmt.toFixed(2)),
      payableAmount: Number(payableAmount.toFixed(2)),
      previousBalance,
    }
  }).filter(row => Number(row.produced || 0) > 0)

  res.json({
    company: { _id: company._id, name: company.name },
    from,
    to,
    previousBalance,
    rows,
  })
}))

// GET /api/reports/monthly-payment-by-mode
router.get('/monthly-payment-by-mode', ah(async (req, res) => {
  const { from, to } = getRange(req)
  const agg = await Payment.aggregate([
    { $match: { date: { $gte: from, $lte: to }, transactionType: { $ne: 'deduction' } } },
    { $group: { _id: '$mode', amount: { $sum: '$amount' }, count: { $sum: 1 } } },
  ])
  res.json(agg.map(a => ({ mode: a._id, amount: a.amount, count: a.count })))
}))

// GET /api/reports/production
router.get('/production', ah(async (req, res) => {
  const { from, to } = getRange(req)
  const agg = await Production.aggregate([
    { $match: { date: { $gte: from, $lte: to } } },
    { $group: { _id: { order: '$order', shift: '$shift' }, total: { $sum: '$meter' } } },
    { $group: { _id: '$_id.order', shifts: { $push: { shift: '$_id.shift', total: '$total' } }, totalMeter: { $sum: '$total' } } },
    { $lookup: { from: 'orders', localField: '_id', foreignField: '_id', as: 'order' } },
    { $unwind: { path: '$order', preserveNullAndEmptyArrays: true } },
    { $sort: { totalMeter: -1 } },
  ])
  res.json(agg.map(a => ({
    orderId:    a._id,
    orderName:  a.order?.orderName || '-',
    morning:    a.shifts.find(s => s.shift === 'morning')?.total || 0,
    night:      a.shifts.find(s => s.shift === 'night')?.total   || 0,
    totalMeter: a.totalMeter,
  })))
}))

// GET /api/reports/expense
router.get('/expense', ah(async (req, res) => {
  const { from, to } = getRange(req)
  const entries = await Expense.find({ date: { $gte: from, $lte: to } }).sort({ date: -1 })
  const byType  = {}
  entries.forEach(e => { byType[e.type] = (byType[e.type] || 0) + e.amount })
  res.json({ entries, byType })
}))

module.exports = router
