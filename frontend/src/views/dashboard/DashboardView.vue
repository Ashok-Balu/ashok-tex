<template>
  <div class="page-container">
    <PageHeader :title="t('dashboard')" :sub="fmtDate(new Date())">
      <v-btn variant="text" color="primary" prepend-icon="mdi-refresh" @click="load">Refresh</v-btn>
    </PageHeader>

    <v-card rounded="xl" class="at-card insight-hero mb-4">
      <v-row>
        <v-col v-for="insight in insights" :key="insight.label" cols="12" md="4">
          <div class="insight-item" :class="insight.tone">
            <div class="insight-label">{{ insight.label }}</div>
            <div class="insight-value">{{ insight.value }}</div>
            <div class="insight-sub">{{ insight.sub }}</div>
          </div>
        </v-col>
      </v-row>
    </v-card>

    <v-row class="mb-4">
      <v-col v-for="s in stats" :key="s.label" cols="12" sm="6" md="4" lg="3">
        <StatCard v-bind="s" />
      </v-col>
    </v-row>

    <v-card rounded="xl" class="at-card mb-4 company-wrap" style="overflow:hidden">
      <div class="company-head">
        <div class="company-head-inner">
          <div>
            <div class="company-head-title">
              <v-icon size="18" class="mr-2" color="primary">mdi-wallet-membership</v-icon>
              Company Overview
            </div>
            <div class="company-head-sub">Payments are captured company-wise with cumulative settlement and live pending visibility.</div>
          </div>
          <div class="company-head-badges">
            <span class="company-head-badge neutral">{{ companyGlobal.totalCompanies }} Companies</span>
            <span class="company-head-badge pending">Pending {{ fmt(companyGlobal.totalPending) }}</span>
            <span class="company-head-badge paid">Paid {{ fmt(companyGlobal.totalPaid) }}</span>
            <v-btn size="x-small" variant="tonal" color="success" prepend-icon="mdi-plus" class="toggle-all-btn" @click="router.push('/companies?add=1')">Add Company</v-btn>
            <v-btn size="x-small" variant="tonal" color="primary" class="toggle-all-btn" @click="expandAllCompanies">Expand All</v-btn>
            <v-btn size="x-small" variant="tonal" color="primary" class="toggle-all-btn" @click="collapseAllCompanies">Collapse All</v-btn>
          </div>
        </div>
        <div class="dashboard-range-bar">
          <div class="dashboard-range-copy">
            <div class="dashboard-range-title">Production Period</div>
            <div class="dashboard-range-sub">Choose a period to see produced quantity and value for only that range.</div>
          </div>
          <div class="dashboard-range-controls">
            <v-text-field v-model="dashboardRange.from" label="From" type="date" density="compact" hide-details="auto" class="dashboard-range-field" variant="outlined" @update:model-value="loadPeriodProduction" />
            <v-text-field v-model="dashboardRange.to" label="To" type="date" density="compact" hide-details="auto" class="dashboard-range-field" variant="outlined" @update:model-value="loadPeriodProduction" />
            <v-btn size="small" color="warning" variant="tonal" rounded="lg" class="dashboard-range-reset" @click="resetDashboardRange">Reset</v-btn>
            <v-btn size="small" color="primary" variant="flat" rounded="lg" class="dashboard-range-apply" :loading="dashboardRangeLoading" @click="loadPeriodProduction">Apply</v-btn>
          </div>
        </div>
      </div>

      <div v-if="companyGroups.length" class="pa-4">
        <v-row>
          <v-col v-for="company in companyGroups" :key="company.companyId + '-' + company.companyName" cols="12">
            <div class="company-panel">
              <div
                class="company-master-head company-master-toggle"
                role="button"
                tabindex="0"
                :aria-expanded="isCompanyExpanded(company.companyId)"
                @click="toggleCompany(company.companyId)"
                @keydown.enter.prevent="toggleCompany(company.companyId)"
                @keydown.space.prevent="toggleCompany(company.companyId)"
              >
                <div>
                  <div class="company-master-name">{{ company.companyName }}</div>
                  <div class="company-master-sub">{{ company.orderCount }} {{ t('orders') }} | {{ company.activeOrders }} {{ t('activeOrders') }}</div>
                </div>
                <div class="company-head-actions">
                  <v-btn size="small" color="primary" variant="tonal" prepend-icon="mdi-plus" class="manage-btn" @click.stop="openAddOrder(company)">
                    Add Order
                  </v-btn>
                  <v-btn size="small" color="primary" variant="flat" prepend-icon="mdi-cash-plus" class="manage-btn" @click.stop="openCompanyPayments(company)">
                    Manage Payment
                  </v-btn>
                  <v-btn
                    size="small"
                    variant="tonal"
                    color="primary"
                    :prepend-icon="isCompanyExpanded(company.companyId) ? 'mdi-chevron-up' : 'mdi-chevron-down'"
                    @click.stop="toggleCompany(company.companyId)"
                  >
                    {{ isCompanyExpanded(company.companyId) ? 'Collapse' : 'Expand' }}
                  </v-btn>
                </div>
              </div>

              <div class="company-master-metrics">
                <div class="money-chip paid">
                  <span>Paid</span>
                  <strong>{{ fmt(company.totalPaidAmount || 0) }}</strong>
                </div>
                <div class="money-chip pending">
                  <span>Pending</span>
                  <strong>{{ fmt(company.totalPendingToPay || 0) }}</strong>
                </div>
                <div class="money-chip deduction">
                  <span>Deduction</span>
                  <strong>{{ fmt(company.totalDeductionNeedToGet || 0) }}</strong>
                </div>
              </div>

              <v-expand-transition>
                <div v-show="isCompanyExpanded(company.companyId)">
                  <div class="settle-wrap">
                    <div class="settle-meta">
                      <span>Settlement</span>
                      <span>{{ companySettlePct(company) }}%</span>
                    </div>
                    <div class="settle-track">
                      <div class="settle-fill" :class="settleClass(company)" :style="{ width: companySettlePct(company) + '%' }" />
                    </div>
                  </div>

                  <div class="company-order-strip">
                    <div class="company-order-strip-head">
                      <span>
                        <v-icon size="13" class="mr-1" color="#3f5f87">mdi-package-variant-closed</v-icon>
                        Order Production Snapshot
                      </span>
                      <span>{{ fmtN(company.periodProducedMeter || 0) }} / {{ fmtN(company.expectedMeter || 0) }} m</span>
                    </div>
                    <table class="company-order-table" v-if="company.orders.length">
                      <thead>
                        <tr>
                          <th>Order</th>
                          <th>Order State</th>
                          <th>Expected Quantity</th>
                          <th>Produced</th>
                          <th>Rate/m</th>
                          <th>Total Amount</th>
                          <th>Deduction %</th>
                          <th>Deduction Amt</th>
                          <th>Payable Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="row in company.orders" :key="row._id" @click="goToOrderDetail(row)">
                          <td>{{ row.orderName }}</td>
                          <td>
                            <span :class="['state-pill', orderExecutionState(row).tone]">{{ orderExecutionState(row).label }}</span>
                          </td>
                          <td>{{ fmtN(row.expectedMeter || 0) }} m</td>
                          <td>{{ fmtN(row.periodProducedMeter || 0) }} m</td>
                          <td>{{ fmtRounded(row.ratePerMeter || 0) }}</td>
                          <td>{{ fmtRounded(row.periodTotalValue || 0) }}</td>
                          <td>{{ Number(row.deductionPct || 0).toFixed(2) }}%</td>
                          <td>{{ fmtRounded(row.periodDeductionAmt || 0) }}</td>
                          <td>{{ fmtRounded(row.periodPayableAmt || 0) }}</td>
                        </tr>
                      </tbody>
                    </table>
                    <div v-else class="company-empty">{{ t('noData') }}</div>
                  </div>
                </div>
              </v-expand-transition>
            </div>
          </v-col>
        </v-row>
      </div>
      <div v-else class="text-center pa-6" style="color:#5A6A85">{{ t('noData') }}</div>
    </v-card>

    <v-row>
      <v-col cols="12" lg="8">
        <v-card rounded="lg" class="at-card" style="overflow:hidden">
          <div class="d-flex align-center justify-space-between px-4 py-3" style="border-bottom:1px solid #E0E7EF">
            <span class="font-weight-bold" style="font-size:14px">{{ t('recentOrders') }}</span>
            <v-btn variant="text" color="primary" size="small" to="/orders" append-icon="mdi-arrow-right">{{ t('orders') }}</v-btn>
          </div>
          <AgTable :rowData="recentOrders" :columnDefs="orderCols" height="320px" :pagination="false" />
        </v-card>
      </v-col>

    </v-row>

    <v-dialog v-model="companyPaymentsDialog" max-width="1100">
      <v-card rounded="xl" class="company-payment-dialog">
        <div class="d-flex align-center justify-space-between px-5 py-4 company-dialog-top">
          <div>
            <div class="company-dialog-title">{{ selectedCompany?.companyName || t('company') }} - Company Payment</div>
            <div class="company-dialog-sub">Cumulative collection and settlement</div>
          </div>
          <v-btn icon variant="text" @click="companyPaymentsDialog = false"><v-icon>mdi-close</v-icon></v-btn>
        </div>

        <div class="px-5 py-4" style="border-bottom:1px solid #E0E7EF">
          <v-row dense>
            <v-col cols="12" sm="3">
              <v-text-field v-model="companyPaymentFilter.from" :label="t('from')" type="date" density="compact" hide-details="auto" />
            </v-col>
            <v-col cols="12" sm="3">
              <v-text-field v-model="companyPaymentFilter.to" :label="t('to')" type="date" density="compact" hide-details="auto" />
            </v-col>
            <v-col cols="12" sm="3">
              <v-btn color="primary" variant="flat" block :loading="companyPaymentLoading" @click="loadCompanyPayments">{{ t('filter') }}</v-btn>
            </v-col>
          </v-row>

          <v-row class="mt-2">
            <v-col cols="6" md="3"><div class="summary-card paid"><div>Total Paid</div><strong>{{ fmt(companyPaymentSummary.totalPaidAmount || 0) }}</strong></div></v-col>
            <v-col cols="6" md="3"><div class="summary-card pending"><div>Pending to Pay</div><strong>{{ fmt(companyPaymentSummary.totalPendingToPay || 0) }}</strong></div></v-col>
            <v-col cols="6" md="3"><div class="summary-card deduction"><div>Deduction to Get</div><strong>{{ fmt(companyPaymentSummary.totalDeductionNeedToGet || 0) }}</strong></div></v-col>
            <v-col cols="6" md="3"><div class="summary-card payable"><div>Total Payable</div><strong>{{ fmt(companyPaymentSummary.totalPayableAmount || 0) }}</strong></div></v-col>
          </v-row>
        </div>

        <div class="px-5 py-4" style="border-bottom:1px solid #E0E7EF">
          <div class="font-weight-bold mb-2" style="font-size:13px">{{ editingPaymentId ? 'Edit Company Payment / Deduction' : 'Add Company Payment / Deduction' }}</div>
          <v-row dense align="end">
            <v-col cols="12" sm="2">
              <v-select
                v-model="companyPaymentForm.transactionType"
                label="Action"
                :items="transactionTypeItems"
                item-value="value"
                item-title="title"
                density="compact"
                hide-details="auto"
              />
            </v-col>
            <v-col cols="12" sm="2">
              <v-text-field v-model="companyPaymentForm.date" type="date" :label="t('date')" density="compact" hide-details="auto" />
            </v-col>
            <v-col cols="12" sm="2">
              <v-text-field v-model.number="companyPaymentForm.amount" type="number" prefix="₹" :label="t('amount')" density="compact" hide-details />
            </v-col>
            <v-col cols="12" sm="2" v-if="companyPaymentForm.transactionType !== 'deduction'">
              <v-select
                v-model="companyPaymentForm.mode"
                :label="t('paymentMode')"
                :items="paymentModes"
                item-value="value"
                item-title="title"
                density="compact"
                hide-details="auto"
              />
            </v-col>
            <v-col cols="12" sm="3">
              <v-text-field v-model="companyPaymentForm.notes" :label="t('notes')" density="compact" hide-details="auto" />
            </v-col>
            <v-col cols="12" sm="1" class="d-flex align-end">
              <v-btn color="primary" variant="flat" block :loading="companyPaymentSaving" @click="saveCompanyPayment">{{ editingPaymentId ? 'Update' : 'Save' }}</v-btn>
            </v-col>
            <v-col cols="12" sm="1" class="d-flex align-end" v-if="editingPaymentId">
              <v-btn variant="tonal" color="warning" block @click="resetCompanyPaymentForm">Cancel</v-btn>
            </v-col>
          </v-row>
          <div v-if="paymentAmountInWords" style="font-size:11px;color:#5A6A85;margin-top:4px;padding-left:2px">{{ paymentAmountInWords }}</div>
        </div>

        <div class="pa-5">
          <AgTable :rowData="companyPaymentRows" :columnDefs="companyPaymentCols" height="320px" :pagination="false" />
        </div>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useOrderStore, useDashboardStore } from '@/stores/index'
