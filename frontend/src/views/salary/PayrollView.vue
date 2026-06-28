<template>
  <div class="payroll-root">

    <!-- ── Hero Header ── -->
    <div class="payroll-hero mb-5">
      <div class="payroll-hero__content">
        <div class="payroll-hero__title">
          <v-icon icon="mdi-currency-inr" size="28" class="mr-2" style="opacity:.85" />
          Payroll Management
        </div>
        <div class="payroll-hero__sub">Wages · Salary Runs · Payments · Payslip</div>
      </div>
      <div class="payroll-hero__selectors">
        <v-select
          v-model="selMonth"
          :items="MONTHS"
          item-title="label"
          item-value="value"
          density="compact"
          hide-details
          variant="outlined"
          bg-color="white"
          rounded="lg"
          style="min-width:140px"
        />
        <v-select
          v-model="selYear"
          :items="YEARS"
          density="compact"
          hide-details
          variant="outlined"
          bg-color="white"
          rounded="lg"
          style="min-width:95px"
        />
      </div>
    </div>

    <!-- ── Summary Cards ── -->
    <v-row class="mb-5">
      <v-col cols="6" md="3">
        <div class="stat-card stat-card--blue">
          <div class="stat-card__icon"><v-icon icon="mdi-account-group" size="26" /></div>
          <div class="stat-card__body">
            <div class="stat-card__label">Active Employees</div>
            <div class="stat-card__value">{{ employees.length }}</div>
          </div>
        </div>
      </v-col>
      <v-col cols="6" md="3">
        <div class="stat-card stat-card--red">
          <div class="stat-card__icon"><v-icon icon="mdi-alert-circle-outline" size="26" /></div>
          <div class="stat-card__body">
            <div class="stat-card__label">Total Pending</div>
            <div class="stat-card__value">Rs.{{ fmt(totalPending) }}</div>
          </div>
        </div>
      </v-col>
      <v-col cols="6" md="3">
        <div class="stat-card stat-card--green">
          <div class="stat-card__icon"><v-icon icon="mdi-trending-up" size="26" /></div>
          <div class="stat-card__body">
            <div class="stat-card__label">{{ selMonthLabel }} Net</div>
            <div class="stat-card__value">Rs.{{ fmt(monthNetTotal) }}</div>
          </div>
        </div>
      </v-col>
      <v-col cols="6" md="3">
        <div class="stat-card stat-card--amber">
          <div class="stat-card__icon"><v-icon icon="mdi-bank-outline" size="26" /></div>
          <div class="stat-card__body">
            <div class="stat-card__label">Deduction Balance</div>
            <div class="stat-card__value">Rs.{{ fmt(totalDeductBal) }}</div>
          </div>
        </div>
      </v-col>
    </v-row>

    <!-- ── Tabs ── -->
    <div class="payroll-tabs-wrap mb-4">
      <v-tabs v-model="activeTab" color="primary" class="payroll-tabs">
        <v-tab value="employees" prepend-icon="mdi-account-group">Employees</v-tab>
        <v-tab value="machine-wage" prepend-icon="mdi-factory">Machine Wage Master</v-tab>
        <v-tab value="runs"      prepend-icon="mdi-calendar-clock">Salary Runs</v-tab>
        <v-tab value="payments"  prepend-icon="mdi-cash-multiple">Payments</v-tab>
        <v-tab value="payslip"   prepend-icon="mdi-file-document-outline">Payslip</v-tab>
        <v-tab value="employee-summary" prepend-icon="mdi-chart-box-outline">Employee Summary</v-tab>
      </v-tabs>
    </div>

    <v-tabs-window v-model="activeTab">

      <!-- ═══ TAB 1 — EMPLOYEES ═══ -->
      <v-tabs-window-item value="employees">
        <div class="d-flex justify-end mb-4">
          <v-btn color="primary" prepend-icon="mdi-plus" rounded="lg" elevation="2" @click="openEmpDialog()">
            Add Employee
          </v-btn>
        </div>
        <v-card rounded="xl" elevation="0" class="border-card">
          <v-data-table
            :headers="empHeaders"
            :items="employees"
            item-value="_id"
            :loading="loading"
            no-data-text="No employees yet — click Add Employee to get started."
            class="emp-table"
          >
            <template #item.name="{ item }">
              <div class="d-flex align-center" style="gap:12px">
                <div class="emp-avatar">{{ item.name.charAt(0).toUpperCase() }}</div>
                <span class="font-weight-medium" style="margin-left:4px">{{ item.name }}</span>
              </div>
            </template>
            <template #item.phone="{ item }">
              <span class="text-medium-emphasis">{{ item.phone || '—' }}</span>
            </template>
            <template #item.deductionPercentage="{ item }">
              <div class="deduction-badge">{{ item.deductionPercentage }}%</div>
            </template>
            <template #item.actions="{ item }">
              <div class="d-flex gap-2 justify-end" style="gap:8px">
                <v-btn icon="mdi-pencil-outline" size="small" variant="tonal" color="primary" rounded="lg" @click="openEmpDialog(item)" />
                <v-btn icon="mdi-trash-can-outline" size="small" variant="tonal" color="error" rounded="lg" @click="confirmDeleteEmp(item)" />
              </div>
            </template>
            <template #no-data>
              <div class="text-center pa-10">
                <div class="empty-icon-wrap mb-4">
                  <v-icon icon="mdi-account-group-outline" size="40" color="primary" />
                </div>
                <div class="text-subtitle-1 font-weight-medium mb-1">No employees yet</div>
                <div class="text-caption text-medium-emphasis mb-4">Add your first employee to start running salaries</div>
                <v-btn color="primary" prepend-icon="mdi-plus" rounded="lg" @click="openEmpDialog()">Add Employee</v-btn>
              </div>
            </template>
          </v-data-table>
        </v-card>
      </v-tabs-window-item>

      <!-- ═══ TAB 1B — MACHINE WAGE MASTER ═══ -->
      <v-tabs-window-item value="machine-wage">
        <div class="d-flex justify-space-between align-center flex-wrap mb-4" style="gap:10px">
          <div>
            <div class="text-subtitle-1 font-weight-bold">Machine Wage Master</div>
            <div class="text-caption text-medium-emphasis">Maintain effective-date wage configuration for 3 to 10 machines.</div>
          </div>
          <v-btn color="primary" prepend-icon="mdi-plus" rounded="lg" elevation="2" @click="openMachineWageDialog()">
            Add Wage Configuration
          </v-btn>
        </div>

        <v-card rounded="xl" elevation="0" class="border-card">
          <div class="mw-table-wrap">
            <table class="mw-table">
              <thead>
                <tr>
                  <th>From Date</th>
                  <th>Machine Wage Ranges</th>
                  <th>Status</th>
                  <th class="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="cfg in machineWageRows" :key="cfg._id">
                  <td>{{ fmtDate(cfg.fromDate) }}</td>
                  <td>{{ machineWageSummary(cfg) }}</td>
                  <td>
                    <span class="status-badge" :class="cfg.isActive ? 'status-paid' : 'status-pending'">
                      {{ cfg.isActive ? 'Active' : 'Inactive' }}
                    </span>
                  </td>
                  <td class="text-right text-no-wrap">
                    <v-btn icon="mdi-pencil-outline" size="small" variant="tonal" color="primary" rounded="lg" @click="openMachineWageDialog(cfg)" />
                    <v-btn icon="mdi-trash-can-outline" size="small" variant="tonal" color="error" rounded="lg" class="ml-2" @click="confirmDeleteMachineWage(cfg)" />
                  </td>
                </tr>
                <tr v-if="!machineWageRows.length">
                  <td colspan="5" class="text-center py-8 text-medium-emphasis">No machine wage configuration yet.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </v-card>
      </v-tabs-window-item>

      <!-- ═══ TAB 2 — SALARY RUNS ═══ -->
      <v-tabs-window-item value="runs">

        <div class="d-flex align-center justify-space-between mb-4">
          <div>
            <span class="text-subtitle-1 font-weight-bold">{{ selMonthLabel }} {{ selYear }}</span>
            <span class="text-caption text-medium-emphasis ml-2">Salary Runs</span>
          </div>
          <v-btn color="success" prepend-icon="mdi-plus" rounded="lg" elevation="2" @click="openRunDialog">New Salary Run</v-btn>
        </div>

        <div class="view-toggle mb-4">
          <button :class="['toggle-btn', runsView === 'period' ? 'toggle-btn--active' : '']" @click="runsView = 'period'">
            <v-icon size="16" class="mr-1">mdi-calendar-range</v-icon> By Period
          </button>
          <button :class="['toggle-btn', runsView === 'employee' ? 'toggle-btn--active' : '']" @click="runsView = 'employee'">
            <v-icon size="16" class="mr-1">mdi-account-multiple</v-icon> By Employee
          </button>
        </div>

        <div v-if="loadingRuns" class="text-center pa-10">
          <v-progress-circular indeterminate color="primary" size="44" />
          <div class="text-caption text-medium-emphasis mt-3">Loading salary runs...</div>
        </div>

        <div v-else-if="!monthRuns.length" class="empty-state">
          <div class="empty-icon-wrap mb-3">
            <v-icon icon="mdi-calendar-blank" size="40" color="primary" />
          </div>
          <div class="text-subtitle-1 font-weight-medium mb-1">No salary runs yet</div>
          <div class="text-caption text-medium-emphasis mb-4">for {{ selMonthLabel }} {{ selYear }}</div>
          <v-btn color="success" prepend-icon="mdi-plus" rounded="lg" @click="openRunDialog">Create First Run</v-btn>
        </div>

        <template v-else>

          <!-- By Period -->
          <v-expansion-panels v-if="runsView === 'period'" variant="accordion" class="runs-panels">
            <v-expansion-panel v-for="run in monthRuns" :key="run._id" rounded="xl" class="run-panel mb-2">
              <v-expansion-panel-title class="run-panel-title">
                <div class="run-title-inner">
                  <!-- left: icon + date/label -->
                  <div class="run-title-left">
                    <div class="run-cal-chip">
                      <v-icon icon="mdi-calendar-range" size="18" />
                    </div>
                    <div>
                      <div class="run-dates">
                        {{ fmtDate(run.periodStart) }} → {{ fmtDate(run.periodEnd) }}
                      </div>
                      <div class="run-sub">
                        {{ run.runTitle || 'Salary Run' }} · {{ run.employees.length }} employee(s)
                      </div>
                    </div>
                  </div>
                  <!-- right: gross / net / delete -->
                  <div class="run-title-right">
                    <div class="run-stat">
                      <span class="run-stat-label">Gross</span>
                      <span class="run-stat-value">₹{{ fmt(run.employees.reduce((s,e)=>s+(e.totalWages||0),0)) }}</span>
                    </div>
                    <div class="run-stat">
                      <span class="run-stat-label">Net</span>
                      <span class="run-stat-value run-net">₹{{ fmt(runNet(run)) }}</span>
                    </div>
                    <v-btn icon="mdi-pencil-outline" size="small" variant="tonal" color="primary" rounded="lg" @click.stop="openEditRunDialog(run)" />
                    <v-btn icon="mdi-trash-can-outline" size="small" variant="tonal" color="error" rounded="lg" @click.stop="confirmDeleteRun(run)" />
                  </div>
                </div>
              </v-expansion-panel-title>
              <v-expansion-panel-text class="pa-0">
                <div class="period-table-wrapper">
                  <table class="period-table">
                    <thead>
                      <tr>
                        <th class="text-left">Employee</th>
                        <th>Mon</th>
                        <th>Tue</th>
                        <th>Wed</th>
                        <th>Thu</th>
                        <th>Fri</th>
                        <th>Sat</th>
                        <th>Sun</th>
                        <th class="text-right">Total Days</th>
                        <th class="text-right">Total Wages</th>
                        <th class="text-right">Deduction</th>
                        <th class="text-right">Market</th>
                        <th class="text-right">Advance</th>
                        <th class="text-right">Final Salary</th>
                        <th class="text-right">Paid</th>
                        <th class="text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="(emp, idx) in run.employees" :key="emp.employeeId" :class="idx % 2 === 1 ? 'row-alt' : ''">
                        <td class="font-weight-medium">{{ emp.name }}</td>
                        <td>{{ periodDayCell(emp, run, 1) }}</td>
                        <td>{{ periodDayCell(emp, run, 2) }}</td>
                        <td>{{ periodDayCell(emp, run, 3) }}</td>
                        <td>{{ periodDayCell(emp, run, 4) }}</td>
                        <td>{{ periodDayCell(emp, run, 5) }}</td>
                        <td>{{ periodDayCell(emp, run, 6) }}</td>
                        <td>{{ periodDayCell(emp, run, 0) }}</td>
                        <td class="text-right">{{ emp.daysWorked }}</td>
                        <td class="text-right">₹{{ fmt(emp.totalWages) }}</td>
                        <td class="text-right c-error">₹{{ fmt(emp.deductionAmount) }}</td>
                        <td class="text-right">₹{{ fmt(emp.marketAmount || 0) }}</td>
                        <td class="text-right">₹{{ fmt(emp.advanceAmount || 0) }}</td>
                        <td class="text-right font-weight-bold">₹{{ fmt(emp.finalSalary || emp.netSalary) }}</td>
                        <td class="text-right c-success">₹{{ fmt(emp.amountPaid) }}</td>
                        <td class="text-center">
                          <span class="status-badge" :class="'status-' + emp.paymentStatus">
                            {{ emp.paymentStatus }}
                          </span>
                        </td>
                      </tr>
                    </tbody>
                    <tfoot>
                      <tr class="tfoot-row">
                        <td colspan="9" class="text-right">Run Total</td>
                        <td class="text-right">₹{{ fmt(run.employees.reduce((s,e)=>s+(e.totalWages||0),0)) }}</td>
                        <td class="text-right c-error">₹{{ fmt(run.employees.reduce((s,e)=>s+(e.deductionAmount||0),0)) }}</td>
                        <td class="text-right">₹{{ fmt(run.employees.reduce((s,e)=>s+(e.marketAmount||0),0)) }}</td>
                        <td class="text-right">₹{{ fmt(run.employees.reduce((s,e)=>s+(e.advanceAmount||0),0)) }}</td>
                        <td class="text-right">₹{{ fmt(run.employees.reduce((s,e)=>s+((e.finalSalary||e.netSalary)||0),0)) }}</td>
                        <td class="text-right c-success">₹{{ fmt(run.employees.reduce((s,e)=>s+(e.amountPaid||0),0)) }}</td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </v-expansion-panel-text>
            </v-expansion-panel>
          </v-expansion-panels>

          <!-- By Employee -->
          <v-expansion-panels v-else variant="accordion" class="runs-panels">
            <v-expansion-panel v-for="row in monthEmpSummary" :key="row.employeeId" rounded="xl" class="run-panel mb-2">
              <v-expansion-panel-title class="run-panel-title">
                <div class="run-title-inner">
                  <!-- left: avatar + name -->
                  <div class="run-title-left">
                    <div class="emp-avatar emp-avatar--md">
                      {{ row.name.charAt(0).toUpperCase() }}
                    </div>
                    <div>
                      <div class="run-dates">{{ row.name }}</div>
                      <div class="run-sub">{{ row.periods.length }} period(s) · Gross ₹{{ fmt(row.totalWages) }}</div>
                    </div>
                  </div>
                  <!-- right: net / pending -->
                  <div class="run-title-right">
                    <div class="run-stat">
                      <span class="run-stat-label">Net Salary</span>
                      <span class="run-stat-value">₹{{ fmt(row.netSalary) }}</span>
                    </div>
                    <div class="run-stat">
                      <span class="run-stat-label">Pending</span>
                      <span class="run-stat-value" :style="row.amountPending > 0 ? 'color:#c62828' : 'color:#2e7d32'">₹{{ fmt(row.amountPending) }}</span>
                    </div>
                  </div>
                </div>
              </v-expansion-panel-title>
              <v-expansion-panel-text class="pa-0">
                <v-table density="compact" class="text-body-2 by-employee-table">
                  <thead>
                    <tr class="bg-grey-lighten-4">
                      <th>Week</th>
                      <th>Mon</th>
                      <th>Tue</th>
                      <th>Wed</th>
                      <th>Thu</th>
                      <th>Fri</th>
                      <th>Sat</th>
                      <th>Sun</th>
                      <th class="text-right">Total Days</th>
                      <th class="text-right">Total Wages</th>
                      <th class="text-right">Deduction</th>
                      <th class="text-right">Market</th>
                      <th class="text-right">Advance</th>
                      <th class="text-right">Final Salary</th>
                      <th class="text-right">Paid</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="p in row.periods" :key="p.periodStart">
                      <td>
                        <div>{{ p.runTitle || 'Week' }}</div>
                        <div class="text-caption text-medium-emphasis">{{ fmtDate(p.periodStart) }} - {{ fmtDate(p.periodEnd) }}</div>
                      </td>
                      <td>{{ dayCell(p, 1) }}</td>
                      <td>{{ dayCell(p, 2) }}</td>
                      <td>{{ dayCell(p, 3) }}</td>
                      <td>{{ dayCell(p, 4) }}</td>
                      <td>{{ dayCell(p, 5) }}</td>
                      <td>{{ dayCell(p, 6) }}</td>
                      <td>{{ dayCell(p, 0) }}</td>
                      <td class="text-right">{{ p.daysWorked }}</td>
                      <td class="text-right">₹{{ fmt(p.totalWages) }}</td>
                      <td class="text-right text-error">₹{{ fmt(p.deductionAmount) }}</td>
                      <td class="text-right">₹{{ fmt(p.marketAmount) }}</td>
                      <td class="text-right">₹{{ fmt(p.advanceAmount) }}</td>
                      <td class="text-right font-weight-bold">₹{{ fmt(p.finalSalary) }}</td>
                      <td class="text-right text-success">₹{{ fmt(p.amountPaid) }}</td>
                      <td><span class="status-badge" :class="'status-' + p.paymentStatus">{{ p.paymentStatus }}</span></td>
                    </tr>
                  </tbody>
                  <tfoot>
                    <tr class="bg-grey-lighten-5 font-weight-bold">
                      <td colspan="9" class="text-right pr-2">Month Total</td>
                      <td class="text-right">₹{{ fmt(row.totalWages) }}</td>
                      <td class="text-right text-error">₹{{ fmt(row.deductionAmount) }}</td>
                      <td class="text-right">—</td>
                      <td class="text-right">—</td>
                      <td class="text-right">₹{{ fmt(row.netSalary) }}</td>
                      <td class="text-right text-success">₹{{ fmt(row.amountPaid) }}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </v-table>
              </v-expansion-panel-text>
            </v-expansion-panel>
          </v-expansion-panels>

        </template>
      </v-tabs-window-item>

      <!-- ═══ TAB 3 — PAYMENTS ═══ -->
      <v-tabs-window-item value="payments">

        <div v-if="loadingSummary" class="text-center pa-10">
          <v-progress-circular indeterminate color="primary" size="44" />
          <div class="text-caption text-medium-emphasis mt-3">Loading payment summary...</div>
        </div>

        <div v-else-if="summaryLoadError" class="empty-state">
          <div class="empty-icon-wrap mb-3">
            <v-icon icon="mdi-cloud-off-outline" size="40" color="error" />
          </div>
          <div class="text-subtitle-1 font-weight-medium mb-1">Could not load payment data</div>
          <div class="text-caption text-medium-emphasis mb-4">
            The backend may not be running or needs a restart.
          </div>
          <v-btn color="primary" prepend-icon="mdi-refresh" rounded="lg" @click="loadEmployeeSummary">Try Again</v-btn>
        </div>

        <div v-else-if="!employeeSummary.length" class="empty-state">
          <div class="empty-icon-wrap mb-3">
            <v-icon icon="mdi-account-cash-outline" size="40" color="primary" />
          </div>
          <div class="text-subtitle-1 font-weight-medium mb-1">No employees yet</div>
          <div class="text-caption text-medium-emphasis mb-4">Add employees and create salary runs first</div>
          <v-btn color="primary" prepend-icon="mdi-account-plus" rounded="lg" @click="activeTab = 'employees'">Go to Employees</v-btn>
        </div>

        <v-row v-else>
          <v-col v-for="emp in employeeSummary" :key="emp._id" cols="12" sm="6" lg="4">
            <div class="pay-card" :class="emp.totalPending > 0 ? 'pay-card--pending' : 'pay-card--settled'">
              <div class="pay-card__top">
                <div class="d-flex align-center gap-3">
                  <div class="emp-avatar emp-avatar--md" :class="emp.totalPending > 0 ? 'emp-avatar--red' : 'emp-avatar--green'">
                    {{ emp.name.charAt(0).toUpperCase() }}
                  </div>
                  <div>
                    <div class="pay-card__name">{{ emp.name }}</div>
                    <div v-if="emp.phone" class="text-caption text-medium-emphasis">{{ emp.phone }}</div>
                  </div>
                </div>
                <div class="pay-status-chip" :class="emp.totalPending > 0 ? 'pay-status-chip--pending' : 'pay-status-chip--settled'">
                  {{ emp.totalPending > 0 ? 'Pending' : 'Settled' }}
                </div>
              </div>

              <div class="pay-card__stats">
                <div class="pay-stat">
                  <div class="pay-stat__label">Total Earned</div>
                  <div class="pay-stat__val">₹{{ fmt(emp.totalNet) }}</div>
                </div>
                <div class="pay-stat">
                  <div class="pay-stat__label">Total Paid</div>
                  <div class="pay-stat__val pay-stat__val--green">₹{{ fmt(emp.totalPaid) }}</div>
                </div>
                <div class="pay-stat">
                  <div class="pay-stat__label">Pending</div>
                  <div class="pay-stat__val" :class="emp.totalPending > 0 ? 'pay-stat__val--red' : 'pay-stat__val--green'">₹{{ fmt(emp.totalPending) }}</div>
                </div>
                <div class="pay-stat">
                  <div class="pay-stat__label">Deduction Bal</div>
                  <div class="pay-stat__val pay-stat__val--amber">₹{{ fmt(emp.deductionBalance) }}</div>
                </div>
              </div>

              <div class="pay-card__actions">
                <v-btn
                  size="small" color="primary" variant="tonal" rounded="lg"
                  :disabled="emp.totalPending <= 0"
                  @click="openPayDialog(emp)"
                >
                  <v-icon size="14" class="mr-1">mdi-cash-plus</v-icon> Pay Salary
                </v-btn>
                <v-btn
                  size="small" color="warning" variant="tonal" rounded="lg"
                  :disabled="emp.deductionBalance <= 0"
                  @click="openDeductDialog(emp)"
                >
                  <v-icon size="14" class="mr-1">mdi-cash-minus</v-icon> Return
                </v-btn>
                <v-btn size="small" icon="mdi-history" variant="text" color="primary" @click="openHistory(emp)" />
              </div>
            </div>
          </v-col>
        </v-row>

      </v-tabs-window-item>

      <!-- ═══ TAB 4 — PAYSLIP ═══ -->
      <v-tabs-window-item value="payslip">
        <v-card rounded="xl" elevation="0" class="border-card">
          <v-card-text class="pa-5">
            <div class="d-flex align-center flex-wrap mb-5" style="gap:16px">
              <v-select
                v-model="payslipEmpId"
                :items="employees"
                item-title="name"
                item-value="_id"
                label="Select Employee"
                density="compact"
                variant="outlined"
                hide-details
                style="max-width:260px"
              />
              <v-btn color="primary" variant="tonal" prepend-icon="mdi-magnify" :loading="loadingPayslip" @click="loadPayslip">
                Generate
              </v-btn>
              <v-btn v-if="payslipData" color="success" prepend-icon="mdi-download" @click="doDownloadPayslip">
                Download PDF
              </v-btn>
              <v-btn v-if="payslipData" color="green-darken-3" variant="tonal" prepend-icon="mdi-whatsapp" :loading="sendingWhatsapp" @click="sendViaWhatsApp">
                Send via WhatsApp
              </v-btn>
            </div>

            <div v-if="!payslipData && !loadingPayslip" class="empty-state py-8">
              <div class="empty-icon-wrap mb-3">
                <v-icon icon="mdi-file-document-outline" size="40" color="primary" />
              </div>
              <div class="text-subtitle-1 font-weight-medium mb-1">Generate Payslip</div>
              <div class="text-caption text-medium-emphasis">Select an employee above and click Generate</div>
            </div>

            <template v-if="payslipData">
              <v-divider class="mb-5" />
              <!-- Payslip Document -->
              <div class="payslip-doc">
                <div class="payslip-doc__header">
                  <div>
                    <div class="payslip-doc__company">ASHOK TEX</div>
                    <div class="payslip-doc__sub">AUTOLOOM</div>
                  </div>
                  <div class="text-right">
                    <div class="payslip-doc__badge">PAYSLIP</div>
                    <div class="payslip-doc__period">{{ selMonthLabel }} {{ selYear }}</div>
                  </div>
                </div>
                <div class="payslip-doc__emp">Employee: <strong>{{ payslipData.name }}</strong></div>

                <div class="payslip-section-title">Period-wise Salary Details</div>
              <v-table density="compact" class="payslip-table mb-5">
                <thead>
                  <tr>
                    <th>From</th>
                    <th>To</th>
                    <th class="text-right">Days</th>
                    <th class="text-right">Wage/Day</th>
                    <th class="text-right">Gross</th>
                    <th class="text-right">Deduction</th>
                    <th class="text-right">Net</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(entry, i) in payslipData.entries" :key="i">
                    <td>{{ fmtDate(entry.periodStart) }}</td>
                    <td>{{ fmtDate(entry.periodEnd) }}</td>
                    <td class="text-right">{{ entry.daysWorked }}</td>
                    <td class="text-right">₹{{ fmt(entry.dailyWage) }}</td>
                    <td class="text-right">₹{{ fmt(entry.totalWages) }}</td>
                    <td class="text-right text-error">₹{{ fmt(entry.deductionAmount) }}</td>
                    <td class="text-right font-weight-bold">₹{{ fmt(entry.netSalary) }}</td>
                  </tr>
                </tbody>
              </v-table>

                <div class="payslip-section-title">Summary</div>
              <div class="payslip-summary">
                <div v-for="row in payslipSummaryRows" :key="row.label" class="payslip-summary__row">
                  <span class="payslip-summary__label">{{ row.label }}</span>
                  <span class="payslip-summary__val" :class="row.cls">₹{{ fmt(row.value) }}</span>
                </div>
              </div>

              <div class="payslip-status" :class="payslipData.paymentStatus === 'paid' ? 'payslip-status--paid' : 'payslip-status--pending'">
                <v-icon :icon="payslipData.paymentStatus === 'paid' ? 'mdi-check-circle' : 'mdi-clock-outline'" size="16" class="mr-1" />
                {{ payslipData.paymentStatus === 'paid' ? 'FULLY PAID' :
                   payslipData.paymentStatus === 'partial' ? 'PARTIAL PAYMENT' : 'PAYMENT PENDING' }}
              </div>
              </div><!-- end payslip-doc -->
            </template>
          </v-card-text>
        </v-card>
      </v-tabs-window-item>

      <!-- ═══ TAB 5 — EMPLOYEE SUMMARY ═══ -->
      <v-tabs-window-item value="employee-summary">
        <v-card rounded="xl" elevation="0" class="border-card mb-4">
          <v-card-text>
            <v-row dense class="summary-filters-row">
              <v-col cols="12" md="3">
                <v-select
                  v-model="summaryFilters.employeeId"
                  :items="employees"
                  item-title="name"
                  item-value="_id"
                  label="Employee"
                  density="compact"
                  variant="outlined"
                  hide-details="auto"
                  rounded="lg"
                  clearable
                />
              </v-col>
              <v-col cols="12" md="3">
                <v-text-field v-model="summaryFilters.fromDate" label="From Date" type="date" density="compact" variant="outlined" hide-details="auto" rounded="lg" />
              </v-col>
              <v-col cols="12" md="3">
                <v-text-field v-model="summaryFilters.toDate" label="To Date" type="date" density="compact" variant="outlined" hide-details="auto" rounded="lg" />
              </v-col>
              <v-col cols="12" md="2">
                <v-select
                  v-model="summaryFilters.status"
                  :items="summaryStatusOptions"
                  item-title="label"
                  item-value="value"
                  label="Status"
                  density="compact"
                  variant="outlined"
                  hide-details="auto"
                  rounded="lg"
                  clearable
                />
              </v-col>
              <v-col cols="12" md="1" class="d-flex align-end summary-filter-actions">
                <v-btn color="primary" prepend-icon="mdi-magnify" :loading="summaryLoading" class="summary-filter-btn" @click="loadEmployeeDetailedSummary">Filter</v-btn>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>

        <v-card rounded="xl" elevation="0" class="border-card mb-4">
          <v-card-text>
            <div class="text-subtitle-1 font-weight-bold mb-3">Summary</div>
            <div class="summary-grid">
              <div class="summary-item"><span>Employee</span><strong>{{ employeeDetailedSummary.employeeName || '-' }}</strong></div>
              <div class="summary-item"><span>Total Days Worked</span><strong>{{ employeeDetailedSummary.totalDaysWorked || 0 }}</strong></div>
              <div class="summary-item"><span>Total Wages</span><strong>₹{{ fmt(employeeDetailedSummary.totalWages || 0) }}</strong></div>
              <div class="summary-item"><span>Deduction</span><strong>₹{{ fmt(employeeDetailedSummary.deduction || 0) }}</strong></div>
              <div class="summary-item"><span>Market</span><strong>₹{{ fmt(employeeDetailedSummary.market || 0) }}</strong></div>
              <div class="summary-item"><span>Advance</span><strong>₹{{ fmt(employeeDetailedSummary.advance || 0) }}</strong></div>
              <div class="summary-item"><span>Final Salary</span><strong>₹{{ fmt(employeeDetailedSummary.finalSalary || 0) }}</strong></div>
              <div class="summary-item"><span>Paid Amount</span><strong>₹{{ fmt(employeeDetailedSummary.paidAmount || 0) }}</strong></div>
              <div class="summary-item"><span>Balance</span><strong :class="(employeeDetailedSummary.balance || 0) > 0 ? 'text-error' : 'text-success'">₹{{ fmt(employeeDetailedSummary.balance || 0) }}</strong></div>
            </div>
          </v-card-text>
        </v-card>

        <v-card rounded="xl" elevation="0" class="border-card">
          <v-card-text>
            <div class="text-subtitle-1 font-weight-bold mb-3">Week Wise Payroll History</div>
            <div class="summary-table-wrap">
              <table class="summary-week-table">
                <thead>
                  <tr>
                    <th>Week</th>
                    <th>Mon</th>
                    <th>Tue</th>
                    <th>Wed</th>
                    <th>Thu</th>
                    <th>Fri</th>
                    <th>Sat</th>
                    <th>Sun</th>
                    <th>Total Days</th>
                    <th>Total Wages</th>
                    <th>Deduction</th>
                    <th>Market</th>
                    <th>Advance</th>
                    <th>Final Salary</th>
                    <th>Paid</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in employeeDetailedWeeks" :key="`${row.payrollId}-${row.employeeId}`">
                    <td>
                      <div class="font-weight-medium">{{ row.weekLabel || 'Week' }}</div>
                      <div class="text-caption text-medium-emphasis">{{ fmtDate(row.periodStart) }} - {{ fmtDate(row.periodEnd) }}</div>
                    </td>
                    <td>{{ dayCell(row, 1) }}</td>
                    <td>{{ dayCell(row, 2) }}</td>
                    <td>{{ dayCell(row, 3) }}</td>
                    <td>{{ dayCell(row, 4) }}</td>
                    <td>{{ dayCell(row, 5) }}</td>
                    <td>{{ dayCell(row, 6) }}</td>
                    <td>{{ dayCell(row, 0) }}</td>
                    <td>{{ row.daysWorked }}</td>
                    <td>₹{{ fmt(row.totalWages) }}</td>
                    <td>₹{{ fmt(row.deductionAmount) }}</td>
                    <td>₹{{ fmt(row.marketAmount) }}</td>
                    <td>₹{{ fmt(row.advanceAmount) }}</td>
                    <td>₹{{ fmt(row.finalSalary) }}</td>
                    <td>₹{{ fmt(row.paidAmount) }}</td>
                    <td><span class="status-badge" :class="'status-' + row.status">{{ row.status }}</span></td>
                  </tr>
                  <tr v-if="!employeeDetailedWeeks.length">
                    <td colspan="16" class="text-center py-8 text-medium-emphasis">No payroll history for selected filters.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </v-card-text>
        </v-card>
      </v-tabs-window-item>

    </v-tabs-window>

    <!-- ══ DIALOGS ══ -->

    <!-- Employee Dialog -->
    <v-dialog v-model="empDialog" max-width="420">
      <v-card rounded="xl">
        <div class="dialog-header dialog-header--blue">
          <v-icon :icon="editingEmp ? 'mdi-account-edit' : 'mdi-account-plus'" size="22" class="mr-2" />
          {{ editingEmp ? 'Edit Employee' : 'Add Employee' }}
        </div>
        <v-card-text class="px-5 pt-5 pb-2">
          <v-text-field v-model="empForm.name" label="Full Name *" density="compact" variant="outlined" rounded="lg" class="mb-3" />
          <v-text-field v-model="empForm.phone" label="Phone" density="compact" variant="outlined" rounded="lg" class="mb-3" />
          <v-text-field v-model.number="empForm.deductionPercentage" label="Deduction %" type="number" min="0" max="100" density="compact" variant="outlined" rounded="lg"
            hint="Percentage deducted from each salary run" persistent-hint />
        </v-card-text>
        <v-card-actions class="px-5 pb-5 pt-2">
          <v-spacer />
          <v-btn variant="text" rounded="lg" @click="empDialog = false">Cancel</v-btn>
          <v-btn color="primary" rounded="lg" elevation="0" :loading="loading" @click="saveEmployee">Save</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Machine Wage Master Dialog -->
    <v-dialog v-model="machineWageDialog" max-width="980" scrollable>
      <v-card rounded="xl">
        <div class="dialog-header dialog-header--blue">
          <v-icon :icon="editingMachineWage ? 'mdi-pencil-outline' : 'mdi-plus'" size="22" class="mr-2" />
          {{ editingMachineWage ? 'Edit Machine Wage Configuration' : 'Add Machine Wage Configuration' }}
        </div>
        <v-card-text class="px-5 pt-5 pb-2">
          <v-row dense>
            <v-col cols="12" md="3">
              <v-text-field v-model="machineWageForm.fromDate" label="From Date *" type="date" density="compact" variant="outlined" rounded="lg" />
            </v-col>
            <v-col cols="12" md="2">
              <v-text-field
                v-model.number="machineWageForm.minMachineCount"
                label="Min Machines *"
                type="number"
                min="3"
                max="15"
                density="compact"
                variant="outlined"
                rounded="lg"
              />
            </v-col>
            <v-col cols="12" md="2">
              <v-text-field
                v-model.number="machineWageForm.maxMachineCount"
                label="Max Machines *"
                type="number"
                min="3"
                max="15"
                density="compact"
                variant="outlined"
                rounded="lg"
              />
            </v-col>
            <v-col cols="12" md="2" class="d-flex align-center justify-end">
              <v-switch v-model="machineWageForm.isActive" label="Active" color="primary" hide-details inset />
            </v-col>
          </v-row>

          <div class="text-subtitle-2 font-weight-bold mt-2 mb-2">Machine Wage by Count</div>

          <div class="mw-range-wrap" v-if="machineWageInputColumns.length">
            <v-table density="compact">
              <thead>
                <tr>
                  <th v-for="mc in machineWageInputColumns" :key="`mw-col-${mc}`" style="min-width:120px">
                    {{ mc }} Machines
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td v-for="mc in machineWageInputColumns" :key="`mw-cell-${mc}`">
                    <v-text-field
                      v-model.number="machineWageForm.machineWages[mc]"
                      type="number"
                      min="0"
                      density="compact"
                      variant="outlined"
                      hide-details
                    />
                  </td>
                </tr>
              </tbody>
            </v-table>
          </div>
          <div v-else class="text-caption text-medium-emphasis py-2">Set valid min and max machine counts to configure wages.</div>

          <div class="text-caption text-medium-emphasis mt-2">Each wage applies from its From Date until a newer entry is added. Missing machine counts inherit from the previous active period during create.</div>
        </v-card-text>
        <v-card-actions class="px-5 pb-5 pt-2">
          <v-spacer />
          <v-btn variant="text" rounded="lg" @click="machineWageDialog = false">Cancel</v-btn>
          <v-btn color="primary" rounded="lg" elevation="0" :loading="machineWageSaving" @click="saveMachineWage">Save</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- New Run Dialog -->
    <v-dialog v-model="runDialog" width="98vw" max-width="1600" scrollable>
      <v-card rounded="xl">
        <div class="dialog-header dialog-header--green">
          <v-icon icon="mdi-calendar-plus" size="22" class="mr-2" />
          New Salary Run — {{ selMonthLabel }} {{ selYear }}
        </div>
        <v-card-text class="px-5 pt-5">
          <div class="view-toggle mb-3">
            <button :class="['toggle-btn', runEntryMode === 'period' ? 'toggle-btn--active' : '']" @click="runEntryMode = 'period'">
              <v-icon size="16" class="mr-1">mdi-calendar-range</v-icon> By Period
            </button>
            <button :class="['toggle-btn', runEntryMode === 'employee' ? 'toggle-btn--active' : '']" @click="runEntryMode = 'employee'">
              <v-icon size="16" class="mr-1">mdi-account</v-icon> By Employee
            </button>
          </div>

          <v-row class="mb-2 run-period-row" dense>
            <v-col cols="12" sm="4">
              <v-menu v-model="runFromMenu" :close-on-content-click="false" location="bottom">
                <template #activator="{ props }">
                  <v-text-field
                    v-bind="props"
                    :model-value="runForm.periodStart"
                    label="From Date *"
                    readonly
                    density="compact"
                    variant="outlined"
                    rounded="lg"
                    hide-details="auto"
                    class="run-period-field"
                  />
                </template>
                <v-date-picker
                  :model-value="runForm.periodStart"
                  first-day-of-week="1"
                  hide-header
                  @update:model-value="onRunStartDatePicked"
                />
              </v-menu>
            </v-col>
            <v-col cols="12" sm="4">
              <v-menu v-model="runToMenu" :close-on-content-click="false" location="bottom">
                <template #activator="{ props }">
                  <v-text-field
                    v-bind="props"
                    :model-value="runForm.periodEnd"
                    label="To Date *"
                    readonly
                    density="compact"
                    variant="outlined"
                    rounded="lg"
                    hide-details="auto"
                    class="run-period-field"
                  />
                </template>
                <v-date-picker
                  :model-value="runForm.periodEnd"
                  first-day-of-week="1"
                  hide-header
                  @update:model-value="onRunEndDatePicked"
                />
              </v-menu>
            </v-col>
            <v-col cols="12" sm="4">
              <v-text-field v-model="runForm.runTitle" label="Label (e.g. Week 1)" density="compact" variant="outlined" rounded="lg" hide-details="auto" class="run-period-field" />
            </v-col>
          </v-row>

          <template v-if="runEntryMode === 'period'">
            <div class="text-subtitle-2 font-weight-bold mb-2">Select Employees</div>
            <div class="run-grid-wrap">
              <v-table density="compact" class="run-input-table">
                <thead>
                  <tr class="bg-grey-lighten-4">
                    <th style="width:44px" class="sticky-left sticky-left--checkbox">
                      <v-checkbox v-model="selectAllRun" density="compact" hide-details @update:model-value="toggleAllRun" />
                    </th>
                    <th class="sticky-left" style="min-width:170px">Employee</th>
                    <th v-for="day in runDayHeaders" :key="day.key" class="text-center" style="min-width:92px">
                      {{ day.label }}
                    </th>
                    <th style="min-width:90px">Days Worked</th>
                    <th style="min-width:120px">Total Wages</th>
                    <th style="min-width:110px">Deduction</th>
                    <th style="min-width:100px">Market</th>
                    <th style="min-width:100px">Advance</th>
                    <th class="text-right" style="min-width:120px">Final Salary</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in runRows" :key="row._id">
                    <td class="sticky-left sticky-left--checkbox"><v-checkbox v-model="row.selected" density="compact" hide-details /></td>
                    <td class="font-weight-medium sticky-left">{{ row.name }}</td>
                    <td v-for="day in runDayHeaders" :key="`${row._id}-${day.key}`">
                      <v-text-field
                        v-if="row.selected"
                        :model-value="machineCellText(row, day.key)"
                        density="compact"
                        variant="outlined"
                        hide-details
                        class="run-cell-input run-cell-input--machine"
                        placeholder="0/0"
                        @update:model-value="(v) => onMachineCellInput(row, day.key, v)"
                      />
                      <span v-else class="text-medium-emphasis">—</span>
                    </td>
                    <td>
                      <v-text-field
                        v-if="row.selected"
                        v-model.number="row.daysWorked"
                        type="number"
                        min="0"
                        density="compact"
                        variant="outlined"
                        hide-details
                        class="run-cell-input run-cell-input--xs"
                        @update:model-value="() => onTotalsSeedInput(row, runDayHeaders.map((d) => d.key))"
                      />
                      <span v-else class="text-medium-emphasis">—</span>
                    </td>
                    <td>
                      <v-text-field
                        v-if="row.selected"
                        v-model.number="row.totalWages"
                        type="number"
                        min="0"
                        density="compact"
                        variant="outlined"
                        hide-details
                        class="run-cell-input"
                        @update:model-value="() => onTotalsSeedInput(row, runDayHeaders.map((d) => d.key))"
                      />
                      <span v-else class="text-medium-emphasis">—</span>
                    </td>
                    <td>
                      <v-text-field
                        v-if="row.selected"
                        v-model.number="row.deductionPercentage"
                        type="number"
                        min="0"
                        max="100"
                        density="compact"
                        variant="outlined"
                        hide-details
                        class="run-cell-input run-cell-input--sm"
                      />
                      <span v-else class="text-medium-emphasis">—</span>
                    </td>
                    <td>
                      <v-text-field
                        v-if="row.selected"
                        v-model.number="row.marketAmount"
                        type="number"
                        min="0"
                        density="compact"
                        variant="outlined"
                        hide-details
                        class="run-cell-input run-cell-input--sm"
                      />
                      <span v-else class="text-medium-emphasis">—</span>
                    </td>
                    <td>
                      <v-text-field
                        v-if="row.selected"
                        v-model.number="row.advanceAmount"
                        type="number"
                        min="0"
                        density="compact"
                        variant="outlined"
                        hide-details
                        class="run-cell-input run-cell-input--sm"
                      />
                      <span v-else class="text-medium-emphasis">—</span>
                    </td>
                    <td class="text-right font-weight-bold">
                      <span v-if="row.selected">₹{{ fmt(calcFinal(row)) }}</span>
                      <span v-else class="text-medium-emphasis">—</span>
                    </td>
                  </tr>
                </tbody>
              </v-table>
            </div>
          </template>

          <template v-else>
            <v-row dense class="mb-2">
              <v-col cols="12" md="5">
                <v-select
                  v-model="runEmployeeId"
                  :items="employees"
                  item-title="name"
                  item-value="_id"
                  label="Select Employee"
                  density="compact"
                  variant="outlined"
                  hide-details="auto"
                />
              </v-col>
            </v-row>

            <div class="run-grid-wrap" v-if="runEmployeeRows.length">
              <v-table density="compact" class="run-input-table">
                <thead>
                  <tr class="bg-grey-lighten-4">
                    <th style="min-width:190px">Week</th>
                    <th v-for="(dayName, dayIndex) in DAY_SHORT_MON_FIRST" :key="`emp-head-${dayName}`" class="text-center" style="min-width:110px">
                      {{ dayHeaderLabel(runEmployeeRows[0], dayIndex) }}
                    </th>
                    <th style="min-width:90px">Days Worked</th>
                    <th style="min-width:120px">Total Wages</th>
                    <th style="min-width:110px">Deduction</th>
                    <th style="min-width:100px">Market</th>
                    <th style="min-width:100px">Advance</th>
                    <th class="text-right" style="min-width:120px">Final Salary</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in runEmployeeRows" :key="row.periodStart">
                    <td>
                      <div class="font-weight-medium">{{ row.runTitle }}</div>
                      <div class="text-caption text-medium-emphasis">{{ fmtDate(row.periodStart) }} - {{ fmtDate(row.periodEnd) }}</div>
                    </td>
                    <td v-for="(_, dayIndex) in DAY_SHORT_MON_FIRST" :key="`${row.periodStart}-day-${dayIndex}`">
                      <v-text-field
                        :model-value="machineCellText(row, weekDayKey(row, dayIndex))"
                        density="compact"
                        variant="outlined"
                        hide-details
                        class="run-cell-input run-cell-input--machine"
                        placeholder="0/0"
                        @update:model-value="(v) => onMachineCellInput(row, weekDayKey(row, dayIndex), v)"
                      />
                    </td>
                    <td>
                      <v-text-field
                        v-model.number="row.daysWorked"
                        type="number"
                        min="0"
                        density="compact"
                        variant="outlined"
                        hide-details
                        class="run-cell-input run-cell-input--xs"
                        @update:model-value="() => onTotalsSeedInput(row, DAY_SHORT_MON_FIRST.map((_, idx) => weekDayKey(row, idx)))"
                      />
                    </td>
                    <td>
                      <v-text-field
                        v-model.number="row.totalWages"
                        type="number"
                        min="0"
                        density="compact"
                        variant="outlined"
                        hide-details
                        class="run-cell-input"
                        @update:model-value="() => onTotalsSeedInput(row, DAY_SHORT_MON_FIRST.map((_, idx) => weekDayKey(row, idx)))"
                      />
                    </td>
                    <td>
                      <v-text-field
                        v-model.number="row.deductionPercentage"
                        type="number"
                        min="0"
                        max="100"
                        density="compact"
                        variant="outlined"
                        hide-details
                        class="run-cell-input run-cell-input--sm"
                      />
                    </td>
                    <td>
                      <v-text-field
                        v-model.number="row.marketAmount"
                        type="number"
                        min="0"
                        density="compact"
                        variant="outlined"
                        hide-details
                        class="run-cell-input run-cell-input--sm"
                      />
                    </td>
                    <td>
                      <v-text-field
                        v-model.number="row.advanceAmount"
                        type="number"
                        min="0"
                        density="compact"
                        variant="outlined"
                        hide-details
                        class="run-cell-input run-cell-input--sm"
                      />
                    </td>
                    <td class="text-right font-weight-bold">₹{{ fmt(calcFinal(row)) }}</td>
                  </tr>
                </tbody>
              </v-table>
            </div>
            <div v-else class="text-caption text-medium-emphasis py-4">Select an employee to view week rows for the selected Monday-Sunday range.</div>
          </template>

          <div class="run-total-bar">Total Net: <strong>₹{{ fmt(runTotalNet) }}</strong></div>
        </v-card-text>
        <v-card-actions class="px-5 pb-5">
          <v-spacer />
          <v-btn variant="text" rounded="lg" @click="runDialog = false">Cancel</v-btn>
          <v-btn color="success" rounded="lg" elevation="0" :loading="loading" @click="saveRun">Create Run</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Edit Run Dialog -->
    <v-dialog v-model="editRunDialog" width="98vw" max-width="1600" scrollable>
      <v-card rounded="xl">
        <div class="dialog-header dialog-header--blue">
          <v-icon icon="mdi-pencil-outline" size="22" class="mr-2" />
          Edit Salary Run
        </div>
        <v-card-text class="px-5 pt-5 pb-5">
          <v-row class="mb-3 run-period-row" dense>
            <v-col cols="12" sm="4">
              <v-text-field v-model="editRunForm.periodStart" label="From Date *" type="date" density="compact" variant="outlined" rounded="lg" hide-details="auto" class="run-period-field" />
            </v-col>
            <v-col cols="12" sm="4">
              <v-text-field v-model="editRunForm.periodEnd" label="To Date *" type="date" density="compact" variant="outlined" rounded="lg" hide-details="auto" class="run-period-field" />
            </v-col>
            <v-col cols="12" sm="4">
              <v-text-field v-model="editRunForm.runTitle" label="Label (e.g. Week 1)" density="compact" variant="outlined" rounded="lg" hide-details="auto" class="run-period-field" />
            </v-col>
          </v-row>

          <div class="text-subtitle-2 font-weight-bold mb-2">Employee Details</div>
          <div class="run-grid-wrap">
            <v-table density="compact" class="run-input-table">
              <thead>
                <tr class="bg-grey-lighten-4">
                  <th class="sticky-left" style="min-width:160px">Employee</th>
                  <th v-for="day in editRunDayHeaders" :key="day.key" class="text-center" style="min-width:100px">
                    {{ day.label }}
                  </th>
                  <th style="min-width:90px">Days Worked</th>
                  <th style="min-width:120px">Total Wages</th>
                  <th style="min-width:110px">Deduction %</th>
                  <th style="min-width:100px">Market</th>
                  <th style="min-width:100px">Advance</th>
                  <th class="text-right" style="min-width:120px">Final Salary</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in editRunRows" :key="row.employeeId">
                  <td class="font-weight-medium sticky-left">{{ row.name }}</td>
                  <td v-for="day in editRunDayHeaders" :key="`edit-${row.employeeId}-${day.key}`">
                    <v-text-field
                      :model-value="machineCellText(row, day.key)"
                      density="compact"
                      variant="outlined"
                      hide-details
                      class="run-cell-input run-cell-input--machine"
                      placeholder="0/0"
                      @update:model-value="(v) => onMachineCellInput(row, day.key, v)"
                    />
                  </td>
                  <td>
                    <v-text-field v-model.number="row.daysWorked" type="number" min="0"
                      density="compact" variant="outlined" hide-details class="run-cell-input run-cell-input--xs"
                      @update:model-value="() => onTotalsSeedInput(row, editRunDayHeaders.map((d) => d.key))" />
                  </td>
                  <td>
                    <v-text-field v-model.number="row.totalWages" type="number" min="0"
                      density="compact" variant="outlined" hide-details class="run-cell-input"
                      @update:model-value="() => onTotalsSeedInput(row, editRunDayHeaders.map((d) => d.key))" />
                  </td>
                  <td>
                    <v-text-field v-model.number="row.deductionPercentage" type="number" min="0" max="100"
                      density="compact" variant="outlined" hide-details class="run-cell-input run-cell-input--sm" />
                  </td>
                  <td>
                    <v-text-field v-model.number="row.marketAmount" type="number" min="0"
                      density="compact" variant="outlined" hide-details class="run-cell-input run-cell-input--sm" />
                  </td>
                  <td>
                    <v-text-field v-model.number="row.advanceAmount" type="number" min="0"
                      density="compact" variant="outlined" hide-details class="run-cell-input run-cell-input--sm" />
                  </td>
                  <td class="text-right font-weight-bold">₹{{ fmt(calcFinal(row)) }}</td>
                </tr>
              </tbody>
            </v-table>
          </div>
          <div class="text-caption text-medium-emphasis mt-2">
            Amounts already paid are preserved. Old records without machine data are auto-filled (Mon–Sat, 4 machines, wage distributed evenly). Adjust as needed before saving.
          </div>
        </v-card-text>
        <v-card-actions class="px-5 pb-5">
          <v-spacer />
          <v-btn variant="text" rounded="lg" @click="editRunDialog = false">Cancel</v-btn>
          <v-btn color="primary" rounded="lg" elevation="0" :loading="loading" @click="saveEditRun">Save Changes</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Pay Salary Dialog -->
    <v-dialog v-model="payDialog" max-width="420">
      <v-card rounded="xl">
        <div class="dialog-header dialog-header--green">
          <v-icon icon="mdi-cash-plus" size="22" class="mr-2" />
          Record Salary Payment
        </div>
        <v-card-text class="px-5 pt-5 pb-2">
          <div class="payment-info-box mb-4">
            <div class="payment-info-row">
              <span>Employee</span><strong>{{ payTarget?.name }}</strong>
            </div>
            <div class="payment-info-row payment-info-row--red">
              <span>Total Pending</span><strong>₹{{ fmt(payTarget?.totalPending) }}</strong>
            </div>
          </div>
          <v-text-field v-model.number="payForm.amount" label="Amount (Rs.) *" type="number" min="0" density="compact" variant="outlined" rounded="lg" class="mb-3" />
          <v-select v-model="payForm.method" :items="PAYMENT_METHODS" label="Payment Method" density="compact" variant="outlined" rounded="lg" class="mb-3" />
          <v-textarea v-model="payForm.notes" label="Notes" rows="2" density="compact" variant="outlined" rounded="lg" />
        </v-card-text>
        <v-card-actions class="px-5 pb-5 pt-2">
          <v-spacer />
          <v-btn variant="text" rounded="lg" @click="payDialog = false">Cancel</v-btn>
          <v-btn color="success" rounded="lg" elevation="0" :loading="loading" @click="recordPayment">Record</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Return Deduction Dialog -->
    <v-dialog v-model="deductDialog" max-width="420">
      <v-card rounded="xl">
        <div class="dialog-header dialog-header--amber">
          <v-icon icon="mdi-cash-minus" size="22" class="mr-2" />
          Return Deduction to Employee
        </div>
        <v-card-text class="px-5 pt-5 pb-2">
          <div class="payment-info-box mb-4">
            <div class="payment-info-row">
              <span>Employee</span><strong>{{ deductTarget?.name }}</strong>
            </div>
            <div class="payment-info-row payment-info-row--amber">
              <span>Deduction Balance</span><strong>₹{{ fmt(deductTarget?.deductionBalance) }}</strong>
            </div>
          </div>
          <v-text-field v-model.number="deductForm.amount" label="Amount to Return (Rs.) *" type="number" min="0" density="compact" variant="outlined" rounded="lg" class="mb-3" />
          <v-select v-model="deductForm.method" :items="PAYMENT_METHODS" label="Payment Method" density="compact" variant="outlined" rounded="lg" class="mb-3" />
          <v-textarea v-model="deductForm.notes" label="Notes" rows="2" density="compact" variant="outlined" rounded="lg" />
        </v-card-text>
        <v-card-actions class="px-5 pb-5 pt-2">
          <v-spacer />
          <v-btn variant="text" rounded="lg" @click="deductDialog = false">Cancel</v-btn>
          <v-btn color="warning" rounded="lg" elevation="0" :loading="loading" @click="recordDeductReturn">Record</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Payment History Dialog -->
    <v-dialog v-model="historyDialog" max-width="600" scrollable>
      <v-card rounded="xl">
        <div class="dialog-header dialog-header--blue">
          <v-icon icon="mdi-history" size="22" class="mr-2" />
          Payment History — {{ historyEmp?.name }}
        </div>
        <v-card-text class="px-5 pt-4">
          <div v-if="loadingHistory" class="text-center pa-6">
            <v-progress-circular indeterminate color="primary" size="36" />
          </div>
          <v-table v-else-if="paymentHistory.length" density="compact" class="history-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th class="text-right">Amount</th>
                <th>Method</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="h in paymentHistory" :key="h._id">
                <td class="text-no-wrap">{{ fmtDate(h.paymentDate) }}</td>
                <td>
                  <span class="type-badge" :class="h.paymentType === 'deduction_return' ? 'type-badge--amber' : 'type-badge--green'">
                    {{ h.paymentType === 'deduction_return' ? 'Deduction Return' : 'Salary' }}
                  </span>
                </td>
                <td class="text-right font-weight-medium">₹{{ fmt(h.amountPaid) }}</td>
                <td class="text-capitalize">{{ h.paymentMethod }}</td>
                <td class="text-caption text-medium-emphasis">{{ h.notes || '—' }}</td>
              </tr>
            </tbody>
          </v-table>
          <div v-else class="empty-state py-6">
            <div class="empty-icon-wrap mb-2">
              <v-icon icon="mdi-history" size="32" color="primary" />
            </div>
            <div class="text-caption text-medium-emphasis">No payment history yet</div>
          </div>
        </v-card-text>
        <v-card-actions class="px-5 pb-5">
          <v-spacer />
          <v-btn variant="tonal" color="primary" rounded="lg" @click="historyDialog = false">Close</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Confirm Dialog -->
    <v-dialog v-model="confirmDialog" max-width="400">
      <v-card rounded="xl">
        <div class="dialog-header dialog-header--red">
          <v-icon icon="mdi-alert-outline" size="22" class="mr-2" />
          Confirm Delete
        </div>
        <v-card-text class="px-5 pt-4 pb-2 text-body-2">{{ confirmMessage }}</v-card-text>
        <v-card-actions class="px-5 pb-5">
          <v-spacer />
          <v-btn variant="text" rounded="lg" @click="confirmDialog = false">Cancel</v-btn>
          <v-btn color="error" rounded="lg" elevation="0" @click="confirmAction">Delete</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Snackbar -->
    <v-snackbar v-model="snack.show" :color="snack.color" :timeout="3000" location="bottom right" rounded="lg">
      {{ snack.text }}
    </v-snackbar>

  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import api from '@/plugins/axios'
