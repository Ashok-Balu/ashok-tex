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
        <v-tab value="runs"      prepend-icon="mdi-calendar-clock">Salary Runs</v-tab>
        <v-tab value="payments"  prepend-icon="mdi-cash-multiple">Payments</v-tab>
        <v-tab value="payslip"   prepend-icon="mdi-file-document-outline">Payslip</v-tab>
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
                      <span class="run-stat-label">Total Wages</span>
                      <span class="run-stat-value">₹{{ fmt(run.employees.reduce((s,e)=>s+(e.totalWages||0),0)) }}</span>
                    </div>
                    <div class="run-stat">
                      <span class="run-stat-label">Final</span>
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
                        <th class="text-center">Days</th>
                        <th class="text-right">Wage/Day</th>
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
                        <td class="text-center">{{ emp.daysWorked }}</td>
                        <td class="text-right">₹{{ fmt(emp.dailyWage) }}</td>
                        <td class="text-right">₹{{ fmt(emp.totalWages) }}</td>
                        <td class="text-right c-error">₹{{ fmt(emp.deductionAmount) }}</td>
                        <td class="text-right c-error">₹{{ fmt(emp.marketAmount || 0) }}</td>
                        <td class="text-right c-error">₹{{ fmt(emp.advanceAmount || 0) }}</td>
                        <td class="text-right font-weight-bold">₹{{ fmt(emp.finalSalary ?? emp.netSalary) }}</td>
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
                        <td class="text-right">Run Total</td>
                        <td class="text-center">{{ run.employees.reduce((s,e)=>s+(e.daysWorked||0),0) }}</td>
                        <td></td>
                        <td class="text-right">₹{{ fmt(run.employees.reduce((s,e)=>s+(e.totalWages||0),0)) }}</td>
                        <td class="text-right c-error">₹{{ fmt(run.employees.reduce((s,e)=>s+(e.deductionAmount||0),0)) }}</td>
                        <td class="text-right c-error">₹{{ fmt(run.employees.reduce((s,e)=>s+(e.marketAmount||0),0)) }}</td>
                        <td class="text-right c-error">₹{{ fmt(run.employees.reduce((s,e)=>s+(e.advanceAmount||0),0)) }}</td>
                        <td class="text-right">₹{{ fmt(runNet(run)) }}</td>
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
                      <span class="run-stat-label">Final Salary</span>
                      <span class="run-stat-value">₹{{ fmt(row.finalSalary) }}</span>
                    </div>
                    <div class="run-stat">
                      <span class="run-stat-label">Pending</span>
                      <span class="run-stat-value" :style="row.amountPending > 0 ? 'color:#c62828' : 'color:#2e7d32'">₹{{ fmt(row.amountPending) }}</span>
                    </div>
                  </div>
                </div>
              </v-expansion-panel-title>
              <v-expansion-panel-text class="pa-0">
                <v-table density="compact" class="text-body-2">
                  <thead>
                    <tr class="bg-grey-lighten-4">
                      <th>From</th>
                      <th>To</th>
                      <th class="text-right">Days</th>
                      <th class="text-right">Wage/Day</th>
                      <th class="text-right">Total Wages</th>
                      <th class="text-right">Deduction</th>
                      <th class="text-right">Market</th>
                      <th class="text-right">Advance</th>
                      <th class="text-right">Final</th>
                      <th class="text-right">Paid</th>
                      <th class="text-center">Edit</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="p in row.periods" :key="p.runId">
                      <td>{{ fmtDate(p.periodStart) }}</td>
                      <td>{{ fmtDate(p.periodEnd) }}</td>
                      <td class="text-right">{{ p.daysWorked }}</td>
                      <td class="text-right">₹{{ fmt(p.dailyWage) }}</td>
                      <td class="text-right">₹{{ fmt(p.totalWages) }}</td>
                      <td class="text-right text-error">₹{{ fmt(p.deductionAmount) }}</td>
                      <td class="text-right text-error">₹{{ fmt(p.marketAmount || 0) }}</td>
                      <td class="text-right text-error">₹{{ fmt(p.advanceAmount || 0) }}</td>
                      <td class="text-right font-weight-bold">₹{{ fmt(p.finalSalary ?? p.netSalary) }}</td>
                      <td class="text-right text-success">₹{{ fmt(p.amountPaid) }}</td>
                      <td class="text-center">
                        <v-btn size="x-small" icon="mdi-pencil-outline" variant="tonal" color="primary" @click="openEditRunById(p.runId)" />
                      </td>
                    </tr>
                  </tbody>
                  <tfoot>
                    <tr class="bg-grey-lighten-5 font-weight-bold">
                      <td colspan="2" class="text-right pr-2">Month Total</td>
                      <td class="text-right">{{ fmt(row.totalDays) }}</td>
                      <td></td>
                      <td class="text-right">₹{{ fmt(row.totalWages) }}</td>
                      <td class="text-right text-error">₹{{ fmt(row.deductionAmount) }}</td>
                      <td class="text-right text-error">₹{{ fmt(row.periods.reduce((s,p)=>s+(p.marketAmount||0),0)) }}</td>
                      <td class="text-right text-error">₹{{ fmt(row.periods.reduce((s,p)=>s+(p.advanceAmount||0),0)) }}</td>
                      <td class="text-right">₹{{ fmt(row.finalSalary) }}</td>
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
                  <div class="pay-stat__label">Total Final Salary</div>
                  <div class="pay-stat__val">₹{{ fmt(emp.totalFinalSalary || emp.totalNet) }}</div>
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
                    <th class="text-right">Total Wages</th>
                    <th class="text-right">Deduction</th>
                    <th class="text-right">Market</th>
                    <th class="text-right">Advance</th>
                    <th class="text-right">Final</th>
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
                    <td class="text-right text-error">₹{{ fmt(entry.marketAmount || 0) }}</td>
                    <td class="text-right text-error">₹{{ fmt(entry.advanceAmount || 0) }}</td>
                    <td class="text-right font-weight-bold">₹{{ fmt(entry.finalSalary ?? entry.netSalary) }}</td>
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

    <!-- New Run Dialog -->
    <v-dialog v-model="runDialog" max-width="1180" scrollable>
      <v-card rounded="xl">
        <div class="dialog-header dialog-header--green">
          <v-icon icon="mdi-calendar-plus" size="22" class="mr-2" />
          New Salary Run — {{ selMonthLabel }} {{ selYear }}
        </div>
        <v-card-text class="px-5 pt-5">
          <div class="view-toggle mb-4">
            <button :class="['toggle-btn', runMode === 'period' ? 'toggle-btn--active' : '']" @click="runMode = 'period'">
              <v-icon size="16" class="mr-1">mdi-calendar-range</v-icon> By Period
            </button>
            <button :class="['toggle-btn', runMode === 'employee' ? 'toggle-btn--active' : '']" @click="runMode = 'employee'">
              <v-icon size="16" class="mr-1">mdi-account</v-icon> By Employee
            </button>
          </div>

          <v-row class="mb-2 run-period-row" dense>
            <v-col cols="12" sm="4">
              <v-menu v-model="runStartMenu" :close-on-content-click="false" location="bottom">
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
                  :first-day-of-week="1"
                  show-adjacent-months
                  @update:model-value="onPickRunStart"
                />
              </v-menu>
            </v-col>
            <v-col cols="12" sm="4">
              <v-menu v-model="runEndMenu" :close-on-content-click="false" location="bottom">
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
                  :first-day-of-week="1"
                  show-adjacent-months
                  @update:model-value="onPickRunEnd"
                />
              </v-menu>
            </v-col>
            <v-col cols="12" sm="4">
              <v-text-field v-model="runForm.runTitle" label="Label (e.g. Week 1)" density="compact" variant="outlined" rounded="lg" hide-details="auto" class="run-period-field" />
            </v-col>
          </v-row>

          <v-alert v-if="runMode === 'period'" type="info" variant="tonal" density="compact" class="mb-3">
            End date auto-adjusts to upcoming Sunday when you pick start date.
          </v-alert>

          <template v-if="runMode === 'period'">
          <div class="text-subtitle-2 font-weight-bold mb-2">Select Employees for the Period</div>
          <v-table density="compact" class="run-input-table run-input-table--period mb-2">
            <thead>
              <tr class="bg-grey-lighten-4">
                <th style="width:44px">
                  <v-checkbox v-model="selectAllRun" density="compact" hide-details @update:model-value="toggleAllRun" />
                </th>
                <th>Name</th>
                <th class="text-right" style="width:100px">Days Worked</th>
                <th class="text-right" style="width:120px">Wage/Day (Rs.)</th>
                <th class="text-right" style="width:130px">Total Wages (Rs.)</th>
                <th class="text-right" style="width:110px">Deduction %</th>
                <th class="text-right" style="width:120px">Market Amount</th>
                <th class="text-right" style="width:120px">Advance Amount</th>
                <th class="text-right" style="width:120px">Final Salary</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in runRows" :key="row._id">
                <td><v-checkbox v-model="row.selected" density="compact" hide-details /></td>
                <td class="font-weight-medium">{{ row.name }}</td>
                <td>
                  <v-text-field v-if="row.selected" v-model.number="row.daysWorked" type="number" min="0"
                    density="compact" variant="outlined" hide-details="auto" class="run-cell-input run-cell-input--xs" @update:model-value="syncFromDaysOrWage(row)" />
                  <span v-else class="text-medium-emphasis">—</span>
                </td>
                <td>
                  <v-text-field v-if="row.selected" v-model.number="row.wagePerDay" type="number" min="0"
                    density="compact" variant="outlined" hide-details="auto" class="run-cell-input" @update:model-value="syncFromDaysOrWage(row)" />
                  <span v-else class="text-medium-emphasis">—</span>
                </td>
                <td>
                  <v-text-field v-if="row.selected" v-model.number="row.totalWages" type="number" min="0"
                    density="compact" variant="outlined" hide-details="auto" class="run-cell-input" @update:model-value="syncFromTotalWages(row)" />
                  <span v-else class="text-medium-emphasis">—</span>
                </td>
                <td>
                  <v-text-field v-if="row.selected" v-model.number="row.deductionPercentage" type="number" min="0" max="100"
                    density="compact" variant="outlined" hide-details="auto" class="run-cell-input run-cell-input--sm" />
                  <span v-else class="text-medium-emphasis">—</span>
                </td>
                <td>
                  <v-text-field v-if="row.selected" v-model.number="row.marketAmount" type="number" min="0"
                    density="compact" variant="outlined" hide-details="auto" class="run-cell-input run-cell-input--sm" />
                  <span v-else class="text-medium-emphasis">—</span>
                </td>
                <td>
                  <v-text-field v-if="row.selected" v-model.number="row.advanceAmount" type="number" min="0"
                    density="compact" variant="outlined" hide-details="auto" class="run-cell-input run-cell-input--sm" />
                  <span v-else class="text-medium-emphasis">—</span>
                </td>
                <td class="text-right font-weight-bold">
                  <span v-if="row.selected">₹{{ fmt(calcFinal(row)) }}</span>
                  <span v-else class="text-medium-emphasis">—</span>
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr class="bg-grey-lighten-5 font-weight-bold run-total-row">
                <td></td>
                <td class="run-total-label">Total</td>
                <td class="run-total-value">{{ fmt(runTotalDays) }}</td>
                <td></td>
                <td class="run-total-value">₹{{ fmt(runTotalWages) }}</td>
                <td></td>
                <td></td>
                <td></td>
                <td class="run-total-value">₹{{ fmt(runTotalFinal) }}</td>
              </tr>
            </tfoot>
          </v-table>
          </template>

          <template v-else>
            <v-select
              v-model="selectedEmployeeId"
              :items="employees"
              item-title="name"
              item-value="_id"
              label="Employee *"
              density="compact"
              variant="outlined"
              class="mb-3"
            />

            <div class="text-subtitle-2 font-weight-bold mb-2">Weekly Groups (Monday to Sunday)</div>
            <v-table density="compact" class="run-input-table run-input-table--weekly mb-2">
              <thead>
                <tr class="bg-grey-lighten-4">
                  <th style="width:230px">Week (Mon to Sun)</th>
                  <th class="text-right" style="width:95px">Days</th>
                  <th class="text-right" style="width:120px">Wages/Per</th>
                  <th class="text-right" style="width:130px">Total Wages</th>
                  <th class="text-right" style="width:105px">Deduction %</th>
                  <th class="text-right" style="width:120px">Market Amt</th>
                  <th class="text-right" style="width:120px">Advance Amt</th>
                  <th class="text-right" style="width:120px">Final Salary</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in weeklyRows" :key="row.weekStart">
                  <td class="font-weight-medium">
                    <div class="week-range">{{ formatWeekRange(row.weekStart, row.weekEnd) }}</div>
                    <div class="week-meta">Week {{ weekNumber(row.weekStart) }}</div>
                  </td>
                  <td>
                    <v-text-field v-model.number="row.daysWorked" type="number" min="0"
                      density="compact" variant="outlined" hide-details="auto" class="run-cell-input run-cell-input--xs" @update:model-value="syncFromDaysOrWage(row)" />
                  </td>
                  <td>
                    <v-text-field v-model.number="row.wagePerDay" type="number" min="0"
                      density="compact" variant="outlined" hide-details="auto" class="run-cell-input" @update:model-value="syncFromDaysOrWage(row)" />
                  </td>
                  <td>
                    <v-text-field v-model.number="row.totalWages" type="number" min="0"
                      density="compact" variant="outlined" hide-details="auto" class="run-cell-input" @update:model-value="syncFromTotalWages(row)" />
                  </td>
                  <td>
                    <v-text-field v-model.number="row.deductionPercentage" type="number" min="0" max="100"
                      density="compact" variant="outlined" hide-details="auto" class="run-cell-input run-cell-input--sm" />
                  </td>
                  <td>
                    <v-text-field v-model.number="row.marketAmount" type="number" min="0"
                      density="compact" variant="outlined" hide-details="auto" class="run-cell-input run-cell-input--sm" />
                  </td>
                  <td>
                    <v-text-field v-model.number="row.advanceAmount" type="number" min="0"
                      density="compact" variant="outlined" hide-details="auto" class="run-cell-input run-cell-input--sm" />
                  </td>
                  <td class="text-right font-weight-bold">₹{{ fmt(calcFinal(row)) }}</td>
                </tr>
              </tbody>
              <tfoot>
                <tr class="bg-grey-lighten-5 font-weight-bold run-total-row">
                  <td class="run-total-label">Total</td>
                  <td class="run-total-value">{{ fmt(weeklyTotalDays) }}</td>
                  <td></td>
                  <td class="run-total-value">₹{{ fmt(weeklyTotalWages) }}</td>
                  <td></td>
                  <td></td>
                  <td></td>
                  <td class="run-total-value">₹{{ fmt(weeklyTotalFinal) }}</td>
                </tr>
              </tfoot>
            </v-table>
          </template>
        </v-card-text>
        <v-card-actions class="px-5 pb-5">
          <v-spacer />
          <v-btn variant="text" rounded="lg" @click="runDialog = false">Cancel</v-btn>
          <v-btn color="success" rounded="lg" elevation="0" :loading="loading" @click="saveRun">{{ runMode === 'employee' ? 'Create Weekly Runs' : 'Create Run' }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Edit Run Dialog -->
    <v-dialog v-model="editRunDialog" max-width="1180" scrollable>
      <v-card rounded="xl">
        <div class="dialog-header dialog-header--blue">
          <v-icon icon="mdi-pencil-outline" size="22" class="mr-2" />
          Edit Salary Run
        </div>
        <v-card-text class="px-5 pt-5">
          <v-row class="mb-2 run-period-row" dense>
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
          <v-table density="compact" class="run-input-table">
            <thead>
              <tr class="bg-grey-lighten-4">
                <th style="min-width:180px">Name</th>
                <th style="width:100px">Days Worked</th>
                <th style="width:120px">Wage/Day (Rs.)</th>
                <th style="width:130px">Total Wages (Rs.)</th>
                <th style="width:110px">Deduction %</th>
                <th style="width:120px">Market Amount</th>
                <th style="width:120px">Advance Amount</th>
                <th class="text-right" style="width:110px">Final Salary</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in editRunRows" :key="row.employeeId">
                <td class="font-weight-medium">{{ row.name }}</td>
                <td>
                  <v-text-field v-model.number="row.daysWorked" type="number" min="0"
                    density="compact" variant="outlined" hide-details="auto" class="run-cell-input run-cell-input--xs" @update:model-value="syncFromDaysOrWage(row)" />
                </td>
                <td>
                  <v-text-field v-model.number="row.wagePerDay" type="number" min="0"
                    density="compact" variant="outlined" hide-details="auto" class="run-cell-input" @update:model-value="syncFromDaysOrWage(row)" />
                </td>
                <td>
                  <v-text-field v-model.number="row.totalWages" type="number" min="0"
                    density="compact" variant="outlined" hide-details="auto" class="run-cell-input" @update:model-value="syncFromTotalWages(row)" />
                </td>
                <td>
                  <v-text-field v-model.number="row.deductionPercentage" type="number" min="0" max="100"
                    density="compact" variant="outlined" hide-details="auto" class="run-cell-input run-cell-input--sm" />
                </td>
                <td>
                  <v-text-field v-model.number="row.marketAmount" type="number" min="0"
                    density="compact" variant="outlined" hide-details="auto" class="run-cell-input run-cell-input--sm" />
                </td>
                <td>
                  <v-text-field v-model.number="row.advanceAmount" type="number" min="0"
                    density="compact" variant="outlined" hide-details="auto" class="run-cell-input run-cell-input--sm" />
                </td>
                <td class="text-right font-weight-bold">₹{{ fmt(calcFinal(row)) }}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr class="bg-grey-lighten-5 font-weight-bold">
                <td class="text-right">Total</td>
                <td class="text-right">{{ fmt(editRunRows.reduce((s, r) => s + toNumber(r.daysWorked), 0)) }}</td>
                <td></td>
                <td class="text-right">₹{{ fmt(editRunRows.reduce((s, r) => s + calcRunAmounts(r).totalWages, 0)) }}</td>
                <td></td>
                <td></td>
                <td></td>
                <td class="text-right">₹{{ fmt(editRunRows.reduce((s, r) => s + calcRunAmounts(r).finalSalary, 0)) }}</td>
              </tr>
            </tfoot>
          </v-table>
          <div class="text-caption text-medium-emphasis mt-2">
            Note: Amounts already paid are preserved. Pending balance will be recalculated.
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
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
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

// ── State ──────────────────────────────────────────────────────────────────────
const selMonth = ref(now.getMonth() + 1)
const selYear  = ref(now.getFullYear())
const activeTab = ref('employees')
const loading   = ref(false)

const employees       = ref([])
const monthRuns       = ref([])
const employeeSummary = ref([])
const paymentHistory  = ref([])

const loadingRuns    = ref(false)
const loadingSummary  = ref(false)
const loadingPayslip  = ref(false)
const loadingHistory  = ref(false)
const summaryLoadError = ref(false)

const runsView = ref('employee')

const snack = ref({ show: false, text: '', color: 'success' })

const confirmDialog  = ref(false)
const confirmMessage = ref('')
const confirmAction  = ref(() => {})
let monthRunsRequestSeq = 0

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
          totalDays: 0, totalWages: 0, deductionAmount: 0, netSalary: 0, finalSalary: 0, amountPaid: 0, amountPending: 0,
        }
      }
      map[id].periods.push({
        runId: run._id,
        periodStart: run.periodStart, periodEnd: run.periodEnd,
        daysWorked: emp.daysWorked, dailyWage: emp.dailyWage,
        totalWages: emp.totalWages, deductionAmount: emp.deductionAmount,
        netSalary: emp.netSalary,
        marketAmount: emp.marketAmount || 0,
        advanceAmount: emp.advanceAmount || 0,
        finalSalary: emp.finalSalary ?? emp.netSalary,
        amountPaid: emp.amountPaid,
      })
      map[id].totalDays       += emp.daysWorked      || 0
      map[id].totalWages      += emp.totalWages      || 0
      map[id].deductionAmount += emp.deductionAmount || 0
      map[id].netSalary       += emp.netSalary       || 0
      map[id].finalSalary     += (emp.finalSalary ?? emp.netSalary) || 0
      map[id].amountPaid      += emp.amountPaid      || 0
      map[id].amountPending   += emp.amountPending   || 0
    })
  })
  return Object.values(map)
})

