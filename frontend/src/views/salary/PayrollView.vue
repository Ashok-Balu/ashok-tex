<template>
  <div class="pa-4">

    <!-- ── Header ── -->
    <div class="d-flex align-center justify-space-between flex-wrap gap-3 mb-4">
      <div>
        <div class="text-h5 font-weight-bold">Payroll Management</div>
        <div class="text-caption text-medium-emphasis">Wages · Salary Runs · Payments · Payslip</div>
      </div>
      <div class="d-flex align-center gap-2">
        <v-select
          v-model="selMonth"
          :items="MONTHS"
          item-title="label"
          item-value="value"
          density="compact"
          hide-details
          variant="outlined"
          style="min-width:140px"
        />
        <v-select
          v-model="selYear"
          :items="YEARS"
          density="compact"
          hide-details
          variant="outlined"
          style="min-width:95px"
        />
      </div>
    </div>

    <!-- ── Summary Cards ── -->
    <v-row class="mb-3">
      <v-col v-for="c in summaryCards" :key="c.label" cols="6" md="3">
        <v-card :color="c.color" variant="tonal" rounded="lg">
          <v-card-text class="pa-3">
            <div class="text-caption text-medium-emphasis">{{ c.label }}</div>
            <div class="text-h6 font-weight-bold mt-1">{{ c.value }}</div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- ── Tabs ── -->
    <v-tabs v-model="activeTab" color="primary" class="mb-0">
      <v-tab value="employees" prepend-icon="mdi-account-group">Employees</v-tab>
      <v-tab value="runs"      prepend-icon="mdi-calendar-clock">Salary Runs</v-tab>
      <v-tab value="payments"  prepend-icon="mdi-cash-multiple">Payments</v-tab>
      <v-tab value="payslip"   prepend-icon="mdi-file-document-outline">Payslip</v-tab>
    </v-tabs>
    <v-divider class="mb-4" />

    <v-tabs-window v-model="activeTab">

      <!-- ═══ TAB 1 — EMPLOYEES ═══ -->
      <v-tabs-window-item value="employees">
        <div class="d-flex justify-end mb-3">
          <v-btn color="primary" prepend-icon="mdi-plus" @click="openEmpDialog()">
            Add Employee
          </v-btn>
        </div>
        <v-card rounded="lg" elevation="1">
          <v-data-table
            :headers="empHeaders"
            :items="employees"
            item-value="_id"
            :loading="loading"
            no-data-text="No employees yet — click Add Employee to get started."
          >
            <template #item.deductionPercentage="{ item }">
              <v-chip color="warning" size="x-small" label>{{ item.deductionPercentage }}%</v-chip>
            </template>
            <template #item.actions="{ item }">
              <div class="d-flex gap-1 justify-end">
                <v-btn icon="mdi-pencil" size="small" variant="tonal" color="primary" @click="openEmpDialog(item)" />
                <v-btn icon="mdi-delete" size="small" variant="tonal" color="error" @click="confirmDeleteEmp(item)" />
              </div>
            </template>
            <template #no-data>
              <div class="text-center pa-8">
                <v-icon icon="mdi-account-group-outline" size="56" color="grey-lighten-1" class="mb-3 d-block" />
                <div class="text-subtitle-1 font-weight-medium mb-1">No employees yet</div>
                <div class="text-caption text-medium-emphasis mb-4">Add your first employee to start running salaries</div>
                <v-btn color="primary" prepend-icon="mdi-plus" @click="openEmpDialog()">Add Employee</v-btn>
              </div>
            </template>
          </v-data-table>
        </v-card>
      </v-tabs-window-item>

      <!-- ═══ TAB 2 — SALARY RUNS ═══ -->
      <v-tabs-window-item value="runs">

        <div class="d-flex align-center justify-space-between mb-3">
          <div class="text-subtitle-1 font-weight-medium">{{ selMonthLabel }} {{ selYear }}</div>
          <v-btn color="success" prepend-icon="mdi-plus" @click="openRunDialog">New Salary Run</v-btn>
        </div>

        <v-btn-toggle v-model="runsView" mandatory density="compact" class="mb-4" color="primary">
          <v-btn value="period"   prepend-icon="mdi-calendar-range">By Period</v-btn>
          <v-btn value="employee" prepend-icon="mdi-account-multiple">By Employee</v-btn>
        </v-btn-toggle>

        <div v-if="loadingRuns" class="text-center pa-8">
          <v-progress-circular indeterminate color="primary" />
        </div>

        <div v-else-if="!monthRuns.length" class="text-center pa-8 text-medium-emphasis">
          <v-icon icon="mdi-calendar-blank" size="48" class="mb-2 d-block" />
          No salary runs for {{ selMonthLabel }} {{ selYear }}
        </div>

        <template v-else>

          <!-- By Period -->
          <v-expansion-panels v-if="runsView === 'period'" variant="accordion">
            <v-expansion-panel v-for="run in monthRuns" :key="run._id">
              <v-expansion-panel-title class="run-panel-title">
                <div class="run-title-inner">
                  <!-- left: icon + date/label -->
                  <div class="run-title-left">
                    <v-icon icon="mdi-calendar-range" color="primary" size="20" class="run-cal-icon" />
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
                    <v-btn icon="mdi-pencil-outline" size="small" variant="tonal" color="primary" @click.stop="openEditRunDialog(run)" />
                    <v-btn icon="mdi-trash-can-outline" size="small" variant="tonal" color="error" @click.stop="confirmDeleteRun(run)" />
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
                        <th class="text-right">Gross</th>
                        <th class="text-right">Deduction</th>
                        <th class="text-right">Net Salary</th>
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
                        <td class="text-right font-weight-bold">₹{{ fmt(emp.netSalary) }}</td>
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
                        <td colspan="3" class="text-right">Run Total</td>
                        <td class="text-right">₹{{ fmt(run.employees.reduce((s,e)=>s+(e.totalWages||0),0)) }}</td>
                        <td class="text-right c-error">₹{{ fmt(run.employees.reduce((s,e)=>s+(e.deductionAmount||0),0)) }}</td>
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
          <v-expansion-panels v-else variant="accordion">
            <v-expansion-panel v-for="row in monthEmpSummary" :key="row.employeeId">
              <v-expansion-panel-title class="run-panel-title">
                <div class="run-title-inner">
                  <!-- left: avatar + name -->
                  <div class="run-title-left">
                    <v-avatar color="primary" size="36" class="run-cal-icon flex-shrink-0">
                      <span class="text-caption text-white font-weight-bold">{{ row.name.charAt(0).toUpperCase() }}</span>
                    </v-avatar>
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
                <v-table density="compact" class="text-body-2">
                  <thead>
                    <tr class="bg-grey-lighten-4">
                      <th>From</th>
                      <th>To</th>
                      <th class="text-right">Days</th>
                      <th class="text-right">Wage/Day</th>
                      <th class="text-right">Gross</th>
                      <th class="text-right">Deduction</th>
                      <th class="text-right">Net</th>
                      <th class="text-right">Paid</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="p in row.periods" :key="p.periodStart">
                      <td>{{ fmtDate(p.periodStart) }}</td>
                      <td>{{ fmtDate(p.periodEnd) }}</td>
                      <td class="text-right">{{ p.daysWorked }}</td>
                      <td class="text-right">₹{{ fmt(p.dailyWage) }}</td>
                      <td class="text-right">₹{{ fmt(p.totalWages) }}</td>
                      <td class="text-right text-error">₹{{ fmt(p.deductionAmount) }}</td>
                      <td class="text-right font-weight-bold">₹{{ fmt(p.netSalary) }}</td>
                      <td class="text-right text-success">₹{{ fmt(p.amountPaid) }}</td>
                    </tr>
                  </tbody>
                  <tfoot>
                    <tr class="bg-grey-lighten-5 font-weight-bold">
                      <td colspan="4" class="text-right pr-2">Month Total</td>
                      <td class="text-right">₹{{ fmt(row.totalWages) }}</td>
                      <td class="text-right text-error">₹{{ fmt(row.deductionAmount) }}</td>
                      <td class="text-right">₹{{ fmt(row.netSalary) }}</td>
                      <td class="text-right text-success">₹{{ fmt(row.amountPaid) }}</td>
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

        <div v-if="loadingSummary" class="text-center pa-8">
          <v-progress-circular indeterminate color="primary" />
          <div class="text-caption text-medium-emphasis mt-3">Loading payment summary...</div>
        </div>

        <div v-else-if="summaryLoadError" class="text-center pa-10">
          <v-icon icon="mdi-cloud-off-outline" size="56" color="grey-lighten-1" class="mb-3 d-block" />
          <div class="text-subtitle-1 font-weight-medium mb-1">Could not load payment data</div>
          <div class="text-caption text-medium-emphasis mb-4">
            The backend may not be running or needs a restart.
          </div>
          <v-btn color="primary" prepend-icon="mdi-refresh" @click="loadEmployeeSummary">Try Again</v-btn>
        </div>

        <div v-else-if="!employeeSummary.length" class="text-center pa-10">
          <v-icon icon="mdi-account-cash-outline" size="56" color="grey-lighten-1" class="mb-3 d-block" />
          <div class="text-subtitle-1 font-weight-medium mb-1">No employees yet</div>
          <div class="text-caption text-medium-emphasis mb-4">Add employees and create salary runs first</div>
          <v-btn color="primary" prepend-icon="mdi-account-plus" @click="activeTab = 'employees'">Go to Employees</v-btn>
        </div>

        <v-row v-else>
          <v-col v-for="emp in employeeSummary" :key="emp._id" cols="12" sm="6" lg="4">
            <v-card rounded="lg" class="h-100">
              <div v-if="emp.totalPending > 0" style="height:4px;background:rgb(var(--v-theme-error))" />
              <div v-else style="height:4px;background:rgb(var(--v-theme-success))" />
              <v-card-text class="pb-1">
                <div class="d-flex align-center justify-space-between mb-2">
                  <div class="font-weight-bold text-body-1">{{ emp.name }}</div>
                  <v-chip :color="emp.totalPending > 0 ? 'error' : 'success'" size="small" label>
                    {{ emp.totalPending > 0 ? 'Pending' : 'Settled' }}
                  </v-chip>
                </div>
                <div v-if="emp.phone" class="text-caption text-medium-emphasis mb-2">{{ emp.phone }}</div>
                <v-divider class="mb-2" />
                <v-row dense>
                  <v-col cols="6">
                    <div class="text-caption text-medium-emphasis">Total Earned</div>
                    <div class="font-weight-medium text-body-2">₹{{ fmt(emp.totalNet) }}</div>
                  </v-col>
                  <v-col cols="6">
                    <div class="text-caption text-medium-emphasis">Total Paid</div>
                    <div class="font-weight-medium text-success text-body-2">₹{{ fmt(emp.totalPaid) }}</div>
                  </v-col>
                  <v-col cols="6" class="mt-2">
                    <div class="text-caption text-medium-emphasis">Pending (All Months)</div>
                    <div class="font-weight-bold text-body-2" :class="emp.totalPending > 0 ? 'text-error' : 'text-success'">
                      ₹{{ fmt(emp.totalPending) }}
                    </div>
                  </v-col>
                  <v-col cols="6" class="mt-2">
                    <div class="text-caption text-medium-emphasis">Deduction Balance</div>
                    <div class="font-weight-medium text-warning text-body-2">₹{{ fmt(emp.deductionBalance) }}</div>
                  </v-col>
                </v-row>
              </v-card-text>
              <v-card-actions class="pt-0 pb-2 px-3">
                <v-btn
                  size="small" color="primary" variant="tonal"
                  :disabled="emp.totalPending <= 0"
                  @click="openPayDialog(emp)"
                >Pay Salary</v-btn>
                <v-btn
                  size="small" color="warning" variant="tonal"
                  :disabled="emp.deductionBalance <= 0"
                  @click="openDeductDialog(emp)"
                >Return Deduction</v-btn>
                <v-spacer />
                <v-btn size="small" icon="mdi-history" variant="text" @click="openHistory(emp)" />
              </v-card-actions>
            </v-card>
          </v-col>
        </v-row>

      </v-tabs-window-item>

      <!-- ═══ TAB 4 — PAYSLIP ═══ -->
      <v-tabs-window-item value="payslip">
        <v-card rounded="lg">
          <v-card-text>
            <div class="d-flex align-center gap-3 flex-wrap mb-4">
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
            </div>

            <div v-if="!payslipData && !loadingPayslip" class="text-center pa-6 text-medium-emphasis text-body-2">
              Select an employee above and click Generate to preview the payslip
            </div>

            <template v-if="payslipData">
              <v-divider class="mb-4" />
              <div class="d-flex justify-space-between align-center mb-1">
                <div>
                  <div class="text-h6 font-weight-bold">ASHOK TEX</div>
                  <div class="text-caption text-medium-emphasis">AUTOLOOM</div>
                </div>
                <div class="text-right">
                  <div class="text-subtitle-1 font-weight-bold">PAYSLIP</div>
                  <div class="text-caption text-medium-emphasis">{{ selMonthLabel }} {{ selYear }}</div>
                </div>
              </div>
              <div class="text-body-2 mb-4"><strong>Employee:</strong> {{ payslipData.name }}</div>

              <div class="text-subtitle-2 font-weight-bold mb-2">Period-wise Salary Details</div>
              <v-table density="compact" class="mb-4">
                <thead>
                  <tr class="bg-grey-lighten-3">
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
                  <tr v-for="(entry, i) in payslipData.entries" :key="i" :class="i % 2 === 1 ? 'bg-grey-lighten-5' : ''">
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

              <div class="text-subtitle-2 font-weight-bold mb-2">Summary</div>
              <v-table density="compact">
                <tbody>
                  <tr v-for="row in payslipSummaryRows" :key="row.label">
                    <td class="text-body-2">{{ row.label }}</td>
                    <td class="text-right font-weight-bold text-body-2" :class="row.cls">₹{{ fmt(row.value) }}</td>
                  </tr>
                </tbody>
              </v-table>

              <div class="mt-4 text-body-2 font-weight-bold"
                :class="payslipData.paymentStatus === 'paid' ? 'text-success' : 'text-error'"
              >
                STATUS:
                {{ payslipData.paymentStatus === 'paid' ? 'FULLY PAID' :
                   payslipData.paymentStatus === 'partial' ? 'PARTIAL PAYMENT' : 'PAYMENT PENDING' }}
              </div>
            </template>
          </v-card-text>
        </v-card>
      </v-tabs-window-item>

    </v-tabs-window>

    <!-- ══ DIALOGS ══ -->

    <!-- Employee Dialog -->
    <v-dialog v-model="empDialog" max-width="420">
      <v-card rounded="lg">
        <v-card-title class="pt-4 px-4">{{ editingEmp ? 'Edit Employee' : 'Add Employee' }}</v-card-title>
        <v-card-text class="px-4">
          <v-text-field v-model="empForm.name" label="Full Name *" density="compact" variant="outlined" class="mb-3" />
          <v-text-field v-model="empForm.phone" label="Phone" density="compact" variant="outlined" class="mb-3" />
          <v-text-field v-model.number="empForm.deductionPercentage" label="Deduction %" type="number" min="0" max="100" density="compact" variant="outlined"
            hint="Percentage deducted from each salary run" persistent-hint />
        </v-card-text>
        <v-card-actions class="px-4 pb-4">
          <v-spacer />
          <v-btn variant="text" @click="empDialog = false">Cancel</v-btn>
          <v-btn color="primary" :loading="loading" @click="saveEmployee">Save</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- New Run Dialog -->
    <v-dialog v-model="runDialog" max-width="860" scrollable>
      <v-card rounded="lg">
        <v-card-title class="pt-4 px-4">New Salary Run — {{ selMonthLabel }} {{ selYear }}</v-card-title>
        <v-card-text class="px-4">
          <v-row class="mb-2">
            <v-col cols="12" sm="4">
              <v-text-field v-model="runForm.periodStart" label="From Date *" type="date" density="compact" variant="outlined" />
            </v-col>
            <v-col cols="12" sm="4">
              <v-text-field v-model="runForm.periodEnd" label="To Date *" type="date" density="compact" variant="outlined" />
            </v-col>
            <v-col cols="12" sm="4">
              <v-text-field v-model="runForm.runTitle" label="Label (e.g. Week 1)" density="compact" variant="outlined" />
            </v-col>
          </v-row>

          <div class="text-subtitle-2 font-weight-bold mb-2">Select Employees</div>
          <v-table density="compact">
            <thead>
              <tr class="bg-grey-lighten-4">
                <th style="width:44px">
                  <v-checkbox v-model="selectAllRun" density="compact" hide-details @update:model-value="toggleAllRun" />
                </th>
                <th>Name</th>
                <th style="width:100px">Days Worked</th>
                <th style="width:120px">Wage/Day (Rs.)</th>
                <th style="width:110px">Deduction %</th>
                <th class="text-right" style="width:110px">Net Salary</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in runRows" :key="row._id">
                <td><v-checkbox v-model="row.selected" density="compact" hide-details /></td>
                <td class="font-weight-medium">{{ row.name }}</td>
                <td>
                  <v-text-field v-if="row.selected" v-model.number="row.daysWorked" type="number" min="0"
                    density="compact" variant="outlined" hide-details style="min-width:80px" />
                  <span v-else class="text-medium-emphasis">—</span>
                </td>
                <td>
                  <v-text-field v-if="row.selected" v-model.number="row.wagePerDay" type="number" min="0"
                    density="compact" variant="outlined" hide-details style="min-width:100px" />
                  <span v-else class="text-medium-emphasis">—</span>
                </td>
                <td>
                  <v-text-field v-if="row.selected" v-model.number="row.deductionPercentage" type="number" min="0" max="100"
                    density="compact" variant="outlined" hide-details style="min-width:90px" />
                  <span v-else class="text-medium-emphasis">—</span>
                </td>
                <td class="text-right font-weight-bold">
                  <span v-if="row.selected">₹{{ fmt(calcNet(row)) }}</span>
                  <span v-else class="text-medium-emphasis">—</span>
                </td>
              </tr>
            </tbody>
          </v-table>
          <div class="text-right mt-2 text-body-2 font-weight-bold">Total Net: ₹{{ fmt(runTotalNet) }}</div>
        </v-card-text>
        <v-card-actions class="px-4 pb-4">
          <v-spacer />
          <v-btn variant="text" @click="runDialog = false">Cancel</v-btn>
          <v-btn color="success" :loading="loading" @click="saveRun">Create Run</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Edit Run Dialog -->
    <v-dialog v-model="editRunDialog" max-width="860" scrollable>
      <v-card rounded="lg">
        <v-card-title class="pt-4 px-4">Edit Salary Run</v-card-title>
        <v-card-text class="px-4">
          <v-row class="mb-2">
            <v-col cols="12" sm="4">
              <v-text-field v-model="editRunForm.periodStart" label="From Date *" type="date" density="compact" variant="outlined" />
            </v-col>
            <v-col cols="12" sm="4">
              <v-text-field v-model="editRunForm.periodEnd" label="To Date *" type="date" density="compact" variant="outlined" />
            </v-col>
            <v-col cols="12" sm="4">
              <v-text-field v-model="editRunForm.runTitle" label="Label (e.g. Week 1)" density="compact" variant="outlined" />
            </v-col>
          </v-row>

          <div class="text-subtitle-2 font-weight-bold mb-2">Employee Details</div>
          <v-table density="compact">
            <thead>
              <tr class="bg-grey-lighten-4">
                <th>Name</th>
                <th style="width:100px">Days Worked</th>
                <th style="width:120px">Wage/Day (Rs.)</th>
                <th style="width:110px">Deduction %</th>
                <th class="text-right" style="width:110px">Net Salary</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in editRunRows" :key="row.employeeId">
                <td class="font-weight-medium">{{ row.name }}</td>
                <td>
                  <v-text-field v-model.number="row.daysWorked" type="number" min="0"
                    density="compact" variant="outlined" hide-details style="min-width:80px" />
                </td>
                <td>
                  <v-text-field v-model.number="row.wagePerDay" type="number" min="0"
                    density="compact" variant="outlined" hide-details style="min-width:100px" />
                </td>
                <td>
                  <v-text-field v-model.number="row.deductionPercentage" type="number" min="0" max="100"
                    density="compact" variant="outlined" hide-details style="min-width:90px" />
                </td>
                <td class="text-right font-weight-bold">₹{{ fmt(calcNet(row)) }}</td>
              </tr>
            </tbody>
          </v-table>
          <div class="text-caption text-medium-emphasis mt-2">
            Note: Amounts already paid are preserved. Pending balance will be recalculated.
          </div>
        </v-card-text>
        <v-card-actions class="px-4 pb-4">
          <v-spacer />
          <v-btn variant="text" @click="editRunDialog = false">Cancel</v-btn>
          <v-btn color="primary" :loading="loading" @click="saveEditRun">Save Changes</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Pay Salary Dialog -->
    <v-dialog v-model="payDialog" max-width="420">
      <v-card rounded="lg">
        <v-card-title class="pt-4 px-4">Record Salary Payment</v-card-title>
        <v-card-text class="px-4">
          <div class="text-body-2 mb-3">
            Employee: <strong>{{ payTarget?.name }}</strong><br />
            Total Pending: <strong class="text-error">₹{{ fmt(payTarget?.totalPending) }}</strong>
          </div>
          <v-text-field v-model.number="payForm.amount" label="Amount (Rs.) *" type="number" min="0" density="compact" variant="outlined" class="mb-3" />
          <v-select v-model="payForm.method" :items="PAYMENT_METHODS" label="Payment Method" density="compact" variant="outlined" class="mb-3" />
          <v-textarea v-model="payForm.notes" label="Notes" rows="2" density="compact" variant="outlined" />
        </v-card-text>
        <v-card-actions class="px-4 pb-4">
          <v-spacer />
          <v-btn variant="text" @click="payDialog = false">Cancel</v-btn>
          <v-btn color="primary" :loading="loading" @click="recordPayment">Record</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Return Deduction Dialog -->
    <v-dialog v-model="deductDialog" max-width="420">
      <v-card rounded="lg">
        <v-card-title class="pt-4 px-4">Return Deduction to Employee</v-card-title>
        <v-card-text class="px-4">
          <div class="text-body-2 mb-3">
            Employee: <strong>{{ deductTarget?.name }}</strong><br />
            Deduction Balance: <strong class="text-warning">₹{{ fmt(deductTarget?.deductionBalance) }}</strong>
          </div>
          <v-text-field v-model.number="deductForm.amount" label="Amount to Return (Rs.) *" type="number" min="0" density="compact" variant="outlined" class="mb-3" />
          <v-select v-model="deductForm.method" :items="PAYMENT_METHODS" label="Payment Method" density="compact" variant="outlined" class="mb-3" />
          <v-textarea v-model="deductForm.notes" label="Notes" rows="2" density="compact" variant="outlined" />
        </v-card-text>
        <v-card-actions class="px-4 pb-4">
          <v-spacer />
          <v-btn variant="text" @click="deductDialog = false">Cancel</v-btn>
          <v-btn color="warning" :loading="loading" @click="recordDeductReturn">Record</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Payment History Dialog -->
    <v-dialog v-model="historyDialog" max-width="600" scrollable>
      <v-card rounded="lg">
        <v-card-title class="pt-4 px-4">Payment History — {{ historyEmp?.name }}</v-card-title>
        <v-card-text class="px-4">
          <div v-if="loadingHistory" class="text-center pa-4">
            <v-progress-circular indeterminate color="primary" />
          </div>
          <v-table v-else-if="paymentHistory.length" density="compact">
            <thead>
              <tr class="bg-grey-lighten-4">
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
                  <v-chip :color="h.paymentType === 'deduction_return' ? 'warning' : 'success'" size="x-small" label>
                    {{ h.paymentType === 'deduction_return' ? 'Deduction Return' : 'Salary' }}
                  </v-chip>
                </td>
                <td class="text-right font-weight-medium">₹{{ fmt(h.amountPaid) }}</td>
                <td class="text-capitalize">{{ h.paymentMethod }}</td>
                <td class="text-caption text-medium-emphasis">{{ h.notes || '—' }}</td>
              </tr>
            </tbody>
          </v-table>
          <div v-else class="text-center pa-6 text-medium-emphasis">No payment history yet</div>
        </v-card-text>
        <v-card-actions class="px-4 pb-4">
          <v-spacer />
          <v-btn variant="text" @click="historyDialog = false">Close</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Confirm Dialog -->
    <v-dialog v-model="confirmDialog" max-width="400">
      <v-card rounded="lg">
        <v-card-title class="pt-4 px-4">Confirm</v-card-title>
        <v-card-text class="px-4">{{ confirmMessage }}</v-card-text>
        <v-card-actions class="px-4 pb-4">
          <v-spacer />
          <v-btn variant="text" @click="confirmDialog = false">Cancel</v-btn>
          <v-btn color="error" @click="confirmAction">Delete</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Snackbar -->
    <v-snackbar v-model="snack.show" :color="snack.color" :timeout="3000" location="bottom right">
      {{ snack.text }}
    </v-snackbar>

  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import api from '@/plugins/axios'