import { downloadPayslip as downloadPayslipPdf, payslipBlob } from '@/utils/payslipPdf'

// ── Constants ──────────────────────────────────────────────────────────────────
const MONTHS = [
  { value: 1, label: 'January' },  { value: 2, label: 'February' },
  { value: 3, label: 'March' },    { value: 4, label: 'April' },
  { value: 5, label: 'May' },      { value: 6, label: 'June' },
  { value: 7, label: 'July' },     { value: 8, label: 'August' },
  { value: 9, label: 'September' },{ value: 10, label: 'October' },
  { value: 11, label: 'November' },{ value: 12, label: 'December' },
]
const now  = new Date()
const YEARS = Array.from({ length: 6 }, (_, i) => now.getFullYear() - 2 + i)
const PAYMENT_METHODS = ['cash', 'transfer', 'check', 'other']
const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const DAY_SHORT_MON_FIRST = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const machineCounts = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]

// ── State ──────────────────────────────────────────────────────────────────────
const selMonth = ref(now.getMonth() + 1)
const selYear  = ref(now.getFullYear())
const activeTab = ref('employees')
const loading   = ref(false)

const employees       = ref([])
const monthRuns       = ref([])
const employeeSummary = ref([])
const paymentHistory  = ref([])
const machineWageRows = ref([])

