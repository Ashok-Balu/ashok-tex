const { toNumber, monthlyInterestForDebt } = require('./interestEngine')
const { normalizeDebtType, isBusinessLoan, isFriendsFamilyLoan } = require('./debtTypeUtils')

function healthBand(score) {
  if (score < 35) return 'Poor'
  if (score < 60) return 'Average'
  if (score < 80) return 'Good'
  return 'Excellent'
}

function calculateHealthScore({ debtReductionPct = 0, expenseControlPct = 0, paymentConsistencyPct = 0, surplus = 0, income = 0 }) {
  const surplusPct = income > 0 ? Math.max(0, Math.min(100, (toNumber(surplus) / toNumber(income)) * 100)) : 0
  const score = Math.round(
    (toNumber(debtReductionPct) * 0.35) +
    (toNumber(expenseControlPct) * 0.2) +
    (toNumber(paymentConsistencyPct) * 0.25) +
    (surplusPct * 0.2)
  )

  return {
    score: Math.max(0, Math.min(100, score)),
    band: healthBand(score),
  }
}

function buildRecommendations({ currentTarget, forecastBase, forecastWithSurplus, debts = [] }) {
  const recommendations = []
  const alerts = []

  if (currentTarget) {
    recommendations.push({
      type: 'target',
      message: `Current target debt is ${currentTarget.name}. Prioritize all extra surplus here.`
    })
  }

  if (forecastBase?.debtFreeDate && forecastWithSurplus?.debtFreeDate) {
    const monthsBase = forecastBase.totalDebtSeries.length
    const monthsExtra = forecastWithSurplus.totalDebtSeries.length
    const monthsSaved = Math.max(0, monthsBase - monthsExtra)
    if (monthsSaved > 0) {
      recommendations.push({
        type: 'simulation',
        message: `Extra payment strategy can improve debt-free timeline by ${monthsSaved} month(s).`,
        monthsSaved,
      })
    }
  }

  for (const debt of debts) {
    const debtType = normalizeDebtType(debt.debtType)

    if (isBusinessLoan(debtType) && toNumber(debt.currentBalance) > 0 && toNumber(debt.currentBalance) < 500000) {
      recommendations.push({
        type: 'od-close',
        message: `${debt.name} is below Rs.5 lakh. Closing it quickly will reduce monthly interest leakage.`,
      })
    }

    const monthlyInterest = monthlyInterestForDebt(debt)
    if ((isBusinessLoan(debtType) || isFriendsFamilyLoan(debtType)) && monthlyInterest > 0) {
      alerts.push({
        type: 'interest',
        message: `${debt.name} is leaking about Rs.${Math.round(monthlyInterest).toLocaleString('en-IN')} interest per month.`
      })
    }
  }

  return { recommendations, alerts }
}

module.exports = {
  calculateHealthScore,
  buildRecommendations,
}
