const mongoose = require('mongoose')
const {
  FinancialProfile,
  FinancialDebt,
  FinancialDebtPayment,
  FinancialMonthlyEntry,
} = require('../models')
const { buildFinancialIntelligence } = require('../services/financialIntelligence/calculationEngine')
const {
  buildAdvisorContext,
  buildDefaultAdvisorResponse,
  getCachedAdvisorInsights,
  getLatestAdvisorInsights,
  generateAdvisorInsights,
} = require('../services/financialIntelligence/aiAdvisorService')
const { monthlyIncomeTotal, monthlyExpenseTotal } = require('../services/financialIntelligence/forecastEngine')
const { monthlyInterestForDebt } = require('../services/financialIntelligence/interestEngine')
const {
  normalizeDebtType,
  isVehicleLoan,
  isInterestOnlyDebt,
  isChitFund,
} = require('../services/financialIntelligence/debtTypeUtils')

function ensureUserId(req) {
  return req.user?.id || req.user?._id
}

async function getOrCreateProfile(userId) {
  let profile = await FinancialProfile.findOne({ user: userId }).lean()
  if (!profile) {
    const created = await FinancialProfile.create({ user: userId })
    profile = created.toObject()
  }
  return profile
}

async function loadDomain(userId) {
  const [profile, debts, payments] = await Promise.all([
    getOrCreateProfile(userId),
    FinancialDebt.find({ user: userId }).sort({ createdAt: 1 }).lean(),
    FinancialDebtPayment.find({ user: userId }).sort({ date: -1 }).lean(),
  ])
  return { profile, debts, payments }
}

function parseId(id) {
  return mongoose.Types.ObjectId.isValid(id) ? id : null
}

function parseMonthYear(query = {}) {
  const now = new Date()
  const month = Math.min(12, Math.max(1, Number(query.month || (now.getMonth() + 1))))
  const year = Math.max(2000, Number(query.year || now.getFullYear()))
  return { month, year }
}

function previousMonthYear(month, year) {
  if (month > 1) return { month: month - 1, year }
  return { month: 12, year: year - 1 }
}

function periodKey(month, year) {
  return `${year}-${String(month).padStart(2, '0')}`
}

function monthYearLabel(year, month) {
  return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString('en-IN', {
    month: 'short',
    year: 'numeric',
  })
}

function round2(value) {
  return Number(Number(value || 0).toFixed(2))
}

function normalizeDebtPayload(body = {}, existingDebt = null) {
  const resolvedType = normalizeDebtType(body?.debtType || existingDebt?.debtType)
  const currentBalanceInput = Number(body?.currentBalance ?? existingDebt?.currentBalance ?? 0)
  const originalAmountInput = Number(body?.originalAmount ?? existingDebt?.originalAmount ?? currentBalanceInput)

  const payload = {
    name: String(body?.name || existingDebt?.name || '').trim(),
    debtType: resolvedType,
    originalAmount: Math.max(0, originalAmountInput),
    currentBalance: Math.max(0, currentBalanceInput),
    monthlyAmount: Math.max(0, Number(body?.monthlyAmount ?? existingDebt?.monthlyAmount ?? 0)),
    emi: Math.max(0, Number(body?.emi ?? existingDebt?.emi ?? 0)),
    interestComponent: Math.max(0, Number(body?.interestComponent ?? existingDebt?.interestComponent ?? 0)),
    principalComponent: Math.max(0, Number(body?.principalComponent ?? existingDebt?.principalComponent ?? 0)),
    interestRate: Math.max(0, Number(body?.interestRate ?? existingDebt?.interestRate ?? 0)),
    currentMonthlyInterest: Math.max(0, Number(body?.currentMonthlyInterest ?? existingDebt?.currentMonthlyInterest ?? 0)),
    monthlyInterest: Math.max(0, Number(body?.monthlyInterest ?? existingDebt?.monthlyInterest ?? 0)),
    monthlyInstallment: Math.max(0, Number(body?.monthlyInstallment ?? existingDebt?.monthlyInstallment ?? 0)),
    remainingMonths: Math.max(0, Number(body?.remainingMonths ?? existingDebt?.remainingMonths ?? 0)),
    totalInstallments: Math.max(0, Number(body?.totalInstallments ?? existingDebt?.totalInstallments ?? 0)),
    chitTotalValue: Math.max(0, Number(body?.chitTotalValue ?? existingDebt?.chitTotalValue ?? 0)),
    status: body?.status || existingDebt?.status || 'active',
    notes: String(body?.notes ?? existingDebt?.notes ?? ''),
  }

  if (isVehicleLoan(resolvedType)) {
    if (payload.emi <= 0) payload.emi = Math.max(0, payload.monthlyAmount)
    if (payload.emi <= 0) payload.emi = payload.interestComponent + payload.principalComponent
    if (payload.monthlyAmount <= 0) payload.monthlyAmount = payload.emi
  }

  if (isInterestOnlyDebt(resolvedType)) {
    payload.principalComponent = 0
    if (payload.currentMonthlyInterest <= 0 && payload.monthlyInterest > 0) {
      payload.currentMonthlyInterest = payload.monthlyInterest
    }
  }

  if (isVehicleLoan(resolvedType) || isInterestOnlyDebt(resolvedType)) {
    if (payload.interestRate > 0) {
      payload.currentMonthlyInterest = round2((payload.currentBalance * payload.interestRate) / 1200)
    }
  }

  if (isChitFund(resolvedType)) {
    if (payload.totalInstallments <= 0) payload.totalInstallments = payload.remainingMonths
    if (payload.chitTotalValue <= 0) {
      payload.chitTotalValue = payload.monthlyInstallment * payload.totalInstallments
    }
    payload.currentBalance = payload.monthlyInstallment * payload.remainingMonths
    payload.originalAmount = payload.chitTotalValue || payload.originalAmount
  }

  return payload
}

function getPrincipalFromPayment(payment = {}) {
  const principal = Number(payment?.principalPaid || 0)
  if (principal > 0) return principal
  const extra = Number(payment?.extraPaymentAmount || 0)
  if (extra > 0) return extra
  const amount = Number(payment?.amountPaid || 0)
  const interest = Number(payment?.interestPaid || 0)
  const additionalCharges = Number(payment?.additionalCharges || 0)
  return Math.max(0, amount - interest - additionalCharges)
}

