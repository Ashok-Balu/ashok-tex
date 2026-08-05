const router   = require('express').Router()
const ah       = require('express-async-handler')
const auth     = require('../middleware/auth')
const mongoose = require('mongoose')
const { Order, Production, Expense, Payment, PaymentAllocation, MachineSetting, Company } = require('../models')

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
    allCompanies,
    paymentByCompany,
    nonArchivedAllocatedByCompany,
    archivedAllocatedByCompany,
    latestPaymentByCompany,
    receiptByCompany,
    deductionByCompany,
  ] = await Promise.all([
    Order.countDocuments({ status: 'active', archived: { $ne: true } }),
    Order.countDocuments({ status: 'completed', archived: { $ne: true } }),
    Production.aggregate([{ $match: { date: { $gte: todayStart, $lte: todayEnd } } }, { $group: { _id: null, t: { $sum: '$meter' } } }]),
    Expense.aggregate([{ $match: { date: { $gte: monthStart } } },                     { $group: { _id: null, t: { $sum: '$amount' } } }]),
    Payment.aggregate([{ $match: { date: { $gte: monthStart }, transactionType: { $ne: 'deduction' } } }, { $group: { _id: null, t: { $sum: '$amount' } } }]),
    MachineSetting.findOne().lean(),
    // Fetch orders and companies separately — avoids expensive $lookup aggregation.
    // Order.find with lean() and a minimal projection is significantly faster.
    Order.find({})
      .select('orderName company status archived producedMeter rejectedMeter acceptedMeter expectedMeter ratePerMeter deductionPct updatedAt createdAt')
      .lean(),
    Company.find({}).select('name').lean(),
    PaymentAllocation.aggregate([
      {
        $group: {
          _id: '$company',
          totalPaid: {
            $sum: '$amount',
          },
        },
      },
    ]),
    PaymentAllocation.aggregate([
      {
        $lookup: {
          from: 'orders',
          localField: 'order',
          foreignField: '_id',
          as: 'orderDoc',
        },
      },
      { $unwind: '$orderDoc' },
      { $match: { 'orderDoc.archived': { $ne: true } } },
      {
        $group: {
          _id: '$company',
          totalPaid: { $sum: '$amount' },
        },
      },
    ]),
    PaymentAllocation.aggregate([
      {
        $lookup: {
          from: 'orders',
          localField: 'order',
          foreignField: '_id',
          as: 'orderDoc',
        },
      },
      { $unwind: '$orderDoc' },
      { $match: { 'orderDoc.archived': true } },
      {
        $group: {
          _id: '$company',
          totalPaid: { $sum: '$amount' },
        },
      },
    ]),
    Payment.aggregate([
      { $group: { _id: '$company', lastAt: { $max: '$updatedAt' } } },
    ]),
    Payment.aggregate([
      { $match: { transactionType: { $ne: 'deduction' } } },
      { $group: { _id: '$company', totalReceipt: { $sum: '$amount' } } },
    ]),
    Payment.aggregate([
      { $match: { transactionType: 'deduction' } },
      { $group: { _id: '$company', totalDeductionCollected: { $sum: '$amount' } } },
    ]),
  ])

  const allocatedMap = new Map(paymentByCompany.map(row => [String(row._id), Number(row.totalPaid || 0)]))
  const nonArchivedAllocatedMap = new Map(nonArchivedAllocatedByCompany.map(row => [String(row._id), Number(row.totalPaid || 0)]))
  const archivedAllocatedMap = new Map(archivedAllocatedByCompany.map(row => [String(row._id), Number(row.totalPaid || 0)]))
  const deductionCollectedMap = new Map(deductionByCompany.map(row => [String(row._id), Number(row.totalDeductionCollected || 0)]))
  const latestPaymentAtMap = new Map(latestPaymentByCompany.map(row => [String(row._id), row.lastAt]))
  const receiptMap = new Map(receiptByCompany.map(row => [String(row._id), Number(row.totalReceipt || 0)]))
  // Build company name lookup from the separate query — faster than $lookup aggregate
  const companyNameMap = new Map(allCompanies.map(c => [String(c._id), c.name]))

  const byCompany = new Map()
  for (const o of companyOrders) {
    const companyId = String(o.company || 'unknown')
    const isArchived = !!o.archived
    const entry = byCompany.get(companyId) || {
      companyId,
      companyName: companyNameMap.get(companyId) || 'Unknown',
      orderCount: 0,
      activeOrders: 0,
      completedOrders: 0,
      paymentPending: 0,
      paymentCompleted: 0,
      producedMeter: 0,
      rejectedMeter: 0,
      expectedMeter: 0,
      remainingMeter: 0,
      totalProducedValue: 0,
      totalDeductionNeedToGet: 0,
      totalDeductionCollected: deductionCollectedMap.get(companyId) || 0,
      totalPayableAmount: 0,
      totalRejectionGrossLoss: 0,
      totalRejectionDeductionLoss: 0,
      totalRejectionNetLoss: 0,
      totalAllocatedAmount: allocatedMap.get(companyId) || 0,
      totalAllocatedForLiveOrders: nonArchivedAllocatedMap.get(companyId) || 0,
      totalAllocatedForArchivedOrders: archivedAllocatedMap.get(companyId) || 0,
      totalPaidAmount: receiptMap.get(companyId) || 0,
      totalPendingToPay: 0,
    }

    const producedMeter = Number(o.producedMeter || 0)
    const acceptedMeter = Number(o.acceptedMeter || Math.max(0, Number(o.producedMeter || 0) - Number(o.rejectedMeter || 0)))
    const rejectedMeter = Number(o.rejectedMeter || Math.max(0, producedMeter - acceptedMeter))
    const ratePerMeter = Number(o.ratePerMeter || 0)
    const deductionPct = Number(o.deductionPct || 0)
    const totalValue = acceptedMeter * ratePerMeter
    const deduction = totalValue * (deductionPct / 100)
    const payable = totalValue - deduction
    const rejectionGrossLoss = rejectedMeter * ratePerMeter
    const rejectionDeductionLoss = rejectionGrossLoss * (deductionPct / 100)
    const rejectionNetLoss = rejectionGrossLoss - rejectionDeductionLoss

    if (!isArchived) {
      entry.orderCount += 1
      entry.activeOrders += o.status === 'active' ? 1 : 0
      entry.completedOrders += o.status === 'completed' ? 1 : 0
      entry.producedMeter += acceptedMeter
      entry.rejectedMeter += rejectedMeter
      entry.expectedMeter += o.expectedMeter || 0
      entry.remainingMeter += Math.max(0, (o.expectedMeter || 0) - (o.producedMeter || 0))
      entry.totalProducedValue += totalValue
      entry.totalPayableAmount += payable
      entry.totalRejectionGrossLoss += rejectionGrossLoss
      entry.totalRejectionDeductionLoss += rejectionDeductionLoss
      entry.totalRejectionNetLoss += rejectionNetLoss
    }
    // Deduction need stays visible even after archive until order is deleted.
    entry.totalDeductionNeedToGet += deduction
    // track most recent order activity
    const oTs = new Date(o.updatedAt || o.createdAt || 0).getTime()
    if (oTs > (entry._lastOrderTs || 0)) entry._lastOrderTs = oTs

    byCompany.set(companyId, entry)
  }

  const companyOrderSummary = Array.from(byCompany.values()).map(entry => {
    const allocatedAmount = Number(entry.totalAllocatedAmount || 0)
    const liveAllocatedAmount = Number(entry.totalAllocatedForLiveOrders || 0)
    const archivedAllocatedAmount = Number(entry.totalAllocatedForArchivedOrders || 0)
    const receiptAmount = Number(entry.totalPaidAmount || 0)
    const effectiveLiveReceived = Math.max(0, liveAllocatedAmount + Math.max(0, receiptAmount - allocatedAmount))
    const pending = Math.max(0, entry.totalPayableAmount - Math.max(effectiveLiveReceived, receiptAmount - archivedAllocatedAmount))
    const deductionOutstanding = Math.max(0, Number(entry.totalDeductionNeedToGet || 0) - Number(entry.totalDeductionCollected || 0))
    const paymentTs = new Date(latestPaymentAtMap.get(entry.companyId) || 0).getTime()
    const lastActivityAt = new Date(Math.max(entry._lastOrderTs || 0, paymentTs)).toISOString()
    return {
      ...entry,
      _lastOrderTs: undefined,
      lastActivityAt,
      totalDeductionNeedToGet: deductionOutstanding,
      totalReceiptAmount: receiptAmount,
      totalUnallocatedAmount: Math.max(0, receiptAmount - allocatedAmount),
      paymentPending: pending > 0 ? 1 : 0,
      paymentCompleted: pending <= 0 ? 1 : 0,
      totalPendingToPay: pending,
    }
  }).sort((a, b) => a.companyName.localeCompare(b.companyName))

  const pendingAmount = companyOrderSummary.reduce((sum, row) => sum + (row.totalPendingToPay || 0), 0)
  const deductionHoldAmount = companyOrderSummary.reduce((sum, row) => sum + (row.totalDeductionNeedToGet || 0), 0)
  const totalRejectedMeter = companyOrderSummary.reduce((sum, row) => sum + Number(row.rejectedMeter || 0), 0)
  const totalRejectionGrossLoss = companyOrderSummary.reduce((sum, row) => sum + Number(row.totalRejectionGrossLoss || 0), 0)
  const totalRejectionDeductionLoss = companyOrderSummary.reduce((sum, row) => sum + Number(row.totalRejectionDeductionLoss || 0), 0)
  const totalRejectionNetLoss = companyOrderSummary.reduce((sum, row) => sum + Number(row.totalRejectionNetLoss || 0), 0)
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
    totalRejectedMeter,
    totalRejectionGrossLoss,
    totalRejectionDeductionLoss,
    totalRejectionNetLoss,
    monthlyReceipt:    monthPay[0]?.t      || 0,
    companyOrderSummary,
  })
}))

