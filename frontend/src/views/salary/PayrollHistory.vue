<template>
  <div class="history-root">
    <!-- Filter Bar -->
    <div class="filter-bar mb-4">
      <div class="d-flex align-center gap-3 flex-wrap">
        <v-select
          v-model="selectedMonth"
          :items="months"
          label="Month"
          variant="outlined"
          density="compact"
          item-title="label"
          item-value="value"
          hide-details
          bg-color="white"
          rounded="lg"
          style="min-width:140px"
          @update:modelValue="onMonthYearChange"
        />
        <v-select
          v-model="selectedYear"
          :items="years"
          label="Year"
          variant="outlined"
          density="compact"
          hide-details
          bg-color="white"
          rounded="lg"
          style="min-width:95px"
          @update:modelValue="onMonthYearChange"
        />
        <div class="d-flex gap-2 flex-wrap ml-2" v-if="runs.length">
          <div class="summary-chip summary-chip--blue">{{ runs.length }} Run{{ runs.length !== 1 ? 's' : '' }}</div>
          <div class="summary-chip summary-chip--green">Gross: Rs.{{ fmt(grandGross) }}</div>
          <div class="summary-chip summary-chip--red">Deduction: Rs.{{ fmt(grandDeduction) }}</div>
          <div class="summary-chip summary-chip--blue">Returned: Rs.{{ fmt(grandDeductionReturned) }}</div>
          <div class="summary-chip" :class="grandOutstanding > 0 ? 'summary-chip--red' : 'summary-chip--green'">
            Pending: Rs.{{ fmt(grandOutstanding) }}
          </div>
        </div>
      </div>
    </div>

    <v-progress-linear v-if="loading" indeterminate color="primary" rounded class="mb-4" />

    <div v-if="!loading && !runs.length" class="empty-state">
      <div class="empty-icon-wrap mb-3">
        <v-icon icon="mdi-calendar-blank-outline" size="40" color="primary" />
      </div>
      <div class="text-subtitle-1 font-weight-medium mb-1">No payroll records</div>
      <div class="text-caption text-medium-emphasis">for {{ monthName }} {{ selectedYear }}</div>
    </div>

    <div v-if="!loading && runs.length" class="history-card mb-4">
      <div class="history-card__title">
        <v-icon icon="mdi-account-group" size="18" class="mr-2" color="primary" />
        Employee Summary — {{ monthName }} {{ selectedYear }}
      </div>
      <v-divider />

      <div v-for="row in employeeSummary" :key="row.rowKey" class="emp-group">
        <div class="emp-summary-row" @click="toggleExpand(row.rowKey)">
          <div class="emp-summary-left">
            <div class="tex-av-3d" style="width:38px;height:38px;font-size:14px;margin-right:10px" :style="{ backgroundColor: nameColor(row.name) }">{{ nameInitials(row.name) }}</div>
            <div>
              <div class="emp-name">{{ row.name }}</div>
              <div class="emp-meta">
                {{ row.entries.length }} period{{ row.entries.length !== 1 ? 's' : '' }} · {{ row.totalDays }} days worked
              </div>
            </div>
          </div>

          <div class="emp-summary-stats">
            <div class="emp-stat">
              <div class="emp-stat-label">Gross</div>
              <div class="emp-stat-val">Rs.{{ fmt(row.totalGross) }}</div>
            </div>
            <div class="emp-stat">
              <div class="emp-stat-label">Deduction</div>
              <div class="emp-stat-val emp-stat-val--red">Rs.{{ fmt(row.totalDeduction) }}</div>
            </div>
            <div class="emp-stat">
              <div class="emp-stat-label">Returned</div>
              <div class="emp-stat-val emp-stat-val--blue">Rs.{{ fmt(row.totalDeductionReturned) }}</div>
            </div>
            <div class="emp-stat">
              <div class="emp-stat-label">Carry Fwd</div>
              <div class="emp-stat-val" :class="row.carryForwardPending > 0 ? 'emp-stat-val--red' : 'emp-stat-val--green'">
                {{ row.carryForwardPending > 0 ? `Rs.${fmt(row.carryForwardPending)}` : 'Nil' }}
              </div>
            </div>
            <div class="emp-stat">
              <div class="emp-stat-label">Paid</div>
              <div class="emp-stat-val emp-stat-val--blue">Rs.{{ fmt(row.totalSalaryPaid) }}</div>
            </div>
            <div class="emp-stat">
              <div class="emp-stat-label">Pending</div>
              <div class="emp-stat-val font-weight-bold" :class="row.totalOutstanding > 0 ? 'emp-stat-val--red' : 'emp-stat-val--green'">
                {{ row.totalOutstanding > 0 ? `Rs.${fmt(row.totalOutstanding)}` : 'Paid' }}
              </div>
            </div>
          </div>

          <div class="emp-summary-actions" @click.stop>
            <span class="hist-status-badge" :class="`hist-status--${row.status}`">{{ row.status }}</span>
            <v-btn
              v-if="row.employeeId && (row.totalOutstanding > 0 || row.totalDeduction > row.totalDeductionReturned)"
              size="small" color="primary" variant="tonal" rounded="lg"
              prepend-icon="mdi-cash" text="Pay"
              @click="openPayFromSummary(row)"
            />
            <v-btn size="small" color="teal" variant="tonal" rounded="lg"
              icon="mdi-file-pdf-box" title="Download Payslip"
              @click="downloadPdf(row)"
            />
            <v-btn
              size="small" color="green" variant="tonal" rounded="lg"
              icon="mdi-whatsapp" title="Send via WhatsApp"
              :loading="sendingWhatsappId === row.rowKey"
              :disabled="!row.employeeId"
              @click="shareWhatsApp(row)"
            />
            <v-btn
              size="small" variant="text" color="primary"
              :icon="expandedRows[row.rowKey] ? 'mdi-chevron-up' : 'mdi-chevron-down'"
              @click="toggleExpand(row.rowKey)"
            />
          </div>
        </div>

        <div v-if="expandedRows[row.rowKey]" class="emp-detail">
          <div class="detail-section">
            <div class="detail-section-title">
              <v-icon icon="mdi-calendar-range" size="14" class="mr-1" />
              Period Salary Runs — {{ monthName }} {{ selectedYear }}
            </div>
            <div class="detail-meta">
              Carry-forward pending before this month: <strong>Rs.{{ fmt(row.carryForwardPending) }}</strong>
            </div>
            <div class="runs-table-wrap">
              <table class="runs-table">
                <thead>
                  <tr>
                    <th>From</th><th>To</th><th>Days</th><th>Wage/Day</th>
                    <th>Gross</th><th>Deduction</th><th>Net</th>
                    <th>Returned</th><th>Pending</th><th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="entry in row.entries" :key="entry.entryKey">
                    <td class="date-col">{{ fmtShortDate(entry.periodStart) }}</td>
                    <td class="date-col">{{ fmtShortDate(entry.periodEnd) }}</td>
                    <td>{{ entry.daysWorked }}</td>
                    <td>Rs.{{ fmt(entry.dailyWage) }}</td>
                    <td>Rs.{{ fmt(entry.totalWages) }}</td>
                    <td class="c-red">Rs.{{ fmt(entry.deductionAmount) }}</td>
                    <td class="c-green font-weight-bold">Rs.{{ fmt(entry.netSalary) }}</td>
                    <td class="c-blue">Rs.{{ fmt(entry.deductionPaidBack) }}</td>
                    <td class="c-red">Rs.{{ fmt(entry.amountPending) }}</td>
                    <td>
                      <span :class="['run-badge', `run-badge--${entry.paymentStatus}`]">
                        {{ entry.paymentStatus }}
                      </span>
                    </td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr class="runs-total">
                    <td colspan="2"><strong>Total</strong></td>
                    <td><strong>{{ row.totalDays }}</strong></td>
                    <td>—</td>
                    <td><strong>Rs.{{ fmt(row.totalGross) }}</strong></td>
                    <td class="c-red"><strong>Rs.{{ fmt(row.totalDeduction) }}</strong></td>
                    <td class="c-green"><strong>Rs.{{ fmt(row.totalNet) }}</strong></td>
                    <td class="c-blue"><strong>Rs.{{ fmt(row.totalDeductionReturned) }}</strong></td>
                    <td class="c-red"><strong>Rs.{{ fmt(row.currentMonthPending) }}</strong></td>
                    <td>—</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <div class="detail-section">
            <div class="detail-section-title">
              <v-icon icon="mdi-cash-multiple" size="14" class="mr-1" />
              Payments & Deduction Returns
              <v-progress-circular v-if="loadingHistory[row.rowKey]" size="14" width="2" indeterminate class="ml-2" />
            </div>
            <div v-if="!loadingHistory[row.rowKey]">
              <div v-if="!paymentHistories[row.rowKey]?.length" class="text-caption text-medium-emphasis pa-2">
                No payment activity recorded yet.
              </div>
              <table v-else class="payments-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Amount</th>
                    <th>Method</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="p in (paymentHistories[row.rowKey] || [])" :key="p._id">
                    <td class="date-col">{{ fmtPayDate(p.paymentDate) }}</td>
                    <td>{{ p.paymentType === 'deduction_return' ? 'Deduction Return' : 'Salary Payment' }}</td>
                    <td :class="p.paymentType === 'deduction_return' ? 'text-blue font-weight-bold' : 'text-green font-weight-bold'">
                      Rs.{{ fmt(p.amountPaid) }}
                    </td>
                    <td>{{ methodLabel(p.paymentMethod) }}</td>
                    <td class="text-grey text-caption">{{ p.notes || '-' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div><!-- end history-card -->

    <v-dialog v-model="payDialog" max-width="460">
      <v-card rounded="xl">
        <div class="hist-dialog-header">
          <v-icon icon="mdi-cash-plus" size="20" class="mr-2" />
          Payment — {{ payEmp?.name }}
        </div>
        <v-card-text class="pt-5 px-5">
          <v-row dense class="mb-2 text-body-2">
            <v-col>Carry Forward Pending</v-col>
            <v-col class="text-right font-weight-bold text-red">Rs.{{ fmt(payEmp?.carryForwardPending) }}</v-col>
          </v-row>
          <v-row dense class="mb-2 text-body-2">
            <v-col>Current Month Pending</v-col>
            <v-col class="text-right font-weight-bold text-red">Rs.{{ fmt(payEmp?.currentMonthPending) }}</v-col>
          </v-row>
          <v-row dense class="mb-3 text-body-2">
            <v-col>Total Salary Pending</v-col>
            <v-col class="text-right font-weight-bold text-red">Rs.{{ fmt(payEmp?.amountPending) }}</v-col>
          </v-row>
          <v-row dense class="mb-3 text-body-2">
            <v-col>Deduction Available To Return</v-col>
            <v-col class="text-right font-weight-bold text-blue">Rs.{{ fmt(payEmp?.deductionReturnAvailable) }}</v-col>
          </v-row>

          <v-text-field
            v-model.number="payForm.salaryAmount"
            type="number"
            min="0"
            :max="payEmp?.amountPending"
            label="Salary Amount To Pay Now (Rs.)"
            variant="outlined"
            class="mb-3"
          />
          <v-text-field
            v-model.number="payForm.deductionReturnAmount"
            type="number"
            min="0"
            :max="payEmp?.deductionReturnAvailable"
            label="Deduction Amount To Return Now (Rs.)"
            variant="outlined"
            class="mb-3"
          />
          <v-select
            v-model="payForm.method"
            :items="[
              { title: 'Cash', value: 'cash' },
              { title: 'Bank Transfer', value: 'transfer' },
              { title: 'Cheque', value: 'check' },
              { title: 'Other', value: 'other' }
            ]"
            item-title="title"
            item-value="value"
            label="Payment Method"
            variant="outlined"
            class="mb-3"
          />
          <v-text-field v-model="payForm.notes" label="Notes (optional)" variant="outlined" />
        </v-card-text>
        <v-card-actions class="px-5 pb-5">
          <v-spacer />
          <v-btn text="Cancel" rounded="lg" variant="text" @click="payDialog = false" />
          <v-btn color="primary" text="Confirm" rounded="lg" elevation="0" :loading="store.loading" @click="submitPayment" />
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, reactive } from 'vue'
import { usePayrollStore } from '@/stores/payroll'
import { downloadPayslip, payslipBlob } from '@/utils/payslipPdf'

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

