<template>
  <div class="page-container">
    <PageHeader :title="t('orders')" :sub="pageSubtitle">
      <div class="orders-header-actions">
        <div class="orders-filter-strip">
          <div class="orders-filter-group">
            <span class="orders-filter-label">Order Status</span>
            <v-btn-toggle v-model="statusFilter" density="compact" rounded="lg" color="primary" variant="outlined" divided>
              <v-btn value="" size="small">All</v-btn>
              <v-btn value="active" size="small">{{ t('active') }}</v-btn>
              <v-btn value="completed" size="small">{{ t('completed') }}</v-btn>
            </v-btn-toggle>
          </div>

          <div class="orders-filter-group">
            <span class="orders-filter-label">Row Filter</span>
            <v-select
              v-model="rowFilter"
              :items="rowFilterItems"
              item-title="title"
              item-value="value"
              density="compact"
              rounded="lg"
              variant="outlined"
              hide-details
              class="order-filter-select"
            />
          </div>

          <div class="orders-filter-group">
            <span class="orders-filter-label">Archive Scope</span>
            <v-btn-toggle v-model="archiveScope" density="compact" rounded="lg" color="secondary" variant="outlined" divided>
              <v-btn value="all" size="small">All</v-btn>
              <v-btn value="active" size="small">Live</v-btn>
              <v-btn value="archived" size="small">Archive</v-btn>
            </v-btn-toggle>
          </div>
        </div>

        <div class="orders-filter-group orders-action-group">
          <span class="orders-filter-label">Action</span>
          <v-btn color="primary" prepend-icon="mdi-plus" variant="flat" rounded="lg" class="orders-add-btn" @click="open()">
            {{ t('addOrder') }}
          </v-btn>
        </div>
      </div>
    </PageHeader>

    <v-row class="mb-4">
      <v-col cols="12" sm="6" md="3">
        <v-card rounded="xl" class="at-card order-stat order-stat-primary">
          <div class="order-stat-label">Total Orders</div>
          <div class="order-stat-value">{{ scopedRows.length }}</div>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-card rounded="xl" class="at-card order-stat order-stat-info">
          <div class="order-stat-label">Active</div>
          <div class="order-stat-value">{{ scopedActiveCount }}</div>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-card rounded="xl" class="at-card order-stat order-stat-good">
          <div class="order-stat-label">Completed</div>
          <div class="order-stat-value">{{ scopedCompletedCount }}</div>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-card rounded="xl" class="at-card order-stat order-stat-warn">
          <div class="order-stat-label">Avg Progress</div>
          <div class="order-stat-value">{{ avgProgress }}%</div>
        </v-card>
      </v-col>
    </v-row>

    <v-row class="mb-4">
      <v-col cols="12" sm="6" md="3">
        <v-card rounded="xl" class="at-card order-stat order-stat-neutral">
          <div class="order-stat-label">Live</div>
          <div class="order-stat-value">{{ scopedLiveCount }}</div>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-card rounded="xl" class="at-card order-stat order-stat-neutral">
          <div class="order-stat-label">Archived</div>
          <div class="order-stat-value">{{ scopedArchivedCount }}</div>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-card rounded="xl" class="at-card order-stat order-stat-neutral">
          <div class="order-stat-label">Production Closed</div>
          <div class="order-stat-value">{{ scopedProductionClosedCount }}</div>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-card rounded="xl" class="at-card order-stat order-stat-neutral">
          <div class="order-stat-label">Financial Closed</div>
          <div class="order-stat-value">{{ scopedFinancialClosedCount }}</div>
        </v-card>
      </v-col>
    </v-row>

    <!-- Table -->
    <v-card rounded="xl" class="at-card order-table-shell" style="overflow:hidden">
      <div class="order-toolbar">
        <div class="order-toolbar-title">
          <v-icon size="18" color="primary" class="mr-1">mdi-table-large</v-icon>
          Order Register
        </div>
        <v-text-field v-model="searchInput" :placeholder="t('search')" prepend-inner-icon="mdi-magnify"
          density="compact" variant="outlined" hide-details class="order-search" />
      </div>
      <div v-if="showTableSpinner" class="orders-table-loading">
        <v-progress-circular indeterminate color="primary" size="38" width="4" />
      </div>
      <div class="register-groups" v-else-if="registerGroups.length">
        <div v-for="group in registerGroups" :key="group.name" class="register-group">
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
              <span class="company-order-chip">{{ fmtN(group.producedMeter) }} / {{ fmtN(group.expectedMeter) }} m</span>
              <v-btn
                size="small"
                variant="tonal"
                color="primary"
                :prepend-icon="isRegisterExpanded(group.name) ? 'mdi-chevron-up' : 'mdi-chevron-down'"
                @click.stop="toggleRegisterGroup(group.name)"
              >
                {{ isRegisterExpanded(group.name) ? 'Collapse' : 'Expand' }}
              </v-btn>
            </div>
          </div>
          <v-expand-transition>
            <div v-show="isRegisterExpanded(group.name)">
              <AgTable :rowData="group.orders" :columnDefs="registerCols" height="auto" :footerRows="group.footerRows" :pagination="false" />
            </div>
          </v-expand-transition>
        </div>
      </div>
      <div v-else class="text-center py-8" style="color:#5A6A85">{{ t('noData') }}</div>
    </v-card>

    <!-- Form Dialog -->
    <v-dialog v-model="dialog" max-width="520" persistent>
      <v-card rounded="xl" class="order-dialog-card">
        <v-card-title class="pt-5 px-6 font-weight-bold d-flex align-center justify-space-between">
          <span>{{ editId ? t('editOrder') : t('addOrder') }}</span>
          <v-chip size="small" color="primary" variant="tonal">Order Form</v-chip>
        </v-card-title>
        <v-card-text class="px-6">
          <v-form ref="formRef" validate-on="blur">
            <div class="form-section-title">Basic Information</div>
            <v-text-field v-model="form.orderName" :label="t('orderName')" class="mb-3" :rules="[v => !!v || t('required')]" />
            <v-autocomplete v-model="form.company" :label="t('company')" :items="companyStore.items"
              item-value="_id" item-title="name" class="mb-3" :rules="[v => !!v || t('required')]" />

            <div class="form-section-title">Production & Value</div>
            <v-row class="mb-1">
              <v-col cols="6"><v-text-field v-model.number="form.expectedMeter" :label="t('expectedMeter')" type="number" suffix="m" hide-details="auto" :rules="[v => Number(v) > 0 || t('required')]" /></v-col>
              <v-col cols="6"><v-text-field v-model.number="form.ratePerMeter" :label="t('ratePerMeter')" type="number" prefix="₹" persistent-hint :hint="rateInWords" :rules="[v => Number(v) > 0 || t('required')]" /></v-col>
            </v-row>
            <v-row class="mb-1">
              <v-col cols="6"><v-text-field v-model="form.reedPick" :label="t('reedPick')" hide-details="auto" :rules="[v => !!String(v || '').trim() || t('required')]" /></v-col>
              <v-col cols="6"><v-text-field v-model="form.size" :label="t('size')" hide-details="auto" :rules="[v => !!String(v || '').trim() || t('required')]" /></v-col>
            </v-row>
            <v-text-field
              v-model.number="form.deductionPct"
              :label="t('deductionPct')"
              type="number"
              suffix="%"
              class="mb-3"
              hide-details="auto"
              :rules="[
                v => !(v === '' || v === null || typeof v === 'undefined') || t('required'),
                v => Number(v) >= 0 || 'Deduction must be 0 or more',
                v => Number(v) <= 100 || 'Deduction cannot exceed 100%'
              ]"
            />
            <v-row class="mb-2 mt-1">
              <v-col cols="12" sm="6"><v-text-field v-model="form.startDate" :label="t('startDate')" type="date" hide-details="auto" :rules="[v => !!v || t('required')]" /></v-col>
              <v-col cols="12" sm="6"><v-text-field v-model="form.endDate" :label="t('endDate')" type="date" hide-details="auto" /></v-col>
            </v-row>
            <div class="form-section-title">Sample & Reference</div>
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
              <img :src="form.sampleImage" alt="sample" style="max-width:100%;max-height:120px;border-radius:10px;border:1px solid #E0E7EF" />
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
import { useI18n } from 'vue-i18n'
import { useOrderStore, useCompanyStore } from '@/stores/index'
import { useUtils } from '@/composables/useUtils'
import { useConfirm } from '@/composables/useConfirm'
import { useRouter, useRoute } from 'vue-router'
import PageHeader from '@/components/common/PageHeader.vue'
import AgTable from '@/components/common/AgTable.vue'

