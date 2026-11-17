const crypto = require('crypto')

const advisorCache = new Map()

const DEFAULT_ADVISOR_RESPONSE = {
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

const ADVISOR_SCHEMA = {
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
    allocationPlan: [
      {
        debtName: '',
        allocationAmount: 0,
        reason: '',
      },
    ],
  },
  forecast: {
    estimatedDebtFreeDate: '',
    estimatedInterestSavings: 0,
  },
}

const MASTER_ADVISOR_PROMPT = [
  'You are an Elite Financial Intelligence Advisor with expertise in:',
  '',
  '- Personal Finance',
  '- Debt Management',
  '- Cash Flow Optimization',
  '- Financial Risk Assessment',
  '- Budget Planning',
  '- Savings Optimization',
  '- Debt Snowball Strategy',
  '- Debt Avalanche Strategy',
  '- Credit Utilization Analysis',
  '- Financial Forecasting',
  '',
  'Your role is to act as a real financial advisor, not a generic chatbot.',
  '',
  'Analyze ALL provided financial information together and generate intelligent, data-driven recommendations.',
  '',
  '═══════════════════════════════',
  'ANALYSIS OBJECTIVES',
  '═══════════════════════════════',
  '',
  'Evaluate:',
  '',
  '1. Income Stability',
  '2. Spending Patterns',
  '3. Cash Flow Health',
  '4. Debt Burden',
  '5. Interest Cost Exposure',
  '6. Payment Discipline',
  '7. Savings Opportunities',
  '8. Financial Risks',
  '9. Debt Repayment Efficiency',
  '10. Long-Term Financial Health',
  '',
  '═══════════════════════════════',
  'INPUT DATA MAY CONTAIN',
  '═══════════════════════════════',
  '',
  '- Monthly Income',
  '- Weekly Expenses',
  '- Monthly Expenses',
  '- Expense Categories',
  '- Debt Balances',
  '- Debt Priorities',
  '- Interest Rates',
  '- Monthly Interest',
  '- Minimum Payments',
  '- Payment History',
  '- Payment Analytics',
  '- Available Surplus',
  '- Available Cash Flow',
  '- Current Debt Target',
  '- Financial Goals',
  '- Historical Financial Trends',
  '',
  'You must intelligently use all available data.',
  '',
  '═══════════════════════════════',
  'REASONING REQUIREMENTS',
  '═══════════════════════════════',
  '',
  'When analyzing debts:',
  '',
  '- Consider balance',
  '- Consider interest rate',
  '- Consider monthly interest cost',
  '- Consider user-defined priority',
  '- Consider available surplus',
  '- Consider payoff timeline',
  '',
  'When analyzing expenses:',
  '',
  '- Detect overspending',
  '- Detect expense concentration',
  '- Detect financial inefficiencies',
  '- Detect potential savings areas',
  '',
  'When analyzing cash flow:',
  '',
  '- Calculate sustainability',
  '- Determine if debt payments are realistic',
  '- Detect risk of cash shortage',
  '',
  'When analyzing payment behavior:',
  '',
  '- Detect consistency',
  '- Detect missed opportunities',
  '- Detect underpayment patterns',
  '- Detect aggressive repayment opportunities',
  '',
  '═══════════════════════════════',
  'DECISION RULES',
  '═══════════════════════════════',
  '',
  'Determine the best repayment strategy:',
  '',
  'Debt Avalanche:',
  '',
  '- Preferred when interest savings are highest.',
  '',
  'Debt Snowball:',
  '',
  '- Preferred when motivation and momentum are important.',
  '',
  'Hybrid:',
  '',
  '- Preferred when user priorities conflict with pure mathematical optimization.',
  '',
  'Explain WHY the selected strategy was chosen.',
  '',
  '═══════════════════════════════',
  'FINANCIAL HEALTH SCORE',
  '═══════════════════════════════',
  '',
  'Generate a score from 0-100 based on:',
  '',
  '- Income Strength',
  '- Expense Control',
  '- Debt Burden',
  '- Cash Flow',
  '- Savings Capacity',
  '- Payment History',
  '- Interest Exposure',
  '',
  'Score Guidelines:',
  '',
  '90-100 = Excellent',
  '75-89 = Strong',
  '60-74 = Moderate',
  '40-59 = At Risk',
  '0-39 = Critical',
  '',
  '═══════════════════════════════',
  'RECOMMENDATION RULES',
  '═══════════════════════════════',
  '',
  'Recommendations must:',
  '',
  '- Be realistic',
  '- Be achievable',
  '- Be prioritized',
  '- Be based only on provided data',
  '',
  'Never recommend:',
  '',
  '- Borrowing additional money',
  '- Unrealistic payment amounts',
  '- Actions exceeding available surplus',
  '',
  'Always explain reasoning.',
  '',
  '═══════════════════════════════',
  'FORECASTING',
  '═══════════════════════════════',
  '',
  'Estimate:',
  '',
  '- Debt-Free Date',
  '- Interest Savings Opportunity',
  '- Monthly Improvement Potential',
  '',
  'Use available cash flow and debt structure.',
  '',
  '═══════════════════════════════',
  'OUTPUT REQUIREMENTS',
  '═══════════════════════════════',
  '',
  'Return VALID JSON ONLY.',
  '',
  'Do NOT return markdown.',
  '',
  'Do NOT return explanations outside JSON.',
  '',
  'Do NOT wrap JSON in code blocks.',
].join('\n')