function derivePaymentBreakdown({ debt, payment = {}, currentBalance }) {
  const debtType = normalizeDebtType(debt.debtType)
  const debtLike = debt?.toObject ? debt.toObject() : debt
  const monthlyInterest = Number(monthlyInterestForDebt({ ...debtLike, currentBalance }) || 0)
  const isExtra = !!payment.isExtra
  const paymentType = String(payment?.paymentType || '').trim().toLowerCase()
  const paymentAmountInput = Math.max(0, Number(
    payment?.amountPaid
    ?? payment?.paymentAmount
    ?? 0
  ))
  const extraPrincipalAmount = Math.max(0, Number(
    payment?.extraPrincipalAmount
    ?? payment?.extraPaymentAmount
    ?? 0
  ))
  const interestInput = Math.max(0, Number(payment?.interestPaid ?? 0))
  const principalInput = Math.max(0, Number(payment?.principalPaid ?? 0))
  const additionalCharges = Math.max(0, Number(payment?.additionalCharges ?? 0))

  let amountPaid = paymentAmountInput
  let interestPaid = 0
  let principalPaid = 0

  if (isChitFund(debtType)) {
    const installmentAmount = Number(debt.monthlyInstallment || 0)
    amountPaid = Math.max(paymentAmountInput, extraPrincipalAmount, installmentAmount)
    const installmentsCovered = installmentAmount > 0 ? Math.max(1, Math.floor(amountPaid / installmentAmount)) : 1
    return {
      amountPaid: round2(amountPaid + additionalCharges),
      interestPaid,
      principalPaid,
      extraPaymentAmount: isExtra ? amountPaid : 0,
      additionalCharges,
      monthlyInterest,
      isExtra,
      installmentsCovered,
    }
  }

  if (paymentType === 'interest_only') {
    if (interestInput > 0) {
      // User explicitly provided interest amount
      interestPaid = interestInput
    } else if (extraPrincipalAmount > 0 || principalInput > 0) {
      // User has explicit principal/extra breakdown; paymentAmountInput already includes
      // the extra principal, so do NOT re-use it as interest — that would double-count.
      interestPaid = 0
    } else {
      // No breakdown at all; treat the total amount as interest
      interestPaid = paymentAmountInput > 0 ? paymentAmountInput : monthlyInterest
    }
    principalPaid = 0
  } else if (paymentType === 'principal_only') {
    interestPaid = 0
    if (principalInput > 0) {
      principalPaid = principalInput
    } else if (extraPrincipalAmount > 0) {
      // Extra principal already covers the payment; don't also add paymentAmountInput
      // (which equals extraPrincipalAmount on the frontend), that would double-count.
      principalPaid = 0
    } else {
      principalPaid = paymentAmountInput
    }
  } else if (paymentType === 'custom_split' || paymentType === 'mixed') {
    interestPaid = interestInput
    principalPaid = principalInput
    const splitTotal = interestPaid + principalPaid
    if (paymentAmountInput <= 0 && splitTotal > 0) amountPaid = splitTotal
    if (amountPaid > 0 && splitTotal > amountPaid) {
      const ratio = amountPaid / splitTotal
      interestPaid *= ratio
      principalPaid *= ratio
    }
  } else if (isVehicleLoan(debtType)) {
    interestPaid = Math.min(monthlyInterest, paymentAmountInput)
    principalPaid = Math.max(0, paymentAmountInput - interestPaid)
  } else if (isInterestOnlyDebt(debtType)) {
    interestPaid = Math.min(paymentAmountInput, monthlyInterest)
    principalPaid = Math.max(0, paymentAmountInput - interestPaid)
  } else {
    interestPaid = 0
    principalPaid = paymentAmountInput
  }

  principalPaid += extraPrincipalAmount
  amountPaid = Math.max(amountPaid, interestPaid + principalPaid)
  amountPaid += additionalCharges

  return {
    amountPaid: round2(amountPaid),
    interestPaid: round2(interestPaid),
    principalPaid: round2(principalPaid),
    extraPaymentAmount: round2(extraPrincipalAmount),
    additionalCharges: round2(additionalCharges),
    monthlyInterest: round2(monthlyInterest),
    isExtra,
    installmentsCovered: 0,
  }
}

async function computeInitialOpeningDebtBalance(userId) {
  const debts = await FinancialDebt.find({ user: userId, status: 'active' }).lean()
  return round2(debts.reduce((sum, debt) => {
    const debtType = normalizeDebtType(debt.debtType)
    if (isChitFund(debtType)) {
      return sum + (Number(debt.monthlyInstallment || 0) * Number(debt.remainingMonths || 0))
    }
    return sum + Number(debt.currentBalance || 0)
  }, 0))
}

async function recomputeMonthlySeries(userId, startPeriod = null) {
  const entries = await FinancialMonthlyEntry.find({ user: userId }).sort({ year: 1, month: 1 })
  if (!entries.length) return

  const payments = await FinancialDebtPayment.find({ user: userId }).lean()
  const byPeriod = new Map()

  for (const payment of payments) {
    if (!payment.month || !payment.year) continue
    const key = periodKey(Number(payment.month), Number(payment.year))
    const bucket = byPeriod.get(key) || {
      totalDebtPayments: 0,
      totalInterestPaid: 0,
      totalPrincipalReduced: 0,
      totalAdditionalCharges: 0,
    }
    bucket.totalDebtPayments += Number(payment.amountPaid || 0)
    bucket.totalInterestPaid += Number(payment.interestPaid || 0)
    bucket.totalPrincipalReduced += Number(getPrincipalFromPayment(payment) || 0)
    bucket.totalAdditionalCharges += Number(payment.additionalCharges || 0)
    byPeriod.set(key, bucket)
  }

  let startIndex = 0
  if (startPeriod?.month && startPeriod?.year) {
    const pivot = entries.findIndex((entry) => (
      Number(entry.year) > Number(startPeriod.year)
      || (Number(entry.year) === Number(startPeriod.year) && Number(entry.month) >= Number(startPeriod.month))
    ))
    if (pivot === -1) return
    startIndex = Math.max(0, pivot - 1)
  }

  for (let index = startIndex; index < entries.length; index += 1) {
    const entry = entries[index]
    const prev = index > 0 ? entries[index - 1] : null
    if (prev) {
      entry.openingDebtBalance = round2(prev.closingDebtBalance || 0)
    } else {
      entry.openingDebtBalance = round2(entry.openingDebtBalance || 0)
    }

    const key = periodKey(Number(entry.month), Number(entry.year))
    const stats = byPeriod.get(key) || {
      totalDebtPayments: 0,
      totalInterestPaid: 0,
      totalPrincipalReduced: 0,
      totalAdditionalCharges: 0,
    }

    const totalSurplusUsed = Number(stats.totalDebtPayments || 0)
    entry.totalDebtPayments = round2(stats.totalDebtPayments)
    entry.totalInterestPaid = round2(stats.totalInterestPaid)
    entry.totalPrincipalReduced = round2(stats.totalPrincipalReduced)
    entry.totalAdditionalCharges = round2(stats.totalAdditionalCharges)
    entry.totalSurplusUsed = round2(totalSurplusUsed)
    entry.availableSurplus = round2(Number(entry.computedSurplus || 0) - totalSurplusUsed)
    entry.closingDebtBalance = round2(Math.max(0, Number(entry.openingDebtBalance || 0) - Number(entry.totalPrincipalReduced || 0)))
    entry.debtReduction = round2(Math.max(0, Number(entry.openingDebtBalance || 0) - Number(entry.closingDebtBalance || 0)))
    await entry.save()
  }
}

