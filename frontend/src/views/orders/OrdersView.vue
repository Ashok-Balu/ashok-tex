<template>
  <div class="page-container orders-page" @pointermove="onFx">
    <PageHeader :title="t('orders')" :sub="pageSubtitle">
      <div class="orders-header-actions">
        <div class="orders-filter-strip">
          <div class="orders-filter-group">
            <span class="orders-filter-label">{{ t('orOrderStatus') }}</span>
            <v-btn-toggle v-model="statusFilter" density="compact" rounded="lg" color="primary" variant="outlined" divided>
              <v-btn value="" size="small">{{ t('orAll') }}</v-btn>
              <v-btn value="active" size="small">{{ t('active') }}</v-btn>
              <v-btn value="completed" size="small">{{ t('completed') }}</v-btn>
            </v-btn-toggle>
          </div>

          <div class="orders-filter-group">
            <span class="orders-filter-label">{{ t('orStartRange') }}</span>
            <v-menu v-model="dateMenu" :close-on-content-click="false" location="bottom start">
              <template #activator="{ props: menuProps }">
                <v-btn v-bind="menuProps" variant="outlined" size="small" rounded="lg" prepend-icon="mdi-calendar-blank-outline" class="order-date-btn">
                  {{ dateRangeLabel }}
                </v-btn>
              </template>
              <v-card class="order-date-card" rounded="lg">
                <v-date-picker v-model="dateRangeModel" multiple="range" hide-header color="primary" show-adjacent-months />
                <div class="order-date-actions">
                  <v-btn variant="text" size="small" @click="clearDateRange">{{ t('orClear') }}</v-btn>
                  <v-btn color="primary" variant="flat" size="small" @click="dateMenu = false">{{ t('orDone') }}</v-btn>
                </div>
              </v-card>
            </v-menu>
          </div>

          <div class="orders-filter-group">
            <span class="orders-filter-label">{{ t('orArchiveScope') }}</span>
            <v-btn-toggle v-model="archiveScope" density="compact" rounded="lg" color="secondary" variant="outlined" divided>
              <v-btn value="all" size="small">{{ t('orAll') }}</v-btn>
              <v-btn value="active" size="small">{{ t('orLive') }}</v-btn>
              <v-btn value="archived" size="small">{{ t('orArchive') }}</v-btn>
            </v-btn-toggle>
          </div>

          <div class="orders-filter-group">
            <span class="orders-filter-label">{{ t('orRowFilter') }}</span>
            <v-select v-model="rowFilter" :items="rowFilterItems" item-title="title" item-value="value" density="compact" variant="outlined" hide-details single-line class="order-filter-select" />
          </div>
        </div>

        <v-btn color="primary" prepend-icon="mdi-plus" variant="flat" rounded="lg" class="orders-add-btn" @click="open()">
          {{ t('addOrder') }}
        </v-btn>
      </div>
    </PageHeader>

    <div class="order-stat-grid">
      <v-card v-for="(stat, i) in statCards" :key="stat.label" rounded="xl" class="at-card order-stat" :class="`order-stat-${stat.tone}`" v-motion :initial="{ opacity: 0, y: 16 }" :enter="{ opacity: 1, y: 0, transition: { delay: i * 60 } }">
        <div class="order-stat-icon"><v-icon size="26">{{ stat.icon }}</v-icon></div>
        <div class="order-stat-text">
          <div class="order-stat-label">{{ stat.label }}</div>
          <div class="order-stat-value">{{ formatStat(stat) }}</div>
        </div>
      </v-card>
    </div>

    <div v-if="overdueCount" class="order-alert" v-motion :initial="{ opacity: 0, y: -8 }" :enter="{ opacity: 1, y: 0 }">
      <v-icon size="20">mdi-alert-circle-outline</v-icon>
      <span><b>{{ overdueCount }}</b> {{ overdueCount === 1 ? t('orPastEndOne') : t('orPastEndMany') }}</span>
      <v-btn size="small" variant="flat" color="error" rounded="lg" class="order-alert-btn" @click="toggleOverdueFilter">{{ overdueActive ? t('orShowAll') : t('orShowOverdue') }}</v-btn>
    </div>

    <div class="order-insights">
      <div
        v-for="(item, i) in insights"
        :key="item.label"
        class="order-insight"
        :style="insightStyle(item.tone)"
        v-motion
        :initial="{ opacity: 0, y: 12 }"
        :enter="{ opacity: 1, y: 0, transition: { delay: 120 + i * 60 } }"
      >
        <div class="order-insight-icon"><v-icon size="18">{{ item.icon }}</v-icon></div>
        <div class="order-insight-text">
          <div class="order-insight-label">{{ item.label }}</div>
          <div class="order-insight-value">{{ item.value }}</div>
          <div class="order-insight-hint">{{ item.hint }}</div>
        </div>
      </div>
    </div>

    <!-- Table -->
    <v-card rounded="xl" class="at-card order-table-shell" style="overflow:hidden">
      <div class="order-toolbar">
        <div class="order-toolbar-title">
          <span class="order-toolbar-icon"><v-icon size="18">mdi-format-list-bulleted-square</v-icon></span>
          {{ t('orRegister') }}
        </div>
        <div class="order-toolbar-actions">
          <v-btn variant="outlined" size="small" prepend-icon="mdi-download-outline" class="order-toolbar-btn" :disabled="!visibleOrderCount" @click="exportRegisterCsv">{{ t('orExport') }}</v-btn>
          <v-menu :close-on-content-click="false" location="bottom end">
            <template #activator="{ props: menuProps }">
              <v-btn v-bind="menuProps" variant="outlined" size="small" prepend-icon="mdi-view-column-outline" class="order-toolbar-btn">{{ t('orColumns') }}</v-btn>
            </template>
            <v-card class="order-columns-card" rounded="lg">
              <div class="order-columns-title">{{ t('orShowColumns') }}</div>
              <v-checkbox
                v-for="opt in columnOptions"
                :key="opt.key"
                :label="opt.label"
                :model-value="!hiddenColumnKeys.includes(opt.key)"
                density="compact"
                color="primary"
                hide-details
                @update:model-value="v => setColumnVisible(opt.key, !!v)"
              />
            </v-card>
          </v-menu>
          <v-text-field v-model="searchInput" :placeholder="t('search')" prepend-inner-icon="mdi-magnify"
            density="compact" variant="outlined" hide-details class="order-search" />
        </div>
      </div>
      <div v-if="showTableSpinner" class="order-skeleton">
        <div v-for="n in 3" :key="n" class="order-skeleton-row"><span /><span /><span /></div>
      </div>
      <div class="register-groups" v-else-if="registerGroups.length">
        <div
          v-for="(group, gi) in registerGroups"
          :key="group.name"
          class="register-group"
          :style="{ borderLeftColor: nameColor(group.name) }"
          v-motion
          :initial="{ opacity: 0, y: 12 }"
          :enter="{ opacity: 1, y: 0, transition: { delay: Math.min(gi, 8) * 60 } }"
        >
          <div
            class="register-group-head register-group-toggle"
            role="button"
            tabindex="0"
            :aria-expanded="isRegisterExpanded(group.name)"
            @click="toggleRegisterGroup(group.name)"
            @keydown.enter.prevent="toggleRegisterGroup(group.name)"
            @keydown.space.prevent="toggleRegisterGroup(group.name)"
          >
            <div class="company-group-identity">
              <div class="tex-av-3d company-name-avatar" :style="{ backgroundColor: nameColor(group.name) }">{{ nameInitials(group.name) }}</div>
              <div>
                <div class="company-order-title">{{ group.name }}</div>
                <div class="company-order-sub">{{ group.orders.length }} {{ t('orders') }}</div>
              </div>
            </div>
            <div class="company-order-metrics">
              <div class="group-progress">
                <div class="group-progress-track"><span :style="{ width: groupProgress(group) + '%' }" /></div>
                <div class="group-progress-text">{{ fmtN(group.producedMeter) }} / {{ fmtN(group.expectedMeter) }} m ({{ groupProgress(group) }}%)</div>
              </div>
              <div class="company-kpi">
                <b>₹{{ fmtN(group.totals.totalAmount) }}</b>
                <span>{{ t('orRevenue') }}</span>
              </div>
              <div class="company-kpi">
                <b>{{ fmtN(group.totals.totalWaPassWeight) }} kg</b>
                <span>{{ t('orWaWeight') }}</span>
              </div>
              <div class="company-kpi">
                <b>{{ fmtN(group.totals.totalWeightShortage) }} kg</b>
                <span>{{ t('orShortage') }}</span>
              </div>
              <div class="company-order-pills">
                <span class="company-pill pill-orange">{{ group.openCount }} {{ t('orOpen') }}</span>
                <span class="company-pill pill-blue">{{ group.pendingCount }} {{ t('orPending') }}</span>
                <span class="company-pill pill-green">{{ group.liveCount }} {{ t('orLive') }}</span>
              </div>
              <v-btn
                icon
                size="small"
                variant="outlined"
                color="primary"
                :aria-label="isRegisterExpanded(group.name) ? t('orCollapse') : t('orExpand')"
                @click.stop="toggleRegisterGroup(group.name)"
              >
                <v-icon>{{ isRegisterExpanded(group.name) ? 'mdi-chevron-up' : 'mdi-chevron-down' }}</v-icon>
              </v-btn>
            </div>
          </div>
          <v-expand-transition>
            <div v-show="isRegisterExpanded(group.name)">
              <AgTable :rowData="group.orders" :columnDefs="visibleRegisterCols" :height="group.orders.length > 12 ? 'min(560px, 70vh)' : 'auto'" :footerRows="group.footerRows" :pagination="false" :highlightRowId="highlightOrderId" />
            </div>
          </v-expand-transition>
        </div>
      </div>
      <div v-else class="orders-empty">
        <EmptyState icon="mdi-package-variant-closed" :title="t('noData')" />
      </div>
    </v-card>

    <!-- Form Dialog -->
    <v-dialog v-model="dialog" max-width="520" persistent :fullscreen="$vuetify.display.smAndDown">
      <v-card rounded="xl" class="order-dialog-card">
        <v-card-title class="pt-5 px-6 font-weight-bold d-flex align-center justify-space-between">
          <span>{{ editId ? t('editOrder') : t('addOrder') }}</span>
          <v-chip size="small" color="primary" variant="tonal">{{ t('orderForm') }}</v-chip>
        </v-card-title>
        <v-card-text class="px-6">
          <v-form ref="formRef" validate-on="blur">
            <div class="form-section-title">{{ t('basicInfo') }}</div>
            <v-text-field v-model="form.orderName" :label="t('orderName')" class="mb-3" :rules="[rules.required(), rules.minLength(2), rules.maxLength(120)]" />
            <v-autocomplete v-model="form.company" :label="t('company')" :items="companyStore.items"
              item-value="_id" item-title="name" class="mb-3" :rules="[rules.required()]" />

            <div class="form-section-title">{{ t('productionValue') }}</div>
            <v-row class="mb-1">
              <v-col cols="6"><v-text-field v-model.number="form.expectedMeter" :label="t('expectedMeter')" type="number" suffix="m" hide-details="auto" :rules="[rules.required(), rules.positive()]" /></v-col>
              <v-col cols="6"><v-text-field v-model.number="form.ratePerMeter" :label="t('ratePerMeter')" type="number" prefix="₹" persistent-hint :hint="rateInWords" :rules="[rules.required(), rules.positive()]" /></v-col>
            </v-row>
            <v-row class="mb-1">
              <v-col cols="6"><v-text-field v-model="form.reedPick" :label="t('reedPick')" hide-details="auto" :rules="[rules.required(), rules.maxLength(30)]" /></v-col>
              <v-col cols="6"><v-text-field v-model="form.size" :label="t('size')" hide-details="auto" :rules="[rules.required(), rules.maxLength(30)]" /></v-col>
            </v-row>
            <v-text-field
              v-model.number="form.deductionPct"
              :label="t('deductionPct')"
              type="number"
              suffix="%"
              class="mb-3"
              hide-details="auto"
              :rules="[rules.required(), rules.number(), rules.percent()]"
            />
            <v-row class="mb-2 mt-1">
              <v-col cols="12" sm="6"><v-text-field v-model="form.startDate" :label="t('startDate')" type="date" hide-details="auto" :rules="[rules.required(), rules.validDate()]" /></v-col>
              <v-col cols="12" sm="6"><v-text-field v-model="form.endDate" :label="t('endDate')" type="date" hide-details="auto" :rules="[rules.validDate(), rules.notBefore(() => form.startDate)]" /></v-col>
            </v-row>
            <div class="form-section-title">{{ t('sampleReference') }}</div>
            <div class="mb-2" style="font-size:12px;color:#5A6A85">{{ t('sampleImage') }}</div>
            <v-file-input
              accept="image/*"
              :label="t('uploadImage')"
              prepend-inner-icon="mdi-image-plus"
              density="compact"
              variant="outlined"
              hide-details="auto"
              show-size
              @update:model-value="onImageSelect"
            />
            <div v-if="form.sampleImage" class="mt-2">
              <img :src="form.sampleImage" alt="sample" style="display:block;width:100%;max-width:240px;aspect-ratio:4 / 3;height:auto;object-fit:cover;border-radius:10px;border:1px solid #E0E7EF" />
            </div>
          </v-form>
        </v-card-text>
        <v-card-actions class="px-6 pb-5">
          <v-spacer />
          <v-btn variant="text" @click="dialog=false">{{ t('cancel') }}</v-btn>
          <v-btn color="primary" variant="flat" rounded="lg" :loading="saving" @click="save">{{ t('save') }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import EmptyState from '@/components/common/EmptyState.vue'
import { useI18n } from 'vue-i18n'
import { useOrderStore, useCompanyStore } from '@/stores/index'
import { useUtils } from '@/composables/useUtils'
import { useConfirm } from '@/composables/useConfirm'
import { useNotify } from '@/composables/useNotify'
import { useLoader } from '@/composables/useLoader'
import { useValidation } from '@/composables/useValidation'
import { useRouter, useRoute } from 'vue-router'
import PageHeader from '@/components/common/PageHeader.vue'
import AgTable from '@/components/common/AgTable.vue'
import { MotionDirective as vMotion } from '@vueuse/motion'

const { t } = useI18n()
const rules = useValidation()
const { fmt, fmtN, pct, fmtDate, numToWords } = useUtils()
const { confirm } = useConfirm()
const notify = useNotify()
const loader = useLoader()
const router = useRouter()
const route = useRoute()
const orderStore   = useOrderStore()
const companyStore = useCompanyStore()

const searchInput = ref(''); const searchTerm = ref('')
const dialog = ref(false); const saving = ref(false)
const editId = ref(null); const statusFilter = ref(''); const formRef = ref()
const archiveScope = ref('active')
const rowFilter = ref('all')
const dateFrom = ref(''); const dateTo = ref(''); const dateMenu = ref(false)
const expandedRegisterGroups = ref([])
const highlightOrderId = ref('')
const filterLoading = ref(false)
let filterLoadingTimer = null
let searchDebounceTimer = null
const form = ref({ orderName: '', company: null, expectedMeter: null, ratePerMeter: null, reedPick: '', size: '', deductionPct: 20, startDate: '', endDate: '', sampleImage: '' })

const rowFilterItems = computed(() => [
  { title: t('orFAll'), value: 'all' },
  { title: t('orFYetStart'), value: 'prod-open' },
  { title: t('orInProgress'), value: 'in-progress' },
  { title: t('orFProdComplete'), value: 'prod-closed' },
  { title: t('orFReady'), value: 'fin-open' },
  { title: t('orFLoss'), value: 'loss' },
  { title: t('orFUnpaid'), value: 'pay-unpaid' },
  { title: t('orFPartial'), value: 'pay-partial' },
  { title: t('orFFull'), value: 'pay-full' },
  { title: t('orLiveOrders'), value: 'live' },
  { title: t('orFOverdue'), value: 'overdue' },
  { title: t('orArchivedOrders'), value: 'archived' },
])

const allowedStatusFilters = ['', 'active', 'completed']
const allowedArchiveScopes = ['all', 'active', 'archived']
const allowedRowFilters = ['all', 'prod-open', 'in-progress', 'prod-closed', 'fin-open', 'loss', 'pay-unpaid', 'pay-partial', 'pay-full', 'live', 'overdue', 'archived']
let pendingOrdersUiState = null

function hydrateOrdersStateFromQuery() {
  const nextStatus = String(route.query.osf || '')
  const nextArchive = String(route.query.oas || '')
  const nextRow = String(route.query.orf || '')
  const nextSearch = String(route.query.oq || '')

  if (allowedStatusFilters.includes(nextStatus)) statusFilter.value = nextStatus
  if (allowedArchiveScopes.includes(nextArchive)) archiveScope.value = nextArchive
  if (allowedRowFilters.includes(nextRow)) rowFilter.value = nextRow

  searchInput.value = nextSearch
  searchTerm.value = nextSearch
}

function readOrdersUiStateFromQuery() {
  const stateKey = String(route.query.ors || '').trim()
  if (!stateKey) {
    pendingOrdersUiState = null
    return
  }

  try {
    const raw = sessionStorage.getItem(stateKey)
    if (!raw) {
      pendingOrdersUiState = null
      return
    }
    pendingOrdersUiState = JSON.parse(raw)
  } catch {
    pendingOrdersUiState = null
  }
}

function captureHorizontalScroll(triggerElement = null) {
  const root = triggerElement?.closest?.('.register-group') || document.querySelector('.register-group')
  if (!root) return 0

  const scrollEl = root.querySelector('.ag-body-horizontal-scroll-viewport')
    || root.querySelector('.ag-center-cols-viewport')
  return Number(scrollEl?.scrollLeft || 0)
}

function createOrdersUiSnapshot(triggerElement = null) {
  const snapshot = {
    expandedRegisterGroups: [...expandedRegisterGroups.value],
    pageScrollY: Number(window.scrollY || window.pageYOffset || 0),
    tableScrollLeft: captureHorizontalScroll(triggerElement),
  }
  const key = `orders-ui-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  try {
    sessionStorage.setItem(key, JSON.stringify(snapshot))
  } catch {
    return ''
  }
  return key
}

function applyPendingOrdersUiState() {
  if (!pendingOrdersUiState) return

  const names = companyGroups.value.map(group => group.name)
  const nextExpanded = Array.isArray(pendingOrdersUiState.expandedRegisterGroups)
    ? pendingOrdersUiState.expandedRegisterGroups.filter(name => names.includes(name))
    : []
  if (nextExpanded.length) {
    expandedRegisterGroups.value = Array.from(new Set(nextExpanded))
  }

  const pageScrollY = Number(pendingOrdersUiState.pageScrollY || 0)
  const tableScrollLeft = Number(pendingOrdersUiState.tableScrollLeft || 0)
  requestAnimationFrame(() => {
    if (pageScrollY > 0) window.scrollTo({ top: pageScrollY, behavior: 'auto' })
    if (tableScrollLeft > 0) {
      const scrollEl = document.querySelector('.register-group .ag-body-horizontal-scroll-viewport')
        || document.querySelector('.register-group .ag-center-cols-viewport')
      if (scrollEl) scrollEl.scrollLeft = tableScrollLeft
    }
    scrollToHighlightedOrder()
  })

  pendingOrdersUiState = null
}

function scrollToHighlightedOrder() {
  const orderId = String(route.query.highlightOrder || '').trim()
  if (!orderId) return
  highlightOrderId.value = orderId
  setTimeout(() => {
    const el = document.querySelector(`tr[data-row-id="${orderId}"]`)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, 350)
  setTimeout(() => { highlightOrderId.value = '' }, 3000)
}

const isOverdue = order => {
  if (!order?.endDate || orderExecutionState(order).label === 'Completed') return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return parseIsoDate(order.endDate) < today
}

const scopedRows = computed(() => {
  let rows = [...orderStore.items]

  switch (rowFilter.value) {
    case 'loss':
      rows = rows.filter(order => Number(order.rejectedMeter || order.lossMeter || 0) > 0)
      break
    case 'prod-open':
      rows = rows.filter(order => !order.productionClosed && Number(order.acceptedMeter || 0) <= 0)
      break
    case 'in-progress':
      rows = rows.filter(order => !order.productionClosed && Number(order.acceptedMeter || 0) > 0)
      break
    case 'prod-closed':
      rows = rows.filter(order => !!order.productionClosed && !order.financialClosed)
      break
    case 'fin-open':
      rows = rows.filter(order => !!order.productionClosed && !order.financialClosed)
      break
    case 'fin-closed':
      rows = rows.filter(order => !!order.financialClosed)
      break
    case 'pay-unpaid':
      rows = rows.filter(order => String(order.paymentStatus || '') === 'unpaid')
      break
    case 'pay-partial':
      rows = rows.filter(order => String(order.paymentStatus || '') === 'partially_paid')
      break
    case 'pay-full':
      rows = rows.filter(order => String(order.paymentStatus || '') === 'fully_paid')
      break
    case 'overdue':
      rows = rows.filter(isOverdue)
      break
    case 'live':
      rows = rows.filter(order => !order.archived)
      break
    case 'archived':
      rows = rows.filter(order => !!order.archived)
      break
    default:
      break
  }

  return rows
})

const filtered = computed(() => {
  const rows = statusFilter.value
    ? scopedRows.value.filter(order => order.status === statusFilter.value)
    : scopedRows.value
  if (!dateFrom.value && !dateTo.value) return rows
  return rows.filter(order => {
    const start = String(order.startDate || '').slice(0, 10)
    if (!start) return false
    return (!dateFrom.value || start >= dateFrom.value) && (!dateTo.value || start <= dateTo.value)
  })
})

const dateRangeLabel = computed(() => {
  if (!dateFrom.value && !dateTo.value) return t('orSelectDateRange')
  const from = dateFrom.value ? fmtDate(dateFrom.value) : t('orStart')
  const to = dateTo.value ? fmtDate(dateTo.value) : t('orAny')
  return `${from} – ${to}`
})

function clearDateRange() {
  dateFrom.value = ''
  dateTo.value = ''
}

const dateRangeModel = computed({
  get: () => [dateFrom.value, dateTo.value].filter(Boolean).map(parseIsoDate),
  set: values => {
    const sorted = [...(values || [])].sort((a, b) => a - b)
    dateFrom.value = sorted[0] ? toIsoDate(sorted[0]) : ''
    dateTo.value = sorted.length > 1 ? toIsoDate(sorted[sorted.length - 1]) : ''
  },
})

function toIsoDate(d) {
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function parseIsoDate(iso) {
  const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d)
}

const scopedActiveCount = computed(() => scopedRows.value.filter(order => order.status === 'active').length)
const scopedCompletedCount = computed(() => scopedRows.value.filter(order => order.status === 'completed').length)
const scopedLiveCount = computed(() => scopedRows.value.filter(order => !order.archived).length)
const scopedArchivedCount = computed(() => scopedRows.value.filter(order => !!order.archived).length)
const scopedProductionClosedCount = computed(() => scopedRows.value.filter(order => !!order.productionClosed).length)
const scopedFinancialClosedCount = computed(() => scopedRows.value.filter(order => !!order.financialClosed).length)
function objectIdToTs(id) {
  const raw = String(id || '')
  const hex = raw.slice(0, 8)
  return /^[0-9a-fA-F]{8}$/.test(hex) ? parseInt(hex, 16) * 1000 : 0
}
function orderAddedTs(order) {
  // Fallback sort key (newer first) when state-priority tie-breakers are not applicable.
  const startTs = new Date(order?.startDate || 0).getTime()
  if (Number.isFinite(startTs) && startTs > 0) return startTs
  const createdAtTs = new Date(order?.createdAt || 0).getTime()
  if (Number.isFinite(createdAtTs) && createdAtTs > 0) return createdAtTs
  return objectIdToTs(order?._id)
}
function orderChangedTs(order) {
  // Activity sort key used for company ranking and for in-progress/completed buckets.
  const updatedTs = new Date(order?.updatedAt || 0).getTime()
  if (Number.isFinite(updatedTs) && updatedTs > 0) return updatedTs
  const createdAtTs = new Date(order?.createdAt || 0).getTime()
  if (Number.isFinite(createdAtTs) && createdAtTs > 0) return createdAtTs
  return objectIdToTs(order?._id)
}

function orderStageRank(order) {
  const accepted = Number(order?.acceptedMeter ?? Math.max(0, Number(order?.producedMeter || 0) - Number(order?.rejectedMeter || 0)))
  if (order?.status === 'completed') return 2 // Completed last
  if (accepted <= 0) return 0 // Yet to Start first
  return 1 // In Progress middle
}

function compareOrdersForPriority(a, b) {
  // Recently changed orders (within last 10 minutes) always appear first
  const now = Date.now()
  const RECENT_MS = 10 * 60 * 1000
  const aRecent = (now - orderChangedTs(a)) < RECENT_MS
  const bRecent = (now - orderChangedTs(b)) < RECENT_MS
  if (aRecent !== bRecent) return aRecent ? -1 : 1
  if (aRecent && bRecent) return orderChangedTs(b) - orderChangedTs(a)

  // Then by stage rank
  const rankA = orderStageRank(a)
  const rankB = orderStageRank(b)
  if (rankA !== rankB) return rankA - rankB

  // Within same rank, most recently changed first
  return orderChangedTs(b) - orderChangedTs(a)
}
const rateInWords = computed(() => numToWords(form.value.ratePerMeter))
const avgProgress = computed(() => {
  if (!scopedRows.value.length) return 0
  const total = scopedRows.value.reduce((sum, o) => sum + pct(o.producedMeter, o.expectedMeter), 0)
  return Math.round(total / scopedRows.value.length)
})
const companyGroups = computed(() => {
  const map = new Map()
  for (const order of filtered.value) {
    const name = order?.company?.name || t('orUnknownCompany')
    if (!map.has(name)) {
      map.set(name, {
        name,
        orders: [],
        activeCount: 0,
        expectedMeter: 0,
        producedMeter: 0,
      })
    }
    const group = map.get(name)
    group.orders.push(order)
    group.activeCount += order.status === 'active' ? 1 : 0
    group.expectedMeter += Number(order.expectedMeter || 0)
    group.producedMeter += Number(order.producedMeter || 0)
  }
  return Array.from(map.values())
    .map(group => ({
      ...group,
      orders: [...group.orders].sort(compareOrdersForPriority),
    }))
    .sort((a, b) => {
      // Company with the most recently changed order comes first
      const latestA = Math.max(...a.orders.map(o => orderChangedTs(o)), 0)
      const latestB = Math.max(...b.orders.map(o => orderChangedTs(o)), 0)
      return latestB - latestA
    })
})

function buildRegisterFooterRow(orders) {
  const totals = orders.reduce((acc, order) => {
    const expected = Number(order?.expectedMeter || 0)
    const produced = Number(order?.producedMeter || 0)
    const rejected = Number(order?.rejectedMeter || order?.lossMeter || 0)
    const accepted = Number(order?.acceptedMeter ?? Math.max(0, produced - rejected))
    const rate = Number(order?.ratePerMeter || 0)
    const totalAmount = accepted * rate
    const deductionAmount = totalAmount * (Number(order?.deductionPct || 0) / 100)
    const rejectionLoss = rejected * rate
    const totalWaPassWeight = Number(order?.totalWaPassWeight || 0)
    const totalWeightShortage = Math.max(0, Number(order?.totalWeightShortage || 0))

    acc.expectedMeter += expected
    acc.producedMeter += produced
    acc.rejectedMeter += rejected
    acc.acceptedMeter += accepted
    acc.totalAmount += totalAmount
    acc.deductionAmount += deductionAmount
    acc.rejectionLoss += rejectionLoss
    acc.payableAmount += (totalAmount - deductionAmount)
    acc.totalWaPassWeight += totalWaPassWeight
    acc.totalWeightShortage += totalWeightShortage
    acc.paymentRemaining += Number(order?.paymentRemaining || 0)
    return acc
  }, {
    expectedMeter: 0,
    producedMeter: 0,
    rejectedMeter: 0,
    acceptedMeter: 0,
    totalAmount: 0,
    deductionAmount: 0,
    rejectionLoss: 0,
    payableAmount: 0,
    totalWaPassWeight: 0,
    totalWeightShortage: 0,
    paymentRemaining: 0,
  })

  return {
    __isFooter: true,
    orderName: t('orTotal'),
    status: '',
    expectedMeter: totals.expectedMeter,
    producedMeter: totals.producedMeter,
    rejectedMeter: totals.rejectedMeter,
    acceptedMeter: totals.acceptedMeter,
    ratePerMeter: null,
    deductionPct: null,
    totalAmount: totals.totalAmount,
    deductionAmount: totals.deductionAmount,
    rejectionLoss: totals.rejectionLoss,
    payableAmount: totals.payableAmount,
    totalWaPassWeight: totals.totalWaPassWeight,
    totalWeightShortage: totals.totalWeightShortage,
    paymentRemaining: totals.paymentRemaining,
    startDate: '',
    endDate: '',
  }
}

const registerGroups = computed(() => {
  const term = String(searchTerm.value || '').trim().toLowerCase()
  const baseGroups = !term
    ? companyGroups.value
    : companyGroups.value
    .map(group => ({
      ...group,
      orders: group.orders.filter(order => {
        const produced = Number(order?.producedMeter || 0)
        const rejected = Number(order?.rejectedMeter || order?.lossMeter || 0)
        const accepted = Number(order?.acceptedMeter ?? Math.max(0, produced - rejected))
        const rate = Number(order?.ratePerMeter || 0)
        const totalAmount = accepted * rate
        const deductionPct = Number(order?.deductionPct || 0)
        const deductionAmount = totalAmount * (deductionPct / 100)
        const payableAmount = totalAmount - deductionAmount
        const rejectionLoss = rejected * rate
        const totalWaPassWeight = Number(order?.totalWaPassWeight || 0)
        const totalWeightShortage = Number(order?.totalWeightShortage || 0)

        const haystack = [
          order.orderName,
          order.company?.name,
          order.reedPick,
          order.size,
          order.startDate,
          order.endDate,
          order.status,
          order.paymentStatus,
          order.paymentStatusLabel,
          order.productionClosed ? 'production closed closed' : 'production closed open',
          order.financialClosed ? 'financial closed closed' : 'financial closed open',
          order.archived ? 'archived' : 'live',
          produced,
          rejected,
          accepted,
          rate,
          totalAmount,
          deductionPct,
          deductionAmount,
          payableAmount,
          rejectionLoss,
          totalWaPassWeight,
          totalWeightShortage,
        ].join(' ').toLowerCase()
        return haystack.includes(term)
      }),
    }))
    .filter(group => group.orders.length)

  return baseGroups.map(group => {
    const footer = buildRegisterFooterRow(group.orders)
    return {
      ...group,
      footerRows: [footer],
      totals: footer,
      openCount: group.orders.filter(o => !o.productionClosed).length,
      pendingCount: group.orders.filter(o => o.productionClosed && !o.financialClosed).length,
      liveCount: group.orders.filter(o => !o.archived).length,
    }
  })
})
const visibleOrderCount = computed(() => registerGroups.value.reduce((sum, g) => sum + g.orders.length, 0))
const statCards = computed(() => [
  { label: t('orTotalOrders'), numeric: scopedRows.value.length, suffix: '', tone: 'blue', icon: 'mdi-cube-outline' },
  { label: t('orActiveOrders'), numeric: scopedActiveCount.value, suffix: '', tone: 'teal', icon: 'mdi-play-circle-outline' },
  { label: t('orCompletedOrders'), numeric: scopedCompletedCount.value, suffix: '', tone: 'green', icon: 'mdi-check-circle-outline' },
  { label: t('orAvgProgress'), numeric: avgProgress.value, suffix: '%', tone: 'orange', icon: 'mdi-trending-up' },
  { label: t('orLiveOrders'), numeric: scopedLiveCount.value, suffix: '', tone: 'indigo', icon: 'mdi-broadcast' },
  { label: t('orArchivedOrders'), numeric: scopedArchivedCount.value, suffix: '', tone: 'purple', icon: 'mdi-archive-outline' },
  { label: t('orProductionClosed'), numeric: scopedProductionClosedCount.value, suffix: '', tone: 'slate', icon: 'mdi-lock-outline' },
  { label: t('orFinancialClosed'), numeric: scopedFinancialClosedCount.value, suffix: '', tone: 'rose', icon: 'mdi-currency-inr' },
])

const statDisplay = ref({})
const statFrames = {}
function tweenStat(key, to) {
  cancelAnimationFrame(statFrames[key])
  const from = Number(statDisplay.value[key] ?? 0)
  const start = performance.now()
  const step = now => {
    const p = Math.min(1, (now - start) / 700)
    const eased = 1 - Math.pow(1 - p, 3)
    statDisplay.value = { ...statDisplay.value, [key]: from + (to - from) * eased }
    if (p < 1) statFrames[key] = requestAnimationFrame(step)
  }
  statFrames[key] = requestAnimationFrame(step)
}
function formatStat(stat) {
  const v = statDisplay.value[stat.label] ?? stat.numeric
  return `${fmtN(Math.round(v))}${stat.suffix}`
}
watch(statCards, cards => cards.forEach(s => tweenStat(s.label, s.numeric)), { immediate: true })
const pageSubtitle = computed(() => {
  const companies = new Set(filtered.value.map(o => o?.company?.name || t('orUnknownCompany'))).size
  return t('orSubtitle', { n: filtered.value.length, c: companies })
})
const showTableSpinner = computed(() => orderStore.loading || filterLoading.value)

function triggerFilterLoading() {
  filterLoading.value = true
  if (filterLoadingTimer) clearTimeout(filterLoadingTimer)
  filterLoadingTimer = setTimeout(() => {
    filterLoading.value = false
  }, 120)
}

function goToOrderDetail(row, triggerElement = null) {
  const location = getOrderDetailLocation(row, triggerElement)
  if (!location) return
  router.push(location)
}

function getOrderDetailLocation(row, triggerElement = null) {
  if (!row?._id) return null
  const query = { from: 'orders' }
  const expandCompany = String(row?.company?.name || '').trim()
  if (expandCompany) query.expandCompany = expandCompany
  query.orf = rowFilter.value
  query.oas = archiveScope.value
  if (statusFilter.value) query.osf = statusFilter.value
  if (searchInput.value) query.oq = searchInput.value
  const uiStateKey = createOrdersUiSnapshot(triggerElement)
  if (uiStateKey) query.ors = uiStateKey
  return { path: '/orders/' + row._id, query }
}

function getOrderDetailHref(row) {
  const location = getOrderDetailLocation(row)
  return location ? router.resolve(location).href : '#'
}

function applyExpandCompanyFromQuery() {
  const expandCompany = String(route.query.expandCompany || '').trim()
  if (!expandCompany) return
  if (!companyGroups.value.some(group => group.name === expandCompany)) return
  if (expandedRegisterGroups.value.includes(expandCompany)) return
  expandedRegisterGroups.value = [...expandedRegisterGroups.value, expandCompany]
}

watch(companyGroups, (groups) => {
  const names = groups.map(group => group.name)
  expandedRegisterGroups.value = expandedRegisterGroups.value.filter(name => names.includes(name))
}, { immediate: true })

watch([companyGroups, () => route.query.expandCompany], () => {
  applyExpandCompanyFromQuery()
}, { immediate: true })

watch([companyGroups, () => route.query.ors], () => {
  applyPendingOrdersUiState()
}, { immediate: true })

watch(registerGroups, (groups) => {
  if (!searchTerm.value) return
  const names = groups.map(group => group.name)
  expandedRegisterGroups.value = [...new Set([...expandedRegisterGroups.value, ...names])]
})

function isRegisterExpanded(name) {
  return expandedRegisterGroups.value.includes(name)
}

function toggleRegisterGroup(name) {
  expandedRegisterGroups.value = isRegisterExpanded(name)
    ? expandedRegisterGroups.value.filter(item => item !== name)
    : [...expandedRegisterGroups.value, name]
}

function fmtRatePerMeter(value) {
  const n = Number(value || 0)
  if (!Number.isFinite(n)) return '₹0'
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 20 })}`
}

function orderExecutionState(row) {
  if (row?.status === 'completed') return { label: t('orCompleted'), tone: 'green' }
  const acceptedMeter = Number(row?.acceptedMeter ?? Math.max(0, Number(row?.producedMeter || 0) - Number(row?.rejectedMeter || 0)))
  if (acceptedMeter <= 0) return { label: t('orYetToStart'), tone: 'grey' }
  return { label: t('orInProgress'), tone: 'blue' }
}

function chipHtml(label, tone, pulse = false) {
  return `<span class="ord-chip ord-chip--${tone}${pulse ? ' ord-chip--pulse' : ''}"><i></i>${label}</span>`
}

function orderProgressPct(row) {
  const expected = Number(row?.expectedMeter || 0)
  if (expected <= 0) return 0
  return Math.min(100, Math.round((Number(row?.producedMeter || 0) / expected) * 100))
}

const meterChartGroups = computed(() => [...registerGroups.value].sort((a, b) => b.expectedMeter - a.expectedMeter).slice(0, 8))


const overallProduction = computed(() => {
  const expected = filtered.value.reduce((sum, o) => sum + Number(o.expectedMeter || 0), 0)
  const produced = filtered.value.reduce((sum, o) => sum + Number(o.producedMeter || 0), 0)
  return { expected, produced, pct: expected > 0 ? Math.min(100, Math.round((produced / expected) * 100)) : 0 }
})
const overdueCount = computed(() => filtered.value.filter(isOverdue).length)
const overdueActive = computed(() => rowFilter.value === 'overdue')
function toggleOverdueFilter() {
  rowFilter.value = overdueActive.value ? 'all' : 'overdue'
}

const insightTones = {
  red: ['#C62828', '#FDECEC'],
  green: ['#2E7D32', '#E8F5E9'],
  amber: ['#E65100', '#FFF3E0'],
  blue: ['#1565C0', '#E3F2FD'],
  indigo: ['#3949AB', '#E8EAF6'],
}
function insightStyle(tone) {
  const [color, soft] = insightTones[tone] || insightTones.blue
  return { '--tone': color, '--tone-soft': soft }
}

const insights = computed(() => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  let dueSoon = 0
  for (const o of filtered.value) {
    if (!o.endDate || o.status === 'completed') continue
    const days = Math.round((parseIsoDate(o.endDate) - today) / 86400000)
    if (days >= 0 && days <= 7) dueSoon += 1
  }
  const { expected, produced } = overallProduction.value
  const rejected = filtered.value.reduce((sum, o) => sum + Number(o.rejectedMeter || 0), 0)
  const rejectionPct = produced > 0 ? (rejected / produced) * 100 : 0
  const unpaid = filtered.value.filter(o => !['fully_paid', 'partially_paid'].includes(String(o.paymentStatus || ''))).length
  const payable = filtered.value.reduce((sum, o) => sum + Number(o.payableAmount || 0), 0)
  const balance = filtered.value.reduce((sum, o) => sum + Math.max(0, Number(o.paymentRemaining || 0)), 0)
  const collected = Math.max(0, payable - balance)
  const collectedPct = payable > 0 ? (collected / payable) * 100 : 0
  const top = meterChartGroups.value[0]
  const items = [
    { show: balance > 0, label: t('orOutstanding'), value: `₹${fmtN(balance)}`, hint: t('orNotFullyPaid', { n: unpaid }), tone: 'red', icon: 'mdi-cash-remove' },
    { show: payable > 0, label: t('orCollRate'), value: `${collectedPct.toFixed(1)}%`, hint: t('orReceivedOf', { c: fmtN(collected), p: fmtN(payable) }), tone: collectedPct >= 90 ? 'green' : 'amber', icon: 'mdi-cash-check' },
    { show: dueSoon > 0, label: t('orDueIn7'), value: dueSoon, hint: t('orUpcoming'), tone: 'amber', icon: 'mdi-calendar-clock' },
    { show: expected > 0, label: t('orProdGap'), value: `${fmtN(Math.max(0, expected - produced))} m`, hint: t('orPctOfExpected', { p: overallProduction.value.pct }), tone: 'blue', icon: 'mdi-chart-line' },
    { show: produced > 0, label: t('orRejRateIns'), value: `${rejectionPct.toFixed(1)}%`, hint: t('orRejectedM', { r: fmtN(rejected) }), tone: rejectionPct > 5 ? 'amber' : 'green', icon: 'mdi-close-octagon-outline' },
    { show: unpaid > 0, label: t('orUnpaidOrders'), value: unpaid, hint: t('orNoPayment'), tone: 'amber', icon: 'mdi-cash-clock' },
    { show: !!top, label: t('orTopCompany'), value: top?.name || '-', hint: top ? t('orExpectedM', { m: fmtN(top.expectedMeter) }) : '', tone: 'indigo', icon: 'mdi-trophy-outline' },
  ]
  return items.filter(item => item.show)
})
function nameColor(str) {
  const palette = ['#1565C0','#2E7D32','#6A1B9A','#C62828','#F57C00','#00838F','#AD1457','#37474F','#4527A0','#558B2F']
  let h = 0
  for (let i = 0; i < (str || '').length; i++) { h = (h << 5) - h + str.charCodeAt(i); h |= 0 }
  return palette[Math.abs(h) % palette.length]
}
function groupProgress(group) {
  const expected = Number(group?.expectedMeter || 0)
  if (expected <= 0) return 0
  return Math.min(100, Math.round((Number(group.producedMeter || 0) / expected) * 100))
}
function nameInitials(name) {
  const w = String(name || '').trim().split(/\s+/)
  return w.length >= 2 ? (w[0][0] + w[1][0]).toUpperCase() : String(name || '?').slice(0, 2).toUpperCase()
}

