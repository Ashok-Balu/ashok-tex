<template>
  <div class="page-container">
    <div class="d-flex align-center justify-space-between mb-4">
      <div>
        <h2 class="mb-1">Debt Detail</h2>
        <div class="text-body-2 text-medium-emphasis">Trend analysis, payment history, and closure tracking.</div>
      </div>
      <v-btn variant="tonal" color="primary" to="/financial-intelligence">Back</v-btn>
    </div>

    <v-row>
      <v-col cols="12" md="4">
        <v-card rounded="xl" class="mb-3">
          <v-card-text>
            <div class="text-caption text-medium-emphasis">Debt Name</div>
            <div class="text-h6">{{ debt?.name || '-' }}</div>
            <div class="text-caption text-medium-emphasis mt-3">Type</div>
            <div>{{ debt?.debtType || '-' }}</div>
            <div class="text-caption text-medium-emphasis mt-3">Original Amount</div>
            <div>{{ money(debt?.originalAmount || 0) }}</div>
            <div class="text-caption text-medium-emphasis mt-3">Current Balance</div>
            <div>{{ money(debt?.currentBalance || 0) }}</div>
            <div class="text-caption text-medium-emphasis mt-3">Debt Reduction</div>
            <div>{{ Number(debt?.reductionPct || 0).toFixed(2) }}%</div>
            <div class="text-caption text-medium-emphasis mt-3">Expected Closure</div>
            <div>{{ dateLabel(detail?.expectedClosure) }}</div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="8">
        <v-card rounded="xl" class="mb-3">
          <v-card-title>Payment Trend</v-card-title>
          <v-card-text>
            <apexchart type="line" height="290" :options="trendOptions" :series="trendSeries" />
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-card rounded="xl">
      <v-card-title>Payment History</v-card-title>
      <v-card-text>
        <v-table density="compact">
          <thead>
            <tr>
              <th>Date</th>
              <th class="text-right">Amount Paid</th>
              <th class="text-right">Interest Paid</th>
              <th class="text-right">Principal Paid</th>
              <th>Type</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in detail?.paymentHistory || []" :key="row._id">
              <td>{{ row.date ? new Date(row.date).toLocaleDateString('en-IN') : '-' }}</td>
              <td class="text-right">{{ money(row.amountPaid || 0) }}</td>
              <td class="text-right">{{ money(row.interestPaid || 0) }}</td>
              <td class="text-right">{{ money(row.principalPaid || 0) }}</td>
              <td>
                <v-chip size="x-small" :color="row.isExtra ? 'success' : 'info'">{{ row.isExtra ? 'Extra' : 'Regular' }}</v-chip>
              </td>
            </tr>
          </tbody>
        </v-table>
      </v-card-text>
    </v-card>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import VueApexCharts from 'vue3-apexcharts'
import { useFinancialIntelligenceStore } from '@/stores/financialIntelligence'
import { formatIndianCurrency } from '@/utils/currency'

const apexchart = VueApexCharts
const route = useRoute()
const store = useFinancialIntelligenceStore()

const detail = computed(() => store.debtDetail)
const debt = computed(() => detail.value?.debt)

function money(value) {
  return formatIndianCurrency(value)
}

function dateLabel(value) {
  if (!value) return '-'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '-'
  return d.toLocaleDateString('en-IN', { year: 'numeric', month: 'short' })
}

const trendSeries = computed(() => [
  { name: 'Amount Paid', data: (detail.value?.charts?.trend || []).map(x => Number(x.amountPaid || 0)) },
  { name: 'Interest', data: (detail.value?.charts?.trend || []).map(x => Number(x.interestPaid || 0)) },
  { name: 'Principal', data: (detail.value?.charts?.trend || []).map(x => Number(x.principalPaid || 0)) },
])

const trendOptions = computed(() => ({
  chart: { toolbar: { show: false } },
  xaxis: { categories: (detail.value?.charts?.trend || []).map(x => `P${x.period}`) },
  stroke: { curve: 'smooth', width: 2 },
  legend: { position: 'bottom' },
}))

onMounted(() => {
  store.fetchDebtDetail(route.params.id)
})
</script>

<style scoped>
@media (max-width: 768px) {
  .page-container {
    padding: 12px !important;
  }
}

@media (max-width: 480px) {
  .page-container .d-flex.justify-space-between {
    flex-direction: column;
    align-items: flex-start !important;
    gap: 12px;
  }
}
</style>