async function recomputeDebtFromPayments(userId, debtId) {
  const debt = await FinancialDebt.findOne({ _id: debtId, user: userId })
  if (!debt) return

  const debtType = normalizeDebtType(debt.debtType)
  const payments = await FinancialDebtPayment.find({ user: userId, debt: debt._id }).sort({ date: 1, createdAt: 1 })

  const openingBalance = Number(debt.originalAmount || debt.currentBalance || 0)
  let currentBalance = Math.max(0, openingBalance)
  let remainingMonths = Number(debt.totalInstallments || debt.remainingMonths || 0)
  const monthlyInstallment = Number(debt.monthlyInstallment || 0)

  if (isChitFund(debtType)) {
    currentBalance = Math.max(0, monthlyInstallment * remainingMonths)
  }

  for (const payment of payments) {
    if (isChitFund(debtType)) {
      const amountPaid = Number(payment.amountPaid || 0)
      const installmentAmount = Number(debt.monthlyInstallment || 0)
      const defaultCovered = installmentAmount > 0 ? Math.max(1, Math.floor(amountPaid / installmentAmount)) : 1
      const covered = Math.max(1, Number(payment.installmentsCovered || defaultCovered || 1))
      const before = currentBalance
      remainingMonths = Math.max(0, remainingMonths - covered)
      currentBalance = Math.max(0, monthlyInstallment * remainingMonths)
      payment.installmentsRemainingAfterPayment = remainingMonths
      payment.currentBalanceBeforePayment = Number(before.toFixed(2))
    } else {
      const before = currentBalance
      const principalPaid = Number(getPrincipalFromPayment(payment) || 0)
      currentBalance = Math.max(0, currentBalance - principalPaid)
      payment.currentBalanceBeforePayment = Number(before.toFixed(2))
      payment.installmentsRemainingAfterPayment = 0
    }

    payment.debtType = debtType
    payment.debtNameSnapshot = debt.name
    payment.currentBalanceAfterPayment = Number(currentBalance.toFixed(2))
    payment.remainingBalanceAfterPayment = Number(currentBalance.toFixed(2))
    await payment.save()
  }

  debt.currentBalance = Number(currentBalance.toFixed(2))
  if (isChitFund(debtType)) debt.remainingMonths = remainingMonths
  if ((isChitFund(debtType) && remainingMonths <= 0) || (!isChitFund(debtType) && currentBalance <= 0)) {
    debt.status = 'closed'
    debt.closedAt = new Date()
  } else {
    debt.status = 'active'
    debt.closedAt = null
  }
  await debt.save()
}

function buildMonthProfile(baseProfile, monthEntry) {
  const monthlyExpenses = monthEntry?.monthlyExpenses || baseProfile?.monthlyExpenses || {}
  const weeklyExpenses = monthEntry?.weeklyExpenses || baseProfile?.weeklyExpenses || {}

  const normalizedMonthlyExpenses = {
    workerWages: monthlyExpenses.workerWages == null
      ? Number(weeklyExpenses.workerWages || 0) * 4.33
      : Number(monthlyExpenses.workerWages || 0),
    familyExpenses: monthlyExpenses.familyExpenses == null
      ? Number(weeklyExpenses.familyExpenses || 0) * 4.33
      : Number(monthlyExpenses.familyExpenses || 0),
    otherMonthlyExpenses: monthlyExpenses.otherMonthlyExpenses == null
      ? Number(monthlyExpenses.electricity || 0) + Number(monthlyExpenses.maintenance || 0)
      : Number(monthlyExpenses.otherMonthlyExpenses || 0),
  }

  return {
    ...baseProfile,
    monthlyIncome: monthEntry?.monthlyIncome || baseProfile?.monthlyIncome || {},
    weeklyExpenses,
    monthlyExpenses: normalizedMonthlyExpenses,
  }
}

function computeMonthlyTotals(entryLike = {}) {
  const totalIncome = monthlyIncomeTotal(entryLike)
  const totalWorkerWages = entryLike?.monthlyExpenses?.workerWages == null
    ? Number(entryLike?.weeklyExpenses?.workerWages || 0) * 4.33
    : Number(entryLike?.monthlyExpenses?.workerWages || 0)
  const totalFamilyExpenses = entryLike?.monthlyExpenses?.familyExpenses == null
    ? Number(entryLike?.weeklyExpenses?.familyExpenses || 0) * 4.33
    : Number(entryLike?.monthlyExpenses?.familyExpenses || 0)
  const totalOtherMonthlyExpenses = entryLike?.monthlyExpenses?.otherMonthlyExpenses == null
    ? Number(entryLike?.monthlyExpenses?.electricity || 0) + Number(entryLike?.monthlyExpenses?.maintenance || 0)
    : Number(entryLike?.monthlyExpenses?.otherMonthlyExpenses || 0)
  const totalMonthlyExpenses = totalWorkerWages + totalFamilyExpenses + totalOtherMonthlyExpenses
  const totalBalance = totalIncome - totalMonthlyExpenses

  return {
    totalIncome: Number(totalIncome.toFixed(2)),
    totalWorkerWages: Number(totalWorkerWages.toFixed(2)),
    totalFamilyExpenses: Number(totalFamilyExpenses.toFixed(2)),
    totalOtherMonthlyExpenses: Number(totalOtherMonthlyExpenses.toFixed(2)),
    // Legacy key kept so historical UI consumers do not break.
    totalWeeklyExpenses: 0,
    totalExpenses: Number(totalMonthlyExpenses.toFixed(2)),
    totalMonthlyExpenses: Number(totalMonthlyExpenses.toFixed(2)),
    totalBalance: Number(totalBalance.toFixed(2)),
  }
}

function buildDefaultMonthlyEntry({ month, year }, profile) {
  const seed = {
    year,
    month,
    monthlyIncome: {
      powerloomIncome: 0,
      ashokContribution: 0,
      rentalIncome: 0,
    },
    weeklyExpenses: {
      workerWages: 0,
      familyExpenses: 0,
    },
    monthlyExpenses: {
      workerWages: 0,
      familyExpenses: 0,
      otherMonthlyExpenses: 0,
      electricity: 0,
      maintenance: 0,
    },
    computedSurplus: 0,
    availableSurplus: 0,
    openingDebtBalance: 0,
    closingDebtBalance: 0,
    totalDebtPayments: 0,
    totalInterestPaid: 0,
    totalPrincipalReduced: 0,
    totalAdditionalCharges: 0,
    totalSurplusUsed: 0,
    debtReduction: 0,
  }
  const totals = computeMonthlyTotals(seed)
  return {
    ...seed,
    computedSurplus: totals.totalBalance,
    availableSurplus: totals.totalBalance,
    totals,
    _isDraft: true,
  }
}

async function findMonthlyEntry(userId, { year, month }) {
  return FinancialMonthlyEntry.findOne({ user: userId, year, month }).lean()
}