import { useRouter } from 'vue-router'
import api from '@/plugins/axios'
import { useUtils } from '@/composables/useUtils'
import { useNotify } from '@/composables/useNotify'
import { useConfirm } from '@/composables/useConfirm'
import StatCard from '@/components/common/StatCard.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import AgTable from '@/components/common/AgTable.vue'

const { t } = useI18n()
const { fmt, fmtN, fmtDate, monthStart, today, paymentModes, numToWords } = useUtils()
const notify = useNotify()
const { confirm } = useConfirm()
const router = useRouter()

const orderStore = useOrderStore()
const dashboardStore = useDashboardStore()

const companyPaymentsDialog = ref(false)
const companyPaymentLoading = ref(false)
const companyPaymentSaving = ref(false)
const selectedCompany = ref(null)
const companyPaymentFilter = ref({ from: monthStart(), to: today() })
const companyPaymentRows = ref([])
const companyPaymentSummary = ref({
  totalPaidAmount: 0,
  totalPendingToPay: 0,
  totalDeductionNeedToGet: 0,
  totalPayableAmount: 0,
})
const companyPaymentForm = ref({ transactionType: 'payment', date: today(), amount: null, mode: 'cash', notes: '' })
const editingPaymentId = ref(null)
const paymentAmountInWords = computed(() => numToWords(companyPaymentForm.value.amount))
const transactionTypeItems = [
  { title: 'Payment', value: 'payment' },
  { title: 'Deduction', value: 'deduction' },
]
const dashboardRange = ref({ from: monthStart(), to: today() })
const dashboardRangeLoading = ref(false)
const periodProductionRows = ref([])
const expandedCompanyIds = ref([])
const expandedInitialized = ref(false)

