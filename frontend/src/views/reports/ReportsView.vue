<template>
  <div class="reports-root">

    <!-- ── Hero Header ─────────────────────────────── -->
    <div class="reports-hero mb-5">
      <div class="reports-hero__left">
        <div class="reports-hero__title">
          <v-icon icon="mdi-chart-bar" size="28" class="mr-2" style="opacity:.9" />
          Reports
        </div>
        <div class="reports-hero__sub">Collections · Production · Payment Analysis · Outstanding</div>
      </div>
      <v-btn variant="outlined" color="white" prepend-icon="mdi-printer" rounded="lg"
        class="print-btn" @click="window.print()">Print</v-btn>
    </div>

    <!-- ── Tabs ───────────────────────────────────── -->
    <div class="reports-tabs-wrap mb-4">
      <v-tabs v-model="tab" color="primary" density="compact">
        <v-tab value="monthly">
          <v-icon start icon="mdi-domain" size="16" />Company Collections
        </v-tab>
        <v-tab value="production">
          <v-icon start icon="mdi-factory" size="16" />Production Report
        </v-tab>
        <v-tab value="payments">
          <v-icon start icon="mdi-cash-multiple" size="16" />Payment Analysis
        </v-tab>
        <v-tab value="outstanding">
          <v-icon start icon="mdi-alert-circle-outline" size="16" />Outstanding
        </v-tab>
      </v-tabs>
    </div>

    <!-- ── Filters ────────────────────────────────── -->
    <div class="filter-bar mb-5">
      <v-text-field v-model="filterFrom" type="date" label="From" density="compact"
        variant="outlined" hide-details style="max-width:180px" />
      <v-text-field v-model="filterTo" type="date" label="To" density="compact"
        variant="outlined" hide-details style="max-width:180px" />
      <v-autocomplete v-if="tab==='monthly'" v-model="filterCompany"
        :items="companyStore.items" item-value="_id" item-title="name"
        label="Company (all)" density="compact" variant="outlined" clearable hide-details
        style="max-width:220px" />
      <v-btn color="primary" variant="flat" rounded="lg" :loading="loading"
        prepend-icon="mdi-chart-bar" @click="generate">Generate</v-btn>
    </div>

    <!-- ════════════════════════════════════════════ -->
    <!-- TAB 1 — COMPANY COLLECTIONS                 -->
    <!-- ════════════════════════════════════════════ -->
    <div v-if="tab==='monthly'" id="report-content">
      <!-- Stat cards -->
      <div class="stat-row mb-4">
        <div class="rpt-stat rpt-stat--green">
          <div class="rpt-stat__icon"><v-icon icon="mdi-cash-check" size="22" /></div>
          <div>
            <div class="rpt-stat__label">Total Received</div>
            <div class="rpt-stat__val">{{ fmt(monthlyTotals.total) }}</div>
          </div>
        </div>
        <div class="rpt-stat rpt-stat--red">
          <div class="rpt-stat__icon"><v-icon icon="mdi-minus-circle" size="22" /></div>
          <div>
            <div class="rpt-stat__label">Total Deductions</div>
            <div class="rpt-stat__val">{{ fmt(monthlyTotals.deductions) }}</div>
          </div>
        </div>
        <div class="rpt-stat rpt-stat--blue">
          <div class="rpt-stat__icon"><v-icon icon="mdi-calculator-variant" size="22" /></div>
          <div>
            <div class="rpt-stat__label">Net Payable</div>
            <div class="rpt-stat__val">{{ fmt(monthlyTotals.net) }}</div>
          </div>
        </div>
        <div class="rpt-stat rpt-stat--amber">
          <div class="rpt-stat__icon"><v-icon icon="mdi-domain" size="22" /></div>
          <div>
            <div class="rpt-stat__label">Companies</div>
            <div class="rpt-stat__val">{{ monthlyByCompany.length }}</div>
          </div>
        </div>
      </div>

      <!-- Table -->
      <div class="rpt-card" v-if="monthlyByCompany.length">
        <div class="rpt-card__head">
          <v-icon icon="mdi-domain" size="16" class="mr-2" />By Company
        </div>
        <div class="rpt-table-wrap">
          <table class="rpt-table">
            <thead>
              <tr>
                <th>#</th><th>Company</th><th>Orders</th>
                <th class="text-right">Received</th>
                <th class="text-right">Deduction</th>
                <th class="text-right">Net</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, i) in monthlyByCompany" :key="i">
                <td class="idx">{{ i+1 }}</td>
                <td class="font-weight-medium">{{ row.company }}</td>
                <td><span class="badge badge--blue">{{ row.orders }}</span></td>
                <td class="text-right c-green">{{ fmt(row.received) }}</td>
                <td class="text-right c-red">{{ fmt(row.deduction) }}</td>
                <td class="text-right font-weight-bold">{{ fmt((row.received||0)-(row.deduction||0)) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <div v-else-if="!loading" class="empty-state">
        <v-icon icon="mdi-chart-bar" size="48" color="primary" class="mb-2" />
        <div class="text-subtitle-1 font-weight-medium">No data for this period</div>
        <div class="text-caption text-medium-emphasis">Adjust the date range and click Generate</div>
      </div>
    </div>

    <!-- ════════════════════════════════════════════ -->
    <!-- TAB 2 — PRODUCTION                          -->
    <!-- ════════════════════════════════════════════ -->
    <div v-if="tab==='production'" id="report-content">
      <div class="stat-row mb-4">
        <div class="rpt-stat rpt-stat--blue">
          <div class="rpt-stat__icon"><v-icon icon="mdi-weather-sunny" size="22" /></div>
          <div>
            <div class="rpt-stat__label">Morning Shift</div>
            <div class="rpt-stat__val">{{ fmtN(productionTotals.morning) }} m</div>
          </div>
        </div>
        <div class="rpt-stat rpt-stat--indigo">
          <div class="rpt-stat__icon"><v-icon icon="mdi-weather-night" size="22" /></div>
          <div>
            <div class="rpt-stat__label">Night Shift</div>
            <div class="rpt-stat__val">{{ fmtN(productionTotals.night) }} m</div>
          </div>
        </div>
        <div class="rpt-stat rpt-stat--green">
          <div class="rpt-stat__icon"><v-icon icon="mdi-sigma" size="22" /></div>
          <div>
            <div class="rpt-stat__label">Total Production</div>
            <div class="rpt-stat__val">{{ fmtN(productionTotals.total) }} m</div>
          </div>
        </div>
        <div class="rpt-stat rpt-stat--amber">
          <div class="rpt-stat__icon"><v-icon icon="mdi-format-list-bulleted" size="22" /></div>
          <div>
            <div class="rpt-stat__label">Active Orders</div>
            <div class="rpt-stat__val">{{ productionData.length }}</div>
          </div>
        </div>
      </div>

      <div class="rpt-card" v-if="productionData.length">
        <div class="rpt-card__head">
          <v-icon icon="mdi-factory" size="16" class="mr-2" />Order-wise Production
        </div>
        <div class="rpt-table-wrap">
          <table class="rpt-table">
            <thead>
              <tr>
                <th>#</th><th>Order</th>
                <th class="text-right">Morning (m)</th>
                <th class="text-right">Night (m)</th>
                <th class="text-right">Total (m)</th>
                <th style="width:160px">Share</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, i) in productionData" :key="i">
                <td class="idx">{{ i+1 }}</td>
                <td class="font-weight-medium">{{ row.orderName }}</td>
                <td class="text-right">{{ fmtN(row.morning) }}</td>
                <td class="text-right">{{ fmtN(row.night) }}</td>
                <td class="text-right font-weight-bold c-blue">{{ fmtN(row.totalMeter) }}</td>
                <td>
                  <div class="prod-bar-wrap">
                    <div class="prod-bar" :style="{width: pct(row.totalMeter, productionTotals.total)+'%'}" />
                    <span class="prod-bar-pct">{{ pct(row.totalMeter, productionTotals.total) }}%</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <div v-else-if="!loading" class="empty-state">
        <v-icon icon="mdi-factory" size="48" color="primary" class="mb-2" />
        <div class="text-subtitle-1 font-weight-medium">No production data</div>
        <div class="text-caption text-medium-emphasis">Adjust the date range and click Generate</div>
      </div>
    </div>

    <!-- ════════════════════════════════════════════ -->
    <!-- TAB 3 — PAYMENT ANALYSIS                    -->
    <!-- ════════════════════════════════════════════ -->
    <div v-if="tab==='payments'" id="report-content">
      <div class="stat-row mb-4" v-if="monthlyByMode.length">
        <div v-for="m in monthlyByMode" :key="m.mode"
          class="rpt-stat"
          :class="m.mode==='cash'?'rpt-stat--green':m.mode==='cheque'?'rpt-stat--blue':'rpt-stat--amber'">
          <div class="rpt-stat__icon">
            <v-icon :icon="m.mode==='cash'?'mdi-cash':m.mode==='cheque'?'mdi-checkbook':'mdi-bank'" size="22" />
          </div>
          <div>
            <div class="rpt-stat__label" style="text-transform:capitalize">{{ m.mode }}</div>
            <div class="rpt-stat__val">{{ fmt(m.amount) }}</div>
            <div class="rpt-stat__sub">{{ m.count }} payments</div>
          </div>
        </div>
      </div>

      <!-- Mode breakdown bars -->
      <div class="rpt-card mb-4" v-if="monthlyByMode.length">
        <div class="rpt-card__head"><v-icon icon="mdi-cash-multiple" size="16" class="mr-2" />Payment Mode Breakdown</div>
        <div class="pa-4">
          <div v-for="m in monthlyByMode" :key="m.mode" class="mode-row mb-3">
            <div class="mode-row__label">
              <span style="text-transform:capitalize;font-weight:600">{{ m.mode }}</span>
              <span class="text-medium-emphasis text-caption ml-2">{{ m.count }} transactions</span>
            </div>
            <div class="mode-bar-track">
              <div class="mode-bar"
                :class="m.mode==='cash'?'mode-bar--green':m.mode==='cheque'?'mode-bar--blue':'mode-bar--amber'"
                :style="{width: pct(m.amount, modeTotals)+'%'}" />
            </div>
            <div class="mode-row__amt">{{ fmt(m.amount) }} &nbsp;<span class="text-caption text-medium-emphasis">({{ pct(m.amount, modeTotals) }}%)</span></div>
          </div>
        </div>
      </div>

      <div v-if="!loading && !monthlyByMode.length" class="empty-state">
        <v-icon icon="mdi-cash-multiple" size="48" color="primary" class="mb-2" />
        <div class="text-subtitle-1 font-weight-medium">No payment data</div>
        <div class="text-caption text-medium-emphasis">Adjust the date range and click Generate</div>
      </div>
    </div>

    <!-- ════════════════════════════════════════════ -->
    <!-- TAB 4 — OUTSTANDING BALANCES                -->
    <!-- ════════════════════════════════════════════ -->
    <div v-if="tab==='outstanding'" id="report-content">
      <div class="stat-row mb-4">
        <div class="rpt-stat rpt-stat--red">
          <div class="rpt-stat__icon"><v-icon icon="mdi-alert-circle" size="22" /></div>
          <div>
            <div class="rpt-stat__label">Total Outstanding</div>
            <div class="rpt-stat__val">{{ fmt(outstandingTotals.balance) }}</div>
          </div>
        </div>
        <div class="rpt-stat rpt-stat--blue">
          <div class="rpt-stat__icon"><v-icon icon="mdi-cash-check" size="22" /></div>
          <div>
            <div class="rpt-stat__label">Total Payable</div>
            <div class="rpt-stat__val">{{ fmt(outstandingTotals.payable) }}</div>
          </div>
        </div>
        <div class="rpt-stat rpt-stat--green">
          <div class="rpt-stat__icon"><v-icon icon="mdi-check-circle" size="22" /></div>
          <div>
            <div class="rpt-stat__label">Paid So Far</div>
            <div class="rpt-stat__val">{{ fmt(outstandingTotals.paid) }}</div>
          </div>
        </div>
        <div class="rpt-stat rpt-stat--amber">
          <div class="rpt-stat__icon"><v-icon icon="mdi-domain" size="22" /></div>
          <div>
            <div class="rpt-stat__label">Companies with Dues</div>
            <div class="rpt-stat__val">{{ outstandingData.filter(r=>r.balance>0).length }}</div>
          </div>
        </div>
      </div>

      <div class="rpt-card" v-if="outstandingData.length">
        <div class="rpt-card__head"><v-icon icon="mdi-alert-circle-outline" size="16" class="mr-2" />Company-wise Outstanding</div>
        <div class="rpt-table-wrap">
          <table class="rpt-table">
            <thead>
              <tr>
                <th>#</th><th>Company</th>
                <th class="text-right">Total Payable</th>
                <th class="text-right">Paid</th>
                <th class="text-right">Outstanding</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, i) in outstandingData" :key="i">
                <td class="idx">{{ i+1 }}</td>
                <td class="font-weight-medium">{{ row.company }}</td>
                <td class="text-right">{{ fmt(row.payable) }}</td>
                <td class="text-right c-green">{{ fmt(row.paid) }}</td>
                <td class="text-right font-weight-bold" :class="row.balance>0?'c-red':'c-green'">{{ fmt(row.balance) }}</td>
                <td>
                  <span class="os-badge" :class="row.balance<=0?'os-badge--paid':row.paid>0?'os-badge--partial':'os-badge--pending'">
                    {{ row.balance<=0?'Cleared':row.paid>0?'Partial':'Pending' }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <div v-else-if="!loading" class="empty-state">
        <v-icon icon="mdi-check-circle" size="48" color="success" class="mb-2" />
        <div class="text-subtitle-1 font-weight-medium">No outstanding balances</div>
        <div class="text-caption text-medium-emphasis">All payments are up to date</div>
      </div>
    </div>

    <!-- loading overlay -->
    <div v-if="loading" class="d-flex justify-center align-center py-12">
      <v-progress-circular indeterminate color="primary" size="40" />
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useCompanyStore } from '@/stores/index'
import { useUtils } from '@/composables/useUtils'
import api from '@/plugins/axios'

