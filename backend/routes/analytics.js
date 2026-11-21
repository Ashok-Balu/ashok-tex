const router = require('express').Router()
const ah = require('express-async-handler')
const auth = require('../middleware/auth')
const { Order, Production, Expense, Payment, PaymentAllocation, Company, Employee, SalaryRun, SalaryRunEmployee, Rejection, Payroll, DeductionTransfer } = require('../models')
const { getCompanyBalances } = require('../services/companyBalance')

router.use(auth)

router.get('/', ah(async (req, res) => {
  // Optional ?from=YYYY-MM-DD&to=YYYY-MM-DD. Relative windows (today/week/month) anchor at the range end.
  const parseDate = v => {
    if (!v) return null
    const d = new Date(v)
    if (Number.isNaN(d.getTime())) { const err = new Error('Invalid date range'); err.status = 400; throw err }
    return d
  }
  const realNow = new Date()
  const rangeToRaw = parseDate(req.query.to)
  const rangeFromRaw = parseDate(req.query.from)
  const now = rangeToRaw && rangeToRaw < realNow ? new Date(rangeToRaw) : new Date(realNow)
  if (rangeToRaw && rangeToRaw < realNow) now.setHours(23, 59, 59, 999)
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0)
  const todayEnd = new Date(now); todayEnd.setHours(23, 59, 59, 999)
  const periodEnd = todayEnd
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const yearStart = rangeFromRaw ? new Date(rangeFromRaw.getFullYear(), rangeFromRaw.getMonth(), rangeFromRaw.getDate()) : new Date(now.getFullYear(), 0, 1)
  if (yearStart > periodEnd) yearStart.setTime(new Date(now.getFullYear(), now.getMonth(), 1).getTime())
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)
  const inRange = { $gte: yearStart, $lte: periodEnd }
  const inMonth = { $gte: monthStart, $lte: periodEnd }

  // Month buckets covering the range (capped at 24)
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const months = []
  for (let d = new Date(yearStart.getFullYear(), yearStart.getMonth(), 1); d <= periodEnd && months.length < 24; d.setMonth(d.getMonth() + 1)) {
    months.push({ year: d.getFullYear(), month: d.getMonth() + 1 })
  }
  const spansYears = months.length && months[0].year !== months[months.length - 1].year
  months.forEach(m => { m.label = spansYears ? `${monthNames[m.month - 1]} ${String(m.year).slice(2)}` : monthNames[m.month - 1] })
  const monthKey = (y, m) => `${y}-${m}`
  const byYearMonth = rows => new Map(rows.map(r => [monthKey(r._id.year, r._id.month), r]))

  const Nool = require('../models').Nool

  const batch1P = Promise.all([
    Company.countDocuments(),
    Order.countDocuments({ status: { $in: ['open', 'active'] }, archived: { $ne: true }, deletedAt: null }),
    Order.countDocuments({ status: { $in: ['production_complete', 'completed'] }, archived: { $ne: true }, deletedAt: null }),
    Employee.countDocuments(),
    Employee.countDocuments({ status: 'active' }),
    Production.aggregate([
      { $match: { date: { $gte: todayStart, $lte: todayEnd } } },
      { $group: { _id: null, total: { $sum: '$meter' }, count: { $sum: 1 } } },
    ]),
    Production.aggregate([
      { $match: { date: inMonth } },
      { $group: { _id: null, total: { $sum: '$meter' }, count: { $sum: 1 } } },
    ]),
    Production.aggregate([
      { $match: { date: inRange } },
      { $group: { _id: null, total: { $sum: '$meter' }, count: { $sum: 1 } } },
    ]),
    Production.aggregate([
      { $match: { date: { $gte: lastMonthStart, $lte: lastMonthEnd } } },
      { $group: { _id: null, total: { $sum: '$meter' } } },
    ]),
    Payment.aggregate([
      { $match: { date: inMonth, transactionType: { $ne: 'deduction' } } },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]),
    Payment.aggregate([
      { $match: { date: inRange, transactionType: { $ne: 'deduction' } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Payment.aggregate([
      { $match: { date: { $gte: lastMonthStart, $lte: lastMonthEnd }, transactionType: { $ne: 'deduction' } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Payment.aggregate([
      { $match: { date: inMonth, transactionType: 'deduction' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Production.aggregate([
      { $match: { date: inRange } },
      { $group: { _id: { year: { $year: '$date' }, month: { $month: '$date' } }, total: { $sum: '$meter' }, entries: { $sum: 1 } } },
    ]),
    Payment.aggregate([
      { $match: { date: inRange, transactionType: { $ne: 'deduction' } } },
      { $group: { _id: { year: { $year: '$date' }, month: { $month: '$date' } }, total: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]),
    Production.aggregate([
      { $match: { date: inRange } },
      { $group: { _id: '$order', total: { $sum: '$meter' } } },
      { $sort: { total: -1 } },
      { $limit: 10 },
      { $lookup: { from: 'orders', localField: '_id', foreignField: '_id', as: 'order' } },
      { $unwind: { path: '$order', preserveNullAndEmptyArrays: true } },
    ]),
    Order.aggregate([
      { $match: { archived: { $ne: true }, $or: [{ deletedAt: null }, { status: 'closed', deletedAt: { $ne: null } }] } },
      { $group: {
        _id: '$company',
        orders: { $sum: 1 },
        activeOrders: { $sum: { $cond: [{ $in: ['$status', ['open', 'active']] }, 1, 0] } },
        totalExpected: { $sum: { $ifNull: ['$expectedMeter', 0] } },
        totalProduced: { $sum: { $ifNull: ['$producedMeter', 0] } },
        totalRejected: { $sum: { $ifNull: ['$rejectedMeter', 0] } },
      }},
      { $lookup: { from: 'companies', localField: '_id', foreignField: '_id', as: 'company' } },
      { $unwind: { path: '$company', preserveNullAndEmptyArrays: true } },
      { $sort: { totalProduced: -1 } },
    ]),
    Rejection.aggregate([
      { $match: { date: inRange } },
      { $group: { _id: null, totalQty: { $sum: '$rejectedQty' }, count: { $sum: 1 } } },
    ]),
    Rejection.aggregate([
      { $match: { date: inMonth } },
      { $group: { _id: null, totalQty: { $sum: '$rejectedQty' }, count: { $sum: 1 } } },
    ]),
    SalaryRunEmployee.aggregate([
      { $lookup: { from: 'salaryruns', localField: 'salaryRunId', foreignField: '_id', as: 'run' } },
      { $unwind: '$run' },
      { $group: {
        _id: { year: '$run.year', month: '$run.month' },
        totalGross: { $sum: { $ifNull: ['$grossWages', 0] } },
        totalDeductions: { $sum: { $ifNull: ['$deductionAmount', 0] } },
        totalNet: { $sum: { $ifNull: ['$finalSalary', 0] } },
        totalMarket: { $sum: { $ifNull: ['$market', 0] } },
        totalAdvance: { $sum: { $ifNull: ['$advance', 0] } },
        employeeIds: { $addToSet: '$employeeId' },
        runIds: { $addToSet: '$salaryRunId' },
      } },
      { $project: {
        totalGross: 1,
        totalDeductions: 1,
        totalNet: 1,
        totalMarket: 1,
        totalAdvance: 1,
        employeeCount: { $size: '$employeeIds' },
        runs: { $size: '$runIds' },
      } },
      { $sort: { '_id.year': -1, '_id.month': -1 } },
    ]),
    Payment.aggregate([
      { $match: { date: inRange, transactionType: { $ne: 'deduction' } } },
      { $group: { _id: '$mode', total: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]),
    Production.aggregate([
      { $match: { date: inMonth } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } }, total: { $sum: '$meter' }, entries: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    // Same live-order rule as dashboard: soft-deleted orders excluded, except closed ones kept for history
    Order.find({ archived: { $ne: true }, $or: [{ deletedAt: null }, { status: 'closed', deletedAt: { $ne: null } }] })
      .select('orderName company expectedMeter producedMeter rejectedMeter acceptedMeter ratePerMeter deductionPct status createdAt')
      .populate('company', 'name')
      .lean(),
    // Nool monthly breakdown for the selected range
    Nool.aggregate([
      { $match: { date: inRange } },
      { $group: {
        _id: { year: { $year: '$date' }, month: { $month: '$date' }, entryType: '$entryType' },
        total: { $sum: '$qty' },
      }},
    ]),
    // Rejections grouped by reason (loss valued at the order's rate)
    Rejection.aggregate([
      { $match: { date: inRange } },
      { $lookup: { from: 'orders', localField: 'order', foreignField: '_id', as: 'orderDoc' } },
      { $unwind: { path: '$orderDoc', preserveNullAndEmptyArrays: true } },
      { $addFields: { reasonKey: { $trim: { input: { $ifNull: ['$reason', ''] } } } } },
      { $group: {
        _id: { $cond: [{ $eq: ['$reasonKey', ''] }, 'Unspecified', '$reasonKey'] },
        qty: { $sum: '$rejectedQty' },
        count: { $sum: 1 },
        loss: { $sum: { $multiply: ['$rejectedQty', { $ifNull: ['$orderDoc.ratePerMeter', 0] }] } },
      }},
      { $sort: { qty: -1 } },
    ]),
  ])

  // Additional aggregations — shift breakdown, weekly comparison
  const weekStart = new Date(now); weekStart.setDate(now.getDate() - now.getDay()); weekStart.setHours(0, 0, 0, 0)
  const lastWeekStart = new Date(weekStart); lastWeekStart.setDate(lastWeekStart.getDate() - 7)
  const lastWeekEnd = new Date(weekStart); lastWeekEnd.setMilliseconds(-1)

  const batch2P = Promise.all([
    Production.aggregate([
      { $match: { date: inMonth } },
      { $group: { _id: '$shift', total: { $sum: '$meter' }, count: { $sum: 1 } } },
    ]),
    Production.aggregate([
      { $match: { date: { $gte: weekStart, $lte: periodEnd } } },
      { $group: { _id: null, total: { $sum: '$meter' } } },
    ]),
    Production.aggregate([
      { $match: { date: { $gte: lastWeekStart, $lte: lastWeekEnd } } },
      { $group: { _id: null, total: { $sum: '$meter' } } },
    ]),
    Order.aggregate([
      { $match: { archived: { $ne: true }, $or: [{ deletedAt: null }, { status: 'closed', deletedAt: { $ne: null } }] } },
      { $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalExpected: { $sum: { $ifNull: ['$expectedMeter', 0] } },
        totalProduced: { $sum: { $ifNull: ['$producedMeter', 0] } },
      }},
    ]),
    Nool.aggregate([
      { $group: {
        _id: '$entryType',
        total: { $sum: '$qty' },
        count: { $sum: 1 },
      }},
    ]),
    Employee.find({ status: 'active' }).select('name currentDefaultDailyWage dailyWage deductionType deductionValue').lean(),
    SalaryRunEmployee.aggregate([
      { $lookup: { from: 'salaryruns', localField: 'salaryRunId', foreignField: '_id', as: 'run' } },
      { $unwind: '$run' },
      { $sort: { 'run.year': -1, 'run.month': -1, periodEndDate: -1, createdAt: -1 } },
      { $group: {
        _id: '$employeeId',
        name: { $first: '$employeeName' },
        avgSalary: { $avg: { $ifNull: ['$finalSalary', 0] } },
        totalPaid: { $sum: { $ifNull: ['$finalSalary', 0] } },
        runCount: { $sum: 1 },
        lastSalary: { $first: { $ifNull: ['$finalSalary', 0] } },
      }},
      { $sort: { totalPaid: -1 } },
    ]),
    // Today's payments
    Payment.aggregate([
      { $match: { date: { $gte: todayStart, $lte: todayEnd }, transactionType: { $ne: 'deduction' } } },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]),
    // Last payment date per company (for aging analysis)
    Payment.aggregate([
      { $match: { transactionType: { $ne: 'deduction' } } },
      { $sort: { date: -1 } },
      { $group: { _id: '$company', lastPaymentDate: { $first: '$date' }, lastAmount: { $first: '$amount' }, totalPayments: { $sum: 1 } } },
      { $lookup: { from: 'companies', localField: '_id', foreignField: '_id', as: 'company' } },
      { $unwind: { path: '$company', preserveNullAndEmptyArrays: true } },
    ]),
    // Last month payroll total
    SalaryRunEmployee.aggregate([
      { $lookup: { from: 'salaryruns', localField: 'salaryRunId', foreignField: '_id', as: 'run' } },
      { $unwind: '$run' },
      { $match: { 'run.year': lastMonthStart.getFullYear(), 'run.month': lastMonthStart.getMonth() + 1 } },
      { $group: { _id: null, totalNet: { $sum: { $ifNull: ['$finalSalary', 0] } }, totalGross: { $sum: { $ifNull: ['$grossWages', 0] } }, employees: { $addToSet: '$employeeId' } } },
      { $project: { totalNet: 1, totalGross: 1, employeeCount: { $size: '$employees' } } },
    ]),
    // This month payroll total
    SalaryRunEmployee.aggregate([
      { $lookup: { from: 'salaryruns', localField: 'salaryRunId', foreignField: '_id', as: 'run' } },
      { $unwind: '$run' },
      { $match: { 'run.year': now.getFullYear(), 'run.month': now.getMonth() + 1 } },
      { $group: { _id: null, totalNet: { $sum: { $ifNull: ['$finalSalary', 0] } }, totalGross: { $sum: { $ifNull: ['$grossWages', 0] } }, employees: { $addToSet: '$employeeId' } } },
      { $project: { totalNet: 1, totalGross: 1, employeeCount: { $size: '$employees' } } },
    ]),
  ])

  // Both batches were started together; wait for them as a pair
  const [batch1Result, batch2Result] = await Promise.all([batch1P, batch2P])
  const [
    totalCompanies,
    activeOrders,
    completedOrders,
    totalEmployees,
    activeEmployees,
    todayProductionAgg,
    monthProductionAgg,
    yearProductionAgg,
    lastMonthProductionAgg,
    monthReceiptAgg,
    yearReceiptAgg,
    lastMonthReceiptAgg,
    monthDeductionAgg,
    productionByMonthAgg,
    paymentByMonthAgg,
    topOrdersByProduction,
    companyWiseAgg,
    rejectionAgg,
    monthRejectionAgg,
    payrollMonthlyAgg,
    paymentModeAgg,
    dailyProductionAgg,
    allOrders,
    noolMonthlyAgg,
    rejectionByReasonAgg,
  ] = batch1Result
  const [shiftBreakdownAgg, thisWeekProdAgg, lastWeekProdAgg, ordersByStatusAgg, noolBalanceAgg, employeeList, employeeSalaryAgg, todayPaymentsAgg, lastPaymentByCompanyAgg, lastMonthPayrollAgg, thisMonthPayrollAgg] = batch2Result

  const totalExpectedMeter = allOrders.reduce((s, o) => s + Number(o.expectedMeter || 0), 0)
  const totalProducedMeter = allOrders.reduce((s, o) => s + Number(o.producedMeter || 0), 0)
  const totalRejectedMeter = allOrders.reduce((s, o) => s + Number(o.rejectedMeter || 0), 0)
  const totalAcceptedMeter = allOrders.reduce((s, o) => {
    const accepted = Number(o.acceptedMeter ?? Math.max(0, Number(o.producedMeter || 0) - Number(o.rejectedMeter || 0)))
    return s + accepted
  }, 0)

  let totalPayableAmount = 0
  let totalProducedValue = 0
  let totalDeductionAmount = 0
  let totalRejectionLoss = 0

  allOrders.forEach(o => {
    const accepted = Number(o.acceptedMeter ?? Math.max(0, Number(o.producedMeter || 0) - Number(o.rejectedMeter || 0)))
    const value = accepted * Number(o.ratePerMeter || 0)
    const deduction = value * (Number(o.deductionPct || 0) / 100)
    const rejLoss = Number(o.rejectedMeter || 0) * Number(o.ratePerMeter || 0)
    totalProducedValue += value
    totalDeductionAmount += deduction
    totalPayableAmount += (value - deduction)
    totalRejectionLoss += rejLoss
  })

  // Use the same pending calculation as dashboard — per-company with allocation logic
  const [totalReceiptsAgg, allocatedLiveAgg, allocatedArchivedAgg, deductionCollectedAgg, allPayments, allocAllAgg, expenseRows, recentPaymentRows] = await Promise.all([
    Payment.aggregate([{ $match: { transactionType: { $ne: 'deduction' } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
    PaymentAllocation.aggregate([
      { $lookup: { from: 'orders', localField: 'order', foreignField: '_id', as: 'orderDoc' } },
      { $unwind: '$orderDoc' },
      { $match: { 'orderDoc.archived': { $ne: true } } },
      { $group: { _id: '$company', totalPaid: { $sum: '$amount' } } },
    ]),
    // Archived orders take their closed (allocated) amount out of the live figures
    Order.aggregate([
      { $match: { archived: true, status: 'closed', closedAmount: { $gt: 0 } } },
      { $group: { _id: '$company', totalPaid: { $sum: '$closedAmount' } } },
    ]),
    Payment.aggregate([{ $match: { transactionType: 'deduction' } }, { $group: { _id: '$company', total: { $sum: '$amount' } } }]),
    Payment.aggregate([
      { $match: { transactionType: { $ne: 'deduction' } } },
      { $group: { _id: '$company', total: { $sum: '$amount' } } },
    ]),
    PaymentAllocation.aggregate([{ $group: { _id: '$company', total: { $sum: '$amount' } } }]),
    // Expenses grouped by IST year/month/type
    Expense.aggregate([
      { $group: {
        _id: {
          y: { $year: { date: '$date', timezone: 'Asia/Kolkata' } },
          m: { $month: { date: '$date', timezone: 'Asia/Kolkata' } },
          type: '$type',
        },
        total: { $sum: '$amount' },
      } },
    ]),
    Payment.find({ transactionType: { $ne: 'deduction' }, date: { $lte: periodEnd } })
      .sort({ date: -1 }).limit(15).populate('company', 'name').lean(),
  ])

  const paymentSurplusAgg = await DeductionTransfer.aggregate([{ $match: { type: 'payment_surplus' } }, { $group: { _id: null, total: { $sum: '$amount' } } }])
  const totalPaidAmount = Math.max(0, (totalReceiptsAgg[0]?.total || 0) - (paymentSurplusAgg[0]?.total || 0))

  // Build per-company pending (same logic as dashboard)
  const liveAllocByCompany = new Map(allocatedLiveAgg.map(r => [String(r._id), r.totalPaid || 0]))
  const archivedAllocByCompany = new Map(allocatedArchivedAgg.map(r => [String(r._id), r.totalPaid || 0]))
  const receiptByCompany = new Map()
  allPayments.forEach(r => receiptByCompany.set(String(r._id), r.total || 0))
  const totalAllocAll = new Map()
  allocAllAgg.forEach(r => totalAllocAll.set(String(r._id), r.total || 0))

  // Pending = live (not closed) payable minus money on hand, same rule as dashboard
  const companyPayableMap = new Map()
  const livePayableMap = new Map()
  allOrders.forEach(o => {
    const companyId = String(o.company?._id || o.company || '')
    const accepted = Number(o.acceptedMeter ?? Math.max(0, Number(o.producedMeter || 0) - Number(o.rejectedMeter || 0)))
    const value = accepted * Number(o.ratePerMeter || 0)
    const deduction = value * (Number(o.deductionPct || 0) / 100)
    const payable = value - deduction
    companyPayableMap.set(companyId, (companyPayableMap.get(companyId) || 0) + payable)
    if (o.status !== 'closed') livePayableMap.set(companyId, (livePayableMap.get(companyId) || 0) + payable)
  })

  const companyIdsWithOrders = [...companyPayableMap.keys()].filter(Boolean)
  const balanceByCompany = await getCompanyBalances(companyIdsWithOrders)
  const companyPendingMap = new Map()
  let totalPendingAmount = 0
  for (const companyId of companyIdsWithOrders) {
    const balance = Math.max(0, balanceByCompany.get(companyId)?.balance || 0)
    const pending = Math.max(0, (livePayableMap.get(companyId) || 0) - balance)
    companyPendingMap.set(companyId, pending)
    totalPendingAmount += pending
  }
  const totalArchivedAllocated = [...archivedAllocByCompany.values()].reduce((s, v) => s + v, 0)
  const totalCollectedLive = Math.max(0, totalPaidAmount - totalArchivedAllocated)
  // Closed orders count as allocated until archived
  for (const [companyId, bal] of balanceByCompany) {
    totalAllocAll.set(companyId, Math.max(0, bal.totalClosed - (archivedAllocByCompany.get(companyId) || 0)))
  }
  for (const [companyId, archived] of archivedAllocByCompany) {
    receiptByCompany.set(companyId, Math.max(0, (receiptByCompany.get(companyId) || 0) - archived))
  }
  const totalAllocatedLive = [...totalAllocAll.values()].reduce((s, v) => s + v, 0)

  // Avg rate per meter
  const avgRatePerMeter = totalAcceptedMeter > 0 ? Math.round((totalProducedValue / totalAcceptedMeter) * 100) / 100 : 0
  const totalDeductionCollected = deductionCollectedAgg.reduce((s, r) => s + (r.total || 0), 0)
  const deductionOutstanding = Math.max(0, totalDeductionAmount - totalDeductionCollected)

  const prodByMonth = byYearMonth(productionByMonthAgg)
  const payByMonth = byYearMonth(paymentByMonthAgg)

  const productionTrend = months.map(m => {
    const row = prodByMonth.get(monthKey(m.year, m.month))
    return { month: m.label, year: m.year, monthNum: m.month, value: row?.total || 0, entries: row?.entries || 0 }
  })

  const paymentTrend = months.map(m => {
    const row = payByMonth.get(monthKey(m.year, m.month))
    return { month: m.label, year: m.year, monthNum: m.month, value: row?.total || 0, count: row?.count || 0 }
  })

  const monthProd = monthProductionAgg[0]?.total || 0
  const lastMonthProd = lastMonthProductionAgg[0]?.total || 0
  const productionGrowth = lastMonthProd > 0 ? Math.round(((monthProd - lastMonthProd) / lastMonthProd) * 100) : 0

  const monthReceipt = monthReceiptAgg[0]?.total || 0
  const lastMonthReceipt = lastMonthReceiptAgg[0]?.total || 0
  const receiptGrowth = lastMonthReceipt > 0 ? Math.round(((monthReceipt - lastMonthReceipt) / lastMonthReceipt) * 100) : 0

  // --- Computed additions ---

  // Production: highDay, lowDay, avgDaily, efficiency
  const dailyProdEntries = dailyProductionAgg.map(d => ({ date: d._id, total: d.total }))
  let highDay = { date: null, value: 0 }
  let lowDay = { date: null, value: Infinity }
  for (const d of dailyProdEntries) {
    if (d.total > highDay.value) highDay = { date: d.date, value: d.total }
    if (d.total > 0 && d.total < lowDay.value) lowDay = { date: d.date, value: d.total }
  }
  if (lowDay.value === Infinity) lowDay = { date: null, value: 0 }
  const daysElapsedInMonth = Math.max(1, now.getDate())
  const avgDailyProduction = Math.round(monthProd / daysElapsedInMonth)
  const productionEfficiency = totalProducedMeter > 0 ? Math.round((totalAcceptedMeter / totalProducedMeter) * 1000) / 10 : 100

  // Nool monthly breakdown
  const noolMonthly = months.map(m => {
    const pick = type => noolMonthlyAgg.find(r => r._id.year === m.year && r._id.month === m.month && r._id.entryType === type)?.total || 0
    return { month: m.label, year: m.year, monthNum: m.month, received: pick('receipt'), used: pick('used'), returned: pick('return') }
  })

  // Nool balance enhancements
  const noolReceived = noolBalanceAgg.find(n => n._id === 'receipt')?.total || 0
  const noolUsed = noolBalanceAgg.find(n => n._id === 'used')?.total || 0
  const noolReturned = noolBalanceAgg.find(n => n._id === 'return')?.total || 0
  const noolCurrentBalance = noolReceived - noolUsed - noolReturned
  const daysSinceYearStart = Math.max(1, Math.floor((now - yearStart) / 86400000))
  // Consumption rate uses usage inside the same period as the day count
  const noolPeriodUsed = noolMonthly.reduce((s, m) => s + m.used, 0)
  const noolConsumptionRate = noolPeriodUsed > 0 ? Math.round((noolPeriodUsed / daysSinceYearStart) * 100) / 100 : 0
  const noolDaysRemaining = noolConsumptionRate > 0 ? Math.round(noolCurrentBalance / noolConsumptionRate) : null

  // Rejections by company (from allOrders)
  const rejByCompanyMap = new Map()
  allOrders.forEach(o => {
    const companyName = o.company?.name || 'Unknown'
    const rejected = Number(o.rejectedMeter || 0)
    const loss = rejected * Number(o.ratePerMeter || 0)
    if (rejected > 0) {
      const entry = rejByCompanyMap.get(companyName) || { companyName, rejected: 0, lossAmount: 0 }
      entry.rejected += rejected
      entry.lossAmount += loss
      rejByCompanyMap.set(companyName, entry)
    }
  })
  const rejectionsByCompany = Array.from(rejByCompanyMap.values())
    .sort((a, b) => b.lossAmount - a.lossAmount)
    .slice(0, 10)
    .map(r => ({ ...r, rejected: Math.round(r.rejected), lossAmount: Math.round(r.lossAmount) }))

  // Production by company (from allOrders)
  const prodByCompanyMap = new Map()
  allOrders.forEach(o => {
    const companyName = o.company?.name || 'Unknown'
    const entry = prodByCompanyMap.get(companyName) || { companyName, produced: 0, expected: 0, accepted: 0 }
    entry.produced += Number(o.producedMeter || 0)
    entry.expected += Number(o.expectedMeter || 0)
    entry.accepted += Number(o.acceptedMeter ?? Math.max(0, Number(o.producedMeter || 0) - Number(o.rejectedMeter || 0)))
    prodByCompanyMap.set(companyName, entry)
  })
  const productionByCompany = Array.from(prodByCompanyMap.values())
    .sort((a, b) => b.produced - a.produced)
    .map(r => ({ ...r, produced: Math.round(r.produced), expected: Math.round(r.expected), accepted: Math.round(r.accepted) }))

  const payrollRuns = payrollMonthlyAgg.map(r => ({
    month: r._id.month,
    year: r._id.year,
    totalGross: Math.round(r.totalGross || 0),
    totalNet: Math.round(r.totalNet || 0),
    totalDeductions: Math.round(r.totalDeductions || 0),
    totalMarket: Math.round(r.totalMarket || 0),
    totalAdvance: Math.round(r.totalAdvance || 0),
    employeeCount: r.employeeCount || 0,
    runs: r.runs || 0,
  }))

  const payrollTrend = payrollRuns
    .slice(0, 12)
    .map(r => ({
      period: `${monthNames[(r.month || 1) - 1]} ${r.year}`,
      gross: r.totalGross,
      net: r.totalNet,
      employees: r.employeeCount,
    }))
    .reverse()

  const employeeSalaryMap = new Map(employeeSalaryAgg.map(e => [String(e._id), e]))
  const workforceEmployees = employeeList
    .map(employee => {
      const salary = employeeSalaryMap.get(String(employee._id))
      const dailyWage = Number(employee.currentDefaultDailyWage || employee.dailyWage || 0)
      return {
        name: employee.name,
        dailyWage,
        avgSalary: Math.round(salary?.avgSalary || 0),
        totalPaid: Math.round(salary?.totalPaid || 0),
        lastSalary: Math.round(salary?.lastSalary || 0),
        runCount: salary?.runCount || 0,
      }
    })
    .sort((a, b) => b.dailyWage - a.dailyWage || a.name.localeCompare(b.name))

  // === NEW: Today's Activity ===
  const todayPayments = todayPaymentsAgg[0] || { total: 0, count: 0 }
  const todayProduction = todayProductionAgg[0] || { total: 0, count: 0 }

  // Expenses grouped by IST year/month/type (fetched with the earlier batch)
  const sumExpenses = (pred) => expenseRows.filter(pred).reduce((s, r) => s + (r.total || 0), 0)
  const curY = now.getFullYear()
  const curM = now.getMonth() + 1
  const lastMonthDate = new Date(curY, now.getMonth() - 1, 1)
  const monthExpense = sumExpenses(r => r._id.y === curY && r._id.m === curM)
  const lastMonthExpense = sumExpenses(r => r._id.y === lastMonthDate.getFullYear() && r._id.m === lastMonthDate.getMonth() + 1)
  const yearExpense = sumExpenses(r => months.some(m => m.year === r._id.y && m.month === r._id.m))
  const allTimeExpense = sumExpenses(() => true)
  const expenseByType = Object.values(expenseRows.filter(r => r._id.y === curY).reduce((acc, r) => {
    const t = r._id.type
    acc[t] = acc[t] || { type: t, total: 0 }
    acc[t].total += r.total || 0
    return acc
  }, {})).sort((a, b) => b.total - a.total).map(e => ({ type: e.type, total: Math.round(e.total) }))
  const expenseMonthly = months.map(m => ({ month: m.label, total: Math.round(sumExpenses(r => r._id.y === m.year && r._id.m === m.month)) }))

  // === NEW: Profitability ===
  const totalPayrollCost = payrollRuns.reduce((s, r) => s + (r.totalNet || 0), 0)
  const grossProfit = totalPaidAmount - totalPayrollCost
  const grossMarginPct = totalPaidAmount > 0 ? Math.round((grossProfit / totalPaidAmount) * 100) : 0
  const monthPayroll = thisMonthPayrollAgg[0]?.totalNet || 0
  const lastMonthPayroll = lastMonthPayrollAgg[0]?.totalNet || 0
  const netProfit = grossProfit - allTimeExpense
  const netMarginPct = totalPaidAmount > 0 ? Math.round((netProfit / totalPaidAmount) * 100) : 0
  const monthProfit = monthReceipt - monthPayroll - monthExpense
  const lastMonthProfit = lastMonthReceipt - lastMonthPayroll - lastMonthExpense

  // === NEW: Payment Aging ===
  const paymentAging = lastPaymentByCompanyAgg
    .filter(c => c.company)
    .map(c => {
      const companyId = String(c._id)
      const payable = companyPayableMap.get(companyId) || 0
      const pending = companyPendingMap.get(companyId) || 0
      const daysSinceLastPayment = Math.floor((now - new Date(c.lastPaymentDate)) / 86400000)
      return {
        companyName: c.company?.name || 'Unknown',
        lastPaymentDate: c.lastPaymentDate,
        lastAmount: c.lastAmount,
        daysSinceLastPayment,
        totalPayments: c.totalPayments,
        pendingAmount: Math.round(pending),
        payable: Math.round(payable),
      }
    })
    .filter(c => c.payable > 0)
    .sort((a, b) => b.daysSinceLastPayment - a.daysSinceLastPayment)

  // === NEW: Month-over-Month Comparison ===
  const monthCollectionPct = totalPayableAmount > 0 ? Math.round((monthReceipt / totalPayableAmount) * 100) : 0
  const lastMonthCollectionPct = totalPayableAmount > 0 ? Math.round((lastMonthReceipt / totalPayableAmount) * 100) : 0
  const monthAvgDaily = daysElapsedInMonth > 0 ? Math.round(monthProd / daysElapsedInMonth) : 0
  const lastMonthDays = new Date(now.getFullYear(), now.getMonth(), 0).getDate()
  const lastMonthAvgDaily = lastMonthDays > 0 ? Math.round(lastMonthProd / lastMonthDays) : 0
  const monthNoolUsed = noolMonthly.find(m => m.year === now.getFullYear() && m.monthNum === now.getMonth() + 1)?.used || 0
  const lastMonthNoolUsed = noolMonthly.find(m => m.year === lastMonthStart.getFullYear() && m.monthNum === lastMonthStart.getMonth() + 1)?.used || 0
  const monthPaymentCount = monthReceiptAgg[0]?.count || 0
  const monthProductionEntries = monthProductionAgg[0]?.count || 0

  const monthComparison = {
    production: { current: monthProd, previous: lastMonthProd, change: productionGrowth, unit: 'm' },
    avgDailyProd: { current: monthAvgDaily, previous: lastMonthAvgDaily, change: lastMonthAvgDaily > 0 ? Math.round(((monthAvgDaily - lastMonthAvgDaily) / lastMonthAvgDaily) * 100) : 0, unit: 'm/day' },
    receipts: { current: monthReceipt, previous: lastMonthReceipt, change: receiptGrowth, unit: '₹' },
    paymentCount: { current: monthPaymentCount, previous: 0, unit: 'txns' },
    rejections: { current: monthRejectionAgg[0]?.totalQty || 0, previous: 0, unit: 'm' },
    payroll: { current: monthPayroll, previous: lastMonthPayroll, change: lastMonthPayroll > 0 ? Math.round(((monthPayroll - lastMonthPayroll) / lastMonthPayroll) * 100) : 0, unit: '₹' },
    yarnUsed: { current: monthNoolUsed, previous: lastMonthNoolUsed, change: lastMonthNoolUsed > 0 ? Math.round(((monthNoolUsed - lastMonthNoolUsed) / lastMonthNoolUsed) * 100) : 0, unit: 'kg' },
    productionEntries: { current: monthProductionEntries, previous: 0, unit: 'entries' },
    profit: { current: monthProfit, previous: lastMonthProfit, change: lastMonthProfit !== 0 ? Math.round(((monthProfit - lastMonthProfit) / Math.abs(lastMonthProfit)) * 100) : 0, unit: '₹' },
  }

  // === NEW: Key Business Insights ===
  const insights = []
  const companyFinancialsArr = Array.from(companyPayableMap.entries()).map(([companyId, payable]) => {
    const receipt = receiptByCompany.get(companyId) || 0
    const company = allOrders.find(o => String(o.company?._id || o.company) === companyId)
    return { companyId, companyName: company?.company?.name || 'Unknown', payable, receipt, collPct: payable > 0 ? Math.round((receipt / payable) * 100) : 0 }
  }).filter(c => c.payable > 0)

  const lowCollCompanies = companyFinancialsArr.filter(c => c.collPct < 50).sort((a, b) => a.collPct - b.collPct)
  if (lowCollCompanies.length > 0) insights.push({
    type: 'warning', icon: 'mdi-alert',
    text: `${lowCollCompanies.length} ${lowCollCompanies.length === 1 ? 'company has' : 'companies have'} collection below 50%`,
    category: 'finance',
    details: lowCollCompanies.map(c => ({ name: c.companyName, value: `${c.collPct}% collected`, subtext: `Pending: ₹${Math.round(c.payable - c.receipt).toLocaleString('en-IN')}` }))
  })

  if (noolDaysRemaining !== null && noolDaysRemaining <= 7) insights.push({ type: 'critical', icon: 'mdi-alert-octagon', text: `Yarn stock will run out in ${noolDaysRemaining} days`, category: 'inventory', details: [{ name: 'Current Stock', value: `${Math.round(noolCurrentBalance)} kg` }, { name: 'Daily Usage', value: `${Math.round(noolConsumptionRate)} kg/day` }] })
  else if (noolDaysRemaining !== null && noolDaysRemaining <= 15) insights.push({ type: 'warning', icon: 'mdi-palette-swatch', text: `Yarn stock running low — ${noolDaysRemaining} days remaining`, category: 'inventory', details: [{ name: 'Current Stock', value: `${Math.round(noolCurrentBalance)} kg` }, { name: 'Daily Usage', value: `${Math.round(noolConsumptionRate)} kg/day` }] })

  const progressPct = totalExpectedMeter > 0 ? Math.round((totalProducedMeter / totalExpectedMeter) * 100) : 0
  if (progressPct < 50) {
    const behindCompanies = companyWiseAgg.filter(c => c.totalExpected > 0 && (c.totalProduced / c.totalExpected) < 0.4).slice(0, 5)
    insights.push({ type: 'warning', icon: 'mdi-factory', text: `Production at ${progressPct}% of target — behind schedule`, category: 'production',
      details: behindCompanies.map(c => ({ name: c.company?.name || 'Unknown', value: `${c.totalExpected > 0 ? Math.round((c.totalProduced / c.totalExpected) * 100) : 0}% done`, subtext: `${Math.round(c.totalProduced)} / ${Math.round(c.totalExpected)} m` }))
    })
  }

  if (productionGrowth <= -20) insights.push({ type: 'critical', icon: 'mdi-trending-down', text: `Production dropped ${Math.abs(productionGrowth)}% vs last month`, category: 'production', details: [{ name: 'This Month', value: `${Math.round(monthProd).toLocaleString('en-IN')} m` }, { name: 'Last Month', value: `${Math.round(lastMonthProd).toLocaleString('en-IN')} m` }] })

  const rejectionRate = totalProducedMeter > 0 ? Math.round((totalRejectedMeter / totalProducedMeter) * 1000) / 10 : 0
  if (rejectionRate > 5) {
    insights.push({ type: 'critical', icon: 'mdi-close-circle', text: `Rejection rate at ${rejectionRate}% — exceeds 5% threshold`, category: 'quality',
      details: rejectionsByCompany.slice(0, 5).map(r => ({ name: r.companyName, value: `${r.rejected} m rejected`, subtext: `Loss: ₹${r.lossAmount.toLocaleString('en-IN')}` }))
    })
  } else if (rejectionRate > 3) {
    insights.push({ type: 'warning', icon: 'mdi-alert', text: `Rejection rate at ${rejectionRate}% — approaching critical level`, category: 'quality',
      details: rejectionsByCompany.slice(0, 5).map(r => ({ name: r.companyName, value: `${r.rejected} m rejected`, subtext: `Loss: ₹${r.lossAmount.toLocaleString('en-IN')}` }))
    })
  }

  if (totalPendingAmount > totalPayableAmount * 0.5) {
    const topPendingCompanies = companyFinancialsArr.filter(c => c.payable - c.receipt > 0).sort((a, b) => (b.payable - b.receipt) - (a.payable - a.receipt)).slice(0, 5)
    insights.push({ type: 'warning', icon: 'mdi-cash-clock', text: `${Math.round((totalPendingAmount / totalPayableAmount) * 100)}% of payable amount is still pending`, category: 'finance',
      details: topPendingCompanies.map(c => ({ name: c.companyName, value: `₹${Math.round(c.payable - c.receipt).toLocaleString('en-IN')} pending`, subtext: `${c.collPct}% collected` }))
    })
  }

  const overdueCompanyList = paymentAging.filter(c => c.daysSinceLastPayment > 30 && c.pendingAmount > 0)
  if (overdueCompanyList.length > 0) insights.push({
    type: 'warning', icon: 'mdi-clock-alert',
    text: `${overdueCompanyList.length} ${overdueCompanyList.length === 1 ? 'company' : 'companies'} with no payment in 30+ days`,
    category: 'finance',
    details: overdueCompanyList.slice(0, 5).map(c => ({ name: c.companyName, value: `${c.daysSinceLastPayment} days ago`, subtext: `Pending: ₹${c.pendingAmount.toLocaleString('en-IN')}` }))
  })

  if (grossMarginPct >= 30) insights.push({ type: 'success', icon: 'mdi-check-decagram', text: `Healthy profit margin at ${grossMarginPct}%`, category: 'finance' })
  if (productionGrowth >= 10) insights.push({ type: 'success', icon: 'mdi-trending-up', text: `Production grew ${productionGrowth}% vs last month`, category: 'production' })
  if (receiptGrowth >= 10) insights.push({ type: 'success', icon: 'mdi-cash-plus', text: `Collections up ${receiptGrowth}% vs last month`, category: 'finance' })

  res.json({
    overview: {
      totalCompanies,
      activeOrders,
      completedOrders,
      totalOrders: activeOrders + completedOrders,
      totalEmployees,
      activeEmployees,
    },
    production: {
      today: todayProductionAgg[0]?.total || 0,
      todayEntries: todayProductionAgg[0]?.count || 0,
      thisMonth: monthProd,
      thisMonthEntries: monthProductionAgg[0]?.count || 0,
      thisYear: yearProductionAgg[0]?.total || 0,
      lastMonth: lastMonthProd,
      growth: productionGrowth,
      totalExpected: totalExpectedMeter,
      totalProduced: totalProducedMeter,
      totalRejected: totalRejectedMeter,
      totalAccepted: totalAcceptedMeter,
      progressPct: totalExpectedMeter > 0 ? Math.round((totalProducedMeter / totalExpectedMeter) * 100) : 0,
      rejectionRate: totalProducedMeter > 0 ? Math.round((totalRejectedMeter / totalProducedMeter) * 1000) / 10 : 0,
      highDay,
      lowDay,
      avgDaily: avgDailyProduction,
      efficiency: productionEfficiency,
    },
    financial: {
      totalProducedValue,
      totalDeductionAmount,
      totalPayableAmount,
      totalPaidAmount: totalCollectedLive,
      totalPendingAmount,
      totalRejectionLoss,
      totalAllocated: totalAllocatedLive,
      totalUnallocated: Math.max(0, totalCollectedLive - totalAllocatedLive),
      collectionPct: totalPayableAmount > 0 ? Math.round((totalCollectedLive / totalPayableAmount) * 1000) / 10 : 0,
      avgRatePerMeter,
      totalDeductionCollected,
      deductionOutstanding,
    },
    receipts: {
      thisMonth: monthReceipt,
      thisMonthCount: monthReceiptAgg[0]?.count || 0,
      thisYear: yearReceiptAgg[0]?.total || 0,
      lastMonth: lastMonthReceipt,
      growth: receiptGrowth,
      deductionThisMonth: monthDeductionAgg[0]?.total || 0,
    },
    expenses: {
      thisMonth: Math.round(monthExpense),
      lastMonth: Math.round(lastMonthExpense),
      thisYear: Math.round(yearExpense),
      allTime: Math.round(allTimeExpense),
      byType: expenseByType,
      monthly: expenseMonthly,
    },
    trends: {
      production: productionTrend,
      payments: paymentTrend,
    },
    topOrders: topOrdersByProduction.map(o => ({
      orderId: o._id,
      orderName: o.order?.orderName || '-',
      companyName: o.order?.company?.name || '',
      totalProduced: o.total,
    })),
    companyPerformance: companyWiseAgg.map(c => ({
      companyId: c._id,
      companyName: c.company?.name || 'Unknown',
      orders: c.orders,
      activeOrders: c.activeOrders,
      totalExpected: c.totalExpected,
      totalProduced: c.totalProduced,
      totalRejected: c.totalRejected,
      progressPct: c.totalExpected > 0 ? Math.round((c.totalProduced / c.totalExpected) * 100) : 0,
    })),
    rejections: {
      yearTotal: rejectionAgg[0]?.totalQty || 0,
      yearCount: rejectionAgg[0]?.count || 0,
      monthTotal: monthRejectionAgg[0]?.totalQty || 0,
      monthCount: monthRejectionAgg[0]?.count || 0,
      lossAmount: totalRejectionLoss,
    },
    rejectionsByCompany,
    productionByCompany,
    payroll: {
      recentRuns: payrollRuns.slice(0, 12),
      monthlyCombined: payrollRuns,
      totalGrossAllTime: payrollRuns.reduce((s, r) => s + (r.totalGross || 0), 0),
      totalNetAllTime: payrollRuns.reduce((s, r) => s + (r.totalNet || 0), 0),
      totalDeductionsAllTime: payrollRuns.reduce((s, r) => s + (r.totalDeductions || 0), 0),
      avgSalaryPerRun: payrollRuns.length > 0 ? Math.round(payrollRuns.reduce((s, r) => s + (r.totalNet || 0), 0) / payrollRuns.length) : 0,
    },
    payrollTrend,
    workforce: {
      total: totalEmployees,
      active: activeEmployees,
      inactive: totalEmployees - activeEmployees,
      employees: workforceEmployees,
      totalDailyWageBill: employeeList.reduce((s, e) => s + (e.currentDefaultDailyWage || e.dailyWage || 0), 0),
      avgDailyWage: employeeList.length > 0 ? Math.round(employeeList.reduce((s, e) => s + (e.currentDefaultDailyWage || e.dailyWage || 0), 0) / employeeList.length) : 0,
    },
    paymentModes: paymentModeAgg.map(m => ({ mode: m._id, total: m.total, count: m.count })),
    shiftBreakdown: shiftBreakdownAgg.map(s => ({ shift: s._id, total: s.total, count: s.count })),
    weeklyComparison: {
      thisWeek: thisWeekProdAgg[0]?.total || 0,
      lastWeek: lastWeekProdAgg[0]?.total || 0,
      growth: (lastWeekProdAgg[0]?.total || 0) > 0
        ? Math.round(((thisWeekProdAgg[0]?.total || 0) - (lastWeekProdAgg[0]?.total || 0)) / (lastWeekProdAgg[0]?.total || 1) * 100)
        : 0,
    },
    orderStatus: {
      active: ordersByStatusAgg.filter(s => ['open', 'active'].includes(s._id)).reduce((a, s) => ({ count: a.count + s.count, totalExpected: a.totalExpected + s.totalExpected, totalProduced: a.totalProduced + s.totalProduced }), { count: 0, totalExpected: 0, totalProduced: 0 }),
      completed: ordersByStatusAgg.filter(s => ['production_complete', 'completed'].includes(s._id)).reduce((a, s) => ({ count: a.count + s.count, totalExpected: a.totalExpected + s.totalExpected, totalProduced: a.totalProduced + s.totalProduced }), { count: 0, totalExpected: 0, totalProduced: 0 }),
      completionRate: (activeOrders + completedOrders) > 0 ? Math.round((completedOrders / (activeOrders + completedOrders)) * 100) : 0,
    },
    noolBalance: {
      received: noolReceived,
      used: noolUsed,
      returned: noolReturned,
      balance: noolCurrentBalance,
      consumptionRate: noolConsumptionRate,
      daysRemaining: noolDaysRemaining,
    },
    noolMonthly,
    // Company-wise financial summary
    companyFinancials: Array.from(companyPayableMap.entries()).map(([companyId, payable]) => {
      const receipt = receiptByCompany.get(companyId) || 0
      const allocated = totalAllocAll.get(companyId) || 0
      const unallocated = Math.max(0, receipt - allocated)
      const pending = companyPendingMap.get(companyId) || 0
      const company = allOrders.find(o => String(o.company?._id || o.company) === companyId)
      return {
        companyId,
        companyName: company?.company?.name || 'Unknown',
        payable: Math.round(payable),
        receipt: Math.round(receipt),
        allocated: Math.round(allocated),
        pending: Math.round(pending),
        unallocated: Math.round(unallocated),
        collectionPct: payable > 0 ? Math.round((receipt / payable) * 100) : 0,
      }
    }).filter(c => c.payable > 0).sort((a, b) => b.pending - a.pending),
    // Recent payments (last 15)
    recentPayments: recentPaymentRows
      .map(r => ({ date: r.date, amount: r.amount, mode: r.mode, company: r.company?.name || '-', notes: r.notes || '' })),
    // Order details for analysis
    orderDetails: allOrders.map(o => {
      const accepted = Number(o.acceptedMeter ?? Math.max(0, Number(o.producedMeter || 0) - Number(o.rejectedMeter || 0)))
      const value = accepted * Number(o.ratePerMeter || 0)
      const deduction = value * (Number(o.deductionPct || 0) / 100)
      const daysSinceCreated = Math.floor((now - new Date(o.createdAt || now)) / 86400000)
      return {
        orderName: o.orderName,
        company: o.company?.name || '-',
        status: o.status,
        expected: Number(o.expectedMeter || 0),
        produced: Number(o.producedMeter || 0),
        accepted,
        rejected: Number(o.rejectedMeter || 0),
        rate: Number(o.ratePerMeter || 0),
        deductionPct: Number(o.deductionPct || 0),
        payable: Math.round(value - deduction),
        progressPct: Number(o.expectedMeter || 0) > 0 ? Math.round((Number(o.producedMeter || 0) / Number(o.expectedMeter)) * 100) : 0,
        ageDays: daysSinceCreated,
      }
    }).sort((a, b) => b.payable - a.payable),
    expenseTrend: [],
    // New sections
    todayActivity: {
      production: todayProduction.total || 0,
      productionEntries: todayProduction.count || 0,
      receipts: todayPayments.total || 0,
      receiptCount: todayPayments.count || 0,
    },
    profitability: {
      totalRevenue: totalPaidAmount,
      totalPayrollCost,
      grossProfit,
      grossMarginPct,
      totalExpenses: Math.round(allTimeExpense),
      netProfit: Math.round(netProfit),
      netMarginPct,
      monthReceipt,
      monthPayroll,
      monthProfit,
      lastMonthProfit,
      profitGrowth: lastMonthProfit !== 0 ? Math.round(((monthProfit - lastMonthProfit) / Math.abs(lastMonthProfit)) * 100) : 0,
      revenuePerEmployee: activeEmployees > 0 ? Math.round(totalPaidAmount / activeEmployees) : 0,
      payrollToRevenueRatio: totalPaidAmount > 0 ? Math.round((totalPayrollCost / totalPaidAmount) * 100) : 0,
    },
    paymentAging,
    monthComparison,
    insights,
    rejectionsByReason: rejectionByReasonAgg.map(r => ({ reason: r._id, qty: Math.round(r.qty || 0), count: r.count || 0, loss: Math.round(r.loss || 0) })),
    period: {
      from: yearStart,
      to: periodEnd,
      asOf: now,
      months: months.length,
      isHistorical: periodEnd < realNow,
    },
  })
}))

module.exports = router