const { t } = useI18n()
const { fmt, fmtN, pct, fmtDate, numToWords } = useUtils()
const { confirm } = useConfirm()
const router = useRouter()
const route = useRoute()
const orderStore   = useOrderStore()
const companyStore = useCompanyStore()

const searchInput = ref(''); const searchTerm = ref('')
const dialog = ref(false); const saving = ref(false)
const editId = ref(null); const statusFilter = ref(''); const formRef = ref()
const archiveScope = ref('active')
const rowFilter = ref('all')
const expandedRegisterGroups = ref([])
const filterLoading = ref(false)
let filterLoadingTimer = null
let searchDebounceTimer = null
const form = ref({ orderName: '', company: null, expectedMeter: null, ratePerMeter: null, reedPick: '', size: '', deductionPct: 20, startDate: '', endDate: '', sampleImage: '' })

const rowFilterItems = [
  { title: 'All Rows', value: 'all' },
  { title: 'Loss Rows', value: 'loss' },
  { title: 'Production Not Closed', value: 'prod-open' },
  { title: 'Production Closed', value: 'prod-closed' },
  { title: 'Financial Not Closed', value: 'fin-open' },
  { title: 'Financial Closed', value: 'fin-closed' },
  { title: 'Payment Unpaid', value: 'pay-unpaid' },
  { title: 'Payment Partially Paid', value: 'pay-partial' },
  { title: 'Payment Fully Paid', value: 'pay-full' },
  { title: 'Live Orders', value: 'live' },
  { title: 'Archived Orders', value: 'archived' },
]