const { fmt, fmtN, fmtDate, today, monthStart, pct } = useUtils()
const companyStore = useCompanyStore()

const tab         = ref('monthly')
const loading     = ref(false)
const filterFrom  = ref(monthStart())
const filterTo    = ref(today())
const filterCompany = ref(null)

const monthlyByCompany = ref([])
const monthlyByMode    = ref([])
const productionData   = ref([])
const outstandingData  = ref([])

// ── Computed totals ───────────────────────────────────
const monthlyTotals = computed(() => ({
  total:      monthlyByCompany.value.reduce((s, r) => s + (r.received  || 0), 0),
  deductions: monthlyByCompany.value.reduce((s, r) => s + (r.deduction || 0), 0),
  net:        monthlyByCompany.value.reduce((s, r) => s + ((r.received||0) - (r.deduction||0)), 0),
}))

const productionTotals = computed(() => ({
  morning: productionData.value.reduce((s, r) => s + (r.morning    || 0), 0),
  night:   productionData.value.reduce((s, r) => s + (r.night      || 0), 0),
  total:   productionData.value.reduce((s, r) => s + (r.totalMeter || 0), 0),
}))

const modeTotals = computed(() =>
  monthlyByMode.value.reduce((s, m) => s + (m.amount || 0), 0)
)

