<template>
  <div class="page-container">
    <PageHeader :title="t('dashboard')" :sub="fmtDate(new Date())">
      <v-btn variant="text" color="primary" prepend-icon="mdi-refresh" @click="load(true)">Refresh</v-btn>
    </PageHeader>

    <!-- ── Hero Metrics Banner ── -->
    <div class="dash-hero mb-5">
      <div class="hero-topline">
        <div class="hero-pill">
          <span class="hero-pill-label">Total Companies</span>
          <strong class="hero-pill-value">{{ companyGlobal.totalCompanies || 0 }}</strong>
        </div>
        <div class="hero-pill">
          <span class="hero-pill-label">Total Payable</span>
          <strong class="hero-pill-value">{{ fmt(companyGlobal.totalPayable || 0) }}</strong>
        </div>
        <div class="hero-pill">
          <span class="hero-pill-label">Total Paid</span>
          <strong class="hero-pill-value">{{ fmt(companyGlobal.totalPaid || 0) }}</strong>
        </div>
        <div class="hero-pill">
          <span class="hero-pill-label">Collection Efficiency</span>
          <strong class="hero-pill-value">{{ collectionPct }}%</strong>
        </div>
      </div>

      <!-- Row 1: primary insight cards -->
      <div class="dash-insights">
        <div v-for="insight in insights" :key="insight.label" class="dash-insight-card" :class="insight.tone">
          <div class="dh-icon-wrap" :class="insight.iconTone">
            <v-icon size="24" color="white">{{ insight.icon }}</v-icon>
          </div>
          <div class="dh-body">
            <div class="dh-label">{{ insight.label }}</div>
            <div class="dh-value">{{ insight.value }}</div>
            <div class="dh-sub">{{ insight.sub }}</div>
            <div class="dh-kpis">
              <span>{{ insight.supportA }}</span>
              <span>{{ insight.supportB }}</span>
            </div>
            <div class="dh-progress" v-if="typeof insight.progress === 'number'">
              <div class="dh-progress-track">
                <div class="dh-progress-fill" :style="{ width: insight.progress + '%' }"></div>
              </div>
              <span class="dh-progress-value">{{ insight.progress }}%</span>
            </div>
          </div>
          <div class="dh-accent" :class="insight.accentClass"></div>
        </div>
      </div>
      <!-- Row 2: stat chips -->
      <div class="dash-chips">
        <div v-for="s in stats" :key="s.label" class="dash-chip">
          <div class="dc-icon-box" :style="{ background: s.chipBg }">
            <v-icon size="16" color="white">{{ s.icon }}</v-icon>
          </div>
          <div>
            <div class="dc-label">{{ s.label }}</div>
            <div class="dc-value" :style="{ color: s.chipColor }">{{ s.value }}</div>
          </div>
        </div>
      </div>
    </div>

    <v-card rounded="xl" class="at-card mb-4 company-wrap" style="overflow:hidden">
      <div class="company-head">
        <div class="company-head-inner">
          <div>
            <div class="company-head-title">
              <v-icon size="18" class="mr-2" color="primary">mdi-wallet-membership</v-icon>
              Company Overview
            </div>
            <div class="company-head-sub">Payments are tracked company-wise with settlement, unallocated funds, and deduction visibility.</div>
          </div>
          <div class="company-head-side">
            <div class="company-head-badges">
              <span class="company-head-badge neutral">{{ companyGlobal.totalCompanies }} Companies</span>
              <span class="company-head-badge neutral">Total Payable {{ fmt(companyGlobal.totalPayable || 0) }}</span>
              <span class="company-head-badge paid">Total Paid {{ fmt(companyGlobal.totalPaid || 0) }}</span>
              <span class="company-head-badge pending">Total Pending {{ fmt(companyGlobal.totalPending || 0) }}</span>
            </div>
            <div class="company-head-controls">
              <v-btn size="small" variant="tonal" color="success" prepend-icon="mdi-plus" class="toggle-all-btn" @click="router.push('/companies?add=1')">Add Company</v-btn>
              <v-btn size="small" variant="tonal" color="primary" class="toggle-all-btn" @click="expandAllCompanies">Expand All</v-btn>
              <v-btn size="small" variant="tonal" color="primary" class="toggle-all-btn" @click="collapseAllCompanies">Collapse All</v-btn>
            </div>
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
                <div class="money-chip payable">
                  <span>Total Payable</span>
                  <strong>{{ fmt(company.totalPayableAmount || 0) }}</strong>
                </div>
                <div class="money-chip paid">
                  <span>Total Paid</span>
                  <strong>{{ fmt(company.totalPaidAmount || 0) }}</strong>
                </div>
                <div class="money-chip pending">
                  <span>Pending from Company</span>
                  <strong>{{ fmt(company.totalPendingToPay || 0) }}</strong>
                </div>
                <div class="money-chip deduction">
                  <span>Deduction to Get</span>
                  <strong>{{ fmt(company.totalDeductionNeedToGet || 0) }}</strong>
                </div>
                <div class="money-chip unallocated">
                  <span>Unallocated funds</span>
                  <strong>{{ fmt(company.totalUnallocatedAmount || 0) }}</strong>
                </div>
                <div class="money-chip meter-lost">
                  <span>Rejection Meter</span>
                  <strong>{{ fmtN(company.rejectedMeter || 0) }} m</strong>
                </div>
                <div class="money-chip loss">
                  <span>Rejection Loss</span>
                  <strong>{{ fmt(company.totalRejectionGrossLoss || 0) }}</strong>
                </div>
                <div class="money-chip settle">
                  <span>Settlement %</span>
                  <strong>{{ companySettlePct(company) }}%</strong>
                </div>
                <div class="money-chip deduction-collected">
                  <span>Deduction Collected</span>
                  <strong>{{ fmt(company.totalDeductionCollected || 0) }}</strong>
                </div>
                <div class="money-chip avg-rate">
                  <span>Avg Rate / m</span>
                  <strong>{{ fmtRounded(companyAvgRate(company)) }}</strong>
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
                    <div class="settle-sub">
                      Collected {{ fmt(company.totalPaidAmount || 0) }} / Total {{ fmt(company.totalPayableAmount || 0) }}
                    </div>
                  </div>

                  <div class="deduction-wrap">
                    <div class="deduction-meta">
                      <span>Deduction Recovery</span>
                      <span>{{ companyDeductionPct(company) }}%</span>
                    </div>
                    <div class="deduction-track">
                      <div class="deduction-fill" :class="deductionClass(company)" :style="{ width: companyDeductionPct(company) + '%' }" />
                    </div>
                    <div class="deduction-sub">
                      Collected {{ fmt(company.totalDeductionCollected || 0) }} / Total {{ fmt(companyDeductionTotal(company)) }}
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
                          <th>Expected meter</th>
                          <th>Produced meter</th>
                          <th>Rejected meter</th>
                          <th>Accepted meter</th>
                          <th>Rate/m</th>
                          <th>Total Amount</th>
                          <th>Deduction %</th>
                          <th>Deduction Amt</th>
                          <th>Rejection Loss</th>
                          <th>Payable Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="row in company.orders" :key="row._id" @click="goToOrderDetail(row)">
                          <td class="company-order-name-cell">
                            <a :href="getOrderDetailHref(row)" class="company-order-link" @click.stop>
                              {{ row.orderName }}
                            </a>
                          </td>
                          <td>
                            <span :class="['state-pill', row.executionState.tone]">{{ row.executionState.label }}</span>
                          </td>
                          <td>{{ fmtN(row.expectedMeter || 0) }} m</td>
                          <td>{{ fmtN(Number(row.periodProducedMeter || 0) + Number(row.periodRejectedMeter || 0)) }} m</td>
                          <td>{{ fmtN(row.periodRejectedMeter || 0) }} m</td>
                          <td>{{ fmtN(row.periodProducedMeter || 0) }} m</td>
                          <td>{{ fmtRatePerMeter(row.ratePerMeter || 0) }}</td>
                          <td>{{ fmtRounded(row.periodTotalValue || 0) }}</td>
                          <td>{{ Number(row.deductionPct || 0).toFixed(2) }}%</td>
                          <td>{{ fmtRounded(row.periodDeductionAmt || 0) }}</td>
                          <td>{{ fmtRounded(row.periodRejectionGrossLoss || 0) }}</td>
                          <td>{{ fmtRounded(row.periodPayableAmt || 0) }}</td>
                        </tr>
                      </tbody>
                      <tfoot>
                        <tr class="company-order-total-row">
                          <td>Total</td>
                          <td>-</td>
                          <td>{{ fmtN(company.orderTotals.expectedMeter) }} m</td>
                          <td>{{ fmtN(company.orderTotals.producedMeter) }} m</td>
                          <td>{{ fmtN(company.orderTotals.rejectedMeter) }} m</td>
                          <td>{{ fmtN(company.orderTotals.acceptedMeter) }} m</td>
                          <td>-</td>
                          <td>{{ fmtRounded(company.orderTotals.totalAmount) }}</td>
                          <td>-</td>
                          <td>{{ fmtRounded(company.orderTotals.deductionAmount) }}</td>
                          <td>{{ fmtRounded(company.orderTotals.rejectionLoss) }}</td>
                          <td>{{ fmtRounded(company.orderTotals.payableAmount) }}</td>
                        </tr>
                      </tfoot>
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

    <v-card rounded="xl" class="at-card mb-4" style="overflow:hidden">
      <div class="d-flex align-center justify-space-between px-4 py-3" style="border-bottom:1px solid #E0E7EF">
        <div>
          <span class="font-weight-bold" style="font-size:15px">{{ t('recentOrders') }}</span>
          <span class="text-caption text-medium-emphasis ml-2">Last {{ recentOrders.length }} orders</span>
        </div>
        <v-btn variant="tonal" color="primary" size="small" to="/orders" append-icon="mdi-arrow-right">View All Orders</v-btn>
      </div>
      <AgTable :rowData="recentOrders" :columnDefs="orderCols" height="380px" :pagination="false" />
    </v-card>

    <v-dialog v-model="companyPaymentsDialog" max-width="1100">
      <v-card rounded="xl" class="company-payment-dialog">
        <div class="d-flex align-center justify-space-between px-5 py-4 company-dialog-top">
          <div>
            <div class="company-dialog-title">{{ selectedCompany?.companyName || t('company') }} - Company Receipt</div>
            <div class="company-dialog-sub">Enter company-level receipts here. Allocate them to orders separately.</div>
          </div>
          <div class="d-flex align-center" style="gap:8px">
            <v-btn
              color="primary"
              variant="tonal"
              prepend-icon="mdi-call-split"
              :disabled="!selectedCompany?.companyId || selectedCompany?.companyId === 'unknown'"
              @click="openAllocatePayments"
            >
              Allocate Payment
            </v-btn>
            <v-btn icon variant="text" @click="companyPaymentsDialog = false"><v-icon>mdi-close</v-icon></v-btn>
          </div>
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
            <v-col cols="12" sm="3">
              <v-btn variant="tonal" color="secondary" block :disabled="companyPaymentLoading" @click="clearCompanyPaymentFilter">Clear</v-btn>
            </v-col>
          </v-row>

          <v-row class="mt-2">
            <v-col v-for="card in companyPaymentCards" :key="card.label" cols="6" md="3">
              <div class="summary-card" :class="card.tone"><div>{{ card.label }}</div><strong>{{ card.value }}</strong></div>
            </v-col>
          </v-row>
        </div>

        <div class="px-5 py-4" style="border-bottom:1px solid #E0E7EF">
          <div class="font-weight-bold mb-2" style="font-size:13px">{{ editingPaymentId ? 'Edit Company Receipt / Deduction' : 'Add Company Receipt / Deduction' }}</div>
          <div style="font-size:12px;color:#5A6A85" class="mb-3">Payment entries create unallocated company balance. Use Allocate Payment to split receipts across open orders.</div>
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
import { useRoute, useRouter } from 'vue-router'
import api from '@/plugins/axios'
import { useUtils } from '@/composables/useUtils'
import { useNotify } from '@/composables/useNotify'
import { useConfirm } from '@/composables/useConfirm'
import PageHeader from '@/components/common/PageHeader.vue'
import AgTable from '@/components/common/AgTable.vue'

