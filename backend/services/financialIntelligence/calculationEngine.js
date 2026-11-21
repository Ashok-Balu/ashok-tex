const { toNumber, monthlyInterestForDebt, minimumMonthlyPaymentForDebt } = require('./interestEngine')
const { resolvePriority } = require('./priorityEngine')
const { simulateForecast, monthlyIncomeTotal, monthlyExpenseTotal } = require('./forecastEngine')
const { calculateHealthScore } = require('./recommendationEngine')
const { normalizeDebtType, isChitFund } = require('./debtTypeUtils')

function computeDebtSnapshots(debts = [], paymentMap = new Map()) {
  return debts.map((debt) => {
    const key = String(debt._id)
    const payments = paymentMap.get(key) || []

    const amountPaid = payments.reduce((sum, p) => sum + toNumber(p.amountPaid), 0)
    const interestPaid = payments.reduce((sum, p) => sum + toNumber(p.interestPaid), 0)
    const principalPaid = payments.reduce((sum, p) => sum + toNumber(p.principalPaid), 0)

    const originalAmount = toNumber(debt.originalAmount)
    const currentBalance = toNumber(debt.currentBalance)
    const chitCommitment = toNumber(debt.monthlyInstallment) * toNumber(debt.remainingMonths)
    const normalizedType = normalizeDebtType(debt.debtType)
    const effectiveBalance = isChitFund(normalizedType) ? chitCommitment : currentBalance
    const effectiveOriginal = isChitFund(normalizedType)
      ? Math.max(chitCommitment, originalAmount)
      : Math.max(originalAmount, currentBalance)
    const reductionPct = effectiveOriginal > 0 ? ((effectiveOriginal - effectiveBalance) / effectiveOriginal) * 100 : 0

    let expectedClosure = null
    if (isChitFund(normalizedType) && toNumber(debt.remainingMonths) > 0) {
      expectedClosure = new Date(new Date().setMonth(new Date().getMonth() + toNumber(debt.remainingMonths)))
    }

    return {
      ...debt,
      debtType: normalizedType,
      amountPaid: Number(amountPaid.toFixed(2)),
      interestPaid: Number(interestPaid.toFixed(2)),
      principalPaid: Number(principalPaid.toFixed(2)),
      monthlyInterest: Number(monthlyInterestForDebt(debt).toFixed(2)),
      monthlyPayment: Number(minimumMonthlyPaymentForDebt(debt).toFixed(2)),
      effectiveBalance: Number(effectiveBalance.toFixed(2)),
      reductionPct: Number(Math.max(0, reductionPct).toFixed(2)),
      expectedClosure,
      progress: Number(Math.max(0, Math.min(100, reductionPct)).toFixed(2)),
      status: debt.status || 'active',
    }
  })
}

function buildPaymentMap(payments = []) {
  const map = new Map()
  for (const payment of payments) {
    const key = String(payment.debt)
    const row = map.get(key) || []
    row.push(payment)
    map.set(key, row)
  }
  return map
}

