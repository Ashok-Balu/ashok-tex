const router   = require('express').Router()
const ah       = require('express-async-handler')
const auth     = require('../middleware/auth')
const mongoose = require('mongoose')
const { Order, Production, Rejection, Payment, Nool, OrderHistory, Settlement, Company } = require('../models')
const { uploadOrderSampleImage } = require('../cloudinary')
const { getCompanyBalance, getDeductionPositions, getLegacyAllocatedByOrder } = require('../services/companyBalance')
const { allocateDeductionPool, moveSurplusToDeduction, round2 } = require('../services/deductionSettlement')
const { withCompanyLock } = require('../services/companyLock')

function logOrderHistory(order, action, by, reason, details) {
  return OrderHistory.create({ order, action, by: by || '', reason: reason || '', details: details || {} }).catch(() => {})
}

router.use(auth)

// Balance-changing actions run one at a time per company so two requests cannot both pass the balance check.
const serialiseByOrderCompany = (handler) => ah(async (req, res, next) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ message: 'Invalid order id' })
  const probe = await Order.findById(req.params.id).select('company').lean()
  if (!probe) return res.status(404).json({ message: 'Not found' })
  return withCompanyLock(probe.company, () => handler(req, res, next))
})
const serialiseByCompanyParam = (handler) => ah(async (req, res, next) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.companyId)) return handler(req, res, next)
  return withCompanyLock(req.params.companyId, () => handler(req, res, next))
})
router.get('/', ah(async (req, res) => {
  const f = { deletedAt: null }
  if (req.query.status) f.status = req.query.status
  if (req.query.companyId) f.company = req.query.companyId

  // Archive scope filters (include legacy status values for unmigrated data)
  if (req.query.scope === 'closed') {
    f.status = 'closed'
  } else if (req.query.scope === 'active') {
    f.status = { $in: ['open', 'production_complete', 'active', 'completed'] }
    f.archived = { $ne: true }
  }

  // Legacy filter support
  if (req.query.includeArchived === '1') {
    delete f.status
    if (req.query.archived === '1') f.status = 'closed'
  } else if (!f.status) {
    // Default: show all non-deleted
  }

  const rows = await Order.find(f)
    .select('orderName company status producedMeter rejectedMeter acceptedMeter expectedMeter ratePerMeter deductionPct startDate endDate reedPick size manuallyCompleted productionClosed financialClosed archived closedAmount closedDeduction closedAt deletedAt createdAt updatedAt lossMeter averageWeightPerMeter yarnShortageEnteredAmount totalReceived')
    .populate('company', 'name defaultDeduction')
    .sort({ updatedAt: -1 })
    .lean()

  const orderIds = rows.map(row => row._id).filter(Boolean)
  const noolWeightsByOrder = await buildNoolWeightsByOrder(orderIds)

  res.json(rows.map((row) => {
    const weights = noolWeightsByOrder.get(String(row._id)) || { totalYarnWeight: 0, totalReturnWeight: 0 }
    return withComputedOrderFields({ ...row, ...weights })
  }))
}))

router.get('/:id', ah(async (req, res) => {
  const doc = await Order.findById(req.params.id).populate('company', 'name defaultDeduction')
  if (!doc || doc.deletedAt) return res.status(404).json({ message: 'Not found' })
  res.json(withComputedOrderFields(doc))
}))

router.post('/:id/repeat', ah(async (req, res) => {
  const source = await Order.findById(req.params.id)
  if (!source) return res.status(404).json({ message: 'Source order not found' })

  const startDateRaw = req.body?.startDate
  if (!startDateRaw) {
    return res.status(400).json({ message: 'Start date is required' })
  }

  const startDate = new Date(startDateRaw)
  if (Number.isNaN(startDate.getTime())) {
    return res.status(400).json({ message: 'Invalid start date' })
  }

  const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
  const now = new Date()
  const suffix = `${monthNames[now.getMonth()]}-${now.getFullYear()}`

  const sourceName = String(source.orderName || '').trim()
  const baseName = sourceName.replace(/\s-\s[A-Z]{3}-\d{4}(?:-\d+)?$/, '') || sourceName

  let nextName = `${baseName} - ${suffix}`
  let seq = 2
  while (await Order.exists({ company: source.company, orderName: nextName })) {
    nextName = `${baseName} - ${suffix}-${seq}`
    seq += 1
  }

  const repeated = await Order.create({
    orderName: nextName,
    company: source.company,
    reedPick: source.reedPick || '',
    size: source.size || '',
    startDate,
    endDate: source.endDate || null,
    expectedMeter: Number(source.expectedMeter || 0),
    producedMeter: 0,
    ratePerMeter: Number(source.ratePerMeter || 0),
    deductionPct: Number(source.deductionPct || 0),
    status: 'open',
    sampleImage: source.sampleImage || '',
  })

  await repeated.populate('company', 'name defaultDeduction')
  res.status(201).json(withComputedOrderFields(repeated))
}))

