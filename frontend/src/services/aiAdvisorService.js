import api from '@/plugins/axios'

/**
 * @typedef {Object} AllocationPlanRow
 * @property {string} debtName
 * @property {number} allocationAmount
 * @property {string} reason
 */

/**
 * @typedef {Object} AIAdvisorInsights
 * @property {number} financialHealthScore
 * @property {string} overallAssessment
 * @property {string[]} spendingInsights
 * @property {string[]} debtInsights
 * @property {string[]} savingsOpportunities
 * @property {string[]} riskWarnings
 * @property {string[]} recommendedActions
 * @property {{ method: string, reason: string, allocationPlan: AllocationPlanRow[] }} debtPayoffStrategy
 * @property {{ estimatedDebtFreeDate: string, estimatedInterestSavings: number }} forecast
 */

const EMPTY_INSIGHTS = {
  financialHealthScore: 0,
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
}

function toNumber(value) {
  const parsed = Number(value || 0)
  return Number.isFinite(parsed) ? parsed : 0
}

function normalizeTextArray(value) {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => {
      if (typeof item === 'string') return item.trim()
      if (item && typeof item === 'object') {
        return String(item.message || item.reason || item.title || item.text || '').trim()
      }
      return ''
    })
    .filter(Boolean)
}

function normalizeAllocationPlan(value) {
  if (!Array.isArray(value)) return []
  return value
    .map((row) => ({
      debtName: String(row?.debtName || row?.name || '').trim(),
      allocationAmount: Math.max(0, toNumber(row?.allocationAmount || row?.amount || 0)),
      reason: String(row?.reason || '').trim(),
    }))
    .filter((row) => row.debtName)
}

export function normalizeAIAdvisorInsights(payload = {}) {
  /** @type {AIAdvisorInsights} */
  return {
    financialHealthScore: Math.max(0, Math.min(100, Math.round(toNumber(payload.financialHealthScore)))),
    overallAssessment: String(payload.overallAssessment || '').trim(),
    spendingInsights: normalizeTextArray(payload.spendingInsights),
    debtInsights: normalizeTextArray(payload.debtInsights),
    savingsOpportunities: normalizeTextArray(payload.savingsOpportunities),
    riskWarnings: normalizeTextArray(payload.riskWarnings),
    recommendedActions: normalizeTextArray(payload.recommendedActions),
    debtPayoffStrategy: {
      method: String(payload?.debtPayoffStrategy?.method || '').trim(),
      reason: String(payload?.debtPayoffStrategy?.reason || '').trim(),
      allocationPlan: normalizeAllocationPlan(payload?.debtPayoffStrategy?.allocationPlan),
    },
    forecast: {
      estimatedDebtFreeDate: String(payload?.forecast?.estimatedDebtFreeDate || '').trim(),
      estimatedInterestSavings: Math.max(0, toNumber(payload?.forecast?.estimatedInterestSavings)),
    },
  }
}

export function isAIAdvisorInsightsValid(payload = {}) {
  const normalized = normalizeAIAdvisorInsights(payload)
  return Boolean(
    normalized.overallAssessment
    && normalized.recommendedActions.length
    && normalized.debtPayoffStrategy.method
  )
}

export function getEmptyAIAdvisorInsights() {
  return { ...EMPTY_INSIGHTS }
}

export async function generateAIAdvisorInsights(payload = {}) {
  const { data } = await api.post('/financial-intelligence/ai-insights', payload)
  const normalized = normalizeAIAdvisorInsights(data)

  if (!isAIAdvisorInsightsValid(normalized)) {
    const error = new Error('AI response validation failed')
    error.code = 'INVALID_SCHEMA'
    throw error
  }

  return {
    ...data,
    ...normalized,
  }
}
