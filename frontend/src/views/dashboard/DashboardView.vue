<template>
  <div class="dashboard-page">
    <!-- Header -->
    <div class="dash-header">
      <div>
        <h1 class="dash-title">Dashboard</h1>
        <p class="dash-date">{{ fmtDate(new Date()) }}</p>
      </div>
      <v-btn variant="tonal" color="primary" prepend-icon="mdi-refresh" size="small" @click="load(true)">Refresh</v-btn>
    </div>

    <!-- KPI Strip -->
    <div class="kpi-strip">
      <div class="kpi-card">
        <div class="kpi-icon" style="background:#EBF5FF;color:#1565C0">
          <v-icon size="20">mdi-domain</v-icon>
        </div>
        <div class="kpi-info">
          <span class="kpi-label">Companies</span>
          <span class="kpi-value">{{ companyGlobal.totalCompanies || 0 }}</span>
        </div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon" style="background:#E8F5E9;color:#2E7D32">
          <v-icon size="20">mdi-cash-multiple</v-icon>
        </div>
        <div class="kpi-info">
          <span class="kpi-label">Total Payable</span>
          <span class="kpi-value">{{ fmt(companyGlobal.totalPayable || 0) }}</span>
        </div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon" style="background:#F3E5F5;color:#7B1FA2">
          <v-icon size="20">mdi-check-decagram</v-icon>
        </div>
        <div class="kpi-info">
          <span class="kpi-label">Total Paid</span>
          <span class="kpi-value">{{ fmt(companyGlobal.totalPaid || 0) }}</span>
        </div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon" style="background:#FFF3E0;color:#E65100">
          <v-icon size="20">mdi-percent-circle</v-icon>
        </div>
        <div class="kpi-info">
          <span class="kpi-label">Collection</span>
          <span class="kpi-value">{{ collectionPct }}%</span>
        </div>
      </div>
    </div>

    <!-- Insight Cards -->
    <div class="insight-grid">
      <div v-for="insight in insights" :key="insight.label" class="insight-card" :class="insight.tone">
        <div class="insight-top">
          <div class="insight-icon-wrap" :class="insight.iconTone">
            <v-icon size="22" color="white">{{ insight.icon }}</v-icon>
          </div>
          <div class="insight-badge" :class="insight.tone">
            {{ insight.progress }}%
          </div>
        </div>
        <div class="insight-label">{{ insight.label }}</div>
        <div class="insight-value">{{ insight.value }}</div>
        <div class="insight-sub">{{ insight.sub }}</div>
        <div class="insight-bar">
          <div class="insight-bar-track">
            <div class="insight-bar-fill" :class="insight.tone" :style="{ width: insight.progress + '%' }"></div>
          </div>
        </div>
        <div class="insight-kpis">
          <span>{{ insight.supportA }}</span>
          <span>{{ insight.supportB }}</span>
        </div>
      </div>
    </div>

    <!-- Quick Stats -->
    <div class="stats-grid">
      <div v-for="s in stats" :key="s.label" class="stat-tile">
        <div class="stat-icon-box" :style="{ background: s.chipBg + '14', color: s.chipColor }">
          <v-icon size="18">{{ s.icon }}</v-icon>
        </div>
        <div class="stat-content">
          <span class="stat-label">{{ s.label }}</span>
          <span class="stat-value">{{ s.value }}</span>
        </div>
      </div>
    </div>

    <!-- Company Overview Section -->
    <div class="section-card">
      <div class="section-header">
        <div class="section-header-left">
          <div class="section-icon">
            <v-icon size="20" color="primary">mdi-office-building-outline</v-icon>
          </div>
          <div>
            <h2 class="section-title">Company Overview</h2>
            <p class="section-sub">Track payments, settlements, and deductions by company</p>
          </div>
        </div>
        <div class="section-header-right">
          <div class="section-badges">
            <span class="s-badge blue">{{ companyGlobal.totalCompanies }} Companies</span>
            <span class="s-badge green">Paid {{ fmt(companyGlobal.totalPaid || 0) }}</span>
            <span class="s-badge orange">Pending {{ fmt(companyGlobal.totalPending || 0) }}</span>
          </div>
          <div class="section-actions">
            <v-text-field
              v-model="dashboardSearch"
              placeholder="Search company or order..."
              prepend-inner-icon="mdi-magnify"
              density="compact"
              variant="outlined"
              hide-details
              clearable
              class="dashboard-search"
            />
            <v-btn size="small" variant="flat" color="primary" prepend-icon="mdi-plus" @click="router.push('/companies?add=1')">Add Company</v-btn>
            <v-btn size="small" variant="tonal" color="primary" @click="expandAllCompanies">Expand All</v-btn>
            <v-btn size="small" variant="tonal" color="primary" @click="collapseAllCompanies">Collapse All</v-btn>
          </div>
        </div>
      </div>

      <div v-if="filteredCompanyGroups.length" class="company-list">
        <div v-for="company in filteredCompanyGroups" :key="company.companyId + '-' + company.companyName" class="company-card">
          <!-- Company Header -->
          <div
            class="company-header"
            role="button"
            tabindex="0"
            :aria-expanded="isCompanyExpanded(company.companyId)"
            @click="toggleCompany(company.companyId)"
            @keydown.enter.prevent="toggleCompany(company.companyId)"
            @keydown.space.prevent="toggleCompany(company.companyId)"
          >
            <div class="company-header-left">
              <div class="tex-av-3d" style="width:42px;height:42px;font-size:14px" :style="{ backgroundColor: nameColor(company.companyName) }">
                {{ nameInitials(company.companyName) }}
              </div>
              <div>
                <div class="company-name">{{ company.companyName }}</div>
                <div class="company-meta">{{ company.orderCount }} {{ t('orders') }} &middot; {{ company.activeOrders }} active</div>
              </div>
            </div>
            <div class="company-header-right">
              <v-btn size="small" color="primary" variant="tonal" prepend-icon="mdi-plus" @click.stop="openAddOrder(company)">
                Add Order
              </v-btn>
              <v-btn size="small" color="success" variant="flat" prepend-icon="mdi-cash-plus" @click.stop="openCompanyPayments(company)">
                Payment
              </v-btn>
              <v-btn
                size="small"
                variant="text"
                color="primary"
                :icon="isCompanyExpanded(company.companyId) ? 'mdi-chevron-up' : 'mdi-chevron-down'"
                @click.stop="toggleCompany(company.companyId)"
              />
            </div>
          </div>

          <!-- Company Metrics -->
          <div class="company-metrics">
            <div class="metric-pill payable">
              <span class="metric-label">Payable</span>
              <span class="metric-value">{{ fmt(company.totalPayableAmount || 0) }}</span>
            </div>
            <div class="metric-pill paid">
              <span class="metric-label">Paid</span>
              <span class="metric-value">{{ fmt(company.totalPaidAmount || 0) }}</span>
            </div>
            <div class="metric-pill pending">
              <span class="metric-label">Pending</span>
              <span class="metric-value">{{ fmt(company.totalPendingToPay || 0) }}</span>
            </div>
            <div class="metric-pill deduction">
              <span class="metric-label">Deduction</span>
              <span class="metric-value">{{ fmt(company.totalDeductionNeedToGet || 0) }}</span>
            </div>
            <div class="metric-pill unallocated">
              <span class="metric-label">Unallocated</span>
              <span class="metric-value">{{ fmt(company.totalUnallocatedAmount || 0) }}</span>
            </div>
            <div class="metric-pill meter-lost">
              <span class="metric-label">Rejected</span>
              <span class="metric-value">{{ fmtN(company.rejectedMeter || 0) }} m</span>
            </div>
            <div class="metric-pill loss">
              <span class="metric-label">Loss</span>
              <span class="metric-value">{{ fmt(company.totalRejectionGrossLoss || 0) }}</span>
            </div>
            <div class="metric-pill settle">
              <span class="metric-label">Settlement</span>
              <span class="metric-value">{{ companySettlePct(company) }}%</span>
            </div>
            <div class="metric-pill deduction-collected">
              <span class="metric-label">Ded. Collected</span>
              <span class="metric-value">{{ fmt(company.totalDeductionCollected || 0) }}</span>
            </div>
            <div class="metric-pill avg-rate">
              <span class="metric-label">Avg Rate/m</span>
              <span class="metric-value">{{ fmtRounded(companyAvgRate(company)) }}</span>
            </div>
          </div>

          <!-- Expanded Content -->
          <v-expand-transition>
            <div v-show="isCompanyExpanded(company.companyId)" class="company-expanded">
              <!-- Settlement Progress -->
              <div class="progress-section">
                <div class="progress-row">
                  <div class="progress-block">
                    <div class="progress-header">
                      <span class="progress-title">Settlement</span>
                      <span class="progress-pct">{{ companySettlePct(company) }}%</span>
                    </div>
                    <div class="progress-track">
                      <div class="progress-fill settlement" :class="settleClass(company)" :style="{ width: companySettlePct(company) + '%' }" />
                    </div>
                    <span class="progress-detail">{{ fmt(company.totalPaidAmount || 0) }} / {{ fmt(company.totalPayableAmount || 0) }}</span>
                  </div>
                  <div class="progress-block">
                    <div class="progress-header">
                      <span class="progress-title">Deduction Recovery</span>
                      <span class="progress-pct">{{ companyDeductionPct(company) }}%</span>
                    </div>
                    <div class="progress-track">
                      <div class="progress-fill deduction" :class="deductionClass(company)" :style="{ width: companyDeductionPct(company) + '%' }" />
                    </div>
                    <span class="progress-detail">{{ fmt(company.totalDeductionCollected || 0) }} / {{ fmt(companyDeductionTotal(company)) }}</span>
                  </div>
                </div>
              </div>

              <!-- Order Table -->
              <div class="order-table-wrap">
                <div class="order-table-header">
                  <span class="order-table-title">
                    <v-icon size="14" class="mr-1">mdi-package-variant-closed</v-icon>
                    Order Production
                  </span>
                  <span class="order-table-summary">{{ fmtN(company.periodProducedMeter || 0) }} / {{ fmtN(company.expectedMeter || 0) }} m</span>
                </div>
                <div class="order-table-scroll">
                  <table class="order-table" v-if="company.orders.length">
                    <thead>
                      <tr>
                        <th>Order</th>
                        <th>State</th>
                        <th>Expected</th>
                        <th>Produced</th>
                        <th>Rejected</th>
                        <th>Accepted</th>
                        <th>Rate/m</th>
                        <th>Total Amt</th>
                        <th>Ded %</th>
                        <th>Ded Amt</th>
                        <th>Rej Loss</th>
                        <th>Payable</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="row in company.orders" :key="row._id" :data-order-id="row._id" :class="{ 'highlight-row': highlightOrderId === row._id }" @click="goToOrderDetail(row)">
                        <td class="order-name-cell">
                          <a :href="getOrderDetailHref(row)" class="order-link" @click.stop>
                            {{ row.orderName }}
                          </a>
                        </td>
                        <td>
                          <span :class="['order-state', row.executionState.tone]">{{ row.executionState.label }}</span>
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
                        <td class="payable-cell">{{ fmtRounded(row.periodPayableAmt || 0) }}</td>
                      </tr>
                    </tbody>
                    <tfoot>
                      <tr>
                        <td><strong>Total</strong></td>
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
                        <td><strong>{{ fmtRounded(company.orderTotals.payableAmount) }}</strong></td>
                      </tr>
                    </tfoot>
                  </table>
                  <div v-else class="no-orders">{{ t('noData') }}</div>
                </div>
              </div>
            </div>
          </v-expand-transition>
        </div>
      </div>
      <div v-else class="empty-state">
        <v-icon size="48" color="grey-lighten-1">{{ dashboardSearch ? 'mdi-magnify' : 'mdi-office-building-outline' }}</v-icon>
        <p>{{ dashboardSearch ? 'No results for "' + dashboardSearch + '"' : t('noData') }}</p>
      </div>
    </div>


    <!-- Company Payments Dialog -->
    <v-dialog v-model="companyPaymentsDialog" max-width="1140" :scrim="true" scrim-opacity="0.4">
      <v-card rounded="xl" class="pd">
        <!-- Gradient Header -->
        <div class="pd-header">
          <div class="pd-header-bg"></div>
          <div class="pd-header-content">
            <div class="pd-header-left">
              <div class="pd-company-badge">
                {{ selectedCompany?.companyName?.charAt(0)?.toUpperCase() || 'C' }}
              </div>
              <div>
                <h2 class="pd-title">{{ selectedCompany?.companyName || t('company') }}</h2>
                <p class="pd-subtitle">Company Receipt &amp; Deduction Management</p>
              </div>
            </div>
            <div class="pd-header-actions">
              <v-btn
                color="white"
                variant="flat"
                prepend-icon="mdi-call-split"
                size="small"
                class="pd-allocate-btn"
                :disabled="!selectedCompany?.companyId || selectedCompany?.companyId === 'unknown'"
                @click="openAllocatePayments"
              >
                Allocate Payment
              </v-btn>
              <v-btn icon variant="text" size="small" class="pd-close-btn" @click="companyPaymentsDialog = false">
                <v-icon color="white">mdi-close</v-icon>
              </v-btn>
            </div>
          </div>
        </div>

        <!-- Summary Cards -->
        <div class="pd-summary">
          <div class="pd-summary-grid">
            <div v-for="card in companyPaymentCards" :key="card.label" class="pd-stat" :class="card.tone">
              <div class="pd-stat-icon" :class="card.tone">
                <v-icon size="16">{{ getPaymentCardIcon(card.tone) }}</v-icon>
              </div>
              <div class="pd-stat-info">
                <span class="pd-stat-label">{{ card.label }}</span>
                <span class="pd-stat-value">{{ card.value }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Filter Bar -->
        <div class="pd-filter-bar">
          <div class="pd-filter-row">
            <v-text-field
              v-model="companyPaymentFilter.from"
              :label="t('from')"
              type="date"
              density="compact"
              hide-details="auto"
              class="pd-filter-field"
            />
            <v-text-field
              v-model="companyPaymentFilter.to"
              :label="t('to')"
              type="date"
              density="compact"
              hide-details="auto"
              class="pd-filter-field"
            />
            <v-btn color="primary" variant="flat" :loading="companyPaymentLoading" @click="loadCompanyPayments" class="pd-filter-btn">
              <v-icon size="16" class="mr-1">mdi-filter-outline</v-icon>
              Filter
            </v-btn>
            <v-btn variant="outlined" color="grey" :disabled="companyPaymentLoading" @click="clearCompanyPaymentFilter" class="pd-filter-btn">
              Clear
            </v-btn>
          </div>
        </div>

        <!-- Add Payment Form -->
        <div class="pd-form">
          <div class="pd-form-header">
            <div class="pd-form-icon">
              <v-icon size="18" :color="editingPaymentId ? '#E65100' : '#1565C0'">{{ editingPaymentId ? 'mdi-pencil' : 'mdi-plus-circle' }}</v-icon>
            </div>
            <div>
              <div class="pd-form-title">{{ editingPaymentId ? 'Edit Receipt / Deduction' : 'New Receipt / Deduction' }}</div>
              <div class="pd-form-hint">Payments create unallocated balance. Use Allocate to split across orders.</div>
            </div>
          </div>
          <div class="pd-form-fields">
            <v-select
              v-model="companyPaymentForm.transactionType"
              label="Type"
              :items="transactionTypeItems"
              item-value="value"
              item-title="title"
              density="compact"
              hide-details="auto"
              class="pd-field"
            />
            <v-text-field
              v-model="companyPaymentForm.date"
              type="date"
              :label="t('date')"
              density="compact"
              hide-details="auto"
              class="pd-field"
            />
            <v-text-field
              v-model.number="companyPaymentForm.amount"
              type="number"
              prefix="₹"
              :label="t('amount')"
              density="compact"
              hide-details
              class="pd-field"
            />
            <v-select
              v-if="companyPaymentForm.transactionType !== 'deduction'"
              v-model="companyPaymentForm.mode"
              :label="t('paymentMode')"
              :items="paymentModes"
              item-value="value"
              item-title="title"
              density="compact"
              hide-details="auto"
              class="pd-field"
            />
            <v-text-field
              v-model="companyPaymentForm.notes"
              :label="t('notes')"
              density="compact"
              hide-details="auto"
              class="pd-field pd-field-wide"
            />
            <div class="pd-form-actions">
              <v-btn
                :color="editingPaymentId ? 'warning' : 'primary'"
                variant="flat"
                :loading="companyPaymentSaving"
                @click="saveCompanyPayment"
                class="pd-save-btn"
              >
                <v-icon size="16" class="mr-1">{{ editingPaymentId ? 'mdi-check' : 'mdi-content-save' }}</v-icon>
                {{ editingPaymentId ? 'Update' : 'Save' }}
              </v-btn>
              <v-btn v-if="editingPaymentId" variant="tonal" color="grey" @click="resetCompanyPaymentForm" class="pd-cancel-btn">
                Cancel
              </v-btn>
            </div>
          </div>
          <div v-if="paymentAmountInWords" class="pd-amount-words">
            <v-icon size="12" class="mr-1">mdi-information-outline</v-icon>
            {{ paymentAmountInWords }}
          </div>
        </div>

        <!-- Payment Table -->
        <div class="pd-table">
          <div class="pd-table-header">
            <span class="pd-table-title">
              <v-icon size="16" class="mr-1">mdi-format-list-bulleted</v-icon>
              Payment History
            </span>
            <span class="pd-table-count">{{ companyPaymentRows.length }} entries</span>
          </div>
          <AgTable :rowData="companyPaymentRows" :columnDefs="companyPaymentCols" height="280px" :pagination="false" />
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
import AgTable from '@/components/common/AgTable.vue'

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

function getPaymentCardIcon(tone) {
  const icons = {
    payable: 'mdi-cash-multiple',
    paid: 'mdi-check-circle',
    pending: 'mdi-clock-outline',
    deduction: 'mdi-minus-circle',
    'meter-lost': 'mdi-ruler',
    loss: 'mdi-alert-circle',
  }
  return icons[tone] || 'mdi-currency-inr'
}

const expandedCompanyIds = ref([])
const expandedInitialized = ref(false)
const highlightOrderId = ref(null)
const dashboardSearch = ref('')
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
    scrollToHighlightedOrder()
  })

  pendingDashboardUiState = null
}