router.get('/:id/nool-stats', ah(async (req, res) => {
  const rows = await Nool.find({ order: req.params.id }).select('entryType qty').lean()
  const received = rows.filter(r => (r.entryType || 'receipt') === 'receipt').reduce((s, r) => s + (r.qty || 0), 0)
  const used = rows.filter(r => ['used', 'return'].includes(r.entryType)).reduce((s, r) => s + (r.qty || 0), 0)
  res.json({ received, used, remaining: Math.max(0, received - used) })
}))

router.post('/', ah(async (req, res) => {
  let payload
  try { payload = await normalizeOrderPayload(req.body) }
  catch (e) { return res.status(400).json({ message: e.message }) }
  payload.status = 'open'
  if (await orderNameTaken(payload.company, payload.orderName)) {
    return res.status(409).json({ message: 'This company already has an order with this name' })
  }
  const doc = await Order.create(payload)
  await doc.populate('company', 'name defaultDeduction')
  logOrderHistory(doc._id, 'created', req.user?.username, '', { orderName: doc.orderName, company: doc.company?.name })
  res.status(201).json(withComputedOrderFields(doc))
}))

router.put('/:id', ah(async (req, res) => {
  const existing = await Order.findById(req.params.id).lean()
  if (!existing || existing.deletedAt) return res.status(404).json({ message: 'Not found' })
  if (existing.status === 'closed') {
    return res.status(400).json({ message: 'Cannot edit a closed order' })
  }

  let payload
  try { payload = await normalizeOrderPayload(req.body, { isUpdate: true }) }
  catch (e) { return res.status(400).json({ message: e.message }) }

  const targetCompany = payload.company || existing.company
  const targetName = payload.orderName ?? existing.orderName
  if (await orderNameTaken(targetCompany, targetName, existing._id)) {
    return res.status(409).json({ message: 'This company already has an order with this name' })
  }

  const doc = await Order.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true })
    .populate('company', 'name defaultDeduction')
  if (!doc) return res.status(404).json({ message: 'Not found' })
  await recalcProduced(req.params.id)
  const updated = await Order.findById(req.params.id).populate('company', 'name defaultDeduction')
  res.json(withComputedOrderFields(updated))
}))

router.patch('/:id/average-weight', ah(async (req, res) => {
  const raw = req.body?.averageWeightPerMeter
  const value = Number(raw)
  if (!Number.isFinite(value) || value < 0) {
    return res.status(400).json({ message: 'Invalid averageWeightPerMeter' })
  }

  const doc = await Order.findByIdAndUpdate(
    req.params.id,
    { averageWeightPerMeter: value },
    { new: true, runValidators: true }
  )
  if (!doc) return res.status(404).json({ message: 'Not found' })

  res.json({ averageWeightPerMeter: Number(doc.averageWeightPerMeter || 0) })
}))

router.patch('/:id/yarn-shortage-entered-amount', ah(async (req, res) => {
  const raw = req.body?.yarnShortageEnteredAmount
  const value = Number(raw)
  if (!Number.isFinite(value) || value < 0) {
    return res.status(400).json({ message: 'Invalid yarnShortageEnteredAmount' })
  }

  const doc = await Order.findByIdAndUpdate(
    req.params.id,
    { yarnShortageEnteredAmount: value },
    { new: true, runValidators: true }
  )
  if (!doc) return res.status(404).json({ message: 'Not found' })

  res.json({ yarnShortageEnteredAmount: Number(doc.yarnShortageEnteredAmount || 0) })
}))

// ── Mark Production Complete ──────────────────────────────────────────────────
router.patch('/:id/production-complete', ah(async (req, res) => {
  const order = await Order.findById(req.params.id).populate('company', 'name defaultDeduction')
  if (!order || order.deletedAt) return res.status(404).json({ message: 'Not found' })
  if (order.status === 'closed') {
    return res.status(400).json({ message: 'Order is already closed' })
  }

  const hasProduction = await Production.exists({ order: order._id })
  if (!hasProduction) {
    return res.status(400).json({ message: 'Cannot mark production complete without production history' })
  }

  order.status = 'production_complete'
  order.productionClosed = true
  order.manuallyCompleted = true
  await order.save()
  logOrderHistory(order._id, 'production_complete', req.user?.username, '', { producedMeter: order.producedMeter, acceptedMeter: order.acceptedMeter })
  res.json(withComputedOrderFields(order))
}))

