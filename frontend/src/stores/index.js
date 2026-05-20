import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/plugins/axios'
import i18n from '@/plugins/i18n'
import { useNotify } from '@/composables/useNotify'

const notify = useNotify()
const t = key => i18n.global.t(key)

function getErrorMessage(error) {
  return error?.response?.data?.message || t('actionFailed')
}

function stableParamsKey(params = {}) {
  const src = params && typeof params === 'object' ? params : {}
  const keyObj = {}
  Object.keys(src).sort().forEach((key) => {
    if (typeof src[key] !== 'undefined') keyObj[key] = src[key]
  })
  return JSON.stringify(keyObj)
}

// ── Company ───────────────────────────────────────────────────────────────────
export const useCompanyStore = defineStore('company', () => {
  const items = ref([]); const loading = ref(false)
  const inFlight = ref(null)
  const lastFetchedAt = ref(0)
  const CACHE_TTL_MS = 30 * 1000

  async function fetch(force = false) {
    const now = Date.now()
    if (!force && items.value.length && now - lastFetchedAt.value < CACHE_TTL_MS) {
      return items.value
    }
    if (!force && inFlight.value) return inFlight.value

    loading.value = true
    const req = api.get('/companies')
      .then((r) => {
        items.value = r.data
        lastFetchedAt.value = Date.now()
        return items.value
      })
      .finally(() => {
        loading.value = false
        inFlight.value = null
      })

    inFlight.value = req
    return req
  }
  async function create(d) { try { await api.post('/companies', d); await fetch(true); notify.success(t('savedSuccess')) } catch (error) { notify.error(getErrorMessage(error)); throw error } }
  async function update(id, d) { try { const r = await api.put(`/companies/${id}`, d); await fetch(true); notify.success(t('savedSuccess')); return r.data } catch (error) { notify.error(getErrorMessage(error)); throw error } }
  async function remove(id) { try { await api.delete(`/companies/${id}`); await fetch(true); notify.success(t('deletedSuccess')) } catch (error) { notify.error(getErrorMessage(error)); throw error } }
  return { items, loading, fetch, create, update, remove }
})

// ── Order ─────────────────────────────────────────────────────────────────────
export const useOrderStore = defineStore('order', () => {
  const items = ref([]); const loading = ref(false)
  const lastParams = ref({})
  const cacheByParams = ref(new Map())
  const inFlightByParams = ref(new Map())
  const CACHE_TTL_MS = 15 * 1000
  const active    = computed(() => items.value.filter(o => o.status === 'active'))
  const completed = computed(() => items.value.filter(o => o.status === 'completed'))

  async function fetch(p = {}, options = {}) {
    const force = options?.force === true
    const params = p && typeof p === 'object' ? { ...p } : {}
    const cacheKey = stableParamsKey(params)
    const now = Date.now()
    const cached = cacheByParams.value.get(cacheKey)

    if (!force && cached && now - cached.ts < CACHE_TTL_MS) {
      lastParams.value = { ...params }
      items.value = cached.items
      return items.value
    }

    if (!force && inFlightByParams.value.has(cacheKey)) {
      return inFlightByParams.value.get(cacheKey)
    }

    lastParams.value = { ...p }
    loading.value = true
    const req = api.get('/orders', { params })
      .then((r) => {
        items.value = r.data
        cacheByParams.value.set(cacheKey, { ts: Date.now(), items: r.data })
        return items.value
      })
      .finally(() => {
        loading.value = false
        inFlightByParams.value.delete(cacheKey)
      })

    inFlightByParams.value.set(cacheKey, req)
    return req
  }
  async function fetchOne(id) { const r = await api.get(`/orders/${id}`); return r.data }
  function matchesCurrentScope(order) {
    const params = lastParams.value || {}
    const isArchived = !!order?.archived

    if (params.archived === '1' || params.archived === 1 || params.archived === true) {
      return isArchived
    }
    if (params.includeArchived === '1' || params.includeArchived === 1 || params.includeArchived === true) {
      return true
    }
    return !isArchived
  }

  function upsertLocal(order) {
    if (!order?._id) return
    const index = items.value.findIndex(item => item?._id === order._id)
    const shouldExist = matchesCurrentScope(order)

    if (!shouldExist) {
      if (index >= 0) items.value.splice(index, 1)
      return
    }

    if (index >= 0) {
      items.value[index] = order
      return
    }
    items.value.unshift(order)
  }

  function removeLocal(id) {
    const index = items.value.findIndex(item => item?._id === id)
    if (index >= 0) items.value.splice(index, 1)
  }

  async function create(d) {
    try {
      const r = await api.post('/orders', d)
      upsertLocal(r.data)
      notify.success(t('savedSuccess'))
      return r.data
    } catch (error) {
      notify.error(getErrorMessage(error)); throw error
    }
  }

  async function update(id, d) {
    try {
      const r = await api.put(`/orders/${id}`, d)
      upsertLocal(r.data)
      notify.success(t('savedSuccess'))
      return r.data
    } catch (error) {
      notify.error(getErrorMessage(error)); throw error
    }
  }

  async function remove(id) {
    try {
      await api.delete(`/orders/${id}`)
      removeLocal(id)
      notify.success(t('deletedSuccess'))
    } catch (error) {
      notify.error(getErrorMessage(error)); throw error
    }
  }
  function financials(o) {
    const produced = Number(o.producedMeter || 0)
    const rejected = Number(o.rejectedMeter || 0)
    const accepted = Number(o.acceptedMeter ?? Math.max(0, produced - rejected))
    const tv  = accepted * (o.ratePerMeter || 0)
    const da  = tv * ((o.deductionPct || 0) / 100)
    const pa  = tv - da
    const ra  = o.totalReceived || 0
    return { totalValue: tv, deductionAmt: da, payableAmt: pa, receivedAmt: ra, remaining: Math.max(0, pa - ra), acceptedQty: accepted }
  }
  return { items, loading, active, completed, fetch, fetchOne, create, update, remove, upsertLocal, removeLocal, financials }
})

// ── Dashboard ─────────────────────────────────────────────────────────────────
export const useDashboardStore = defineStore('dashboard', () => {
  const stats = ref(null); const loading = ref(false)
  const inFlight = ref(null)
  const lastFetchedAt = ref(0)
  const CACHE_TTL_MS = 10 * 1000

  async function fetch(force = false) {
    const now = Date.now()
    if (!force && stats.value && now - lastFetchedAt.value < CACHE_TTL_MS) {
      return stats.value
    }
    if (!force && inFlight.value) return inFlight.value

    loading.value = true
    const req = api.get('/dashboard')
      .then((r) => {
        stats.value = r.data
        lastFetchedAt.value = Date.now()
        return stats.value
      })
      .finally(() => {
        loading.value = false
        inFlight.value = null
      })

    inFlight.value = req
    return req
  }
  return { stats, loading, fetch }
})

// Export payroll store
export { usePayrollStore } from './payroll'