// ── Helpers ────────────────────────────────────────────────────────────────────
const fmt = (num) => new Intl.NumberFormat('en-IN').format(Math.round(Number(num) || 0))

const fmtDate = (date) => {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

const toNumber = (v) => {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

const hasValue = (v) => v !== '' && v !== null && v !== undefined && !Number.isNaN(Number(v))

const round2 = (v) => Math.round(toNumber(v) * 100) / 100

const runNet = (run) => run.employees.reduce((s, e) => s + toNumber(e.finalSalary ?? e.netSalary), 0)

const calcGross = (row) => {
  const explicitTotal = toNumber(row.totalWages)
  if (explicitTotal > 0) return round2(explicitTotal)
  return round2(toNumber(row.daysWorked) * toNumber(row.wagePerDay))
}

const calcRunAmounts = (row) => {
  const totalWages = calcGross(row)
  const deductionAmount = Math.round(totalWages * (toNumber(row.deductionPercentage) / 100))
  const netSalary = totalWages - deductionAmount
  const marketAmount = toNumber(row.marketAmount)
  const advanceAmount = toNumber(row.advanceAmount)
  const finalSalary = Math.max(0, netSalary - marketAmount - advanceAmount)
  return { totalWages, deductionAmount, netSalary, marketAmount, advanceAmount, finalSalary }
}

const calcFinal = (row) => calcRunAmounts(row).finalSalary

const nextSunday = (dateStr) => {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return ''
  const sunday = new Date(d)
  const diff = (7 - d.getDay()) % 7
  sunday.setDate(d.getDate() + diff)
  return `${sunday.getFullYear()}-${String(sunday.getMonth() + 1).padStart(2, '0')}-${String(sunday.getDate()).padStart(2, '0')}`
}

const mondayOfWeek = (date) => {
  const d = new Date(date)
  const day = d.getDay()
  const shift = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + shift)
  d.setHours(0, 0, 0, 0)
  return d
}

const sundayOfWeek = (date) => {
  const d = mondayOfWeek(date)
  d.setDate(d.getDate() + 6)
  d.setHours(23, 59, 59, 999)
  return d
}

const asDateInput = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

const formatWeekRange = (start, end) => `${fmtDate(start)} to ${fmtDate(end)}`

const weekNumber = (date) => {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7))
  const week1 = new Date(d.getFullYear(), 0, 4)
  return 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7)
}