const loadingRuns    = ref(false)
const loadingSummary  = ref(false)
const loadingPayslip  = ref(false)
const loadingHistory  = ref(false)
const summaryLoadError = ref(false)
const machineWageSaving = ref(false)
const summaryLoading = ref(false)

const runsView = ref('employee')
const runEntryMode = ref('period')

const machineWageDialog = ref(false)
const editingMachineWage = ref(null)
const machineWageForm = ref({
  fromDate: '',
  minMachineCount: 3,
  maxMachineCount: 3,
  machineWages: {},
  isActive: true,
})

const summaryFilters = ref({
  employeeId: null,
  fromDate: '',
  toDate: '',
  status: null,
})
const summaryStatusOptions = [
  { label: 'Pending', value: 'pending' },
  { label: 'Partial', value: 'partial' },
  { label: 'Paid', value: 'paid' },
]
const employeeDetailedSummary = ref({})
const employeeDetailedWeeks = ref([])

const snack = ref({ show: false, text: '', color: 'success' })

const confirmDialog  = ref(false)
const confirmMessage = ref('')
const confirmAction  = ref(() => {})

// ── Computed ───────────────────────────────────────────────────────────────────
const selMonthLabel = computed(() => MONTHS.find(m => m.value === selMonth.value)?.label || '')