async function getOrCreateMonthlyEntry(userId, { year, month }, profile) {
  let entry = await FinancialMonthlyEntry.findOne({ user: userId, year, month })
  if (!entry) {
    const prevMonth = previousMonthYear(month, year)
    const previousEntry = await FinancialMonthlyEntry.findOne({ user: userId, year: prevMonth.year, month: prevMonth.month }).lean()
    const openingDebtBalance = previousEntry
      ? Number(previousEntry.closingDebtBalance || 0)
      : await computeInitialOpeningDebtBalance(userId)

    const seed = {
      monthlyIncome: {
        powerloomIncome: 0,
        ashokContribution: 0,
        rentalIncome: 0,
      },
      weeklyExpenses: {
        workerWages: 0,
        familyExpenses: 0,
      },
      monthlyExpenses: {
        workerWages: 0,
        familyExpenses: 0,
        otherMonthlyExpenses: 0,
        electricity: 0,
        maintenance: 0,
      },
    }
    const totals = computeMonthlyTotals(seed)
    entry = await FinancialMonthlyEntry.create({
      user: userId,
      year,
      month,
      ...seed,
      computedSurplus: totals.totalBalance,
      availableSurplus: totals.totalBalance,
      openingDebtBalance,
      closingDebtBalance: openingDebtBalance,
      totalDebtPayments: 0,
      totalInterestPaid: 0,
      totalPrincipalReduced: 0,
      totalAdditionalCharges: 0,
      totalSurplusUsed: 0,
      debtReduction: 0,
    })
  }
  return entry
}

async function buildMonthlyLedgerSeries(userId) {
  const [entries, payments] = await Promise.all([
    FinancialMonthlyEntry.find({ user: userId }).sort({ year: 1, month: 1 }).lean(),
    FinancialDebtPayment.find({ user: userId }).lean(),
  ])

  const paymentMap = new Map()
  for (const payment of payments) {
    const month = Number(payment.month || 0)
    const year = Number(payment.year || 0)
    if (!month || !year) continue
    const key = periodKey(month, year)
    const bucket = paymentMap.get(key) || { debtPayments: 0 }
    bucket.debtPayments += Number(payment.amountPaid || 0)
    paymentMap.set(key, bucket)
  }

  const rows = entries.map((entry) => {
    const totals = computeMonthlyTotals(entry)
    const key = periodKey(Number(entry.month), Number(entry.year))
    const paymentStats = paymentMap.get(key) || { debtPayments: Number(entry.totalDebtPayments || 0) }
    return {
      key,
      month: Number(entry.month),
      year: Number(entry.year),
      label: monthYearLabel(entry.year, entry.month),
      totals,
      openingDebt: Number(entry.openingDebtBalance || 0),
      principalPaid: Number(entry.totalPrincipalReduced || 0),
      closingDebt: Number(entry.closingDebtBalance || 0),
      debtPayments: Number(paymentStats.debtPayments || entry.totalDebtPayments || 0),
      surplus: Number(entry.availableSurplus ?? totals.totalBalance),
    }
  })

  return rows
}

async function buildYearlyAnalysis(userId, year) {
  const entries = await FinancialMonthlyEntry.find({ user: userId, year }).sort({ month: 1 }).lean()
  const payments = await FinancialDebtPayment.find({ user: userId, year }).lean()

  const monthlyRows = entries.map((entry) => {
    const totals = computeMonthlyTotals(entry)
    return {
      ...entry,
      totals,
      monthLabel: new Date(Number(year), Number(entry.month) - 1, 1).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }),
    }
  })

  const totalIncome = monthlyRows.reduce((sum, row) => sum + Number(row?.totals?.totalIncome || 0), 0)
  const totalExpenses = monthlyRows.reduce(
    (sum, row) => sum + Number(row?.totals?.totalExpenses || row?.totals?.totalMonthlyExpenses || 0),
    0
  )
  const totalDebtPayments = payments.reduce((sum, payment) => sum + Number(payment.amountPaid || 0), 0)
  const totalInterestPaid = payments.reduce((sum, payment) => sum + Number(payment.interestPaid || 0), 0)
  const totalPrincipalReduced = payments.reduce((sum, payment) => sum + Number(getPrincipalFromPayment(payment) || 0), 0)
  const totalSurplus = monthlyRows.reduce((sum, row) => sum + Number(row.availableSurplus || 0), 0)

  const openingDebtBalance = Number(monthlyRows[0]?.openingDebtBalance || 0)
  const closingDebtBalance = Number(monthlyRows[monthlyRows.length - 1]?.closingDebtBalance || openingDebtBalance)
  const totalDebtReduction = Math.max(0, openingDebtBalance - closingDebtBalance)

  return {
    year,
    monthlyRows,
    financialSummary: {
      totalIncome: round2(totalIncome),
      totalExpenses: round2(totalExpenses),
      totalDebtPayments: round2(totalDebtPayments),
      totalInterestPaid: round2(totalInterestPaid),
      totalPrincipalReduced: round2(totalPrincipalReduced),
      totalSurplus: round2(totalSurplus),
    },
    debtSummary: {
      openingDebtBalance: round2(openingDebtBalance),
      closingDebtBalance: round2(closingDebtBalance),
      totalDebtReduction: round2(totalDebtReduction),
    },
    charts: {
      debtReductionTrend: monthlyRows.map(row => ({ month: row.monthLabel, value: Number(row.debtReduction || 0) })),
      incomeVsExpenses: monthlyRows.map(row => ({
        month: row.monthLabel,
        income: Number(row?.totals?.totalIncome || 0),
        expenses: Number(row?.totals?.totalExpenses || row?.totals?.totalMonthlyExpenses || 0),
      })),
      surplusTrend: monthlyRows.map(row => ({ month: row.monthLabel, value: Number(row.availableSurplus || 0) })),
      paymentDistribution: [
        { name: 'Interest Paid', value: round2(totalInterestPaid) },
        { name: 'Principal Reduced', value: round2(totalPrincipalReduced) },
        { name: 'Additional Charges', value: round2(payments.reduce((sum, payment) => sum + Number(payment.additionalCharges || 0), 0)) },
      ],
    },
  }
}

