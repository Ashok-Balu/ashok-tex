<template>
  <div class="generator">
    <v-card class="mb-4" elevation="2">
      <v-card-text class="pb-2">
        <v-row dense>
          <v-col cols="6" md="2">
            <v-select
              v-model="selectedMonth"
              :items="months"
              label="Month"
              variant="outlined"
              density="compact"
              item-title="label"
              item-value="value"
            />
          </v-col>
          <v-col cols="6" md="2">
            <v-select
              v-model="selectedYear"
              :items="years"
              label="Year"
              variant="outlined"
              density="compact"
            />
          </v-col>
          <v-col cols="12" md="2">
            <v-text-field
              v-model="periodStart"
              type="date"
              label="From Date"
              variant="outlined"
              density="compact"
            />
          </v-col>
          <v-col cols="12" md="2">
            <v-text-field
              v-model="periodEnd"
              type="date"
              label="To Date"
              variant="outlined"
              density="compact"
            />
          </v-col>
          <v-col cols="12" md="4">
            <v-text-field
              v-model="runTitle"
              label="Run Title (optional)"
              placeholder="Week 1 / 01-May to 07-May"
              variant="outlined"
              density="compact"
            />
          </v-col>
        </v-row>
        <v-row dense class="mt-1">
          <v-col cols="12" md="8" class="d-flex align-center flex-wrap gap-2">
            <v-chip v-if="monthSummary" color="primary" variant="tonal">
              {{ monthSummary.runCount }} run(s) this month
            </v-chip>
            <v-chip v-if="monthSummary" color="success" variant="tonal">
              Gross: Rs.{{ fmt(monthSummary.totalGross) }}
            </v-chip>
            <v-chip v-if="monthSummary" color="error" variant="tonal">
              Deduction: Rs.{{ fmt(monthSummary.totalDeduction) }}
            </v-chip>
            <v-chip v-if="monthSummary" :color="monthSummary.totalOutstanding > 0 ? 'warning' : 'success'" variant="tonal">
              Pending: Rs.{{ fmt(monthSummary.totalOutstanding) }}
            </v-chip>
          </v-col>
          <v-col cols="12" md="4" class="text-caption text-medium-emphasis d-flex align-center justify-end">
            Different wages can be entered for each employee in each period.
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <v-alert v-if="genError" type="error" class="mb-3">{{ genError }}</v-alert>

    <v-row dense class="mb-3">
      <v-col v-for="emp in store.employees" :key="emp._id || emp.employeeId || emp.name" cols="12" sm="6" lg="4">
        <v-card
          :class="['emp-card', { 'emp-card--selected': selected[emp._id] }]"
          elevation="2"
          @click="toggleSelect(emp._id)"
        >
          <div class="emp-card__header">
            <div>
              <div class="font-weight-bold">{{ emp.name }}</div>
              <div class="text-caption text-medium-emphasis">Default deduction {{ emp.deductionPercentage }}%</div>
            </div>
            <v-checkbox
              :model-value="selected[emp._id]"
              color="primary"
              hide-details
              @click.stop="toggleSelect(emp._id)"
            />
          </div>

          <v-expand-transition>
            <div v-if="selected[emp._id]" class="emp-card__fields">
              <v-divider class="mb-3" />
              <v-row dense>
                <v-col cols="4">
                  <v-text-field
                    v-model.number="days[emp._id]"
                    type="number"
                    min="0"
                    label="Days"
                    variant="outlined"
                    density="compact"
                    hide-details
                    @click.stop
                  />
                </v-col>
                <v-col cols="4">
                  <v-text-field
                    v-model.number="wage[emp._id]"
                    type="number"
                    min="0"
                    label="Wage / Day"
                    variant="outlined"
                    density="compact"
                    hide-details
                    @click.stop
                  />
                </v-col>
                <v-col cols="4">
                  <v-text-field
                    v-model.number="deductionPct[emp._id]"
                    type="number"
                    min="0"
                    max="100"
                    label="Deduction %"
                    variant="outlined"
                    density="compact"
                    hide-details
                    @click.stop
                  />
                </v-col>
              </v-row>
              <v-text-field
                v-model="notes[emp._id]"
                label="Notes for this period"
                variant="outlined"
                density="compact"
                hide-details
                class="mt-3"
                @click.stop
              />
              <div class="emp-card__preview mt-3">
                <div class="preview-row">
                  <span>Gross</span>
                  <span>Rs.{{ fmt(gross(emp)) }}</span>
                </div>
                <div class="preview-row text-red">
                  <span>Deduction</span>
                  <span>Rs.{{ fmt(deduction(emp)) }}</span>
                </div>
                <div class="preview-row preview-net">
                  <span>Net Salary</span>
                  <span>Rs.{{ fmt(net(emp)) }}</span>
                </div>
              </div>
            </div>
          </v-expand-transition>
        </v-card>
      </v-col>
    </v-row>

    <div class="d-flex align-center gap-3 mb-6">
      <v-btn color="primary" variant="tonal" size="small" text="Select All" @click="selectAll" />
      <v-btn color="secondary" variant="tonal" size="small" text="Clear" @click="clearAll" />
      <v-spacer />
      <v-btn
        color="success"
        size="large"
        prepend-icon="mdi-play-circle"
        text="Generate Period Salary"
        :loading="store.loading"
        :disabled="!hasSelected"
        @click="generateSalary"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { usePayrollStore } from '@/stores/payroll'

