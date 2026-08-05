<template>
  <div class="cs-page">
    <!-- Header -->
    <div class="cs-header">
      <div>
        <h1 class="cs-title">Company Statement</h1>
        <p class="cs-subtitle">Company-wise date range statement</p>
      </div>
      <div class="cs-header-actions">
        <v-btn color="secondary" variant="tonal" size="small" prepend-icon="mdi-view-grid-plus-outline" :loading="createAllLoading" @click="createAllScenarios">Create All</v-btn>
        <v-btn color="primary" variant="tonal" size="small" prepend-icon="mdi-play-circle-outline" :loading="generateAllLoading" :disabled="!scenarios.length" @click="generateAllScenarios">Execute All</v-btn>
        <v-btn color="error" variant="tonal" size="small" prepend-icon="mdi-trash-can-outline" @click="clearAllScenarios">Delete All</v-btn>
        <v-btn color="primary" variant="flat" size="small" prepend-icon="mdi-plus-circle-outline" @click="addScenario">Add Scenario</v-btn>
      </div>
    </div>

    <!-- Scenarios -->
    <div v-for="(scenario, idx) in scenarios" :key="scenario.id" class="scenario-card">
      <!-- Scenario Header -->
      <div class="scenario-header">
        <div class="scenario-header-left">
          <div class="scenario-number">{{ idx + 1 }}</div>
          <div>
            <div class="scenario-title">Scenario {{ idx + 1 }}</div>
            <div class="scenario-hint">Select company and date range to load order statement.</div>
          </div>
        </div>
        <div class="scenario-header-right">
          <v-btn variant="tonal" color="warning" size="small" prepend-icon="mdi-broom" @click="clearScenario(scenario)">Clear</v-btn>
          <v-btn v-if="scenarios.length > 1" icon="mdi-close" variant="text" color="error" size="small" @click="removeScenario(scenario.id)" />
        </div>
      </div>

      <!-- Company selector -->
      <div class="scenario-body">
        <div class="company-select-wrap">
          <v-autocomplete
            v-model="scenario.companyId"
            :items="companyOptionsForScenario(scenario.id)"
            item-title="title"
            item-value="value"
            :item-props="companyItemProps"
            :label="t('company')"
            density="compact"
            clearable
            hide-details="auto"
          />
        </div>

        <!-- Main Period -->
        <div class="period-row main-period-row">
          <div class="period-label">
            <v-icon size="14" color="#1565C0" class="mr-1">mdi-calendar-range</v-icon>
            Main Period
          </div>
          <v-text-field
            v-model="scenario.from"
            :label="t('from')"
            type="date"
            density="compact"
            hide-details="auto"
            class="period-date-field"
          />
          <v-text-field
            v-model="scenario.to"
            :label="t('to')"
            type="date"
            density="compact"
            hide-details="auto"
            :min="scenario.from || undefined"
            class="period-date-field"
          />
          <v-btn
            color="primary"
            variant="flat"
            prepend-icon="mdi-file-chart-outline"
            :loading="scenario.loading"
            :disabled="!scenario.companyId || !scenario.from || !scenario.to"
            @click="loadScenario(scenario)"
            class="period-action-btn"
          >
            {{ t('generate') }}
          </v-btn>
        </div>

        <div v-if="scenario.error" class="error-msg">{{ scenario.error }}</div>

        <!-- Comparisons -->
        <div
          v-for="(comp, compIdx) in scenario.comparisons"
          :key="comp.id"
          class="period-row comparison-period-row"
          :class="{ 'drag-over': dragOverState.scenarioId === scenario.id && dragOverState.compId === comp.id }"
          draggable="true"
          @dragstart="onDragStart(scenario, comp)"
          @dragover.prevent="onDragOver(scenario, comp)"
          @drop.prevent="onDrop(scenario, comp)"
          @dragend="onDragEnd"
        >
          <div class="period-label comparison-label">
            <v-icon size="14" class="drag-handle mr-1" color="#90A4AE">mdi-drag-vertical</v-icon>
            <v-icon size="14" color="#1976D2" class="mr-1">mdi-compare-horizontal</v-icon>
            Comparison #{{ compIdx + 1 }}
          </div>
          <v-text-field
            v-model="comp.from"
            label="Compare From"
            type="date"
            density="compact"
            hide-details="auto"
            class="period-date-field"
          />
          <v-text-field
            v-model="comp.to"
            label="Compare To"
            type="date"
            density="compact"
            hide-details="auto"
            :min="comp.from || undefined"
            class="period-date-field"
          />
          <div class="d-flex align-center period-action-btn" style="gap:4px">
            <v-btn
              color="info"
              variant="flat"
              size="small"
              prepend-icon="mdi-chart-timeline-variant"
              :loading="comp.loading"
              :disabled="!scenario.companyId || !comp.from || !comp.to"
              @click="loadComparison(scenario, comp)"
              class="flex-grow-1"
            >
              Load
            </v-btn>
            <v-btn
              variant="text"
              color="error"
              icon="mdi-close"
              size="small"
              @click="removeComparison(scenario, comp.id)"
            />
          </div>
          <div v-if="comp.error" class="period-full-row mt-2 error-msg">{{ comp.error }}</div>
        </div>

        <!-- Add Comparison -->
        <div class="d-flex justify-end mt-3">
          <v-btn color="info" variant="tonal" size="small" prepend-icon="mdi-plus" @click="addComparison(scenario)">
            {{ scenario.comparisons.length ? 'Add Another Comparison' : 'Add Comparison' }}
          </v-btn>
        </div>

        <!-- Results -->
        <template v-for="entry in sortedEntries(scenario)" :key="entry.key">
          <div v-if="entry.loaded" class="result-block">
            <div class="result-header">
              <div class="result-company">
                {{ scenario.companyName || '-' }}
                <span v-if="entry.type === 'comparison'" class="result-comparison-tag">{{ entry.label }}</span>
              </div>
              <div class="result-date">{{ formatDateRangeWithDay(entry.from, entry.to) }}</div>
            </div>
            <div class="statement-summary-row">
              <div class="statement-summary-pill">
                <v-icon size="14" class="mr-1" color="#1565C0">mdi-factory</v-icon>
                Total Production: <strong>{{ fmtN(scenarioTotals(entry).totalProduced) }}</strong>
              </div>
              <div class="statement-summary-pill" :class="(entry.previousBalance || 0) > 0 ? 'pill-credit' : (entry.previousBalance || 0) < 0 ? 'pill-debit' : ''">
                <v-icon size="14" class="mr-1">{{ (entry.previousBalance || 0) >= 0 ? 'mdi-arrow-right-bold' : 'mdi-cash-check' }}</v-icon>
                {{ (entry.previousBalance || 0) >= 0 ? 'Carry Forward' : 'Received Amount' }}:
                <strong>{{ fmtSigned(entry.previousBalance || 0) }}</strong>
              </div>
              <div class="statement-summary-pill">
                <v-icon size="14" class="mr-1" color="#E65100">mdi-cash-clock</v-icon>
                Payable Balance: <strong>{{ fmt(scenarioTotals(entry).payableBalance) }}</strong>
              </div>
              <div class="statement-summary-pill pill-total">
                <v-icon size="14" class="mr-1" color="#7B1FA2">mdi-sigma</v-icon>
                Total Amount: <strong>{{ fmtSigned(scenarioTotals(entry).totalAmount) }}</strong>
              </div>
            </div>
            <div class="statement-table-wrap">
              <table class="statement-table">
                <thead>
                  <tr>
                    <th>Order</th><th>Order State</th><th>Expected Quantity</th><th>Produced</th>
                    <th>Rate/m</th><th>Total Amount</th><th>Deduction %</th><th>Deduction Amt</th><th>Payable Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(row, rIdx) in entry.rows" :key="`${entry.key}-${rIdx}`">
                    <td class="order-name-cell">{{ row.order }}</td>
                    <td><span :class="row.orderState === 'completed' ? 'chip-paid' : 'chip-pending'" style="padding:2px 10px;border-radius:20px;font-size:11px">{{ row.orderState === 'completed' ? t('completed') : t('active') }}</span></td>
                    <td>{{ fmtN(row.expectedQuantity) }}</td>
                    <td>{{ fmtN(row.produced) }}</td>
                    <td>{{ fmtRatePerMeter(row.ratePerMeter) }}</td>
                    <td>{{ fmt(row.totalAmount) }}</td>
                    <td>{{ Number(row.deductionPct || 0).toFixed(2) }}%</td>
                    <td>{{ fmt(row.deductionAmt) }}</td>
                    <td class="payable-cell">{{ fmt(row.payableAmount) }}</td>
                  </tr>
                  <tr v-if="entry.rows.length" class="statement-total-row">
                    <td colspan="3"><strong>Total</strong></td>
                    <td><strong>{{ fmtN(scenarioTotals(entry).totalProduced) }}</strong></td>
                    <td>-</td>
                    <td><strong>{{ fmt(scenarioTotals(entry).grossAmount) }}</strong></td>
                    <td>-</td>
                    <td><strong>{{ fmt(scenarioTotals(entry).totalDeduction) }}</strong></td>
                    <td><strong>{{ fmt(scenarioTotals(entry).payableBalance) }}</strong></td>
                  </tr>
                  <tr v-if="!entry.rows.length">
                    <td colspan="9" class="text-center" style="color:#94A3B8">{{ t('noData') }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useCompanyStore } from '@/stores/index'