const outstandingTotals = computed(() => ({
  payable: outstandingData.value.reduce((s, r) => s + (r.payable || 0), 0),
  paid:    outstandingData.value.reduce((s, r) => s + (r.paid    || 0), 0),
  balance: outstandingData.value.reduce((s, r) => s + (r.balance || 0), 0),
}))

// ── API calls ─────────────────────────────────────────
async function generate() {
  loading.value = true
  const p = { from: filterFrom.value, to: filterTo.value }
  try {
    if (tab.value === 'monthly') {
      if (filterCompany.value) p.companyId = filterCompany.value
      const [c, m] = await Promise.all([
        api.get('/reports/monthly-payment-by-company', { params: p }),
        api.get('/reports/monthly-payment-by-mode',    { params: p }),
      ])
      monthlyByCompany.value = c.data
      monthlyByMode.value    = m.data
    } else if (tab.value === 'production') {
      const r = await api.get('/reports/production', { params: p })
      productionData.value = r.data
    } else if (tab.value === 'payments') {
      const m = await api.get('/reports/monthly-payment-by-mode', { params: p })
      monthlyByMode.value = m.data
    } else if (tab.value === 'outstanding') {
      await loadOutstanding(p)
    }
  } catch (e) { console.error(e) }
  finally { loading.value = false }
}