exports.getDashboard = async (req, res) => {
  const userId = ensureUserId(req)
  const monthYear = parseMonthYear(req.query)
  const domain = await loadDomain(userId)
  const [monthlyEntry, monthlyPayments, ledgerSeries] = await Promise.all([
    findMonthlyEntry(userId, monthYear),
    FinancialDebtPayment.find({
      user: userId,
      month: monthYear.month,
      year: monthYear.year,
    }).sort({ date: -1 }).lean(),
    buildMonthlyLedgerSeries(userId),
  ])
  const effectiveMonthlyEntry = monthlyEntry || buildDefaultMonthlyEntry(monthYear, domain.profile)
  const calcProfile = buildMonthProfile(domain.profile, effectiveMonthlyEntry)
  const payload = buildFinancialIntelligence({ ...domain, profile: calcProfile })
  const selectedTotals = computeMonthlyTotals(effectiveMonthlyEntry)
  const selectedDebtPayments = monthlyPayments.reduce((sum, item) => sum + Number(item.amountPaid || 0), 0)

  payload.summary.income = Number(selectedTotals.totalIncome || 0)
  payload.summary.expenses = Number(selectedTotals.totalExpenses || selectedTotals.totalMonthlyExpenses || 0)
  payload.summary.debtPayments = Number(selectedDebtPayments || 0)
  payload.summary.remainingCash = Number(effectiveMonthlyEntry.availableSurplus ?? selectedTotals.totalBalance)
  payload.monthlyEntry = {
    ...effectiveMonthlyEntry,
    totals: selectedTotals,
  }
  payload.monthlyActions = monthlyPayments

  const chartRows = ledgerSeries.length
    ? ledgerSeries
    : [{
      key: periodKey(monthYear.month, monthYear.year),
      month: monthYear.month,
      year: monthYear.year,
      label: monthYearLabel(monthYear.year, monthYear.month),
      totals: selectedTotals,
      openingDebt: Number(effectiveMonthlyEntry.openingDebtBalance || 0),
      principalPaid: Number(effectiveMonthlyEntry.totalPrincipalReduced || 0),
      closingDebt: Number(effectiveMonthlyEntry.closingDebtBalance || effectiveMonthlyEntry.openingDebtBalance || 0),
      debtPayments: Number(selectedDebtPayments || 0),
      surplus: Number(effectiveMonthlyEntry.availableSurplus ?? selectedTotals.totalBalance),
    }]

  payload.charts.burnDown = chartRows.map(row => ({
    key: row.key,
    month: row.month,
    year: row.year,
    label: row.label,
    openingDebt: Number(row.openingDebt || 0),
    principalPaid: Number(row.principalPaid || 0),
    closingDebt: Number(row.closingDebt || 0),
    totalDebt: Number(row.closingDebt || 0),
    reduction: Number(row.principalPaid || 0),
  }))

  payload.charts.cashFlow = chartRows.map(row => ({
    key: row.key,
    month: row.month,
    year: row.year,
    label: row.label,
    income: Number(row.totals?.totalIncome || 0),
    expenses: Number(row.totals?.totalExpenses || row.totals?.totalMonthlyExpenses || 0),
    debtPayments: Number(row.debtPayments || 0),
    surplus: Number(row.surplus || 0),
  }))

  payload.paymentAnalytics = {
    totalPaidThisMonth: monthlyPayments.reduce((sum, item) => sum + Number(item.amountPaid || 0), 0),
    totalPrincipalReduced: monthlyPayments.reduce((sum, item) => sum + Number(getPrincipalFromPayment(item) || 0), 0),
    totalInterestPaid: monthlyPayments.reduce((sum, item) => sum + Number(item.interestPaid || 0), 0),
    totalAdditionalCharges: monthlyPayments.reduce((sum, item) => sum + Number(item.additionalCharges || 0), 0),
    extraPaymentsMade: monthlyPayments.filter(item => item.isExtra).length,
  }

    const aiContext = buildAdvisorContext({
    currentTarget: payload.currentTarget,
    monthlyEntry: payload.monthlyEntry,
    monthlyActions: monthlyPayments,
    summary: payload.summary,
    priorityOrder: domain.profile?.priorityOrder || [],
    debtRows: payload.debtCenterRows,
    paymentAnalytics: payload.paymentAnalytics,
    debtHistory: domain.payments,
  })

    const cachedAI = getCachedAdvisorInsights(userId, aiContext.dataHash)
    const latestAI = getLatestAdvisorInsights(userId)

    payload.ai = cachedAI
      ? {
          ...cachedAI,
          source: 'cache',
          isStale: false,
          requiresRegeneration: false,
        }
      : latestAI
        ? {
            ...latestAI,
            source: 'cache-stale',
            isStale: true,
            requiresRegeneration: true,
          }
        : {
            ...buildDefaultAdvisorResponse(),
            source: 'not_generated',
            isStale: false,
            requiresRegeneration: true,
          }

  payload.aiMeta = {
    dataHash: aiContext.dataHash,
    lastGeneratedAt: latestAI?.generatedAt || null,
    lastGeneratedHash: latestAI?.dataHash || null,
  }

  res.json(payload)
}

exports.generateAIInsights = async (req, res) => {
  const userId = ensureUserId(req)
  const monthYear = parseMonthYear({ ...req.query, ...req.body })
  const force = req.body?.force === true
  const domain = await loadDomain(userId)
  const monthlyEntry = await findMonthlyEntry(userId, monthYear)
  const monthlyPayments = await FinancialDebtPayment.find({
    user: userId,
    month: monthYear.month,
    year: monthYear.year,
  }).sort({ date: -1 }).lean()

  const effectiveMonthlyEntry = monthlyEntry || buildDefaultMonthlyEntry(monthYear, domain.profile)
  const calcProfile = buildMonthProfile(domain.profile, effectiveMonthlyEntry)
  const payload = buildFinancialIntelligence({ ...domain, profile: calcProfile })
  payload.summary.remainingCash = Number(effectiveMonthlyEntry.availableSurplus || 0)
  payload.monthlyEntry = {
    ...effectiveMonthlyEntry,
    totals: computeMonthlyTotals(effectiveMonthlyEntry),
  }

  payload.paymentAnalytics = {
    totalPaidThisMonth: monthlyPayments.reduce((sum, item) => sum + Number(item.amountPaid || 0), 0),
    totalPrincipalReduced: monthlyPayments.reduce((sum, item) => sum + Number(getPrincipalFromPayment(item) || 0), 0),
    totalInterestPaid: monthlyPayments.reduce((sum, item) => sum + Number(item.interestPaid || 0), 0),
    totalAdditionalCharges: monthlyPayments.reduce((sum, item) => sum + Number(item.additionalCharges || 0), 0),
    extraPaymentsMade: monthlyPayments.filter(item => item.isExtra).length,
  }

  const aiContext = buildAdvisorContext({
    currentTarget: payload.currentTarget,
    monthlyEntry: payload.monthlyEntry,
    monthlyActions: monthlyPayments,
    summary: payload.summary,
    priorityOrder: domain.profile?.priorityOrder || [],
    debtRows: payload.debtCenterRows,
    paymentAnalytics: payload.paymentAnalytics,
    debtHistory: domain.payments,
  })

  try {
    const result = await generateAdvisorInsights({
      userId,
      context: aiContext,
      force,
    })

    return res.json({
      ...result,
      requiresRegeneration: false,
      isStale: false,
      requestedMonth: monthYear.month,
      requestedYear: monthYear.year,
      dataHash: aiContext.dataHash,
    })
  } catch (error) {
    const statusCode = error?.code === 'CONFIG_MISSING'
      ? 400
      : error?.code === 'QUOTA_EXCEEDED'
        ? 429
        : 502
    return res.status(statusCode).json({
      message: error?.message || 'AI insights generation failed',
      code: error?.code || 'AI_GENERATION_FAILED',
      retryable: error?.code !== 'CONFIG_MISSING',
      requestedMonth: monthYear.month,
      requestedYear: monthYear.year,
    })
  }
}

exports.getProfile = async (req, res) => {
  const userId = ensureUserId(req)
  const profile = await getOrCreateProfile(userId)
  res.json(profile)
}

