const { minimumMonthlyPaymentForDebt, monthlyInterestForDebt, toNumber } = require('./interestEngine')
const { resolvePriority } = require('./priorityEngine')
const {
  normalizeDebtType,
  isVehicleLoan,
  isInterestOnlyDebt,
  isChitFund,
} = require('./debtTypeUtils')

function cloneDebt(debt) {
  return {
    ...debt,
    debtType: normalizeDebtType(debt?.debtType),
    currentBalance: toNumber(debt.currentBalance),
    remainingMonths: toNumber(debt.remainingMonths),
    status: debt.status || 'active',
    closureMonthIndex: null,
  }
}

function addMonths(baseDate, monthsToAdd) {
  const d = new Date(baseDate)
  d.setMonth(d.getMonth() + monthsToAdd)
  return d
}

function monthlyIncomeTotal(profile = {}) {
  const src = profile.monthlyIncome || {}
  return toNumber(src.powerloomIncome) + toNumber(src.ashokContribution) + toNumber(src.rentalIncome)
}

function monthlyExpenseTotal(profile = {}) {
  const weekly = profile.weeklyExpenses || {}
  const monthly = profile.monthlyExpenses || {}

  const legacyWorkerWages = toNumber(weekly.workerWages) * 4.33
  const legacyFamilyExpenses = toNumber(weekly.familyExpenses) * 4.33
  const legacyOtherMonthly = toNumber(monthly.electricity) + toNumber(monthly.maintenance)

  const workerWages = monthly.workerWages == null ? legacyWorkerWages : toNumber(monthly.workerWages)
  const familyExpenses = monthly.familyExpenses == null ? legacyFamilyExpenses : toNumber(monthly.familyExpenses)
  const otherMonthlyExpenses = monthly.otherMonthlyExpenses == null
    ? legacyOtherMonthly
    : toNumber(monthly.otherMonthlyExpenses)

  return workerWages + familyExpenses + otherMonthlyExpenses
}

function debtActiveForClosure(debt) {
  if (debt.status === 'closed') return false
  if (debt.debtType === 'current_bill') return false
  if (isChitFund(debt.debtType)) return toNumber(debt.remainingMonths) > 0
  return toNumber(debt.currentBalance) > 0
}

function simulateForecast({ profile, debts, horizonMonths = 600 }) {
  const now = new Date()
  const debtState = (debts || []).map(cloneDebt)
  const priorityOrder = profile?.priorityOrder || []

  const income = monthlyIncomeTotal(profile)
  const expenses = monthlyExpenseTotal(profile)
  const minDebtPayments = debtState.reduce((sum, d) => sum + minimumMonthlyPaymentForDebt(d), 0)
  const baseSurplus = income - expenses - minDebtPayments
  const extraPool = Math.max(0, Math.max(0, baseSurplus))

  const totalDebtSeries = []
  const monthlyCashFlow = []
  const closureMap = {}
  let interestLeakageMonthly = 0
  let interestLeakageYearly = 0
  let interestLeakageLifetime = 0

  for (let month = 0; month < horizonMonths; month += 1) {
    const active = debtState.filter(debtActiveForClosure)
    if (!active.length) break

    let monthInterestLeakage = 0
    const monthlyReductionStart = debtState.reduce((sum, d) => {
      if (isChitFund(d.debtType)) return sum + (toNumber(d.monthlyInstallment) * toNumber(d.remainingMonths))
      return sum + toNumber(d.currentBalance)
    }, 0)

    for (const debt of debtState) {
      if (debt.status === 'closed') continue

      const minPayment = minimumMonthlyPaymentForDebt(debt)
      const monthlyInterest = monthlyInterestForDebt(debt)
      monthInterestLeakage += monthlyInterest

      if (isVehicleLoan(debt.debtType) && debt.currentBalance > 0) {
        const principalFromEmi = Math.max(0, minPayment - monthlyInterest)
        debt.currentBalance = Math.max(0, debt.currentBalance - principalFromEmi)
        if (debt.currentBalance <= 0 && debt.closureMonthIndex === null) {
          debt.closureMonthIndex = month + 1
          debt.status = 'closed'
        }
      }

      if (isChitFund(debt.debtType) && debt.remainingMonths > 0) {
        debt.remainingMonths = Math.max(0, debt.remainingMonths - 1)
        if (debt.remainingMonths <= 0 && debt.closureMonthIndex === null) {
          debt.closureMonthIndex = month + 1
          debt.status = 'closed'
        }
      }
    }

    let extraRemaining = extraPool
    const openReducible = debtState.filter(d => d.status !== 'closed' && (isInterestOnlyDebt(d.debtType) || isVehicleLoan(d.debtType)) && toNumber(d.currentBalance) > 0)

    if (openReducible.length && extraRemaining > 0) {
      const prioritized = resolvePriority(openReducible, priorityOrder).ranked
      for (const debt of prioritized) {
        if (extraRemaining <= 0) break
        const applied = Math.min(extraRemaining, debt.currentBalance)
        debt.currentBalance = Math.max(0, debt.currentBalance - applied)
        extraRemaining -= applied
        if (debt.currentBalance <= 0 && debt.closureMonthIndex === null) {
          debt.closureMonthIndex = month + 1
          debt.status = 'closed'
        }
      }
    }

    const monthlyReductionEnd = debtState.reduce((sum, d) => {
      if (isChitFund(d.debtType)) return sum + (toNumber(d.monthlyInstallment) * toNumber(d.remainingMonths))
      return sum + toNumber(d.currentBalance)
    }, 0)

    totalDebtSeries.push({
      month: month + 1,
      date: addMonths(now, month + 1),
      totalDebt: Number(monthlyReductionEnd.toFixed(2)),
      reduction: Number((monthlyReductionStart - monthlyReductionEnd).toFixed(2)),
    })

    const totalDebtPayment = minDebtPayments + extraPool
    monthlyCashFlow.push({
      month: month + 1,
      date: addMonths(now, month + 1),
      income,
      expenses,
      debtPayments: totalDebtPayment,
      surplus: Math.max(0, income - expenses - totalDebtPayment),
    })

    interestLeakageLifetime += monthInterestLeakage
    if (month === 0) interestLeakageMonthly = monthInterestLeakage
    if (month < 12) interestLeakageYearly += monthInterestLeakage
  }

  for (const debt of debtState) {
    if (debt.closureMonthIndex !== null) {
      closureMap[debt.name] = addMonths(now, debt.closureMonthIndex)
    }
  }

  const allClosedMonth = totalDebtSeries.find(row => row.totalDebt <= 0)?.month || null
  const debtFreeDate = allClosedMonth ? addMonths(now, allClosedMonth) : null
  const debtFreeReason = debtFreeDate
    ? ''
    : (minDebtPayments <= 0 && extraPool <= 0)
      ? 'Insufficient payment data to calculate.'
      : 'Current payment pace does not clear debt within the forecast horizon.'

  return {
    income,
    expenses,
    minDebtPayments,
    baseSurplus,
    extraPool,
    debtFreeDate,
    debtFreeReason,
    closureMap,
    totalDebtSeries,
    monthlyCashFlow,
    interestLeakage: {
      monthly: Number(interestLeakageMonthly.toFixed(2)),
      yearly: Number(interestLeakageYearly.toFixed(2)),
      lifetime: Number(interestLeakageLifetime.toFixed(2)),
    },
  }
}

module.exports = {
  monthlyIncomeTotal,
  monthlyExpenseTotal,
  simulateForecast,
}