const { t } = useI18n()
const { fmt, fmtN, fmtDate, today, paymentModes, numToWords } = useUtils()
const notify = useNotify()
const { confirm } = useConfirm()
const route = useRoute()
const router = useRouter()

function fmtRatePerMeter(value) {
  const n = Number(value || 0)
  if (!Number.isFinite(n)) return '₹0'
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 20 })}`
}

const orderStore = useOrderStore()
const dashboardStore = useDashboardStore()

const companyPaymentsDialog = ref(false)
const companyPaymentLoading = ref(false)
const companyPaymentSaving = ref(false)
const selectedCompany = ref(null)
function defaultCompanyPaymentFilter() {
  return {
    from: '',
    to: '',
  }
}

const companyPaymentFilter = ref(defaultCompanyPaymentFilter())
const companyPaymentRows = ref([])
const companyPaymentSummary = ref({
  totalPaidAmount: 0,
  totalReceiptAmount: 0,
  totalUnallocatedAmount: 0,
  totalPendingToPay: 0,
  totalDeductionNeedToGet: 0,
  totalDeductionCollected: 0,
  totalPayableAmount: 0,
})
function defaultCompanyPaymentForm() {
  return { transactionType: 'payment', date: today(), amount: null, mode: 'bank', notes: '' }
}

const companyPaymentForm = ref(defaultCompanyPaymentForm())
const editingPaymentId = ref(null)
const paymentAmountInWords = computed(() => numToWords(companyPaymentForm.value.amount))
const companyPaymentCards = computed(() => [
  { label: 'Total Payable', value: fmt(companyPaymentSummary.value.totalPayableAmount || 0), tone: 'payable' },
  { label: 'Total Paid', value: fmt(companyPaymentSummary.value.totalReceiptAmount || 0), tone: 'paid' },
  { label: 'Pending from Company', value: fmt(companyPaymentSummary.value.totalPendingToPay || 0), tone: 'pending' },
  { label: 'Deduction to Get', value: fmt(companyPaymentSummary.value.totalDeductionNeedToGet || 0), tone: 'deduction' },
  { label: 'Total Allocated', value: fmt(companyPaymentSummary.value.totalPaidAmount || 0), tone: 'paid' },
  { label: 'Unallocated funds', value: fmt(companyPaymentSummary.value.totalUnallocatedAmount || 0), tone: '' },
  { label: 'Rejection Meter', value: `${fmtN(selectedCompany.value?.rejectedMeter || 0)} m`, tone: 'meter-lost' },
  { label: 'Rejection Loss', value: fmt(selectedCompany.value?.totalRejectionGrossLoss || 0), tone: 'loss' },
])
const transactionTypeItems = [
  { title: 'Payment', value: 'payment' },
  { title: 'Deduction', value: 'deduction' },
]

const expandedCompanyIds = ref([])
const expandedInitialized = ref(false)
let pendingDashboardUiState = null

function readDashboardUiStateFromQuery() {
  const stateKey = String(route.query.drs || '').trim()
  if (!stateKey) {
    pendingDashboardUiState = null
    return
  }

  try {
    const raw = sessionStorage.getItem(stateKey)
    if (!raw) {
      pendingDashboardUiState = null
      return
    }
    pendingDashboardUiState = JSON.parse(raw)
  } catch {
    pendingDashboardUiState = null
  }
}

function createDashboardUiSnapshot() {
  const snapshot = {
    expandedCompanyIds: [...expandedCompanyIds.value],
    pageScrollY: Number(window.scrollY || window.pageYOffset || 0),
  }
  const key = `dashboard-ui-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  try {
    sessionStorage.setItem(key, JSON.stringify(snapshot))
  } catch {
    return ''
  }
  return key
}