const dashboardStats = computed(() => dashboardStore.stats || {})
const insights = computed(() => [
  {
    label: 'Expected vs Produced',
    value: fmtN(dashboardStats.value.companyOrderSummary?.reduce((s, c) => s + Number(c.producedMeter || 0), 0) || 0) + ' m',
    sub: 'out of ' + fmtN(dashboardStats.value.companyOrderSummary?.reduce((s, c) => s + Number(c.expectedMeter || 0), 0) || 0) + ' m',
    tone: 'tone-info',
  },
  {
    label: 'Pending Collection',
    value: fmt(dashboardStats.value.pendingAmount || 0),
    sub: (dashboardStats.value.pendingPaymentCount || 0) + ' companies require follow up',
    tone: 'tone-warn',
  },
  {
    label: 'Monthly Outflow',
    value: fmt(dashboardStats.value.monthExpense || 0),
    sub: 'expense in current cycle',
    tone: 'tone-good',
  },
])

const stats = computed(() => [
  {
    icon: 'mdi-factory',
    iconColor: 'white',
    iconBg: '#1565C0',
    label: t('todayProduction'),
    value: fmtN(dashboardStats.value.todayProduction || 0) + ' m',
    sub: (dashboardStats.value.activeMachines || 16) + ' ' + t('machines'),
  },
  {
    icon: 'mdi-package-variant',
    iconColor: 'white',
    iconBg: '#00897B',
    label: t('activeOrders'),
    value: dashboardStats.value.activeOrders || 0,
    sub: (dashboardStats.value.completedOrders || 0) + ' ' + t('completedOrders'),
  },
  {
    icon: 'mdi-wallet-outline',
    iconColor: 'white',
    iconBg: '#E65100',
    label: 'Company Pending',
    value: fmt(dashboardStats.value.pendingAmount || 0),
    sub: `${dashboardStats.value.pendingPaymentCount || 0} companies`,
  },
  {
    icon: 'mdi-cash-check',
    iconColor: 'white',
    iconBg: '#2E7D32',
    label: 'Company Paid',
    value: dashboardStats.value.completedPaymentCount || 0,
    sub: 'fully settled',
  },
  {
    icon: 'mdi-hand-coin',
    iconColor: 'white',
    iconBg: '#6D4C41',
    label: 'Deduction to Get',
    value: fmt(dashboardStats.value.deductionHoldAmount || 0),
    sub: t('company'),
  },
  {
    icon: 'mdi-cash-minus',
    iconColor: 'white',
    iconBg: '#C62828',
    label: t('totalExpense'),
    value: fmt(dashboardStats.value.monthExpense || 0),
    sub: 'this month',
  },
  {
    icon: 'mdi-trending-up',
    iconColor: 'white',
    iconBg: '#2E7D32',
    label: t('monthlyPayment'),
    value: fmt(dashboardStats.value.monthlyReceipt || 0),
    sub: 'received',
  },
])