// Legacy endpoint - maps to production-complete
router.patch('/:id/complete', ah(async (req, res) => {
  const order = await Order.findById(req.params.id).populate('company', 'name defaultDeduction')
  if (!order || order.deletedAt) return res.status(404).json({ message: 'Not found' })
  if (order.status === 'closed') {
    return res.status(400).json({ message: 'Order is already closed' })
  }

  const hasProduction = await Production.exists({ order: order._id })
  if (!hasProduction) {
    return res.status(400).json({ message: 'Cannot complete order without production history' })
  }

  order.status = 'production_complete'
  order.productionClosed = true
  order.manuallyCompleted = true
  await order.save()
  res.json(withComputedOrderFields(order))
}))

// Legacy endpoint
router.patch('/:id/close-production', ah(async (req, res) => {
  const order = await Order.findById(req.params.id).populate('company', 'name defaultDeduction')
  if (!order || order.deletedAt) return res.status(404).json({ message: 'Not found' })
  if (order.status === 'closed') {
    return res.status(400).json({ message: 'Order is already closed' })
  }

  const hasProduction = await Production.exists({ order: order._id })
  if (!hasProduction) {
    return res.status(400).json({ message: 'Cannot complete order without production history' })
  }

  order.status = 'production_complete'
  order.productionClosed = true
  order.manuallyCompleted = true
  await order.save()
  res.json(withComputedOrderFields(order))
}))

// ── Close Order (allocate payment from company balance) ───────────────────────
router.patch('/:id/close', serialiseByOrderCompany(async (req, res) => {
  const order = await Order.findById(req.params.id).populate('company', 'name defaultDeduction')
  if (!order || order.deletedAt) return res.status(404).json({ message: 'Not found' })

  if (order.status === 'closed') {
    return res.status(400).json({ message: 'Order is already closed' })
  }
  // Allow close for production_complete OR legacy 'completed' status with productionClosed flag
  const canClose = order.status === 'production_complete'
    || (order.status === 'completed' && order.productionClosed)
  if (!canClose) {
    return res.status(400).json({ message: 'Order must be production complete before closing' })
  }

  const computed = computeOrderFinancials(order)
  const payable = computed.payableAmount
  const allocated = (await getLegacyAllocatedByOrder([order._id])).get(String(order._id)) || 0
  const needed = round2(Math.max(0, payable - allocated))

  // Check company balance
  const { balance } = await getCompanyBalance(order.company._id || order.company)
  if (balance < needed - 0.01) {
    return res.status(400).json({
      message: `Insufficient company balance. Need ₹${Math.ceil(needed)}, available ₹${Math.floor(balance)}`,
      required: needed,
      available: balance,
    })
  }

  // Close the order
  order.status = 'closed'
  order.closedAmount = payable
  order.closedDeduction = computed.deductionAmount
  order.closedAt = new Date()
  order.closedBy = req.user?.username || ''
  order.financialClosed = true
  order.totalReceived = payable
  await order.save()

  const balanceAfter = balance - needed
  logOrderHistory(order._id, 'closed', req.user?.username, '', { closedAmount: payable, deduction: computed.deductionAmount, balanceAfter })
  res.json({ ...withComputedOrderFields(order), balanceAfter })
}))

// ── Get company balance for close order UI ────────────────────────────────────
router.get('/:id/close-info', ah(async (req, res) => {
  const order = await Order.findById(req.params.id).populate('company', 'name defaultDeduction').lean()
  if (!order || order.deletedAt) return res.status(404).json({ message: 'Not found' })

  const computed = computeOrderFinancials(order)
  const { balance, totalReceipts, totalClosed } = await getCompanyBalance(order.company._id || order.company)
  const allocated = (await getLegacyAllocatedByOrder([order._id])).get(String(order._id)) || 0
  const needed = round2(Math.max(0, computed.payableAmount - allocated))
  const balanceAfter = balance - needed

  // Find other orders waiting to close for this company
  const pendingOrders = await Order.find({
    company: order.company._id || order.company,
    status: { $in: ['production_complete', 'completed'] },
    deletedAt: null,
    _id: { $ne: order._id },
  }).select('orderName producedMeter rejectedMeter acceptedMeter ratePerMeter deductionPct').lean()

  const pendingOrdersList = pendingOrders.map(o => {
    const f = computeOrderFinancials(o)
    return { _id: o._id, orderName: o.orderName, payableAmount: f.payableAmount }
  })

  res.json({
    payable: computed.payableAmount,
    deduction: computed.deductionAmount,
    grossValue: computed.totalValue,
    companyBalance: balance,
    balanceAfter,
    companyTotalReceipts: totalReceipts,
    companyTotalClosed: totalClosed,
    canClose: balance >= needed - 0.01,
    pendingOrders: pendingOrdersList.length,
    pendingCloseTotal: pendingOrdersList.reduce((s, o) => s + o.payableAmount, 0),
    pendingOrdersList,
  })
}))