const store = usePayrollStore()
const genError = ref('')

const MONTHS = [
  { label: 'January', value: 1 }, { label: 'February', value: 2 },
  { label: 'March', value: 3 }, { label: 'April', value: 4 },
  { label: 'May', value: 5 }, { label: 'June', value: 6 },
  { label: 'July', value: 7 }, { label: 'August', value: 8 },
  { label: 'September', value: 9 }, { label: 'October', value: 10 },
  { label: 'November', value: 11 }, { label: 'December', value: 12 }
]

const months = MONTHS
const selectedMonth = ref(new Date().getMonth() + 1)
const selectedYear = ref(new Date().getFullYear())
const years = computed(() => {
  const y = new Date().getFullYear()
  return [y - 1, y, y + 1]
})

const selected = reactive({})
const days = reactive({})
const wage = reactive({})
const deductionPct = reactive({})
const notes = reactive({})

const periodStart = ref(defaultDateForMonth(selectedYear.value, selectedMonth.value, 1))
const periodEnd = ref(defaultDateForMonth(selectedYear.value, selectedMonth.value, 7))
const runTitle = ref('')
const monthSummary = ref(null)

function defaultDateForMonth(year, month, day) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

watch([selectedMonth, selectedYear], ([month, year]) => {
  periodStart.value = defaultDateForMonth(year, month, 1)
  periodEnd.value = defaultDateForMonth(year, month, Math.min(7, new Date(year, month, 0).getDate()))
  fetchSummary()
}, { immediate: true })

watch(() => store.employees, (list) => {
  ;(list || []).forEach(emp => {
    if (deductionPct[emp._id] == null) deductionPct[emp._id] = Number(emp.deductionPercentage) || 0
    if (wage[emp._id] == null) wage[emp._id] = Number(emp.dailyWage) || 0
    if (days[emp._id] == null) days[emp._id] = 0
    if (notes[emp._id] == null) notes[emp._id] = ''
  })
}, { immediate: true, deep: true })

const fmt = (num) => {
  const n = Number(num)
  return new Intl.NumberFormat('en-IN').format(Number.isFinite(n) ? Math.round(n) : 0)
}

const gross = (emp) => (Number(days[emp._id]) || 0) * (Number(wage[emp._id]) || 0)
const deduction = (emp) => Math.round((gross(emp) * (Number(deductionPct[emp._id]) || 0)) / 100)
const net = (emp) => gross(emp) - deduction(emp)

const hasSelected = computed(() => Object.values(selected).some(Boolean))

const selectAll = () => store.employees.forEach(e => { selected[e._id] = true })
const clearAll = () => store.employees.forEach(e => { selected[e._id] = false })
const toggleSelect = (id) => { selected[id] = !selected[id] }