exports.updateProfile = async (req, res) => {
  const userId = ensureUserId(req)
  const existing = await getOrCreateProfile(userId)

  const workerWagesInput = req.body?.monthlyExpenses?.workerWages
  const familyExpensesInput = req.body?.monthlyExpenses?.familyExpenses
  const otherMonthlyExpensesInput = req.body?.monthlyExpenses?.otherMonthlyExpenses

  const fallbackWorkerWages = req.body?.weeklyExpenses?.workerWages ?? existing?.weeklyExpenses?.workerWages ?? 0
  const fallbackFamilyExpenses = req.body?.weeklyExpenses?.familyExpenses ?? existing?.weeklyExpenses?.familyExpenses ?? 0
  const fallbackOtherMonthly = (req.body?.monthlyExpenses?.electricity ?? existing?.monthlyExpenses?.electricity ?? 0)
    + (req.body?.monthlyExpenses?.maintenance ?? existing?.monthlyExpenses?.maintenance ?? 0)

  const update = {
    monthlyIncome: {
      powerloomIncome: Number(req.body?.monthlyIncome?.powerloomIncome ?? existing?.monthlyIncome?.powerloomIncome ?? 0),
      ashokContribution: Number(req.body?.monthlyIncome?.ashokContribution ?? existing?.monthlyIncome?.ashokContribution ?? 0),
      rentalIncome: Number(req.body?.monthlyIncome?.rentalIncome ?? existing?.monthlyIncome?.rentalIncome ?? 0),
    },
    weeklyExpenses: {
      workerWages: Number(req.body?.weeklyExpenses?.workerWages ?? existing?.weeklyExpenses?.workerWages ?? 0),
      familyExpenses: Number(req.body?.weeklyExpenses?.familyExpenses ?? existing?.weeklyExpenses?.familyExpenses ?? 0),
    },
    monthlyExpenses: {
      workerWages: Number(workerWagesInput ?? (Number(fallbackWorkerWages) * 4.33)),
      familyExpenses: Number(familyExpensesInput ?? (Number(fallbackFamilyExpenses) * 4.33)),
      otherMonthlyExpenses: Number(otherMonthlyExpensesInput ?? fallbackOtherMonthly),
      electricity: Number(req.body?.monthlyExpenses?.electricity ?? existing?.monthlyExpenses?.electricity ?? 0),
      maintenance: Number(req.body?.monthlyExpenses?.maintenance ?? existing?.monthlyExpenses?.maintenance ?? 0),
    },
    priorityOrder: Array.isArray(req.body?.priorityOrder)
      ? req.body.priorityOrder.map(v => String(v || '').trim()).filter(Boolean)
      : (existing?.priorityOrder || []),
  }

  const profile = await FinancialProfile.findOneAndUpdate(
    { user: userId },
    { $set: update },
    { new: true, upsert: true }
  ).lean()

  res.json(profile)
}

exports.getMonthlyEntry = async (req, res) => {
  const userId = ensureUserId(req)
  const profile = await getOrCreateProfile(userId)
  const monthYear = parseMonthYear(req.query)
  const entry = await FinancialMonthlyEntry.findOne({ user: userId, year: monthYear.year, month: monthYear.month }).lean()
  const effectiveEntry = entry || buildDefaultMonthlyEntry(monthYear, profile)
  res.json({ ...effectiveEntry, totals: computeMonthlyTotals(effectiveEntry) })
}

// Recompute the top-level aggregated income/expense fields from all transactions in a monthly entry.
function recomputeEntryAggregates(entry) {
  const txs = Array.isArray(entry.transactions) ? entry.transactions : []
  const monthlyIncome = {
    powerloomIncome: round2(txs.reduce((s, t) => s + Number(t.monthlyIncome?.powerloomIncome || 0), 0)),
    ashokContribution: round2(txs.reduce((s, t) => s + Number(t.monthlyIncome?.ashokContribution || 0), 0)),
    rentalIncome: round2(txs.reduce((s, t) => s + Number(t.monthlyIncome?.rentalIncome || 0), 0)),
  }
  const monthlyExpenses = {
    workerWages: round2(txs.reduce((s, t) => s + Number(t.monthlyExpenses?.workerWages || 0), 0)),
    familyExpenses: round2(txs.reduce((s, t) => s + Number(t.monthlyExpenses?.familyExpenses || 0), 0)),
    otherMonthlyExpenses: round2(txs.reduce((s, t) => s + Number(t.monthlyExpenses?.otherMonthlyExpenses || 0), 0)),
    electricity: 0,
    maintenance: 0,
  }
  return { monthlyIncome, monthlyExpenses }
}

exports.updateMonthlyEntry = async (req, res) => {
  const userId = ensureUserId(req)
  const profile = await getOrCreateProfile(userId)
  const monthYear = parseMonthYear(req.body)
  const transactionId = req.body?._transactionId || null

  // Normalize expense inputs (same legacy fallback logic as before)
  const normalizedWorkerWages = Number(
    req.body?.monthlyExpenses?.workerWages
    ?? (Number(req.body?.weeklyExpenses?.workerWages || 0) * 4.33)
  )
  const normalizedFamilyExpenses = Number(
    req.body?.monthlyExpenses?.familyExpenses
    ?? (Number(req.body?.weeklyExpenses?.familyExpenses || 0) * 4.33)
  )
  const normalizedOtherMonthly = Number(
    req.body?.monthlyExpenses?.otherMonthlyExpenses
    ?? (Number(req.body?.monthlyExpenses?.electricity || 0) + Number(req.body?.monthlyExpenses?.maintenance || 0))
  )

  const txData = {
    monthlyIncome: {
      powerloomIncome: Number(req.body?.monthlyIncome?.powerloomIncome || 0),
      ashokContribution: Number(req.body?.monthlyIncome?.ashokContribution || 0),
      rentalIncome: Number(req.body?.monthlyIncome?.rentalIncome || 0),
    },
    monthlyExpenses: {
      workerWages: normalizedWorkerWages,
      familyExpenses: normalizedFamilyExpenses,
      otherMonthlyExpenses: normalizedOtherMonthly,
    },
    label: String(req.body?.label || ''),
    notes: String(req.body?.notes || ''),
  }

  const existing = await getOrCreateMonthlyEntry(userId, monthYear, profile)

  // Ensure legacy single-entry data is migrated into the transactions array
  if (!Array.isArray(existing.transactions)) existing.transactions = []
  if (existing.transactions.length === 0 && (
    Number(existing.monthlyIncome?.powerloomIncome || 0) > 0
    || Number(existing.monthlyIncome?.ashokContribution || 0) > 0
    || Number(existing.monthlyIncome?.rentalIncome || 0) > 0
    || Number(existing.monthlyExpenses?.workerWages || 0) > 0
    || Number(existing.monthlyExpenses?.familyExpenses || 0) > 0
    || Number(existing.monthlyExpenses?.otherMonthlyExpenses || 0) > 0
  )) {
    // Migrate the single existing record into the transactions array
    existing.transactions.push({
      monthlyIncome: { ...existing.monthlyIncome.toObject?.() || existing.monthlyIncome },
      monthlyExpenses: {
        workerWages: Number(existing.monthlyExpenses?.workerWages || 0),
        familyExpenses: Number(existing.monthlyExpenses?.familyExpenses || 0),
        otherMonthlyExpenses: Number(existing.monthlyExpenses?.otherMonthlyExpenses || 0),
      },
      label: 'Initial Entry',
      notes: '',
    })
  }

  if (transactionId) {
    // Edit an existing transaction
    const txIndex = existing.transactions.findIndex(t => String(t._id) === String(transactionId))
    if (txIndex === -1) return res.status(404).json({ message: 'Transaction not found' })
    existing.transactions[txIndex].monthlyIncome = txData.monthlyIncome
    existing.transactions[txIndex].monthlyExpenses = txData.monthlyExpenses
    existing.transactions[txIndex].label = txData.label
    existing.transactions[txIndex].notes = txData.notes
  } else {
    // Add a new transaction
    existing.transactions.push(txData)
  }

  // Recompute aggregated totals from all transactions
  const aggregates = recomputeEntryAggregates(existing)
  existing.monthlyIncome = aggregates.monthlyIncome
  existing.monthlyExpenses = {
    ...aggregates.monthlyExpenses,
    electricity: 0,
    maintenance: 0,
  }

  const totals = computeMonthlyTotals(existing)
  existing.computedSurplus = totals.totalBalance
  existing.availableSurplus = totals.totalBalance
  await existing.save()

  await recomputeMonthlySeries(userId, monthYear)

  const updatedEntry = await FinancialMonthlyEntry.findOne({
    user: userId, year: monthYear.year, month: monthYear.month,
  }).lean()

  res.json({ ...updatedEntry, totals: computeMonthlyTotals(updatedEntry) })
}