const allowedStatusFilters = ['', 'active', 'completed']
const allowedArchiveScopes = ['all', 'active', 'archived']
const allowedRowFilters = rowFilterItems.map(item => item.value)
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
  })

  pendingOrdersUiState = null
}

const scopedRows = computed(() => {
  let rows = [...orderStore.items]

  switch (rowFilter.value) {
    case 'loss':
      rows = rows.filter(order => Number(order.rejectedMeter || order.lossMeter || 0) > 0)
      break
    case 'prod-open':
      rows = rows.filter(order => !order.productionClosed)
      break
    case 'prod-closed':
      rows = rows.filter(order => !!order.productionClosed)
      break
    case 'fin-open':
      rows = rows.filter(order => !order.financialClosed)
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
  if (!statusFilter.value) return scopedRows.value
  return scopedRows.value.filter(order => order.status === statusFilter.value)
})

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
  const rankA = orderStageRank(a)
  const rankB = orderStageRank(b)
  if (rankA !== rankB) return rankA - rankB

  // In Progress & Completed: latest updated first
  if (rankA === 1 || rankA === 2) {
    const changedDelta = orderChangedTs(b) - orderChangedTs(a)
    if (changedDelta !== 0) return changedDelta
  }

  // Yet to Start fallback: newer added first
  const addedDelta = orderAddedTs(b) - orderAddedTs(a)
  if (addedDelta !== 0) return addedDelta
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
    const name = order?.company?.name || 'Unknown Company'
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
  })

  return {
    __isFooter: true,
    orderName: 'Total',
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

  return baseGroups.map(group => ({
    ...group,
    footerRows: [buildRegisterFooterRow(group.orders)],
  }))
})
const pageSubtitle = computed(() => {
  if (statusFilter.value === 'completed') return `${filtered.value.length} ${t('completedOrders')}`
  if (statusFilter.value === 'active') return `${filtered.value.length} ${t('activeOrders')}`
  return `${scopedRows.value.length} ${t('orders')}`
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
  if (row?.status === 'completed') return { label: 'Completed', chipClass: 'chip-done' }
  const acceptedMeter = Number(row?.acceptedMeter ?? Math.max(0, Number(row?.producedMeter || 0) - Number(row?.rejectedMeter || 0)))
  if (acceptedMeter <= 0) return { label: 'Yet to Start', chipClass: 'chip-pending' }
  return { label: 'In Progress', chipClass: 'chip-active' }
}

function nameColor(str) {
  const palette = ['#1565C0','#2E7D32','#6A1B9A','#C62828','#F57C00','#00838F','#AD1457','#37474F','#4527A0','#558B2F']
  let h = 0
  for (let i = 0; i < (str || '').length; i++) { h = (h << 5) - h + str.charCodeAt(i); h |= 0 }
  return palette[Math.abs(h) % palette.length]
}
function nameInitials(name) {
  const w = String(name || '').trim().split(/\s+/)
  return w.length >= 2 ? (w[0][0] + w[1][0]).toUpperCase() : String(name || '?').slice(0, 2).toUpperCase()
}

const cols = [
  {
    field: 'orderName',
    headerName: 'Order Name',
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
  { field: 'status', headerName: 'Order Status', flex: 0.9, minWidth: 115,
    cellRenderer: p => {
      const state = orderExecutionState(p.data)
      return `<span class="${state.chipClass}" style="padding:2px 10px;border-radius:20px;font-size:11px">${state.label}</span>`
    } },
  { field: 'company.name', headerName: 'Company', flex: 1.2, minWidth: 140,
    cellRenderer: p => {
      const nm = String(p.data?.company?.name || '')
      if (!nm) return '-'
      const color = nameColor(nm)
      const initials = nameInitials(nm)
      return `<div style="display:flex;align-items:center;gap:8px;padding:4px 0">
        <div class="tex-av-3d" style="width:30px;height:30px;background-color:${color};font-size:10px">${initials}</div>
        <span style="font-weight:600;color:#1a2b49">${nm}</span>
      </div>`
    }
  },
  { field: 'expectedMeter',headerName: 'Expected Meters',    flex: 1,    minWidth: 130, valueFormatter: p => fmtN(p.value || 0) + ' m' },
  { field: 'producedMeter',headerName: 'Produced Meters',    flex: 1,    minWidth: 130, valueFormatter: p => fmtN(p.value || 0) + ' m' },
  { field: 'rejectedMeter', headerName: 'Rejected Meters',   flex: 0.95, minWidth: 130, valueFormatter: p => `${fmtN(p.value || 0)} m` },
  {
    headerName: 'Accepted Meters',
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
  { field: 'ratePerMeter', headerName: 'Rate per Meter',     flex: 0.9,  minWidth: 120, valueFormatter: p => p.data?.__isFooter ? '-' : fmtRatePerMeter(p.value || 0) },
  {
    headerName: 'Total Amount',
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
  { field: 'deductionPct', headerName: 'Deduction %',        flex: 0.8,  minWidth: 105, valueFormatter: p => p.data?.__isFooter ? '-' : (Number(p.value || 0) + '%') },
  {
    headerName: 'Deduction Amount',
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
    headerName: 'Rejection Loss',
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
    headerName: 'Payable Amount',
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
    headerName: 'Total WA-pass Weight',
    flex: 1,
    minWidth: 160,
    valueFormatter: p => `${fmtN(p.value || 0)} kg`,
  },
  {
    field: 'totalWeightShortage',
    headerName: 'Total Weight Shortage',
    flex: 1,
    minWidth: 165,
    valueFormatter: p => `${fmtN(Math.max(0, Number(p.value || 0)))} kg`,
  },
  { field: 'startDate', headerName: 'Start Date',            flex: 0.95, minWidth: 120, valueFormatter: p => p.value ? fmtDate(p.value) : '-' },
  { field: 'endDate',   headerName: 'End Date',              flex: 0.95, minWidth: 120, valueFormatter: p => p.value ? fmtDate(p.value) : '-' },
  { field: 'productionClosed', headerName: 'Production Closed', flex: 1.05, minWidth: 150,
    cellRenderer: p => `<span class="${p.value ? 'chip-done' : 'chip-pending'}" style="padding:2px 10px;border-radius:20px;font-size:11px">${p.value ? 'Closed' : 'Open'}</span>` },
  { field: 'financialClosed', headerName: 'Financial Closed', flex: 1.05, minWidth: 145,
    cellRenderer: p => `<span class="${p.value ? 'chip-done' : 'chip-pending'}" style="padding:2px 10px;border-radius:20px;font-size:11px">${p.value ? 'Closed' : 'Open'}</span>` },
  { field: 'archived', headerName: 'Archive Status',        flex: 0.95, minWidth: 130,
    cellRenderer: p => `<span class="${p.value ? 'chip-done' : 'chip-pending'}" style="padding:2px 10px;border-radius:20px;font-size:11px">${p.value ? 'Archived' : 'Live'}</span>` },
  {
    field: 'paymentStatus',
    headerName: 'Payment Status',
    flex: 1,
    minWidth: 140,
    cellRenderer: p => {
      const status = String(p.data?.paymentStatus || '')
      const label = p.data?.paymentStatusLabel || (status === 'fully_paid' ? 'Fully Paid' : status === 'partially_paid' ? 'Partially Paid' : 'Unpaid')
      const cls = status === 'fully_paid' ? 'chip-done' : status === 'partially_paid' ? 'chip-pending' : 'chip-active'
      return `<span class="${cls}" style="padding:2px 10px;border-radius:20px;font-size:11px">${label}</span>`
    },
  },
  { headerName: 'Actions', flex: 1.35, minWidth: 180, sortable: false, filter: false, disableRowNavigation: true,
    cellRenderer: p => `<div style="display:flex;gap:4px;padding-top:8px">
      <a href="${getOrderDetailHref(p.data)}" style="background:#E3F2FD;border-radius:6px;padding:4px 8px;color:#1565C0;font-size:11px;font-weight:600;text-decoration:none;display:inline-flex;align-items:center">View</a>
      <button data-id="${p.data._id}" data-action="edit"   style="background:#F3E5F5;border:none;border-radius:6px;padding:4px 8px;cursor:pointer;color:#7B1FA2;font-size:11px;font-weight:600">Edit</button>
      <button data-id="${p.data._id}" data-action="delete" style="background:#FFEBEE;border:none;border-radius:6px;padding:4px 8px;cursor:pointer;color:#C62828;font-size:11px;font-weight:600">Delete</button>
    </div>`,
    onCellClicked: async e => {
      const action = e.event.target?.dataset?.action; const id = e.event.target?.dataset?.id
      if (!action || !id) return
      if (action === 'edit') open(orderStore.items.find(x => x._id === id))
      if (action === 'delete') {
        const orderName = e.data?.orderName || 'this order'
        const ok = await confirm({
          title: 'Delete Order Warning',
          message: `You are about to permanently delete "${orderName}" and ALL its data including production history, rejections, nool entries, and payment allocations. This action cannot be undone and will free up database space.`,
          confirmText: 'Delete Order',
          confirmColor: 'error',
        })
        if (ok) await orderStore.remove(id)
      }
    }
  },
].map(col => (
  col.disableRowNavigation
    ? col
    : { ...col, onCellClicked: ({ data, event }) => goToOrderDetail(data, event?.target || null) }
))

const registerCols = cols.filter(col => col.field !== 'company.name')

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
  }
  finally { saving.value = false }
}

async function del(id) {
  const row = orderStore.items.find(x => x._id === id)
  const orderName = row?.orderName || 'this order'
  const ok = await confirm({
    title: 'Delete Order Warning',
    message: `You are about to permanently delete "${orderName}" and ALL its data including production history, rejections, nool entries, and payment allocations. This action cannot be undone and will free up database space.`,
    confirmText: 'Delete Order',
    confirmColor: 'error',
  })
  if (ok) await orderStore.remove(id)
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
    companyStore.fetch(false),
  ])
  applyPendingOrdersUiState()
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

watch([statusFilter, rowFilter, searchTerm], () => {
  triggerFilterLoading()
})

watch(archiveScope, async () => {
  triggerFilterLoading()
  await fetchOrders(true)
})

onBeforeUnmount(() => {
  if (filterLoadingTimer) clearTimeout(filterLoadingTimer)
  if (searchDebounceTimer) clearTimeout(searchDebounceTimer)
})

async function fetchOrders(force = false) {
  const params = {}
  if (archiveScope.value === 'all') {
    params.includeArchived = '1'
  } else if (archiveScope.value === 'archived') {
    params.includeArchived = '1'
    params.archived = '1'
  }
  await orderStore.fetch(params, { force })
}
</script>

<style scoped>
/* ── Base ───────────────────────────────────────────────────── */
.page-container {
  position: relative;
}

/* ── Stat Cards ─────────────────────────────────────────────── */
.order-stat {
  position: relative;
  overflow: hidden;
  padding: 20px;
  border-radius: 16px !important;
  border: 1px solid #E2E8F0;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  transition: transform 0.2s, box-shadow 0.2s;
}

.order-stat::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
}

