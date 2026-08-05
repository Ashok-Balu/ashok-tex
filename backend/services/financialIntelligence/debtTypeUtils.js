const TYPE_ALIAS_MAP = {
  auto_loan: 'vehicle_loan',
  od_account: 'business_loan',
  rani_loan: 'friends_family_loan',
  chit: 'chit_fund',
  gold_loan: 'jewelry_loan',
  jewel_loan: 'jewelry_loan',
}

function normalizeDebtType(type) {
  const raw = String(type || '').trim().toLowerCase()
  return TYPE_ALIAS_MAP[raw] || raw
}

function isVehicleLoan(type) {
  return normalizeDebtType(type) === 'vehicle_loan'
}

function isBusinessLoan(type) {
  return normalizeDebtType(type) === 'business_loan'
}

function isFriendsFamilyLoan(type) {
  return normalizeDebtType(type) === 'friends_family_loan'
}

function isChitFund(type) {
  return normalizeDebtType(type) === 'chit_fund'
}

function isJewelryLoan(type) {
  return normalizeDebtType(type) === 'jewelry_loan'
}

function isInterestOnlyDebt(type) {
  const normalized = normalizeDebtType(type)
  return normalized === 'business_loan' || normalized === 'friends_family_loan' || normalized === 'jewelry_loan'
}

module.exports = {
  normalizeDebtType,
  isVehicleLoan,
  isBusinessLoan,
  isFriendsFamilyLoan,
  isChitFund,
  isJewelryLoan,
  isInterestOnlyDebt,
}