function applyPendingDashboardUiState() {
  if (!pendingDashboardUiState) return

  const companyIds = companyGroups.value.map(row => row.companyId)
  if (Array.isArray(pendingDashboardUiState.expandedCompanyIds)) {
    expandedCompanyIds.value = pendingDashboardUiState.expandedCompanyIds.filter(id => companyIds.includes(id))
  }

  const pageScrollY = Number(pendingDashboardUiState.pageScrollY || 0)
  requestAnimationFrame(() => {
    if (pageScrollY > 0) window.scrollTo({ top: pageScrollY, behavior: 'auto' })
  })

  pendingDashboardUiState = null
}

const dashboardStats = computed(() => dashboardStore.stats || {})
const totalExpectedMeter = computed(() => Number(dashboardStats.value.companyOrderSummary?.reduce((s, c) => s + Number(c.expectedMeter || 0), 0) || 0))
const totalProducedMeter = computed(() => Number(dashboardStats.value.companyOrderSummary?.reduce((s, c) => s + Number(c.producedMeter || 0), 0) || 0))
const totalPendingAmount = computed(() => Number(dashboardStats.value.pendingAmount || 0))
const totalPayableAmount = computed(() => Number(dashboardStats.value.companyOrderSummary?.reduce((s, c) => s + Number(c.totalPayableAmount || 0), 0) || 0))
const totalPaidAmount = computed(() => Number(dashboardStats.value.companyOrderSummary?.reduce((s, c) => s + Number(c.totalPaidAmount || 0), 0) || 0))
const collectionPct = computed(() => {
  if (totalPayableAmount.value <= 0) return 0
  return Math.max(0, Math.min(100, Math.round((totalPaidAmount.value / totalPayableAmount.value) * 1000) / 10))
})