function scrollToHighlightedOrder() {
  const orderId = String(route.query.highlightOrder || '').trim()
  if (!orderId) return
  highlightOrderId.value = orderId
  setTimeout(() => {
    const el = document.querySelector(`tr[data-order-id="${orderId}"]`)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, 350)
  setTimeout(() => { highlightOrderId.value = null }, 3000)
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
    tone: 'tone-blue', iconTone: 'icon-blue', icon: 'mdi-factory',
  },
  {
    label: 'Pending Collection',
    value: fmt(totalPendingAmount.value),
    sub: (dashboardStats.value.pendingPaymentCount || 0) + ' companies require follow up',
    supportA: 'Payable ' + fmt(totalPayableAmount.value),
    supportB: 'Collected ' + collectionPct.value + '%',
    progress: collectionPct.value,
    tone: 'tone-orange', iconTone: 'icon-orange', icon: 'mdi-clock-alert-outline',
  },
  {
    label: 'Monthly Receipt',
    value: fmt(dashboardStats.value.monthlyReceipt || 0),
    sub: 'received this month',
    supportA: 'Total paid ' + fmt(totalPaidAmount.value),
    supportB: 'Unallocated ' + fmt(companyGlobal.value.totalUnallocated || 0),
    progress: totalPayableAmount.value > 0 ? Math.max(0, Math.min(100, Math.round(((dashboardStats.value.monthlyReceipt || 0) / totalPayableAmount.value) * 1000) / 10)) : 0,
    tone: 'tone-green', iconTone: 'icon-green', icon: 'mdi-trending-up',
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
    tone: 'tone-violet', iconTone: 'icon-violet', icon: 'mdi-hand-coin-outline',
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
  { icon: 'mdi-cash-remove',       label: 'Rejection Loss',      value: fmt(dashboardStats.value.totalRejectionGrossLoss || 0), chipColor: '#C62828', chipBg: '#C62828' },
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
  if (order?.status === 'completed') return 2
  const acceptedMeter = Number(order?.acceptedMeter ?? Math.max(0, Number(order?.producedMeter || 0) - Number(order?.rejectedMeter || 0)))
  if (acceptedMeter <= 0) return 0
  return 1
}

function compareCompanyOrders(a, b) {
  const rankA = orderStageRank(a)
  const rankB = orderStageRank(b)
  if (rankA !== rankB) return rankA - rankB

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

const filteredCompanyGroups = computed(() => {
  const term = String(dashboardSearch.value || '').trim().toLowerCase()
  if (!term) return companyGroups.value

  return companyGroups.value
    .map(company => {
      const companyNameMatch = (company.companyName || '').toLowerCase().includes(term)
      if (companyNameMatch) return company

      const matchedOrders = company.orders.filter(order =>
        (order.orderName || '').toLowerCase().includes(term)
      )
      if (matchedOrders.length) {
        return { ...company, orders: matchedOrders, orderTotals: companyOrderTotals({ orders: matchedOrders }) }
      }

      return null
    })
    .filter(Boolean)
})

watch(filteredCompanyGroups, (groups) => {
  if (!dashboardSearch.value) return
  const ids = groups.map(row => row.companyId)
  expandedCompanyIds.value = [...new Set([...expandedCompanyIds.value, ...ids])]
})

watch(companyGroups, (rows) => {
  const ids = rows.map(row => row.companyId)
  if (!expandedInitialized.value) {
    expandedCompanyIds.value = []
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
  scrollToHighlightedOrder()
})
</script>

<style scoped>
.dashboard-page {
  max-width: 1400px;
  margin: 0 auto;
  padding: 24px 20px;
}

/* Header */
.dash-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}

.dash-title {
  font-size: 26px;
  font-weight: 800;
  color: #1A2744;
  letter-spacing: -0.5px;
}

.dash-date {
  font-size: 13px;
  color: #64748B;
  margin-top: 2px;
}

/* KPI Strip */
.kpi-strip {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.kpi-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px 20px;
  background: #fff;
  border-radius: 16px;
  border: 1px solid #E2E8F0;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
  transition: all 0.2s;
}

.kpi-card:hover {
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
  transform: translateY(-1px);
}

.kpi-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.kpi-info {
  display: flex;
  flex-direction: column;
}

.kpi-label {
  font-size: 12px;
  font-weight: 600;
  color: #64748B;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.kpi-value {
  font-size: 20px;
  font-weight: 800;
  color: #1E293B;
  margin-top: 2px;
}

/* Insight Grid */
.insight-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.insight-card {
  padding: 20px;
  background: #fff;
  border-radius: 16px;
  border: 1px solid #E2E8F0;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
  transition: all 0.2s;
  position: relative;
  overflow: hidden;
}

.insight-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
}

.insight-card.tone-blue::before { background: linear-gradient(90deg, #1565C0, #42A5F5); }
.insight-card.tone-orange::before { background: linear-gradient(90deg, #E65100, #FFA726); }
.insight-card.tone-green::before { background: linear-gradient(90deg, #2E7D32, #66BB6A); }
.insight-card.tone-violet::before { background: linear-gradient(90deg, #7B1FA2, #AB47BC); }

.insight-card:hover {
  box-shadow: 0 8px 24px rgba(0,0,0,0.08);
  transform: translateY(-2px);
}

.insight-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.insight-icon-wrap {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon-blue   { background: linear-gradient(135deg, #1565C0, #42A5F5); }
.icon-orange { background: linear-gradient(135deg, #E65100, #FFA726); }
.icon-green  { background: linear-gradient(135deg, #2E7D32, #66BB6A); }
.icon-violet { background: linear-gradient(135deg, #7B1FA2, #AB47BC); }

.insight-badge {
  font-size: 12px;
  font-weight: 800;
  padding: 4px 10px;
  border-radius: 20px;
}

.insight-badge.tone-blue { background: #EBF5FF; color: #1565C0; }
.insight-badge.tone-orange { background: #FFF3E0; color: #E65100; }
.insight-badge.tone-green { background: #E8F5E9; color: #2E7D32; }
.insight-badge.tone-violet { background: #F3E5F5; color: #7B1FA2; }

.insight-label {
  font-size: 12px;
  font-weight: 700;
  color: #64748B;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.insight-value {
  font-size: 24px;
  font-weight: 800;
  margin: 4px 0;
  line-height: 1.1;
}

.tone-blue .insight-value { color: #1565C0; }
.tone-orange .insight-value { color: #E65100; }
.tone-green .insight-value { color: #2E7D32; }
.tone-violet .insight-value { color: #7B1FA2; }

.insight-sub {
  font-size: 12px;
  color: #94A3B8;
  margin-bottom: 12px;
}

.insight-bar {
  margin-bottom: 10px;
}

.insight-bar-track {
  height: 6px;
  border-radius: 999px;
  background: #F1F5F9;
  overflow: hidden;
}

.insight-bar-fill {
  height: 100%;
  border-radius: 999px;
  transition: width 0.6s ease;
}

.insight-bar-fill.tone-blue { background: linear-gradient(90deg, #1565C0, #42A5F5); }
.insight-bar-fill.tone-orange { background: linear-gradient(90deg, #E65100, #FFA726); }
.insight-bar-fill.tone-green { background: linear-gradient(90deg, #2E7D32, #66BB6A); }
.insight-bar-fill.tone-violet { background: linear-gradient(90deg, #7B1FA2, #AB47BC); }

.insight-kpis {
  display: flex;
  justify-content: space-between;
  gap: 8px;
}

.insight-kpis span {
  font-size: 11px;
  font-weight: 600;
  color: #64748B;
}

/* Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 24px;
}

.stat-tile {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: #fff;
  border-radius: 12px;
  border: 1px solid #E2E8F0;
  transition: all 0.15s;
}

.stat-tile:hover {
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
}

.stat-icon-box {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stat-content {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.stat-label {
  font-size: 11px;
  font-weight: 600;
  color: #94A3B8;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.stat-value {
  font-size: 15px;
  font-weight: 800;
  color: #1E293B;
}

/* Section Card */
.section-card {
  background: #fff;
  border-radius: 20px;
  border: 1px solid #E2E8F0;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
  margin-bottom: 24px;
  overflow: hidden;
}

.section-header {
  padding: 20px 24px;
  border-bottom: 1px solid #F1F5F9;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.section-header.simple {
  align-items: center;
}

.section-header-left {
  display: flex;
  align-items: center;
  gap: 14px;
}

.section-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: #EBF5FF;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.section-title {
  font-size: 17px;
  font-weight: 800;
  color: #1E293B;
}

.section-sub {
  font-size: 13px;
  color: #64748B;
  margin-top: 1px;
}

.section-header-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 10px;
}

.section-badges {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.s-badge {
  padding: 5px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 700;
}

.s-badge.blue { background: #EBF5FF; color: #1565C0; }
.s-badge.green { background: #E8F5E9; color: #2E7D32; }
.s-badge.orange { background: #FFF3E0; color: #E65100; }

.section-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
  align-items: center;
}

.dashboard-search {
  min-width: 220px;
  max-width: 280px;
}

/* Company List */
.company-list {
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.company-card {
  border: 1px solid #E2E8F0;
  border-radius: 16px;
  padding: 18px 20px;
  background: #FAFCFF;
  transition: all 0.2s;
  border-left: 4px solid #1565C0;
}

.company-card:hover {
  box-shadow: 0 4px 16px rgba(0,0,0,0.06);
}

.company-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  cursor: pointer;
  user-select: none;
}

.company-header:focus-visible {
  outline: 2px solid #1565C0;
  outline-offset: 3px;
  border-radius: 8px;
}

.company-header-left {
  display: flex;
  align-items: center;
  gap: 14px;
}


.company-name {
  font-size: 17px;
  font-weight: 700;
  color: #1E293B;
}

.company-meta {
  font-size: 13px;
  color: #64748B;
  margin-top: 1px;
}

.company-header-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

/* Company Metrics */
.company-metrics {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 10px;
  margin-top: 16px;
}

.metric-pill {
  padding: 10px 12px;
  border-radius: 10px;
  background: #fff;
  border: 1px solid #E2E8F0;
}

.metric-label {
  display: block;
  font-size: 11px;
  font-weight: 600;
  color: #94A3B8;
  text-transform: uppercase;
  letter-spacing: 0.2px;
}

.metric-value {
  display: block;
  font-size: 15px;
  font-weight: 800;
  margin-top: 2px;
}

.metric-pill.payable .metric-value { color: #2E7D32; }
.metric-pill.paid .metric-value { color: #1B5E20; }
.metric-pill.pending .metric-value { color: #E65100; }
.metric-pill.deduction .metric-value { color: #C62828; }
.metric-pill.unallocated .metric-value { color: #1565C0; }
.metric-pill.meter-lost .metric-value { color: #BF360C; }
.metric-pill.loss .metric-value { color: #0D47A1; }
.metric-pill.settle .metric-value { color: #2E7D32; }
.metric-pill.deduction-collected .metric-value { color: #7B1FA2; }
.metric-pill.avg-rate .metric-value { color: #1565C0; }

/* Expanded Section */
.company-expanded {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #F1F5F9;
}

.progress-section {
  margin-bottom: 16px;
}

.progress-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.progress-block {
  padding: 12px 16px;
  background: #F8FAFC;
  border-radius: 12px;
}

.progress-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.progress-title {
  font-size: 13px;
  font-weight: 700;
  color: #475569;
}

.progress-pct {
  font-size: 13px;
  font-weight: 800;
  color: #1E293B;
}

.progress-track {
  height: 8px;
  border-radius: 999px;
  background: #E2E8F0;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: 999px;
  transition: width 0.5s ease;
}

.progress-fill.settlement.is-good { background: linear-gradient(90deg, #22C55E, #10B981); }
.progress-fill.settlement.is-mid { background: linear-gradient(90deg, #3B82F6, #14B8A6); }
.progress-fill.settlement.is-low { background: linear-gradient(90deg, #F59E0B, #F97316); }

.progress-fill.deduction.is-good { background: linear-gradient(90deg, #22C55E, #10B981); }
.progress-fill.deduction.is-mid { background: linear-gradient(90deg, #F97316, #EC4899); }
.progress-fill.deduction.is-low { background: linear-gradient(90deg, #F59E0B, #EF4444); }

.progress-detail {
  display: block;
  margin-top: 6px;
  font-size: 11px;
  color: #64748B;
}

/* Order Table */
.order-table-wrap {
  border: 1px solid #E2E8F0;
  border-radius: 12px;
  overflow: hidden;
}

.order-table-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: #F8FAFC;
  border-bottom: 1px solid #E2E8F0;
}

.order-table-title {
  font-size: 13px;
  font-weight: 700;
  color: #475569;
}

.order-table-summary {
  font-size: 12px;
  font-weight: 700;
  color: #1565C0;
}

.order-table-scroll {
  overflow-x: auto;
}

.order-table {
  width: 100%;
  min-width: 1040px;
  border-collapse: collapse;
}

.order-table th,
.order-table td {
  padding: 10px 12px;
  font-size: 13px;
  text-align: left;
  border-bottom: 1px solid #F1F5F9;
  vertical-align: middle;
}

.order-table thead th {
  font-size: 10.5px;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  color: #64748B;
  font-weight: 700;
  white-space: nowrap;
  background: #F8FAFC;
}

.order-table tbody tr {
  cursor: pointer;
  transition: background 0.15s;
}

.order-table tbody tr:hover {
  background: #F0F7FF;
}

.order-table tbody tr.highlight-row {
  animation: row-highlight 3s ease-out;
}

@keyframes row-highlight {
  0%, 20% { background: #DBEAFE; }
  100% { background: transparent; }
}

.order-name-cell {
  min-width: 190px;
}

.order-link {
  color: #1E293B;
  font-weight: 700;
  text-decoration: none;
  white-space: normal;
  overflow-wrap: anywhere;
}

.order-link:hover {
  color: #1565C0;
  text-decoration: underline;
}

.order-state {
  display: inline-flex;
  align-items: center;
  padding: 3px 10px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
}

.order-state.neutral { background: #F1F5F9; color: #64748B; }
.order-state.info { background: #EBF5FF; color: #1565C0; }
.order-state.good { background: #E8F5E9; color: #2E7D32; }

.payable-cell {
  font-weight: 700;
  color: #1E293B;
}

.order-table tfoot td {
  padding: 12px;
  font-size: 12px;
  font-weight: 700;
  color: #1E293B;
  background: #F8FAFC;
  border-top: 2px solid #E2E8F0;
}

.no-orders {
  padding: 24px;
  text-align: center;
  font-size: 13px;
  color: #94A3B8;
}

.empty-state {
  padding: 60px 24px;
  text-align: center;
  color: #94A3B8;
}

.empty-state p {
  margin-top: 8px;
  font-size: 14px;
}

/* Payment Dialog */
.pd {
  border: none;
  overflow: hidden;
  box-shadow: 0 25px 60px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05);
}

.pd-header {
  position: relative;
  padding: 24px 28px;
  overflow: hidden;
}

.pd-header-bg {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, #1565C0 0%, #0D47A1 40%, #1A237E 100%);
}

.pd-header-bg::after {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 80% 20%, rgba(255,255,255,0.1) 0%, transparent 50%),
              radial-gradient(circle at 20% 80%, rgba(255,255,255,0.05) 0%, transparent 40%);
}

.pd-header-content {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.pd-header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.pd-company-badge {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  background: rgba(255,255,255,0.2);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255,255,255,0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  font-weight: 800;
  color: #fff;
  flex-shrink: 0;
}

.pd-title {
  font-size: 20px;
  font-weight: 800;
  color: #fff;
  letter-spacing: -0.3px;
}

.pd-subtitle {
  font-size: 13px;
  color: rgba(255,255,255,0.7);
  margin-top: 2px;
}

.pd-header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pd-allocate-btn {
  background: rgba(255,255,255,0.95) !important;
  color: #1565C0 !important;
  font-weight: 700;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
}

.pd-close-btn {
  background: rgba(255,255,255,0.15) !important;
  border: 1px solid rgba(255,255,255,0.25);
}

/* Summary Stats */
.pd-summary {
  padding: 20px 28px;
  background: #F8FAFC;
  border-bottom: 1px solid #E2E8F0;
}

.pd-summary-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.pd-stat {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: #fff;
  border-radius: 12px;
  border: 1px solid #E2E8F0;
  transition: all 0.15s;
}

.pd-stat:hover {
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  transform: translateY(-1px);
}

.pd-stat-icon {
  width: 34px;
  height: 34px;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.pd-stat-icon.payable { background: #EBF5FF; color: #1565C0; }
.pd-stat-icon.paid { background: #E8F5E9; color: #2E7D32; }
.pd-stat-icon.pending { background: #FFF3E0; color: #E65100; }
.pd-stat-icon.deduction { background: #FCE4EC; color: #C62828; }
.pd-stat-icon.meter-lost { background: #FBE9E7; color: #BF360C; }
.pd-stat-icon.loss { background: #E3F2FD; color: #0D47A1; }

.pd-stat-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.pd-stat-label {
  font-size: 11px;
  font-weight: 600;
  color: #94A3B8;
  text-transform: uppercase;
  letter-spacing: 0.2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pd-stat-value {
  font-size: 16px;
  font-weight: 800;
  margin-top: 1px;
}

.pd-stat.payable .pd-stat-value { color: #1565C0; }
.pd-stat.paid .pd-stat-value { color: #2E7D32; }
.pd-stat.pending .pd-stat-value { color: #E65100; }
.pd-stat.deduction .pd-stat-value { color: #C62828; }
.pd-stat.meter-lost .pd-stat-value { color: #BF360C; }
.pd-stat.loss .pd-stat-value { color: #0D47A1; }

/* Filter Bar */
.pd-filter-bar {
  padding: 16px 28px;
  border-bottom: 1px solid #F1F5F9;
}

.pd-filter-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.pd-filter-field {
  max-width: 180px;
}

.pd-filter-btn {
  height: 40px;
  min-width: 90px;
  font-weight: 700;
}

/* Form Section */
.pd-form {
  padding: 20px 28px;
  background: linear-gradient(180deg, #FAFCFF 0%, #fff 100%);
  border-bottom: 1px solid #F1F5F9;
}

.pd-form-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.pd-form-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: #EBF5FF;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.pd-form-title {
  font-size: 14px;
  font-weight: 700;
  color: #1E293B;
}

.pd-form-hint {
  font-size: 12px;
  color: #94A3B8;
}

.pd-form-fields {
  display: flex;
  align-items: flex-end;
  gap: 12px;
  flex-wrap: wrap;
}

.pd-field {
  flex: 1;
  min-width: 130px;
}

.pd-field-wide {
  flex: 1.8;
}

.pd-form-actions {
  display: flex;
  gap: 8px;
}

.pd-save-btn {
  height: 40px;
  min-width: 100px;
  font-weight: 700;
  box-shadow: 0 4px 12px rgba(21,101,192,0.25);
}

.pd-cancel-btn {
  height: 40px;
}

.pd-amount-words {
  margin-top: 10px;
  font-size: 12px;
  color: #64748B;
  display: flex;
  align-items: center;
  padding: 6px 10px;
  background: #F8FAFC;
  border-radius: 6px;
  border: 1px solid #E2E8F0;
}

/* Payment Table */
.pd-table {
  padding: 0 28px 24px;
}

.pd-table-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 0 12px;
}

.pd-table-title {
  font-size: 14px;
  font-weight: 700;
  color: #1E293B;
  display: flex;
  align-items: center;
}

.pd-table-count {
  font-size: 12px;
  font-weight: 600;
  color: #94A3B8;
  padding: 3px 10px;
  background: #F1F5F9;
  border-radius: 20px;
}

:deep(.cp-action-wrap) {
  display: flex;
  align-items: center;
  gap: 6px;
}

:deep(.cp-edit-btn) {
  border: 1px solid #BFDBFE;
  background: #EFF6FF;
  color: #1565C0;
  border-radius: 6px;
  padding: 3px 10px;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s;
}

:deep(.cp-edit-btn:hover) {
  background: #DBEAFE;
}

:deep(.cp-delete-btn) {
  border: 1px solid #FECACA;
  background: #FEF2F2;
  color: #C62828;
  border-radius: 6px;
  padding: 3px 10px;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s;
}

:deep(.cp-delete-btn:hover) {
  background: #FEE2E2;
}

/* Responsive */
@media (max-width: 1200px) {
  .kpi-strip { grid-template-columns: repeat(2, 1fr); }
  .insight-grid { grid-template-columns: repeat(2, 1fr); }
  .stats-grid { grid-template-columns: repeat(2, 1fr); }
  .company-metrics { grid-template-columns: repeat(3, 1fr); }
}

@media (max-width: 768px) {
  .dashboard-page { padding: 16px 12px; }
  .kpi-strip { grid-template-columns: 1fr; }
  .insight-grid { grid-template-columns: 1fr; }
  .stats-grid { grid-template-columns: 1fr; }
  .company-metrics { grid-template-columns: repeat(2, 1fr); }
  .progress-row { grid-template-columns: 1fr; }

  .section-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .section-header-right {
    align-items: flex-start;
    width: 100%;
  }

  .section-badges,
  .section-actions {
    justify-content: flex-start;
  }

  .company-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .company-header-right {
    justify-content: flex-start;
    width: 100%;
  }

  .pd-summary-grid { grid-template-columns: repeat(2, 1fr); }
  .pd-header { padding: 18px 16px; }
  .pd-summary { padding: 16px; }
  .pd-filter-bar { padding: 14px 16px; }
  .pd-filter-row { flex-wrap: wrap; }
  .pd-filter-field { max-width: none; flex: 1; min-width: 120px; }
  .pd-form { padding: 16px; }
  .pd-form-fields { flex-direction: column; align-items: stretch; }
  .pd-field { min-width: auto; }
  .pd-table { padding: 0 16px 16px; }
}
</style>
