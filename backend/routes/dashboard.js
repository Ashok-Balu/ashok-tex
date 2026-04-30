const router   = require('express').Router()
const ah       = require('express-async-handler')
const auth     = require('../middleware/auth')
const mongoose = require('mongoose')
const { Order, Production, Expense, Payment, MachineSetting, Company } = require('../models')

router.use(auth)

router.get('/', ah(async (req, res) => {
  const now        = new Date()
  const todayStart = new Date(now); todayStart.setHours(0,0,0,0)
  const todayEnd   = new Date(now); todayEnd.setHours(23,59,59,999)
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const weekStart  = new Date(now); weekStart.setDate(now.getDate() - now.getDay())
  weekStart.setHours(0, 0, 0, 0)

  const [
    activeOrders, completedOrders,
    todayProd, monthExp,
    monthPay, setting,
    companyOrders,
    paymentByCompany,
    latestPaymentByCompany,
  ] = await Promise.all([
    Order.countDocuments({ status: 'active' }),
    Order.countDocuments({ status: 'completed' }),
    Production.aggregate([{ $match: { date: { $gte: todayStart, $lte: todayEnd } } }, { $group: { _id: null, t: { $sum: '$meter' } } }]),
    Expense.aggregate([{ $match: { date: { $gte: monthStart } } },                     { $group: { _id: null, t: { $sum: '$amount' } } }]),
    Payment.aggregate([{ $match: { date: { $gte: monthStart }, transactionType: { $ne: 'deduction' } } }, { $group: { _id: null, t: { $sum: '$amount' } } }]),
    MachineSetting.findOne(),
    Order.find({}).populate('company', 'name'),
    Payment.aggregate([
      {
        $group: {
          _id: '$company',
          totalPaid: {
            $sum: {
              $cond: [{ $eq: ['$transactionType', 'deduction'] }, 0, '$amount'],
            },
          },
          totalDeductionCollected: {
            $sum: {
              $cond: [{ $eq: ['$transactionType', 'deduction'] }, '$amount', 0],
            },
          },
        },
      },
    ]),
    Payment.aggregate([
      { $group: { _id: '$company', lastAt: { $max: '$updatedAt' } } },
    ]),
  ])

  const paidMap = new Map(paymentByCompany.map(row => [String(row._id), row.totalPaid || 0]))
  const deductionCollectedMap = new Map(paymentByCompany.map(row => [String(row._id), row.totalDeductionCollected || 0]))
  const latestPaymentAtMap = new Map(latestPaymentByCompany.map(row => [String(row._id), row.lastAt]))

  const byCompany = new Map()
  for (const o of companyOrders) {
    const companyId = o.company?._id?.toString() || 'unknown'
    const entry = byCompany.get(companyId) || {
      companyId,
      companyName: o.company?.name || 'Unknown',
      orderCount: 0,
      activeOrders: 0,
      completedOrders: 0,
      paymentPending: 0,
      paymentCompleted: 0,
      producedMeter: 0,
      expectedMeter: 0,
      remainingMeter: 0,
      totalProducedValue: 0,
      totalDeductionNeedToGet: 0,
      totalDeductionCollected: deductionCollectedMap.get(companyId) || 0,
      totalPayableAmount: 0,
      totalPaidAmount: paidMap.get(companyId) || 0,
      totalPendingToPay: 0,
    }

    const totalValue = (o.producedMeter || 0) * (o.ratePerMeter || 0)
    const deduction = totalValue * ((o.deductionPct || 0) / 100)
    const payable = totalValue - deduction

    entry.orderCount += 1
    entry.activeOrders += o.status === 'active' ? 1 : 0
    entry.completedOrders += o.status === 'completed' ? 1 : 0
    entry.producedMeter += o.producedMeter || 0
    entry.expectedMeter += o.expectedMeter || 0
    entry.remainingMeter += Math.max(0, (o.expectedMeter || 0) - (o.producedMeter || 0))
    entry.totalProducedValue += totalValue
    entry.totalDeductionNeedToGet += deduction
    entry.totalPayableAmount += payable
    // track most recent order activity
    const oTs = new Date(o.updatedAt || o.createdAt || 0).getTime()
    if (oTs > (entry._lastOrderTs || 0)) entry._lastOrderTs = oTs

    byCompany.set(companyId, entry)
  }

  const companyOrderSummary = Array.from(byCompany.values()).map(entry => {
    const pending = Math.max(0, entry.totalPayableAmount - entry.totalPaidAmount)
    const deductionOutstanding = Math.max(0, Number(entry.totalDeductionNeedToGet || 0) - Number(entry.totalDeductionCollected || 0))
    const paymentTs = new Date(latestPaymentAtMap.get(entry.companyId) || 0).getTime()
    const lastActivityAt = new Date(Math.max(entry._lastOrderTs || 0, paymentTs)).toISOString()
    return {
      ...entry,
      _lastOrderTs: undefined,
      lastActivityAt,
      totalDeductionNeedToGet: deductionOutstanding,
      paymentPending: pending > 0 ? 1 : 0,
      paymentCompleted: pending <= 0 ? 1 : 0,
      totalPendingToPay: pending,
    }
  }).sort((a, b) => a.companyName.localeCompare(b.companyName))

  const pendingAmount = companyOrderSummary.reduce((sum, row) => sum + (row.totalPendingToPay || 0), 0)
  const deductionHoldAmount = companyOrderSummary.reduce((sum, row) => sum + (row.totalDeductionNeedToGet || 0), 0)
  const pendingPaymentCount = companyOrderSummary.filter(row => (row.totalPendingToPay || 0) > 0).length
  const completedPaymentCount = companyOrderSummary.filter(row => (row.totalPendingToPay || 0) <= 0).length

  res.json({
    activeOrders, completedOrders,
    todayProduction:   todayProd[0]?.t     || 0,
    activeMachines:    setting?.count      || 16,
    monthExpense:      monthExp[0]?.t      || 0,
    totalExpense:      monthExp[0]?.t      || 0,
    pendingAmount,
    pendingPaymentCount,
    completedPaymentCount,
    deductionHoldAmount,
    monthlyReceipt:    monthPay[0]?.t      || 0,
    companyOrderSummary,
  })
}))