const notify = (text, color = 'success') => { snack.value = { show: true, text, color } }

function askConfirm(message, action) {
  confirmMessage.value = message
  confirmAction.value  = async () => { confirmDialog.value = false; await action() }
  confirmDialog.value  = true
}

function syncFromTotalWages(row) {
  if (!hasValue(row.totalWages)) {
    if (!hasValue(row.daysWorked) && !hasValue(row.wagePerDay)) row.totalWages = null
    return
  }
  const days = toNumber(row.daysWorked)
  const total = toNumber(row.totalWages)
  if (days > 0) {
    row.wagePerDay = round2(total / days)
  }
}

function syncFromDaysOrWage(row) {
  if (!hasValue(row.daysWorked) && !hasValue(row.wagePerDay)) {
    row.totalWages = null
    return
  }
  row.totalWages = round2(toNumber(row.daysWorked) * toNumber(row.wagePerDay))
}

function emitPayrollRefresh() {
  window.dispatchEvent(new CustomEvent('payroll-module-refresh'))
}

async function refreshPayrollViews() {
  await Promise.all([loadMonthRuns(selMonth.value, selYear.value), loadEmployeeSummary()])
  if (activeTab.value === 'employees') await loadEmployees()
  if (activeTab.value === 'payslip' && payslipData.value && payslipEmpId.value) await loadPayslip()
}