const insights = computed(() => [
  {
    label: 'Production Output',
    value: fmtN(totalProducedMeter.value) + ' m',
    sub: 'against target ' + fmtN(totalExpectedMeter.value) + ' m',
    supportA: 'Remaining ' + fmtN(Math.max(0, totalExpectedMeter.value - totalProducedMeter.value)) + ' m',
    supportB: 'Lost ' + fmtN(dashboardStats.value.totalRejectedMeter || 0) + ' m',
    progress: globalProductionPct.value,
    tone: 'tone-blue', iconTone: 'icon-blue', icon: 'mdi-factory', accentClass: 'accent-blue',
  },
  {
    label: 'Pending Collection',
    value: fmt(totalPendingAmount.value),
    sub: (dashboardStats.value.pendingPaymentCount || 0) + ' companies require follow up',
    supportA: 'Payable ' + fmt(totalPayableAmount.value),
    supportB: 'Collected ' + collectionPct.value + '%',
    progress: collectionPct.value,
    tone: 'tone-orange', iconTone: 'icon-orange', icon: 'mdi-clock-alert-outline', accentClass: 'accent-orange',
  },
  {
    label: 'Monthly Receipt',
    value: fmt(dashboardStats.value.monthlyReceipt || 0),
    sub: 'received this month',
    supportA: 'Total paid ' + fmt(totalPaidAmount.value),
    supportB: 'Unallocated ' + fmt(companyGlobal.value.totalUnallocated || 0),
    progress: totalPayableAmount.value > 0 ? Math.max(0, Math.min(100, Math.round(((dashboardStats.value.monthlyReceipt || 0) / totalPayableAmount.value) * 1000) / 10)) : 0,
    tone: 'tone-green', iconTone: 'icon-green', icon: 'mdi-trending-up', accentClass: 'accent-green',
  },
  {
    label: 'Deduction Balance',
    value: fmt(dashboardStats.value.deductionHoldAmount || 0),
    sub: 'deduction still to collect',
    supportA: 'Collected ' + fmt(dashboardStats.value.companyOrderSummary?.reduce((s, c) => s + Number(c.totalDeductionCollected || 0), 0) || 0),
    supportB: 'Rejection loss ' + fmt(dashboardStats.value.totalRejectionGrossLoss || 0),
    progress: (() => {
      const totalNeed = Number((dashboardStats.value.companyOrderSummary || []).reduce((s, c) => s + Number(c.totalDeductionNeedToGet || 0) + Number(c.totalDeductionCollected || 0), 0))
      const collected = Number((dashboardStats.value.companyOrderSummary || []).reduce((s, c) => s + Number(c.totalDeductionCollected || 0), 0))
      if (totalNeed <= 0) return 0
      return Math.max(0, Math.min(100, Math.round((collected / totalNeed) * 1000) / 10))
    })(),
    tone: 'tone-violet', iconTone: 'icon-violet', icon: 'mdi-hand-coin-outline', accentClass: 'accent-violet',
  },
])

const globalProductionPct = computed(() => {
  const expected = Number(dashboardStats.value.companyOrderSummary?.reduce((sum, row) => sum + Number(row.expectedMeter || 0), 0) || 0)
  const produced = Number(dashboardStats.value.companyOrderSummary?.reduce((sum, row) => sum + Number(row.producedMeter || 0), 0) || 0)
  if (expected <= 0) return 0
  return Math.max(0, Math.min(100, Math.round((produced / expected) * 100)))
})

const stats = computed(() => [
  { icon: 'mdi-package-variant',   label: t('activeOrders'),     value: dashboardStats.value.activeOrders || 0,                  chipColor: '#00897B', chipBg: '#00897B' },
  { icon: 'mdi-check-circle',      label: 'Completed Orders',    value: dashboardStats.value.completedOrders || 0,               chipColor: '#2E7D32', chipBg: '#2E7D32' },
  { icon: 'mdi-factory',           label: t('todayProduction'),  value: fmtN(dashboardStats.value.todayProduction || 0) + ' m',  chipColor: '#1565C0', chipBg: '#1565C0' },
  { icon: 'mdi-percent',           label: 'Production Progress', value: globalProductionPct.value + '%',                         chipColor: '#5C6BC0', chipBg: '#5C6BC0' },
  { icon: 'mdi-close-octagon',     label: 'Meter Lost',          value: fmtN(dashboardStats.value.totalRejectedMeter || 0) + ' m', chipColor: '#BF360C', chipBg: '#BF360C' },
  { icon: 'mdi-cash-remove',       label: 'Rejection Loss',      value: fmt(dashboardStats.value.totalRejectionGrossLoss || 0), chipColor: '#0D47A1', chipBg: '#0D47A1' },
  { icon: 'mdi-wallet-outline',    label: 'Unallocated funds',   value: fmt(companyGlobal.value.totalUnallocated || 0),          chipColor: '#1565C0', chipBg: '#1565C0' },
  { icon: 'mdi-hand-coin',         label: 'Deduction to Get',    value: fmt(dashboardStats.value.deductionHoldAmount || 0),      chipColor: '#6D4C41', chipBg: '#6D4C41' },
])

function orderSortTs(order) {
  return new Date(order?.startDate || order?.createdAt || 0).getTime() || 0
}

function objectIdToTs(id) {
  const raw = String(id || '')
  const hex = raw.slice(0, 8)
  return /^[0-9a-fA-F]{8}$/.test(hex) ? parseInt(hex, 16) * 1000 : 0
}

function orderChangedTs(order) {
  const updatedTs = new Date(order?.updatedAt || 0).getTime()
  if (Number.isFinite(updatedTs) && updatedTs > 0) return updatedTs
  const createdAtTs = new Date(order?.createdAt || 0).getTime()
  if (Number.isFinite(createdAtTs) && createdAtTs > 0) return createdAtTs
  return objectIdToTs(order?._id)
}