function orderSortTs(order) {
  return new Date(order?.createdAt || order?.date || order?.startDate || 0).getTime() || 0
}

const recentOrders = computed(() => [...(orderStore.items || [])]
  .sort((a, b) => orderSortTs(b) - orderSortTs(a))
  .slice(0, 8))

const companyGroups = computed(() => {
  const summaryRows = dashboardStats.value.companyOrderSummary || []
  const producedMap = new Map()
  for (const row of periodProductionRows.value) {
    const orderId = row?.order?._id || row?.order
    if (!orderId) continue
    producedMap.set(String(orderId), (producedMap.get(String(orderId)) || 0) + Number(row.meter || 0))
  }
  const orderMap = new Map()

  for (const order of orderStore.items) {
    const companyId = order?.company?._id || 'unknown'
    const periodProducedMeter = Number(producedMap.get(String(order?._id)) || 0)
    if (!orderMap.has(companyId)) orderMap.set(companyId, [])
    const periodTotalValue = periodProducedMeter * Number(order.ratePerMeter || 0)
    const periodDeductionAmt = periodTotalValue * (Number(order.deductionPct || 0) / 100)
    const periodPayableAmt = periodTotalValue - periodDeductionAmt
    orderMap.get(companyId).push({
      ...order,
      periodProducedMeter,
      periodTotalValue,
      periodDeductionAmt,
      periodPayableAmt,
    })
  }

  return summaryRows.map(row => ({
    ...row,
    periodProducedMeter: (orderMap.get(row.companyId) || []).reduce((sum, order) => sum + Number(order.periodProducedMeter || 0), 0),
    orders: [...(orderMap.get(row.companyId) || [])].sort((a, b) => orderSortTs(b) - orderSortTs(a)),
  })).sort((a, b) => new Date(b.lastActivityAt || 0).getTime() - new Date(a.lastActivityAt || 0).getTime())
})