async function handlePayrollRefresh() {
  await refreshPayrollViews()
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

async function loadMonthRuns(month = selMonth.value, year = selYear.value) {
  const reqId = ++monthRunsRequestSeq
  loadingRuns.value = true
  try {
    const res = await api.get(`/payroll/history/${month}/${year}`)
    if (reqId !== monthRunsRequestSeq) return
    monthRuns.value = res.data.data || []
  } catch {
    if (reqId !== monthRunsRequestSeq) return
    notify('Failed to load salary runs', 'error')
  } finally {
    if (reqId !== monthRunsRequestSeq) return
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

// ── Watchers ───────────────────────────────────────────────────────────────────
watch([selMonth, selYear], () => {
  loadMonthRuns(selMonth.value, selYear.value)
  if (payslipData.value) payslipData.value = null
})

watch(activeTab, (tab) => {
  if (tab === 'payments') loadEmployeeSummary()
  if (tab === 'runs')     loadMonthRuns(selMonth.value, selYear.value)
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
    emitPayrollRefresh()
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
        emitPayrollRefresh()
      } catch (e) {
        notify(e.response?.data?.error || 'Failed to delete employee', 'error')
      }
    }
  )
}

// ── Salary Runs ────────────────────────────────────────────────────────────────
const runDialog    = ref(false)
const runStartMenu = ref(false)
const runEndMenu = ref(false)
const selectAllRun = ref(false)
const runRows      = ref([])
const weeklyRows   = ref([])
const weeklyPrefillMap = ref({})
const runMode      = ref('period')
const selectedEmployeeId = ref('')
const runForm      = ref({ periodStart: '', periodEnd: '', runTitle: '' })

const runTotalDays = computed(() =>
  runRows.value.filter(r => r.selected).reduce((s, r) => s + toNumber(r.daysWorked), 0)
)

const runTotalWages = computed(() =>
  runRows.value.filter(r => r.selected).reduce((s, r) => s + calcRunAmounts(r).totalWages, 0)
)

const runTotalFinal = computed(() =>
  runRows.value.filter(r => r.selected).reduce((s, r) => s + calcRunAmounts(r).finalSalary, 0)
)

const weeklyTotalDays = computed(() => weeklyRows.value.reduce((s, r) => s + toNumber(r.daysWorked), 0))
const weeklyTotalWages = computed(() => weeklyRows.value.reduce((s, r) => s + calcRunAmounts(r).totalWages, 0))
const weeklyTotalFinal = computed(() => weeklyRows.value.reduce((s, r) => s + calcRunAmounts(r).finalSalary, 0))

const selectedEmployee = computed(() => employees.value.find(e => e._id === selectedEmployeeId.value) || null)

function normalizeDateModelValue(value) {
  if (!value) return ''
  if (Array.isArray(value)) return normalizeDateModelValue(value[0])
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return asDateInput(d)
}

function onPickRunStart(value) {
  const dateValue = normalizeDateModelValue(value)
  if (!dateValue) return
  runForm.value.periodStart = dateValue
  runStartMenu.value = false
}

function onPickRunEnd(value) {
  const dateValue = normalizeDateModelValue(value)
  if (!dateValue) return
  runForm.value.periodEnd = dateValue
  runEndMenu.value = false
}

function openRunDialog() {
  const mm = String(selMonth.value).padStart(2, '0')
  const start = `${selYear.value}-${mm}-01`
  runForm.value = { periodStart: start, periodEnd: nextSunday(start), runTitle: '' }
  runMode.value = runsView.value === 'employee' ? 'employee' : 'period'
  selectedEmployeeId.value = employees.value[0]?._id || ''
  runRows.value = employees.value.map(e => ({
    ...e,
    selected: false,
    daysWorked: null,
    wagePerDay: null,
    deductionPercentage: null,
    totalWages: null,
    marketAmount: null,
    advanceAmount: null,
    notes: '',
  }))
  weeklyPrefillMap.value = {}
  weeklyRows.value = []
  selectAllRun.value = false
  rebuildWeeklyRows()
  runDialog.value = true
  if (runMode.value === 'employee') {
    loadWeeklyPrefill()
  }
}

function toggleAllRun(val) {
  runRows.value.forEach(r => (r.selected = val))
}

function rebuildWeeklyRows() {
  if (runMode.value !== 'employee') {
    weeklyRows.value = []
    return
  }

  const from = runForm.value.periodStart
  const to = runForm.value.periodEnd
  if (!from || !to) {
    weeklyRows.value = []
    return
  }
  const start = new Date(from)
  const end = new Date(to)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
    weeklyRows.value = []
    return
  }

  const currentMap = new Map(weeklyRows.value.map(w => [w.weekStart, w]))
  const prefillMap = weeklyPrefillMap.value || {}
  const startCursor = mondayOfWeek(start)
  const output = []
  for (let cursor = new Date(startCursor); cursor <= end; cursor.setDate(cursor.getDate() + 7)) {
    const weekStart = asDateInput(mondayOfWeek(cursor))
    const weekEnd = asDateInput(sundayOfWeek(cursor))
    const key = weekStart
    const prefill = prefillMap[key]
    const prev = currentMap.get(key)
    output.push(prefill || prev || {
      weekStart,
      weekEnd,
      runId: '',
      daysWorked: null,
      wagePerDay: null,
      totalWages: null,
      deductionPercentage: null,
      marketAmount: null,
      advanceAmount: null,
      notes: '',
    })
  }
  weeklyRows.value = output
}