// ── Get reopen info for admin UI ──────────────────────────────────────────────
router.get('/:id/reopen-info', ah(async (req, res) => {
  const order = await Order.findById(req.params.id).populate('company', 'name defaultDeduction').lean()
  if (!order || order.deletedAt) return res.status(404).json({ message: 'Not found' })
  if (order.status !== 'closed') return res.status(400).json({ message: 'Order is not closed' })

  const { balance } = await getCompanyBalance(order.company._id || order.company)
  res.json({
    freedAmount: Number(order.closedAmount || 0),
    currentBalance: balance,
    companyName: order.company?.name || '',
  })
}))

// ── Get archive info (surplus available to move into deduction pool) ─────────
router.get('/:id/archive-info', ah(async (req, res) => {
  const order = await Order.findById(req.params.id).populate('company', 'name').lean()
  if (!order || order.deletedAt) return res.status(404).json({ message: 'Not found' })

  const companyId = String(order.company._id || order.company)
  const { balance } = await getCompanyBalance(companyId)
  const pos = (await getDeductionPositions([companyId])).get(companyId) || { outstanding: 0, credit: 0 }
  res.json({
    canArchive: order.status === 'closed' && !order.archived,
    closedAmount: Number(order.closedAmount || 0),
    closedDeduction: Number(order.closedDeduction || 0),
    companyName: order.company?.name || '',
    companyBalance: balance,
    surplusAvailable: Math.max(0, round2(balance)),
    deductionOutstanding: pos.outstanding,
    deductionCredit: pos.credit,
  })
}))

// ── Archive closed order (settles deduction from company pool) ───────────────
// Optional body.surplusToDeduction moves part of the company balance into the deduction pool.
router.patch('/:id/archive', serialiseByOrderCompany(async (req, res) => {
  const order = await Order.findById(req.params.id).populate('company', 'name defaultDeduction')
  if (!order || order.deletedAt) return res.status(404).json({ message: 'Not found' })
  if (order.status !== 'closed') {
    return res.status(400).json({ message: 'Order must be closed before archiving' })
  }
  if (order.archived) {
    return res.status(400).json({ message: 'Order is already archived' })
  }

  const companyId = String(order.company._id || order.company)
  const rawSurplus = req.body?.surplusToDeduction ?? 0
  const surplusToDeduction = round2(Number(rawSurplus))
  if (!Number.isFinite(Number(rawSurplus)) || !Number.isFinite(surplusToDeduction) || surplusToDeduction < 0) {
    return res.status(400).json({ message: 'Invalid surplus amount' })
  }

  const { balance } = await getCompanyBalance(companyId)
  if (surplusToDeduction > balance + 0.01) {
    return res.status(400).json({ message: `Surplus to deduction exceeds available balance ₹${Math.floor(balance)}`, available: balance })
  }

  const by = req.user?.username || ''
  await moveSurplusToDeduction(companyId, surplusToDeduction, by)

  order.archived = true
  order.archivedAt = new Date()
  order.archivedBy = by
  await order.save()

  const deductionAllocated = await allocateDeductionPool(companyId)
  const updated = await Order.findById(order._id).populate('company', 'name defaultDeduction')
  logOrderHistory(order._id, 'archived', by, '', { surplusToDeduction, deductionAllocated })
  res.json({ ...withComputedOrderFields(updated), surplusToDeduction, deductionAllocated })
}))

// Orders a settlement covers: archived orders that have not been settled yet.
async function buildSettlePlan(companyId) {
  const ready = await Order.find({
    company: companyId,
    deletedAt: null,
    archived: true,
    settlementId: null,
  }).populate('company', 'name defaultDeduction')

  // Archived orders are already paid from the balance, so nothing more is payable here
  const payableTotal = 0
  // Deduction booked on the orders being settled (active and closed orders are not part of a settlement)
  const deductionTotal = round2(ready.reduce((sum, o) => sum + Number(o.closedDeduction || 0), 0))
  const deductionDue = round2(ready.reduce((sum, o) => sum + Math.max(0, Number(o.closedDeduction || 0) - Number(o.deductionAllocated || 0) - Number(o.deductionWrittenOff || 0)), 0))
  const { balance } = await getCompanyBalance(companyId)
  const pos = (await getDeductionPositions([companyId])).get(String(companyId)) || { outstanding: 0, credit: 0 }
  // Deduction of these orders still not received; settle is blocked until this is zero (under ₹1 is rounding)
  const rawShortfall = round2(Math.max(0, deductionDue - pos.credit))
  const deductionShortfall = rawShortfall < 1 ? 0 : rawShortfall
  return { ready, payableTotal, deductionTotal, balance, deductionShortfall, deductionOutstanding: round2(pos.outstanding), deductionCredit: round2(pos.credit) }
}