const empHeaders = [
  { title: 'Name',        key: 'name',                minWidth: '160px' },
  { title: 'Phone',       key: 'phone',               minWidth: '130px' },
  { title: 'Deduction %', key: 'deductionPercentage', align: 'center', width: '120px' },
  { title: '',            key: 'actions',             sortable: false, align: 'end', width: '100px' },
]

const totalPending   = computed(() => employeeSummary.value.reduce((s, e) => s + (e.totalPending || 0), 0))
const totalDeductBal = computed(() => employeeSummary.value.reduce((s, e) => s + (e.deductionBalance || 0), 0))
const monthNetTotal  = computed(() => monthRuns.value.reduce((s, r) => s + runNet(r), 0))

const summaryCards = computed(() => [
  { label: 'Active Employees',          value: employees.value.length,            color: 'primary' },
  { label: 'Total Pending (All Months)',value: `Rs.${fmt(totalPending.value)}`,   color: 'error'   },
  { label: `${selMonthLabel.value} Net`,value: `Rs.${fmt(monthNetTotal.value)}`,  color: 'success' },
  { label: 'Deduction Balance',         value: `Rs.${fmt(totalDeductBal.value)}`, color: 'warning' },
])

// Group runs by employee (for By-Employee view)
const monthEmpSummary = computed(() => {
  const map = {}
  monthRuns.value.forEach(run => {
    run.employees.forEach(emp => {
      const id = emp.employeeId?.toString() || emp.name
      if (!map[id]) {
        map[id] = {
          employeeId: id, name: emp.name, periods: [],
          totalWages: 0, deductionAmount: 0, netSalary: 0, amountPaid: 0, amountPending: 0,
        }
      }
      map[id].periods.push({
        periodStart: run.periodStart, periodEnd: run.periodEnd,
        daysWorked: emp.daysWorked, dailyWage: emp.dailyWage,
        totalWages: emp.totalWages, deductionAmount: emp.deductionAmount,
        netSalary: emp.netSalary,
        marketAmount: emp.marketAmount || 0,
        advanceAmount: emp.advanceAmount || 0,
        finalSalary: emp.finalSalary || emp.netSalary,
        amountPaid: emp.amountPaid,
        paymentStatus: emp.paymentStatus || 'pending',
        runTitle: run.runTitle || '',
        dailyEntries: Array.isArray(emp.dailyEntries) ? emp.dailyEntries : [],
      })
      map[id].totalWages      += emp.totalWages      || 0
      map[id].deductionAmount += emp.deductionAmount || 0
      map[id].netSalary       += (emp.finalSalary || emp.netSalary) || 0
      map[id].amountPaid      += emp.amountPaid      || 0
      map[id].amountPending   += emp.amountPending   || 0
    })
  })
  return Object.values(map)
})