async function loadWeeklyPrefill() {
  if (runMode.value !== 'employee' || !selectedEmployeeId.value || !runForm.value.periodStart || !runForm.value.periodEnd) {
    weeklyPrefillMap.value = {}
    rebuildWeeklyRows()
    return
  }

  try {
    const res = await api.get('/payroll/history-range', {
      params: {
        from: runForm.value.periodStart,
        to: runForm.value.periodEnd,
        employeeId: selectedEmployeeId.value,
      },
    })

    const prefill = {}
    const runs = res.data?.data || []
    runs.forEach(run => {
      const entry = (run.employees || []).find(e => e.employeeId?.toString() === selectedEmployeeId.value)
      if (!entry) return
      const key = asDateInput(mondayOfWeek(run.periodStart))
      prefill[key] = {
        weekStart: asDateInput(mondayOfWeek(run.periodStart)),
        weekEnd: asDateInput(sundayOfWeek(run.periodStart)),
        runId: run._id,
        daysWorked: entry.daysWorked,
        wagePerDay: entry.dailyWage,
        totalWages: entry.totalWages,
        deductionPercentage: entry.deductionPercentage,
        marketAmount: entry.marketAmount ?? null,
        advanceAmount: entry.advanceAmount ?? null,
        notes: entry.notes || '',
      }
    })
    weeklyPrefillMap.value = prefill
  } catch {
    weeklyPrefillMap.value = {}
  }

  rebuildWeeklyRows()
}