async function loadOutstanding(p) {
  const companies = companyStore.items
  if (!companies.length) await companyStore.fetch()
  const rows = []
  await Promise.all(
    companyStore.items.map(async co => {
      try {
        const r = await api.get('/reports/company-order-statement', {
          params: { companyId: co._id, from: p.from, to: p.to }
        })
        const d = r.data
        const payable = (d.rows || []).reduce((s, row) => s + (row.payableAmount || 0), 0) + (d.previousBalance || 0)
        // fetch payments in range for this company
        const payRes = await api.get('/reports/monthly-payment-by-company', { params: p })
        const payRow = (payRes.data || []).find(x => x.company === co.name)
        const paid = payRow?.received || 0
        rows.push({ company: co.name, payable, paid, balance: Math.max(0, payable - paid) })
      } catch { /* skip */ }
    })
  )
  outstandingData.value = rows.filter(r => r.payable > 0).sort((a, b) => b.balance - a.balance)
}

watch(tab, () => generate())
onMounted(() => { companyStore.fetch(); generate() })
</script>

<style scoped>
.reports-root { padding: 16px 20px; background: #f4f6fb; min-height: 100vh; }

/* Hero */
.reports-hero {
  background: linear-gradient(135deg, #1565C0 0%, #0D47A1 100%);
  border-radius: 16px; padding: 22px 28px;
  display: flex; align-items: center; justify-content: space-between; color: #fff;
}
.reports-hero__title { font-size: 22px; font-weight: 700; display: flex; align-items: center; }
.reports-hero__sub { font-size: 13px; opacity: .75; margin-top: 2px; }
.print-btn { border-color: rgba(255,255,255,.5) !important; color: #fff !important; }

/* Tabs */
.reports-tabs-wrap {
  background: #fff; border-radius: 14px;
  box-shadow: 0 1px 4px rgba(0,0,0,.06); padding: 4px 8px;
}

/* Filter bar */
.filter-bar { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }

/* Stat cards */
.stat-row { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 14px; }
.rpt-stat {
  background: #fff; border-radius: 14px; padding: 16px;
  display: flex; align-items: center; gap: 14px;
  box-shadow: 0 1px 4px rgba(0,0,0,.06);
  border-left: 4px solid transparent;
}
.rpt-stat__icon {
  width: 44px; height: 44px; border-radius: 12px;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.rpt-stat__label { font-size: 11px; color: #7a8499; text-transform: uppercase; letter-spacing: .5px; }
.rpt-stat__val   { font-size: 20px; font-weight: 700; line-height: 1.2; }
.rpt-stat__sub   { font-size: 11px; color: #7a8499; }

.rpt-stat--green  { border-left-color: #43a047; }
.rpt-stat--green  .rpt-stat__icon { background: #e8f5e9; color: #2e7d32; }
.rpt-stat--green  .rpt-stat__val  { color: #2e7d32; }

.rpt-stat--red    { border-left-color: #e53935; }
.rpt-stat--red    .rpt-stat__icon { background: #ffebee; color: #c62828; }
.rpt-stat--red    .rpt-stat__val  { color: #c62828; }

.rpt-stat--blue   { border-left-color: #1e88e5; }
.rpt-stat--blue   .rpt-stat__icon { background: #e3f2fd; color: #1565c0; }
.rpt-stat--blue   .rpt-stat__val  { color: #1565c0; }

.rpt-stat--indigo { border-left-color: #5c6bc0; }
.rpt-stat--indigo .rpt-stat__icon { background: #e8eaf6; color: #3949ab; }
.rpt-stat--indigo .rpt-stat__val  { color: #3949ab; }

.rpt-stat--amber  { border-left-color: #fb8c00; }
.rpt-stat--amber  .rpt-stat__icon { background: #fff3e0; color: #e65100; }
.rpt-stat--amber  .rpt-stat__val  { color: #e65100; }

/* Report card */
.rpt-card {
  background: #fff; border-radius: 14px;
  box-shadow: 0 1px 4px rgba(0,0,0,.06); overflow: hidden;
}
.rpt-card__head {
  padding: 12px 18px; font-size: 12px; font-weight: 700;
  text-transform: uppercase; letter-spacing: .6px; color: #1565c0;
  border-bottom: 1px solid #eef2f7;
  display: flex; align-items: center;
}
.rpt-table-wrap { overflow-x: auto; }
.rpt-table { width: 100%; min-width: 920px; border-collapse: collapse; font-size: 13.5px; }
.rpt-table thead tr { background: #f0f4ff; }
.rpt-table th {
  padding: 10px 14px; text-align: left; font-size: 11px;
  font-weight: 700; color: #5a6a85; text-transform: uppercase; letter-spacing: .5px;
  border-bottom: 2px solid #e8edf5;
}
.rpt-table td { padding: 10px 14px; border-bottom: 1px solid #f0f4f8; }
.rpt-table tbody tr:last-child td { border-bottom: none; }
.rpt-table tbody tr:hover { background: #f7f9ff; }
.idx { color: #aab0be; font-size: 12px; width: 36px; }
.c-green { color: #2e7d32; }
.c-red   { color: #c62828; }
.c-blue  { color: #1565c0; }

/* Badge */
.badge { padding: 2px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; }
.badge--blue { background: #e3f2fd; color: #1565c0; }

/* Production progress bar */
.prod-bar-wrap { display: flex; align-items: center; gap: 6px; }
.prod-bar { height: 8px; border-radius: 4px; background: linear-gradient(90deg,#1e88e5,#42a5f5); min-width: 4px; transition: width .4s; }
.prod-bar-pct { font-size: 11px; color: #7a8499; white-space: nowrap; }

/* Payment mode bars */
.mode-row { }
.mode-row__label { font-size: 13px; margin-bottom: 4px; }
.mode-bar-track { height: 10px; background: #eef2f7; border-radius: 5px; overflow: hidden; margin-bottom: 4px; }
.mode-bar { height: 100%; border-radius: 5px; transition: width .5s; }
.mode-bar--green  { background: linear-gradient(90deg,#43a047,#66bb6a); }
.mode-bar--blue   { background: linear-gradient(90deg,#1e88e5,#42a5f5); }
.mode-bar--amber  { background: linear-gradient(90deg,#fb8c00,#ffa726); }
.mode-row__amt { font-size: 13px; font-weight: 600; }

/* Outstanding status badges */
.os-badge { padding: 3px 12px; border-radius: 20px; font-size: 11px; font-weight: 700; }
.os-badge--paid    { background: #e8f5e9; color: #2e7d32; }
.os-badge--partial { background: #fff3e0; color: #e65100; }
.os-badge--pending { background: #ffebee; color: #c62828; }

/* Empty state */
.empty-state { text-align: center; padding: 48px 20px; color: #5a6a85; }

@media print {
  .reports-hero, .reports-tabs-wrap, .filter-bar { display: none !important; }
}

@media (max-width: 768px) {
  .reports-root { padding: 12px; }

  .reports-hero {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
    padding: 18px 16px;
    border-radius: 14px;
  }

  .reports-hero__title { font-size: 18px; }

  .print-btn { width: 100%; }

  .filter-bar {
    flex-direction: column;
    align-items: stretch;
  }

  .filter-bar .v-text-field,
  .filter-bar .v-autocomplete {
    max-width: none !important;
    width: 100% !important;
  }

  .stat-row {
    grid-template-columns: 1fr 1fr;
  }

  .rpt-stat { padding: 12px; }
  .rpt-stat__val { font-size: 16px; }
  .rpt-stat__icon { width: 36px; height: 36px; }

  .rpt-table { min-width: 600px; }
}

@media (max-width: 480px) {
  .stat-row {
    grid-template-columns: 1fr;
  }

  .reports-tabs-wrap {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  .reports-hero__title { font-size: 16px; }
  .reports-hero__sub { font-size: 11px; }
}
</style>

