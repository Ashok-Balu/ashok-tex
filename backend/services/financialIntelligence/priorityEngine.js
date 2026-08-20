const { monthlyInterestForDebt, toNumber } = require('./interestEngine')
const { normalizeDebtType, isChitFund } = require('./debtTypeUtils')

function resolvePriority(debts = [], priorityOrder = []) {
  const orderMap = new Map((priorityOrder || []).map((name, index) => [String(name || '').trim().toLowerCase(), index]))

  const ranked = debts
    .filter(d => d.status !== 'closed')
    .map((debt) => {
      const key = String(debt.name || '').trim().toLowerCase()
      const rank = orderMap.has(key) ? orderMap.get(key) : Number.MAX_SAFE_INTEGER
      return {
        ...debt,
        debtType: normalizeDebtType(debt.debtType),
        priorityRank: rank,
        monthlyInterest: monthlyInterestForDebt(debt),
      }
    })
    .sort((a, b) => {
      if (a.priorityRank !== b.priorityRank) return a.priorityRank - b.priorityRank
      return toNumber(b.monthlyInterest) - toNumber(a.monthlyInterest)
    })

  const currentTarget = ranked.find(d => {
    if (isChitFund(d.debtType)) return toNumber(d.remainingMonths) > 0
    if (d.debtType === 'current_bill') return false
    return toNumber(d.currentBalance) > 0
  }) || null

  return {
    ranked,
    currentTarget,
  }
}

module.exports = { resolvePriority }