const cols = computed(() => [
  {
    field: 'orderName',
    headerName: t('orOrderName'),
    flex: 1.45,
    minWidth: 170,
    pinned: 'left',
    disableRowNavigation: true,
    cellRenderer: p => {
      const nm = String(p.value || '')
      const color = nameColor(nm)
      const initials = nameInitials(nm)
      const href = getOrderDetailHref(p.data)
      return `<a href="${href}" style="display:flex;align-items:center;gap:9px;color:#1A2744;text-decoration:none;white-space:normal;line-height:1.35;padding:4px 0">
        <div class="tex-av-3d" style="width:34px;height:34px;background-color:${color};font-size:12px">${initials}</div>
        <span style="font-weight:700;overflow-wrap:anywhere">${nm || '-'}</span>
      </a>`
    },
  },
  { field: 'status', headerName: t('orOrderStatus'), flex: 0.9, minWidth: 130,
    cellRenderer: p => {
      const state = orderExecutionState(p.data)
      return chipHtml(state.label, state.tone, state.tone === 'blue')
    } },
  { headerName: t('orProgress'), flex: 1.1, minWidth: 150, sortable: false,
    valueFormatter: p => p.data?.__isFooter ? '' : `${orderProgressPct(p.data)}%`,
    cellRenderer: p => {
      const pct = orderProgressPct(p.data)
      return `<div class="ord-progress"><span style="width:${pct}%"></span></div><small class="ord-progress-text">${pct}% produced</small>`
    } },
  { field: 'company.name', headerName: t('orCompany'), flex: 1.2, minWidth: 140,
    cellRenderer: p => {
      const nm = String(p.data?.company?.name || '')
      if (!nm) return '-'
      const color = nameColor(nm)
      const initials = nameInitials(nm)
      return `<div style="display:flex;align-items:center;gap:8px;padding:4px 0">
        <div class="tex-av-3d" style="width:30px;height:30px;background-color:${color};font-size:11px">${initials}</div>
        <span style="font-weight:600;color:#1a2b49">${nm}</span>
      </div>`
    }
  },
  { field: 'expectedMeter',headerName: t('orExpectedMeters'),    flex: 1,    minWidth: 130, valueFormatter: p => fmtN(p.value || 0) + ' m' },
  { field: 'producedMeter',headerName: t('orProducedMeters'),    flex: 1,    minWidth: 130, valueFormatter: p => fmtN(p.value || 0) + ' m' },
  { field: 'rejectedMeter', headerName: t('orRejectedMeters'),   flex: 0.95, minWidth: 130, valueFormatter: p => `${fmtN(p.value || 0)} m` },
  {
    headerName: t('orAcceptedMeters'),
    flex: 1,
    minWidth: 145,
    valueFormatter: p => {
      if (p.data?.__isFooter) return `${fmtN(p.data?.acceptedMeter || 0)} m`
      const produced = Number(p.data?.producedMeter || 0)
      const rejected = Number(p.data?.rejectedMeter || p.data?.lossMeter || 0)
      const accepted = Number(p.data?.acceptedMeter ?? Math.max(0, produced - rejected))
      return `${fmtN(accepted)} m`
    },
  },
  { field: 'ratePerMeter', headerName: t('orRatePerMeter'),     flex: 0.9,  minWidth: 120, valueFormatter: p => p.data?.__isFooter ? '-' : fmtRatePerMeter(p.value || 0) },
  {
    headerName: t('orRevenue'),
    flex: 1,
    minWidth: 140,
    valueFormatter: p => {
      if (p.data?.__isFooter) return `₹${fmtN(p.data?.totalAmount || 0)}`
      const produced = Number(p.data?.producedMeter || 0)
      const rejected = Number(p.data?.rejectedMeter || 0)
      const accepted = Number(p.data?.acceptedMeter ?? Math.max(0, produced - rejected))
      const totalValue = accepted * Number(p.data?.ratePerMeter || 0)
      return `₹${fmtN(totalValue)}`
    },
  },
  { field: 'deductionPct', headerName: t('orDeductionPct'),        flex: 0.8,  minWidth: 105, valueFormatter: p => p.data?.__isFooter ? '-' : (Number(p.value || 0) + '%') },
  {
    headerName: t('orDeductionAmt'),
    flex: 1,
    minWidth: 145,
    valueFormatter: p => {
      if (p.data?.__isFooter) return `₹${fmtN(p.data?.deductionAmount || 0)}`
      const produced = Number(p.data?.producedMeter || 0)
      const rejected = Number(p.data?.rejectedMeter || 0)
      const accepted = Number(p.data?.acceptedMeter ?? Math.max(0, produced - rejected))
      const totalValue = accepted * Number(p.data?.ratePerMeter || 0)
      const deductionAmount = totalValue * (Number(p.data?.deductionPct || 0) / 100)
      return `₹${fmtN(deductionAmount)}`
    },
  },
  {
    headerName: t('orRejectionLoss'),
    flex: 1,
    minWidth: 130,
    valueFormatter: p => {
      if (p.data?.__isFooter) return `₹${fmtN(p.data?.rejectionLoss || 0)}`
      const rate = Number(p.data?.ratePerMeter || 0)
      const lostMeter = Number(p.data?.rejectedMeter || p.data?.lossMeter || 0)
      const grossLoss = lostMeter * rate
      return `₹${fmtN(grossLoss)}`
    },
  },
  {
    headerName: t('orPayableAmt'),
    flex: 1,
    minWidth: 140,
    valueFormatter: p => {
      if (p.data?.__isFooter) return `₹${fmtN(p.data?.payableAmount || 0)}`
      const produced = Number(p.data?.producedMeter || 0)
      const rejected = Number(p.data?.rejectedMeter || 0)
      const accepted = Number(p.data?.acceptedMeter ?? Math.max(0, produced - rejected))
      const totalValue = accepted * Number(p.data?.ratePerMeter || 0)
      const deductionAmount = totalValue * (Number(p.data?.deductionPct || 0) / 100)
      return `₹${fmtN(totalValue - deductionAmount)}`
    },
  },
  {
    field: 'totalWaPassWeight',
    headerName: t('orTotalWaPass'),
    flex: 1,
    minWidth: 160,
    valueFormatter: p => `${fmtN(p.value || 0)} kg`,
  },
  {
    field: 'totalWeightShortage',
    headerName: t('orTotalShortage'),
    flex: 1,
    minWidth: 165,
    valueFormatter: p => `${fmtN(Math.max(0, Number(p.value || 0)))} kg`,
  },
  { field: 'startDate', headerName: t('orStartDate'),            flex: 0.95, minWidth: 120, valueFormatter: p => p.value ? fmtDate(p.value) : '-' },
  { field: 'endDate',   headerName: t('orEndDate'),              flex: 0.95, minWidth: 120, valueFormatter: p => p.value ? fmtDate(p.value) : '-' },
  { field: 'productionClosed', headerName: t('orProductionClosed'), flex: 1.05, minWidth: 150,
    cellRenderer: p => chipHtml(p.value ? t('orClosed') : t('orOpen'), p.value ? 'green' : 'amber') },
  { field: 'financialClosed', headerName: t('orFinancialClosed'), flex: 1.05, minWidth: 145,
    cellRenderer: p => chipHtml(p.value ? t('orClosed') : t('orOpen'), p.value ? 'green' : 'amber') },
  { field: 'archived', headerName: t('orArchiveStatus'),        flex: 0.95, minWidth: 130,
    cellRenderer: p => chipHtml(p.value ? t('orArchived') : t('orLive'), p.value ? 'grey' : 'blue') },
  { field: 'paymentRemaining', headerName: t('orBalanceDue'), flex: 1, minWidth: 130,
    valueFormatter: p => `₹${fmtN(p.value || 0)}`,
    cellRenderer: p => `<b style="color:${Number(p.value) > 0 ? '#B45309' : '#2E7D32'}">₹${fmtN(p.value || 0)}</b>` },
  {
    field: 'paymentStatus',
    headerName: t('orPaymentStatus'),
    flex: 1,
    minWidth: 140,
    cellRenderer: p => {
      const status = String(p.data?.paymentStatus || '')
      const label = p.data?.paymentStatusLabel || (status === 'fully_paid' ? t('orPaidFull') : status === 'partially_paid' ? t('orPaidPartial') : t('orUnpaid'))
      const tone = status === 'fully_paid' ? 'green' : status === 'partially_paid' ? 'amber' : 'red'
      return chipHtml(label, tone)
    },
  },
  { headerName: t('orActions'), flex: 1.35, minWidth: 300, sortable: false, filter: false, disableRowNavigation: true,
    cellRenderer: p => `<div class="ord-actions">
      <a class="ord-act ord-act--view" href="${getOrderDetailHref(p.data)}" title="Open order"><i class="mdi mdi-eye-outline"></i>${t('orView')}</a>
      <button type="button" class="ord-act ord-act--edit" data-id="${p.data._id}" data-act="edit" title="Edit order"><i class="mdi mdi-pencil-outline"></i>${t('edit')}</button>
      <button type="button" class="ord-act ord-act--delete" data-id="${p.data._id}" data-act="delete" title="Delete order"><i class="mdi mdi-trash-can-outline"></i>${t('delete')}</button>
    </div>`,
    onCellClicked: async e => {
      const el = e.event.target?.closest?.('[data-act]')
      const action = el?.dataset?.act; const id = el?.dataset?.id
      if (!action || !id) return
      if (action === 'edit') open(orderStore.items.find(x => x._id === id))
      if (action === 'delete') {
        const orderName = e.data?.orderName || 'this order'
        const ok = await confirm({
          title: t('deleteOrderWarning'),
          message: t('deleteOrderConfirm', { name: orderName }),
          confirmText: t('deleteOrderBtn'),
          confirmColor: 'error',
        })
        if (ok) await loader.run(orderStore.remove(id), t('deletingMsg')).catch(() => {})
      }
    }
  },
].map(col => (
  col.disableRowNavigation
    ? col
    : { ...col, onCellClicked: ({ data, event }) => goToOrderDetail(data, event?.target || null) }
)))

