const router = require('express').Router()
const ah = require('express-async-handler')
const auth = require('../middleware/auth')
const { Order, Production, Expense, Payment, PaymentAllocation, Company, Employee, SalaryRun, SalaryRunEmployee, Rejection, Payroll } = require('../models')

router.use(auth)

router.get('/', ah(async (req, res) => {
  const now = new Date()
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0)
  const todayEnd = new Date(now); todayEnd.setHours(23, 59, 59, 999)
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const yearStart = new Date(now.getFullYear(), 0, 1)
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)

  const Nool = require('../models').Nool

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
  ] = await Promise.all([
    Company.countDocuments(),
    Order.countDocuments({ status: 'active', archived: { $ne: true } }),
    Order.countDocuments({ status: 'completed', archived: { $ne: true } }),
    Employee.countDocuments(),
    Employee.countDocuments({ status: 'active' }),
    Production.aggregate([
      { $match: { date: { $gte: todayStart, $lte: todayEnd } } },
      { $group: { _id: null, total: { $sum: '$meter' }, count: { $sum: 1 } } },
    ]),
    Production.aggregate([
      { $match: { date: { $gte: monthStart } } },
      { $group: { _id: null, total: { $sum: '$meter' }, count: { $sum: 1 } } },
    ]),
    Production.aggregate([
      { $match: { date: { $gte: yearStart } } },
      { $group: { _id: null, total: { $sum: '$meter' }, count: { $sum: 1 } } },
    ]),
    Production.aggregate([
      { $match: { date: { $gte: lastMonthStart, $lte: lastMonthEnd } } },
      { $group: { _id: null, total: { $sum: '$meter' } } },
    ]),
    Payment.aggregate([
      { $match: { date: { $gte: monthStart }, transactionType: { $ne: 'deduction' } } },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]),
    Payment.aggregate([
      { $match: { date: { $gte: yearStart }, transactionType: { $ne: 'deduction' } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Payment.aggregate([
      { $match: { date: { $gte: lastMonthStart, $lte: lastMonthEnd }, transactionType: { $ne: 'deduction' } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Payment.aggregate([
      { $match: { date: { $gte: monthStart }, transactionType: 'deduction' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Production.aggregate([
      { $match: { date: { $gte: yearStart } } },
      { $group: { _id: { month: { $month: '$date' } }, total: { $sum: '$meter' }, entries: { $sum: 1 } } },
      { $sort: { '_id.month': 1 } },
    ]),
    Payment.aggregate([
      { $match: { date: { $gte: yearStart }, transactionType: { $ne: 'deduction' } } },
      { $group: { _id: { month: { $month: '$date' } }, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $sort: { '_id.month': 1 } },
    ]),
    Production.aggregate([
      { $match: { date: { $gte: yearStart } } },
      { $group: { _id: '$order', total: { $sum: '$meter' } } },
      { $sort: { total: -1 } },
      { $limit: 10 },
      { $lookup: { from: 'orders', localField: '_id', foreignField: '_id', as: 'order' } },
      { $unwind: { path: '$order', preserveNullAndEmptyArrays: true } },
    ]),
    Order.aggregate([
      { $match: { archived: { $ne: true } } },
      { $group: {
        _id: '$company',
        orders: { $sum: 1 },
        activeOrders: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
        totalExpected: { $sum: { $ifNull: ['$expectedMeter', 0] } },
        totalProduced: { $sum: { $ifNull: ['$producedMeter', 0] } },
        totalRejected: { $sum: { $ifNull: ['$rejectedMeter', 0] } },
      }},
      { $lookup: { from: 'companies', localField: '_id', foreignField: '_id', as: 'company' } },
      { $unwind: { path: '$company', preserveNullAndEmptyArrays: true } },
      { $sort: { totalProduced: -1 } },
    ]),
    Rejection.aggregate([
      { $match: { date: { $gte: yearStart } } },
      { $group: { _id: null, totalQty: { $sum: '$rejectedQty' }, count: { $sum: 1 } } },
    ]),
    Rejection.aggregate([
      { $match: { date: { $gte: monthStart } } },
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
      { $match: { date: { $gte: yearStart }, transactionType: { $ne: 'deduction' } } },
      { $group: { _id: '$mode', total: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]),
    Production.aggregate([
      { $match: { date: { $gte: monthStart } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } }, total: { $sum: '$meter' }, entries: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    Order.find({ archived: { $ne: true } })
      .select('orderName company expectedMeter producedMeter rejectedMeter acceptedMeter ratePerMeter deductionPct status')
      .populate('company', 'name')
      .lean(),
    // Nool monthly breakdown for the current year
    Nool.aggregate([
      { $match: { date: { $gte: yearStart } } },
      { $group: {
        _id: { month: { $month: '$date' }, entryType: '$entryType' },
        total: { $sum: '$qty' },
      }},
    ]),
  ])

  // Additional aggregations — shift breakdown, weekly comparison
  const weekStart = new Date(now); weekStart.setDate(now.getDate() - now.getDay()); weekStart.setHours(0, 0, 0, 0)
  const lastWeekStart = new Date(weekStart); lastWeekStart.setDate(lastWeekStart.getDate() - 7)
  const lastWeekEnd = new Date(weekStart); lastWeekEnd.setMilliseconds(-1)

  const [shiftBreakdownAgg, thisWeekProdAgg, lastWeekProdAgg, ordersByStatusAgg, noolBalanceAgg, employeeList, employeeSalaryAgg] = await Promise.all([
    Production.aggregate([
      { $match: { date: { $gte: monthStart } } },
      { $group: { _id: '$shift', total: { $sum: '$meter' }, count: { $sum: 1 } } },
    ]),
    Production.aggregate([
      { $match: { date: { $gte: weekStart } } },
      { $group: { _id: null, total: { $sum: '$meter' } } },
    ]),
    Production.aggregate([
      { $match: { date: { $gte: lastWeekStart, $lte: lastWeekEnd } } },
      { $group: { _id: null, total: { $sum: '$meter' } } },
    ]),
    Order.aggregate([
      { $match: { archived: { $ne: true } } },
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
  ])

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
  const [totalAllocatedAgg, totalReceiptsAgg, allocatedLiveAgg, allocatedArchivedAgg, deductionCollectedAgg] = await Promise.all([
    PaymentAllocation.aggregate([{ $group: { _id: null, total: { $sum: '$amount' } } }]),
    Payment.aggregate([{ $match: { transactionType: { $ne: 'deduction' } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
    PaymentAllocation.aggregate([
      { $lookup: { from: 'orders', localField: 'order', foreignField: '_id', as: 'orderDoc' } },
      { $unwind: '$orderDoc' },
      { $match: { 'orderDoc.archived': { $ne: true } } },
      { $group: { _id: '$company', totalPaid: { $sum: '$amount' } } },
    ]),
    PaymentAllocation.aggregate([
      { $lookup: { from: 'orders', localField: 'order', foreignField: '_id', as: 'orderDoc' } },
      { $unwind: '$orderDoc' },
      { $match: { 'orderDoc.archived': true } },
      { $group: { _id: '$company', totalPaid: { $sum: '$amount' } } },
    ]),
    Payment.aggregate([{ $match: { transactionType: 'deduction' } }, { $group: { _id: '$company', total: { $sum: '$amount' } } }]),
  ])

  const totalAllocated = totalAllocatedAgg[0]?.total || 0
  const totalPaidAmount = totalReceiptsAgg[0]?.total || 0

  // Build per-company pending (same logic as dashboard)
  const liveAllocByCompany = new Map(allocatedLiveAgg.map(r => [String(r._id), r.totalPaid || 0]))
  const archivedAllocByCompany = new Map(allocatedArchivedAgg.map(r => [String(r._id), r.totalPaid || 0]))
  const receiptByCompany = new Map()
  const allPayments = await Payment.aggregate([
    { $match: { transactionType: { $ne: 'deduction' } } },
    { $group: { _id: '$company', total: { $sum: '$amount' } } },
  ])
  allPayments.forEach(r => receiptByCompany.set(String(r._id), r.total || 0))
  const totalAllocAll = new Map()
  const allocAllAgg = await PaymentAllocation.aggregate([{ $group: { _id: '$company', total: { $sum: '$amount' } } }])
  allocAllAgg.forEach(r => totalAllocAll.set(String(r._id), r.total || 0))

  // Compute per-company payable and pending
  const companyPayableMap = new Map()
  allOrders.forEach(o => {
    const companyId = String(o.company?._id || o.company || '')
    const accepted = Number(o.acceptedMeter ?? Math.max(0, Number(o.producedMeter || 0) - Number(o.rejectedMeter || 0)))
    const value = accepted * Number(o.ratePerMeter || 0)
    const deduction = value * (Number(o.deductionPct || 0) / 100)
    const payable = value - deduction
    companyPayableMap.set(companyId, (companyPayableMap.get(companyId) || 0) + payable)
  })

  let totalPendingAmount = 0
  for (const [companyId, payable] of companyPayableMap) {
    const receipt = receiptByCompany.get(companyId) || 0
    const allocated = totalAllocAll.get(companyId) || 0
    const liveAlloc = liveAllocByCompany.get(companyId) || 0
    const archivedAlloc = archivedAllocByCompany.get(companyId) || 0
    const unallocated = Math.max(0, receipt - allocated)
    const effectiveLiveReceived = Math.max(0, liveAlloc + unallocated)
    const pending = Math.max(0, payable - Math.max(effectiveLiveReceived, receipt - archivedAlloc))
    totalPendingAmount += pending
  }

  // Avg rate per meter
  const avgRatePerMeter = totalAcceptedMeter > 0 ? Math.round((totalProducedValue / totalAcceptedMeter) * 100) / 100 : 0
  const totalDeductionCollected = deductionCollectedAgg.reduce((s, r) => s + (r.total || 0), 0)
  const deductionOutstanding = Math.max(0, totalDeductionAmount - totalDeductionCollected)

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

  const productionTrend = monthNames.map((name, i) => {
    const row = productionByMonthAgg.find(r => r._id.month === i + 1)
    return { month: name, value: row?.total || 0, entries: row?.entries || 0 }
  }).slice(0, now.getMonth() + 1)

  const paymentTrend = monthNames.map((name, i) => {
    const row = paymentByMonthAgg.find(r => r._id.month === i + 1)
    return { month: name, value: row?.total || 0, count: row?.count || 0 }
  }).slice(0, now.getMonth() + 1)

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
  const noolMonthly = monthNames.map((name, i) => {
    const monthNum = i + 1
    const received = noolMonthlyAgg.find(r => r._id.month === monthNum && r._id.entryType === 'receipt')?.total || 0
    const used = noolMonthlyAgg.find(r => r._id.month === monthNum && r._id.entryType === 'used')?.total || 0
    const returned = noolMonthlyAgg.find(r => r._id.month === monthNum && r._id.entryType === 'return')?.total || 0
    return { month: name, received, used, returned }
  }).slice(0, now.getMonth() + 1)

  // Nool balance enhancements
  const noolReceived = noolBalanceAgg.find(n => n._id === 'receipt')?.total || 0
  const noolUsed = noolBalanceAgg.find(n => n._id === 'used')?.total || 0
  const noolReturned = noolBalanceAgg.find(n => n._id === 'return')?.total || 0
  const noolCurrentBalance = noolReceived - noolUsed - noolReturned
  const daysSinceYearStart = Math.max(1, Math.floor((now - yearStart) / 86400000))
  const noolConsumptionRate = noolUsed > 0 ? Math.round((noolUsed / daysSinceYearStart) * 100) / 100 : 0
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
      totalPaidAmount,
      totalPendingAmount,
      totalRejectionLoss,
      totalAllocated,
      totalUnallocated: Math.max(0, totalPaidAmount - totalAllocated),
      collectionPct: totalPayableAmount > 0 ? Math.round((totalPaidAmount / totalPayableAmount) * 1000) / 10 : 0,
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
    expenses: { thisMonth: 0, thisYear: 0, byType: [] },
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
      active: ordersByStatusAgg.find(s => s._id === 'active') || { count: 0, totalExpected: 0, totalProduced: 0 },
      completed: ordersByStatusAgg.find(s => s._id === 'completed') || { count: 0, totalExpected: 0, totalProduced: 0 },
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
      const liveAlloc = liveAllocByCompany.get(companyId) || 0
      const archivedAlloc = archivedAllocByCompany.get(companyId) || 0
      const unallocated = Math.max(0, receipt - allocated)
      const effectiveLiveReceived = Math.max(0, liveAlloc + unallocated)
      const pending = Math.max(0, payable - Math.max(effectiveLiveReceived, receipt - archivedAlloc))
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
    recentPayments: await Payment.find({ transactionType: { $ne: 'deduction' } })
      .sort({ date: -1 }).limit(15).populate('company', 'name').lean()
      .then(rows => rows.map(r => ({ date: r.date, amount: r.amount, mode: r.mode, company: r.company?.name || '-', notes: r.notes || '' }))),
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
  })
}))

module.exports = router