import { useUtils } from '@/composables/useUtils'
import api from '@/plugins/axios'

const { t } = useI18n()
const { today, monthStart, fmt, fmtN } = useUtils()
const companyStore = useCompanyStore()
const STORAGE_KEY = 'at-company-statement-scenarios'

const scenarios = ref([])
const generateAllLoading = ref(false)
const createAllLoading = ref(false)

// Drag state
const dragState = ref({ scenarioId: null, compId: null })
const dragOverState = ref({ scenarioId: null, compId: null })

function onDragStart(scenario, comp) {
  dragState.value = { scenarioId: scenario.id, compId: comp.id }
}
function onDragOver(scenario, comp) {
  dragOverState.value = { scenarioId: scenario.id, compId: comp.id }
}
function onDrop(scenario, targetComp) {
  const sourceId = dragState.value.compId
  if (!sourceId || sourceId === targetComp.id) {
    dragOverState.value = { scenarioId: null, compId: null }
    return
  }
  const arr = [...scenario.comparisons]
  const from = arr.findIndex(c => c.id === sourceId)
  const to = arr.findIndex(c => c.id === targetComp.id)
  if (from !== -1 && to !== -1) {
    const [item] = arr.splice(from, 1)
    arr.splice(to, 0, item)
    scenario.comparisons = arr
  }
  dragState.value = { scenarioId: null, compId: null }
  dragOverState.value = { scenarioId: null, compId: null }
}
function onDragEnd() {
  dragState.value = { scenarioId: null, compId: null }
  dragOverState.value = { scenarioId: null, compId: null }
}