const registerCols = computed(() => cols.value.filter(col => col.field !== 'company.name'))
const colKey = col => col.field || col.headerName
const hiddenColumnKeys = ref([])
const columnOptions = computed(() => registerCols.value
  .filter(col => col.field !== 'orderName')
  .map(col => ({ key: colKey(col), label: col.headerName })))
const visibleRegisterCols = computed(() => registerCols.value.filter(col => !hiddenColumnKeys.value.includes(colKey(col))))

function setColumnVisible(key, visible) {
  hiddenColumnKeys.value = visible
    ? hiddenColumnKeys.value.filter(k => k !== key)
    : [...hiddenColumnKeys.value, key]
}

function exportValue(col, row) {
  if (col.field === 'status') return orderExecutionState(row).label
  if (col.field === 'productionClosed' || col.field === 'financialClosed') return row[col.field] ? t('orClosed') : t('orOpen')
  if (col.field === 'archived') return row.archived ? t('orArchived') : t('orLive')
  if (col.field === 'paymentStatus') return row.paymentStatusLabel || row.paymentStatus || ''
  const raw = col.field ? col.field.split('.').reduce((acc, k) => acc?.[k], row) : undefined
  return typeof col.valueFormatter === 'function' ? col.valueFormatter({ value: raw, data: row }) : raw
}