const companyGlobal = computed(() => companyGroups.value.reduce((acc, row) => {
  acc.totalCompanies += 1
  acc.totalPending += Number(row.totalPendingToPay || 0)
  acc.totalPaid += Number(row.totalPaidAmount || 0)
  return acc
}, { totalCompanies: 0, totalPending: 0, totalPaid: 0 }))

watch(companyGroups, (rows) => {
  const ids = rows.map(row => row.companyId)
  if (!expandedInitialized.value) {
    expandedCompanyIds.value = [...ids]
    expandedInitialized.value = true
    return
  }
  expandedCompanyIds.value = expandedCompanyIds.value.filter(id => ids.includes(id))
}, { immediate: true })

function isCompanyExpanded(companyId) {
  return expandedCompanyIds.value.includes(companyId)
}

function toggleCompany(companyId) {
  if (isCompanyExpanded(companyId)) {
    expandedCompanyIds.value = expandedCompanyIds.value.filter(id => id !== companyId)
  } else {
    expandedCompanyIds.value = [...expandedCompanyIds.value, companyId]
  }
}

function expandAllCompanies() {
  expandedCompanyIds.value = companyGroups.value.map(row => row.companyId)
}

function collapseAllCompanies() {
  expandedCompanyIds.value = []
}

function companySettlePct(company) {
  const payable = Number(company?.totalPayableAmount || 0)
  const paid = Number(company?.totalPaidAmount || 0)
  if (payable <= 0) return 0
  return Math.max(0, Math.min(100, Math.round((paid / payable) * 100)))
}

function settleClass(company) {
  const pct = companySettlePct(company)
  if (pct >= 80) return 'is-good'
  if (pct >= 40) return 'is-mid'
  return 'is-low'
}

function orderExecutionState(row) {
  if (row?.status === 'completed') return { label: 'Completed', tone: 'good' }
  if (Number(row?.periodProducedMeter || 0) <= 0) return { label: 'Yet to Start', tone: 'neutral' }
  return { label: 'In Process', tone: 'info' }
}

function fmtRounded(value) {
  return fmt(Math.round(Number(value || 0)))
}

const companyPaymentCols = [
  {
    field: 'transactionType',
    headerName: 'Type',
    flex: 0.9,
    minWidth: 120,
    cellRenderer: p => {
      const type = p.value === 'deduction' ? 'Deduction' : 'Payment'
      const cls = p.value === 'deduction' ? 'chip-pending' : 'chip-active'
      return `<span class="${cls}" style="padding:2px 10px;border-radius:20px;font-size:11px">${type}</span>`
    },
  },
  { field: 'date', headerName: t('date'), flex: 1, minWidth: 130, valueFormatter: p => fmtDate(p.value) },
  {
    field: 'mode',
    headerName: t('paymentMode'),
    flex: 0.9,
    minWidth: 120,
    cellRenderer: p => {
      if (p.data?.transactionType === 'deduction') return '-'
      return `<span class="${p.value === 'cash' ? 'chip-done' : p.value === 'cheque' ? 'chip-pending' : 'chip-active'}" style="padding:2px 10px;border-radius:20px;font-size:11px">${t(p.value || 'cash')}</span>`
    },
  },
  {
    field: 'amount',
    headerName: t('amount'),
    flex: 1,
    minWidth: 150,
    valueFormatter: p => fmt(p.value || 0),
    cellStyle: p => ({ color: p.data?.transactionType === 'deduction' ? '#C62828' : '#2E7D32', fontWeight: 700 }),
  },
  { field: 'notes', headerName: t('notes'), flex: 1.8, minWidth: 220 },
  {
    field: '_actions',
    headerName: 'Action',
    width: 150,
    suppressSizeToFit: true,
    sortable: false,
    filter: false,
    cellRenderer: p => `<div class="cp-action-wrap"><button class="cp-edit-btn" type="button" data-action="edit" data-id="${p.data?._id || ''}">Edit</button><button class="cp-delete-btn" type="button" data-action="delete" data-id="${p.data?._id || ''}">Delete</button></div>`,
    onCellClicked: async e => {
      const action = e.event?.target?.dataset?.action
      const id = e.event?.target?.dataset?.id
      if (!action || !id) return
      if (action === 'edit') startEditCompanyPayment(e.data)
      if (action === 'delete') await deleteCompanyPayment(id)
    },
  },
]

async function loadCompanyPayments() {
  if (!selectedCompany.value?.companyId || selectedCompany.value.companyId === 'unknown') {
    companyPaymentRows.value = []
    return
  }

  companyPaymentLoading.value = true
  try {
    const { data } = await api.get(`/dashboard/company-payments/${selectedCompany.value.companyId}`, {
      params: {
        from: companyPaymentFilter.value.from,
        to: companyPaymentFilter.value.to,
      },
    })

    companyPaymentRows.value = data.rows || []
    companyPaymentSummary.value = {
      totalPaidAmount: data.summary?.totalPaidAmount || 0,
      totalPendingToPay: data.summary?.totalPendingToPay || 0,
      totalDeductionNeedToGet: data.summary?.totalDeductionNeedToGet || 0,
      totalPayableAmount: data.summary?.totalPayableAmount || 0,
    }
  } finally {
    companyPaymentLoading.value = false
  }
}