router.get('/settle-preview/:companyId', ah(async (req, res) => {
  const { companyId } = req.params
  if (!mongoose.Types.ObjectId.isValid(companyId)) {
    return res.status(400).json({ message: 'Invalid company id' })
  }
  const plan = await buildSettlePlan(companyId)
  res.json({
    orderCount: plan.ready.length,
    payableTotal: plan.payableTotal,
    deductionTotal: plan.deductionTotal,
    companyBalance: plan.balance,
    deductionShortfall: plan.deductionShortfall,
    deductionOutstanding: plan.deductionOutstanding,
    deductionCredit: plan.deductionCredit,
  })
}))

// ── Settle company (Diwali): settle all archived orders not yet settled; unpaid deduction stays outstanding ──
router.post('/settle/:companyId', serialiseByCompanyParam(async (req, res) => {
  const { companyId } = req.params
  if (!mongoose.Types.ObjectId.isValid(companyId)) {
    return res.status(400).json({ message: 'Invalid company id' })
  }

  const { ready, payableTotal, deductionTotal, balance, deductionShortfall, deductionOutstanding, deductionCredit } = await buildSettlePlan(companyId)
  if (!ready.length) {
    return res.status(400).json({ message: 'No orders to settle' })
  }
  if (deductionShortfall > 0.01) {
    return res.status(400).json({
      message: `Record the deduction of ₹${Math.ceil(deductionShortfall)} on archived orders before settling`,
      deductionShortfall,
    })
  }

  // Validate everything before writing anything (nothing payable means balance is irrelevant)
  if (payableTotal > 0 && payableTotal > balance + 0.01) {
    const shortfall = round2(payableTotal - balance)
    return res.status(400).json({
      message: `Insufficient company balance. Need ₹${Math.ceil(payableTotal)}, available ₹${Math.floor(balance)}, short ₹${Math.ceil(shortfall)}`,
      required: payableTotal,
      available: balance,
      shortfall,
    })
  }

  const surplus = Math.max(0, round2(balance - payableTotal))
  const surplusToDeduction = round2(Number(req.body?.surplusToDeduction || 0))
  if (!Number.isFinite(Number(req.body?.surplusToDeduction || 0)) || surplusToDeduction < 0 || surplusToDeduction > surplus + 0.01) {
    return res.status(400).json({ message: `Surplus to deduction must be between 0 and ₹${Math.floor(surplus)}`, surplus })
  }

  const by = req.user?.username || ''
  const now = new Date()
  const label = String(req.body?.label || '').trim() || `Settlement ${now.toLocaleDateString('en-IN')}`

  const settlement = await Settlement.create({
    company: companyId,
    label,
    orderIds: ready.map(o => o._id),
    payableTotal,
    deductionTotal,
    surplusMoved: surplusToDeduction,
    settledAt: now,
    by,
  })

  const lines = []
  for (const order of ready) {
    const f = computeOrderFinancials(order)
    const closedAmount = Number(order.closedAmount || 0)
    const closedDeduction = Number(order.closedDeduction || 0)
    lines.push({
      orderId: order._id,
      orderName: order.orderName,
      wasClosed: true,
      producedMeter: Number(order.producedMeter || 0),
      rejectedMeter: Number(order.rejectedMeter || 0),
      acceptedMeter: f.acceptedMeter,
      ratePerMeter: Number(order.ratePerMeter || 0),
      deductionPct: Number(order.deductionPct || 0),
      grossAmount: round2(closedAmount + closedDeduction),
      deductionAmount: closedDeduction,
      payableAmount: closedAmount,
    })
    order.settlementId = settlement._id
    await order.save()
    logOrderHistory(order._id, 'settled', by, label, { closedAmount, deduction: closedDeduction, settlementId: settlement._id })
  }

  if (surplusToDeduction > 0) {
    await moveSurplusToDeduction(companyId, surplusToDeduction, by, settlement._id)
  }
  const deductionAllocated = await allocateDeductionPool(companyId)
  const { balance: balanceAfter } = await getCompanyBalance(companyId)
  const deductionCarried = round2(Math.max(0, deductionShortfall - surplusToDeduction))

  settlement.snapshot = {
    orders: lines,
    balanceBefore: round2(balance),
    balanceAfter: round2(balanceAfter),
    cashUsedToCloseOrders: payableTotal,
    deductionPendingBefore: deductionOutstanding,
    deductionOnSettledOrders: deductionTotal,
    deductionReceivedUnapplied: deductionCredit,
    surplusMoved: surplusToDeduction,
    deductionAllocated,
    deductionCarried,
  }
  await settlement.save()

  res.status(201).json({
    settlement,
    orderCount: ready.length,
    payableTotal,
    deductionTotal,
    surplusMoved: surplusToDeduction,
    deductionAllocated,
    deductionCarried,
    balanceAfter,
  })
}))