import { downloadPayslip as downloadPayslipPdf } from '@/utils/payslipPdf'

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
        netSalary: emp.netSalary, amountPaid: emp.amountPaid,
      })
      map[id].totalWages      += emp.totalWages      || 0
      map[id].deductionAmount += emp.deductionAmount || 0
      map[id].netSalary       += emp.netSalary       || 0
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

const runNet = (run) => run.employees.reduce((s, e) => s + (e.netSalary || 0), 0)

const statusColor = (s) => ({ paid: 'success', partial: 'warning', pending: 'error' }[s] || 'default')

const calcNet = (row) => {
  const gross     = (row.daysWorked || 0) * (row.wagePerDay || 0)
  const deduction = Math.round(gross * (row.deductionPercentage || 0) / 100)
  return gross - deduction
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

// ── Watchers ───────────────────────────────────────────────────────────────────
watch([selMonth, selYear], () => {
  loadMonthRuns()
  if (payslipData.value) payslipData.value = null
})

watch(activeTab, (tab) => {
  if (tab === 'payments') loadEmployeeSummary()
  if (tab === 'runs')     loadMonthRuns()
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

// ── Salary Runs ────────────────────────────────────────────────────────────────
const runDialog    = ref(false)
const selectAllRun = ref(false)
const runRows      = ref([])
const runForm      = ref({ periodStart: '', periodEnd: '', runTitle: '' })

const runTotalNet = computed(() =>
  runRows.value.filter(r => r.selected).reduce((s, r) => s + calcNet(r), 0)
)

function openRunDialog() {
  const mm = String(selMonth.value).padStart(2, '0')
  runForm.value = { periodStart: `${selYear.value}-${mm}-01`, periodEnd: `${selYear.value}-${mm}-01`, runTitle: '' }
  runRows.value = employees.value.map(e => ({
    ...e,
    selected: false, daysWorked: 0,
    wagePerDay: e.dailyWage || 0,
    deductionPercentage: e.deductionPercentage || 0,
  }))
  selectAllRun.value = false
  runDialog.value = true
}

function toggleAllRun(val) {
  runRows.value.forEach(r => (r.selected = val))
}

async function saveRun() {
  if (!runForm.value.periodStart || !runForm.value.periodEnd)
    return notify('Period dates are required', 'error')
  const selected = runRows.value.filter(r => r.selected)
  if (!selected.length) return notify('Select at least one employee', 'error')

  loading.value = true
  try {
    await api.post('/payroll/generate', {
      month: selMonth.value, year: selYear.value,
      periodStart: runForm.value.periodStart,
      periodEnd:   runForm.value.periodEnd,
      runTitle:    runForm.value.runTitle,
      employeeEntries: selected.map(r => ({
        employeeId: r._id, daysWorked: r.daysWorked,
        wagePerDay: r.wagePerDay, deductionPercentage: r.deductionPercentage,
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
    deductionPercentage: e.deductionPercentage,
  }))
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
        deductionPercentage: r.deductionPercentage,
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

// ── Init ───────────────────────────────────────────────────────────────────────
onMounted(async () => {
  await Promise.all([loadEmployees(), loadMonthRuns(), loadEmployeeSummary()])
})
</script>

<style scoped>
/* ══ Run Panel Title ═══════════════════════════════════════════════ */
:deep(.run-panel-title) {
  min-height: 72px !important;
  padding-top: 0 !important;
  padding-bottom: 0 !important;
}
/* Remove Vuetify's default ripple overlay that clips content */
:deep(.run-panel-title .v-expansion-panel-title__overlay) { display: none; }

/* The wrapper inside the panel title slot must fill width */
.run-title-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  gap: 16px;
  min-width: 0;
  padding-right: 4px;
}

/* Left: icon + text */
.run-title-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1 1 0;
  min-width: 0;
  overflow: hidden;
}
.run-cal-icon { flex-shrink: 0; }
.run-dates {
  font-size: 14px;
  font-weight: 600;
  color: #212121;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.run-sub {
  font-size: 12px;
  color: #757575;
  margin-top: 2px;
  white-space: nowrap;
}

/* Right: stats + delete button - NEVER shrink */
.run-title-right {
  display: flex;
  align-items: center;
  gap: 20px;
  flex-shrink: 0;
}
.run-stat {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  min-width: 70px;
}
.run-stat-label {
  font-size: 11px;
  color: #9e9e9e;
  line-height: 1.3;
}
.run-stat-value {
  font-size: 15px;
  font-weight: 700;
  color: #212121;
  white-space: nowrap;
}
.run-net { color: #2e7d32 !important; }

/* ══ Period Table ═══════════════════════════════════════════════════ */
.period-table-wrapper {
  overflow-x: auto;
  border-top: 1px solid #e0e0e0;
}
.period-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.period-table th {
  background: #f5f5f5;
  padding: 9px 14px;
  font-weight: 600;
  color: #424242;
  border-bottom: 2px solid #ddd;
  white-space: nowrap;
}
.period-table td {
  padding: 10px 14px;
  border-bottom: 1px solid #eeeeee;
  white-space: nowrap;
}
.period-table tbody tr:hover td { background: #f3f4ff; }
.period-table .row-alt td { background: #fafafa; }
.period-table .tfoot-row td {
  background: #e8eaf6;
  font-weight: 700;
  border-top: 2px solid #9fa8da;
  border-bottom: none;
}
.c-error  { color: #c62828; }
.c-success { color: #2e7d32; }

/* ══ Status Badge ═══════════════════════════════════════════════════ */
.status-badge {
  display: inline-block;
  padding: 3px 9px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 600;
  text-transform: capitalize;
}
.status-paid    { background: #e8f5e9; color: #1b5e20; }
.status-partial { background: #fff3e0; color: #e65100; }
.status-pending { background: #fce4ec; color: #b71c1c; }
</style>