async function addCompanyPayment() {
  if (!selectedCompany.value?.companyId || Number(companyPaymentForm.value.amount || 0) <= 0) {
    notify.error('Enter a valid amount')
    return
  }

  companyPaymentSaving.value = true
  try {
    await api.post(`/dashboard/company-payments/${selectedCompany.value.companyId}`, {
      transactionType: companyPaymentForm.value.transactionType || 'payment',
      amount: Number(companyPaymentForm.value.amount || 0),
      mode: companyPaymentForm.value.mode || 'cash',
      date: companyPaymentForm.value.date,
      notes: companyPaymentForm.value.notes || '',
    })

    companyPaymentForm.value = { transactionType: 'payment', date: today(), amount: null, mode: 'cash', notes: '' }
    await Promise.all([loadCompanyPayments(), dashboardStore.fetch()])
    notify.success(t('savedSuccess'))
  } catch (error) {
    notify.error(error?.response?.data?.message || t('actionFailed'))
  } finally {
    companyPaymentSaving.value = false
  }
}

async function updateCompanyPayment() {
  if (!editingPaymentId.value || Number(companyPaymentForm.value.amount || 0) <= 0) {
    notify.error('Enter a valid amount')
    return
  }

  companyPaymentSaving.value = true
  try {
    await api.put(`/payments/${editingPaymentId.value}`, {
      company: selectedCompany.value.companyId,
      transactionType: companyPaymentForm.value.transactionType || 'payment',
      amount: Number(companyPaymentForm.value.amount || 0),
      mode: companyPaymentForm.value.mode || 'cash',
      date: companyPaymentForm.value.date,
      notes: companyPaymentForm.value.notes || '',
    })

    resetCompanyPaymentForm()
    await Promise.all([loadCompanyPayments(), dashboardStore.fetch()])
    notify.success('Payment updated successfully')
  } catch (error) {
    notify.error(error?.response?.data?.message || t('actionFailed'))
  } finally {
    companyPaymentSaving.value = false
  }
}

function saveCompanyPayment() {
  if (editingPaymentId.value) return updateCompanyPayment()
  return addCompanyPayment()
}

async function deleteCompanyPayment(id) {
  const ok = await confirm()
  if (!ok) return

  companyPaymentSaving.value = true
  try {
    await api.delete(`/payments/${id}`)
    if (editingPaymentId.value === id) resetCompanyPaymentForm()
    await Promise.all([loadCompanyPayments(), dashboardStore.fetch()])
    notify.success('Payment deleted successfully')
  } catch (error) {
    notify.error(error?.response?.data?.message || t('actionFailed'))
  } finally {
    companyPaymentSaving.value = false
  }
}

function startEditCompanyPayment(row) {
  if (!row?._id) return
  editingPaymentId.value = row._id
  companyPaymentForm.value = {
    transactionType: row.transactionType === 'deduction' ? 'deduction' : 'payment',
    date: row.date ? String(row.date).slice(0, 10) : today(),
    amount: Number(row.amount || 0),
    mode: row.mode || 'cash',
    notes: row.notes || '',
  }
}

function resetCompanyPaymentForm() {
  editingPaymentId.value = null
  companyPaymentForm.value = { transactionType: 'payment', date: today(), amount: null, mode: 'cash', notes: '' }
}

async function loadPeriodProduction() {
  dashboardRangeLoading.value = true
  try {
    const { data } = await api.get('/production', {
      params: {
        from: dashboardRange.value.from,
        to: dashboardRange.value.to,
      },
    })
    periodProductionRows.value = data || []
  } finally {
    dashboardRangeLoading.value = false
  }
}

function resetDashboardRange() {
  dashboardRange.value = { from: monthStart(), to: today() }
  loadPeriodProduction()
}

async function openCompanyPayments(company) {
  selectedCompany.value = company
  resetCompanyPaymentForm()
  companyPaymentsDialog.value = true
  await loadCompanyPayments()
}

function openAddOrder(company) {
  const companyId = company?.companyId
  if (!companyId || companyId === 'unknown') {
    router.push('/orders?add=1')
    return
  }
  router.push(`/orders?add=1&company=${companyId}`)
}

function goToOrderDetail(row) {
  if (!row?._id) return
  router.push(`/orders/${row._id}`)
}

const orderCols = [
  { field: 'orderName', headerName: 'Order', flex: 1.5 },
  { field: 'company.name', headerName: 'Company', flex: 1.2 },
  { field: 'producedMeter', headerName: 'Produced', flex: 1, valueFormatter: p => fmtN(p.value) + ' m' },
  {
    field: 'status',
    headerName: 'Status',
    flex: 1,
    cellRenderer: p => `<span class="${p.value === 'completed' ? 'chip-done' : 'chip-active'}" style="padding:2px 10px;border-radius:20px;font-size:11px">${p.value === 'completed' ? 'Done' : 'Active'}</span>`,
  },
].map(col => ({
  ...col,
  onCellClicked: ({ data }) => goToOrderDetail(data),
}))