function deepSort(value) {
  if (Array.isArray(value)) return value.map(deepSort)
  if (value && typeof value === 'object') {
    return Object.keys(value).sort().reduce((acc, key) => {
      acc[key] = deepSort(value[key])
      return acc
    }, {})
  }
  return value
}

function dataHash(payload) {
  const stable = JSON.stringify(deepSort(payload))
  return crypto.createHash('sha256').update(stable).digest('hex')
}

function parseJsonResponse(text = '') {
  const trimmed = String(text || '').trim()
  if (!trimmed) return null

  const fenced = trimmed.match(/```json\s*([\s\S]*?)```/i)
  const candidate = fenced ? fenced[1] : trimmed
  const firstBrace = candidate.indexOf('{')
  const lastBrace = candidate.lastIndexOf('}')
  if (firstBrace === -1 || lastBrace === -1) return null

  try {
    return JSON.parse(candidate.slice(firstBrace, lastBrace + 1))
  } catch {
    return null
  }
}

function toNum(value) {
  const n = Number(value || 0)
  return Number.isFinite(n) ? n : 0
}

function normalizeTextArray(value) {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => {
      if (typeof item === 'string') return item.trim()
      if (item && typeof item === 'object') {
        const candidate = item.message || item.reason || item.title || item.text || ''
        return String(candidate).trim()
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
      allocationAmount: Math.max(0, toNum(row?.allocationAmount || row?.amount || 0)),
      reason: String(row?.reason || '').trim(),
    }))
    .filter((row) => row.debtName)
}

function validateAdvisorResponse(payload = {}) {
  const score = Math.round(toNum(payload.financialHealthScore))

  const normalized = {
    financialHealthScore: Math.max(0, Math.min(100, score)),
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
      estimatedInterestSavings: Math.max(0, toNum(payload?.forecast?.estimatedInterestSavings || 0)),
    },
  }

  const hasMinimumContent = (
    normalized.overallAssessment
    && normalized.recommendedActions.length
    && normalized.debtPayoffStrategy.method
  )

  return hasMinimumContent ? normalized : null
}

