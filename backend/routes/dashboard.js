const router   = require('express').Router()
const ah       = require('express-async-handler')
const auth     = require('../middleware/auth')
const mongoose = require('mongoose')
const { Order, Production, Expense, Payment, MachineSetting, Company, Settlement, DeductionTransfer } = require('../models')
const { getCompanyBalance, getCompanyBalances, getDeductionPositions, getLegacyAllocatedByOrder } = require('../services/companyBalance')
const { allocateDeductionPool } = require('../services/deductionSettlement')
const { withCompanyLock } = require('../services/companyLock')

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
  ] = await Promise.all([
    Production.aggregate([{ $match: { date: { $gte: todayStart, $lte: todayEnd } } }, { $group: { _id: null, t: { $sum: '$meter' } } }]),
    Expense.aggregate([{ $match: { date: { $gte: monthStart } } }, { $group: { _id: null, t: { $sum: '$amount' } } }]),
    Payment.aggregate([{ $match: { date: { $gte: monthStart }, transactionType: { $in: ['receipt', 'payment'] } } }, { $group: { _id: null, t: { $sum: '$amount' } } }]),
    MachineSetting.findOne().lean(),
    Order.find({ $or: [{ deletedAt: null }, { status: 'closed', deletedAt: { $ne: null } }] })
      .select('orderName company status producedMeter rejectedMeter acceptedMeter expectedMeter ratePerMeter deductionPct closedAmount closedDeduction deductionAllocated deductionWrittenOff closedAt totalReceived archived settlementId financialClosed deletedAt updatedAt createdAt')
      .lean(),
    Company.find({}).select('name').lean(),
  ])

  const companyNameMap = new Map(allCompanies.map(c => [String(c._id), c.name]))

  // Get balances and deduction positions for all companies that have orders
  const companyIdsWithOrders = [...new Set(allOrders.map(o => String(o.company)).filter(Boolean))]
  const [balanceMap, deductionMap] = await Promise.all([
    getCompanyBalances(companyIdsWithOrders),
    getDeductionPositions(companyIdsWithOrders),
  ])
  const liveAllocated = await getLegacyAllocatedByOrder(allOrders.filter(o => !o.archived && o.status !== 'closed').map(o => o._id))

  // Build company summaries.
  // Working figures: live orders only (not archived). Archived orders are shown as Settled.
  const byCompany = new Map()
  for (const o of allOrders) {
    const companyId = String(o.company || 'unknown')
    const entry = byCompany.get(companyId) || {
      companyId,
      companyName: companyNameMap.get(companyId) || 'Unknown',
      orderCount: 0,
      activeOrders: 0,
      productionCompleteOrders: 0,
      closedOrders: 0,
      settledOrders: 0,
      producedMeter: 0,
      rejectedMeter: 0,
      expectedMeter: 0,
      remainingMeter: 0,
      totalProducedValue: 0,
      totalPayableAmount: 0,
      unclosedPayableAmount: 0,
      totalClosedAmount: 0,
      settledAmount: 0,
      totalRejectionGrossLoss: 0,
      totalRejectionNetLoss: 0,
      pendingCloseCount: 0,
      pendingCloseTotal: 0,
      closedToArchiveCount: 0,
      archivedToSettleCount: 0,
      archivedDeductionDue: 0,
      liveAllocated: 0,
      liveDeduction: 0,
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
    const isProductionComplete = o.status === 'production_complete' || o.status === 'completed'

    if (o.archived) {
      entry.settledOrders += 1
      if (!o.settlementId && !o.deletedAt) {
        entry.archivedToSettleCount += 1
        entry.archivedDeductionDue += Math.max(0, Number(o.closedDeduction || 0) - Number(o.deductionAllocated || 0) - Number(o.deductionWrittenOff || 0))
      }
      entry.settledAmount += Number(o.closedAmount || 0)
      entry.totalClosedAmount += Number(o.closedAmount || 0)
    } else if (o.status === 'closed') {
      entry.closedOrders += 1
      entry.liveDeduction += Number(o.closedDeduction ?? deduction)
      if (!o.deletedAt) entry.closedToArchiveCount += 1
      entry.totalClosedAmount += Number(o.closedAmount || o.totalReceived || 0)
      // A closed order stays in payable and allocated until it is archived
      entry.totalPayableAmount += Number(o.closedAmount || 0)
      entry.liveAllocated += Number(o.closedAmount || 0)
    } else {
      entry.orderCount += 1
      entry.activeOrders += (o.status === 'open' || o.status === 'active') ? 1 : 0
      entry.productionCompleteOrders += isProductionComplete ? 1 : 0
      entry.producedMeter += acceptedMeter
      entry.rejectedMeter += rejectedMeter
      entry.expectedMeter += o.expectedMeter || 0
      entry.remainingMeter += Math.max(0, (o.expectedMeter || 0) - producedMeter)
      entry.totalProducedValue += totalValue
      entry.totalPayableAmount += payable
      entry.liveDeduction += deduction
      entry.liveAllocated += liveAllocated.get(String(o._id)) || 0
      entry.totalRejectionGrossLoss += rejectionGrossLoss
      entry.totalRejectionNetLoss += rejectionNetLoss
      if (isProductionComplete) {
        entry.pendingCloseCount += 1
        entry.pendingCloseTotal += Math.max(0, payable - (liveAllocated.get(String(o._id)) || 0))
      }
    }

    const oTs = new Date(o.updatedAt || o.createdAt || 0).getTime()
    if (oTs > (entry._lastOrderTs || 0)) entry._lastOrderTs = oTs

    byCompany.set(companyId, entry)
  }

  const companyOrderSummary = Array.from(byCompany.values()).map(entry => {
    const bal = balanceMap.get(entry.companyId) || { totalReceipts: 0, totalClosed: 0, balance: 0 }
    const deduct = deductionMap.get(entry.companyId) || { collected: 0, outstanding: 0, credit: 0, writtenOff: 0 }
    // Archived amounts leave the live figures and are reported separately
    const archivedAllocated = entry.settledAmount
    const totalPaid = Math.max(0, bal.totalReceipts - archivedAllocated)
    const totalAllocated = Math.max(0, bal.totalClosed - archivedAllocated)
    // Pending from company = payable of live orders not yet closed, minus what is already allocated and money on hand
    const pendingToPay = Math.max(0, entry.totalPayableAmount - entry.liveAllocated - Math.max(0, bal.balance))
    // Unallocated = receipts - allocated (balance available for closing orders)
    const unallocated = Math.max(0, bal.balance)

    // Deduction still owed = archived orders' outstanding + deduction on unarchived orders not covered by unassigned deduction receipts
    // Under ₹1 left is rounding from whole-rupee entries
    const rawDeductionToGet = deduct.outstanding + Math.max(0, entry.liveDeduction - deduct.credit)
    const deductionToGet = rawDeductionToGet < 1 ? 0 : rawDeductionToGet
    // Settling needs the deduction of the archived orders fully received; active/closed orders are not part of it
    // Under ₹1 left is rounding from whole-rupee entries, not a real shortfall
    const rawSettleDue = Math.max(0, entry.archivedDeductionDue - deduct.credit)
    const settleDeductionDue = rawSettleDue < 1 ? 0 : rawSettleDue

    return {
      ...entry,
      liveDeduction: undefined,
      archivedDeductionDue: undefined,
      _lastOrderTs: undefined,
      lastActivityAt: new Date(entry._lastOrderTs || 0).toISOString(),
      totalDeductionNeedToGet: deductionToGet,
      totalDeductionCollected: deduct.collected,
      deductionCredit: deduct.credit,
      deductionAllocated: deduct.allocated,
      deductionWrittenOff: deduct.writtenOff,
      totalReceiptAmount: totalPaid,
      companyBalance: bal.balance,
      totalPaidAmount: totalPaid,
      totalAllocatedAmount: totalAllocated,
      totalArchivedAllocatedAmount: archivedAllocated,
      totalUnallocatedAmount: unallocated,
      totalPendingToPay: pendingToPay,
      paymentPending: pendingToPay > 0 ? 1 : 0,
      paymentCompleted: pendingToPay <= 0 ? 1 : 0,
      totalAllocatedForArchivedOrders: entry.settledAmount,
      pendingCloseCount: entry.pendingCloseCount,
      pendingCloseTotal: entry.pendingCloseTotal,
      balanceAlert: unallocated < entry.pendingCloseTotal && entry.pendingCloseCount > 0,
      canSettle: entry.archivedToSettleCount > 0 && settleDeductionDue <= 0.01,
      settleDeductionDue,
    }
  }).sort((a, b) => a.companyName.localeCompare(b.companyName))


  const liveOrders = allOrders.filter(o => !o.archived)
  const activeOrders = liveOrders.filter(o => o.status === 'open' || o.status === 'active').length
  const completedOrders = liveOrders.filter(o => o.status === 'production_complete' || o.status === 'completed').length
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

  const lossMatch = { company: companyObjectId, type: { $in: ['loss', 'writeoff', 'deduction_loss', 'payment_loss', 'payment_surplus'] } }
  if (paymentMatch.date) lossMatch.date = paymentMatch.date

  const [company, paymentRows, rangeAgg, orderAgg, lossTransfers, settlements] = await Promise.all([
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
          // Archived orders leave the payable figures; closed orders stay until archived
          _isArchivedOut: { $and: [{ $eq: ['$archived', true] }, { $eq: ['$financialClosed', true] }] },
          _isClosedLive: { $and: [{ $eq: ['$status', 'closed'] }, { $ne: ['$archived', true] }] },
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
            $sum: { $cond: ['$_isArchivedOut', 0, { $multiply: ['$_acceptedMeter', { $ifNull: ['$ratePerMeter', 0] }] }] },
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
          totalDeductionUnarchived: {
            $sum: {
              $cond: [
                '$archived', 0,
                { $multiply: ['$_acceptedMeter', { $ifNull: ['$ratePerMeter', 0] }, { $divide: [{ $ifNull: ['$deductionPct', 0] }, 100] }] },
              ],
            },
          },
          totalDeductionForPayable: {
            $sum: {
              $cond: [
                '$_isArchivedOut', 0,
                { $multiply: ['$_acceptedMeter', { $ifNull: ['$ratePerMeter', 0] }, { $divide: [{ $ifNull: ['$deductionPct', 0] }, 100] }] },
              ],
            },
          },
          totalClosedAmount: { $sum: { $cond: ['$_isClosed', { $ifNull: ['$closedAmount', 0] }, 0] } },
          archivedClosedAmount: { $sum: { $cond: ['$archived', { $ifNull: ['$closedAmount', 0] }, 0] } },
          closedLiveAmount: { $sum: { $cond: ['$_isClosedLive', { $ifNull: ['$closedAmount', 0] }, 0] } },
          totalReceivedForLiveOrders: {
            $sum: { $cond: ['$_isClosed', 0, { $ifNull: ['$totalReceived', 0] }] },
          },
        },
      },
    ]),
    DeductionTransfer.find(lossMatch).select('date amount reason type').lean(),
    Settlement.find({ company: companyObjectId }).sort({ settledAt: -1 }).lean(),
  ])

  // Losses and surplus are listed in the history; only manually entered ones can be deleted
  const lossRows = lossTransfers.map(t => ({
    _id: String(t._id), date: t.date, amount: t.amount, transactionType: 'loss',
    lossKind: t.type === 'payment_loss' ? 'payment' : t.type === 'payment_surplus' ? 'surplus' : 'deduction',
    manual: ['deduction_loss', 'payment_loss', 'payment_surplus'].includes(t.type), mode: '', reference: '', notes: t.reason || '',
  }))
  const rows = [...paymentRows, ...lossRows].sort((a, b) => new Date(b.date) - new Date(a.date))

  // Settlements made before snapshots were stored: rebuild the order lines from the orders they archived
  const oldIds = settlements.filter(s => !s.snapshot).map(s => s._id)
  const oldOrders = oldIds.length
    ? await Order.find({ settlementId: { $in: oldIds } }).select('orderName settlementId acceptedMeter producedMeter rejectedMeter ratePerMeter deductionPct closedAmount closedDeduction').lean()
    : []
  const rebuiltSnapshot = (s) => {
    if (s.snapshot) return s.snapshot
    const orders = oldOrders.filter(o => String(o.settlementId) === String(s._id)).map(o => {
      const accepted = Number(o.acceptedMeter || Math.max(0, Number(o.producedMeter || 0) - Number(o.rejectedMeter || 0)))
      const deduction = Number(o.closedDeduction || 0)
      const payable = Number(o.closedAmount || 0)
      return {
        orderId: o._id, orderName: o.orderName, producedMeter: Number(o.producedMeter || 0), rejectedMeter: Number(o.rejectedMeter || 0),
        acceptedMeter: accepted, ratePerMeter: Number(o.ratePerMeter || 0),
        deductionPct: Number(o.deductionPct || 0), grossAmount: payable + deduction, deductionAmount: deduction, payableAmount: payable,
      }
    })
    if (!orders.length) return null
    return { orders, deductionOnSettledOrders: s.deductionTotal || 0, surplusMoved: s.surplusMoved || 0, lossAmount: s.lossAmount || 0, lossReason: s.lossReason || '' }
  }

  const companyTotals = orderAgg[0] || {
    orderCount: 0, activeOrders: 0, productionCompleteOrders: 0, closedOrders: 0,
    producedMeter: 0, expectedMeter: 0, rejectedMeter: 0, acceptedMeter: 0,
    totalProducedValue: 0, totalDeductionNeedToGet: 0, totalDeductionForPayable: 0, totalClosedAmount: 0,
  }

  const { balance: companyBalance, totalReceipts: totalReceiptAmount, totalClosed: totalClosedAll, totalLegacyAllocated } = await getCompanyBalance(companyId)
  const deduct = (await getDeductionPositions([companyId])).get(String(companyId))

  const totalPayableAmount = Math.max(0, (companyTotals.totalProducedValue || 0) - (companyTotals.totalDeductionForPayable || 0))
  const totalDeductionCollected = deduct.collected
  const rawDeductionNeed = deduct.outstanding + Math.max(0, (companyTotals.totalDeductionUnarchived || 0) - deduct.credit)
  const totalDeductionNeedToGet = rawDeductionNeed < 1 ? 0 : rawDeductionNeed
  // Allocated = money assigned to specific orders
  const totalAllocated = totalClosedAll
  // Pending from company = payable of unclosed orders minus money on hand
  const totalPendingToPay = Math.max(0, totalPayableAmount - totalLegacyAllocated - Number(companyTotals.closedLiveAmount || 0) - Math.max(0, companyBalance))
  const archivedAllocated = Number(companyTotals.archivedClosedAmount || 0)

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
      totalPayableAmount,
      totalDeductionNeedToGet,
      totalDeductionCollected,
      deductionCredit: deduct.credit,
      deductionWrittenOff: deduct.writtenOff,
      totalReceiptAmount: Math.max(0, totalReceiptAmount - archivedAllocated),
      totalPaidAmount: Math.max(0, totalAllocated - archivedAllocated),
      totalArchivedAllocatedAmount: archivedAllocated,
      totalUnallocatedAmount: Math.max(0, companyBalance),
      totalPendingToPay,
      companyBalance,
      totalReceiptInRange: rangeAgg[0]?.totalReceiptInRange || 0,
      totalDeductionInRange: rangeAgg[0]?.totalDeductionInRange || 0,
    },
    rows,
    settlements: settlements.map(s => ({
      _id: s._id, label: s.label, settledAt: s.settledAt, orderCount: (s.orderIds || []).length,
      payableTotal: s.payableTotal || 0, deductionTotal: s.deductionTotal || 0, surplusMoved: s.surplusMoved || 0,
      lossAmount: s.lossAmount || 0, lossReason: s.lossReason || '', by: s.by || '', snapshot: rebuiltSnapshot(s),
    })),
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
  if (!['receipt', 'deduction', 'deduction_loss', 'payment_loss', 'payment_surplus'].includes(transactionType)) transactionType = 'receipt'

  if (amount <= 0 || !Number.isFinite(amount)) {
    return res.status(400).json({ message: 'Amount must be greater than zero' })
  }
  if (!(await Company.exists({ _id: companyId }))) {
    return res.status(404).json({ message: 'Company not found' })
  }

  if (transactionType === 'payment_surplus') {
    return withCompanyLock(companyId, async () => {
      const { balance } = await getCompanyBalance(companyId)
      const available = Math.max(0, balance)
      // Unallocated is shown rounded to whole rupees, so accept up to the next rupee and store only what is available
      const maxSurplus = Math.ceil(available - 0.01)
      if (amount > maxSurplus + 0.01) {
        return res.status(400).json({ message: `Surplus cannot exceed the unallocated receipt (\u20b9${maxSurplus})` })
      }
      const doc = await DeductionTransfer.create({
        company: companyId,
        type: 'payment_surplus',
        amount: Math.min(amount, available),
        reason: req.body.notes || '',
        by: req.user?.username || '',
        date: req.body.date ? new Date(req.body.date) : new Date(),
      })
      res.status(201).json(doc)
    })
  }

  if (transactionType === 'payment_loss') {
    return withCompanyLock(companyId, async () => {
      const liveOrders = await Order.find({ company: companyId, deletedAt: null, archived: { $ne: true }, status: { $ne: 'closed' } })
        .select('producedMeter rejectedMeter acceptedMeter ratePerMeter deductionPct').lean()
      const payable = liveOrders.reduce((sum, o) => {
        const produced = Number(o.producedMeter || 0)
        const accepted = Number(o.acceptedMeter || Math.max(0, produced - Number(o.rejectedMeter || 0)))
        const value = accepted * Number(o.ratePerMeter || 0)
        return sum + value - value * (Number(o.deductionPct || 0) / 100)
      }, 0)
      const legacy = (await getLegacyAllocatedByOrder(liveOrders.map(o => o._id)))
      const legacyAllocated = [...legacy.values()].reduce((s, v) => s + v, 0)
      const { balance } = await getCompanyBalance(companyId)
      const pending = Math.max(0, payable - legacyAllocated - Math.max(0, balance))
      // Pending is shown rounded to whole rupees, so allow rounding up to the next rupee
      const maxLoss = Math.ceil(pending - 0.01)
      if (amount > maxLoss + 0.01) {
        return res.status(400).json({ message: `Loss cannot exceed the payment still pending (₹${maxLoss})` })
      }
      const doc = await DeductionTransfer.create({
        company: companyId,
        type: 'payment_loss',
        amount,
        reason: req.body.notes || '',
        by: req.user?.username || '',
        date: req.body.date ? new Date(req.body.date) : new Date(),
      })
      res.status(201).json(doc)
    })
  }

  if (transactionType === 'deduction_loss') {
    return withCompanyLock(companyId, async () => {
      const pos = (await getDeductionPositions([companyId])).get(String(companyId))
      const liveOrders = await Order.find({ company: companyId, deletedAt: null, archived: { $ne: true } })
        .select('status producedMeter rejectedMeter acceptedMeter ratePerMeter deductionPct closedDeduction').lean()
      const liveDeduction = liveOrders.reduce((sum, o) => {
        if (o.status === 'closed' && o.closedDeduction != null) return sum + Number(o.closedDeduction)
        const produced = Number(o.producedMeter || 0)
        const accepted = Number(o.acceptedMeter || Math.max(0, produced - Number(o.rejectedMeter || 0)))
        return sum + accepted * Number(o.ratePerMeter || 0) * (Number(o.deductionPct || 0) / 100)
      }, 0)
      const owed = pos.outstanding + Math.max(0, liveDeduction - pos.credit)
      if (amount > owed + 0.01) {
        return res.status(400).json({ message: `Loss cannot exceed the deduction still to get (₹${Math.floor(owed)})` })
      }
      const doc = await DeductionTransfer.create({
        company: companyId,
        type: 'deduction_loss',
        amount,
        reason: req.body.notes || '',
        by: req.user?.username || '',
        date: req.body.date ? new Date(req.body.date) : new Date(),
      })
      await allocateDeductionPool(companyId)
      res.status(201).json(doc)
    })
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

  if (transactionType === 'deduction') await allocateDeductionPool(companyId)
  await doc.populate('company', 'name')
  res.status(201).json(doc)
}))