const runDayHeaders = computed(() => {
  if (!runForm.value.periodStart || !runForm.value.periodEnd) return []
  const start = new Date(runForm.value.periodStart)
  const end = new Date(runForm.value.periodEnd)
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) return []
  const rows = []
  const cur = new Date(start)
  while (cur <= end) {
    const key = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}-${String(cur.getDate()).padStart(2, '0')}`
    rows.push({
      key,
      label: `${DAY_SHORT[cur.getDay()]} (${String(cur.getDate()).padStart(2, '0')}-${String(cur.getMonth() + 1).padStart(2, '0')})`,
      weekday: cur.getDay(),
    })
    cur.setDate(cur.getDate() + 1)
  }
  return rows
})

const runEmployeeTarget = computed(() =>
  employees.value.find((e) => String(e._id) === String(runEmployeeId.value || '')) || null
)

const runEmployeeFinalTotal = computed(() =>
  runEmployeeRows.value.reduce((sum, row) => sum + calcFinal(row), 0)
)

// ── Helpers ────────────────────────────────────────────────────────────────────
const fmt = (num) => new Intl.NumberFormat('en-IN').format(Math.round(Number(num) || 0))

const fmtDate = (date) => {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

const runNet = (run) => run.employees.reduce((s, e) => s + (e.netSalary || 0), 0)

const statusColor = (s) => ({ paid: 'success', partial: 'warning', pending: 'error' }[s] || 'default')

const rowTotalWages = (row) => toNumber(row.totalWages)

const calcNet = (row) => {
  const gross = rowTotalWages(row)
  const deduction = Math.round(gross * (toNumber(row.deductionPercentage) / 100))
  return gross - deduction
}

const calcFinal = (row) => {
  const net = calcNet(row)
  const market = toNumber(row.marketAmount)
  const advance = toNumber(row.advanceAmount)
  return Math.max(0, net - market - advance)
}

function toNumber(v) {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

function toInputDate(d) {
  const dt = new Date(d)
  if (isNaN(dt.getTime())) return ''
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
}

function parseDateOnly(v) {
  const dt = new Date(v)
  if (isNaN(dt.getTime())) return null
  dt.setHours(0, 0, 0, 0)
  return dt
}

function startOfWeekMonday(v) {
  const dt = parseDateOnly(v)
  if (!dt) return null
  const dow = dt.getDay()
  const diff = dow === 0 ? -6 : 1 - dow
  dt.setDate(dt.getDate() + diff)
  return dt
}

function endOfWeekSunday(v) {
  const start = startOfWeekMonday(v)
  if (!start) return null
  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  end.setHours(23, 59, 59, 999)
  return end
}

function enforcePeriodWeekFrom(dateStr) {
  const mon = startOfWeekMonday(dateStr)
  const sun = endOfWeekSunday(dateStr)
  if (!mon || !sun) return
  syncingRunWeek.value = true
  runForm.value.periodStart = toInputDate(mon)
  runForm.value.periodEnd = toInputDate(sun)
  syncingRunWeek.value = false
}

function enforceEmployeeWeekRange() {
  const from = startOfWeekMonday(runForm.value.periodStart)
  const to = endOfWeekSunday(runForm.value.periodEnd || runForm.value.periodStart)
  if (!from || !to) return
  syncingRunWeek.value = true
  runForm.value.periodStart = toInputDate(from)
  runForm.value.periodEnd = toInputDate(to)
  syncingRunWeek.value = false
}

function getMachineWageFromRanges(cfg, machineCount) {
  const mc = Math.round(toNumber(machineCount))
  if (!Array.isArray(cfg?.machineRanges)) return null
  const range = cfg.machineRanges.find((r) => {
    const min = Math.round(toNumber(r?.minMachineCount))
    const max = Math.round(toNumber(r?.maxMachineCount))
    return mc >= min && mc <= max
  })
  if (!range) return null
  return toNumber(range.wageAmount)
}

function machineWageForDate(dateStr, machineCount) {
  const mc = Math.round(toNumber(machineCount))
  if (!mc || mc < 3 || mc > 15) return { wage: 0, configId: null }
  const target = new Date(dateStr)
  target.setHours(12, 0, 0, 0)
  // Find the config with the most recent fromDate on or before the target date.
  // machineWageRows is sorted fromDate DESC so the first match is the active one.
  const row = machineWageRows.value.find((cfg) => {
    if (!cfg?.isActive) return false
    const from = new Date(cfg.fromDate)
    from.setHours(0, 0, 0, 0)
    return target >= from
  })
  if (!row) return { wage: 0, configId: null }
  const fromRanges = getMachineWageFromRanges(row, mc)
  if (fromRanges !== null) return { wage: fromRanges, configId: row._id }
  const field = `machine${mc}Wage`
  return { wage: toNumber(row[field]), configId: row._id }
}

function machineCellText(row, dateKey) {
  const entry = row.dailyEntries?.[dateKey]
  if (!entry) return ''
  if (!toNumber(entry.machineCount) && !toNumber(entry.wage)) return ''
  return `${toNumber(entry.machineCount)}/${toNumber(entry.wage)}`
}

function refreshRowFromDailyEntries(row) {
  const entries = Object.values(row.dailyEntries || {})
  const daysWorked = entries.reduce((sum, entry) => sum + (toNumber(entry.machineCount) > 0 ? 1 : 0), 0)
  const totalWages = entries.reduce((sum, entry) => sum + toNumber(entry.wage), 0)
  row.daysWorked = daysWorked
  if (!row.totalWagesManual) {
    row.totalWages = totalWages
  }
}

function autoPopulateFromTotals(row, dayKeys = []) {
  if (!row || !Array.isArray(dayKeys) || !dayKeys.length) return
  const validKeys = dayKeys.filter(Boolean)
  if (!validKeys.length) return
  const days = Math.max(0, Math.round(toNumber(row.daysWorked)))
  const total = Math.max(0, Math.round(toNumber(row.totalWages)))
  if (!days || !total) return

  const fillDays = Math.min(days, validKeys.length)
  const base = Math.floor(total / fillDays)
  let remainder = total - (base * fillDays)
  const nextEntries = {}
  for (let i = 0; i < validKeys.length; i += 1) {
    const key = validKeys[i]
    if (i >= fillDays) continue
    const wage = base + (remainder > 0 ? 1 : 0)
    if (remainder > 0) remainder -= 1
    nextEntries[key] = {
      date: key,
      machineCount: 4,
      wage,
      wageSource: 'manual',
      masterConfigId: null,
    }
  }

  row.totalWagesManual = false
  row.dailyEntries = nextEntries
  refreshRowFromDailyEntries(row)
}

function onTotalsSeedInput(row, dayKeys = []) {
  autoPopulateFromTotals(row, dayKeys)
}

function onMachineCellInput(row, dateKey, value) {
  if (!row.dailyEntries) row.dailyEntries = {}
  const str = String(value || '').trim()
  if (!str) {
    const nextEntries = { ...row.dailyEntries }
    delete nextEntries[dateKey]
    row.dailyEntries = nextEntries
    refreshRowFromDailyEntries(row)
    return
  }
  const parts = str.split('/')
  const machineCount = Math.max(0, Math.min(15, Math.round(toNumber(parts[0]))))
  const currentEntry = row.dailyEntries[dateKey] || {}
  const resolved = machineWageForDate(dateKey, machineCount)
  const hasExplicitWage = parts.length > 1 && parts[1].trim() !== ''
  let wage = resolved.wage
  let wageSource = 'master'
  if (hasExplicitWage) {
    wage = Math.max(0, toNumber(parts[1]))
    if (Math.round(wage) !== Math.round(resolved.wage)) wageSource = 'manual'
  } else if (!wage && toNumber(currentEntry.wage) > 0) {
    wage = toNumber(currentEntry.wage)
    wageSource = currentEntry.wageSource || 'manual'
  }
  row.dailyEntries = {
    ...row.dailyEntries,
    [dateKey]: {
      date: dateKey,
      machineCount,
      wage,
      wageSource,
      masterConfigId: resolved.configId,
    },
  }
  refreshRowFromDailyEntries(row)
}

function dayCell(row, weekday) {
  const entries = resolveDisplayDailyEntries(row)
  const found = entries.find((entry) => {
    const dt = new Date(entry.date)
    return !isNaN(dt.getTime()) && dt.getDay() === weekday
  })
  if (!found) return '-'
  return `${toNumber(found.machineCount)} / ₹${fmt(found.wage)}`
}

function periodDayCell(emp, run, weekday) {
  return dayCell({ ...emp, periodStart: run.periodStart }, weekday)
}

function buildHistoricalEntries(periodStart, daysWorked, totalWages) {
  const start = startOfWeekMonday(periodStart)
  const days = Math.min(7, Math.max(0, Math.round(toNumber(daysWorked))))
  const total = Math.max(0, Math.round(toNumber(totalWages)))
  if (!start || !days || !total) return []
  const base = Math.floor(total / days)
  let remainder = total - (base * days)
  const entries = []
  for (let i = 0; i < days; i += 1) {
    const dt = new Date(start)
    dt.setDate(start.getDate() + i)
    const wage = base + (remainder > 0 ? 1 : 0)
    if (remainder > 0) remainder -= 1
    entries.push({
      date: toInputDate(dt),
      machineCount: 4,
      wage,
      wageSource: 'manual',
      masterConfigId: null,
    })
  }
  return entries
}

function resolveDisplayDailyEntries(row) {
  const entries = Array.isArray(row?.dailyEntries) ? row.dailyEntries : []
  if (entries.length) return entries
  return buildHistoricalEntries(row?.periodStart, row?.daysWorked, row?.totalWages)
}

const notify = (text, color = 'success') => { snack.value = { show: true, text, color } }

function askConfirm(message, action) {
  confirmMessage.value = message
  confirmAction.value  = async () => { confirmDialog.value = false; await action() }
  confirmDialog.value  = true
}

// ── Data Loading ───────────────────────────────────────────────────────────────
async function loadEmployees() {
  try {
    const res = await api.get('/payroll/employees')
    employees.value = res.data.data || []
  } catch {
    notify('Failed to load employees', 'error')
  }
}

async function loadMonthRuns() {
  loadingRuns.value = true
  try {
    const res = await api.get(`/payroll/history/${selMonth.value}/${selYear.value}`)
    monthRuns.value = res.data.data || []
  } catch {
    notify('Failed to load salary runs', 'error')
  } finally {
    loadingRuns.value = false
  }
}

async function loadEmployeeSummary() {
  loadingSummary.value   = true
  summaryLoadError.value = false
  try {
    const res = await api.get('/payroll/employees/summary')
    employeeSummary.value = res.data.data || []
  } catch {
    summaryLoadError.value = true
  } finally {
    loadingSummary.value = false
  }
}

async function loadMachineWages() {
  try {
    const res = await api.get('/payroll/machine-wage-master')
    machineWageRows.value = res.data.data || []
  } catch {
    notify('Failed to load machine wage master', 'error')
  }
}

async function loadEmployeeDetailedSummary() {
  summaryLoading.value = true
  try {
    const res = await api.get('/payroll/employee-summary', {
      params: {
        employeeId: summaryFilters.value.employeeId || undefined,
        fromDate: summaryFilters.value.fromDate || undefined,
        toDate: summaryFilters.value.toDate || undefined,
        status: summaryFilters.value.status || undefined,
      },
    })
    employeeDetailedSummary.value = res.data?.data?.summary || {}
    employeeDetailedWeeks.value = res.data?.data?.weeks || []
  } catch {
    employeeDetailedSummary.value = {}
    employeeDetailedWeeks.value = []
    notify('Failed to load employee summary', 'error')
  } finally {
    summaryLoading.value = false
  }
}

// ── Watchers ───────────────────────────────────────────────────────────────────
watch([selMonth, selYear], () => {
  loadMonthRuns()
  if (payslipData.value) payslipData.value = null
})

watch(activeTab, (tab) => {
  if (tab === 'payments') loadEmployeeSummary()
  if (tab === 'runs')     loadMonthRuns()
  if (tab === 'machine-wage') loadMachineWages()
  if (tab === 'employee-summary') loadEmployeeDetailedSummary()
})

// ── Employees ──────────────────────────────────────────────────────────────────
const empDialog  = ref(false)
const editingEmp = ref(null)
const empForm    = ref({ name: '', phone: '', deductionPercentage: 0 })

function openEmpDialog(emp = null) {
  editingEmp.value = emp
  empForm.value = emp
    ? { name: emp.name, phone: emp.phone || '', deductionPercentage: emp.deductionPercentage || 0 }
    : { name: '', phone: '', deductionPercentage: 0 }
  empDialog.value = true
}

async function saveEmployee() {
  if (!empForm.value.name.trim()) return notify('Name is required', 'error')
  loading.value = true
  try {
    if (editingEmp.value) {
      await api.put(`/payroll/employees/${editingEmp.value._id}`, empForm.value)
      notify('Employee updated')
    } else {
      await api.post('/payroll/employees', empForm.value)
      notify('Employee added')
    }
    empDialog.value = false
    await Promise.all([loadEmployees(), loadEmployeeSummary()])
  } catch (e) {
    notify(e.response?.data?.error || 'Failed to save employee', 'error')
  } finally {
    loading.value = false
  }
}

function confirmDeleteEmp(emp) {
  askConfirm(
    `Delete "${emp.name}" and all their payroll data? This cannot be undone.`,
    async () => {
      try {
        await api.delete(`/payroll/employees/${emp._id}`)
        notify('Employee deleted')
        await Promise.all([loadEmployees(), loadEmployeeSummary()])
      } catch (e) {
        notify(e.response?.data?.error || 'Failed to delete employee', 'error')
      }
    }
  )
}

function machineRangesFromCfg(cfg) {
  if (Array.isArray(cfg?.machineRanges) && cfg.machineRanges.length) {
    return cfg.machineRanges
      .map((r) => ({
        minMachineCount: Math.max(3, Math.round(toNumber(r?.minMachineCount))),
        maxMachineCount: Math.min(15, Math.round(toNumber(r?.maxMachineCount))),
        wageAmount: Math.max(0, toNumber(r?.wageAmount)),
      }))
      .filter((r) => r.maxMachineCount >= r.minMachineCount)
      .sort((a, b) => a.minMachineCount - b.minMachineCount)
  }
  const rows = []
  for (let mc = 3; mc <= 15; mc += 1) {
    const wage = Math.max(0, toNumber(cfg?.[`machine${mc}Wage`]))
    if (!wage) continue
    rows.push({ minMachineCount: mc, maxMachineCount: mc, wageAmount: wage })
  }
  return rows
}

function machineMapFromCfg(cfg) {
  const map = {}
  const ranges = machineRangesFromCfg(cfg)
  ranges.forEach((r) => {
    for (let mc = r.minMachineCount; mc <= r.maxMachineCount; mc += 1) {
      map[mc] = Math.max(0, toNumber(r.wageAmount))
    }
  })
  return map
}

const machineWageInputColumns = computed(() => {
  const min = Math.max(3, Math.round(toNumber(machineWageForm.value.minMachineCount)))
  const max = Math.min(15, Math.round(toNumber(machineWageForm.value.maxMachineCount)))
  if (max < min) return []
  const out = []
  for (let mc = min; mc <= max; mc += 1) out.push(mc)
  return out
})

watch(() => [machineWageForm.value.minMachineCount, machineWageForm.value.maxMachineCount], () => {
  const min = Math.max(3, Math.round(toNumber(machineWageForm.value.minMachineCount)))
  const max = Math.min(15, Math.round(toNumber(machineWageForm.value.maxMachineCount)))
  machineWageForm.value.minMachineCount = min
  machineWageForm.value.maxMachineCount = Math.max(min, max)
  if (!machineWageForm.value.machineWages) machineWageForm.value.machineWages = {}
  for (let mc = machineWageForm.value.minMachineCount; mc <= machineWageForm.value.maxMachineCount; mc += 1) {
    if (machineWageForm.value.machineWages[String(mc)] === undefined) {
      machineWageForm.value.machineWages[String(mc)] = 0
    }
  }
})

function machineWageSummary(cfg) {
  const ranges = machineRangesFromCfg(cfg)
  if (!ranges.length) return 'No wages configured'
  return ranges
    .map((r) => `${r.minMachineCount}-${r.maxMachineCount}: ₹${fmt(r.wageAmount)}`)
    .join(', ')
}

function openMachineWageDialog(row = null) {
  editingMachineWage.value = row
  if (!row) {
    const latest = [...machineWageRows.value]
      .filter((r) => r?.isActive)
      .sort((a, b) => new Date(b.fromDate) - new Date(a.fromDate))[0]
    const nextFrom = toInputDate(new Date(Date.now() + 24 * 60 * 60 * 1000))
    machineWageForm.value = {
      fromDate: nextFrom,
      minMachineCount: 3,
      maxMachineCount: 3,
      machineWages: latest ? machineMapFromCfg(latest) : { 3: 0 },
      isActive: true,
    }
  } else {
    const machineMap = machineMapFromCfg(row)
    const machineKeys = Object.keys(machineMap).map((k) => Number(k)).filter((k) => Number.isFinite(k))
    const min = machineKeys.length ? Math.min(...machineKeys) : 3
    const max = machineKeys.length ? Math.max(...machineKeys) : 3
    machineWageForm.value = {
      fromDate: toInputDate(row.fromDate),
      minMachineCount: min,
      maxMachineCount: max,
      machineWages: machineMap,
      isActive: row.isActive !== false,
    }
  }
  machineWageDialog.value = true
}

async function saveMachineWage() {
  const f = machineWageForm.value
  if (!f.fromDate) return notify('From Date is required', 'error')
  const min = Math.max(3, Math.round(toNumber(f.minMachineCount)))
  const max = Math.min(15, Math.round(toNumber(f.maxMachineCount)))
  if (max < min) return notify('Maximum Machine Count must be greater than or equal to Minimum Machine Count', 'error')

  const machineRanges = []
  for (let mc = min; mc <= max; mc += 1) {
    const wage = Math.max(0, Math.round(toNumber(f.machineWages?.[mc])))
    if (wage <= 0) return notify(`Enter wage amount for ${mc} machines`, 'error')
    machineRanges.push({ minMachineCount: mc, maxMachineCount: mc, wageAmount: wage })
  }

  machineWageSaving.value = true
  try {
    const payload = {
      fromDate: f.fromDate,
      toDate: f.fromDate,
      machineRanges,
      isActive: !!f.isActive,
    }
    if (editingMachineWage.value) {
      await api.put(`/payroll/machine-wage-master/${editingMachineWage.value._id}`, payload)
      notify('Machine wage configuration updated')
    } else {
      await api.post('/payroll/machine-wage-master', payload)
      notify('Machine wage configuration created')
    }
    machineWageDialog.value = false
    await loadMachineWages()
  } catch (e) {
    notify(e.response?.data?.error || 'Failed to save machine wage configuration', 'error')
  } finally {
    machineWageSaving.value = false
  }
}

function confirmDeleteMachineWage(row) {
  askConfirm(
    `Delete machine wage configuration starting ${fmtDate(row.fromDate)}?`,
    async () => {
      try {
        await api.delete(`/payroll/machine-wage-master/${row._id}`)
        notify('Machine wage configuration deleted')
        await loadMachineWages()
      } catch (e) {
        notify(e.response?.data?.error || 'Failed to delete machine wage configuration', 'error')
      }
    }
  )
}

// ── Salary Runs ────────────────────────────────────────────────────────────────
const runDialog    = ref(false)
const selectAllRun = ref(false)
const runRows      = ref([])
const runForm      = ref({ periodStart: '', periodEnd: '', runTitle: '' })
const runFromMenu  = ref(false)
const runToMenu    = ref(false)
const runEmployeeId = ref('')
const runEmployeeRows = ref([])
const syncingRunWeek = ref(false)

const runTotalNet = computed(() =>
  runEntryMode.value === 'period'
    ? runRows.value.filter(r => r.selected).reduce((s, r) => s + calcFinal(r), 0)
    : runEmployeeFinalTotal.value
)

function onRunPeriodStartInput(v) {
  runForm.value.periodStart = v
  if (!v) return
  if (runEntryMode.value === 'period') enforcePeriodWeekFrom(v)
  else enforceEmployeeWeekRange()
  if (runEntryMode.value === 'employee') initEmployeeWeekRows(true)
}

function onRunPeriodEndInput(v) {
  runForm.value.periodEnd = v
  if (!v) return
  if (runEntryMode.value === 'period') enforcePeriodWeekFrom(v)
  else enforceEmployeeWeekRange()
  if (runEntryMode.value === 'employee') initEmployeeWeekRows(true)
}

function normalizePickedDate(value) {
  if (Array.isArray(value)) return value[0] || ''
  return value || ''
}

function onRunStartDatePicked(value) {
  const date = normalizePickedDate(value)
  if (!date) return
  onRunPeriodStartInput(date)
  runFromMenu.value = false
}

function onRunEndDatePicked(value) {
  const date = normalizePickedDate(value)
  if (!date) return
  onRunPeriodEndInput(date)
  runToMenu.value = false
}

function weekLabel(start, index) {
  return `Week ${index + 1} (${fmtDate(start)})`
}

function weekDayKey(row, dayIndex) {
  const start = parseDateOnly(row.periodStart)
  if (!start) return ''
  const d = new Date(start)
  d.setDate(d.getDate() + dayIndex)
  return toInputDate(d)
}

function dayHeaderLabel(row, dayIndex) {
  const key = weekDayKey(row, dayIndex)
  if (!key) return `${DAY_SHORT_MON_FIRST[dayIndex]} (-- --)`
  return `${DAY_SHORT_MON_FIRST[dayIndex].toUpperCase()} (${key.slice(8, 10)}-${key.slice(5, 7)})`
}

function trimEntriesToDays(row, dayKeys) {
  if (!row.dailyEntries) row.dailyEntries = {}
  Object.keys(row.dailyEntries).forEach((k) => {
    if (!dayKeys.has(k)) delete row.dailyEntries[k]
  })
}

function initEmployeeWeekRows(preserve = true) {
  const selected = runEmployeeTarget.value
  if (!selected) {
    runEmployeeRows.value = []
    return
  }
  const from = startOfWeekMonday(runForm.value.periodStart)
  const to = endOfWeekSunday(runForm.value.periodEnd)
  if (!from || !to || from > to) {
    runEmployeeRows.value = []
    return
  }
  const existing = preserve
    ? Object.fromEntries(runEmployeeRows.value.map((r) => [r.periodStart, r]))
    : {}
  const rows = []
  let idx = 0
  const cur = new Date(from)
  while (cur <= to) {
    const weekStart = toInputDate(cur)
    const weekEndDate = new Date(cur)
    weekEndDate.setDate(weekEndDate.getDate() + 6)
    const weekEnd = toInputDate(weekEndDate)
    const prev = existing[weekStart]
    const row = prev || {
      employeeId: selected._id,
      employeeName: selected.name,
      periodStart: weekStart,
      periodEnd: weekEnd,
      daysWorked: 0,
      wagePerDay: selected.dailyWage || 0,
      totalWages: 0,
      totalWagesManual: false,
      deductionPercentage: selected.deductionPercentage || 0,
      marketAmount: 0,
      advanceAmount: 0,
      dailyEntries: {},
    }
    row.employeeId = selected._id
    row.employeeName = selected.name
    row.periodStart = weekStart
    row.periodEnd = weekEnd
    row.runTitle = weekLabel(cur, idx)
    const dayKeys = new Set(DAY_SHORT_MON_FIRST.map((_, dayIndex) => weekDayKey(row, dayIndex)).filter(Boolean))
    trimEntriesToDays(row, dayKeys)
    refreshRowFromDailyEntries(row)
    rows.push(row)
    idx += 1
    cur.setDate(cur.getDate() + 7)
  }
  runEmployeeRows.value = rows
}

watch(() => [runForm.value.periodStart, runForm.value.periodEnd, runEntryMode.value], () => {
  if (syncingRunWeek.value) return
  if (runEntryMode.value === 'period') {
    if (!runRows.value.length) return
    const dayKeys = new Set(runDayHeaders.value.map((d) => d.key))
    runRows.value.forEach((row) => {
      trimEntriesToDays(row, dayKeys)
      refreshRowFromDailyEntries(row)
    })
    return
  }
  initEmployeeWeekRows(true)
})

watch(runEmployeeId, () => {
  if (runEntryMode.value !== 'employee') return
  initEmployeeWeekRows(false)
})

watch(runEntryMode, (mode) => {
  if (mode === 'period') {
    enforcePeriodWeekFrom(runForm.value.periodStart || runForm.value.periodEnd)
    return
  }
  enforceEmployeeWeekRange()
  initEmployeeWeekRows(true)
})

function openRunDialog() {
  const base = new Date(selYear.value, selMonth.value - 1, 1)
  const monday = startOfWeekMonday(base)
  const sunday = endOfWeekSunday(base)
  runForm.value = {
    periodStart: toInputDate(monday),
    periodEnd: toInputDate(sunday),
    runTitle: '',
  }
  runRows.value = employees.value.map(e => ({
    ...e,
    selected: false, daysWorked: 0,
    wagePerDay: e.dailyWage || 0,
    totalWages: 0,
    totalWagesManual: false,
    marketAmount: 0,
    advanceAmount: 0,
    deductionPercentage: e.deductionPercentage || 0,
    dailyEntries: {},
  }))
  runEntryMode.value = 'period'
  runEmployeeId.value = ''
  runEmployeeRows.value = []
  selectAllRun.value = false
  runDialog.value = true
}

function toggleAllRun(val) {
  runRows.value.forEach(r => (r.selected = val))
}

async function saveRun() {
  if (!runForm.value.periodStart || !runForm.value.periodEnd)
    return notify('Period dates are required', 'error')

  if (runEntryMode.value === 'period') {
    const selected = runRows.value.filter(r => r.selected)
    if (!selected.length) return notify('Select at least one employee', 'error')

    loading.value = true
    try {
      await api.post('/payroll/generate', {
        month: selMonth.value, year: selYear.value,
        periodStart: runForm.value.periodStart,
        periodEnd: runForm.value.periodEnd,
        runTitle: runForm.value.runTitle,
        employeeEntries: selected.map(r => ({
          employeeId: r._id,
          daysWorked: r.daysWorked,
          wagePerDay: r.wagePerDay,
          totalWages: r.totalWages,
          deductionPercentage: r.deductionPercentage,
          marketAmount: r.marketAmount,
          advanceAmount: r.advanceAmount,
          dailyEntries: runDayHeaders.value.map((day) => ({
            date: day.key,
            ...(r.dailyEntries?.[day.key] || { machineCount: 0, wage: 0, wageSource: 'master', masterConfigId: null }),
          })),
        })),
      })
      runDialog.value = false
      notify('Salary run created')
      await Promise.all([loadMonthRuns(), loadEmployeeSummary()])
    } catch (e) {
      notify(e.response?.data?.error || 'Failed to create run', 'error')
    } finally {
      loading.value = false
    }
    return
  }

  const selectedEmp = runEmployeeTarget.value
  if (!selectedEmp) return notify('Select an employee', 'error')
  if (!runEmployeeRows.value.length) return notify('No weeks available for selected period', 'error')

  loading.value = true
  try {
    for (let i = 0; i < runEmployeeRows.value.length; i += 1) {
      const row = runEmployeeRows.value[i]
      const start = new Date(row.periodStart)
      await api.post('/payroll/generate', {
        month: start.getMonth() + 1,
        year: start.getFullYear(),
        periodStart: row.periodStart,
        periodEnd: row.periodEnd,
        runTitle: runForm.value.runTitle
          ? `${runForm.value.runTitle} - Week ${i + 1}`
          : `Week ${i + 1}`,
        employeeEntries: [{
          employeeId: selectedEmp._id,
          daysWorked: row.daysWorked,
          wagePerDay: row.wagePerDay,
          totalWages: row.totalWages,
          deductionPercentage: row.deductionPercentage,
          marketAmount: row.marketAmount,
          advanceAmount: row.advanceAmount,
          dailyEntries: DAY_SHORT_MON_FIRST.map((_, dayIndex) => {
            const key = weekDayKey(row, dayIndex)
            return {
              date: key,
              ...(row.dailyEntries?.[key] || { machineCount: 0, wage: 0, wageSource: 'master', masterConfigId: null }),
            }
          }),
        }],
      })
    }
    runDialog.value = false
    notify('Salary runs created')
    await Promise.all([loadMonthRuns(), loadEmployeeSummary()])
  } catch (e) {
    notify(e.response?.data?.error || 'Failed to create run', 'error')
  } finally {
    loading.value = false
  }
}

function confirmDeleteRun(run) {
  const label = `${fmtDate(run.periodStart)} to ${fmtDate(run.periodEnd)}`
  askConfirm(
    `Delete salary run "${label}"? All associated payment records will also be removed.`,
    async () => {
      try {
        await api.delete(`/payroll/history/${run._id}`)
        notify('Salary run deleted')
        await Promise.all([loadMonthRuns(), loadEmployeeSummary()])
      } catch (e) {
        notify(e.response?.data?.error || 'Failed to delete run', 'error')
      }
    }
  )
}

// ── Edit Salary Run ────────────────────────────────────────────────────────────
const editRunDialog = ref(false)
const editingRun    = ref(null)
const editRunForm   = ref({ periodStart: '', periodEnd: '', runTitle: '' })
const editRunRows   = ref([])

const editRunDayHeaders = computed(() => {
  if (!editRunForm.value.periodStart || !editRunForm.value.periodEnd) return []
  const start = new Date(editRunForm.value.periodStart)
  const end   = new Date(editRunForm.value.periodEnd)
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) return []
  const rows = []
  const cur  = new Date(start)
  while (cur <= end) {
    const key = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}-${String(cur.getDate()).padStart(2, '0')}`
    rows.push({
      key,
      label: `${DAY_SHORT[cur.getDay()]} (${String(cur.getDate()).padStart(2, '0')}-${String(cur.getMonth() + 1).padStart(2, '0')})`,
    })
    cur.setDate(cur.getDate() + 1)
  }
  return rows
})