function persistScenarios() {
  const payload = scenarios.value.map(s => ({
    id: s.id,
    companyId: s.companyId,
    companyName: s.companyName,
    from: s.from,
    to: s.to,
    rows: s.rows,
    previousBalance: s.previousBalance,
    comparisons: (s.comparisons || []).map(c => ({
      id: c.id,
      from: c.from,
      to: c.to,
      rows: c.rows,
      previousBalance: c.previousBalance,
      loaded: c.loaded,
      error: c.error,
    })),
    loaded: s.loaded,
    error: s.error,
  }))
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
}

function restoreScenarios() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return false
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed) || !parsed.length) return false

    scenarios.value = parsed.map(s => ({
      id: s.id || (Date.now().toString(36) + Math.random().toString(36).slice(2, 8)),
      companyId: s.companyId || null,
      companyName: s.companyName || '',
      from: s.from || monthStart(),
      to: s.to || today(),
      rows: Array.isArray(s.rows) ? s.rows : [],
      previousBalance: Number(s.previousBalance || 0),
      comparisons: Array.isArray(s.comparisons) ? s.comparisons.map(c => ({
        id: c.id || (Date.now().toString(36) + Math.random().toString(36).slice(2, 8)),
        from: c.from || monthStart(),
        to: c.to || today(),
        rows: Array.isArray(c.rows) ? c.rows : [],
        previousBalance: Number(c.previousBalance || 0),
        loading: false,
        loaded: !!c.loaded,
        error: c.error || '',
      })) : [],
      loading: false,
      loaded: !!s.loaded,
      error: s.error || '',
    }))
    return true
  } catch {
    return false
  }
}