function buildAdvisorSummary(context = {}) {
  const monthlyIncome = toNum(context?.monthlyEntry?.totals?.totalIncome || context?.summary?.income || 0)
  const weeklyExpenses = toNum(context?.monthlyEntry?.totals?.totalWeeklyExpenses || 0)
  const monthlyExpenses = toNum(context?.monthlyEntry?.totals?.totalExpenses || context?.monthlyEntry?.totals?.totalMonthlyExpenses || 0)
  const totalExpenses = monthlyExpenses
  const surplusAmount = toNum(context?.summary?.remainingCash ?? context?.monthlyEntry?.availableSurplus ?? 0)
  const debtRows = Array.isArray(context?.debtRows) ? context.debtRows : []
  const minimumPayments = debtRows.reduce((sum, row) => sum + toNum(row?.monthlyPayment), 0)
  const monthlyInterestAmount = debtRows.reduce((sum, row) => sum + toNum(row?.interest), 0)

  return {
    monthlyIncome,
    weeklyExpenses,
    monthlyExpenses,
    totalExpenses,
    surplusAmount,
    availableCashFlow: Math.max(0, surplusAmount),
    totalDebtBalance: debtRows.reduce((sum, row) => sum + toNum(row?.currentBalance), 0),
    monthlyInterestAmount,
    debtToIncomeRatio: monthlyIncome > 0 ? Number(((minimumPayments / monthlyIncome) * 100).toFixed(2)) : 0,
    debtPriorityOrder: context?.priorityOrder || [],
    debtBalances: debtRows.map((row) => ({
      debtId: row?.debtId,
      debtName: row?.debtName,
      balance: toNum(row?.currentBalance),
      interestRateApprox: toNum(row?.interestRate || 0),
      minimumPayment: toNum(row?.monthlyPayment),
      monthlyInterest: toNum(row?.interest),
      priority: toNum(row?.priority),
      status: row?.status || 'active',
    })),
    paymentHistory: (context?.debtHistory || []).slice(0, 30).map((row) => ({
      debt: row?.debtNameSnapshot || row?.debt || '',
      date: row?.date,
      amountPaid: toNum(row?.amountPaid),
      principalPaid: toNum(row?.principalPaid),
      interestPaid: toNum(row?.interestPaid),
      extraPaymentAmount: toNum(row?.extraPaymentAmount),
      remainingBalanceAfterPayment: toNum(row?.remainingBalanceAfterPayment),
    })),
    monthlyPaymentHistory: (context?.monthlyActions || []).slice(0, 12).map((row) => ({
      debt: row?.debtNameSnapshot || row?.debt || '',
      date: row?.date,
      amountPaid: toNum(row?.amountPaid),
      principalPaid: toNum(row?.principalPaid),
      interestPaid: toNum(row?.interestPaid),
    })),
    paymentAnalytics: context?.paymentAnalytics || {},
    currentTarget: context?.currentTarget
      ? {
          debtId: context.currentTarget._id,
          debtName: context.currentTarget.name,
          currentBalance: toNum(context.currentTarget.currentBalance),
          monthlyInterest: toNum(context.currentTarget.monthlyInterest),
        }
      : null,
  }
}

function buildMasterPrompt(summary) {
  return [
    MASTER_ADVISOR_PROMPT,
    '',
    'Return EXACTLY this schema:',
    JSON.stringify(ADVISOR_SCHEMA),
    '',
    'Financial Data:',
    JSON.stringify(summary),
  ].join('\n')
}

function extractProviderError(text = '') {
  try {
    const parsed = JSON.parse(text)
    return parsed?.error?.message || ''
  } catch {
    return ''
  }
}

function throwProviderError({ provider, status, rawText }) {
  const isQuota = status === 429
  const message = isQuota
    ? `${provider} quota exceeded. Please wait a few minutes and try again.`
    : `${provider} request failed (${status}). ${extractProviderError(rawText) || 'Provider returned an error.'}`

  const error = new Error(message)
  error.code = isQuota ? 'QUOTA_EXCEEDED' : 'PROVIDER_ERROR'
  error.providerStatus = status
  throw error
}

function parseAndValidate(content, providerName) {
  const parsed = parseJsonResponse(content)
  if (!parsed) {
    const error = new Error(`${providerName} returned non-JSON content`)
    error.code = 'INVALID_JSON'
    throw error
  }

  const validated = validateAdvisorResponse(parsed)
  if (!validated) {
    const error = new Error(`${providerName} response failed schema validation`)
    error.code = 'INVALID_SCHEMA'
    throw error
  }

  return validated
}