function backfillDailyEntries(daysWorked, totalWages, periodStart) {
  const rows = buildHistoricalEntries(periodStart, daysWorked, totalWages)
  const entries = {}
  rows.forEach((r) => { entries[r.date] = r })
  return entries
}

function openEditRunDialog(run) {
  editingRun.value  = run
  editRunForm.value = {
    periodStart: toInputDate(run.periodStart),
    periodEnd:   toInputDate(run.periodEnd),
    runTitle:    run.runTitle || '',
  }
  editRunRows.value = run.employees.map(e => {
    let dailyEntries = {}
    if (Array.isArray(e.dailyEntries) && e.dailyEntries.length) {
      dailyEntries = Object.fromEntries(e.dailyEntries.map((d) => [
        new Date(d.date).toISOString().slice(0, 10),
        {
          date: new Date(d.date).toISOString().slice(0, 10),
          machineCount: toNumber(d.machineCount),
          wage: toNumber(d.wage),
          wageSource: d.wageSource || 'master',
          masterConfigId: d.masterConfigId || null,
        },
      ]))
    }
    // Backfill for old records that have no per-day machine data
    if (!Object.keys(dailyEntries).length && toNumber(e.daysWorked) > 0 && toNumber(e.totalWages) > 0) {
      dailyEntries = backfillDailyEntries(e.daysWorked, e.totalWages, run.periodStart)
    }
    return {
      employeeId:          e.employeeId,
      name:                e.name,
      daysWorked:          e.daysWorked,
      totalWagesManual:    false,
      wagePerDay:          e.dailyWage,
      totalWages:          e.totalWages,
      deductionPercentage: e.deductionPercentage,
      marketAmount:        e.marketAmount || 0,
      advanceAmount:       e.advanceAmount || 0,
      dailyEntries,
    }
  })
  editRunDialog.value = true
}