function buildFinancialIntelligence({ profile, debts, payments }) {
  const paymentMap = buildPaymentMap(payments)
  const debtSnapshots = computeDebtSnapshots(debts, paymentMap)
  const { ranked, currentTarget } = resolvePriority(debtSnapshots, profile?.priorityOrder || [])

  const income = monthlyIncomeTotal(profile)
  const expenses = monthlyExpenseTotal(profile)
  const debtPaymentTotal = ranked.reduce((sum, d) => sum + toNumber(d.monthlyPayment), 0)
  const remainingCash = income - expenses - debtPaymentTotal

  const forecastBase = simulateForecast({ profile, debts: ranked })

  const totalDebt = ranked.reduce((sum, d) => {
    if (isChitFund(d.debtType)) return sum + (toNumber(d.monthlyInstallment) * toNumber(d.remainingMonths))
    return sum + toNumber(d.currentBalance)
  }, 0)

  const originalDebt = ranked.reduce((sum, d) => {
    if (isChitFund(d.debtType)) return sum + (toNumber(d.monthlyInstallment) * toNumber(d.remainingMonths))
    return sum + toNumber(d.originalAmount || d.currentBalance)
  }, 0)

  const debtReductionPct = originalDebt > 0 ? ((originalDebt - totalDebt) / originalDebt) * 100 : 0
  const expenseControlPct = income > 0 ? Math.max(0, 100 - ((expenses / income) * 100)) : 0
  const paymentConsistencyPct = ranked.length
    ? (ranked.filter(d => toNumber(d.monthlyPayment) > 0).length / ranked.length) * 100
    : 0

  const health = calculateHealthScore({
    debtReductionPct,
    expenseControlPct,
    paymentConsistencyPct,
    surplus: remainingCash,
    income,
  })

  const ai = {
    financialHealthScore: health.score,
    overallAssessment: '',
    spendingInsights: [],
    debtInsights: [],
    savingsOpportunities: [],
    riskWarnings: [],
    recommendedActions: [],
    debtPayoffStrategy: {
      method: '',
      reason: '',
      allocationPlan: [],
    },
    forecast: {
      estimatedDebtFreeDate: '',
      estimatedInterestSavings: 0,
    },
    source: 'not_generated',
    requiresRegeneration: true,
  }

  const debtCenterRows = ranked.map((debt, index) => ({
    debtId: debt._id,
    debtName: debt.name,
    debtType: debt.debtType,
    currentBalance: debt.effectiveBalance,
    monthlyPayment: debt.monthlyPayment,
    interest: debt.monthlyInterest,
    remainingMonths: debt.remainingMonths || null,
    priority: index + 1,
    status: debt.status,
    progress: debt.progress,
    expectedClosure: forecastBase.closureMap[debt.name] || debt.expectedClosure || null,
  }))

  const debtComposition = ranked.map(debt => ({
    name: debt.name,
    value: isChitFund(debt.debtType)
      ? toNumber(debt.monthlyInstallment) * toNumber(debt.remainingMonths)
      : toNumber(debt.currentBalance),
  }))

  const priorityFunnel = ranked.map((debt, index) => ({
    stage: index + 1,
    debtName: debt.name,
    value: isChitFund(debt.debtType)
      ? toNumber(debt.monthlyInstallment) * toNumber(debt.remainingMonths)
      : toNumber(debt.currentBalance),
  }))

  const velocity = forecastBase.totalDebtSeries.length
    ? forecastBase.totalDebtSeries.reduce((sum, m) => sum + toNumber(m.reduction), 0) / forecastBase.totalDebtSeries.length
    : 0

  return {
    profile,
    debtCenterRows,
    debts: ranked,
    currentTarget,
    summary: {
      income,
      expenses,
      debtPayments: debtPaymentTotal,
      remainingCash,
      totalDebt,
      debtReductionPct: Number(debtReductionPct.toFixed(2)),
      health,
    },
    ai,
    charts: {
      burnDown: forecastBase.totalDebtSeries,
      composition: debtComposition,
      priorityFunnel,
      cashFlow: forecastBase.monthlyCashFlow,
      expenseBreakdown: [
        {
          name: 'Worker Wages',
          value: profile?.monthlyExpenses?.workerWages == null
            ? toNumber(profile?.weeklyExpenses?.workerWages) * 4.33
            : toNumber(profile?.monthlyExpenses?.workerWages),
        },
        {
          name: 'Family Expenses',
          value: profile?.monthlyExpenses?.familyExpenses == null
            ? toNumber(profile?.weeklyExpenses?.familyExpenses) * 4.33
            : toNumber(profile?.monthlyExpenses?.familyExpenses),
        },
        {
          name: 'Other Monthly Expenses',
          value: profile?.monthlyExpenses?.otherMonthlyExpenses == null
            ? (toNumber(profile?.monthlyExpenses?.electricity) + toNumber(profile?.monthlyExpenses?.maintenance))
            : toNumber(profile?.monthlyExpenses?.otherMonthlyExpenses),
        },
      ],
      velocity: {
        averageMonthlyReduction: Number(velocity.toFixed(2)),
        currentTrend: Number(velocity.toFixed(2)),
        targetTrend: Number((velocity * 1.2).toFixed(2)),
      },
      timeline: ranked.map((debt) => ({
        debtName: debt.name,
        closureDate: forecastBase.closureMap[debt.name] || null,
      })),
      interestLeakage: {
        byDebt: ranked.map(d => ({ name: d.name, value: d.monthlyInterest })),
        ...forecastBase.interestLeakage,
      },
    },
    forecast: {
      debtFreeDate: forecastBase.debtFreeDate,
      debtFreeReason: forecastBase.debtFreeReason || '',
      remainingDebt: forecastBase.totalDebtSeries.at(-1)?.totalDebt || 0,
    },
  }
}

module.exports = {
  buildFinancialIntelligence,
}