function createScenario() {
  return {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
    companyId: null,
    companyName: '',
    from: monthStart(),
    to: today(),
    rows: [],
    previousBalance: 0,
    comparisons: [],
    loading: false,
    loaded: false,
    error: '',
  }
}

function createComparison() {
  return {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
    from: monthStart(),
    to: today(),
    rows: [],
    previousBalance: 0,
    loading: false,
    loaded: false,
    error: '',
  }
}

function addScenario() {
  scenarios.value.push(createScenario())
}

function clearAllScenarios() {
  scenarios.value = [createScenario()]
}

async function createAllScenarios() {
  createAllLoading.value = true
  try {
    if (!(companyStore.items || []).length) {
      await companyStore.fetch()
    }

    const companies = companyStore.items || []
    scenarios.value = companies.map(c => ({
      ...createScenario(),
      companyId: c._id,
      companyName: c.name,
    }))

    if (!scenarios.value.length) {
      addScenario()
    }
  } finally {
    createAllLoading.value = false
  }
}

async function generateAllScenarios() {
  const runnable = scenarios.value.filter(s => s.companyId && s.from && s.to)
  if (!runnable.length) return

  generateAllLoading.value = true
  try {
    await Promise.all(runnable.map(s => loadScenario(s)))
  } finally {
    generateAllLoading.value = false
  }
}

function removeScenario(id) {
  scenarios.value = scenarios.value.filter(s => s.id !== id)
}

function clearScenario(scenario) {
  scenario.companyId = null
  scenario.companyName = ''
  scenario.from = monthStart()
  scenario.to = today()
  scenario.rows = []
  scenario.previousBalance = 0
  scenario.comparisons = []
  scenario.loaded = false
  scenario.error = ''
}

function addComparison(scenario) {
  scenario.comparisons.push(createComparison())
}

function removeComparison(scenario, compId) {
  scenario.comparisons = scenario.comparisons.filter(c => c.id !== compId)
}

function isCompanyDisabled(companyId, currentScenarioId) {
  return scenarios.value.some(s => s.id !== currentScenarioId && s.companyId === companyId)
}

function companyOptionsForScenario(currentScenarioId) {
  return (companyStore.items || []).map(c => ({
    title: c.name,
    value: c._id,
    disabled: isCompanyDisabled(c._id, currentScenarioId),
  }))
}

function companyItemProps(item) {
  return { disabled: !!item.disabled }
}

function sortedEntries(scenario) {
  const entries = []

  // Main period entry
  entries.push({
    key: `main-${scenario.id}`,
    type: 'main',
    label: 'Main Period',
    from: scenario.from,
    to: scenario.to,
    rows: scenario.rows || [],
    previousBalance: scenario.previousBalance || 0,
    loaded: !!scenario.loaded,
  })

  // Comparison entries
  ;(scenario.comparisons || []).forEach((comp, idx) => {
    entries.push({
      key: `comp-${comp.id}`,
      type: 'comparison',
      label: `Comparison #${idx + 1}`,
      from: comp.from,
      to: comp.to,
      rows: comp.rows || [],
      previousBalance: comp.previousBalance || 0,
      loaded: !!comp.loaded,
    })
  })

  // Sort by from date ascending (earliest first)
  return entries.sort((a, b) => {
    if (!a.from) return 1
    if (!b.from) return -1
    return new Date(a.from) - new Date(b.from)
  })
}

function scenarioTotals(scenario) {
  const totalProduced = (scenario.rows || []).reduce((sum, row) => sum + Number(row.produced || 0), 0)
  const grossAmount = (scenario.rows || []).reduce((sum, row) => sum + Number(row.totalAmount || 0), 0)
  const totalDeduction = (scenario.rows || []).reduce((sum, row) => sum + Number(row.deductionAmt || 0), 0)
  const payableBalance = (scenario.rows || []).reduce((s, r) => s + Number(r.payableAmount || 0), 0)
  const previousBalance = Number(scenario.previousBalance || 0)
  return {
    totalProduced,
    grossAmount,
    totalDeduction,
    payableBalance,
    totalAmount: previousBalance + payableBalance,
  }
}