async function saveEditRun() {
  if (!editRunForm.value.periodStart || !editRunForm.value.periodEnd)
    return notify('Period dates are required', 'error')
  loading.value = true
  try {
    await api.put(`/payroll/history/${editingRun.value._id}`, {
      periodStart:     editRunForm.value.periodStart,
      periodEnd:       editRunForm.value.periodEnd,
      runTitle:        editRunForm.value.runTitle,
      employeeEntries: editRunRows.value.map(r => ({
        employeeId:          r.employeeId,
        daysWorked:          r.daysWorked,
        wagePerDay:          r.wagePerDay,
        totalWages:          r.totalWages,
        deductionPercentage: r.deductionPercentage,
        marketAmount:        r.marketAmount,
        advanceAmount:       r.advanceAmount,
        dailyEntries: Object.values(r.dailyEntries || {}),
      })),
    })
    editRunDialog.value = false
    notify('Salary run updated')
    await Promise.all([loadMonthRuns(), loadEmployeeSummary()])
  } catch (e) {
    notify(e.response?.data?.error || 'Failed to update run', 'error')
  } finally {
    loading.value = false
  }
}

// ── Payments ───────────────────────────────────────────────────────────────────
const payDialog = ref(false)
const payTarget = ref(null)
const payForm   = ref({ amount: 0, method: 'cash', notes: '' })

function openPayDialog(emp) {
  payTarget.value = emp
  payForm.value   = { amount: emp.totalPending, method: 'cash', notes: '' }
  payDialog.value = true
}

async function recordPayment() {
  if (!payForm.value.amount || payForm.value.amount <= 0)
    return notify('Enter a valid amount', 'error')
  loading.value = true
  try {
    await api.post('/payroll/payment/settle-total', {
      employeeId: payTarget.value._id,
      amountPaid: payForm.value.amount,
      paymentMethod: payForm.value.method,
      notes: payForm.value.notes,
    })
    payDialog.value = false
    notify('Payment recorded')
    await Promise.all([loadEmployeeSummary(), loadMonthRuns()])
  } catch (e) {
    notify(e.response?.data?.error || 'Failed to record payment', 'error')
  } finally {
    loading.value = false
  }
}

const deductDialog = ref(false)
const deductTarget = ref(null)
const deductForm   = ref({ amount: 0, method: 'cash', notes: '' })

function openDeductDialog(emp) {
  deductTarget.value = emp
  deductForm.value   = { amount: emp.deductionBalance, method: 'cash', notes: '' }
  deductDialog.value = true
}

async function recordDeductReturn() {
  if (!deductForm.value.amount || deductForm.value.amount <= 0)
    return notify('Enter a valid amount', 'error')
  loading.value = true
  try {
    await api.post('/payroll/payment/deduction-return-settle', {
      employeeId: deductTarget.value._id,
      amountPaid: deductForm.value.amount,
      paymentMethod: deductForm.value.method,
      notes: deductForm.value.notes,
    })
    deductDialog.value = false
    notify('Deduction return recorded')
    await loadEmployeeSummary()
  } catch (e) {
    notify(e.response?.data?.error || 'Failed to record deduction return', 'error')
  } finally {
    loading.value = false
  }
}

const historyDialog = ref(false)
const historyEmp    = ref(null)

async function openHistory(emp) {
  historyEmp.value     = emp
  historyDialog.value  = true
  paymentHistory.value = []
  loadingHistory.value = true
  try {
    const res = await api.get(`/payroll/payment-history/${emp._id}`)
    paymentHistory.value = res.data.data || []
  } catch {
    notify('Failed to load payment history', 'error')
  } finally {
    loadingHistory.value = false
  }
}

// ── Payslip ────────────────────────────────────────────────────────────────────
const payslipEmpId = ref(null)
const payslipData  = ref(null)

const payslipSummaryRows = computed(() => {
  if (!payslipData.value) return []
  const d = payslipData.value
  return [
    { label: 'Carry Forward Pending',     value: d.carryForwardPending, cls: d.carryForwardPending > 0 ? 'text-error' : '' },
    { label: 'Gross Salary (this month)', value: d.totalWages,          cls: '' },
    { label: 'Deduction Amount',          value: d.deductionAmount,     cls: 'text-error' },
    { label: 'Net Salary (this month)',   value: d.netSalary,           cls: '' },
    { label: 'Salary Paid',              value: d.amountPaid,          cls: 'text-success' },
    { label: 'Deduction Returned',        value: d.deductionReturned,   cls: 'text-warning' },
    { label: 'Closing Pending',          value: d.amountPending,       cls: d.amountPending > 0 ? 'text-error' : 'text-success' },
  ]
})

async function loadPayslip() {
  if (!payslipEmpId.value) return notify('Select an employee', 'error')
  loadingPayslip.value = true
  payslipData.value = null
  try {
    const [runsRes, summaryRes] = await Promise.all([
      api.get(`/payroll/history/${selMonth.value}/${selYear.value}`),
      api.get('/payroll/employees/summary'),
    ])
    const runs   = runsRes.data.data || []
    const empSum = (summaryRes.data.data || []).find(e => e._id?.toString() === payslipEmpId.value)
    const empInfo = employees.value.find(e => e._id === payslipEmpId.value)

    const entries = []
    let totalWages = 0, deductionAmount = 0, netSalary = 0, amountPaid = 0, deductionReturned = 0, currentMonthPending = 0

    runs.forEach(run => {
      // Only include runs whose period START falls within the selected month
      const ps = new Date(run.periodStart)
      if (ps.getMonth() + 1 !== selMonth.value || ps.getFullYear() !== selYear.value) return
      const entry = run.employees.find(e => e.employeeId?.toString() === payslipEmpId.value)
      if (!entry) return
      entries.push({
        periodStart: run.periodStart, periodEnd: run.periodEnd,
        daysWorked: entry.daysWorked, dailyWage: entry.dailyWage,
        totalWages: entry.totalWages, deductionAmount: entry.deductionAmount, netSalary: entry.netSalary,
      })
      totalWages          += entry.totalWages       || 0
      deductionAmount     += entry.deductionAmount  || 0
      netSalary           += entry.netSalary        || 0
      amountPaid          += entry.amountPaid       || 0
      deductionReturned   += entry.deductionPaidBack || 0
      currentMonthPending += entry.amountPending    || 0
    })

    const carryForwardPending = Math.max(0, (empSum?.totalPending || 0) - currentMonthPending)

    payslipData.value = {
      name: empInfo?.name || 'Employee',
      entries, totalWages, deductionAmount, netSalary, amountPaid, deductionReturned,
      carryForwardPending,
      amountPending: carryForwardPending + currentMonthPending,
      paymentStatus: currentMonthPending <= 0 ? 'paid' : amountPaid > 0 ? 'partial' : 'pending',
    }
  } catch {
    notify('Failed to generate payslip', 'error')
  } finally {
    loadingPayslip.value = false
  }
}

function doDownloadPayslip() {
  if (!payslipData.value) return
  downloadPayslipPdf(payslipData.value, selMonth.value, selYear.value)
}

const sendingWhatsapp = ref(false)
async function sendViaWhatsApp() {
  if (!payslipData.value) return
  sendingWhatsapp.value = true
  try {
    const empInfo = employees.value.find(e => e._id === payslipEmpId.value)
    const rawPhone = (empInfo?.phone || '').replace(/\D/g, '')
    const MONTH_NAMES = ['','January','February','March','April','May','June','July','August','September','October','November','December']
    const fileName = `Payslip_${(payslipData.value.name || 'Employee').replace(/\s+/g,'_')}_${MONTH_NAMES[selMonth.value]}_${selYear.value}.pdf`
    const blob = payslipBlob(payslipData.value, selMonth.value, selYear.value)
    const file = new File([blob], fileName, { type: 'application/pdf' })

    // Try Web Share API — on mobile this opens WhatsApp directly with PDF attached.
    // On macOS Chrome/Safari it opens the OS share sheet; pick WhatsApp and hit Send.
    if (typeof navigator.share === 'function') {
      const canFile = typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })
      try {
        if (canFile) {
          await navigator.share({ files: [file], title: `Payslip – ${payslipData.value.name}` })
        } else {
          // share sheet without file (text only)
          await navigator.share({ title: `Payslip – ${payslipData.value.name}`,
            text: `Payslip for ${payslipData.value.name} — ${MONTH_NAMES[selMonth.value]} ${selYear.value}` })
        }
        return
      } catch (e) {
        if (e.name === 'AbortError') return // user dismissed the share sheet
        // else fall through to wa.me fallback
      }
    }

    // Fallback (browsers without Web Share): open WhatsApp chat directly — NO download.
    // The user can use the "Download PDF" button to save it and attach manually if needed.
    if (rawPhone) {
      let phone = rawPhone
      if (phone.startsWith('0')) phone = '91' + phone.slice(1)
      else if (!phone.startsWith('91') && phone.length === 10) phone = '91' + phone
      const text = encodeURIComponent(`Hi, your payslip for ${MONTH_NAMES[selMonth.value]} ${selYear.value} is ready.`)
      window.open(`https://wa.me/${phone}?text=${text}`, '_blank')
      notify('WhatsApp chat opened — tap the 📎 attachment icon, then use "Download PDF" to save and attach the file.', 'info')
    } else {
      notify('No phone number saved for this employee. Add it in the Employees tab.', 'warning')
    }
  } catch {
    notify('Failed to open WhatsApp', 'error')
  } finally {
    sendingWhatsapp.value = false
  }
}

// ── Init ───────────────────────────────────────────────────────────────────────
onMounted(async () => {
  await Promise.all([loadEmployees(), loadMonthRuns(), loadEmployeeSummary(), loadMachineWages()])
})
</script>

<style scoped>
/* ══ Root ════════════════════════════════════════════════════════════ */
.payroll-root { padding: 20px 20px 40px; background: #f4f6fa; min-height: 100vh; }

/* ══ Hero Header ═════════════════════════════════════════════════════ */
.payroll-hero {
  background: linear-gradient(135deg, #1565c0 0%, #1976d2 60%, #42a5f5 100%);
  border-radius: 18px;
  padding: 22px 28px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 14px;
  box-shadow: 0 4px 24px rgba(21,101,192,.22);
}
.payroll-hero__title {
  font-size: 22px;
  font-weight: 700;
  color: #fff;
  display: flex;
  align-items: center;
  letter-spacing: -.3px;
}
.payroll-hero__sub {
  font-size: 12px;
  color: rgba(255,255,255,.72);
  margin-top: 3px;
  letter-spacing: .5px;
}
.payroll-hero__selectors { display: flex; gap: 10px; }

/* ══ Stat Cards ══════════════════════════════════════════════════════ */
.stat-card {
  border-radius: 16px;
  padding: 18px 18px 16px;
  display: flex;
  align-items: center;
  gap: 14px;
  box-shadow: 0 2px 12px rgba(0,0,0,.07);
  transition: transform .18s, box-shadow .18s;
}
.stat-card:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0,0,0,.12); }

