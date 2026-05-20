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
            <div>
              <div class="company-order-title">{{ group.name }}</div>
              <div class="company-order-sub">{{ group.orders.length }} {{ t('orders') }}</div>
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
  // Within-company sort: latest startDate first
  const startTs = new Date(order?.startDate || 0).getTime()
  if (Number.isFinite(startTs) && startTs > 0) return startTs
  const createdAtTs = new Date(order?.createdAt || 0).getTime()
  if (Number.isFinite(createdAtTs) && createdAtTs > 0) return createdAtTs
  return objectIdToTs(order?._id)
}
function orderChangedTs(order) {
  // Between-company sort: most recently changed order first
  const updatedTs = new Date(order?.updatedAt || 0).getTime()
  if (Number.isFinite(updatedTs) && updatedTs > 0) return updatedTs
  const createdAtTs = new Date(order?.createdAt || 0).getTime()
  if (Number.isFinite(createdAtTs) && createdAtTs > 0) return createdAtTs
  return objectIdToTs(order?._id)
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
      orders: [...group.orders].sort((a, b) => orderAddedTs(b) - orderAddedTs(a)),
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

    acc.expectedMeter += expected
    acc.producedMeter += produced
    acc.rejectedMeter += rejected
    acc.acceptedMeter += accepted
    acc.totalAmount += totalAmount
    acc.deductionAmount += deductionAmount
    acc.rejectionLoss += rejectionLoss
    acc.payableAmount += (totalAmount - deductionAmount)
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

function goToOrderDetail(row) {
  if (!row?._id) return
  router.push('/orders/' + row._id)
}

watch(companyGroups, (groups) => {
  const names = groups.map(group => group.name)
  expandedRegisterGroups.value = expandedRegisterGroups.value.filter(name => names.includes(name))
}, { immediate: true })

function isRegisterExpanded(name) {
  return expandedRegisterGroups.value.includes(name)
}

function toggleRegisterGroup(name) {
  expandedRegisterGroups.value = isRegisterExpanded(name)
    ? expandedRegisterGroups.value.filter(item => item !== name)
    : [...expandedRegisterGroups.value, name]
}

const cols = [
  { field: 'orderName',    headerName: 'Order Name',         flex: 1.45, minWidth: 170 },
  { field: 'status', headerName: 'Order Status', flex: 0.9, minWidth: 115,
    cellRenderer: p => `<span class="${p.value === 'completed' ? 'chip-done' : 'chip-active'}" style="padding:2px 10px;border-radius:20px;font-size:11px">${p.value === 'completed' ? t('completed') : t('active')}</span>` },
  { field: 'company.name', headerName: 'Company',            flex: 1.2,  minWidth: 140 },
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
  { field: 'ratePerMeter', headerName: 'Rate per Meter',     flex: 0.9,  minWidth: 120, valueFormatter: p => p.data?.__isFooter ? '-' : ('₹' + fmtN(p.value || 0)) },
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
      <button data-id="${p.data._id}" data-action="view"   style="background:#E3F2FD;border:none;border-radius:6px;padding:4px 8px;cursor:pointer;color:#1565C0;font-size:11px;font-weight:600">View</button>
      <button data-id="${p.data._id}" data-action="edit"   style="background:#F3E5F5;border:none;border-radius:6px;padding:4px 8px;cursor:pointer;color:#7B1FA2;font-size:11px;font-weight:600">Edit</button>
      <button data-id="${p.data._id}" data-action="delete" style="background:#FFEBEE;border:none;border-radius:6px;padding:4px 8px;cursor:pointer;color:#C62828;font-size:11px;font-weight:600">Delete</button>
    </div>`,
    onCellClicked: async e => {
      const action = e.event.target?.dataset?.action; const id = e.event.target?.dataset?.id
      if (!action || !id) return
      if (action === 'view') router.push('/orders/' + id)
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
    : { ...col, onCellClicked: ({ data }) => goToOrderDetail(data) }
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
  await Promise.all([
    fetchOrders(false),
    companyStore.fetch(false),
  ])
  openFromQuery()
})

watch(() => route.query, () => {
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
.page-container {
  position: relative;
}

.page-container::before {
  content: '';
  position: absolute;
  inset: -14px -10px auto;
  height: 220px;
  border-radius: 28px;
  background:
    radial-gradient(740px 180px at 10% 18%, rgba(30, 99, 182, 0.14), transparent 70%),
    radial-gradient(680px 180px at 90% 10%, rgba(12, 122, 142, 0.12), transparent 72%),
    linear-gradient(180deg, rgba(246, 251, 255, 0.86) 0%, rgba(246, 251, 255, 0) 100%);
  pointer-events: none;
  z-index: 0;
}

.page-container > * {
  position: relative;
  z-index: 1;
}

.order-stat {
  position: relative;
  overflow: hidden;
  padding: 16px;
  border-radius: 14px !important;
  border: 1px solid #e1eaf3;
  background:
    radial-gradient(140px 70px at 88% 10%, rgba(29, 122, 203, 0.13), transparent 72%),
    linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
  box-shadow: 0 10px 24px rgba(33, 78, 129, 0.08);
  transition: transform 0.22s ease, box-shadow 0.22s ease;
}

.order-stat::after {
  content: '';
  position: absolute;
  inset: auto 0 0;
  height: 3px;
  background: linear-gradient(90deg, #1e63b6 0%, #0c7a8e 100%);
  opacity: 0.9;
}

.order-stat:hover {
  transform: translateY(-2px);
  box-shadow: 0 14px 28px rgba(33, 78, 129, 0.14);
}

.order-stat-label {
  font-size: 12px;
  color: #5a6a85;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  font-weight: 700;
}

.order-stat-value {
  margin-top: 4px;
  font-size: 26px;
  font-weight: 800;
}

.order-stat-primary .order-stat-value { color: #1e63b6; }
.order-stat-info .order-stat-value { color: #0c7a8e; }
.order-stat-good .order-stat-value { color: #2e7d32; }
.order-stat-warn .order-stat-value { color: #e65100; }
.order-stat-neutral .order-stat-value { color: #34495e; }

.order-table-shell {
  position: relative;
  overflow: hidden;
  border-radius: 18px !important;
  border: 1px solid #dfe9f3;
  background: linear-gradient(180deg, #ffffff 0%, #fcfeff 100%);
  box-shadow: 0 18px 38px rgba(21, 66, 116, 0.09);
}

.order-table-shell::before {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  height: 4px;
  background: linear-gradient(90deg, #1e63b6 0%, #0c7a8e 45%, #2e7d32 100%);
}

.orders-header-actions {
  display: flex;
  align-items: stretch;
  justify-content: space-between;
  gap: 14px;
  flex-wrap: nowrap;
  width: 100%;
}

.orders-filter-strip {
  display: flex;
  align-items: stretch;
  gap: 12px;
  flex-wrap: nowrap;
  flex: 1;
  min-width: 0;
  overflow-x: auto;
  padding-bottom: 2px;
}

.orders-filter-strip::-webkit-scrollbar {
  height: 8px;
}

.orders-filter-strip::-webkit-scrollbar-thumb {
  background: #cddbf0;
  border-radius: 999px;
}

.orders-filter-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 12px;
  min-height: 74px;
  border: 1px solid #dce8f4;
  border-radius: 14px;
  background:
    radial-gradient(120px 48px at 86% 8%, rgba(30, 99, 182, 0.12), transparent 74%),
    linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
  box-shadow: 0 8px 18px rgba(28, 72, 122, 0.06);
  flex-shrink: 0;
  transition: box-shadow 0.2s ease, transform 0.2s ease;
}

.orders-filter-group:hover {
  transform: translateY(-1px);
  box-shadow: 0 12px 22px rgba(28, 72, 122, 0.1);
}

.orders-filter-label {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  color: #6a7f98;
}

.orders-add-btn {
  min-height: 40px;
  padding-inline: 16px;
  font-weight: 700;
  letter-spacing: 0.2px;
  box-shadow: 0 12px 20px rgba(25, 118, 210, 0.22);
  width: 100%;
}

.orders-action-group {
  min-width: 0;
  padding-inline: 10px;
  justify-content: space-between;
  flex-shrink: 0;
}

.order-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 18px;
  border-bottom: 1px solid #e0e7ef;
  background: linear-gradient(90deg, #f5faff 0%, #f4fff8 100%);
}

.order-toolbar-title {
  display: flex;
  align-items: center;
  font-size: 13px;
  font-weight: 700;
  color: #2a4a70;
}

.order-search {
  max-width: 320px;
}

.order-filter-select {
  min-width: 0;
  width: 100%;
}

.order-dialog-card {
  background: linear-gradient(180deg, #ffffff 0%, #f9fcff 100%);
  border: 1px solid #e1ebf5;
}

.orders-table-loading {
  min-height: 220px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.register-groups {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 18px;
}

.register-group {
  border: 1px solid #dfe9f2;
  border-radius: 16px;
  overflow: hidden;
  background: linear-gradient(180deg, #ffffff 0%, #fbfdff 100%);
  box-shadow: 0 10px 22px rgba(19, 62, 109, 0.07);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.register-group:hover {
  transform: translateY(-1px);
  box-shadow: 0 15px 28px rgba(19, 62, 109, 0.11);
}

.register-group-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 18px;
  background: linear-gradient(90deg, #f7fbff 0%, #f9fcff 100%);
  border-bottom: 1px solid #e7eef5;
}

.register-group-toggle {
  cursor: pointer;
  user-select: none;
}

.register-group-toggle:focus-visible {
  outline: 2px solid #2b6cb0;
  outline-offset: -2px;
}

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
  color: #183861;
  letter-spacing: 0.2px;
}

.company-order-sub {
  font-size: 12px;
  color: #5a6a85;
}

:deep(.ag-theme-quartz .ag-header) {
  background: linear-gradient(180deg, #f7fbff 0%, #eff6fd 100%);
  border-bottom: 1px solid #d7e4f0;
}

:deep(.ag-theme-quartz .ag-header-cell-label) {
  font-weight: 800;
  color: #55708d;
  text-transform: uppercase;
  letter-spacing: 0.45px;
  font-size: 10px;
}

:deep(.ag-theme-quartz .ag-row) {
  border-bottom: 1px solid #edf3f8;
}

:deep(.ag-theme-quartz .ag-row:hover) {
  background: #f8fbff;
}

:deep(.ag-theme-quartz .ag-cell) {
  display: flex;
  align-items: center;
  font-size: 12px;
  color: #324b68;
}

.company-order-metrics {
  display: flex;
  align-items: center;
  gap: 8px;
}

.company-order-chip {
  display: inline-flex;
  align-items: center;
  padding: 8px 12px;
  border-radius: 999px;
  border: 1px solid #d4e4f8;
  background: linear-gradient(180deg, #f1f7ff 0%, #e9f2ff 100%);
  color: #1f5ea8;
  font-size: 12px;
  font-weight: 700;
}

.register-group :deep(.at-grid-shell) {
  border-radius: 0;
  border: 0;
  background: transparent;
}

.register-group :deep(.at-grid-table thead th) {
  background: linear-gradient(180deg, #f8fbff 0%, #f1f7ff 100%);
  color: #5a7290;
}

.register-group :deep(.at-grid-table tbody tr:hover) {
  background: #f4f9ff;
}

.register-group :deep(.at-grid-footer-row td) {
  background: linear-gradient(180deg, #f6faff 0%, #eef6ff 100%);
  color: #183861;
}

.form-section-title {
  margin: 6px 0 10px;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.6px;
  text-transform: uppercase;
  color: #1f5ea8;
}

@media (max-width: 1200px) {
  .orders-header-actions,
  .orders-filter-strip {
    flex-direction: column;
    align-items: stretch;
  }

  .orders-filter-group {
    width: 100%;
    min-height: 0;
  }

  .orders-add-btn {
    width: 100%;
  }

  .orders-action-group {
    min-width: 0;
  }
}

@media (max-width: 680px) {
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
  }
}
</style>