router.delete('/deduction-loss/:id', ah(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ message: 'Invalid id' })
  }
  const entry = await DeductionTransfer.findOne({ _id: req.params.id, type: { $in: ['deduction_loss', 'payment_loss', 'payment_surplus'] } }).lean()
  if (!entry) return res.status(404).json({ message: 'Not found' })

  return withCompanyLock(entry.company, async () => {
    if (entry.type === 'payment_surplus') {
      await DeductionTransfer.deleteOne({ _id: entry._id })
      return res.json({ message: 'Deleted' })
    }
    if (entry.type === 'payment_loss') {
      const { balance } = await getCompanyBalance(String(entry.company))
      if (balance < Number(entry.amount || 0) - 0.01) {
        return res.status(400).json({ message: 'This loss is already used to close orders and cannot be deleted' })
      }
      await DeductionTransfer.deleteOne({ _id: entry._id })
      return res.json({ message: 'Deleted' })
    }
    const pos = (await getDeductionPositions([String(entry.company)])).get(String(entry.company))
    if (pos && pos.credit < Number(entry.amount || 0) - 0.01) {
      return res.status(400).json({ message: 'This loss is already assigned to archived orders and cannot be deleted' })
    }
    await DeductionTransfer.deleteOne({ _id: entry._id })
    res.json({ message: 'Deleted' })
  })
}))

module.exports = router