.stat-card__icon {
  width: 46px; height: 46px;
  border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.stat-card__label { font-size: 11.5px; font-weight: 500; opacity: .8; letter-spacing: .3px; margin-bottom: 3px; }
.stat-card__value { font-size: 20px; font-weight: 700; letter-spacing: -.3px; }

.stat-card--blue  { background: linear-gradient(135deg,#e3f0ff,#bbdefb); color: #1565c0; }
.stat-card--blue  .stat-card__icon { background: #1976d2; color: #fff; }
.stat-card--red   { background: linear-gradient(135deg,#fff0f0,#ffcdd2); color: #b71c1c; }
.stat-card--red   .stat-card__icon { background: #e53935; color: #fff; }
.stat-card--green { background: linear-gradient(135deg,#e8f5e9,#c8e6c9); color: #1b5e20; }
.stat-card--green .stat-card__icon { background: #388e3c; color: #fff; }
.stat-card--amber { background: linear-gradient(135deg,#fffde7,#fff9c4); color: #e65100; }
.stat-card--amber .stat-card__icon { background: #f57c00; color: #fff; }

/* ══ Tabs ════════════════════════════════════════════════════════════ */
.payroll-tabs-wrap { background: #fff; border-radius: 14px; box-shadow: 0 1px 6px rgba(0,0,0,.07); overflow: hidden; }
:deep(.payroll-tabs .v-tab) { font-weight: 600; letter-spacing: .2px; text-transform: none; }
:deep(.payroll-tabs .v-slide-group__content) { gap: 2px; }
:deep(.payroll-tabs .v-tab) {
  min-height: 48px;
  border-radius: 10px;
  margin: 6px 4px;
  transition: background-color .18s, color .18s, box-shadow .18s;
}
:deep(.payroll-tabs .v-tab.v-tab--selected) {
  background: linear-gradient(135deg, #e7f0ff, #d9e8ff);
  box-shadow: inset 0 0 0 1px #c4d8ff;
}

/* ══ Border Card ═════════════════════════════════════════════════════ */
.border-card {
  border: 1px solid #e8eaf0 !important;
  background: #fff !important;
  box-shadow: 0 2px 12px rgba(17,24,39,.05);
}

/* ══ Employee Table ══════════════════════════════════════════════════ */
.emp-avatar {
  width: 34px; height: 34px;
  border-radius: 50%;
  background: linear-gradient(135deg,#1976d2,#42a5f5);
  color: #fff;
  font-weight: 700; font-size: 14px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.emp-avatar--md { width: 40px; height: 40px; font-size: 16px; }
.emp-avatar--red   { background: linear-gradient(135deg,#e53935,#ef9a9a); }
.emp-avatar--green { background: linear-gradient(135deg,#388e3c,#a5d6a7); }

.deduction-badge {
  display: inline-block;
  background: #fff3e0;
  color: #e65100;
  border-radius: 8px;
  padding: 3px 10px;
  font-size: 12px;
  font-weight: 700;
}

:deep(.emp-table thead th) { background: #f7f9fc !important; font-weight: 700; font-size: 12px; letter-spacing: .3px; }
:deep(.emp-table tbody tr:hover td) { background: #f0f4ff; }

/* ══ View Toggle ═════════════════════════════════════════════════════ */
.view-toggle {
  display: inline-flex;
  background: #eef2f7;
  border-radius: 10px;
  padding: 3px;
  gap: 3px;
}
.toggle-btn {
  padding: 7px 16px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  color: #555;
  border: none;
  background: transparent;
  cursor: pointer;
  display: flex; align-items: center;
  transition: background .15s, color .15s;
}
.toggle-btn--active { background: #fff; color: #1976d2; box-shadow: 0 1px 4px rgba(0,0,0,.12); }

/* ══ Empty State ═════════════════════════════════════════════════════ */
.empty-state { text-align: center; padding: 40px 20px; }
.empty-icon-wrap {
  width: 70px; height: 70px;
  border-radius: 50%;
  background: #e8f0fe;
  display: flex; align-items: center; justify-content: center;
  margin: 0 auto;
}

/* ══ Runs Panels ═════════════════════════════════════════════════════ */
.run-panel {
  background: #fff !important;
  box-shadow: 0 1px 6px rgba(0,0,0,.07) !important;
  border: 1px solid #e8eaf0 !important;
  margin-bottom: 8px;
}
:deep(.run-panel-title) {
  min-height: 72px !important;
  padding-top: 0 !important;
  padding-bottom: 0 !important;
}
:deep(.run-panel-title .v-expansion-panel-title__overlay) { display: none; }

.run-title-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  gap: 16px;
  min-width: 0;
  padding-right: 4px;
}
.run-title-left {
  display: flex; align-items: center; gap: 12px;
  flex: 1 1 0; min-width: 0; overflow: hidden;
}
.run-cal-chip {
  width: 38px; height: 38px; border-radius: 10px;
  background: linear-gradient(135deg,#1976d2,#42a5f5);
  color: #fff;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.run-dates { font-size: 14px; font-weight: 600; color: #212121; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.run-sub { font-size: 12px; color: #757575; margin-top: 2px; white-space: nowrap; }
.run-title-right { display: flex; align-items: center; gap: 20px; flex-shrink: 0; }
.run-stat { display: flex; flex-direction: column; align-items: flex-end; min-width: 70px; }
.run-stat-label { font-size: 11px; color: #9e9e9e; line-height: 1.3; }
.run-stat-value { font-size: 15px; font-weight: 700; color: #212121; white-space: nowrap; }
.run-net { color: #2e7d32 !important; }

/* ══ Period Table ════════════════════════════════════════════════════ */
.period-table-wrapper { overflow-x: auto; border-top: 1px solid #e0e0e0; }
.period-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  font-size: 13px;
  min-width: 1420px;
}
.period-table th {
  background: #edf3ff; padding: 11px 14px;
  font-weight: 700; color: #334155; border-bottom: 1px solid #d9e4fb; white-space: nowrap;
  font-size: 11.5px; letter-spacing: .3px; text-transform: uppercase;
}
.period-table td {
  padding: 11px 14px;
  border-bottom: 1px solid #edf0f6;
  white-space: nowrap;
  background: #fff;
  vertical-align: middle;
}
.period-table tbody tr:hover td { background: #f6f9ff; }
.period-table .row-alt td { background: #fcfdff; }
.period-table th:first-child,
.period-table td:first-child {
  min-width: 170px;
}
.period-table th:not(:first-child),
.period-table td:not(:first-child) {
  min-width: 90px;
}
.period-table .tfoot-row td {
  background: #f1f5ff; font-weight: 700;
  border-top: 1px solid #cfdaf3; border-bottom: none;
}

.by-employee-table {
  min-width: 1460px;
}

.by-employee-table :deep(thead th) {
  white-space: nowrap;
  padding: 11px 12px !important;
  font-size: 12px;
}

.by-employee-table :deep(tbody td),
.by-employee-table :deep(tfoot td) {
  white-space: nowrap;
  padding: 11px 12px !important;
  vertical-align: middle;
}

.by-employee-table :deep(thead th:first-child),
.by-employee-table :deep(tbody td:first-child),
.by-employee-table :deep(tfoot td:first-child) {
  min-width: 170px;
}

.by-employee-table :deep(thead th:not(:first-child)),
.by-employee-table :deep(tbody td:not(:first-child)),
.by-employee-table :deep(tfoot td:not(:first-child)) {
  min-width: 90px;
}
.c-error  { color: #c62828; }
.c-success { color: #2e7d32; }

/* ══ Status Badge ════════════════════════════════════════════════════ */
.status-badge {
  display: inline-block; padding: 3px 9px; border-radius: 20px;
  font-size: 11px; font-weight: 700; text-transform: capitalize; letter-spacing: .2px;
}
.status-paid    { background: #e8f5e9; color: #1b5e20; }
.status-partial { background: #fff3e0; color: #e65100; }
.status-pending { background: #fce4ec; color: #b71c1c; }

/* ══ Payment Cards ═══════════════════════════════════════════════════ */
.pay-card {
  border-radius: 16px; background: #fff;
  border: 2px solid #e8eaf0;
  box-shadow: 0 2px 10px rgba(0,0,0,.06);
  transition: box-shadow .18s, transform .18s;
  overflow: hidden;
}
.pay-card:hover { box-shadow: 0 6px 20px rgba(0,0,0,.1); transform: translateY(-1px); }
.pay-card--pending { border-top: 4px solid #e53935; }
.pay-card--settled { border-top: 4px solid #43a047; }

.pay-card__top { display: flex; align-items: flex-start; justify-content: space-between; padding: 16px 16px 10px; }
.pay-card__name { font-weight: 700; font-size: 15px; color: #1a1a2e; }

.pay-status-chip {
  padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; flex-shrink: 0;
}
.pay-status-chip--pending { background: #fce4ec; color: #b71c1c; }
.pay-status-chip--settled { background: #e8f5e9; color: #1b5e20; }

.pay-card__stats { display: grid; grid-template-columns: 1fr 1fr; gap: 0; padding: 0 16px 10px; }
.pay-stat { padding: 6px 4px; }
.pay-stat__label { font-size: 10.5px; color: #888; letter-spacing: .3px; margin-bottom: 2px; }
.pay-stat__val { font-size: 14px; font-weight: 700; color: #333; }
.pay-stat__val--green { color: #2e7d32; }
.pay-stat__val--red   { color: #c62828; }
.pay-stat__val--amber { color: #e65100; }

.pay-card__actions {
  border-top: 1px solid #f0f0f0;
  padding: 10px 12px;
  display: flex; align-items: center; gap: 8px;
}

/* ══ Run Total Bar ═══════════════════════════════════════════════════ */
.run-total-bar {
  text-align: right; font-size: 14px; color: #444; margin-top: 10px;
  padding: 8px 0;
}
.run-total-bar strong { font-size: 16px; color: #1b5e20; }

/* ══ Run Dialog Inputs ═══════════════════════════════════════════════ */
.run-period-row { align-items: end; }
.run-period-field { margin-bottom: 2px; }
.run-grid-wrap {
  overflow-x: auto;
  overflow-y: auto;
  max-height: 58vh;
  padding-bottom: 0;
  scrollbar-gutter: stable both-edges;
  border: 1px solid #e4e8f0;
  border-radius: 12px;
}
.run-grid-wrap::after {
  content: '';
  display: block;
  height: 14px;
}
.run-input-table :deep(thead th) {
  vertical-align: bottom;
  padding-top: 8px !important;
  padding-bottom: 8px !important;
  line-height: 1.2;
  white-space: nowrap;
}
.run-input-table :deep(tbody td) { vertical-align: middle; }
.run-input-table :deep(tbody td) {
  padding-top: 7px !important;
  padding-bottom: 7px !important;
}
.run-input-table :deep(tbody tr:first-child td) { padding-top: 10px !important; }
.run-input-table :deep(tbody tr td) { border-bottom: 1px solid #e9edf4; }
.run-input-table :deep(tbody tr:last-child td) {
  border-bottom: none;
  padding-bottom: 18px !important;
}
.run-input-table :deep(.v-field) { border-radius: 10px; }
.run-input-table :deep(.v-field__input) { min-height: 36px; }
.run-input-table :deep(.v-input) { margin-top: 0; }
.run-cell-input { min-width: 104px; }
.run-cell-input--sm { min-width: 92px; }
.run-cell-input--xs { min-width: 82px; }
.run-cell-input--machine { min-width: 84px; }

.sticky-left {
  position: sticky;
  left: 40px;
  z-index: 1;
  background: #fff;
}

.sticky-left--checkbox {
  position: sticky;
  left: 0;
  z-index: 2;
  background: #fff;
}

.run-input-table :deep(thead .sticky-left),
.run-input-table :deep(thead .sticky-left--checkbox) {
  background: #f5f7fc !important;
}

.mw-table-wrap,
.summary-table-wrap {
  overflow-x: auto;
}

.mw-range-wrap {
  margin-top: 12px;
  overflow-x: auto;
  overflow-y: hidden;
  padding-bottom: 0;
  scrollbar-gutter: stable both-edges;
}
.mw-range-wrap::after {
  content: '';
  display: block;
  height: 12px;
}

.mw-range-wrap :deep(thead th) {
  padding-bottom: 14px !important;
}

.mw-range-wrap :deep(tbody td) {
  padding-top: 10px !important;
}

.mw-range-wrap :deep(tbody tr:last-child td) {
  padding-bottom: 16px !important;
}

.mw-table,
.summary-week-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 1040px;
}

.mw-table th,
.summary-week-table th {
  background: #f0f4ff;
  color: #374151;
  font-size: 12px;
  font-weight: 700;
  padding: 10px 12px;
  border-bottom: 1px solid #dbe3f2;
  white-space: nowrap;
}

.mw-table td,
.summary-week-table td {
  border-bottom: 1px solid #edf0f6;
  padding: 10px 12px;
  white-space: nowrap;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(220px, 1fr));
  gap: 10px;
}

.summary-item {
  border: 1px solid #e4e8f0;
  border-radius: 10px;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.summary-item span {
  font-size: 12px;
  color: #6b7280;
}

.summary-item strong {
  font-size: 16px;
  color: #1f2937;
}

.summary-filters-row {
  align-items: end;
}

.summary-filter-actions {
  min-height: 56px;
}

.summary-filter-btn {
  width: 100%;
  min-height: 40px;
  border-radius: 10px;
}

/* ══ Payslip Document ════════════════════════════════════════════════ */
.payslip-doc {
  border: 1px solid #e0e4ed;
  border-radius: 14px;
  overflow: hidden;
}
.payslip-doc__header {
  background: linear-gradient(135deg,#1565c0,#1e88e5);
  padding: 18px 20px;
  display: flex; align-items: flex-start; justify-content: space-between;
  color: #fff;
}
.payslip-doc__company { font-size: 18px; font-weight: 800; letter-spacing: 1px; }
.payslip-doc__sub { font-size: 11px; opacity: .75; letter-spacing: 2px; margin-top: 1px; }
.payslip-doc__badge {
  background: rgba(255,255,255,.2);
  padding: 3px 12px; border-radius: 20px;
  font-size: 12px; font-weight: 700; letter-spacing: 1px;
}
.payslip-doc__period { font-size: 12px; opacity: .8; text-align: right; margin-top: 4px; }
.payslip-doc__emp { padding: 12px 20px; background: #f7f9fc; font-size: 13px; border-bottom: 1px solid #e0e4ed; }
.payslip-section-title {
  font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: .6px;
  color: #1565c0; padding: 14px 20px 6px; background: #fff;
}
.payslip-table { font-size: 13px; }
:deep(.payslip-table thead th) { background: #f0f4ff; color: #3c3c8a; font-weight: 700; font-size: 11px; text-transform: uppercase; }
:deep(.payslip-table tbody tr:nth-child(even) td) { background: #fafbfc; }

.payslip-summary { padding: 4px 20px 14px; background: #fff; }
.payslip-summary__row {
  display: flex; justify-content: space-between; align-items: center;
  padding: 7px 0; border-bottom: 1px dashed #eee; font-size: 13px;
}
.payslip-summary__row:last-child { border-bottom: none; }
.payslip-summary__label { color: #555; }
.payslip-summary__val { font-weight: 700; color: #222; }
.payslip-status {
  display: flex; align-items: center;
  margin: 0 20px 18px; padding: 10px 16px;
  border-radius: 10px; font-size: 13px; font-weight: 700; letter-spacing: .5px;
}
.payslip-status--paid    { background: #e8f5e9; color: #1b5e20; }
.payslip-status--pending { background: #fce4ec; color: #b71c1c; }

/* ══ Dialog Headers ══════════════════════════════════════════════════ */
.dialog-header {
  display: flex; align-items: center;
  padding: 16px 20px; font-size: 15px; font-weight: 700;
  color: #fff;
}
.dialog-header--blue  { background: linear-gradient(135deg,#1565c0,#1976d2); }
.dialog-header--green { background: linear-gradient(135deg,#2e7d32,#43a047); }
.dialog-header--amber { background: linear-gradient(135deg,#e65100,#fb8c00); }
.dialog-header--red   { background: linear-gradient(135deg,#b71c1c,#e53935); }

/* ══ Payment Info Box ════════════════════════════════════════════════ */
.payment-info-box { background: #f7f9fc; border-radius: 10px; padding: 12px 16px; border: 1px solid #e0e4ed; }
.payment-info-row { display: flex; justify-content: space-between; align-items: center; font-size: 13px; padding: 3px 0; color: #444; }
.payment-info-row--red strong { color: #c62828; }
.payment-info-row--amber strong { color: #e65100; }

/* ══ History Table ═══════════════════════════════════════════════════ */
.history-table { font-size: 13px; }
:deep(.history-table thead th) { background: #f0f4ff; font-weight: 700; font-size: 11px; text-transform: uppercase; color: #3c3c8a; letter-spacing: .3px; }
:deep(.history-table tbody tr:hover td) { background: #f7f9fc; }

.type-badge { display: inline-block; padding: 2px 9px; border-radius: 20px; font-size: 11px; font-weight: 700; }
.type-badge--green { background: #e8f5e9; color: #2e7d32; }
.type-badge--amber { background: #fff8e1; color: #e65100; }

@media (max-width: 800px) {
  .run-cell-input,
  .run-cell-input--sm,
  .run-cell-input--xs {
    min-width: 76px;
  }

  .sticky-left {
    left: 36px;
  }

  .summary-grid {
    grid-template-columns: 1fr;
  }
}
</style>
