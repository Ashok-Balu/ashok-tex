export function formatIndianNumber(value) {
  const numeric = Number(value || 0)
  if (!Number.isFinite(numeric)) return '0'
  return numeric.toLocaleString('en-IN', { maximumFractionDigits: 0 })
}

export function formatIndianCurrency(value) {
  const numeric = Number(value || 0)
  if (!Number.isFinite(numeric)) return '\u20B90'
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(numeric)
}

export function parseCurrencyInput(value) {
  const cleaned = String(value || '').replace(/[^\d.-]/g, '')
  const numeric = Number(cleaned || 0)
  return Number.isFinite(numeric) ? numeric : 0
}