exports.listMonthlyEntries = async (req, res) => {
  const userId = ensureUserId(req)
  const year = Math.max(2000, Number(req.query.year || new Date().getFullYear()))
  const rows = await FinancialMonthlyEntry.find({ user: userId, year }).sort({ month: 1 }).lean()
  res.json(rows.map(row => ({ ...row, totals: computeMonthlyTotals(row) })))
}

exports.deleteMonthlyEntry = async (req, res) => {
  const userId = ensureUserId(req)
  const monthYear = parseMonthYear({ ...req.query, ...req.body })
  const transactionId = req.query?.transactionId || req.body?.transactionId || null

  if (transactionId) {
    // Delete a specific transaction; keep the monthly entry document
    const entry = await FinancialMonthlyEntry.findOne({ user: userId, year: monthYear.year, month: monthYear.month })
    if (!entry) return res.status(404).json({ message: 'Monthly entry not found' })
    const before = entry.transactions.length
    entry.transactions = entry.transactions.filter(t => String(t._id) !== String(transactionId))
    if (entry.transactions.length === before) return res.status(404).json({ message: 'Transaction not found' })

    // Recompute aggregates
    const aggregates = recomputeEntryAggregates(entry)
    entry.monthlyIncome = aggregates.monthlyIncome
    entry.monthlyExpenses = { ...aggregates.monthlyExpenses, electricity: 0, maintenance: 0 }
    const totals = computeMonthlyTotals(entry)
    entry.computedSurplus = totals.totalBalance
    entry.availableSurplus = totals.totalBalance
    await entry.save()
    await recomputeMonthlySeries(userId, monthYear)
    return res.json({ ok: true, transactionDeleted: true })
  }

  // Delete the entire monthly entry
  await FinancialMonthlyEntry.deleteOne({ user: userId, year: monthYear.year, month: monthYear.month })
  await recomputeMonthlySeries(userId, monthYear)
  res.json({ ok: true })
}

exports.listDebts = async (req, res) => {
  const userId = ensureUserId(req)
  const debts = await FinancialDebt.find({ user: userId }).sort({ createdAt: 1 }).lean()
  res.json(debts)
}

exports.createDebt = async (req, res) => {
  const userId = ensureUserId(req)
  const debt = await FinancialDebt.create({
    user: userId,
    ...normalizeDebtPayload(req.body),
  })
  res.status(201).json(debt)
}

exports.updateDebt = async (req, res) => {
  const userId = ensureUserId(req)
  const id = parseId(req.params.id)
  if (!id) return res.status(400).json({ message: 'Invalid debt id' })

  const existingDebt = await FinancialDebt.findOne({ _id: id, user: userId })
  if (!existingDebt) return res.status(404).json({ message: 'Debt not found' })

  const update = normalizeDebtPayload(req.body, existingDebt)

  if (update.status === 'closed') update.closedAt = new Date()

  const debt = await FinancialDebt.findOneAndUpdate(
    { _id: id, user: userId },
    { $set: update },
    { new: true }
  ).lean()

  res.json(debt)
}

exports.deleteDebt = async (req, res) => {
  const userId = ensureUserId(req)
  const id = parseId(req.params.id)
  if (!id) return res.status(400).json({ message: 'Invalid debt id' })

  await Promise.all([
    FinancialDebt.deleteOne({ _id: id, user: userId }),
    FinancialDebtPayment.deleteMany({ debt: id, user: userId }),
  ])

  res.json({ ok: true })
}

exports.createPayment = async (req, res) => {
  const userId = ensureUserId(req)
  const debtId = parseId(req.body?.debt)
  if (!debtId) return res.status(400).json({ message: 'Invalid debt id' })

  const debt = await FinancialDebt.findOne({ _id: debtId, user: userId })
  if (!debt) return res.status(404).json({ message: 'Debt not found' })

  const debtType = normalizeDebtType(debt.debtType)
  const isExtra = !!req.body?.isExtra
  const sourceOfFunds = 'surplus'
  const paymentDate = req.body?.date ? new Date(req.body.date) : new Date()
  const paymentMonth = Number(req.body?.month || (paymentDate.getMonth() + 1))
  const paymentYear = Number(req.body?.year || paymentDate.getFullYear())
  const beforeBalance = Number(debt.currentBalance || 0)
  const breakdown = derivePaymentBreakdown({ debt, payment: req.body, currentBalance: beforeBalance })
  const amountPaid = breakdown.amountPaid
  const interestPaid = breakdown.interestPaid
  const principalPaid = breakdown.principalPaid
  const extraPaymentAmount = breakdown.extraPaymentAmount
  const additionalCharges = breakdown.additionalCharges
  const monthlyInterest = breakdown.monthlyInterest
  let installmentsRemainingAfterPayment = Number(debt.remainingMonths || 0)

  if (isChitFund(debtType)) {
    const installmentAmount = Number(debt.monthlyInstallment || 0)
    const installmentsCovered = breakdown.installmentsCovered || (installmentAmount > 0 ? 1 : 0)
    debt.remainingMonths = Math.max(0, Number(debt.remainingMonths || 0) - installmentsCovered)
    installmentsRemainingAfterPayment = Number(debt.remainingMonths || 0)
    debt.currentBalance = Math.max(0, installmentAmount * installmentsRemainingAfterPayment)
  } else {
    debt.currentBalance = Math.max(0, beforeBalance - principalPaid)
  }

  if (
    (isChitFund(debtType) && Number(debt.remainingMonths || 0) <= 0) ||
    (!isChitFund(debtType) && Number(debt.currentBalance || 0) <= 0)
  ) {
    debt.status = 'closed'
    debt.closedAt = new Date()
  }
  await debt.save()

  const debtAfterPayment = debt?.toObject ? debt.toObject() : debt
  const nextExpectedInterest = isChitFund(debtType)
    ? 0
    : Number(monthlyInterestForDebt({ ...debtAfterPayment, currentBalance: Number(debt.currentBalance || 0) }) || 0)

  const payment = await FinancialDebtPayment.create({
    user: userId,
    debt: debt._id,
    debtType,
    debtNameSnapshot: debt.name,
    amountPaid,
    interestPaid,
    principalPaid,
    paymentType: String(req.body?.paymentType || 'interest_only'),
    emiAmount: 0,
    extraPaymentAmount,
    additionalCharges,
    monthlyInterestAtPayment: monthlyInterest,
    nextExpectedInterest,
    currentBalanceBeforePayment: beforeBalance,
    currentBalanceAfterPayment: Number(debt.currentBalance || 0),
    installmentsRemainingAfterPayment,
    sourceOfFunds,
    remainingBalanceAfterPayment: Number(debt.currentBalance || 0),
    month: paymentMonth,
    year: paymentYear,
    isExtra,
    date: paymentDate,
    notes: req.body?.notes || '',
  })

  await recomputeMonthlySeries(userId, { month: paymentMonth, year: paymentYear })

  res.status(201).json(payment)
}

