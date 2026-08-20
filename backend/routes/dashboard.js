const router   = require('express').Router()
const ah       = require('express-async-handler')
const auth     = require('../middleware/auth')
const mongoose = require('mongoose')
const { Order, Production, Expense, Payment, MachineSetting, Company } = require('../models')
const { getCompanyBalance, getCompanyBalances } = require('../services/companyBalance')

router.use(auth)

router.get('/', ah(async (req, res) => {
  const now        = new Date()
  const todayStart = new Date(now); todayStart.setHours(0,0,0,0)
  const todayEnd   = new Date(now); todayEnd.setHours(23,59,59,999)
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  const [
    todayProd, monthExp,
    monthPay, setting,
    allOrders,
    allCompanies,
    deductionByCompany,
  ] = await Promise.all([
    Production.aggregate([{ $match: { date: { $gte: todayStart, $lte: todayEnd } } }, { $group: { _id: null, t: { $sum: '$meter' } } }]),
    Expense.aggregate([{ $match: { date: { $gte: monthStart } } }, { $group: { _id: null, t: { $sum: '$amount' } } }]),
    Payment.aggregate([{ $match: { date: { $gte: monthStart }, transactionType: { $in: ['receipt', 'payment'] } } }, { $group: { _id: null, t: { $sum: '$amount' } } }]),
    MachineSetting.findOne().lean(),
    Order.find({ $or: [{ deletedAt: null }, { status: 'closed', deletedAt: { $ne: null } }] })
      .select('orderName company status producedMeter rejectedMeter acceptedMeter expectedMeter ratePerMeter deductionPct closedAmount closedDeduction closedAt totalReceived archived financialClosed updatedAt createdAt')
      .lean(),
    Company.find({}).select('name').lean(),
    Payment.aggregate([
      { $match: { transactionType: 'deduction' } },
      { $group: { _id: '$company', totalDeductionCollected: { $sum: '$amount' } } },
    ]),
  ])

  const companyNameMap = new Map(allCompanies.map(c => [String(c._id), c.name]))
  const deductionCollectedMap = new Map(deductionByCompany.map(row => [String(row._id), Number(row.totalDeductionCollected || 0)]))

  // Get balances for all companies that have orders
  const companyIdsWithOrders = [...new Set(allOrders.map(o => String(o.company)).filter(Boolean))]
  const balanceMap = await getCompanyBalances(companyIdsWithOrders)

  // Build company summaries
  const byCompany = new Map()
  for (const o of allOrders) {
    const companyId = String(o.company || 'unknown')
    const isClosed = o.status === 'closed' || (o.archived && o.financialClosed)
    const entry = byCompany.get(companyId) || {
      companyId,
      companyName: companyNameMap.get(companyId) || 'Unknown',
      orderCount: 0,
      activeOrders: 0,
      productionCompleteOrders: 0,
      closedOrders: 0,
      producedMeter: 0,
      rejectedMeter: 0,
      expectedMeter: 0,
      remainingMeter: 0,
      totalProducedValue: 0,
      totalDeductionNeedToGet: 0,
      totalDeductionCollected: deductionCollectedMap.get(companyId) || 0,
      totalPayableAmount: 0,
      totalClosedAmount: 0,
      totalReceivedForLiveOrders: 0,
      totalRejectionGrossLoss: 0,
      totalRejectionNetLoss: 0,
      pendingCloseCount: 0,
      pendingCloseTotal: 0,
    }

    const producedMeter = Number(o.producedMeter || 0)
    const acceptedMeter = Number(o.acceptedMeter || Math.max(0, producedMeter - Number(o.rejectedMeter || 0)))
    const rejectedMeter = Number(o.rejectedMeter || Math.max(0, producedMeter - acceptedMeter))
    const ratePerMeter = Number(o.ratePerMeter || 0)
    const deductionPct = Number(o.deductionPct || 0)
    const totalValue = acceptedMeter * ratePerMeter
    const deduction = totalValue * (deductionPct / 100)
    const payable = totalValue - deduction
    const rejectionGrossLoss = rejectedMeter * ratePerMeter
    const rejectionNetLoss = rejectionGrossLoss - (rejectionGrossLoss * deductionPct / 100)

    // Payable includes ALL orders (active + archived) so it never goes down on archive
    entry.totalPayableAmount += payable
    entry.totalRejectionGrossLoss += rejectionGrossLoss
    entry.totalRejectionNetLoss += rejectionNetLoss

    if (isClosed) {
      entry.closedOrders += 1
      entry.totalClosedAmount += Number(o.closedAmount || o.totalReceived || 0)
    } else {
      entry.orderCount += 1
      entry.activeOrders += (o.status === 'open' || o.status === 'active') ? 1 : 0
      entry.productionCompleteOrders += (o.status === 'production_complete' || o.status === 'completed') ? 1 : 0
      if (o.status === 'production_complete' || o.status === 'completed') {
        entry.pendingCloseCount += 1
        entry.pendingCloseTotal += payable
      }
      entry.producedMeter += acceptedMeter
      entry.rejectedMeter += rejectedMeter
      entry.expectedMeter += o.expectedMeter || 0
      entry.remainingMeter += Math.max(0, (o.expectedMeter || 0) - producedMeter)
      entry.totalProducedValue += totalValue
      entry.totalReceivedForLiveOrders += Number(o.totalReceived || 0)
    }

    // Deduction from all orders (including closed)
    entry.totalDeductionNeedToGet += deduction

    const oTs = new Date(o.updatedAt || o.createdAt || 0).getTime()
    if (oTs > (entry._lastOrderTs || 0)) entry._lastOrderTs = oTs

    byCompany.set(companyId, entry)
  }

  const companyOrderSummary = Array.from(byCompany.values()).map(entry => {
    const bal = balanceMap.get(entry.companyId) || { totalReceipts: 0, totalClosed: 0, balance: 0 }
    const deductionOutstanding = Math.max(0, Number(entry.totalDeductionNeedToGet || 0) - Number(entry.totalDeductionCollected || 0))
    // Paid = total receipts received from company
    const totalPaid = bal.totalReceipts
    // Total Allocated = money assigned to specific orders (closedAmount + old allocations)
    const totalAllocated = bal.totalClosed
    // Pending from company = Total Payable - Total Receipts
    const pendingToPay = Math.max(0, entry.totalPayableAmount - totalPaid)
    // Unallocated = receipts - allocated (balance available for closing orders)
    const unallocated = Math.max(0, bal.balance)

    return {
      ...entry,
      _lastOrderTs: undefined,
      lastActivityAt: new Date(entry._lastOrderTs || 0).toISOString(),
      totalDeductionNeedToGet: deductionOutstanding,
      totalReceiptAmount: totalPaid,
      companyBalance: bal.balance,
      totalPaidAmount: totalPaid,
      totalAllocatedAmount: totalAllocated,
      totalUnallocatedAmount: unallocated,
      totalPendingToPay: pendingToPay,
      paymentPending: pendingToPay > 0 ? 1 : 0,
      paymentCompleted: pendingToPay <= 0 ? 1 : 0,
      totalAllocatedForArchivedOrders: entry.totalClosedAmount,
      pendingCloseCount: entry.pendingCloseCount,
      pendingCloseTotal: entry.pendingCloseTotal,
      balanceAlert: unallocated < entry.pendingCloseTotal && entry.pendingCloseCount > 0,
    }
  }).sort((a, b) => a.companyName.localeCompare(b.companyName))

  const activeOrders = allOrders.filter(o => o.status === 'open' || o.status === 'active').length
  const completedOrders = allOrders.filter(o => o.status === 'production_complete' || o.status === 'completed').length
  const pendingAmount = companyOrderSummary.reduce((sum, row) => sum + (row.totalPendingToPay || 0), 0)
  const deductionHoldAmount = companyOrderSummary.reduce((sum, row) => sum + (row.totalDeductionNeedToGet || 0), 0)
  const totalRejectedMeter = companyOrderSummary.reduce((sum, row) => sum + Number(row.rejectedMeter || 0), 0)
  const totalRejectionGrossLoss = companyOrderSummary.reduce((sum, row) => sum + Number(row.totalRejectionGrossLoss || 0), 0)
  const totalRejectionNetLoss = companyOrderSummary.reduce((sum, row) => sum + Number(row.totalRejectionNetLoss || 0), 0)
  const pendingPaymentCount = companyOrderSummary.filter(row => (row.totalPendingToPay || 0) > 0).length
  const completedPaymentCount = companyOrderSummary.filter(row => (row.totalPendingToPay || 0) <= 0).length

  res.json({
    activeOrders,
    completedOrders,
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
    totalRejectionDeductionLoss: 0,
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

  const [company, rows, rangeAgg, orderAgg] = await Promise.all([
    Company.findById(companyId).select('name'),
    Payment.find(paymentMatch)
      .select('date amount mode notes transactionType reference')
      .sort({ date: -1 }),
    Payment.aggregate([
      { $match: paymentMatch },
      {
        $group: {
          _id: null,
          totalReceiptInRange: { $sum: { $cond: [{ $in: ['$transactionType', ['receipt', 'payment']] }, '$amount', 0] } },
          totalDeductionInRange: { $sum: { $cond: [{ $eq: ['$transactionType', 'deduction'] }, '$amount', 0] } },
        },
      },
    ]),
    Order.aggregate([
      { $match: { company: companyObjectId, deletedAt: null } },
      {
        $addFields: {
          _isClosed: {
            $cond: [
              { $eq: ['$status', 'closed'] },
              true,
              { $and: [{ $eq: ['$archived', true] }, { $eq: ['$financialClosed', true] }] },
            ],
          },
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
          orderCount: { $sum: { $cond: ['$_isClosed', 0, 1] } },
          activeOrders: { $sum: { $cond: [{ $in: ['$status', ['open', 'active']] }, 1, 0] } },
          productionCompleteOrders: { $sum: { $cond: [{ $in: ['$status', ['production_complete', 'completed']] }, 1, 0] } },
          closedOrders: { $sum: { $cond: ['$_isClosed', 1, 0] } },
          producedMeter: { $sum: { $cond: ['$_isClosed', 0, { $ifNull: ['$producedMeter', 0] }] } },
          expectedMeter: { $sum: { $cond: ['$_isClosed', 0, { $ifNull: ['$expectedMeter', 0] }] } },
          rejectedMeter: { $sum: { $cond: ['$_isClosed', 0, { $ifNull: ['$rejectedMeter', 0] }] } },
          acceptedMeter: { $sum: { $cond: ['$_isClosed', 0, '$_acceptedMeter'] } },
          totalProducedValue: {
            $sum: { $cond: ['$_isClosed', 0, { $multiply: ['$_acceptedMeter', { $ifNull: ['$ratePerMeter', 0] }] }] },
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
                '$_isClosed', 0,
                { $multiply: ['$_acceptedMeter', { $ifNull: ['$ratePerMeter', 0] }, { $divide: [{ $ifNull: ['$deductionPct', 0] }, 100] }] },
              ],
            },
          },
          totalClosedAmount: { $sum: { $cond: ['$_isClosed', { $ifNull: ['$closedAmount', 0] }, 0] } },
          totalReceivedForLiveOrders: {
            $sum: { $cond: ['$_isClosed', 0, { $ifNull: ['$totalReceived', 0] }] },
          },
        },
      },
    ]),
  ])

  const companyTotals = orderAgg[0] || {
    orderCount: 0, activeOrders: 0, productionCompleteOrders: 0, closedOrders: 0,
    producedMeter: 0, expectedMeter: 0, rejectedMeter: 0, acceptedMeter: 0,
    totalProducedValue: 0, totalDeductionNeedToGet: 0, totalDeductionForPayable: 0, totalClosedAmount: 0,
  }

  const { balance: companyBalance, totalReceipts: totalReceiptAmount, totalClosed: totalClosedAll } = await getCompanyBalance(companyId)

  const deductionCollected = await Payment.aggregate([
    { $match: { company: companyObjectId, transactionType: 'deduction' } },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ])

  const totalPayableAmount = Math.max(0, (companyTotals.totalProducedValue || 0) - (companyTotals.totalDeductionForPayable || 0))
  const totalDeductionCollected = deductionCollected[0]?.total || 0
  const totalDeductionNeedToGet = Math.max(0, (companyTotals.totalDeductionNeedToGet || 0) - totalDeductionCollected)
  // Allocated = money assigned to specific orders
  const totalAllocated = totalClosedAll
  // Pending from company = Total Payable - Total Receipts
  const totalPendingToPay = Math.max(0, totalPayableAmount - totalReceiptAmount)

  res.json({
    from,
    to,
    company: { _id: companyId, name: company?.name || 'Unknown' },
    summary: {
      orderCount: companyTotals.orderCount || 0,
      activeOrders: companyTotals.activeOrders || 0,
      completedOrders: companyTotals.productionCompleteOrders || 0,
      closedOrders: companyTotals.closedOrders || 0,
      producedMeter: companyTotals.producedMeter || 0,
      expectedMeter: companyTotals.expectedMeter || 0,
      rejectedMeter: companyTotals.rejectedMeter || 0,
      acceptedMeter: companyTotals.acceptedMeter || 0,
      totalProducedValue: companyTotals.totalProducedValue || 0,
      totalDeductionNeedToGet,
      totalDeductionCollected,
      totalPayableAmount,
      totalReceiptAmount: totalReceiptAmount,
      totalPaidAmount: totalAllocated,
      totalUnallocatedAmount: Math.max(0, companyBalance),
      totalPendingToPay,
      companyBalance,
      totalReceiptInRange: rangeAgg[0]?.totalReceiptInRange || 0,
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
  let transactionType = req.body.transactionType || 'receipt'
  // Legacy compat: 'payment' maps to 'receipt'
  if (transactionType === 'payment') transactionType = 'receipt'
  if (!['receipt', 'deduction'].includes(transactionType)) transactionType = 'receipt'

  if (amount <= 0) {
    return res.status(400).json({ message: 'Amount must be greater than zero' })
  }

  const doc = await Payment.create({
    company: companyId,
    transactionType,
    amount,
    mode: req.body.mode || 'cash',
    reference: req.body.reference || '',
    date: req.body.date ? new Date(req.body.date) : new Date(),
    notes: req.body.notes || '',
  })

  await doc.populate('company', 'name')
  res.status(201).json(doc)
}))

module.exports = router