// ── Reopen (admin only) — reverts closed → open ───────────────────────────────
router.patch('/:id/reopen', ah(async (req, res) => {
  const isAdmin = req.user?.role === 'admin'
  if (!isAdmin) {
    return res.status(403).json({ message: 'Only admin can reopen orders' })
  }

  const order = await Order.findById(req.params.id).populate('company', 'name defaultDeduction')
  if (!order || order.deletedAt) return res.status(404).json({ message: 'Not found' })

  if (order.status !== 'closed') {
    return res.status(400).json({ message: 'Only closed orders can be reopened' })
  }
  if (order.archived) {
    return res.status(400).json({ message: 'Archived orders cannot be reopened' })
  }

  const freedAmount = Number(order.closedAmount || 0)
  const reason = String(req.body?.reason || '').trim()

  order.status = 'open'
  order.closedAmount = 0
  order.closedDeduction = 0
  order.closedAt = null
  order.closedBy = ''
  order.financialClosed = false
  order.productionClosed = false
  order.manuallyCompleted = false
  order.archived = false
  order.archivedAt = null
  order.totalReceived = 0
  await order.save()

  logOrderHistory(order._id, 'reopened', req.user?.username, reason, { freedAmount })
  res.json(withComputedOrderFields(order))
}))

// ── Order History ─────────────────────────────────────────────────────────────
router.get('/:id/history', ah(async (req, res) => {
  const rows = await OrderHistory.find({ order: req.params.id })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean()
  res.json(rows)
}))

// ── Delete ────────────────────────────────────────────────────────────────────
router.delete('/:id', ah(async (req, res) => {
  const order = await Order.findById(req.params.id).lean()
  if (!order || order.deletedAt) return res.status(404).json({ message: 'Not found' })

  const isAdmin = req.user?.role === 'admin'

  // Normal users can only delete archived/closed orders
  if (!isAdmin && !order.archived) {
    return res.status(403).json({ message: 'Order must be archived before deleting' })
  }

  // Always soft-delete — preserves audit trail
  await Order.findByIdAndUpdate(order._id, { deletedAt: new Date() })
  logOrderHistory(order._id, 'deleted', req.user?.username, '', { status: order.status, closedAmount: order.closedAmount })
  res.json({ message: 'Order deleted', type: 'soft' })
}))

// ── Helpers ───────────────────────────────────────────────────────────────────

async function recalcProduced(orderId) {
  const [prodAgg, rejAgg] = await Promise.all([
    Production.aggregate([
      { $match: { order: new mongoose.Types.ObjectId(orderId) } },
      { $group: { _id: null, total: { $sum: '$meter' } } },
    ]),
    Rejection.aggregate([
      { $match: { order: new mongoose.Types.ObjectId(orderId) } },
      { $group: { _id: null, total: { $sum: '$rejectedQty' } } },
    ]),
  ])

  const producedMeter = Number(prodAgg[0]?.total || 0)
  const rejectedMeter = Number(rejAgg[0]?.total || 0)
  const acceptedMeter = Math.max(0, producedMeter - rejectedMeter)

  const order = await Order.findById(orderId).select('expectedMeter manuallyCompleted ratePerMeter status')
  if (!order) return

  const ratePerMeter = Number(order.ratePerMeter || 0)
  const lossMeter = Math.max(0, producedMeter - acceptedMeter)

  const updatePayload = {
    producedMeter,
    rejectedMeter,
    acceptedMeter,
    lossMeter,
    lossAmount: Number((lossMeter * ratePerMeter).toFixed(2)),
  }

  await Order.findByIdAndUpdate(orderId, updatePayload)
}