router.get('/company-payments/:companyId', ah(async (req, res) => {
  const { companyId } = req.params
  if (!mongoose.Types.ObjectId.isValid(companyId)) {
    return res.status(400).json({ message: 'Invalid company id' })
  }

  const hasFrom = typeof req.query.from === 'string' && req.query.from.trim() !== ''
  const hasTo = typeof req.query.to === 'string' && req.query.to.trim() !== ''

  const from = hasFrom ? new Date(req.query.from) : null
  const to = hasTo ? new Date(req.query.to) : null

  if (hasFrom && Number.isNaN(from.getTime())) {
    return res.status(400).json({ message: 'Invalid from date' })
  }
  if (hasTo && Number.isNaN(to.getTime())) {
    return res.status(400).json({ message: 'Invalid to date' })
  }
  if (to) to.setHours(23, 59, 59, 999)

  const companyObjectId = new mongoose.Types.ObjectId(companyId)

  const paymentMatch = { company: companyObjectId }
  if (from || to) {
    paymentMatch.date = {}
    if (from) paymentMatch.date.$gte = from
    if (to) paymentMatch.date.$lte = to
  }
  const [company, rows, rangeAgg, orderAgg, allocatedRangeAgg] = await Promise.all([
    Company.findById(companyId).select('name'),
    Payment.find(paymentMatch)
      .select('date amount mode notes transactionType')
      .sort({ date: -1 }),
    Payment.aggregate([
      { $match: paymentMatch },
      {
        $group: {
          _id: null,
          totalPaidInRange: { $sum: { $cond: [{ $eq: ['$transactionType', 'deduction'] }, 0, '$amount'] } },
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
        $addFields: {
          _isArchived: { $eq: ['$archived', true] },
          _acceptedMeter: {
            $ifNull: [
              '$acceptedMeter',
              { $max: [0, { $subtract: [{ $ifNull: ['$producedMeter', 0] }, { $ifNull: ['$rejectedMeter', 0] }] }] },
            ],
          },
        },
      },
      {
        $group: {
          _id: null,
          orderCount: { $sum: { $cond: ['$_isArchived', 0, 1] } },
          activeOrders: {
            $sum: {
              $cond: [{ $and: [{ $eq: ['$status', 'active'] }, { $eq: ['$_isArchived', false] }] }, 1, 0],
            },
          },
          completedOrders: {
            $sum: {
              $cond: [{ $and: [{ $eq: ['$status', 'completed'] }, { $eq: ['$_isArchived', false] }] }, 1, 0],
            },
          },
          producedMeter: { $sum: { $cond: ['$_isArchived', 0, { $ifNull: ['$producedMeter', 0] }] } },
          expectedMeter: { $sum: { $cond: ['$_isArchived', 0, { $ifNull: ['$expectedMeter', 0] }] } },
          rejectedMeter: { $sum: { $cond: ['$_isArchived', 0, { $ifNull: ['$rejectedMeter', 0] }] } },
          acceptedMeter: { $sum: { $cond: ['$_isArchived', 0, '$_acceptedMeter'] } },
          totalProducedValue: {
            $sum: {
              $cond: ['$_isArchived', 0, { $multiply: ['$_acceptedMeter', { $ifNull: ['$ratePerMeter', 0] }] }],
            },
          },
          totalDeductionNeedToGet: {
            $sum: {
              $multiply: [
                '$_acceptedMeter',
                { $ifNull: ['$ratePerMeter', 0] },
                { $divide: [{ $ifNull: ['$deductionPct', 0] }, 100] },
              ],
            },
          },
          totalDeductionForPayable: {
            $sum: {
              $cond: [
                '$_isArchived',
                0,
                {
                  $multiply: [
                    '$_acceptedMeter',
                    { $ifNull: ['$ratePerMeter', 0] },
                    { $divide: [{ $ifNull: ['$deductionPct', 0] }, 100] },
                  ],
                },
              ],
            },
          },
        },
      },
    ]),
    PaymentAllocation.aggregate([
      {
        $match: {
          company: companyObjectId,
          ...(from || to ? { date: { ...(from ? { $gte: from } : {}), ...(to ? { $lte: to } : {}) } } : {}),
        },
      },
      { $group: { _id: null, totalAllocatedInRange: { $sum: '$amount' } } },
    ]),
  ])

  const companyTotals = orderAgg[0] || {
    orderCount: 0,
    activeOrders: 0,
    completedOrders: 0,
    producedMeter: 0,
    expectedMeter: 0,
    rejectedMeter: 0,
    acceptedMeter: 0,
    totalProducedValue: 0,
    totalDeductionNeedToGet: 0,
    totalDeductionForPayable: 0,
  }

  const [totalPaidAllTime, totalAllocatedLiveAllTime, totalAllocatedArchivedAllTime, receiptAllTime] = await Promise.all([
    PaymentAllocation.aggregate([
      { $match: { company: companyObjectId } },
      { $group: { _id: null, totalPaid: { $sum: '$amount' } } },
    ]),
    PaymentAllocation.aggregate([
      { $match: { company: companyObjectId } },
      {
        $lookup: {
          from: 'orders',
          localField: 'order',
          foreignField: '_id',
          as: 'orderDoc',
        },
      },
      { $unwind: '$orderDoc' },
      { $match: { 'orderDoc.archived': { $ne: true } } },
      { $group: { _id: null, totalPaid: { $sum: '$amount' } } },
    ]),
    PaymentAllocation.aggregate([
      { $match: { company: companyObjectId } },
      {
        $lookup: {
          from: 'orders',
          localField: 'order',
          foreignField: '_id',
          as: 'orderDoc',
        },
      },
      { $unwind: '$orderDoc' },
      { $match: { 'orderDoc.archived': true } },
      { $group: { _id: null, totalPaid: { $sum: '$amount' } } },
    ]),
    Payment.aggregate([
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
  ]),
  ])

  const totalPayableAmount = Math.max(0, (companyTotals.totalProducedValue || 0) - (companyTotals.totalDeductionForPayable || 0))
  const totalPaidAmount = totalPaidAllTime[0]?.totalPaid || 0
  const totalAllocatedForLiveOrders = totalAllocatedLiveAllTime[0]?.totalPaid || 0
  const totalAllocatedForArchivedOrders = totalAllocatedArchivedAllTime[0]?.totalPaid || 0
  const totalReceiptAmount = receiptAllTime[0]?.totalPaid || 0
  const totalDeductionCollected = receiptAllTime[0]?.totalDeductionCollected || 0
  const totalDeductionNeedToGet = Math.max(0, (companyTotals.totalDeductionNeedToGet || 0) - totalDeductionCollected)
  const unallocatedAmount = Math.max(0, totalReceiptAmount - totalPaidAmount)
  const effectiveLiveReceived = Math.max(0, totalAllocatedForLiveOrders + unallocatedAmount)
  const totalPendingToPay = Math.max(0, totalPayableAmount - Math.max(effectiveLiveReceived, totalReceiptAmount - totalAllocatedForArchivedOrders))
  const totalUnallocatedAmount = Math.max(0, totalReceiptAmount - totalPaidAmount)

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
      rejectedMeter: companyTotals.rejectedMeter || 0,
      acceptedMeter: companyTotals.acceptedMeter || 0,
      totalProducedValue: companyTotals.totalProducedValue || 0,
      totalDeductionNeedToGet,
      totalDeductionCollected,
      totalPayableAmount,
      totalPaidAmount,
      totalReceiptAmount,
      totalUnallocatedAmount,
      totalPendingToPay,
      totalPaidInRange: allocatedRangeAgg[0]?.totalAllocatedInRange || 0,
      totalDeductionInRange: rangeAgg[0]?.totalDeductionInRange || 0,
      totalReceiptInRange: rangeAgg[0]?.totalPaidInRange || 0,
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