router.get('/company-payments/:companyId', ah(async (req, res) => {
  const { companyId } = req.params
  if (!mongoose.Types.ObjectId.isValid(companyId)) {
    return res.status(400).json({ message: 'Invalid company id' })
  }

  const now = new Date()
  const from = req.query.from ? new Date(req.query.from) : new Date(now.getFullYear(), now.getMonth(), 1)
  const to = req.query.to ? new Date(req.query.to) : now
  to.setHours(23, 59, 59, 999)

  const companyObjectId = new mongoose.Types.ObjectId(companyId)

  const [company, rows, rangeAgg, orderAgg] = await Promise.all([
    Company.findById(companyId).select('name'),
    Payment.find({ company: companyObjectId, date: { $gte: from, $lte: to } })
      .select('date amount mode notes transactionType')
      .sort({ date: -1 }),
    Payment.aggregate([
      { $match: { company: companyObjectId, date: { $gte: from, $lte: to } } },
      {
        $group: {
          _id: null,
          totalPaidInRange: {
            $sum: {
              $cond: [{ $eq: ['$transactionType', 'deduction'] }, 0, '$amount'],
            },
          },
          totalDeductionInRange: {
            $sum: {
              $cond: [{ $eq: ['$transactionType', 'deduction'] }, '$amount', 0],
            },
          },
        },
      },
    ]),
    Order.aggregate([
      { $match: { company: companyObjectId } },
      {
        $group: {
          _id: null,
          orderCount: { $sum: 1 },
          activeOrders: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
          completedOrders: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          producedMeter: { $sum: { $ifNull: ['$producedMeter', 0] } },
          expectedMeter: { $sum: { $ifNull: ['$expectedMeter', 0] } },
          totalProducedValue: {
            $sum: {
              $multiply: [
                { $ifNull: ['$producedMeter', 0] },
                { $ifNull: ['$ratePerMeter', 0] },
              ],
            },
          },
          totalDeductionNeedToGet: {
            $sum: {
              $multiply: [
                { $ifNull: ['$producedMeter', 0] },
                { $ifNull: ['$ratePerMeter', 0] },
                { $divide: [{ $ifNull: ['$deductionPct', 0] }, 100] },
              ],
            },
          },
        },
      },
    ]),
  ])

  const companyTotals = orderAgg[0] || {
    orderCount: 0,
    activeOrders: 0,
    completedOrders: 0,
    producedMeter: 0,
    expectedMeter: 0,
    totalProducedValue: 0,
    totalDeductionNeedToGet: 0,
  }

  const totalPaidAllTime = await Payment.aggregate([
    { $match: { company: companyObjectId } },
    {
      $group: {
        _id: null,
        totalPaid: {
          $sum: {
            $cond: [{ $eq: ['$transactionType', 'deduction'] }, 0, '$amount'],
          },
        },
        totalDeductionCollected: {
          $sum: {
            $cond: [{ $eq: ['$transactionType', 'deduction'] }, '$amount', 0],
          },
        },
      },
    },
  ])

  const totalPayableAmount = (companyTotals.totalProducedValue || 0) - (companyTotals.totalDeductionNeedToGet || 0)
  const totalPaidAmount = totalPaidAllTime[0]?.totalPaid || 0
  const totalDeductionCollected = totalPaidAllTime[0]?.totalDeductionCollected || 0
  const totalDeductionNeedToGet = Math.max(0, (companyTotals.totalDeductionNeedToGet || 0) - totalDeductionCollected)
  const totalPendingToPay = Math.max(0, totalPayableAmount - totalPaidAmount)

  res.json({
    from,
    to,
    company: { _id: companyId, name: company?.name || 'Unknown' },
    summary: {
      orderCount: companyTotals.orderCount || 0,
      activeOrders: companyTotals.activeOrders || 0,
      completedOrders: companyTotals.completedOrders || 0,
      producedMeter: companyTotals.producedMeter || 0,
      expectedMeter: companyTotals.expectedMeter || 0,
      totalProducedValue: companyTotals.totalProducedValue || 0,
      totalDeductionNeedToGet,
      totalDeductionCollected,
      totalPayableAmount,
      totalPaidAmount,
      totalPendingToPay,
      totalPaidInRange: rangeAgg[0]?.totalPaidInRange || 0,
      totalDeductionInRange: rangeAgg[0]?.totalDeductionInRange || 0,
    },
    rows,
  })
}))

router.post('/company-payments/:companyId', ah(async (req, res) => {
  const { companyId } = req.params
  if (!mongoose.Types.ObjectId.isValid(companyId)) {
    return res.status(400).json({ message: 'Invalid company id' })
  }

  const amount = Number(req.body.amount || 0)
  const transactionType = req.body.transactionType === 'deduction' ? 'deduction' : 'payment'
  if (amount <= 0) {
    return res.status(400).json({ message: 'Amount must be greater than zero' })
  }

  const doc = await Payment.create({
    company: companyId,
    transactionType,
    amount,
    mode: req.body.mode || 'cash',
    date: req.body.date ? new Date(req.body.date) : new Date(),
    notes: req.body.notes || '',
  })

  await doc.populate('company', 'name')
  res.status(201).json(doc)
}))

module.exports = router