function csvCell(value) {
  const text = String(value ?? '')
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

function exportRegisterCsv() {
  const rows = registerGroups.value.flatMap(group => group.orders)
  if (!rows.length) {
    notify.warning(t('orNoExport'))
    return
  }
  try {
    const exportCols = visibleRegisterCols.value.filter(col => col.field || col.valueFormatter)
    const lines = [
      exportCols.map(col => csvCell(col.headerName)).join(','),
      ...rows.map(row => exportCols.map(col => csvCell(exportValue(col, row))).join(',')),
    ]
    const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
    notify.success(t('orExportedN', { n: rows.length }))
  } catch {
    notify.error(t('orExportFail'))
  }
}

function open(row = null) {
  editId.value = row?._id || null
  form.value = {
    orderName: row?.orderName || '',
    company: row?.company?._id || row?.company || null,
    expectedMeter: row ? (row.expectedMeter ?? null) : null,
    ratePerMeter: row ? (row.ratePerMeter ?? null) : null,
    reedPick: row?.reedPick || '',
    size: row?.size || '',
    deductionPct: row?.deductionPct ?? 20,
    startDate: row?.startDate?.split('T')[0] || '',
    endDate: row?.endDate?.split('T')[0] || '',
    sampleImage: row?.sampleImage || '',
  }
  dialog.value = true
}

function onImageSelect(fileOrFiles) {
  const file = Array.isArray(fileOrFiles) ? fileOrFiles[0] : fileOrFiles
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => { form.value.sampleImage = reader.result }
  reader.readAsDataURL(file)
}

async function save() {
  const { valid } = await formRef.value.validate(); if (!valid) return
  saving.value = true
  try {
    const payload = {
      ...form.value,
      expectedMeter: Number(form.value.expectedMeter) || 0,
      ratePerMeter: Number(form.value.ratePerMeter) || 0,
      reedPick: String(form.value.reedPick || '').trim(),
      size: String(form.value.size || '').trim(),
    }
    editId.value ? await orderStore.update(editId.value, payload) : await orderStore.create(payload)
    dialog.value = false
  } catch {
    // store already showed the error; keep the dialog open
  } finally { saving.value = false }
}

async function del(id) {
  const row = orderStore.items.find(x => x._id === id)
  const orderName = row?.orderName || 'this order'
  const ok = await confirm({
    title: t('deleteOrderWarning'),
    message: t('deleteOrderConfirm', { name: orderName }),
    confirmText: t('deleteOrderBtn'),
    confirmColor: 'error',
  })
  if (ok) await loader.run(orderStore.remove(id), t('deletingMsg')).catch(() => {})
}

function openFromQuery() {
  if (String(route.query.add || '') !== '1') return
  open()
  const companyId = String(route.query.company || '')
  if (companyId) form.value.company = companyId
  router.replace({ path: '/orders', query: {} })
}

onMounted(async () => {
  hydrateOrdersStateFromQuery()
  readOrdersUiStateFromQuery()
  await Promise.all([
    fetchOrders(false),
    companyStore.fetch(false).catch(err => notify.apiError(err, t('companiesLoadFailed'))),
  ])
  applyPendingOrdersUiState()
  scrollToHighlightedOrder()
  openFromQuery()
})

watch(() => route.query, () => {
  hydrateOrdersStateFromQuery()
  readOrdersUiStateFromQuery()
  openFromQuery()
})

watch(searchInput, (value) => {
  if (searchDebounceTimer) clearTimeout(searchDebounceTimer)
  searchDebounceTimer = setTimeout(() => {
    searchTerm.value = value
  }, 140)
})

watch([statusFilter, rowFilter, searchTerm, dateFrom, dateTo], () => {
  triggerFilterLoading()
})

watch(archiveScope, async () => {
  triggerFilterLoading()
  await fetchOrders(true)
})

onBeforeUnmount(() => {
  Object.values(statFrames).forEach(id => cancelAnimationFrame(id))
  if (filterLoadingTimer) clearTimeout(filterLoadingTimer)
  if (searchDebounceTimer) clearTimeout(searchDebounceTimer)
})

async function fetchOrders(force = false) {
  const params = {}
  if (archiveScope.value === 'all') {
    params.includeArchived = '1'
  } else if (archiveScope.value === 'archived') {
    params.scope = 'closed'
  } else {
    params.scope = 'active'
  }
  try {
    await orderStore.fetch(params, { force })
  } catch (err) {
    notify.apiError(err, t('ordersLoadFailed'))
  }
}

// Spotlight position for the hovered card (CSS variables only)
let fxFrame = 0
function onFx(e) {
  if (fxFrame || e.pointerType === 'touch') return
  const { clientX, clientY, target } = e
  fxFrame = requestAnimationFrame(() => {
    fxFrame = 0
    const card = target?.closest?.('.order-stat, .order-insight, .register-group')
    if (!card) return
    const r = card.getBoundingClientRect()
    card.style.setProperty('--mx', `${clientX - r.left}px`)
    card.style.setProperty('--my', `${clientY - r.top}px`)
  })
}
onBeforeUnmount(() => { if (fxFrame) cancelAnimationFrame(fxFrame) })
</script>

<style scoped>
/* ── Base ───────────────────────────────────────────────────── */
.page-container {
  position: relative;
}

/* ── Page header ────────────────────────────────────────────── */
.orders-page :deep(.page-header) {
  align-items: center;
  flex-wrap: nowrap;
  margin-bottom: 20px;
}

.orders-page :deep(.page-header .page-title) {
  color: #1A2744;
  font-size: 28px;
  font-weight: 800;
  letter-spacing: -0.3px;
}

.orders-page :deep(.page-header .page-sub) {
  color: #64748B;
  font-size: 13px;
}

.orders-page :deep(.page-header-info) {
  flex: 0 0 auto;
}

.orders-page :deep(.page-header-actions) {
  flex: 1 1 auto;
  width: auto;
  min-width: 0;
}

.orders-header-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  flex-wrap: wrap;
  width: 100%;
}