function computeOrderFinancials(orderDoc) {
  const o = orderDoc.toObject ? orderDoc.toObject() : orderDoc
  const producedMeter = Number(o.producedMeter || 0)
  const rejectedMeter = Number(o.rejectedMeter || 0)
  const acceptedMeter = Number(o.acceptedMeter || Math.max(0, producedMeter - rejectedMeter))
  const totalValue = acceptedMeter * Number(o.ratePerMeter || 0)
  const deductionAmount = totalValue * (Number(o.deductionPct || 0) / 100)
  const payableAmount = Math.max(0, totalValue - deductionAmount)
  return { totalValue, deductionAmount, payableAmount, acceptedMeter }
}

function withComputedOrderFields(orderDoc) {
  const o = orderDoc.toObject ? orderDoc.toObject() : orderDoc
  const producedMeter = Number(o.producedMeter || 0)
  const rejectedMeter = Number(o.rejectedMeter || 0)
  const acceptedMeter = Number(o.acceptedMeter || Math.max(0, producedMeter - rejectedMeter))
  const totalValue = acceptedMeter * (o.ratePerMeter || 0)
  const deductionHoldAmount = totalValue * ((o.deductionPct || 0) / 100)
  const payableAmount = totalValue - deductionHoldAmount

  const isClosed = o.status === 'closed'
  const paidAmount = isClosed ? Number(o.closedAmount || 0) : Number(o.totalReceived || 0)
  const remainingPayment = Math.max(0, payableAmount - paidAmount)

  const averageWeightPerMeter = Number(o.averageWeightPerMeter || 0)
  const totalProductionWeight = Number((averageWeightPerMeter * producedMeter).toFixed(2))
  const totalYarnWeight = Number(o.totalYarnWeight || 0)
  const totalReturnWeight = Number(o.totalReturnWeight || 0)
  const totalWaPassWeight = Number(totalReturnWeight.toFixed(2))
  const totalWeightShortage = Number((
    totalYarnWeight
    - totalProductionWeight
    - totalWaPassWeight
    - Number(o.yarnShortageEnteredAmount || 0)
  ).toFixed(2))

  // Payment status derivation
  let paymentStatus = 'unpaid'
  if (isClosed) {
    paymentStatus = 'fully_paid'
  } else if (paidAmount > 0.001) {
    paymentStatus = 'partially_paid'
  }
  const paymentStatusLabel = paymentStatus === 'fully_paid' ? 'Fully Paid'
    : paymentStatus === 'partially_paid' ? 'Partially Paid' : 'Unpaid'

  // Map new statuses to legacy for frontend compat
  const isProductionClosed = o.status === 'production_complete' || o.status === 'closed' || !!o.productionClosed
  const isFinancialClosed = o.status === 'closed' || !!o.financialClosed

  // Legacy status mapping for frontend
  const legacyStatus = o.status === 'open' ? 'active'
    : o.status === 'production_complete' ? 'completed'
    : o.status === 'closed' ? 'completed'
    : o.status // fallback

  return {
    ...o,
    status: legacyStatus,
    orderStatus: o.status, // new field for frontend to use
    producedMeter,
    rejectedMeter,
    acceptedMeter,
    lossMeter: Math.max(0, producedMeter - acceptedMeter),
    lossAmount: Number((Math.max(0, producedMeter - acceptedMeter) * Number(o.ratePerMeter || 0)).toFixed(2)),
    remainingQty: Math.max(0, (o.expectedMeter || 0) - acceptedMeter),
    totalValue,
    deductionHoldAmount,
    payableAmount,
    paymentStatus,
    paymentStatusLabel,
    paymentRemaining: remainingPayment,
    averageWeightPerMeter,
    yarnShortageEnteredAmount: o.yarnShortageEnteredAmount || 0,
    totalProductionWeight,
    totalWaPassWeight,
    totalYarnWeight,
    totalReturnWeight,
    totalWeightShortage,
    // Legacy compat
    archived: !!o.archived,
    productionClosed: isProductionClosed,
    financialClosed: isFinancialClosed,
    // New fields
    closedAmount: o.closedAmount || 0,
    closedDeduction: o.closedDeduction || 0,
    closedAt: o.closedAt || null,
    archivedAt: o.archivedAt || null,
    deductionAllocated: o.deductionAllocated || 0,
    deductionWrittenOff: o.deductionWrittenOff || 0,
    settlementId: o.settlementId || null,
  }
}

// Only these fields may be written through create/update; status, financial-close and audit fields are system-managed.
const ORDER_EDITABLE_FIELDS = [
  'orderName', 'company', 'reedPick', 'size', 'startDate', 'endDate', 'expectedMeter', 'ratePerMeter',
  'deductionPct', 'averageWeightPerMeter', 'yarnShortageEnteredAmount', 'sampleImage',
]

const MAX_SAMPLE_IMAGE_CHARS = 10_000_000