.order-stat-primary::before { background: #1565C0; }
.order-stat-info::before { background: #0097A7; }
.order-stat-good::before { background: #2E7D32; }
.order-stat-warn::before { background: #E65100; }
.order-stat-neutral::before { background: #546E7A; }

.order-stat:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);
}

.order-stat-label {
  font-size: 11px;
  color: #64748B;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  font-weight: 700;
}

.order-stat-value {
  margin-top: 6px;
  font-size: 26px;
  font-weight: 800;
  line-height: 1;
}

.order-stat-primary .order-stat-value { color: #1565C0; }
.order-stat-info .order-stat-value { color: #0097A7; }
.order-stat-good .order-stat-value { color: #2E7D32; }
.order-stat-warn .order-stat-value { color: #E65100; }
.order-stat-neutral .order-stat-value { color: #37474F; }

/* ── Table Shell ────────────────────────────────────────────── */
.order-table-shell {
  position: relative;
  overflow: hidden;
  border-radius: 20px !important;
  border: 1px solid #E2E8F0;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.order-table-shell::before {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  height: 3px;
  background: linear-gradient(90deg, #1565C0 0%, #0097A7 50%, #2E7D32 100%);
}

/* ── Header Actions / Filters ───────────────────────────────── */
.orders-header-actions {
  display: flex;
  align-items: stretch;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: nowrap;
  width: 100%;
}

.orders-filter-strip {
  display: flex;
  align-items: stretch;
  gap: 10px;
  flex-wrap: nowrap;
  flex: 1;
  min-width: 0;
  overflow-x: auto;
  padding-bottom: 2px;
}

.orders-filter-strip::-webkit-scrollbar {
  height: 6px;
}

.orders-filter-strip::-webkit-scrollbar-thumb {
  background: #CBD5E1;
  border-radius: 999px;
}

.orders-filter-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 14px;
  min-height: 68px;
  border: 1px solid #E2E8F0;
  border-radius: 12px;
  background: #fff;
  flex-shrink: 0;
  transition: box-shadow 0.2s, border-color 0.2s;
}

.orders-filter-group:hover {
  border-color: #CBD5E1;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.orders-filter-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  color: #94A3B8;
}

.orders-add-btn {
  min-height: 40px;
  padding-inline: 18px;
  font-weight: 700;
  letter-spacing: 0.2px;
  box-shadow: 0 4px 12px rgba(21, 101, 192, 0.2);
  width: 100%;
}

.orders-action-group {
  min-width: 0;
  padding-inline: 10px;
  justify-content: space-between;
  flex-shrink: 0;
}

/* ── Order Toolbar ──────────────────────────────────────────── */
.order-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 20px;
  border-bottom: 1px solid #F1F5F9;
  background: #FAFCFF;
}

.order-toolbar-title {
  display: flex;
  align-items: center;
  font-size: 14px;
  font-weight: 700;
  color: #1E293B;
}

.order-search {
  max-width: 300px;
}

.order-filter-select {
  min-width: 0;
  width: 100%;
}

/* ── Dialog ─────────────────────────────────────────────────── */
.order-dialog-card {
  background: #fff;
  border: 1px solid #E2E8F0;
}

/* ── Loading ────────────────────────────────────────────────── */
.orders-table-loading {
  min-height: 220px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* ── Register Groups (Company Accordions) ───────────────────── */
.register-groups {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 20px;
}

.register-group {
  border: 1px solid #E2E8F0;
  border-left: 4px solid #1565C0;
  border-radius: 16px;
  overflow: hidden;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  transition: transform 0.2s, box-shadow 0.2s;
}

.register-group:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.07);
}

.register-group-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 20px;
  background: #FAFCFF;
  border-bottom: 1px solid #F1F5F9;
}
.company-group-identity {
  display: flex;
  align-items: center;
  gap: 14px;
}
.company-name-avatar {
  width: 46px;
  height: 46px;
  font-size: 15px;
  user-select: none;
}

.register-group-toggle {
  cursor: pointer;
  user-select: none;
}

.register-group-toggle:focus-visible {
  outline: 2px solid #1565C0;
  outline-offset: 2px;
  border-radius: 8px;
}

/* ── Company Order Info ─────────────────────────────────────── */
.company-order-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.company-order-title {
  font-size: 16px;
  font-weight: 800;
  color: #1E293B;
  letter-spacing: -0.2px;
}

.company-order-sub {
  font-size: 12px;
  color: #64748B;
  margin-top: 1px;
}

.company-order-metrics {
  display: flex;
  align-items: center;
  gap: 8px;
}

.company-order-chip {
  display: inline-flex;
  align-items: center;
  padding: 6px 14px;
  border-radius: 20px;
  border: 1px solid #DBEAFE;
  background: #EFF6FF;
  color: #1565C0;
  font-size: 12px;
  font-weight: 700;
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
  font-size: 10.5px;
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

/* ── Responsive ─────────────────────────────────────────────── */
@media (max-width: 1200px) {
  :deep(.page-header) {
    align-items: stretch;
  }

  :deep(.page-header > .d-flex) {
    width: 100%;
  }

  .orders-header-actions {
    flex: 1 0 100%;
    flex-direction: column;
    align-items: stretch;
  }

  .orders-filter-strip {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    align-items: stretch;
    overflow: visible;
  }

  .orders-filter-group {
    width: 100%;
    min-height: 60px;
  }

  .orders-add-btn {
    width: 100%;
  }

  .orders-action-group {
    grid-column: 1 / -1;
    min-width: 0;
  }
}

@media (max-width: 920px) {
  .orders-filter-strip {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 680px) {
  .orders-filter-strip {
    grid-template-columns: 1fr;
  }

  .order-toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .order-filter-select {
    min-width: 0;
    width: 100%;
  }

  .order-search {
    max-width: none;
  }

  .company-order-head {
    flex-direction: column;
    align-items: flex-start;
  }

  .register-group-head {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }

  .company-order-metrics {
    width: 100%;
    justify-content: space-between;
  }

  .register-groups {
    padding: 12px;
    gap: 12px;
  }

  .order-stat {
    padding: 16px;
  }

  .order-stat-value {
    font-size: 22px;
  }
}
</style>