watch(() => runForm.value.periodStart, (val) => {
  if (!runDialog.value || !val || runMode.value !== 'period') return
  runForm.value.periodEnd = nextSunday(val)
})

watch([runMode, selectedEmployeeId, () => runForm.value.periodStart, () => runForm.value.periodEnd], () => {
  if (!runDialog.value) return
  if (runMode.value === 'employee') {
    loadWeeklyPrefill()
    return
  }
  weeklyPrefillMap.value = {}
  rebuildWeeklyRows()
})

async function saveRun() {
  if (!runForm.value.periodStart || !runForm.value.periodEnd)
    return notify('Period dates are required', 'error')
  const start = new Date(runForm.value.periodStart)
  const end = new Date(runForm.value.periodEnd)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()))
    return notify('Enter valid period dates', 'error')
  if (start > end)
    return notify('From date cannot be after to date', 'error')

  if (runMode.value === 'period') {
    const selected = runRows.value.filter(r => r.selected)
    if (!selected.length) return notify('Select at least one employee', 'error')

    loading.value = true
    try {
      await api.post('/payroll/generate', {
        month: selMonth.value,
        year: selYear.value,
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
          notes: r.notes || '',
        })),
      })
      runDialog.value = false
      notify('Salary run created')
      await refreshPayrollViews()
      emitPayrollRefresh()
    } catch (e) {
      notify(e.response?.data?.error || 'Failed to create run', 'error')
    } finally {
      loading.value = false
    }
    return
  }

  if (!selectedEmployeeId.value) return notify('Select one employee', 'error')
  const rowsToSave = weeklyRows.value.filter(r =>
    hasValue(r.daysWorked) || hasValue(r.wagePerDay) || hasValue(r.totalWages) || hasValue(r.deductionPercentage) || hasValue(r.marketAmount) || hasValue(r.advanceAmount) || (r.notes || '').trim().length
  )
  if (!rowsToSave.length) return notify('Enter payroll values for at least one week', 'error')

  loading.value = true
  try {
    const touchedRuns = []
    for (let i = 0; i < rowsToSave.length; i += 1) {
      const row = rowsToSave[i]
      const weekDate = new Date(row.weekStart)
      const rangeStart = new Date(runForm.value.periodStart)
      const bucketDate = weekDate < rangeStart ? rangeStart : weekDate
      const payload = {
        periodStart: row.weekStart,
        periodEnd: row.weekEnd,
        runTitle: runForm.value.runTitle || `Week ${i + 1}`,
        employeeEntries: [{
          employeeId: selectedEmployeeId.value,
          daysWorked: row.daysWorked,
          wagePerDay: row.wagePerDay,
          totalWages: row.totalWages,
          deductionPercentage: row.deductionPercentage,
          marketAmount: row.marketAmount,
          advanceAmount: row.advanceAmount,
          notes: row.notes || '',
        }],
      }

      if (row.runId) {
        const res = await api.put(`/payroll/history/${row.runId}`, payload)
        if (res?.data?.data) touchedRuns.push(res.data.data)
      } else {
        const res = await api.post('/payroll/generate', {
          month: bucketDate.getMonth() + 1,
          year: bucketDate.getFullYear(),
          ...payload,
        })
        if (res?.data?.data) touchedRuns.push(res.data.data)
      }
    }

    if (touchedRuns.length) {
      const map = new Map(monthRuns.value.map(r => [r._id, r]))
      touchedRuns.forEach(run => {
        if (Number(run.month) === Number(selMonth.value) && Number(run.year) === Number(selYear.value)) {
          map.set(run._id, run)
        }
      })
      monthRuns.value = Array.from(map.values()).sort((a, b) => new Date(a.periodStart) - new Date(b.periodStart))
    }

    const firstWeek = rowsToSave[0]
    if (firstWeek?.weekStart) {
      const firstDate = new Date(runForm.value.periodStart)
      if (!Number.isNaN(firstDate.getTime())) {
        selMonth.value = firstDate.getMonth() + 1
        selYear.value = firstDate.getFullYear()
      }
    }

    runDialog.value = false
    notify('Employee weekly salary runs created')
    runsView.value = 'employee'
    activeTab.value = 'runs'
    await refreshPayrollViews()
    emitPayrollRefresh()
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
        // Reflect delete instantly in the current list before server refresh completes.
        monthRuns.value = monthRuns.value.filter(r => r._id !== run._id)
        notify('Salary run deleted')
        await refreshPayrollViews()
        emitPayrollRefresh()
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

function openEditRunDialog(run) {
  editingRun.value  = run
  const toInputDate = (d) => { const dt = new Date(d); return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}` }
  editRunForm.value = {
    periodStart: toInputDate(run.periodStart),
    periodEnd:   toInputDate(run.periodEnd),
    runTitle:    run.runTitle || '',
  }
  editRunRows.value = run.employees.map(e => ({
    employeeId:          e.employeeId,
    name:                e.name,
    daysWorked:          e.daysWorked,
    wagePerDay:          e.dailyWage,
    totalWages:          e.totalWages || 0,
    deductionPercentage: e.deductionPercentage,
    marketAmount:        e.marketAmount || 0,
    advanceAmount:       e.advanceAmount || 0,
  }))
  editRunDialog.value = true
}

function openEditRunById(runId) {
  const run = monthRuns.value.find(r => r._id === runId)
  if (!run) return
  openEditRunDialog(run)
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
      })),
    })
    editRunDialog.value = false
    notify('Salary run updated')
    await refreshPayrollViews()
    emitPayrollRefresh()
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
    await refreshPayrollViews()
    emitPayrollRefresh()
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
    await refreshPayrollViews()
    emitPayrollRefresh()
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
    { label: 'Deduction Balance Pending', value: d.deductionBalancePending, cls: d.deductionBalancePending > 0 ? 'text-error' : '' },
    { label: 'Gross Salary (this month)', value: d.totalWages,          cls: '' },
    { label: 'Deduction Amount',          value: d.deductionAmount,     cls: 'text-error' },
    { label: 'Market Amount',             value: d.marketAmount,        cls: 'text-error' },
    { label: 'Advance Amount',            value: d.advanceAmount,       cls: 'text-error' },
    { label: 'Net Salary (this month)',   value: d.netSalary,           cls: '' },
    { label: 'Final Salary (this month)', value: d.finalSalary,         cls: '' },
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
    let totalWages = 0, deductionAmount = 0, marketAmount = 0, advanceAmount = 0, netSalary = 0, finalSalary = 0, amountPaid = 0, deductionReturned = 0, currentMonthPending = 0

    runs.forEach(run => {
      // Only include runs whose period START falls within the selected month
      const ps = new Date(run.periodStart)
      if (ps.getMonth() + 1 !== selMonth.value || ps.getFullYear() !== selYear.value) return
      const entry = run.employees.find(e => e.employeeId?.toString() === payslipEmpId.value)
      if (!entry) return
      entries.push({
        periodStart: run.periodStart, periodEnd: run.periodEnd,
        daysWorked: entry.daysWorked, dailyWage: entry.dailyWage,
        totalWages: entry.totalWages,
        deductionAmount: entry.deductionAmount,
        marketAmount: entry.marketAmount || 0,
        advanceAmount: entry.advanceAmount || 0,
        netSalary: entry.netSalary,
        finalSalary: entry.finalSalary ?? entry.netSalary,
      })
      totalWages          += entry.totalWages       || 0
      deductionAmount     += entry.deductionAmount  || 0
      marketAmount        += entry.marketAmount     || 0
      advanceAmount       += entry.advanceAmount    || 0
      netSalary           += entry.netSalary        || 0
      finalSalary         += (entry.finalSalary ?? entry.netSalary) || 0
      amountPaid          += entry.amountPaid       || 0
      deductionReturned   += entry.deductionPaidBack || 0
      currentMonthPending += entry.amountPending    || 0
    })

    const carryForwardPending = Math.max(0, (empSum?.totalPending || 0) - currentMonthPending)
    const deductionBalancePending = Math.max(0, Number(empSum?.deductionBalance) || (deductionAmount - deductionReturned))
    const closingPending = carryForwardPending + currentMonthPending + deductionBalancePending

    payslipData.value = {
      name: empInfo?.name || 'Employee',
      entries, totalWages, deductionAmount, marketAmount, advanceAmount, netSalary, finalSalary, amountPaid, deductionReturned,
      carryForwardPending,
      deductionBalancePending,
      amountPending: closingPending,
      paymentStatus: closingPending <= 0 ? 'paid' : amountPaid > 0 ? 'partial' : 'pending',
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
  await Promise.all([loadEmployees(), loadMonthRuns(), loadEmployeeSummary()])
  window.addEventListener('payroll-module-refresh', handlePayrollRefresh)
})

onBeforeUnmount(() => {
  window.removeEventListener('payroll-module-refresh', handlePayrollRefresh)
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

/* ══ Border Card ═════════════════════════════════════════════════════ */
.border-card { border: 1px solid #e8eaf0 !important; background: #fff !important; }

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
.period-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.period-table th {
  background: #f0f4ff; padding: 10px 14px;
  font-weight: 700; color: #3c3c8a; border-bottom: 2px solid #d0d8f0; white-space: nowrap;
  font-size: 11.5px; letter-spacing: .3px; text-transform: uppercase;
}
.period-table td { padding: 10px 14px; border-bottom: 1px solid #eeeeee; white-space: nowrap; }
.period-table tbody tr:hover td { background: #f0f4ff; }
.period-table .row-alt td { background: #fafbfc; }
.period-table .tfoot-row td {
  background: #e8eaf6; font-weight: 700;
  border-top: 2px solid #9fa8da; border-bottom: none;
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
.run-input-table :deep(thead th) {
  vertical-align: bottom;
  padding-top: 8px !important;
  padding-bottom: 8px !important;
  line-height: 1.2;
  white-space: nowrap;
}
.run-input-table :deep(.v-table__wrapper) {
  overflow-x: auto;
}
.run-input-table :deep(table) {
  table-layout: auto;
  min-width: 1080px;
}
.run-input-table--weekly :deep(table) {
  min-width: 1120px;
}
.run-input-table :deep(tbody td) { vertical-align: middle; }
.run-input-table :deep(tbody td) {
  padding-top: 7px !important;
  padding-bottom: 7px !important;
}
.run-input-table :deep(tbody td:first-child) {
  white-space: nowrap;
}
.run-input-table :deep(tfoot td) {
  vertical-align: middle;
  border-top: 1px solid #dfe5ef;
  white-space: nowrap;
}
.run-input-table :deep(tbody tr:first-child td) { padding-top: 10px !important; }
.run-input-table :deep(tbody tr td) { border-bottom: 1px solid #e9edf4; }
.run-input-table :deep(tbody tr:last-child td) { border-bottom: none; }
.run-input-table :deep(.v-field) { border-radius: 10px; }
.run-input-table :deep(.v-field__input) { min-height: 36px; }
.run-input-table :deep(.v-input) { margin-top: 0; }
.run-cell-input { min-width: 104px; }
.run-cell-input--sm { min-width: 92px; }
.run-cell-input--xs { min-width: 82px; }

.run-total-row td {
  background: #f5f8fe;
  text-align: center;
}

.run-total-row .run-total-label {
  text-align: left;
}

.run-total-row .run-total-value {
  text-align: center;
}

.week-range {
  font-weight: 700;
  color: #263238;
  white-space: nowrap;
}

.week-meta {
  font-size: 11px;
  color: #607d8b;
  margin-top: 2px;
}

/* Date picker alignment inside run dialog */
:deep(.v-date-picker-month__weekday) {
  text-align: center;
}
:deep(.v-date-picker-month__day) {
  display: flex;
  justify-content: center;
}
:deep(.v-date-picker-month__day-btn) {
  margin: 0;
}
:deep(.v-date-picker-month__weeknumber) {
  text-align: center;
  color: #607d8b;
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
}
</style>
