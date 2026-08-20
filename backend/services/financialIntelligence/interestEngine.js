const {
  normalizeDebtType,
  isVehicleLoan,
  isInterestOnlyDebt,
  isChitFund,
} = require('./debtTypeUtils')

function toNumber(value) {
  const n = Number(value || 0)
  return Number.isFinite(n) ? n : 0
}

function resolveMonthlyRate(debt = {}) {
  const balance = Math.max(0, toNumber(debt?.currentBalance))
  const rate = toNumber(debt?.interestRate)
  if (rate > 0) return rate / 100 / 12

  const explicitMonthlyInterest = Math.max(
    toNumber(debt?.currentMonthlyInterest),
    toNumber(debt?.monthlyInterest),
    toNumber(debt?.interestComponent)
  )
  const basePrincipal = Math.max(toNumber(debt?.originalAmount), balance)
  if (basePrincipal > 0 && explicitMonthlyInterest > 0) {
    return explicitMonthlyInterest / basePrincipal
  }

  return 0
}

function monthlyInterestForDebt(debt) {
  const debtType = normalizeDebtType(debt?.debtType)
  const balance = toNumber(debt?.currentBalance)

  if (debtType === 'current_bill') return toNumber(debt?.monthlyAmount)
  if (isChitFund(debtType)) return 0

  if (isVehicleLoan(debtType) || isInterestOnlyDebt(debtType)) {
    return balance * resolveMonthlyRate(debt)
  }

  return 0
}

function minimumMonthlyPaymentForDebt(debt) {
  const debtType = normalizeDebtType(debt?.debtType)

  if (debtType === 'current_bill') return toNumber(debt?.monthlyAmount)
  if (isVehicleLoan(debtType)) {
    const emi = toNumber(debt?.emi)
    if (emi > 0) return emi
    const monthlyAmount = toNumber(debt?.monthlyAmount)
    if (monthlyAmount > 0) return monthlyAmount
    return toNumber(debt?.interestComponent) + toNumber(debt?.principalComponent)
  }
  if (isInterestOnlyDebt(debtType)) return monthlyInterestForDebt(debt)
  if (isChitFund(debtType)) return toNumber(debt?.monthlyInstallment)

  return 0
}

module.exports = {
  toNumber,
  monthlyInterestForDebt,
  minimumMonthlyPaymentForDebt,
}