exports.updatePayment = async (req, res) => {
  const userId = ensureUserId(req)
  const id = parseId(req.params.id)
  if (!id) return res.status(400).json({ message: 'Invalid payment id' })

  const payment = await FinancialDebtPayment.findOne({ _id: id, user: userId })
  if (!payment) return res.status(404).json({ message: 'Payment not found' })

  const oldMonth = Number(payment.month || 0)
  const oldYear = Number(payment.year || 0)
  const oldDebtId = String(payment.debt)

  const nextDebtId = parseId(req.body?.debt) || payment.debt
  const debt = await FinancialDebt.findOne({ _id: nextDebtId, user: userId })
  if (!debt) return res.status(404).json({ message: 'Debt not found' })

  const paymentDate = req.body?.date ? new Date(req.body.date) : new Date(payment.date)
  const paymentMonth = Number(req.body?.month || (paymentDate.getMonth() + 1))
  const paymentYear = Number(req.body?.year || paymentDate.getFullYear())
  const sourceOfFunds = 'surplus'
  const isExtra = typeof req.body?.isExtra === 'boolean' ? req.body.isExtra : !!payment.isExtra
  const breakdown = derivePaymentBreakdown({
    debt,
    payment: {
      ...payment.toObject(),
      ...req.body,
      isExtra,
    },
    currentBalance: Number(debt.currentBalance || 0),
  })
  const expectedBalanceAfterPayment = Math.max(0, Number(debt.currentBalance || 0) - Number(breakdown.principalPaid || 0))
  const nextExpectedInterest = isChitFund(normalizeDebtType(debt.debtType))
    ? 0
    : Number(monthlyInterestForDebt({ ...(debt.toObject ? debt.toObject() : debt), currentBalance: expectedBalanceAfterPayment }) || 0)

  payment.debt = debt._id
  payment.debtType = normalizeDebtType(debt.debtType)
  payment.debtNameSnapshot = debt.name
  payment.amountPaid = Number(breakdown.amountPaid || 0)
  payment.interestPaid = Number(breakdown.interestPaid || 0)
  payment.principalPaid = Number(breakdown.principalPaid || 0)
  payment.emiAmount = 0
  payment.extraPaymentAmount = Number(breakdown.extraPaymentAmount || 0)
  payment.additionalCharges = Number(breakdown.additionalCharges || 0)
  payment.monthlyInterestAtPayment = Number(breakdown.monthlyInterest || payment.monthlyInterestAtPayment || 0)
  payment.nextExpectedInterest = Number(nextExpectedInterest || 0)
  payment.sourceOfFunds = sourceOfFunds
  payment.month = paymentMonth
  payment.year = paymentYear
  payment.date = paymentDate
  payment.notes = req.body?.notes || payment.notes || ''
  payment.isExtra = isExtra
  payment.paymentType = String(req.body?.paymentType || payment.paymentType || 'interest_only')
  await payment.save()

  await recomputeDebtFromPayments(userId, debt._id)
  if (String(debt._id) !== oldDebtId) {
    await recomputeDebtFromPayments(userId, oldDebtId)
  }

  const startPeriod = (paymentYear < oldYear || (paymentYear === oldYear && paymentMonth < oldMonth))
    ? { month: paymentMonth, year: paymentYear }
    : { month: oldMonth, year: oldYear }
  await recomputeMonthlySeries(userId, startPeriod)

  res.json(payment)
}

exports.deletePayment = async (req, res) => {
  const userId = ensureUserId(req)
  const id = parseId(req.params.id)
  if (!id) return res.status(400).json({ message: 'Invalid payment id' })

  const payment = await FinancialDebtPayment.findOne({ _id: id, user: userId }).lean()
  if (!payment) return res.status(404).json({ message: 'Payment not found' })

  await FinancialDebtPayment.deleteOne({ _id: id, user: userId })
  await recomputeDebtFromPayments(userId, payment.debt)
  await recomputeMonthlySeries(userId, { month: Number(payment.month || 1), year: Number(payment.year || new Date().getFullYear()) })

  res.json({ ok: true })
}

exports.getDebtDetail = async (req, res) => {
  const userId = ensureUserId(req)
  const id = parseId(req.params.id)
  if (!id) return res.status(400).json({ message: 'Invalid debt id' })

  const [debt, payments, domain] = await Promise.all([
    FinancialDebt.findOne({ _id: id, user: userId }).lean(),
    FinancialDebtPayment.find({ user: userId, debt: id }).sort({ date: -1 }).lean(),
    loadDomain(userId),
  ])

  if (!debt) return res.status(404).json({ message: 'Debt not found' })

  const calc = buildFinancialIntelligence(domain)
  const debtRow = calc.debts.find(d => String(d._id) === String(id)) || null

  res.json({
    debt: debtRow,
    paymentHistory: payments,
    expectedClosure: calc.forecast?.debtFreeDate || null,
    charts: {
      trend: payments.slice().reverse().map((p, index) => ({
        period: index + 1,
        amountPaid: Number(p.amountPaid || 0),
        interestPaid: Number(p.interestPaid || 0),
        principalPaid: Number(p.principalPaid || 0),
      })),
    },
  })
}

exports.getReports = async (req, res) => {
  const userId = ensureUserId(req)
  const monthYear = parseMonthYear(req.query)
  const domain = await loadDomain(userId)
  const monthlyEntry = await findMonthlyEntry(userId, monthYear)
  const effectiveMonthlyEntry = monthlyEntry || buildDefaultMonthlyEntry(monthYear, domain.profile)
  const calc = buildFinancialIntelligence({ ...domain, profile: buildMonthProfile(domain.profile, effectiveMonthlyEntry) })
  const yearlyAnalysis = await buildYearlyAnalysis(userId, monthYear.year)

  res.json({
    monthlyFinancialReport: {
      income: calc.summary.income,
      expenses: calc.summary.expenses,
      debtPayments: calc.summary.debtPayments,
      remainingCash: calc.summary.remainingCash,
      health: calc.summary.health,
    },
    debtReport: calc.debtCenterRows,
    debtReductionReport: {
      debtReductionPct: calc.summary.debtReductionPct,
      velocity: calc.charts.velocity,
    },
    interestReport: calc.charts.interestLeakage,
    forecastReport: calc.forecast,
    cashFlowReport: calc.charts.cashFlow,
    yearlyAnalysis,
  })
}