async function orderNameTaken(company, orderName, excludeId = null) {
  const q = { company, orderName: String(orderName || '').trim(), deletedAt: null }
  if (excludeId) q._id = { $ne: excludeId }
  return !!(await Order.exists(q).collation({ locale: 'en', strength: 2 }))
}

async function normalizeOrderPayload(body = {}, options = {}) {
  const payload = {}
  for (const key of ORDER_EDITABLE_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(body, key)) payload[key] = body[key]
  }

  if (!payload.startDate) {
    throw new Error('Start date is required')
  }

  const startDate = new Date(payload.startDate)
  if (Number.isNaN(startDate.getTime())) {
    throw new Error('Invalid start date')
  }
  payload.startDate = startDate

  if (payload.endDate) {
    const endDate = new Date(payload.endDate)
    if (Number.isNaN(endDate.getTime())) {
      throw new Error('Invalid end date')
    }
    if (endDate < startDate) {
      throw new Error('End date cannot be before start date')
    }
    payload.endDate = endDate
  }

  const isUpdate = options.isUpdate === true
  if (!isUpdate || Object.prototype.hasOwnProperty.call(payload, 'orderName')) {
    if (typeof payload.orderName !== 'string' || !payload.orderName.trim()) {
      throw new Error('Order name is required')
    }
  }

  if (!isUpdate || Object.prototype.hasOwnProperty.call(payload, 'company')) {
    if (!mongoose.Types.ObjectId.isValid(payload.company) || !(await Company.exists({ _id: payload.company }))) {
      throw new Error('Valid company is required')
    }
  }

  const numericRules = {
    expectedMeter: [0, Infinity], ratePerMeter: [0, Infinity], deductionPct: [0, 100],
    averageWeightPerMeter: [0, Infinity], yarnShortageEnteredAmount: [0, Infinity],
  }
  for (const [field, [min, max]] of Object.entries(numericRules)) {
    if (!Object.prototype.hasOwnProperty.call(payload, field)) continue
    const n = Number(payload[field])
    if (!Number.isFinite(n) || n < min || n > max) {
      throw new Error(`${field} must be a number between ${min} and ${max === Infinity ? 'infinity' : max}`)
    }
    payload[field] = n
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'sampleImage')) {
    if (!payload.sampleImage) {
      delete payload.sampleImage
    } else {
      const img = String(payload.sampleImage)
      const isDataImage = /^data:image\/(png|jpe?g|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(img)
      if (!isDataImage && !/^https:\/\/[^\s]+$/.test(img)) throw new Error('Sample image must be a PNG/JPEG/WebP/GIF image or an https URL')
      if (img.length > MAX_SAMPLE_IMAGE_CHARS) throw new Error('Sample image is too large')
      payload.sampleImage = await uploadOrderSampleImage(img)
    }
  }
  return payload
}

async function buildNoolWeightsByOrder(orderIds = []) {
  if (!Array.isArray(orderIds) || !orderIds.length) return new Map()

  const ids = orderIds
    .map((id) => {
      try { return new mongoose.Types.ObjectId(id) }
      catch { return null }
    })
    .filter(Boolean)

  if (!ids.length) return new Map()

  const rows = await Nool.aggregate([
    { $match: { order: { $in: ids } } },
    {
      $group: {
        _id: '$order',
        totalYarnWeight: {
          $sum: {
            $cond: [
              { $eq: [{ $ifNull: ['$entryType', 'receipt'] }, 'receipt'] },
              { $ifNull: ['$qty', 0] },
              0,
            ],
          },
        },
        totalReturnWeight: {
          $sum: {
            $cond: [
              { $in: [{ $ifNull: ['$entryType', 'receipt'] }, ['return', 'used']] },
              { $ifNull: ['$qty', 0] },
              0,
            ],
          },
        },
      },
    },
  ])

  const map = new Map()
  for (const row of rows) {
    map.set(String(row._id), {
      totalYarnWeight: Number(Number(row.totalYarnWeight || 0).toFixed(2)),
      totalReturnWeight: Number(Number(row.totalReturnWeight || 0).toFixed(2)),
    })
  }
  return map
}

async function recalcReceived(orderId) {
  const { PaymentAllocation } = require('../models')
  const agg = await PaymentAllocation.aggregate([
    { $match: { order: new mongoose.Types.ObjectId(orderId) } },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ])
  const totalAllocated = Number(agg[0]?.total || 0)
  await Order.findByIdAndUpdate(orderId, { totalReceived: totalAllocated })
}

module.exports = router
module.exports.recalcProduced = recalcProduced
module.exports.recalcReceived = recalcReceived
module.exports.withComputedOrderFields = withComputedOrderFields
module.exports.computeOrderFinancials = computeOrderFinancials
