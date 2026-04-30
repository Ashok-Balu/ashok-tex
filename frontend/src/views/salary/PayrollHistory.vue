<template>
  <div class="history">
    <v-card class="mb-4" elevation="2">
      <v-card-text class="pb-2">
        <v-row dense align="center">
          <v-col cols="6" md="3">
            <v-select
              v-model="selectedMonth"
              :items="months"
              label="Month"
              variant="outlined"
              density="compact"
              item-title="label"
              item-value="value"
              @update:modelValue="onMonthYearChange"
            />
          </v-col>
          <v-col cols="6" md="3">
            <v-select
              v-model="selectedYear"
              :items="years"
              label="Year"
              variant="outlined"
              density="compact"
              @update:modelValue="onMonthYearChange"
            />
          </v-col>
          <v-col cols="12" md="6" class="d-flex gap-2 flex-wrap">
            <v-chip v-if="runs.length" color="primary" variant="tonal">
              {{ runs.length }} run{{ runs.length !== 1 ? 's' : '' }}
            </v-chip>
            <v-chip v-if="runs.length" color="success" variant="tonal">
              Gross: Rs.{{ fmt(grandGross) }}
            </v-chip>
            <v-chip v-if="runs.length" color="error" variant="tonal">
              Deduction: Rs.{{ fmt(grandDeduction) }}
            </v-chip>
            <v-chip v-if="runs.length" color="info" variant="tonal">
              Deduction Returned: Rs.{{ fmt(grandDeductionReturned) }}
            </v-chip>
            <v-chip v-if="runs.length" :color="grandOutstanding > 0 ? 'warning' : 'success'" variant="tonal">
              Pending: Rs.{{ fmt(grandOutstanding) }}
            </v-chip>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <v-progress-linear v-if="loading" indeterminate color="primary" class="mb-4" />

    <v-alert v-if="!loading && !runs.length" type="info" variant="tonal" class="mb-4">
      No payroll records for {{ monthName }} {{ selectedYear }}.
    </v-alert>

    <v-card v-if="!loading && runs.length" class="mb-4" elevation="2">
      <v-card-title class="py-3 px-4 text-subtitle-1 font-weight-bold">
        Employee Summary - {{ monthName }} {{ selectedYear }}
      </v-card-title>
      <v-divider />

      <div v-for="row in employeeSummary" :key="row.rowKey" class="emp-group">
        <div class="emp-summary-row" style="cursor:pointer" @click="toggleExpand(row.rowKey)">
          <div class="emp-summary-left">
            <div>
              <div class="font-weight-bold">{{ row.name }}</div>
              <div class="text-caption text-medium-emphasis">
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
              <div class="emp-stat-val text-red">Rs.{{ fmt(row.totalDeduction) }}</div>
            </div>
            <div class="emp-stat">
              <div class="emp-stat-label">Ded. Returned</div>
              <div class="emp-stat-val text-blue">Rs.{{ fmt(row.totalDeductionReturned) }}</div>
            </div>
            <div class="emp-stat">
              <div class="emp-stat-label">Carry Forward</div>
              <div :class="['emp-stat-val', row.carryForwardPending > 0 ? 'text-red' : 'text-green']">
                {{ row.carryForwardPending > 0 ? `Rs.${fmt(row.carryForwardPending)}` : 'Nil' }}
              </div>
            </div>
            <div class="emp-stat">
              <div class="emp-stat-label">Salary Paid</div>
              <div class="emp-stat-val text-blue">Rs.{{ fmt(row.totalSalaryPaid) }}</div>
            </div>
            <div class="emp-stat">
              <div class="emp-stat-label">Pending</div>
              <div :class="['emp-stat-val', row.totalOutstanding > 0 ? 'text-red font-weight-bold' : 'text-green']">
                {{ row.totalOutstanding > 0 ? `Rs.${fmt(row.totalOutstanding)}` : 'Paid' }}
              </div>
            </div>
          </div>

          <div class="emp-summary-actions" @click.stop>
            <v-chip :color="statusColor(row.status)" size="small" class="mr-2">{{ row.status }}</v-chip>
            <v-btn
              v-if="row.employeeId && (row.totalOutstanding > 0 || row.totalDeduction > row.totalDeductionReturned)"
              size="small"
              color="primary"
              variant="tonal"
              prepend-icon="mdi-cash"
              text="Pay"
              class="mr-1"
              @click="openPayFromSummary(row)"
            />
            <v-btn
              size="small"
              color="teal"
              variant="tonal"
              icon="mdi-file-pdf-box"
              class="mr-1"
              title="Download Payslip"
              @click="downloadPdf(row)"
            />
            <v-btn
              size="small"
              color="green"
              variant="tonal"
              icon="mdi-whatsapp"
              title="Send via WhatsApp"
              :loading="sendingWhatsappId === row.rowKey"
              :disabled="!row.employeeId"
              @click="shareWhatsApp(row)"
            />
            <v-btn
              size="small"
              variant="text"
              :icon="expandedRows[row.rowKey] ? 'mdi-chevron-up' : 'mdi-chevron-down'"
              @click="toggleExpand(row.rowKey)"
            />
          </div>
        </div>

        <div v-if="expandedRows[row.rowKey]" class="emp-detail">
          <div class="detail-section">
            <div class="detail-section-title">
              Period Salary Runs - {{ monthName }} {{ selectedYear }}
            </div>
            <div class="detail-meta">
              Carry-forward pending before this month: <strong>Rs.{{ fmt(row.carryForwardPending) }}</strong>
            </div>
            <div class="runs-table-wrap">
              <table class="runs-table">
                <thead>
                  <tr>
                    <th>From</th>
                    <th>To</th>
                    <th>Days</th>
                    <th>Wage / Day</th>
                    <th>Gross</th>
                    <th>Deduction</th>
                    <th>Net</th>
                    <th>Ded. Returned</th>
                    <th>Salary Pending</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="entry in row.entries" :key="entry.entryKey">
                    <td class="date-col">{{ fmtShortDate(entry.periodStart) }}</td>
                    <td class="date-col">{{ fmtShortDate(entry.periodEnd) }}</td>
                    <td>{{ entry.daysWorked }}</td>
                    <td>Rs.{{ fmt(entry.dailyWage) }}</td>
                    <td>Rs.{{ fmt(entry.totalWages) }}</td>
                    <td class="text-red">Rs.{{ fmt(entry.deductionAmount) }}</td>
                    <td class="text-green font-weight-bold">Rs.{{ fmt(entry.netSalary) }}</td>
                    <td class="text-blue">Rs.{{ fmt(entry.deductionPaidBack) }}</td>
                    <td class="text-red">Rs.{{ fmt(entry.amountPending) }}</td>
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
                    <td>-</td>
                    <td><strong>Rs.{{ fmt(row.totalGross) }}</strong></td>
                    <td class="text-red"><strong>Rs.{{ fmt(row.totalDeduction) }}</strong></td>
                    <td class="text-green"><strong>Rs.{{ fmt(row.totalNet) }}</strong></td>
                    <td class="text-blue"><strong>Rs.{{ fmt(row.totalDeductionReturned) }}</strong></td>
                    <td class="text-red"><strong>Rs.{{ fmt(row.currentMonthPending) }}</strong></td>
                    <td>-</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <div class="detail-section">
            <div class="detail-section-title">
              Payments and Deduction Returns
              <v-progress-circular v-if="loadingHistory[row.rowKey]" size="14" width="2" indeterminate class="ml-2" />
            </div>
            <div v-if="!loadingHistory[row.rowKey]">
              <div v-if="!paymentHistories[row.rowKey]?.length" class="text-caption text-grey pa-2">
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
    </v-card>

    <v-dialog v-model="payDialog" max-width="460">
      <v-card>
        <v-card-title class="bg-primary text-white">Payment - {{ payEmp?.name }}</v-card-title>
        <v-card-text class="pt-4">
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
        <v-card-actions>
          <v-spacer />
          <v-btn text="Cancel" @click="payDialog = false" />
          <v-btn color="primary" text="Confirm" :loading="store.loading" @click="submitPayment" />
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, reactive } from 'vue'
import { usePayrollStore } from '@/stores/payroll'
import { downloadPayslip, payslipBlob } from '@/utils/payslipPdf'

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
.emp-group { border-bottom: 1px solid #f0f0f0; }
.emp-group:last-child { border-bottom: none; }

.emp-summary-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  padding: 14px 16px;
  transition: background 0.15s;
}