async function load() {
  await Promise.all([
    orderStore.fetch(),
    dashboardStore.fetch().catch(() => {}),
    loadPeriodProduction(),
  ])
}

onMounted(load)
</script>

<style scoped>
.insight-hero {
  padding: 10px 14px;
  background:
    radial-gradient(700px 180px at -10% -30%, rgba(21, 101, 192, 0.16), transparent 60%),
    radial-gradient(680px 180px at 110% -30%, rgba(46, 125, 50, 0.12), transparent 60%),
    linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
}

.insight-item {
  border: 1px solid #dce7f2;
  border-radius: 14px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.92);
}

.insight-label {
  font-size: 11px;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  color: #5a6a85;
  font-weight: 700;
}

.insight-value {
  margin-top: 2px;
  font-size: 24px;
  font-weight: 800;
}

.insight-sub {
  margin-top: 2px;
  font-size: 12px;
  color: #5a6a85;
}

.insight-item.tone-info .insight-value { color: #1565c0; }
.insight-item.tone-warn .insight-value { color: #e65100; }
.insight-item.tone-good .insight-value { color: #2e7d32; }

.company-wrap {
  background:
    radial-gradient(1200px 300px at -10% -30%, rgba(49, 130, 206, 0.18), transparent 60%),
    radial-gradient(800px 240px at 120% -20%, rgba(56, 161, 105, 0.16), transparent 60%),
    linear-gradient(180deg, #f7fbff 0%, #f4f8fd 100%);
  border: 1px solid #cfdeec;
}

.company-head {
  padding: 16px 18px;
  border-bottom: 1px solid #d9e4f0;
  background: linear-gradient(90deg, #ffffff 0%, #f2f8ff 50%, #f4fff7 100%);
}

.company-head-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}
  
:deep(.cp-edit-btn) {
  border: 1px solid #90caf9;
  background: #e3f2fd;
  color: #0d47a1;
  border-radius: 8px;
  padding: 2px 8px;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
}

:deep(.cp-action-wrap) {
  display: flex;
  align-items: center;
  gap: 6px;
}

:deep(.cp-delete-btn) {
  border: 1px solid #ffcdd2;
  background: #ffebee;
  color: #b71c1c;
  border-radius: 8px;
  padding: 2px 8px;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
}

.company-head-title {
  display: flex;
  align-items: center;
  font-size: 18px;
  font-weight: 800;
  color: #12345b;
  letter-spacing: 0.2px;
}

.company-head-sub {
  margin-top: 2px;
  font-size: 13px;
  color: #4a637f;
}

.company-head-badges {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.dashboard-range-bar {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid #d9e4f0;
}

.dashboard-range-copy {
  min-width: 220px;
}

.dashboard-range-title {
  font-size: 13px;
  font-weight: 800;
  color: #183861;
}

.dashboard-range-sub {
  margin-top: 2px;
  font-size: 12px;
  color: #5a6a85;
}

.dashboard-range-controls {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.dashboard-range-field {
  width: 180px;
}

.dashboard-range-field :deep(.v-field) {
  border-radius: 12px !important;
  background: rgba(255, 255, 255, 0.92) !important;
  box-shadow: inset 0 0 0 1px #deebf6;
}

.dashboard-range-field :deep(.v-field__input) {
  font-size: 13px;
  font-weight: 600;
  color: #183861;
}

.dashboard-range-field :deep(.v-label) {
  font-size: 12px;
  color: #58708f;
}

.dashboard-range-apply {
  min-width: 110px;
  height: 40px;
  font-weight: 800;
  letter-spacing: 0.2px;
  box-shadow: 0 10px 20px rgba(21, 101, 192, 0.18);
}

.dashboard-range-reset {
  min-width: 96px;
  height: 40px;
  font-weight: 700;
}

.company-head-badge {
  display: inline-flex;
  align-items: center;
  padding: 8px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  border: 1px solid #d7e4ef;
  background: #fff;
  color: #35507a;
}

.toggle-all-btn {
  font-weight: 700;
  letter-spacing: 0.2px;
}

.company-head-badge.pending {
  background: #fff4e5;
  color: #c76600;
}

.company-head-badge.paid {
  background: #e8f6ec;
  color: #1f7a34;
}

.company-head-badge.neutral {
  background: #eef5ff;
  color: #1e4f8a;
}

.company-panel {
  border: 1px solid #e0e7ef;
  background: rgba(255, 255, 255, 0.94);
  border-radius: 14px;
  padding: 14px;
  box-shadow: 0 8px 24px rgba(16, 42, 67, 0.06);
  transition: transform 0.18s ease, box-shadow 0.18s ease;
  border-left: 4px solid #2b6cb0;
}

.company-panel:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 28px rgba(16, 42, 67, 0.12);
}

.company-master-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  width: 100%;
}

.company-master-toggle {
  cursor: pointer;
  user-select: none;
}

.company-master-toggle:focus-visible {
  outline: 2px solid #2b6cb0;
  outline-offset: 3px;
  border-radius: 10px;
}

.company-master-name {
  font-size: 18px;
  font-weight: 700;
  color: #162f55;
}

.company-master-sub {
  font-size: 13px;
  color: #5a6a85;
}

.company-head-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.manage-btn {
  font-weight: 700;
  letter-spacing: 0.2px;
}

.company-master-metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  margin-top: 12px;
}

.money-chip {
  border-radius: 12px;
  border: 1px solid #deebf6;
  padding: 10px 12px;
  background: #fff;
}

.money-chip span {
  display: block;
  font-size: 12px;
  color: #667993;
}

.money-chip strong {
  display: block;
  margin-top: 2px;
  font-size: 18px;
}

.money-chip.paid strong {
  color: #1b7f3f;
}

.money-chip.pending strong {
  color: #d26a00;
}

.money-chip.deduction strong {
  color: #c62828;
}

.settle-wrap {
  margin-top: 12px;
}

.settle-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
  font-weight: 700;
  color: #405b7e;
}

.settle-track {
  margin-top: 6px;
  height: 8px;
  border-radius: 999px;
  overflow: hidden;
  background: #e4edf6;
}

.settle-fill {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #1f7dcf 0%, #23a466 100%);
}

.settle-fill.is-low {
  background: linear-gradient(90deg, #f59e0b 0%, #f97316 100%);
}

.settle-fill.is-mid {
  background: linear-gradient(90deg, #3b82f6 0%, #14b8a6 100%);
}

.settle-fill.is-good {
  background: linear-gradient(90deg, #22c55e 0%, #0ea5e9 100%);
}

.company-order-strip {
  margin-top: 12px;
  border: 1px solid #dde8f4;
  border-radius: 12px;
  background: #f8fbff;
  overflow: hidden;
}

.company-order-strip-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  font-weight: 700;
  color: #496183;
  padding: 9px 11px;
  border-bottom: 1px solid #dde8f4;
}

.company-order-table {
  width: 100%;
  border-collapse: collapse;
}

.company-order-table th,
.company-order-table td {
  padding: 9px 11px;
  font-size: 13px;
  text-align: left;
  border-bottom: 1px solid #ebf1f7;
}

.company-order-table thead th {
  font-size: 10px;
  letter-spacing: 0.4px;
  text-transform: uppercase;
  color: #5e7290;
}

.company-order-table tbody tr {
  cursor: pointer;
}

.company-order-table tbody tr:hover {
  background: #eef5ff;
}

.state-pill {
  display: inline-flex;
  align-items: center;
  padding: 3px 9px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  border: 1px solid transparent;
}

.state-pill.neutral {
  background: #f2f4f8;
  color: #5f6b7a;
  border-color: #d6dde8;
}

.state-pill.info {
  background: #e8f1ff;
  color: #1e63b6;
  border-color: #cfe0fb;
}

.state-pill.good {
  background: #e8f6ec;
  color: #1f7a34;
  border-color: #ccead5;
}

.state-pill.warn {
  background: #fff4e5;
  color: #c76600;
  border-color: #ffe2bf;
}

.company-empty {
  padding: 14px;
  text-align: center;
  font-size: 12px;
  color: #6a7d97;
}

.company-payment-dialog {
  border: 1px solid #dbe7f2;
}

.company-dialog-top {
  background: linear-gradient(90deg, #f6fbff 0%, #f6fff8 100%);
  border-bottom: 1px solid #e0e7ef;
}

.company-dialog-title {
  font-size: 16px;
  font-weight: 800;
  color: #183861;
}

.company-dialog-sub {
  font-size: 12px;
  color: #5a6a85;
}

.summary-card {
  border-radius: 12px;
  border: 1px solid #d9e4f0;
  padding: 10px 12px;
  background: #fff;
  font-size: 12px;
}

.summary-card strong {
  display: block;
  margin-top: 2px;
  font-size: 18px;
}

.summary-card.paid strong {
  color: #2e7d32;
}

.summary-card.pending strong {
  color: #e65100;
}

.summary-card.deduction strong {
  color: #c62828;
}

.summary-card.payable strong {
  color: #1565c0;
}

@media (max-width: 768px) {
  .company-head-inner {
    flex-direction: column;
    align-items: flex-start;
  }

  .dashboard-range-bar {
    width: 100%;
    flex-direction: column;
    align-items: stretch;
  }

  .dashboard-range-controls {
    width: 100%;
    align-items: stretch;
  }

  .dashboard-range-field {
    width: 100%;
  }

  .dashboard-range-apply {
    width: 100%;
  }

  .dashboard-range-reset {
    width: 100%;
  }

  .company-master-head {
    align-items: flex-start;
    flex-direction: column;
  }

  .company-master-metrics {
    grid-template-columns: 1fr;
  }

  .company-order-strip-head {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }
}
</style>