async function fetchGroqInsights(summary) {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    const error = new Error('Groq API key is not configured')
    error.code = 'CONFIG_MISSING'
    throw error
  }

  const model = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile'
  const baseUrl = process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1/chat/completions'

  const response = await fetch(baseUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.15,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: MASTER_ADVISOR_PROMPT,
        },
        {
          role: 'user',
          content: [
            'Return EXACTLY this schema:',
            JSON.stringify(ADVISOR_SCHEMA),
            '',
            'Financial Data:',
            JSON.stringify(summary),
          ].join('\n'),
        },
      ],
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    throwProviderError({ provider: 'Groq', status: response.status, rawText: text })
  }

  const body = await response.json()
  const content = body?.choices?.[0]?.message?.content || ''
  return parseAndValidate(content, 'Groq')
}

async function fetchGeminiInsights(summary) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    const error = new Error('Gemini API key is not configured')
    error.code = 'CONFIG_MISSING'
    throw error
  }

  const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash'
  const baseUrl = process.env.GEMINI_BASE_URL || `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`
  const url = baseUrl.includes('?')
    ? `${baseUrl}&key=${encodeURIComponent(apiKey)}`
    : `${baseUrl}?key=${encodeURIComponent(apiKey)}`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [{ text: buildMasterPrompt(summary) }],
        },
      ],
      generationConfig: {
        temperature: 0.15,
        responseMimeType: 'application/json',
      },
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    throwProviderError({ provider: 'Gemini', status: response.status, rawText: text })
  }

  const body = await response.json()
  const content = (body?.candidates || [])
    .flatMap(candidate => candidate?.content?.parts || [])
    .map(part => part?.text || '')
    .join('\n')

  return parseAndValidate(content, 'Gemini')
}

async function fetchAIInsights(summary) {
  const provider = String(process.env.AI_PROVIDER || '').trim().toLowerCase()

  if (provider === 'gemini') return fetchGeminiInsights(summary)
  if (provider === 'groq') return fetchGroqInsights(summary)

  if (process.env.GROQ_API_KEY) return fetchGroqInsights(summary)
  return fetchGeminiInsights(summary)
}

function buildAdvisorContext(context = {}) {
  const summary = buildAdvisorSummary(context)
  return {
    summary,
    dataHash: dataHash(summary),
  }
}

function buildDefaultAdvisorResponse() {
  return { ...DEFAULT_ADVISOR_RESPONSE }
}

function getLatestAdvisorInsights(userId) {
  const key = String(userId || '')
  return advisorCache.get(key)?.result || null
}

function getCachedAdvisorInsights(userId, summaryHash) {
  const key = String(userId || '')
  const entry = advisorCache.get(key)
  if (!entry) return null
  if (entry.dataHash !== summaryHash) return null
  return entry.result
}

async function generateAdvisorInsights({ userId, context, force = false }) {
  const key = String(userId || '')
  const summaryHash = context?.dataHash
  const cached = getCachedAdvisorInsights(key, summaryHash)
  if (cached && !force) {
    return {
      ...cached,
      source: 'cache',
      cache: { hit: true },
    }
  }

  const insights = await fetchAIInsights(context.summary)
  const result = {
    ...insights,
    generatedAt: new Date().toISOString(),
    dataHash: summaryHash,
  }

  advisorCache.set(key, {
    dataHash: summaryHash,
    result,
  })

  return {
    ...result,
    source: String(process.env.AI_PROVIDER || '').trim().toLowerCase() || (process.env.GROQ_API_KEY ? 'groq' : 'gemini'),
    cache: { hit: false },
  }
}

module.exports = {
  buildAdvisorContext,
  buildDefaultAdvisorResponse,
  getCachedAdvisorInsights,
  getLatestAdvisorInsights,
  generateAdvisorInsights,
}