import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/plugins/axios'
import { useNotify } from '@/composables/useNotify'
import {
  generateAIAdvisorInsights,
  getEmptyAIAdvisorInsights,
  normalizeAIAdvisorInsights,
  isAIAdvisorInsightsValid,
} from '@/services/aiAdvisorService'

const notify = useNotify()

function getErrorMessage(error, fallback = 'Action failed') {
  return error?.response?.data?.message || fallback
}

const AI_CACHE_KEY = 'fi-ai-insights-cache-v1'

function getPeriodCacheKey(month, year) {
  return `${year}-${String(month).padStart(2, '0')}`
}

function loadAICache() {
  try {
    const raw = localStorage.getItem(AI_CACHE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function saveAICache(payload) {
  try {
    localStorage.setItem(AI_CACHE_KEY, JSON.stringify(payload || {}))
  } catch {
    // Local storage failures should not block app interaction.
  }
}

export const useFinancialIntelligenceStore = defineStore('financialIntelligence', () => {
  const loading = ref(false)
  const selectedPeriod = ref({ month: null, year: null })
  const dashboard = ref(null)
  const profile = ref(null)
  const monthlyEntry = ref(null)
  const monthlyEntries = ref([])
  const debts = ref([])
  const debtDetail = ref(null)
  const reports = ref(null)
  const aiInsights = ref(getEmptyAIAdvisorInsights())
  const aiLoading = ref(false)
  const aiError = ref('')
  const aiSource = ref('not_generated')
  const aiDataHash = ref('')
  const aiLastGeneratedAt = ref(null)
  const aiRequiresRegeneration = ref(true)

  const debtRows = computed(() => dashboard.value?.debtCenterRows || [])
  const summary = computed(() => dashboard.value?.summary || null)
  const charts = computed(() => dashboard.value?.charts || null)
  const currentTarget = computed(() => dashboard.value?.currentTarget || null)
  const recommendations = computed(() => aiInsights.value?.recommendedActions || [])
  const alerts = computed(() => aiInsights.value?.riskWarnings || [])

  function applyAIState(aiPayload = {}, metaPayload = {}) {
    const normalized = normalizeAIAdvisorInsights(aiPayload)
    aiInsights.value = normalized
    aiSource.value = aiPayload?.source || 'not_generated'
    aiDataHash.value = metaPayload?.dataHash || aiPayload?.dataHash || ''
    aiLastGeneratedAt.value = aiPayload?.generatedAt || metaPayload?.lastGeneratedAt || null
    aiRequiresRegeneration.value = Boolean(aiPayload?.requiresRegeneration)
  }

  function hydrateAICache(month, year) {
    const cache = loadAICache()
    const key = getPeriodCacheKey(month, year)
    const row = cache[key]
    if (!row) return false
    applyAIState(row.ai, row.meta)
    return true
  }

  function persistAICache(month, year) {
    const cache = loadAICache()
    const key = getPeriodCacheKey(month, year)
    cache[key] = {
      ai: {
        ...aiInsights.value,
        source: aiSource.value,
        generatedAt: aiLastGeneratedAt.value,
        requiresRegeneration: aiRequiresRegeneration.value,
        dataHash: aiDataHash.value,
      },
      meta: {
        dataHash: aiDataHash.value,
        lastGeneratedAt: aiLastGeneratedAt.value,
      },
      cachedAt: new Date().toISOString(),
    }
    saveAICache(cache)
  }

  function setSelectedPeriod(month, year) {
    selectedPeriod.value = { month, year }
  }

  async function refreshSelectedPeriod(options = {}) {
    const { includeProfile = false, includeDebts = false, includeReports = true, includeMonthlyEntries = true } = options
    const { month, year } = selectedPeriod.value
    const tasks = [
      fetchDashboard(month, year),
      fetchMonthlyEntry(month, year),
    ]
    if (includeReports) tasks.push(fetchReports(month, year))
    if (includeMonthlyEntries && year) tasks.push(fetchMonthlyEntries(year))
    if (includeDebts) tasks.push(fetchDebts())
    if (includeProfile) tasks.push(fetchProfile())
    await Promise.all(tasks)
  }

  async function fetchDashboard(month = null, year = null) {
    loading.value = true
    try {
      const { data } = await api.get('/financial-intelligence/dashboard', {
        params: { month, year },
      })
      dashboard.value = data
      monthlyEntry.value = data?.monthlyEntry || null
      applyAIState(data?.ai || {}, data?.aiMeta || {})
      if (!isAIAdvisorInsightsValid(aiInsights.value)) {
        hydrateAICache(month, year)
      } else {
        persistAICache(month, year)
      }
      return data
    } catch (error) {
      notify.error(getErrorMessage(error, 'Failed to load financial dashboard'))
      throw error
    } finally {
      loading.value = false
    }
  }

  async function generateAIInsights(options = {}) {
    const { force = true, retries = 1 } = options
    const month = Number(selectedPeriod.value?.month)
    const year = Number(selectedPeriod.value?.year)

    aiLoading.value = true
    aiError.value = ''

    let attempts = 0
    const maxAttempts = Math.max(1, Number(retries || 0) + 1)

    try {
      while (attempts < maxAttempts) {
        attempts += 1
        try {
          const data = await generateAIAdvisorInsights({ month, year, force })
          applyAIState(data, { dataHash: data?.dataHash, lastGeneratedAt: data?.generatedAt })
          aiRequiresRegeneration.value = false

          if (dashboard.value) {
            dashboard.value = {
              ...dashboard.value,
              ai: {
                ...data,
                source: data?.source || 'gemini',
                requiresRegeneration: false,
              },
              aiMeta: {
                ...(dashboard.value.aiMeta || {}),
                dataHash: data?.dataHash || aiDataHash.value,
                lastGeneratedAt: data?.generatedAt || aiLastGeneratedAt.value,
              },
            }
          }

          persistAICache(month, year)
          notify.success('AI insights generated successfully')
          return data
        } catch (error) {
          aiError.value = getErrorMessage(error, 'Failed to generate AI insights')
          const responseCode = error?.response?.data?.code
          const shouldStopRetry = responseCode === 'QUOTA_EXCEEDED' || responseCode === 'CONFIG_MISSING'
          if (shouldStopRetry) {
            notify.error(aiError.value)
            throw error
          }
          if (attempts >= maxAttempts) {
            notify.error(aiError.value)
            throw error
          }
        }
      }

      return null
    } finally {
      aiLoading.value = false
    }
  }

  async function fetchProfile() {
    try {
      const { data } = await api.get('/financial-intelligence/profile')
      profile.value = data
      return data
    } catch (error) {
      notify.error(getErrorMessage(error, 'Failed to load profile'))
      throw error
    }
  }

  async function fetchMonthlyEntry(month, year) {
    const { data } = await api.get('/financial-intelligence/monthly-entry', { params: { month, year } })
    monthlyEntry.value = data
    return data
  }

  async function updateMonthlyEntry(payload) {
    loading.value = true
    try {
      const { data } = await api.put('/financial-intelligence/monthly-entry', payload)
      const month = Number(payload?.month || selectedPeriod.value?.month)
      const year = Number(payload?.year || selectedPeriod.value?.year)
      if (month && year) setSelectedPeriod(month, year)
      monthlyEntry.value = data
      await refreshSelectedPeriod({ includeMonthlyEntries: true, includeReports: true, includeDebts: true })
      const isEdit = !!payload?._transactionId
      notify.success(isEdit ? 'Entry updated' : 'Entry added')
      return monthlyEntry.value
    } catch (error) {
      notify.error(getErrorMessage(error, 'Failed to save monthly entry'))
      throw error
    } finally {
      loading.value = false
    }
  }

  async function deleteMonthlyEntry(month, year) {
    loading.value = true
    try {
      await api.delete('/financial-intelligence/monthly-entry', { params: { month, year } })
      notify.success('Monthly entry deleted')
      await refreshSelectedPeriod({ includeMonthlyEntries: true })
    } catch (error) {
      notify.error(getErrorMessage(error, 'Failed to delete monthly entry'))
      throw error
    } finally {
      loading.value = false
    }
  }

  async function deleteMonthlyTransaction(month, year, transactionId) {
    loading.value = true
    try {
      await api.delete('/financial-intelligence/monthly-entry', { params: { month, year, transactionId } })
      notify.success('Entry deleted')
      await refreshSelectedPeriod({ includeMonthlyEntries: true, includeReports: true })
    } catch (error) {
      notify.error(getErrorMessage(error, 'Failed to delete entry'))
      throw error
    } finally {
      loading.value = false
    }
  }

  async function fetchMonthlyEntries(year) {
    const { data } = await api.get('/financial-intelligence/monthly-entries', { params: { year } })
    monthlyEntries.value = data
    return data
  }

  async function updateProfile(payload) {
    loading.value = true
    try {
      const { data } = await api.put('/financial-intelligence/profile', payload)
      profile.value = data
      notify.success('Financial profile updated')
      await refreshSelectedPeriod({ includeProfile: true, includeDebts: true })
      return data
    } catch (error) {
      notify.error(getErrorMessage(error, 'Failed to update profile'))
      throw error
    } finally {
      loading.value = false
    }
  }

  async function fetchDebts() {
    try {
      const { data } = await api.get('/financial-intelligence/debts')
      debts.value = data
      return data
    } catch (error) {
      notify.error(getErrorMessage(error, 'Failed to load debts'))
      throw error
    }
  }

  async function createDebt(payload) {
    loading.value = true
    try {
      const { data } = await api.post('/financial-intelligence/debts', payload)
      notify.success('Debt added successfully')
      await refreshSelectedPeriod({ includeDebts: true, includeProfile: true })
      return data
    } catch (error) {
      notify.error(getErrorMessage(error, 'Failed to add debt'))
      throw error
    } finally {
      loading.value = false
    }
  }

  async function updateDebt(id, payload) {
    loading.value = true
    try {
      const { data } = await api.put(`/financial-intelligence/debts/${id}`, payload)
      notify.success('Debt updated successfully')
      await refreshSelectedPeriod({ includeDebts: true, includeProfile: true })
      return data
    } catch (error) {
      notify.error(getErrorMessage(error, 'Failed to update debt'))
      throw error
    } finally {
      loading.value = false
    }
  }

  async function deleteDebt(id) {
    loading.value = true
    try {
      await api.delete(`/financial-intelligence/debts/${id}`)
      notify.success('Debt deleted successfully')
      await refreshSelectedPeriod({ includeDebts: true, includeProfile: true })
    } catch (error) {
      notify.error(getErrorMessage(error, 'Failed to delete debt'))
      throw error
    } finally {
      loading.value = false
    }
  }

  async function addDebtPayment(payload) {
    loading.value = true
    try {
      const { data } = await api.post('/financial-intelligence/payments', payload)
      notify.success('Debt payment saved')
      await refreshSelectedPeriod({ includeDebts: true, includeProfile: true })
      return data
    } catch (error) {
      notify.error(getErrorMessage(error, 'Failed to save payment'))
      throw error
    } finally {
      loading.value = false
    }
  }

  async function updateDebtPayment(id, payload) {
    loading.value = true
    try {
      const { data } = await api.put(`/financial-intelligence/payments/${id}`, payload)
      notify.success('Debt payment updated')
      await refreshSelectedPeriod({ includeDebts: true, includeProfile: true })
      return data
    } catch (error) {
      notify.error(getErrorMessage(error, 'Failed to update payment'))
      throw error
    } finally {
      loading.value = false
    }
  }

  async function deleteDebtPayment(id) {
    loading.value = true
    try {
      await api.delete(`/financial-intelligence/payments/${id}`)
      notify.success('Debt payment deleted')
      await refreshSelectedPeriod({ includeDebts: true, includeProfile: true })
    } catch (error) {
      notify.error(getErrorMessage(error, 'Failed to delete payment'))
      throw error
    } finally {
      loading.value = false
    }
  }

  async function fetchDebtDetail(id) {
    loading.value = true
    try {
      const { data } = await api.get(`/financial-intelligence/debts/${id}`)
      debtDetail.value = data
      return data
    } catch (error) {
      notify.error(getErrorMessage(error, 'Failed to load debt detail'))
      throw error
    } finally {
      loading.value = false
    }
  }

  async function fetchReports(month = null, year = null) {
    loading.value = true
    try {
      const { data } = await api.get('/financial-intelligence/reports', { params: { month, year } })
      reports.value = data
      return data
    } catch (error) {
      notify.error(getErrorMessage(error, 'Failed to load reports'))
      throw error
    } finally {
      loading.value = false
    }
  }

  return {
    loading,
    selectedPeriod,
    dashboard,
    profile,
    monthlyEntry,
    monthlyEntries,
    debts,
    debtDetail,
    reports,
    aiInsights,
    aiLoading,
    aiError,
    aiSource,
    aiDataHash,
    aiLastGeneratedAt,
    aiRequiresRegeneration,
    debtRows,
    summary,
    charts,
    currentTarget,
    recommendations,
    alerts,
    setSelectedPeriod,
    refreshSelectedPeriod,
    fetchDashboard,
    fetchProfile,
    fetchMonthlyEntry,
    updateMonthlyEntry,
    deleteMonthlyEntry,
    deleteMonthlyTransaction,
    fetchMonthlyEntries,
    updateProfile,
    fetchDebts,
    createDebt,
    updateDebt,
    deleteDebt,
    addDebtPayment,
    updateDebtPayment,
    deleteDebtPayment,
    fetchDebtDetail,
    fetchReports,
    generateAIInsights,
  }
})