.orders-filter-strip {
  display: flex;
  align-items: stretch;
  justify-content: flex-end;
  gap: 12px;
  flex: 0 1 auto;
  min-width: 0;
  flex-wrap: wrap;
}

.orders-filter-group {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 4px;
  min-height: 62px;
  box-sizing: border-box;
  padding: 8px 12px;
  border: 1px solid #E2E8F0;
  border-radius: 12px;
  background: #fff;
  flex-shrink: 0;
}

.orders-page .page-header { align-items: flex-start; }

.orders-filter-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  color: #94A3B8;
  white-space: nowrap;
}

.order-filter-select {
  width: 150px;
}

.orders-add-btn {
  flex-shrink: 0;
  height: 42px;
  min-width: 130px;
  border-radius: 12px !important;
  font-size: 14px;
  font-weight: 700;
  text-transform: none;
  letter-spacing: 0;
}

/* ── Stat cards ─────────────────────────────────────────────── */
.order-stat-grid {
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 20px;
}

.order-stat {
  grid-column: span 3;
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
  min-height: 84px;
  padding: 16px 18px 16px 20px;
  border-radius: 16px !important;
  border: 1px solid #E2E8F0;
  background: linear-gradient(135deg, #fff 55%, var(--tone-soft) 140%);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  transition: box-shadow 0.25s ease, border-color 0.25s ease;
}

.order-stat::after {
  content: '';
  position: absolute;
  left: 0;
  top: 14px;
  bottom: 14px;
  width: 4px;
  border-radius: 0 4px 4px 0;
  background: var(--tone);
}

.order-stat:hover {
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.1);
  border-color: color-mix(in srgb, var(--tone) 35%, #E2E8F0);
}

.order-stat:hover .order-stat-icon {
  transform: scale(1.1) rotate(-6deg);
}

.order-stat-icon {
  width: 52px;
  height: 52px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  border-radius: 16px;
  background: var(--tone-soft);
  color: var(--tone);
  transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.order-stat-text {
  min-width: 0;
  display: flex;
  flex-direction: column-reverse;
  gap: 6px;
}

.order-stat-label {
  font-size: 12px;
  font-weight: 600;
  line-height: 1.3;
  color: #64748B;
  overflow-wrap: anywhere;
}

.order-stat-value {
  font-size: 26px;
  font-weight: 800;
  line-height: 1;
  color: var(--tone);
}

/* Hover reveals the full heading as a small tooltip under the card */
.order-insight:hover {
  z-index: 6;
}

.order-insight:hover .order-insight-label {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  z-index: 7;
  max-width: none;
  padding: 6px 10px;
  border: 1px solid #E2E8F0;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.12);
  color: #1A2744;
  font-size: 12px;
  white-space: nowrap;
  overflow: visible;
  text-overflow: clip;
}

.order-stat-blue { --tone: #1565C0; --tone-soft: #E3F2FD; }
.order-stat-teal { --tone: #0097A7; --tone-soft: #E0F7FA; }
.order-stat-green { --tone: #2E7D32; --tone-soft: #E8F5E9; }
.order-stat-orange { --tone: #E65100; --tone-soft: #FFF3E0; }
.order-stat-indigo { --tone: #3949AB; --tone-soft: #E8EAF6; }
.order-stat-purple { --tone: #7B1FA2; --tone-soft: #F3E5F5; }
.order-stat-slate { --tone: #546E7A; --tone-soft: #ECEFF1; }
.order-stat-rose { --tone: #C62828; --tone-soft: #FFEBEE; }

/* ── Order register shell and toolbar ───────────────────────── */
.order-table-shell {
  overflow: hidden;
  border-radius: 18px !important;
  border: 1px solid #E2E8F0;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.order-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  padding: 16px 20px;
  border-bottom: 1px solid #EEF2F7;
  background: #fff;
}

.order-toolbar-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 16px;
  font-weight: 800;
  color: #1A2744;
}

.order-toolbar-icon {
  width: 30px;
  height: 30px;
  display: grid;
  place-items: center;
  border-radius: 8px;
  background: #1565C0;
  color: #fff;
}

.order-toolbar-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.order-toolbar-btn {
  text-transform: none;
  font-weight: 600;
  color: #334155 !important;
  border-color: #CBD5E1 !important;
}

.order-search {
  width: 220px;
}

.order-alert {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  margin-bottom: 16px;
  border-radius: 14px;
  border: 1px solid #F8C9C9;
  background: linear-gradient(135deg, #FFF5F5, #FDECEC);
  color: #B91C1C;
  font-size: 13.5px;
}

.order-alert b {
  font-weight: 800;
}

.order-alert-btn {
  margin-left: auto;
  text-transform: none;
  font-weight: 700;
}


/* ── Dialog ─────────────────────────────────────────────────── */
.order-dialog-card {
  background: #fff;
  border: 1px solid #E2E8F0;
}

/* ── Loading ────────────────────────────────────────────────── */
.order-skeleton {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 20px;
  min-height: 220px;
}

.order-skeleton-row {
  display: flex;
  gap: 12px;
}

.order-skeleton-row span {
  flex: 1;
  height: 52px;
  border-radius: 12px;
  background: linear-gradient(90deg, #EEF2F7 25%, #F8FAFD 37%, #EEF2F7 63%);
  background-size: 400% 100%;
  animation: ordShimmer 1.4s ease infinite;
}

/* ── Company rows ───────────────────────────────────────────── */
.register-groups {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px 20px 20px;
  background: #F8FAFD;
}

.register-group {
  border: 1px solid #E2E8F0;
  border-left: 4px solid #1565C0;
  border-radius: 14px;
  overflow: hidden;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  transition: box-shadow 0.25s ease;
}

.register-group:hover {
  box-shadow: 0 8px 22px rgba(15, 23, 42, 0.08);
}

.register-group-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 16px;
  padding: 14px 18px;
  background: #fff;
  border-bottom: 1px solid #EEF2F7;
}

.company-group-identity {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 200px;
}

.company-name-avatar {
  width: 44px;
  height: 44px;
  font-size: 14px;
  user-select: none;
}

.company-order-title {
  font-size: 14px;
  font-weight: 800;
  color: #1A2744;
  text-transform: uppercase;
  letter-spacing: 0.2px;
}

.company-order-sub {
  font-size: 12px;
  color: #64748B;
  margin-top: 2px;
}

.company-order-metrics {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 14px;
  flex: 1;
  min-width: 0;
  justify-content: flex-end;
}

.group-progress {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 0 1 240px;
  min-width: 180px;
}

.group-progress-track {
  height: 6px;
  border-radius: 999px;
  background: #E8EEF7;
  overflow: hidden;
}

.group-progress-track span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: #1565C0;
  transition: width 0.9s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.group-progress-text {
  font-size: 12px;
  font-weight: 600;
  color: #1565C0;
  white-space: nowrap;
}

.company-kpi {
  display: flex;
  flex-direction: column;
  padding: 6px 12px;
  min-width: 120px;
  border: 1px solid #E2E8F0;
  border-radius: 10px;
  background: #fff;
}

.company-kpi b {
  font-size: 13px;
  font-weight: 800;
  color: #1A2744;
}

.company-kpi span {
  font-size: 11px;
  color: #64748B;
}

.company-order-pills {
  display: flex;
  gap: 6px;
}

.company-pill {
  padding: 4px 10px;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
}

.pill-orange { background: #FFF3E0; color: #E65100; }
.pill-blue { background: #E3F2FD; color: #1565C0; }
.pill-green { background: #E8F5E9; color: #2E7D32; }

.register-group-toggle {
  cursor: pointer;
  user-select: none;
}

.register-group-toggle:focus-visible {
  outline: 2px solid #1565C0;
  outline-offset: 2px;
  border-radius: 8px;
}

/* ── AG Grid Overrides ──────────────────────────────────────── */
:deep(.ag-theme-quartz .ag-header) {
  background: #F8FAFC;
  border-bottom: 1px solid #E2E8F0;
}

:deep(.ag-theme-quartz .ag-header-cell-label) {
  font-weight: 700;
  color: #64748B;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  font-size: 11px;
}

:deep(.ag-theme-quartz .ag-row) {
  border-bottom: 1px solid #F1F5F9;
}

:deep(.ag-theme-quartz .ag-row:hover) {
  background: #F8FBFF;
}

:deep(.ag-theme-quartz .ag-cell) {
  display: flex;
  align-items: center;
  font-size: 12px;
  color: #334155;
}

.register-group :deep(.at-grid-shell) {
  border-radius: 0;
  border: 0;
  background: transparent;
}

.register-group :deep(.at-grid-table thead th) {
  background: #F8FAFC;
  color: #64748B;
}

.register-group :deep(.at-grid-table tbody tr:hover) {
  background: #F0F7FF;
}

.register-group :deep(.at-grid-footer-row td) {
  background: #F8FAFC;
  color: #1E293B;
  font-weight: 700;
  border-top: 2px solid #E2E8F0;
}

/* ── Form Section Title ─────────────────────────────────────── */
.form-section-title {
  margin: 6px 0 10px;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  color: #1565C0;
}

/* Empty state */
.orders-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 48px 16px;
  color: #64748B;
}

.orders-empty-text {
  font-weight: 600;
}

/* Date range menu */
.order-date-btn {
  min-width: 170px;
  text-transform: none;
  font-weight: 600;
  letter-spacing: 0;
  color: #1A2744 !important;
}

.order-date-card {
  padding: 10px 10px 12px;
}

.order-date-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 10px;
}

/* Columns menu */
.order-columns-card {
  min-width: 220px;
  max-height: 360px;
  overflow-y: auto;
  padding: 12px 16px;
}

.order-columns-title {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  color: #64748B;
  margin-bottom: 4px;
}

/* Register table content */
.register-groups :deep(.ord-chip) {
  position: relative;
  overflow: hidden;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 4px 11px 4px 9px;
  border-radius: 999px;
  font-size: 11.5px;
  font-weight: 700;
  letter-spacing: 0.2px;
  white-space: nowrap;
  box-shadow: inset 0 0 0 1px rgba(15, 23, 42, 0.06);
  transition: box-shadow 0.2s ease, transform 0.2s ease;
  animation: ordChipIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

.register-groups :deep(.ord-chip::after) {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(110deg, transparent 30%, rgba(255, 255, 255, 0.7) 50%, transparent 70%);
  transform: translateX(-120%);
  pointer-events: none;
}

.register-groups :deep(.ord-chip:hover::after) {
  animation: ordSheen 0.7s ease;
}

.register-groups :deep(.ord-chip:hover) {
  transform: translateY(-1px);
}

.register-groups :deep(.ord-chip:hover) {
  box-shadow: inset 0 0 0 1px rgba(15, 23, 42, 0.12), 0 2px 6px rgba(15, 23, 42, 0.08);
}

.register-groups :deep(.ord-chip i) {
  width: 7px;
  height: 7px;
  flex-shrink: 0;
  border-radius: 50%;
  background: currentColor;
  box-shadow: 0 0 0 3px color-mix(in srgb, currentColor 18%, transparent);
}

.register-groups :deep(.ord-chip--pulse i),
.register-groups :deep(.ord-chip--red i) {
  animation: ordPulse 1.6s ease-out infinite;
}

.register-groups :deep(.ord-chip--green) { background: linear-gradient(135deg, #E8F8EA, #D3F0D7); color: #1B5E20; }
.register-groups :deep(.ord-chip--blue) { background: linear-gradient(135deg, #E8F2FD, #D6E8FB); color: #0D47A1; }
.register-groups :deep(.ord-chip--amber) { background: linear-gradient(135deg, #FFF4E5, #FFE6C7); color: #B45309; }
.register-groups :deep(.ord-chip--grey) { background: linear-gradient(135deg, #F1F5F9, #E2E8F0); color: #475569; }
.register-groups :deep(.ord-chip--red) { background: linear-gradient(135deg, #FEECEC, #FDD7D7); color: #B91C1C; }

.register-groups :deep(.ord-actions) {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  padding: 4px 0;
}

.register-groups :deep(.ord-act) {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 28px;
  padding: 0 11px;
  border: 1px solid transparent;
  border-radius: 999px;
  font: inherit;
  font-size: 11.5px;
  font-weight: 700;
  line-height: 1;
  text-decoration: none;
  white-space: nowrap;
  cursor: pointer;
  transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s ease, background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease;
}

.register-groups :deep(.ord-act i) {
  font-size: 14px;
}

.register-groups :deep(.ord-act:hover) {
  transform: translateY(-1px);
  box-shadow: 0 6px 14px -6px rgba(15, 23, 42, 0.35);
}

.register-groups :deep(.ord-act:active) {
  transform: scale(0.96);
}

.register-groups :deep(.ord-act:focus-visible) {
  outline: 2px solid #1565C0;
  outline-offset: 2px;
}

.register-groups :deep(.ord-act--view) { color: #1565C0; background: #EEF4FB; border-color: #CFE0F5; }
.register-groups :deep(.ord-act--view:hover) { color: #fff; background: #1565C0; border-color: #1565C0; }
.register-groups :deep(.ord-act--edit) { color: #7B1FA2; background: #F5EEF9; border-color: #E6D3F0; }
.register-groups :deep(.ord-act--edit:hover) { color: #fff; background: #7B1FA2; border-color: #7B1FA2; }
.register-groups :deep(.ord-act--delete) { color: #C62828; background: #FDECEC; border-color: #F8C9C9; }
.register-groups :deep(.ord-act--delete:hover) { color: #fff; background: #C62828; border-color: #C62828; }

.register-groups :deep(.at-grid-table thead th) {
  background: #F5F8FC;
  color: #475569;
  font-weight: 700;
  letter-spacing: 0.6px;
  border-bottom: 2px solid #DCE5F0;
  box-shadow: none;
}

.register-groups :deep(.at-grid-table tbody td) {
  color: #1E293B;
  border-bottom: 1px solid #EEF2F7;
  font-variant-numeric: tabular-nums;
}

.register-groups :deep(.at-grid-table tbody tr:not(.at-grid-footer-row):hover td) {
  background: #F4F8FD;
}

.register-groups :deep(.at-grid-table tbody tr:not(.at-grid-footer-row):hover td:first-child) {
  box-shadow: inset 3px 0 0 #1565C0;
}

.register-groups :deep(.at-grid-table tbody tr) {
  animation: ordRowIn 0.55s cubic-bezier(0.2, 0.8, 0.2, 1) both;
}

.register-groups :deep(.at-grid-table tbody tr:nth-child(2)) { animation-delay: 40ms; }
.register-groups :deep(.at-grid-table tbody tr:nth-child(3)) { animation-delay: 80ms; }
.register-groups :deep(.at-grid-table tbody tr:nth-child(4)) { animation-delay: 120ms; }
.register-groups :deep(.at-grid-table tbody tr:nth-child(5)) { animation-delay: 160ms; }
.register-groups :deep(.at-grid-table tbody tr:nth-child(n+6)) { animation-delay: 200ms; }

.register-groups :deep(.at-grid-footer-row td) {
  background: #F1F6FC;
  font-weight: 800;
  color: #1A2744;
  border-top: 2px solid #DCE5F0;
}

.register-groups :deep(.ord-progress) {
  width: 100%;
  height: 6px;
  border-radius: 999px;
  background: #E8EEF6;
  overflow: hidden;
}

.register-groups :deep(.ord-progress span) {
  display: block;
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #42A5F5, #1565C0);
  transform-origin: left center;
  animation: ordGrow 0.9s cubic-bezier(0.2, 0.8, 0.2, 1) both;
}

.register-groups :deep(.ord-progress-text) {
  display: block;
  margin-top: 4px;
  font-size: 11px;
  font-weight: 700;
  color: #475569;
}

.order-insights {
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.order-insight {
  grid-column: span 4;
  position: relative;
  overflow: visible;
  display: flex;
  gap: 12px;
  padding: 14px 16px;
  background: #fff;
  border: 1px solid #E2E8F0;
  border-radius: 14px;
  transition: box-shadow 0.25s ease, border-color 0.25s ease;
}

.order-insight:hover {
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.08);
  border-color: color-mix(in srgb, var(--tone) 35%, #E2E8F0);
}

.order-insight-icon {
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  border-radius: 10px;
  background: var(--tone-soft);
  color: var(--tone);
}

.order-insight-label {
  font-size: 11.5px;
  font-weight: 600;
  color: #64748B;
}

.order-insight-value {
  font-size: 20px;
  font-weight: 800;
  color: #1A2744;
  line-height: 1.25;
}

.order-insight-hint {
  font-size: 11px;
  color: #94A3B8;
}

/* Responsive */
@media (max-width: 680px) {
  .order-toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .order-search {
    width: 100%;
  }

  .register-group-head {
    flex-direction: column;
    align-items: stretch;
  }

  .company-order-metrics {
    justify-content: flex-start;
  }
}

@media (max-width: 1024px) {
  .orders-filter-strip {
    flex-wrap: wrap;
  }
}

@media (max-width: 768px) {
  .orders-header-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .orders-filter-strip {
    flex-direction: column;
    align-items: stretch;
    width: 100%;
  }

  .orders-filter-group {
    width: 100%;
  }

  .orders-filter-group :deep(.v-btn-toggle) {
    display: flex;
    width: 100%;
  }

  .orders-filter-group :deep(.v-btn-toggle .v-btn) {
    flex: 1;
    min-width: 0;
    padding: 0 6px;
  }

  .orders-add-btn {
    width: 100%;
  }

  .order-stat-grid {
    gap: 10px;
  }

  .order-stat {
    grid-column: span 6;
    min-height: 72px;
    padding: 12px 12px 12px 16px;
    gap: 10px;
  }

  .order-stat-value {
    font-size: 20px;
  }

  .order-insight {
    grid-column: span 6;
  }

  .order-toolbar-actions {
    width: 100%;
  }

  .order-search {
    width: 100%;
  }

  .register-groups {
    padding: 12px;
  }
}

@media (max-width: 480px) {
  .order-insight {
    grid-column: 1 / -1;
  }

  .order-toolbar {
    padding: 14px;
  }

}

/* ── Motion ─────────────────────────────────────────────────── */
@keyframes ordGrow {
  from { transform: scaleX(0); }
  to { transform: scaleX(1); }
}

@keyframes ordPulse {
  0% { box-shadow: 0 0 0 0 color-mix(in srgb, currentColor 50%, transparent); }
  100% { box-shadow: 0 0 0 8px transparent; }
}

@keyframes ordChipIn {
  from { opacity: 0; transform: scale(0.8); }
  to { opacity: 1; transform: scale(1); }
}

@keyframes ordSheen {
  to { transform: translateX(120%); }
}

@keyframes ordRowIn {
  from { opacity: 0; transform: translateX(-8px); }
  to { opacity: 1; transform: translateX(0); }
}

@keyframes ordShimmer {
  0% { background-position: 100% 50%; }
  100% { background-position: 0 50%; }
}

@media (prefers-reduced-motion: reduce) {
  .orders-page,
  .orders-page * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
/* ── Company summary and responsive refinements ─────────────── */
.orders-page {
  min-width: 0;
  max-width: 100%;
}

.order-insight-text {
  min-width: 0;
}

.order-insight-value {
  overflow-wrap: anywhere;
  word-break: break-word;
}

@media (max-width: 480px) {
  .order-stat-value {
    font-size: 16px;
  }

  .order-stat-icon {
    width: 32px;
    height: 32px;
  }

  .order-toolbar-actions {
    flex-wrap: wrap;
    width: 100%;
  }

  .order-search {
    width: 100%;
  }
}

/* ── FX layer: spotlight, sheen, pulse ── */
.order-stat::before,
.order-insight::before,
.register-group::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: radial-gradient(220px circle at var(--mx, 50%) var(--my, 50%), color-mix(in srgb, var(--tone, #1565C0) 14%, transparent), transparent 70%);
  opacity: 0;
  transition: opacity 0.3s ease;
  pointer-events: none;
  z-index: 0;
}

.order-stat:hover::before,
.order-insight:hover::before,
.register-group:hover::before { opacity: 1; }

.order-stat > .order-stat-icon,
.order-stat > .order-stat-text,
.order-insight > * { position: relative; z-index: 1; }

.register-group { position: relative; }
.register-group > * { position: relative; z-index: 1; }

@media (hover: hover) {
  .order-stat,
  .order-insight { transition: transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.25s ease, border-color 0.25s ease; }
  .order-stat:hover,
  .order-insight:hover { transform: translateY(-3px); }
}

.order-add-sheen,
.orders-add-btn { position: relative; overflow: hidden; }

.group-progress-track span { position: relative; overflow: hidden; }

.group-progress-track span::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.6), transparent);
  transform: translateX(-100%);
}

.company-name-avatar { transition: transform 0.35s cubic-bezier(0.2, 0.8, 0.2, 1); }
.register-group:hover .company-name-avatar { transform: scale(1.1) rotate(-5deg); }
.company-kpi { transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease; }
.company-kpi:hover { transform: translateY(-2px); border-color: #C9D8EE; box-shadow: 0 8px 16px -10px rgba(21, 101, 192, 0.45); }

@media (prefers-reduced-motion: no-preference) {
  .order-insight-icon { animation: ord-bob 4s ease-in-out infinite; }
  .order-insight:nth-child(even) .order-insight-icon { animation-delay: -2s; }
  .order-alert { animation: ord-alert 2.6s ease-in-out infinite; }
  .order-alert .v-icon { animation: ord-bob 1.6s ease-in-out infinite; }
  .group-progress-track span::after { animation: ord-fill-sheen 3.2s ease-in-out 1.2s infinite; }
  .orders-add-btn::after {
    content: '';
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    width: 40%;
    background: linear-gradient(100deg, transparent, rgba(255, 255, 255, 0.4), transparent);
    transform: translateX(-150%) skewX(-18deg);
    animation: ord-btn-sheen 4.5s ease-in-out infinite 1.2s;
    pointer-events: none;
  }
  .order-toolbar-icon { animation: ord-bob 4.5s ease-in-out infinite; }
}

@keyframes ord-bob {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-3px); }
}

@keyframes ord-alert {
  0%, 100% { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0); }
  50% { box-shadow: 0 0 0 6px rgba(220, 38, 38, 0.1); }
}

@keyframes ord-fill-sheen {
  0% { transform: translateX(-100%); }
  60%, 100% { transform: translateX(100%); }
}

@keyframes ord-btn-sheen {
  0%, 60% { transform: translateX(-150%) skewX(-18deg); }
  100% { transform: translateX(380%) skewX(-18deg); }
}
</style>