function fmtSigned(value) {
  const amount = Number(value || 0)
  return amount > 0 ? `+${fmt(amount)}` : amount < 0 ? `-${fmt(Math.abs(amount))}` : fmt(0)
}

function fmtRatePerMeter(value) {
  const n = Number(value || 0)
  if (!Number.isFinite(n)) return '₹0'
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 20 })}`
}

function formatDateWithDay(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const day = new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(date)
  const dd = String(date.getDate()).padStart(2, '0')
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const yyyy = date.getFullYear()
  return `${dd}/${mm}/${yyyy} (${day})`
}

function formatDateRangeWithDay(from, to) {
  return `${formatDateWithDay(from)} to ${formatDateWithDay(to)}`
}

async function loadScenario(scenario) {
  scenario.error = ''
  scenario.loading = true
  try {
    const res = await api.get('/reports/company-order-statement', {
      params: { companyId: scenario.companyId, from: scenario.from, to: scenario.to },
    })
    scenario.rows = res.data?.rows || []
    scenario.previousBalance = Number(res.data?.previousBalance || 0)
    scenario.companyName = res.data?.company?.name || ''
    scenario.loaded = true
  } catch (err) {
    scenario.error = err?.response?.data?.message || 'Failed to load statement'
    scenario.rows = []
    scenario.previousBalance = 0
    scenario.loaded = false
  } finally {
    scenario.loading = false
  }
}

async function loadComparison(scenario, comp) {
  comp.error = ''
  comp.loading = true
  try {
    const res = await api.get('/reports/company-order-statement', {
      params: { companyId: scenario.companyId, from: comp.from, to: comp.to },
    })
    comp.rows = res.data?.rows || []
    comp.previousBalance = Number(res.data?.previousBalance || 0)
    comp.loaded = true
  } catch (err) {
    comp.error = err?.response?.data?.message || 'Failed to load comparison'
    comp.rows = []
    comp.previousBalance = 0
    comp.loaded = false
  } finally {
    comp.loading = false
  }
}

onMounted(async () => {
  const restored = restoreScenarios()
  await companyStore.fetch()
  if (!restored && !scenarios.value.length) addScenario()
})

watch(
  scenarios,
  () => {
    persistScenarios()
  },
  { deep: true }
)
</script>

<style scoped>
.cs-page {
  max-width: 1400px;
  margin: 0 auto;
  padding: 24px 20px;
}

/* Header */
.cs-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
  gap: 16px;
  flex-wrap: wrap;
}

.cs-title {
  font-size: 26px;
  font-weight: 800;
  color: #1E293B;
  letter-spacing: -0.5px;
}

.cs-subtitle {
  font-size: 13px;
  color: #64748B;
  margin-top: 2px;
}

.cs-header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

/* Scenario Card */
.scenario-card {
  background: #fff;
  border: 1px solid #E2E8F0;
  border-radius: 20px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
  margin-bottom: 24px;
  overflow: hidden;
  transition: box-shadow 0.2s;
}

.scenario-card:hover {
  box-shadow: 0 4px 16px rgba(0,0,0,0.06);
}

.scenario-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 24px;
  background: #F8FAFC;
  border-bottom: 1px solid #F1F5F9;
  gap: 12px;
}

.scenario-header-left {
  display: flex;
  align-items: center;
  gap: 14px;
}

.scenario-number {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: linear-gradient(135deg, #1565C0, #42A5F5);
  color: #fff;
  font-size: 16px;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.scenario-title {
  font-size: 15px;
  font-weight: 700;
  color: #1E293B;
}

.scenario-hint {
  font-size: 12px;
  color: #94A3B8;
}

.scenario-header-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.scenario-body {
  padding: 20px 24px;
}

.company-select-wrap {
  max-width: 400px;
  margin-bottom: 16px;
}

.error-msg {
  color: #C62828;
  font-size: 12px;
  margin-top: 8px;
  padding: 6px 10px;
  background: #FEF2F2;
  border-radius: 6px;
  border: 1px solid #FECACA;
}

/* Period Rows */
.period-row {
  display: grid;
  grid-template-columns: 150px 1fr 1fr auto;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 12px;
  margin-top: 12px;
}

.period-row.main-period-row {
  background: #F8FAFC;
  border: 1px solid #E2E8F0;
  border-left: 4px solid #1565C0;
}

.period-row.comparison-period-row {
  background: #FAFBFE;
  border: 1px solid #E8ECF4;
  border-left: 4px solid #42A5F5;
  cursor: grab;
  transition: all 0.2s;
}

.period-row.comparison-period-row:hover {
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
}

.period-row.comparison-period-row:active {
  cursor: grabbing;
}

.period-row.drag-over {
  border-left-color: #7B1FA2;
  background: #FAF5FF;
  box-shadow: 0 0 0 2px rgba(171,71,188,0.2);
}

.period-full-row {
  grid-column: 1 / -1;
}

.period-label {
  display: flex;
  align-items: center;
  font-size: 12px;
  font-weight: 700;
  color: #475569;
  white-space: nowrap;
}

.comparison-label {
  color: #1565C0;
}

.period-date-field {
  min-width: 0;
}

.period-action-btn {
  min-width: 130px;
}

.drag-handle {
  cursor: grab;
  opacity: 0.5;
  transition: opacity 0.2s;
}
.drag-handle:hover {
  opacity: 1;
}

/* Results */
.result-block {
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid #F1F5F9;
}

.result-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
  gap: 12px;
  flex-wrap: wrap;
}

.result-company {
  font-size: 16px;
  font-weight: 800;
  color: #1E293B;
}

.result-comparison-tag {
  font-weight: 500;
  color: #1976D2;
  font-size: 14px;
}

.result-date {
  font-size: 12px;
  color: #64748B;
  font-weight: 600;
  padding: 4px 10px;
  background: #F1F5F9;
  border-radius: 6px;
}

/* Summary Pills */
.statement-summary-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 16px;
}

.statement-summary-pill {
  display: flex;
  align-items: center;
  background: #fff;
  border: 1px solid #E2E8F0;
  border-radius: 10px;
  padding: 10px 14px;
  font-size: 13px;
  color: #1E293B;
  transition: all 0.15s;
}

.statement-summary-pill:hover {
  box-shadow: 0 2px 6px rgba(0,0,0,0.05);
  transform: translateY(-1px);
}

.statement-summary-pill strong {
  margin-left: 4px;
}

.statement-summary-pill.pill-credit {
  background: #F0FFF4;
  border-color: #BBF7D0;
  color: #166534;
}

.statement-summary-pill.pill-debit {
  background: #FFFBEB;
  border-color: #FDE68A;
  color: #92400E;
}

.statement-summary-pill.pill-total {
  background: #FAF5FF;
  border-color: #E9D5FF;
  color: #6B21A8;
}

/* Table */
.statement-table-wrap {
  overflow-x: auto;
  border: 1px solid #E2E8F0;
  border-radius: 12px;
}

.statement-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 1020px;
  background: #fff;
}

.statement-table th,
.statement-table td {
  border-bottom: 1px solid #F1F5F9;
  padding: 12px 14px;
  text-align: left;
  font-size: 13px;
  color: #1E293B;
}

.statement-table th {
  font-size: 10.5px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 700;
  color: #64748B;
  background: #F8FAFC;
  white-space: nowrap;
}

.statement-table tbody tr {
  transition: background 0.15s;
}

.statement-table tbody tr:hover {
  background: #F8FBFF;
}

.order-name-cell {
  font-weight: 600;
  color: #1E293B;
}

.payable-cell {
  font-weight: 700;
  color: #1E293B;
}

.statement-total-row td {
  background: #F8FAFC;
  border-top: 2px solid #E2E8F0;
  color: #1E293B;
}

/* Responsive */
@media (max-width: 1024px) {
  .period-row {
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }

  .period-label {
    grid-column: 1 / -1;
  }

  .period-action-btn {
    grid-column: 1 / -1;
    min-width: auto;
  }
}

@media (max-width: 768px) {
  .cs-page { padding: 16px 12px; }

  .cs-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .cs-header-actions {
    width: 100%;
  }

  .scenario-header {
    flex-direction: column;
    align-items: flex-start;
    padding: 14px 16px;
  }

  .scenario-body {
    padding: 16px;
  }

  .company-select-wrap {
    max-width: none;
  }

  .period-row {
    grid-template-columns: 1fr;
  }

  .statement-summary-row {
    flex-direction: column;
  }

  .result-header {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