.emp-summary-row:hover { background: #fafafa; }

.emp-summary-left { display: flex; align-items: center; min-width: 160px; flex: 1; }
.emp-summary-stats { display: flex; gap: 16px; flex-wrap: wrap; flex: 2; }
.emp-stat { text-align: center; min-width: 78px; }
.emp-stat-label { font-size: 10px; text-transform: uppercase; color: #888; letter-spacing: 0.4px; }
.emp-stat-val { font-size: 14px; font-weight: 600; color: #333; }
.emp-summary-actions { display: flex; align-items: center; gap: 4px; flex-shrink: 0; }

.emp-detail {
  background: #f8f9fb;
  border-top: 1px solid #eee;
  padding: 16px;
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
}

.detail-section { flex: 1; min-width: 320px; }
.detail-section-title {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  color: #666;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
}
.detail-meta { font-size: 12px; color: #666; margin-bottom: 10px; }
.runs-table-wrap { overflow-x: auto; }

.runs-table, .payments-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12.5px;
}

.runs-table th, .payments-table th {
  background: #ececec;
  font-size: 10.5px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  color: #555;
  padding: 5px 8px;
  text-align: left;
  white-space: nowrap;
}

.runs-table td, .payments-table td {
  padding: 6px 8px;
  border-bottom: 1px solid #eee;
  color: #333;
  white-space: nowrap;
}

.runs-total td {
  background: #e8e8e8;
  font-size: 12.5px;
  padding: 5px 8px;
  border-top: 1px solid #ccc;
}

.date-col { color: #555; }

.run-badge {
  display: inline-block;
  padding: 2px 7px;
  border-radius: 10px;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}
.run-badge--paid { background: #e6f4ea; color: #2e7d32; }
.run-badge--partial { background: #e3f2fd; color: #1565c0; }
.run-badge--pending { background: #fff3e0; color: #e65100; }
.gap-2 { gap: 8px; }
</style>