const fetchSummary = async () => {
  const data = await store.fetchPayrollHistory(selectedMonth.value, selectedYear.value)
  await store.fetchPending()
  const runs = Array.isArray(data) ? data : (data ? [data] : [])
  if (!runs.length) {
    monthSummary.value = null
    return
  }
  const employeeMap = {}
  runs.forEach(run => {
    ;(run.employees || []).forEach((emp, index) => {
      const id = emp.employeeId?.toString?.() || emp.employeeId || `summary-${run._id}-${index}`
      if (!id) return
      if (!employeeMap[id]) employeeMap[id] = { gross: 0, deduction: 0, currentPending: 0 }
      employeeMap[id].gross += Number(emp.totalWages) || 0
      employeeMap[id].deduction += Number(emp.deductionAmount) || 0
      employeeMap[id].currentPending += Number(emp.amountPending) || 0
    })
  })
  const olderPending = (store.pending || []).reduce((sum, item) => {
    const beforeCurrent =
      Number(item.year) < Number(selectedYear.value) ||
      (Number(item.year) === Number(selectedYear.value) && Number(item.month) < Number(selectedMonth.value))
    return beforeCurrent ? sum + (Number(item.amountPending) || 0) : sum
  }, 0)

  monthSummary.value = {
    runCount: runs.length,
    totalGross: Object.values(employeeMap).reduce((sum, item) => sum + item.gross, 0),
    totalDeduction: Object.values(employeeMap).reduce((sum, item) => sum + item.deduction, 0),
    totalOutstanding: Object.values(employeeMap).reduce((sum, item) => sum + item.currentPending, 0) + olderPending,
  }
}

const generateSalary = async () => {
  genError.value = ''
  if (!periodStart.value || !periodEnd.value) {
    genError.value = 'Please choose from date and to date.'
    return
  }

  const start = new Date(periodStart.value)
  const end = new Date(periodEnd.value)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    genError.value = 'Please enter valid period dates.'
    return
  }
  if (start > end) {
    genError.value = 'From date cannot be after to date.'
    return
  }
  if ((start.getMonth() + 1) !== Number(selectedMonth.value) || start.getFullYear() !== Number(selectedYear.value) ||
      (end.getMonth() + 1) !== Number(selectedMonth.value) || end.getFullYear() !== Number(selectedYear.value)) {
    genError.value = 'The selected period must stay inside the chosen month.'
    return
  }

  const employeeEntries = store.employees
    .filter(e => selected[e._id])
    .map(e => ({
      employeeId: e._id,
      daysWorked: Number(days[e._id]) || 0,
      wagePerDay: Number(wage[e._id]) || 0,
      deductionPercentage: Number(deductionPct[e._id]) || 0,
      notes: notes[e._id] || '',
    }))

  const payroll = await store.generatePayroll(
    selectedMonth.value,
    selectedYear.value,
    periodStart.value,
    periodEnd.value,
    employeeEntries,
    runTitle.value
  )

  if (payroll) {
    await store.fetchPending()
    await fetchSummary()
    window.dispatchEvent(new CustomEvent('tab-change', { detail: 'history' }))
  } else {
    genError.value = store.error || 'Failed to generate salary'
  }
}
</script>

<style scoped>
.emp-card {
  cursor: pointer;
  border: 2px solid transparent;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.emp-card--selected {
  border-color: #1976d2;
  box-shadow: 0 0 0 3px rgba(25, 118, 210, 0.15) !important;
}

.emp-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 12px 8px;
}

.emp-card__fields {
  padding: 0 12px 12px;
}

.emp-card__preview {
  background: #f5f7fa;
  border-radius: 8px;
  padding: 10px 12px;
}

.preview-row {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  margin-bottom: 4px;
}

.preview-net {
  font-weight: 700;
  font-size: 14px;
  color: #2e7d32;
  border-top: 1px solid #ddd;
  padding-top: 6px;
  margin-top: 4px;
}

.gap-2 {
  gap: 8px;
}

.gap-3 {
  gap: 12px;
}
</style>