function orderStageRank(order) {
  if (order?.status === 'completed') return 2 // Completed last
  const acceptedMeter = Number(order?.acceptedMeter ?? Math.max(0, Number(order?.producedMeter || 0) - Number(order?.rejectedMeter || 0)))
  if (acceptedMeter <= 0) return 0 // Yet to Start first
  return 1 // In Progress middle
}

function compareCompanyOrders(a, b) {
  const rankA = orderStageRank(a)
  const rankB = orderStageRank(b)
  if (rankA !== rankB) return rankA - rankB

  // In Progress & Completed: most recently updated first.
  if (rankA === 1 || rankA === 2) {
    const changedDelta = orderChangedTs(b) - orderChangedTs(a)
    if (changedDelta !== 0) return changedDelta
  }

  const sortDelta = orderSortTs(b) - orderSortTs(a)
  if (sortDelta !== 0) return sortDelta
  return orderChangedTs(b) - orderChangedTs(a)
}

function latestCompanyOrderTs(orders = []) {
  if (!orders.length) return 0
  return Math.max(...orders.map(order => orderChangedTs(order)), 0)
}

const recentOrders = computed(() => [...(orderStore.items || [])]
  .sort((a, b) => orderSortTs(b) - orderSortTs(a))
  .slice(0, 20))

const companyGroups = computed(() => {
  const summaryRows = dashboardStats.value.companyOrderSummary || []
  const orderMap = new Map()

  for (const order of orderStore.items) {
    const companyId = order?.company?._id || 'unknown'
    if (!orderMap.has(companyId)) orderMap.set(companyId, [])
    const acceptedMeter = Number(order.acceptedMeter ?? Math.max(0, Number(order.producedMeter || 0) - Number(order.rejectedMeter || 0)))
    const rejectedMeter = Number(order.rejectedMeter || Math.max(0, Number(order.producedMeter || 0) - acceptedMeter))
    const ratePerMeter = Number(order.ratePerMeter || 0)
    const deductionPct = Number(order.deductionPct || 0)
    const totalValue = acceptedMeter * ratePerMeter
    const deductionAmt = totalValue * (deductionPct / 100)
    const rejectionGrossLoss = rejectedMeter * ratePerMeter
    const rejectionDeductionLoss = rejectionGrossLoss * (deductionPct / 100)
    const rejectionNetLoss = rejectionGrossLoss - rejectionDeductionLoss
    orderMap.get(companyId).push({
      ...order,
      executionState: orderExecutionState(order),
      periodProducedMeter: acceptedMeter,
      periodRejectedMeter: rejectedMeter,
      periodTotalValue:    totalValue,
      periodDeductionAmt:  deductionAmt,
      periodPayableAmt:    totalValue - deductionAmt,
      periodRejectionGrossLoss: rejectionGrossLoss,
      periodRejectionDeductionLoss: rejectionDeductionLoss,
      periodRejectionNetLoss: rejectionNetLoss,
    })
  }

  return summaryRows.map(row => ({
    ...row,
    periodProducedMeter: (orderMap.get(row.companyId) || []).reduce((sum, o) => sum + Number(o.periodProducedMeter || 0), 0),
    orders: [...(orderMap.get(row.companyId) || [])].sort(compareCompanyOrders),
    orderTotals: companyOrderTotals({ orders: orderMap.get(row.companyId) || [] }),
  })).sort((a, b) => {
    const latestOrderA = latestCompanyOrderTs(a.orders)
    const latestOrderB = latestCompanyOrderTs(b.orders)
    if (latestOrderA !== latestOrderB) return latestOrderB - latestOrderA
    return new Date(b.lastActivityAt || 0).getTime() - new Date(a.lastActivityAt || 0).getTime()
  })
})

const companyGlobal = computed(() => companyGroups.value.reduce((acc, row) => {
  acc.totalCompanies += 1
  acc.totalPending += Number(row.totalPendingToPay || 0)
  acc.totalPaid += Number(row.totalPaidAmount || 0)
  acc.totalUnallocated += Number(row.totalUnallocatedAmount || 0)
  acc.totalDeduction += Number(row.totalDeductionNeedToGet || 0)
  acc.totalPayable += Number(row.totalPayableAmount || 0)
  return acc
}, { totalCompanies: 0, totalPending: 0, totalPaid: 0, totalUnallocated: 0, totalDeduction: 0, totalPayable: 0 }))

watch(companyGroups, (rows) => {
  const ids = rows.map(row => row.companyId)
  if (!expandedInitialized.value) {
    expandedCompanyIds.value = [...ids]
    expandedInitialized.value = true
  } else {
    expandedCompanyIds.value = expandedCompanyIds.value.filter(id => ids.includes(id))
  }
  applyPendingDashboardUiState()
}, { immediate: true })

watch([companyGroups, () => route.query.expandCompany], () => {
  const expandCompany = String(route.query.expandCompany || '').trim()
  if (!expandCompany) return
  if (!companyGroups.value.some(row => row.companyId === expandCompany)) return
  if (expandedCompanyIds.value.includes(expandCompany)) return
  expandedCompanyIds.value = [...expandedCompanyIds.value, expandCompany]
}, { immediate: true })