const store = usePayrollStore()

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
  return [y - 2, y - 1, y, y + 1]
})

const runs = ref([])
const loading = ref(false)
const sendingWhatsappId = ref('')
const expandedRows = reactive({})
const paymentHistories = reactive({})
const loadingHistory = reactive({})

const payDialog = ref(false)
const payEmp = ref(null)
const payForm = reactive({ salaryAmount: 0, deductionReturnAmount: 0, method: 'cash', notes: '' })

const monthName = computed(() => MONTHS.find(m => m.value === selectedMonth.value)?.label || '')

const fmt = (num) => {
  const n = Number(num)
  return new Intl.NumberFormat('en-IN').format(Number.isFinite(n) ? Math.round(n) : 0)
}

const fmtShortDate = (d) => {
  if (!d) return '-'
  const date = new Date(d)
  const monthsShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${String(date.getDate()).padStart(2, '0')}-${monthsShort[date.getMonth()]}`
}

const fmtPayDate = (d) => {
  if (!d) return '-'
  const date = new Date(d)
  const h = String(date.getHours()).padStart(2, '0')
  const m = String(date.getMinutes()).padStart(2, '0')
  return `${fmtShortDate(date)}-${date.getFullYear()} ${h}:${m}`
}

const statusColor = (s) => ({ paid: 'success', partial: 'info', pending: 'warning' }[s] || 'default')
const methodLabel = (m) => ({ cash: 'Cash', transfer: 'Bank Transfer', check: 'Cheque', other: 'Other' }[m] || m)

const isEarlierPeriod = (month, year) => {
  if (Number(year) < Number(selectedYear.value)) return true
  return Number(year) === Number(selectedYear.value) && Number(month) < Number(selectedMonth.value)
}

const carryForwardMap = computed(() => {
  const map = {}
  ;(store.pending || []).forEach(item => {
    const employeeId = item.employeeId?.toString?.() || item.employeeId
    if (!employeeId || !isEarlierPeriod(item.month, item.year)) return
    map[employeeId] = (map[employeeId] || 0) + (Number(item.amountPending) || 0)
  })
  return map
})

const employeeSummary = computed(() => {
  const map = {}
  runs.value.forEach(run => {
    ;(run.employees || []).forEach((emp, empIndex) => {
      const id = emp.employeeId?.toString?.() || emp.employeeId || `legacy-${run._id}-${empIndex}`
      if (!map[id]) {
        map[id] = {
          rowKey: id,
          employeeId: emp.employeeId?.toString?.() || emp.employeeId || '',
          name: emp.name,
          entries: [],
          totalDays: 0,
          totalGross: 0,
          totalDeduction: 0,
          totalNet: 0,
          totalSalaryPaid: 0,
          totalDeductionReturned: 0,
          currentMonthPending: 0,
          carryForwardPending: 0,
          totalOutstanding: 0,
          status: 'pending'
        }
      }
      const row = map[id]
      row.entries.push({
        ...emp,
        runId: run._id,
        entryKey: `${run._id || 'run'}-${id}-${empIndex}`,
        periodStart: run.periodStart,
        periodEnd: run.periodEnd,
        runTitle: run.runTitle,
        runDate: run.generatedAt
      })
      row.totalDays += Number(emp.daysWorked) || 0
      row.totalGross += Number(emp.totalWages) || 0
      row.totalDeduction += Number(emp.deductionAmount) || 0
      row.totalNet += Number(emp.netSalary) || 0
      row.totalSalaryPaid += Number(emp.amountPaid) || 0
      row.totalDeductionReturned += Number(emp.deductionPaidBack) || 0
      row.currentMonthPending += Number(emp.amountPending) || 0
    })
  })

  Object.values(map).forEach(row => {
    row.entries.sort((a, b) => new Date(a.periodStart) - new Date(b.periodStart))
    row.carryForwardPending = carryForwardMap.value[row.employeeId] || 0
    row.totalOutstanding = row.currentMonthPending + row.carryForwardPending
    if (row.totalOutstanding <= 0) row.status = 'paid'
    else if (row.totalSalaryPaid > 0) row.status = 'partial'
    else row.status = 'pending'
  })

  return Object.values(map)
})

const grandGross = computed(() => employeeSummary.value.reduce((sum, row) => sum + row.totalGross, 0))
const grandDeduction = computed(() => employeeSummary.value.reduce((sum, row) => sum + row.totalDeduction, 0))
const grandDeductionReturned = computed(() => employeeSummary.value.reduce((sum, row) => sum + row.totalDeductionReturned, 0))
const grandOutstanding = computed(() => employeeSummary.value.reduce((sum, row) => sum + row.totalOutstanding, 0))

const fetchData = async () => {
  loading.value = true
  const data = await store.fetchPayrollHistory(selectedMonth.value, selectedYear.value)
  await store.fetchPending()
  runs.value = Array.isArray(data) ? data : (data ? [data] : [])
  loading.value = false
  for (const rowKey of Object.keys(expandedRows)) {
    if (expandedRows[rowKey]) {
      const row = employeeSummary.value.find(item => item.rowKey === rowKey)
      if (row) await loadPaymentHistory(row)
    }
  }
}

const onMonthYearChange = () => {
  Object.keys(expandedRows).forEach(k => { expandedRows[k] = false })
  Object.keys(paymentHistories).forEach(k => delete paymentHistories[k])
  fetchData()
}

const loadPaymentHistory = async (row) => {
  loadingHistory[row.rowKey] = true
  const records = await store.fetchPaymentHistory(row.employeeId)
  paymentHistories[row.rowKey] = (records || []).filter(p => {
    const earlier = Number(p.payrollYear) < Number(selectedYear.value) ||
      (Number(p.payrollYear) === Number(selectedYear.value) && Number(p.payrollMonth) <= Number(selectedMonth.value))
    return earlier
  })
  loadingHistory[row.rowKey] = false
}

const toggleExpand = async (rowKey) => {
  expandedRows[rowKey] = !expandedRows[rowKey]
  if (expandedRows[rowKey] && !paymentHistories[rowKey]) {
    const row = employeeSummary.value.find(item => item.rowKey === rowKey)
    if (row) await loadPaymentHistory(row)
  }
}

const openPayFromSummary = (row) => {
  const latestEntry = [...row.entries].sort((a, b) => new Date(b.periodEnd) - new Date(a.periodEnd))[0]
  payEmp.value = {
    ...row,
    referencePayrollId: latestEntry?.runId,
    deductionReturnAvailable: Math.max(0, row.totalDeduction - row.totalDeductionReturned)
  }
  payForm.salaryAmount = row.totalOutstanding
  payForm.deductionReturnAmount = 0
  payForm.method = 'cash'
  payForm.notes = ''
  payDialog.value = true
}

const submitPayment = async () => {
  if (!payEmp.value) return

  let ok = true
  if ((Number(payForm.salaryAmount) || 0) > 0) {
    const salarySettlement = await store.settleEmployeePayment(
      payEmp.value.employeeId,
      Number(payForm.salaryAmount) || 0,
      payForm.method,
      payForm.notes,
      selectedMonth.value,
      selectedYear.value
    )
    ok = Boolean(salarySettlement)
  }

  if (ok && (Number(payForm.deductionReturnAmount) || 0) > 0) {
    const deductionReturn = await store.recordDeductionReturn(
      payEmp.value.referencePayrollId,
      payEmp.value.employeeId,
      Number(payForm.deductionReturnAmount) || 0,
      payForm.method,
      payForm.notes
    )
    ok = Boolean(deductionReturn)
  }

  if (ok) {
    payDialog.value = false
    await fetchData()
  }
}

const buildEmpData = (row) => ({
  name: row.name,
  daysWorked: row.totalDays,
  totalWages: row.totalGross,
  deductionAmount: row.totalDeduction,
  netSalary: row.totalNet,
  amountPaid: row.totalSalaryPaid,
  amountPending: row.totalOutstanding,
  carryForwardPending: row.carryForwardPending,
  deductionReturned: row.totalDeductionReturned,
  paymentStatus: row.status,
  entries: row.entries
})

const blobToBase64 = (blob) => new Promise((resolve, reject) => {
  const reader = new FileReader()
  reader.onloadend = () => {
    const result = typeof reader.result === 'string' ? reader.result : ''
    resolve(result.includes(',') ? result.split(',')[1] : result)
  }
  reader.onerror = reject
  reader.readAsDataURL(blob)
})

const downloadPdf = (row) => {
  downloadPayslip(buildEmpData(row), selectedMonth.value, selectedYear.value)
}

const shareWhatsApp = async (row) => {
  if (!store.employees.length) await store.fetchEmployees()
  const empRecord = store.employees.find(e => e._id?.toString() === row.employeeId)
  if (!empRecord?.phone) {
    window.alert('Employee phone number is missing.')
    return
  }

  sendingWhatsappId.value = row.rowKey
  try {
    const blob = payslipBlob(buildEmpData(row), selectedMonth.value, selectedYear.value)
    const fileName = `Payslip_${(row.name || 'Employee').replace(/\s+/g, '_')}_${monthName.value}_${selectedYear.value}.pdf`
    const pdfBase64 = await blobToBase64(blob)
    const caption = `Salary slip for ${row.name} - ${monthName.value} ${selectedYear.value}`
    const sent = await store.sendWhatsAppPayslip(row.employeeId, pdfBase64, fileName, caption)
    if (!sent) window.alert(store.error || 'Failed to send payslip on WhatsApp.')
  } finally {
    sendingWhatsappId.value = ''
  }
}

onMounted(() => {
  selectedMonth.value = new Date().getMonth() + 1
  selectedYear.value = new Date().getFullYear()
  fetchData()
  store.fetchEmployees()
  window.addEventListener('payroll-refresh-history', fetchData)
})

onBeforeUnmount(() => {
  window.removeEventListener('payroll-refresh-history', fetchData)
})
</script>

<style scoped>
/* ══ Root ════════════════════════════════════════════════════════════ */
.history-root { padding: 4px 0; }

/* ══ Filter Bar ══════════════════════════════════════════════════════ */
.filter-bar {
  background: #fff;
  border-radius: 14px;
  padding: 14px 18px;
  box-shadow: 0 1px 6px rgba(0,0,0,.07);
  border: 1px solid #e8eaf0;
}

.summary-chip {
  padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600;
  display: inline-block;
}
.summary-chip--blue  { background: #e3f0ff; color: #1565c0; }
.summary-chip--green { background: #e8f5e9; color: #2e7d32; }
.summary-chip--red   { background: #fce4ec; color: #b71c1c; }

/* ══ Empty State ═════════════════════════════════════════════════════ */
.empty-state { text-align: center; padding: 48px 20px; }
.empty-icon-wrap {
  width: 70px; height: 70px; border-radius: 50%; background: #e8f0fe;
  display: flex; align-items: center; justify-content: center; margin: 0 auto;
}

/* ══ History Card ════════════════════════════════════════════════════ */
.history-card {
  background: #fff; border-radius: 16px;
  border: 1px solid #e8eaf0;
  box-shadow: 0 2px 10px rgba(0,0,0,.06);
  overflow: hidden;
}
.history-card__title {
  display: flex; align-items: center;
  padding: 14px 18px; font-size: 14px; font-weight: 700;
  color: #1a1a2e; background: #f7f9fc;
}

/* ══ Employee Group ══════════════════════════════════════════════════ */
.emp-group { border-bottom: 1px solid #f0f0f0; }
.emp-group:last-child { border-bottom: none; }

.emp-summary-row {
  display: flex; align-items: center; flex-wrap: wrap; gap: 12px;
  padding: 14px 18px; cursor: pointer; transition: background .15s;
}
.emp-summary-row:hover { background: #f7f9fc; }

.emp-summary-left { display: flex; align-items: center; min-width: 170px; flex: 1; }
.emp-name { font-size: 14px; font-weight: 700; color: #1a1a2e; }
.emp-meta { font-size: 11px; color: #888; margin-top: 1px; }
.emp-summary-stats { display: flex; gap: 14px; flex-wrap: wrap; flex: 2; }
.emp-stat { text-align: center; min-width: 72px; }
.emp-stat-label { font-size: 10px; text-transform: uppercase; color: #9e9e9e; letter-spacing: .4px; margin-bottom: 2px; }
.emp-stat-val { font-size: 13px; font-weight: 600; color: #333; }
.emp-stat-val--red   { color: #c62828; }
.emp-stat-val--green { color: #2e7d32; }
.emp-stat-val--blue  { color: #1565c0; }
.emp-summary-actions { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }

.hist-status-badge {
  padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 700;
  text-transform: capitalize; letter-spacing: .2px;
}
.hist-status--paid    { background: #e8f5e9; color: #1b5e20; }
.hist-status--partial { background: #fff3e0; color: #e65100; }
.hist-status--pending { background: #fce4ec; color: #b71c1c; }

/* ══ Expanded Detail ═════════════════════════════════════════════════ */
.emp-detail {
  background: #f7f9fc; border-top: 1px solid #eee;
  padding: 16px 18px; display: flex; gap: 20px; flex-wrap: wrap;
}
.detail-section { flex: 1; min-width: 300px; }
.detail-section-title {
  font-size: 10.5px; font-weight: 800; text-transform: uppercase;
  letter-spacing: .6px; color: #1565c0; margin-bottom: 8px;
  display: flex; align-items: center;
}
.detail-meta { font-size: 12px; color: #666; margin-bottom: 8px; }
.runs-table-wrap { overflow-x: auto; }

/* ══ Tables ══════════════════════════════════════════════════════════ */
.runs-table, .payments-table {
  width: 100%; border-collapse: collapse; font-size: 12px;
}
.runs-table th, .payments-table th {
  background: #eef2f7; font-size: 10px; font-weight: 800;
  text-transform: uppercase; letter-spacing: .3px; color: #3c3c8a;
  padding: 6px 8px; text-align: left; white-space: nowrap;
}
.runs-table td, .payments-table td {
  padding: 7px 8px; border-bottom: 1px solid #eee; color: #333; white-space: nowrap;
}
.runs-table tbody tr:hover td { background: #f0f4ff; }
.runs-total td {
  background: #e8eaf6; font-size: 12px; padding: 6px 8px;
  border-top: 2px solid #9fa8da;
}
.date-col { color: #555; }
.c-red  { color: #c62828; }
.c-green { color: #2e7d32; }
.c-blue  { color: #1565c0; }

/* ══ Run Badge ═══════════════════════════════════════════════════════ */
.run-badge {
  display: inline-block; padding: 2px 8px; border-radius: 20px;
  font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .3px;
}
.run-badge--paid    { background: #e6f4ea; color: #2e7d32; }
.run-badge--partial { background: #fff8e1; color: #e65100; }
.run-badge--pending { background: #fce4ec; color: #b71c1c; }

/* ══ Dialog ══════════════════════════════════════════════════════════ */
.hist-dialog-header {
  display: flex; align-items: center;
  padding: 16px 20px; font-size: 15px; font-weight: 700;
  color: #fff;
  background: linear-gradient(135deg,#2e7d32,#43a047);
}

.gap-2 { gap: 8px; }

/* ══ Responsive ════════════════════════════════════════════════════════════════ */
@media (max-width: 768px) {
  .filter-bar { padding: 12px; }
  .filter-bar .d-flex { flex-direction: column; align-items: stretch; gap: 10px; }
  .filter-bar .d-flex .d-flex { flex-direction: row; }
  .summary-chip { font-size: 11px; padding: 3px 8px; }
  .emp-summary-row { flex-direction: column; align-items: flex-start; gap: 10px; padding: 12px 14px; }
  .emp-summary-stats { gap: 8px; width: 100%; }
  .emp-stat { min-width: 60px; }
  .emp-stat-val { font-size: 12px; }
  .emp-summary-actions { width: 100%; justify-content: flex-start; flex-wrap: wrap; }
  .emp-detail { flex-direction: column; gap: 14px; padding: 12px; }
  .detail-section { min-width: unset; width: 100%; }
  .runs-table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; }
  .history-card__title { padding: 12px 14px; font-size: 13px; }
  .hist-dialog-header { padding: 14px 16px; font-size: 14px; }
}

@media (max-width: 480px) {
  .emp-summary-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
  .emp-stat { min-width: unset; text-align: left; }
  .emp-summary-actions { gap: 4px; }
  .summary-chip { font-size: 10px; padding: 2px 6px; }
}
</style>
