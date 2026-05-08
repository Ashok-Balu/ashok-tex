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

// ── Company ───────────────────────────────────────────────────────────────────
export const useCompanyStore = defineStore('company', () => {
  const items = ref([]); const loading = ref(false)
  let lastFetchAt = 0
  const TTL = 60_000 // 60 s — re-use cached data within 1 minute
  async function fetch(force = false) {
    if (!force && items.value.length && Date.now() - lastFetchAt < TTL) return
    loading.value = true
    try { const r = await api.get('/companies'); items.value = r.data; lastFetchAt = Date.now() }
    finally { loading.value = false }
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
  const active    = computed(() => items.value.filter(o => o.status === 'active'))
  const completed = computed(() => items.value.filter(o => o.status === 'completed'))
  async function fetch(p = {}) { lastParams.value = { ...p }; loading.value = true; try { const r = await api.get('/orders', { params: p }); items.value = r.data } finally { loading.value = false } }
  async function fetchOne(id) { const r = await api.get(`/orders/${id}`); return r.data }
  async function create(d) { try { const r = await api.post('/orders', d); await fetch(lastParams.value); notify.success(t('savedSuccess')); return r.data } catch (error) { notify.error(getErrorMessage(error)); throw error } }
  async function update(id, d) { try { const r = await api.put(`/orders/${id}`, d); await fetch(lastParams.value); notify.success(t('savedSuccess')); return r.data } catch (error) { notify.error(getErrorMessage(error)); throw error } }
  async function remove(id) { try { await api.delete(`/orders/${id}`); await fetch(lastParams.value); notify.success(t('deletedSuccess')) } catch (error) { notify.error(getErrorMessage(error)); throw error } }
  function financials(o) {
    const tv  = (o.producedMeter || 0) * (o.ratePerMeter || 0)
    const da  = tv * ((o.deductionPct || 0) / 100)
    const pa  = tv - da
    const ra  = o.totalReceived || 0
    return { totalValue: tv, deductionAmt: da, payableAmt: pa, receivedAmt: ra, remaining: pa - ra }
  }
  return { items, loading, active, completed, fetch, fetchOne, create, update, remove, financials }
})

// ── Dashboard ─────────────────────────────────────────────────────────────────
export const useDashboardStore = defineStore('dashboard', () => {
  const stats = ref(null); const loading = ref(false)
  let lastFetchAt = 0
  const TTL = 30_000 // 30 s — dashboard data refreshes more frequently
  async function fetch(force = false) {
    if (!force && stats.value && Date.now() - lastFetchAt < TTL) return
    loading.value = true
    try { const r = await api.get('/dashboard'); stats.value = r.data; lastFetchAt = Date.now() }
    finally { loading.value = false }
  }
  return { stats, loading, fetch }
})

// Export payroll store
export { usePayrollStore } from './payroll'