watch(() => route.query.drs, () => {
  readDashboardUiStateFromQuery()
  applyPendingDashboardUiState()
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
  return Math.max(0, Math.min(100, Math.round((paid / payable) * 1000) / 10))
}

function settleClass(company) {
  const pct = companySettlePct(company)
  if (pct >= 80) return 'is-good'
  if (pct >= 40) return 'is-mid'
  return 'is-low'
}

function companyDeductionTotal(company) {
  return Number(company?.totalDeductionNeedToGet || 0) + Number(company?.totalDeductionCollected || 0)
}

function companyAvgRate(company) {
  const accepted = Number(company?.producedMeter || 0)
  if (accepted <= 0) return 0
  return Number(company?.totalProducedValue || 0) / accepted
}

function companyDeductionPct(company) {
  const total = companyDeductionTotal(company)
  const collected = Number(company?.totalDeductionCollected || 0)
  if (total <= 0) return 0
  return Math.max(0, Math.min(100, Math.round((collected / total) * 1000) / 10))
}

function deductionClass(company) {
  const pct = companyDeductionPct(company)
  if (pct >= 80) return 'is-good'
  if (pct >= 40) return 'is-mid'
  return 'is-low'
}

function orderExecutionState(row) {
  if (row?.status === 'completed') return { label: 'Completed', tone: 'good' }
  const acceptedMeter = Number(row?.acceptedMeter ?? Math.max(0, Number(row?.producedMeter || 0) - Number(row?.rejectedMeter || 0)))
  if (acceptedMeter <= 0) return { label: 'Yet to Start', tone: 'neutral' }
  return { label: 'In Progress', tone: 'info' }
}

function companyOrderTotals(company) {
  const rows = company?.orders || []
  const totals = rows.reduce((acc, row) => {
    const expectedMeter = Number(row?.expectedMeter || 0)
    const acceptedMeter = Number(row?.periodProducedMeter || 0)
    const rejectedMeter = Number(row?.periodRejectedMeter || 0)
    const producedMeter = acceptedMeter + rejectedMeter
    const totalAmount = Number(row?.periodTotalValue || 0)
    const deductionAmount = Number(row?.periodDeductionAmt || 0)
    const rejectionLoss = Number(row?.periodRejectionGrossLoss || 0)
    const payableAmount = Number(row?.periodPayableAmt || 0)

    acc.expectedMeter += expectedMeter
    acc.producedMeter += producedMeter
    acc.rejectedMeter += rejectedMeter
    acc.acceptedMeter += acceptedMeter
    acc.totalAmount += totalAmount
    acc.deductionAmount += deductionAmount
    acc.rejectionLoss += rejectionLoss
    acc.payableAmount += payableAmount
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

  return totals
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
    const params = {}
    if (companyPaymentFilter.value.from) params.from = companyPaymentFilter.value.from
    if (companyPaymentFilter.value.to) params.to = companyPaymentFilter.value.to

    const { data } = await api.get(`/dashboard/company-payments/${selectedCompany.value.companyId}`, {
      params,
    })

    companyPaymentRows.value = data.rows || []
    companyPaymentSummary.value = {
      totalPaidAmount: data.summary?.totalPaidAmount || 0,
      totalReceiptAmount: data.summary?.totalReceiptAmount || 0,
      totalUnallocatedAmount: data.summary?.totalUnallocatedAmount || 0,
      totalPendingToPay: data.summary?.totalPendingToPay || 0,
      totalDeductionNeedToGet: data.summary?.totalDeductionNeedToGet || 0,
      totalDeductionCollected: data.summary?.totalDeductionCollected || 0,
      totalPayableAmount: data.summary?.totalPayableAmount || 0,
    }
  } finally {
    companyPaymentLoading.value = false
  }
}

async function clearCompanyPaymentFilter() {
  companyPaymentFilter.value = { from: '', to: '' }
  await loadCompanyPayments()
}

async function addCompanyPayment() {
  if (!selectedCompany.value?.companyId || Number(companyPaymentForm.value.amount || 0) <= 0) {
    notify.error('Enter a valid amount')
    return
  }

  companyPaymentSaving.value = true
  try {
    const payload = {
      transactionType: companyPaymentForm.value.transactionType || 'payment',
      amount: Number(companyPaymentForm.value.amount || 0),
      mode: companyPaymentForm.value.mode || 'cash',
      notes: companyPaymentForm.value.notes || '',
    }
    if (companyPaymentForm.value.date) payload.date = companyPaymentForm.value.date

    await api.post(`/dashboard/company-payments/${selectedCompany.value.companyId}`, payload)

    companyPaymentForm.value = defaultCompanyPaymentForm()
    await loadCompanyPayments()
    void dashboardStore.fetch(true).catch(() => {})
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
    const payload = {
      company: selectedCompany.value.companyId,
      transactionType: companyPaymentForm.value.transactionType || 'payment',
      amount: Number(companyPaymentForm.value.amount || 0),
      mode: companyPaymentForm.value.mode || 'cash',
      notes: companyPaymentForm.value.notes || '',
    }
    if (companyPaymentForm.value.date) payload.date = companyPaymentForm.value.date

    await api.put(`/payments/${editingPaymentId.value}`, payload)

    resetCompanyPaymentForm()
    await loadCompanyPayments()
    void dashboardStore.fetch(true).catch(() => {})
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
    await loadCompanyPayments()
    void dashboardStore.fetch(true).catch(() => {})
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
  companyPaymentForm.value = defaultCompanyPaymentForm()
}

async function openCompanyPayments(company) {
  selectedCompany.value = company
  resetCompanyPaymentForm()
  companyPaymentFilter.value = defaultCompanyPaymentFilter()
  companyPaymentsDialog.value = true
  await loadCompanyPayments()
}

function openAllocatePayments() {
  const companyId = selectedCompany.value?.companyId
  if (!companyId || companyId === 'unknown') return
  companyPaymentsDialog.value = false
  router.push(`/allocations?company=${companyId}`)
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
  const location = getOrderDetailLocation(row)
  if (!location) return
  router.push(location)
}

function getOrderDetailLocation(row) {
  if (!row?._id) return null
  const query = { from: 'dashboard' }
  const expandCompany = String(row?.company?._id || row?.companyId || '').trim()
  if (expandCompany) query.expandCompany = expandCompany
  const uiStateKey = createDashboardUiSnapshot()
  if (uiStateKey) query.drs = uiStateKey
  return { path: `/orders/${row._id}`, query }
}

function getOrderDetailHref(row) {
  const location = getOrderDetailLocation(row)
  return location ? router.resolve(location).href : '#'
}

const orderCols = [
  {
    field: 'orderName',
    headerName: 'Order',
    flex: 1.5,
    minWidth: 140,
    disableRowNavigation: true,
    cellRenderer: p => `<a href="${getOrderDetailHref(p.data)}" style="display:block;color:#1A2744;font-weight:700;text-decoration:none">${p.value || '-'}</a>`,
  },
  { field: 'company.name',   headerName: 'Company',          flex: 1.2, minWidth: 130 },
  { field: 'expectedMeter',  headerName: 'Expected (m)',     flex: 1,   minWidth: 110, valueFormatter: p => fmtN(p.value || 0) + ' m' },
  { field: 'producedMeter',  headerName: 'Produced (m)',     flex: 1,   minWidth: 110, valueFormatter: p => fmtN(p.value || 0) + ' m' },
  { field: 'rejectedMeter',  headerName: 'Meter Lost (m)',   flex: 1,   minWidth: 120, valueFormatter: p => fmtN(p.value || 0) + ' m' },
  {
    headerName: 'Rejection Loss',
    flex: 1,
    minWidth: 130,
    valueFormatter: p => {
      const rejectedMeter = Number(p.data?.rejectedMeter || 0)
      const grossLoss = rejectedMeter * Number(p.data?.ratePerMeter || 0)
      return fmt(grossLoss)
    },
  },
  { field: 'ratePerMeter',   headerName: 'Rate/m',           flex: 0.8, minWidth: 90,  valueFormatter: p => fmtRatePerMeter(p.value || 0) },
  { field: 'deductionPct',   headerName: 'Deduction %',      flex: 0.8, minWidth: 100, valueFormatter: p => Number(p.value || 0).toFixed(1) + '%' },
  { field: 'startDate',      headerName: 'Start Date',       flex: 1,   minWidth: 110, valueFormatter: p => p.value ? fmtDate(p.value) : '-' },
  {
    field: 'status',
    headerName: 'Status',
    flex: 0.9, minWidth: 90,
    cellRenderer: p => `<span class="${p.value === 'completed' ? 'chip-done' : 'chip-active'}" style="padding:2px 10px;border-radius:20px;font-size:11px">${p.value === 'completed' ? 'Done' : 'Active'}</span>`,
  },
].map(col => (
  col.disableRowNavigation
    ? col
    : { ...col, onCellClicked: ({ data }) => goToOrderDetail(data) }
))

async function load(force = false) {
  await Promise.all([
    orderStore.fetch({}, { force }),
    dashboardStore.fetch(force).catch(() => {}),
  ])
}

onMounted(async () => {
  readDashboardUiStateFromQuery()
  await load(false)
  applyPendingDashboardUiState()
})
</script>

<style scoped>
/* ── Hero Banner ─────────────────────────────────────────────────── */
.dash-hero {
  background:
    radial-gradient(1200px 260px at -8% -40%, rgba(21, 101, 192, 0.18), transparent 62%),
    radial-gradient(900px 220px at 108% -32%, rgba(46, 125, 50, 0.13), transparent 62%),
    linear-gradient(180deg, #f3f7ff 0%, #eef4ff 100%);
  border-radius: 20px;
  padding: 20px;
  border: 1px solid #dde6f5;
  box-shadow: 0 8px 28px rgba(21, 101, 192, 0.1);
}

.hero-topline {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 14px;
}

.hero-pill {
  border: 1px solid #d8e5f3;
  border-radius: 12px;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.75);
  backdrop-filter: blur(2px);
}

.hero-pill-label {
  display: block;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.45px;
  color: #7388a4;
  font-weight: 700;
}

.hero-pill-value {
  display: block;
  margin-top: 2px;
  font-size: 16px;
  color: #173a63;
  font-weight: 800;
}

.dash-insights {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 16px;
}

.dash-insight-card {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 20px;
  border-radius: 16px;
  background: #fff;
  border: 1px solid #e0eaf5;
  box-shadow: 0 2px 12px rgba(21,101,192,0.07);
  overflow: hidden;
  transition: transform 0.18s, box-shadow 0.18s;
}
.dash-insight-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(21,101,192,0.13); }

/* colored left border accent */
.dh-accent { position: absolute; left: 0; top: 0; bottom: 0; width: 5px; border-radius: 16px 0 0 16px; }
.accent-blue   { background: linear-gradient(180deg,#1976d2,#42a5f5); }
.accent-orange { background: linear-gradient(180deg,#e65100,#ffa726); }
.accent-green  { background: linear-gradient(180deg,#2e7d32,#66bb6a); }

.dh-icon-wrap {
  width: 48px; height: 48px;
  border-radius: 14px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
  margin-left: 6px;
}
.icon-blue   { background: linear-gradient(135deg,#1565c0,#42a5f5); box-shadow: 0 4px 12px rgba(21,101,192,0.35); }
.icon-orange { background: linear-gradient(135deg,#e65100,#ffa726); box-shadow: 0 4px 12px rgba(230,81,0,0.35); }
.icon-green  { background: linear-gradient(135deg,#2e7d32,#66bb6a); box-shadow: 0 4px 12px rgba(46,125,50,0.35); }
.icon-violet { background: linear-gradient(135deg,#7b1fa2,#ab47bc); box-shadow: 0 4px 12px rgba(123,31,162,0.35); }

.dh-body { flex: 1; min-width: 0; }
.dh-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.7px; color: #7a90ab; }
.dh-value { font-size: 28px; font-weight: 800; margin-top: 4px; line-height: 1.1; color: #162f55; }
.dh-sub   { font-size: 12px; color: #8fa3bc; margin-top: 4px; }

.dh-kpis {
  margin-top: 7px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.dh-kpis span {
  font-size: 11px;
  color: #5f7594;
  font-weight: 700;
}

.dh-progress {
  margin-top: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.dh-progress-track {
  flex: 1;
  height: 6px;
  border-radius: 999px;
  background: #dde8f6;
  overflow: hidden;
}

.dh-progress-fill {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #1d7acb 0%, #24a66a 100%);
}

.dh-progress-value {
  font-size: 11px;
  font-weight: 800;
  color: #234c7a;
}

.tone-blue   .dh-value { color: #1565c0; }
.tone-orange .dh-value { color: #e65100; }
.tone-green  .dh-value { color: #2e7d32; }
.tone-violet .dh-value { color: #7b1fa2; }

.accent-violet { background: linear-gradient(180deg,#8e24aa,#ba68c8); }

/* stat chips row */
.dash-chips {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 10px;
}
@media (max-width: 1200px) { .dash-chips { grid-template-columns: repeat(4, 1fr); } }
@media (max-width: 860px)  { .dash-chips { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 520px)  { .dash-chips { grid-template-columns: 1fr; } }
@media (max-width: 1200px) {
  .hero-topline {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .dash-insights {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 1024px) {
  .dash-insights {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 700px)  {
  .hero-topline,
  .dash-insights {
    grid-template-columns: 1fr;
  }
}

.dash-chip {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 14px;
  min-height: 88px;
  border-radius: 14px;
  background: #fff;
  border: 1px solid #e0eaf5;
  box-shadow: 0 1px 6px rgba(21,101,192,0.06);
  transition: box-shadow 0.15s;
}
.dash-chip:hover { box-shadow: 0 4px 14px rgba(21,101,192,0.13); }

.dc-icon-box {
  width: 38px; height: 38px;
  border-radius: 11px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
  opacity: 0.9;
}
.dc-label { font-size: 11px; color: #8fa3bc; font-weight: 700; text-transform: uppercase; letter-spacing: 0.4px; }
.dc-value { font-size: 16px; font-weight: 800; line-height: 1.2; color: #162f55; }

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
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.company-head-side {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
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

.company-head-controls {
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
  min-height: 34px;
  padding: 0 14px;
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

.company-head-badge.deduction {
  background: #fff2f2;
  color: #a83d3d;
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
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 8px;
  margin-top: 12px;
}

@media (max-width: 980px) {
  .company-master-metrics {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 520px) {
  .company-master-metrics {
    grid-template-columns: 1fr;
  }
}

.money-chip {
  border-radius: 12px;
  border: 1px solid #deebf6;
  padding: 10px 12px;
  background: #fff;
  min-height: 72px;
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

.money-chip.payable strong {
  color: #2e7d32;
}

.money-chip.paid strong {
  color: #1b7f3f;
}

.money-chip.unallocated strong {
  color: #1565c0;
}

.money-chip.pending strong {
  color: #d26a00;
}

.money-chip.deduction strong {
  color: #c62828;
}

.money-chip.meter-lost strong {
  color: #ef6c00;
}

.money-chip.loss strong {
  color: #0d47a1;
}

.money-chip.settle strong {
  color: #2e7d32;
}

.money-chip.deduction-collected strong {
  color: #8e24aa;
}

.money-chip.avg-rate strong {
  color: #1565c0;
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

.settle-sub {
  margin-top: 4px;
  font-size: 11px;
  color: #52708f;
}

.deduction-wrap {
  margin-top: 10px;
}

.deduction-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
  font-weight: 700;
  color: #7a3e3e;
}

.deduction-track {
  margin-top: 6px;
  height: 8px;
  border-radius: 999px;
  overflow: hidden;
  background: #f4dfdf;
}

.deduction-fill {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #f59e0b 0%, #ef4444 100%);
}

.deduction-fill.is-low {
  background: linear-gradient(90deg, #f59e0b 0%, #f97316 100%);
}

.deduction-fill.is-mid {
  background: linear-gradient(90deg, #f97316 0%, #ec4899 100%);
}

.deduction-fill.is-good {
  background: linear-gradient(90deg, #22c55e 0%, #10b981 100%);
}

.deduction-sub {
  margin-top: 4px;
  font-size: 11px;
  color: #8f5959;
}

.company-order-strip {
  margin-top: 12px;
  border: 1px solid #dde8f4;
  border-radius: 12px;
  background: #f8fbff;
  overflow-x: auto;
  overflow-y: hidden;
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
  min-width: 1040px;
  border-collapse: collapse;
}

.company-order-table th,
.company-order-table td {
  padding: 10px 12px;
  font-size: 13px;
  text-align: left;
  border-bottom: 1px solid #ebf1f7;
  vertical-align: middle;
}

.company-order-name-cell {
  min-width: 190px;
}

.company-order-link {
  display: inline-block;
  max-width: 100%;
  color: #1a2744;
  font-weight: 700;
  text-decoration: none;
  line-height: 1.35;
  white-space: normal;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.company-order-link:hover {
  text-decoration: underline;
}

.company-order-table thead th {
  font-size: 10.5px;
  line-height: 1.35;
  letter-spacing: 0.55px;
  text-transform: uppercase;
  color: #5e7290;
  white-space: nowrap;
  word-break: normal;
  background: #f8fbff;
}

.company-order-table tbody tr {
  cursor: pointer;
}

.company-order-table tbody tr:hover {
  background: #eef5ff;
}

.company-order-table tfoot td {
  padding: 10px 11px;
  font-size: 12px;
  font-weight: 800;
  color: #173a63;
  border-top: 1px solid #d8e6f4;
  background: linear-gradient(180deg, #f5faff 0%, #edf5ff 100%);
}

.company-order-total-row td:first-child {
  text-transform: uppercase;
  letter-spacing: 0.35px;
}

.state-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 3px 9px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  border: 1px solid transparent;
  line-height: 1.15;
  white-space: nowrap;
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

  .company-head-side,
  .company-head-badges,
  .company-head-controls {
    width: 100%;
    justify-content: flex-start;
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
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .company-order-strip-head {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }

  .company-order-table {
    min-width: 980px;
  }
}
</style>
