<template>
  <div class="payroll-root">

    <!-- ── Hero Header ── -->
    <div class="hero">
      <div class="hero__left">
        <div class="hero__icon-wrap">
          <v-icon icon="mdi-account-cash" size="32" color="white" />
        </div>
        <div>
          <h1 class="hero__title">Payroll Management</h1>
          <p class="hero__sub">Employee Management &amp; Weekly Salary Runs</p>
        </div>
      </div>
    </div>

    <!-- ── Navigation Tabs ── -->
    <div class="nav-strip">
      <button
        :class="['nav-btn', activeModule === 'employees' && 'nav-btn--active']"
        @click="activeModule = 'employees'"
      >
        <v-icon size="18" class="mr-2">mdi-account-group</v-icon>
        Employees
      </button>
      <button
        :class="['nav-btn', activeModule === 'salary-run' && 'nav-btn--active']"
        @click="activeModule = 'salary-run'"
      >
        <v-icon size="18" class="mr-2">mdi-calendar-clock</v-icon>
        Salary Run
      </button>
      <button
        :class="['nav-btn', activeModule === 'salary-entries' && 'nav-btn--active']"
        @click="activeModule = 'salary-entries'; loadSalaryRuns()"
      >
        <v-icon size="18" class="mr-2">mdi-clipboard-text-clock</v-icon>
        Salary Entries
      </button>
      <button
        :class="['nav-btn', activeModule === 'payments' && 'nav-btn--active']"
        @click="activeModule = 'payments'; loadPaymentSummary()"
      >
        <v-icon size="18" class="mr-2">mdi-cash-multiple</v-icon>
        Payments
      </button>
      <button
        :class="['nav-btn', activeModule === 'payslip' && 'nav-btn--active']"
        @click="activeModule = 'payslip'"
      >
        <v-icon size="18" class="mr-2">mdi-file-document-outline</v-icon>
        Payslip
      </button>
      <button
        :class="['nav-btn', activeModule === 'emp-summary' && 'nav-btn--active']"
        @click="activeModule = 'emp-summary'; if (!empSummaryData) loadEmpSummary()"
      >
        <v-icon size="18" class="mr-2">mdi-chart-box-outline</v-icon>
        Employee Summary
      </button>
    </div>

    <!-- ═══════════════════════════════════════════════════════════════════════ -->
    <!-- EMPLOYEE MANAGEMENT -->
    <!-- ═══════════════════════════════════════════════════════════════════════ -->
    <template v-if="activeModule === 'employees'">

      <!-- Add/Edit Employee Form -->
      <transition name="slide-fade">
        <div v-if="showEmpForm" class="glass-card mb-5">
          <div class="glass-card__header">
            <v-icon :icon="editingEmp ? 'mdi-account-edit' : 'mdi-account-plus'" size="20" class="mr-2" />
            {{ editingEmp ? 'Edit Employee' : 'Add New Employee' }}
          </div>
          <div class="glass-card__body">
            <v-row dense>
              <v-col cols="12" md="3">
                <v-text-field
                  v-model="empForm.name"
                  label="Name *"
                  placeholder="Employee full name"
                  density="compact"
                  variant="outlined"
                  rounded="lg"
                  prepend-inner-icon="mdi-account"
                />
              </v-col>
              <v-col cols="12" md="3">
                <v-text-field
                  v-model="empForm.phone"
                  label="Phone Number"
                  placeholder="9876543210"
                  density="compact"
                  variant="outlined"
                  rounded="lg"
                  prepend-inner-icon="mdi-phone"
                  maxlength="10"
                  :rules="[v => !v || /^\d{0,10}$/.test(v) || 'Max 10 digits']"
                  @keypress="onlyDigits"
                />
              </v-col>
              <v-col cols="12" md="2">
                <v-text-field
                  v-model.number="empForm.currentDefaultDailyWage"
                  label="Daily Wage *"
                  type="number"
                  min="0"
                  density="compact"
                  variant="outlined"
                  rounded="lg"
                  prefix="₹"
                />
              </v-col>
              <v-col cols="12" md="2">
                <v-select
                  v-model="empForm.deductionType"
                  :items="deductionTypes"
                  item-title="label"
                  item-value="value"
                  label="Deduction Type"
                  density="compact"
                  variant="outlined"
                  rounded="lg"
                />
              </v-col>
              <v-col cols="12" md="2">
                <v-text-field
                  v-model.number="empForm.deductionValue"
                  :label="empForm.deductionType === 'percentage' ? 'Deduction %' : 'Deduction Amount'"
                  type="number"
                  min="0"
                  density="compact"
                  variant="outlined"
                  rounded="lg"
                  :suffix="empForm.deductionType === 'percentage' ? '%' : '₹'"
                />
              </v-col>
            </v-row>
            <div class="d-flex justify-end mt-3" style="gap: 10px">
              <v-btn variant="outlined" rounded="lg" @click="cancelEmpForm">Cancel</v-btn>
              <v-btn color="primary" rounded="lg" elevation="0" :loading="saving" @click="saveEmployee">
                {{ editingEmp ? 'Update' : 'Save Employee' }}
              </v-btn>
            </div>
          </div>
        </div>
      </transition>

      <!-- Employee List -->
      <div class="glass-card">
        <div class="glass-card__header glass-card__header--between">
          <span><v-icon icon="mdi-account-group" size="20" class="mr-2" />Employees ({{ employees.length }})</span>
          <v-btn
            v-if="!showEmpForm"
            color="primary"
            size="small"
            prepend-icon="mdi-plus"
            rounded="lg"
            elevation="0"
            @click="openEmpForm()"
          >Add Employee</v-btn>
        </div>
        <div class="glass-card__body pa-0">
          <div v-if="!employees.length" class="empty-state">
            <div class="empty-state__icon">
              <v-icon icon="mdi-account-group-outline" size="48" color="primary" />
            </div>
            <h3>No Employees Yet</h3>
            <p>Add your first employee to start managing payroll</p>
            <v-btn color="primary" prepend-icon="mdi-plus" rounded="lg" @click="openEmpForm()">Add Employee</v-btn>
          </div>
          <div v-else class="emp-table-wrap">
            <table class="emp-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Phone</th>
                  <th class="text-right">Daily Wage</th>
                  <th>Deduction</th>
                  <th class="text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="emp in employees" :key="emp._id">
                  <td>
                    <div class="emp-cell">
                      <div class="tex-av-3d" style="width:36px;height:36px;font-size:13px" :style="{ backgroundColor: nameColor(emp.name) }">{{ nameInitials(emp.name) }}</div>
                      <span class="emp-name">{{ emp.name }}</span>
                    </div>
                  </td>
                  <td class="text-medium-emphasis">{{ emp.phone || '—' }}</td>
                  <td class="text-right font-weight-bold">₹{{ fmt(emp.currentDefaultDailyWage) }}</td>
                  <td>
                    <span class="deduction-chip">
                      {{ emp.deductionType === 'percentage' ? `${emp.deductionValue}% of Gross` : `₹${fmt(emp.deductionValue)} / day` }}
                    </span>
                  </td>
                  <td class="text-center">
                    <v-btn icon="mdi-pencil" size="x-small" variant="tonal" color="primary" class="mr-1" @click="openEmpForm(emp)" />
                    <v-btn icon="mdi-delete" size="x-small" variant="tonal" color="error" @click="confirmDeleteEmp(emp)" />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </template>

    <!-- ═══════════════════════════════════════════════════════════════════════ -->
    <!-- SALARY RUN -->
    <!-- ═══════════════════════════════════════════════════════════════════════ -->
    <template v-if="activeModule === 'salary-run'">

      <!-- Mode Selection -->
      <div v-if="!salaryRunMode" class="mode-selection">
        <h2 class="mode-selection__title">Create Salary Run</h2>
        <p class="mode-selection__sub">Choose how you want to enter salary data</p>
        <div class="mode-cards">
          <div class="mode-card" @click="startSalaryRun('by_period')">
            <div class="mode-card__icon mode-card__icon--blue">
              <v-icon icon="mdi-calendar-week" size="36" color="white" />
            </div>
            <h3>By Period</h3>
            <p>Enter wages for ALL employees for one week</p>
          </div>
          <div class="mode-card" @click="startSalaryRun('by_employee')">
            <div class="mode-card__icon mode-card__icon--green">
              <v-icon icon="mdi-account-clock" size="36" color="white" />
            </div>
            <h3>By Employee</h3>
            <p>Enter wages for ONE employee over a date range</p>
          </div>
        </div>
      </div>

      <!-- Salary Run Entry -->
      <div v-else>
        <div class="d-flex align-center justify-space-between mb-4 flex-wrap" style="gap: 12px">
          <v-btn variant="text" prepend-icon="mdi-arrow-left" @click="salaryRunMode = null">Back</v-btn>
          <div class="run-mode-badge">
            <v-icon size="16" class="mr-1">{{ salaryRunMode === 'by_period' ? 'mdi-calendar-week' : 'mdi-account-clock' }}</v-icon>
            {{ salaryRunMode === 'by_period' ? 'By Period' : 'By Employee' }}
          </div>
        </div>

        <!-- Period Selector -->
        <div class="glass-card mb-4">
          <div class="glass-card__body">
            <v-row dense align="center">
              <v-col v-if="salaryRunMode === 'by_employee'" cols="12" md="3">
                <v-select
                  v-model="selectedEmployeeId"
                  :items="employees"
                  item-title="name"
                  item-value="_id"
                  label="Select Employee"
                  density="compact"
                  variant="outlined"
                  rounded="lg"
                  hide-details
                  @update:model-value="generateByEmployee"
                />
              </v-col>
              <v-col cols="12" :md="salaryRunMode === 'by_employee' ? 3 : 4">
                <v-menu v-model="startDateMenu" :close-on-content-click="false" location="bottom start">
                  <template #activator="{ props }">
                    <v-text-field
                      :model-value="runStartDate ? fmtDateDisplay(runStartDate) : ''"
                      :label="salaryRunMode === 'by_period' ? 'Select a Date (any day in the week)' : 'From Date'"
                      density="compact"
                      variant="outlined"
                      rounded="lg"
                      hide-details
                      readonly
                      v-bind="props"
                      prepend-inner-icon="mdi-calendar"
                    />
                  </template>
                  <v-date-picker
                    :model-value="runStartDate ? new Date(runStartDate) : undefined"
                    @update:model-value="onPickStartDate"
                    :first-day-of-week="1"
                    color="primary"
                    show-adjacent-months
                  />
                </v-menu>
              </v-col>
              <v-col v-if="salaryRunMode === 'by_employee'" cols="12" md="3">
                <v-menu v-model="endDateMenu" :close-on-content-click="false" location="bottom start">
                  <template #activator="{ props }">
                    <v-text-field
                      :model-value="runEndDate ? fmtDateDisplay(runEndDate) : ''"
                      label="To Date"
                      density="compact"
                      variant="outlined"
                      rounded="lg"
                      hide-details
                      readonly
                      v-bind="props"
                      prepend-inner-icon="mdi-calendar"
                    />
                  </template>
                  <v-date-picker
                    :model-value="runEndDate ? new Date(runEndDate) : undefined"
                    @update:model-value="onPickEndDate"
                    :first-day-of-week="1"
                    color="primary"
                    show-adjacent-months
                  />
                </v-menu>
              </v-col>
              <v-col cols="12" :md="salaryRunMode === 'by_employee' ? 3 : 4">
                <div class="week-display" v-if="weekDays.length">
                  <v-icon icon="mdi-calendar-range" size="16" class="mr-1" color="primary" />
                  <span>{{ fmtDateShort(weekDays[0].date) }} → {{ fmtDateShort(weekDays[6].date) }}</span>
                  <span class="ml-2 text-caption text-medium-emphasis">(Mon–Sun)</span>
                </div>
              </v-col>
              <v-col v-if="salaryRunMode === 'by_period'" cols="12" md="4">
                <div class="month-badge" v-if="runMonth && runYear">
                  Month: <strong>{{ monthName(runMonth) }} {{ runYear }}</strong>
                </div>
              </v-col>
            </v-row>
          </div>
        </div>

        <!-- By Period Table -->
        <template v-if="salaryRunMode === 'by_period' && weekDays.length && periodRows.length">
          <div class="glass-card">
            <div class="glass-card__header glass-card__header--between">
              <span>Weekly Wage Entry</span>
              <div class="d-flex" style="gap: 8px">
                <v-btn size="small" variant="tonal" color="primary" prepend-icon="mdi-content-save" rounded="lg" :loading="saving" @click="saveSalaryRun">
                  Save Salary Run
                </v-btn>
              </div>
            </div>
            <div class="glass-card__body pa-0">
              <div class="salary-table-wrap">
                <table class="salary-table">
                  <thead>
                    <tr>
                      <th class="sticky-col">Employee</th>
                      <th v-for="day in weekDays" :key="day.date" :class="{ 'disabled-col': !day.editable }" class="day-col">
                        <div class="day-header">
                          <span class="day-name">{{ day.dayName }}</span>
                          <span class="day-date">{{ day.dateShort }}</span>
                        </div>
                      </th>
                      <th class="num-col">Days</th>
                      <th class="num-col">Gross</th>
                      <th class="num-col">Ded. Type</th>
                      <th class="num-col">Deduction</th>
                      <th class="num-col">Market</th>
                      <th class="num-col">Advance</th>
                      <th class="num-col final-col">Final</th>
                      <th class="action-col">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="row in periodRows" :key="row.employeeId" :class="{ 'row-disabled': row.alreadyEntered }">
                      <td class="sticky-col">
                        <div class="emp-cell">
                          <div class="tex-av-3d" style="width:28px;height:28px;font-size:10px" :style="{ backgroundColor: nameColor(row.name) }">{{ nameInitials(row.name) }}</div>
                          <div>
                            <span class="emp-name">{{ row.name }}</span>
                            <div v-if="row.alreadyEntered" class="text-caption" style="color:#d97706">Already entered</div>
                          </div>
                        </div>
                      </td>
                      <td v-for="day in weekDays" :key="`${row.employeeId}-${day.date}`" :class="{ 'disabled-col': !day.editable || row.alreadyEntered }">
                        <div v-if="day.editable && !row.alreadyEntered" class="wage-cell" @click="toggleDay(row, day.date)">
                          <input
                            type="number"
                            class="wage-input"
                            :class="{ 'wage-input--absent': !getDayEntry(row, day.date).worked }"
                            :value="getDayEntry(row, day.date).worked ? getDayEntry(row, day.date).wage : ''"
                            :placeholder="getDayEntry(row, day.date).worked ? '' : 'OFF'"
                            min="0"
                            @input="onWageInput(row, day.date, $event)"
                            @click.stop
                          />
                          <div
                            class="absent-toggle"
                            :class="{ 'absent-toggle--off': !getDayEntry(row, day.date).worked }"
                            @click.stop="toggleDay(row, day.date)"
                          >
                            <v-icon size="12">{{ getDayEntry(row, day.date).worked ? 'mdi-check' : 'mdi-close' }}</v-icon>
                          </div>
                        </div>
                        <div v-else class="disabled-day">—</div>
                      </td>
                      <td class="num-col">{{ calcRow(row).daysWorked }}</td>
                      <td class="num-col">₹{{ fmt(calcRow(row).gross) }}</td>
                      <td class="num-col">
                        <span class="deduction-chip deduction-chip--sm">{{ row.deductionType === 'percentage' ? `${row.deductionValue}%` : `₹${row.deductionValue}/day` }}</span>
                      </td>
                      <td class="num-col deduct-val">₹{{ fmt(calcRow(row).deduction) }}</td>
                      <td class="num-col">
                        <input v-if="!row.alreadyEntered" type="number" class="summary-input" v-model.number="row.market" min="0" placeholder="0" />
                        <span v-else>—</span>
                      </td>
                      <td class="num-col">
                        <input v-if="!row.alreadyEntered" type="number" class="summary-input" v-model.number="row.advance" min="0" placeholder="0" />
                        <span v-else>—</span>
                      </td>
                      <td class="num-col final-col font-weight-bold">₹{{ fmt(calcRow(row).final) }}</td>
                      <td class="action-col">
                        <div v-if="!row.alreadyEntered" class="row-actions">
                          <v-tooltip text="Fill Week (reset to default wage)" location="top">
                            <template #activator="{ props }">
                              <button class="row-action-btn" v-bind="props" @click="fillWeek(row)">
                                <v-icon size="14">mdi-calendar-check</v-icon>
                              </button>
                            </template>
                          </v-tooltip>
                          <v-tooltip text="Mark All Absent" location="top">
                            <template #activator="{ props }">
                              <button class="row-action-btn row-action-btn--red" v-bind="props" @click="markAllAbsent(row)">
                                <v-icon size="14">mdi-calendar-remove</v-icon>
                              </button>
                            </template>
                          </v-tooltip>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                  <tfoot>
                    <tr class="totals-row">
                      <td class="sticky-col font-weight-bold">TOTAL</td>
                      <td v-for="day in weekDays" :key="`total-${day.date}`" :class="{ 'disabled-col': !day.editable }"></td>
                      <td class="num-col font-weight-bold">{{ periodTotals.daysWorked }}</td>
                      <td class="num-col font-weight-bold">₹{{ fmt(periodTotals.gross) }}</td>
                      <td class="num-col font-weight-bold deduct-val">₹{{ fmt(periodTotals.deduction) }}</td>
                      <td class="num-col font-weight-bold">₹{{ fmt(periodTotals.market) }}</td>
                      <td class="num-col font-weight-bold">₹{{ fmt(periodTotals.advance) }}</td>
                      <td class="num-col font-weight-bold final-col">₹{{ fmt(periodTotals.final) }}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        </template>

        <!-- Already Covered Alert for By Employee -->
        <v-alert v-if="salaryRunMode === 'by_employee' && coveredWeeksMessage" type="warning" variant="tonal" class="mb-4" density="compact" rounded="lg">
          {{ coveredWeeksMessage }}
        </v-alert>

        <!-- By Employee Weeks -->
        <template v-if="salaryRunMode === 'by_employee' && employeeWeeks.length">
          <div class="glass-card mb-4" v-for="(week, wIdx) in employeeWeeks" :key="wIdx">
            <div class="glass-card__header glass-card__header--between">
              <span>Week {{ wIdx + 1 }} — {{ fmtDateShort(week.days[0].date) }} to {{ fmtDateShort(week.days[6].date) }}</span>
              <div class="d-flex" style="gap: 8px">
                <v-btn size="x-small" variant="tonal" color="primary" @click="fillWeekByEmployee(wIdx)">Fill Week</v-btn>
                <v-btn size="x-small" variant="tonal" color="error" @click="markAbsentByEmployee(wIdx)">All Absent</v-btn>
              </div>
            </div>
            <div class="glass-card__body pa-0">
              <div class="salary-table-wrap">
                <table class="salary-table salary-table--compact">
                  <thead>
                    <tr>
                      <th v-for="day in week.days" :key="day.date" :class="{ 'disabled-col': !day.editable }" class="day-col">
                        <div class="day-header">
                          <span class="day-name">{{ day.dayName }}</span>
                          <span class="day-date">{{ day.dateShort }}</span>
                        </div>
                      </th>
                      <th class="num-col">Days</th>
                      <th class="num-col">Gross</th>
                      <th class="num-col">Ded. Type</th>
                      <th class="num-col">Deduction</th>
                      <th class="num-col">Market</th>
                      <th class="num-col">Advance</th>
                      <th class="num-col final-col">Final</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td v-for="day in week.days" :key="`emp-${day.date}`" :class="{ 'disabled-col': !day.editable, 'already-entered-col': day.alreadyEntered }">
                        <div v-if="day.editable" class="wage-cell" @click="toggleDayEmp(wIdx, day.date)">
                          <input
                            type="number"
                            class="wage-input"
                            :class="{ 'wage-input--absent': !getEmpDayEntry(wIdx, day.date).worked }"
                            :value="getEmpDayEntry(wIdx, day.date).worked ? getEmpDayEntry(wIdx, day.date).wage : ''"
                            :placeholder="getEmpDayEntry(wIdx, day.date).worked ? '' : 'OFF'"
                            min="0"
                            @input="onEmpWageInput(wIdx, day.date, $event)"
                            @click.stop
                          />
                          <div
                            class="absent-toggle"
                            :class="{ 'absent-toggle--off': !getEmpDayEntry(wIdx, day.date).worked }"
                            @click.stop="toggleDayEmp(wIdx, day.date)"
                          >
                            <v-icon size="12">{{ getEmpDayEntry(wIdx, day.date).worked ? 'mdi-check' : 'mdi-close' }}</v-icon>
                          </div>
                        </div>
                        <div v-else-if="day.alreadyEntered" class="already-entered-day">
                          <v-icon size="12" color="warning">mdi-lock</v-icon>
                          <span>Done</span>
                        </div>
                        <div v-else class="disabled-day">—</div>
                      </td>
                      <td class="num-col">{{ calcEmpWeek(wIdx).daysWorked }}</td>
                      <td class="num-col">₹{{ fmt(calcEmpWeek(wIdx).gross) }}</td>
                      <td class="num-col">
                        <span class="deduction-chip deduction-chip--sm">{{ empDeductionLabel }}</span>
                      </td>
                      <td class="num-col deduct-val">₹{{ fmt(calcEmpWeek(wIdx).deduction) }}</td>
                      <td class="num-col">
                        <input type="number" class="summary-input" v-model.number="week.market" min="0" placeholder="0" />
                      </td>
                      <td class="num-col">
                        <input type="number" class="summary-input" v-model.number="week.advance" min="0" placeholder="0" />
                      </td>
                      <td class="num-col final-col font-weight-bold">₹{{ fmt(calcEmpWeek(wIdx).final) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          <div class="d-flex justify-end">
            <v-btn color="primary" size="large" prepend-icon="mdi-content-save" rounded="lg" :loading="saving" @click="saveSalaryRunByEmployee">
              Save All Weeks
            </v-btn>
          </div>
        </template>

      </div>
    </template>

    <!-- ═══════════════════════════════════════════════════════════════════════ -->
    <!-- SALARY ENTRIES (grouped by employee, expansion panels, editable) -->
    <!-- ═══════════════════════════════════════════════════════════════════════ -->
    <template v-if="activeModule === 'salary-entries'">
      <!-- Month Filter -->
      <div class="glass-card mb-4">
        <div class="glass-card__body">
          <v-row dense align="center">
            <v-col cols="6" md="3">
              <v-select v-model="entriesMonth" :items="monthItems" item-title="label" item-value="value" label="Month" density="compact" variant="outlined" rounded="lg" hide-details />
            </v-col>
            <v-col cols="6" md="3">
              <v-select v-model="entriesYear" :items="yearItems" label="Year" density="compact" variant="outlined" rounded="lg" hide-details />
            </v-col>
          </v-row>
        </div>
      </div>

      <div v-if="!filteredGroupedRuns.length" class="empty-state">
        <div class="empty-state__icon"><v-icon icon="mdi-clipboard-text-clock" size="48" color="primary" /></div>
        <h3>No Salary Entries</h3>
        <p>No entries found for {{ monthName(entriesMonth) }} {{ entriesYear }}</p>
      </div>

      <!-- Edit Mode -->
      <div v-else-if="editEntry" class="glass-card mb-4">
        <div class="glass-card__header glass-card__header--between">
          <span><v-icon icon="mdi-pencil" size="18" class="mr-2" />Editing: {{ editEntry.employeeName }} — {{ fmtDateShort(editEntry.periodStart) }} → {{ fmtDateShort(editEntry.periodEnd) }}</span>
          <v-btn variant="text" prepend-icon="mdi-arrow-left" @click="editEntry = null">Back</v-btn>
        </div>
        <div class="glass-card__body pa-0">
          <div class="salary-table-wrap">
            <table class="salary-table salary-table--compact">
              <thead>
                <tr>
                  <th v-for="day in editEntry.days" :key="day.date" :class="{ 'disabled-col': !day.editable }" class="day-col">
                    <div class="day-header">
                      <span class="day-name">{{ day.dayName }}</span>
                      <span class="day-date">{{ day.dateShort }}</span>
                    </div>
                  </th>
                  <th class="num-col">Days</th>
                  <th class="num-col">Gross</th>
                  <th class="num-col">Deduction</th>
                  <th class="num-col">Market</th>
                  <th class="num-col">Advance</th>
                  <th class="num-col final-col">Final</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td v-for="day in editEntry.days" :key="day.date" :class="{ 'disabled-col': !day.editable }">
                    <div v-if="day.editable" class="wage-cell">
                      <input
                        type="number"
                        class="wage-input"
                        :class="{ 'wage-input--absent': !editEntry.dailyEntries[day.date]?.worked }"
                        :value="editEntry.dailyEntries[day.date]?.worked ? editEntry.dailyEntries[day.date]?.wage : ''"
                        :placeholder="editEntry.dailyEntries[day.date]?.worked ? '' : 'OFF'"
                        min="0"
                        @input="onEditWageInput(day.date, $event)"
                        @click.stop
                      />
                      <div
                        class="absent-toggle"
                        :class="{ 'absent-toggle--off': !editEntry.dailyEntries[day.date]?.worked }"
                        @click="toggleEditDay(day.date)"
                      >
                        <v-icon size="12">{{ editEntry.dailyEntries[day.date]?.worked ? 'mdi-check' : 'mdi-close' }}</v-icon>
                      </div>
                    </div>
                    <div v-else class="disabled-day">—</div>
                  </td>
                  <td class="num-col">{{ calcEditEntry().daysWorked }}</td>
                  <td class="num-col">₹{{ fmt(calcEditEntry().gross) }}</td>
                  <td class="num-col deduct-val">₹{{ fmt(calcEditEntry().deduction) }}</td>
                  <td class="num-col">
                    <input type="number" class="summary-input" v-model.number="editEntry.market" min="0" placeholder="0" />
                  </td>
                  <td class="num-col">
                    <input type="number" class="summary-input" v-model.number="editEntry.advance" min="0" placeholder="0" />
                  </td>
                  <td class="num-col final-col font-weight-bold">₹{{ fmt(calcEditEntry().final) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="d-flex justify-end pa-4">
            <v-btn color="primary" rounded="lg" prepend-icon="mdi-content-save" :loading="saving" @click="saveEditEntry">Save Changes</v-btn>
          </div>
        </div>
      </div>

      <!-- Expansion Panels grouped by employee -->
      <v-expansion-panels v-else variant="accordion" class="entries-panels">
        <v-expansion-panel v-for="group in filteredGroupedRuns" :key="group.employeeId">
          <v-expansion-panel-title>
            <div class="d-flex align-center justify-space-between w-100">
              <div class="d-flex align-center" style="gap: 10px">
                <div class="tex-av-3d" style="width:28px;height:28px;font-size:10px" :style="{ backgroundColor: nameColor(group.name) }">{{ nameInitials(group.name) }}</div>
                <span class="font-weight-bold">{{ group.name }}</span>
                <span class="text-caption text-medium-emphasis ml-2">{{ group.runs.length }} week(s)</span>
              </div>
              <span class="font-weight-bold mr-4" style="color:#059669">₹{{ fmt(group.totalFinal) }}</span>
            </div>
          </v-expansion-panel-title>
          <v-expansion-panel-text>
            <div v-for="item in group.runs" :key="item.sreId" class="week-row-block">
              <div class="week-row-block__top">
                <span class="week-row-block__period">{{ fmtDateShort(item.periodStart) }} → {{ fmtDateShort(item.periodEnd) }}</span>
                <div class="d-flex align-center" style="gap: 8px">
                  <span class="week-row-block__final">₹{{ fmt(item.final) }}</span>
                  <v-btn icon="mdi-pencil" size="x-small" variant="tonal" color="primary" @click="openEditEntry(item)" />
                  <v-btn icon="mdi-delete" size="x-small" variant="tonal" color="error" @click="confirmDeleteRun(item.run)" />
                </div>
              </div>
              <div class="week-row-block__body">
                <div class="week-row-days">
                  <div v-for="day in getEntryDays(item)" :key="day.date" class="week-row-day" :class="day.worked ? 'week-row-day--worked' : 'week-row-day--off'">
                    <span class="week-row-day__label">{{ day.dayName }}<br>{{ day.dateShort }}</span>
                    <span class="week-row-day__val">{{ day.worked ? day.wage : 'OFF' }}</span>
                  </div>
                </div>
                <div class="week-row-summary">
                  <span class="week-row-stat"><em>{{ item.daysWorked }}d</em></span>
                  <span class="week-row-stat">₹{{ fmt(item.gross) }}</span>
                  <span class="week-row-stat week-row-stat--red">-₹{{ fmt(item.deductionAmount) }} <small>{{ item.deductionType === 'percentage' ? `${item.deductionValue}%` : `₹${item.deductionValue}/day` }}</small></span>
                  <span v-if="item.market" class="week-row-stat">Mkt ₹{{ fmt(item.market) }}</span>
                  <span v-if="item.advance" class="week-row-stat">Adv ₹{{ fmt(item.advance) }}</span>
                </div>
              </div>
            </div>
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>
    </template>

    <!-- ═══════════════════════════════════════════════════════════════════════ -->
    <!-- PAYMENTS -->
    <!-- ═══════════════════════════════════════════════════════════════════════ -->
    <template v-if="activeModule === 'payments'">
      <div v-if="loadingPayments" class="text-center pa-10">
        <v-progress-circular indeterminate color="primary" size="44" />
      </div>
      <div v-else-if="!paymentSummary.length" class="empty-state">
        <div class="empty-state__icon">
          <v-icon icon="mdi-cash-multiple" size="48" color="primary" />
        </div>
        <h3>No Payment Data</h3>
        <p>Create salary runs first to see payment information</p>
      </div>
      <template v-else>
        <!-- Overall Summary -->
        <div class="pay-overview mb-5">
          <div class="pay-overview__card pay-overview__card--total">
            <v-icon icon="mdi-wallet" size="24" color="white" />
            <div class="pay-overview__info">
              <span class="pay-overview__label">Total Earned</span>
              <span class="pay-overview__val">₹{{ fmt(payOverviewTotals.earned) }}</span>
            </div>
          </div>
          <div class="pay-overview__card pay-overview__card--paid">
            <v-icon icon="mdi-check-circle" size="24" color="white" />
            <div class="pay-overview__info">
              <span class="pay-overview__label">Total Paid</span>
              <span class="pay-overview__val">₹{{ fmt(payOverviewTotals.paid) }}</span>
            </div>
          </div>
          <div class="pay-overview__card pay-overview__card--pending">
            <v-icon icon="mdi-clock-alert" size="24" color="white" />
            <div class="pay-overview__info">
              <span class="pay-overview__label">Total Pending</span>
              <span class="pay-overview__val">₹{{ fmt(payOverviewTotals.pending) }}</span>
            </div>
          </div>
          <div class="pay-overview__card pay-overview__card--deduction">
            <v-icon icon="mdi-shield-alert" size="24" color="white" />
            <div class="pay-overview__info">
              <span class="pay-overview__label">Deduction Hold</span>
              <span class="pay-overview__val">₹{{ fmt(payOverviewTotals.deductionBal) }}</span>
            </div>
          </div>
        </div>

        <!-- Filter & Actions -->
        <div class="glass-card mb-4">
          <div class="glass-card__body" style="padding: 12px 20px">
            <v-row dense align="center">
              <v-col cols="12" md="4">
                <v-text-field
                  v-model="paySearchQuery"
                  prepend-inner-icon="mdi-magnify"
                  label="Search Employee"
                  density="compact"
                  variant="outlined"
                  rounded="lg"
                  hide-details
                  clearable
                />
              </v-col>
              <v-col cols="6" md="3">
                <v-select
                  v-model="payFilterStatus"
                  :items="[{ title: 'All', value: 'all' }, { title: 'Pending', value: 'pending' }, { title: 'Settled', value: 'settled' }]"
                  item-title="title"
                  item-value="value"
                  label="Status"
                  density="compact"
                  variant="outlined"
                  rounded="lg"
                  hide-details
                />
              </v-col>
              <v-col cols="6" md="3">
                <v-select
                  v-model="paySortBy"
                  :items="[{ title: 'Name A-Z', value: 'name' }, { title: 'Pending (High)', value: 'pending_desc' }, { title: 'Pending (Low)', value: 'pending_asc' }]"
                  item-title="title"
                  item-value="value"
                  label="Sort By"
                  density="compact"
                  variant="outlined"
                  rounded="lg"
                  hide-details
                />
              </v-col>
              <v-col cols="12" md="2" class="d-flex justify-end" style="gap: 6px">
                <v-btn size="small" variant="text" color="secondary" prepend-icon="mdi-filter-off" rounded="lg" @click="clearPayFilters">
                  Clear
                </v-btn>
                <v-btn size="small" color="success" variant="tonal" rounded="lg" prepend-icon="mdi-cash-fast" @click="openPayAllDialog" :disabled="payOverviewTotals.pending <= 0">
                  Pay All
                </v-btn>
              </v-col>
            </v-row>
          </div>
        </div>

        <!-- Employee Payment Table -->
        <div class="glass-card">
          <div class="glass-card__body pa-0">
            <div class="salary-table-wrap">
              <table class="salary-table" style="min-width: 800px">
                <thead>
                  <tr>
                    <th class="text-left" style="min-width: 180px; padding-left: 20px">Employee</th>
                    <th>Total Earned</th>
                    <th>Total Paid</th>
                    <th>Pending</th>
                    <th>Deduction Hold</th>
                    <th style="min-width: 160px">
                      Progress
                      <div style="display:flex;gap:8px;margin-top:3px;flex-wrap:wrap">
                        <span style="display:flex;align-items:center;gap:3px"><span style="display:inline-block;width:8px;height:6px;border-radius:2px;background:#10b981"></span><span style="font-size:9px;color:#64748b;font-weight:500">Paid / Returned</span></span>
                        <span style="display:flex;align-items:center;gap:3px"><span style="display:inline-block;width:8px;height:6px;border-radius:2px;background:#ef4444"></span><span style="font-size:9px;color:#64748b;font-weight:500">Pending / Hold</span></span>
                      </div>
                    </th>
                    <th style="min-width: 200px">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="emp in filteredPaymentSummary" :key="emp._id">
                    <td class="text-left" style="padding-left: 20px">
                      <div class="emp-cell">
                        <div class="tex-av-3d" style="width:28px;height:28px;font-size:10px" :style="{ backgroundColor: emp.totalPending > 0 ? '#ef4444' : '#10b981' }">{{ nameInitials(emp.name) }}</div>
                        <div>
                          <div class="emp-name">{{ emp.name }}</div>
                          <div v-if="emp.phone" class="text-caption text-medium-emphasis">{{ emp.phone }}</div>
                        </div>
                      </div>
                    </td>
                    <td class="font-weight-bold">₹{{ fmt(emp.totalNet) }}</td>
                    <td class="text-success font-weight-bold">₹{{ fmt(emp.totalPaid) }}</td>
                    <td>
                      <span :class="emp.totalPending > 0 ? 'text-error font-weight-bold' : 'text-success'">₹{{ fmt(emp.totalPending) }}</span>
                    </td>
                    <td>
                      <span class="pay-stat__val--amber font-weight-bold">₹{{ fmt(emp.deductionBalance) }}</span>
                    </td>
                    <td>
                      <!-- Salary payment progress -->
                      <div class="dual-progress">
                        <div class="dual-progress__row">
                          <span class="dual-progress__lbl">Salary</span>
                          <div class="dual-progress__bar">
                            <div class="dual-progress__fill dual-progress__fill--paid"   :style="{ width: segPaidPct(emp) + '%' }" />
                            <div class="dual-progress__fill dual-progress__fill--pending" :style="{ width: segPendingPct(emp) + '%' }" />
                          </div>
                          <span class="dual-progress__pct" :class="emp.totalPending > 0 ? 'dual-progress__pct--red' : 'dual-progress__pct--green'">{{ segPaidPct(emp) }}%</span>
                        </div>
                        <!-- Deduction fund progress (only if there is any deduction) -->
                        <div v-if="emp.totalDeductionAmount > 0" class="dual-progress__row">
                          <span class="dual-progress__lbl dual-progress__lbl--amber">Deduct</span>
                          <div class="dual-progress__bar">
                            <div class="dual-progress__fill dual-progress__fill--returned" :style="{ width: deductReturnedPct(emp) + '%' }" />
                            <div class="dual-progress__fill dual-progress__fill--held"     :style="{ width: deductHeldPct(emp) + '%' }" />
                          </div>
                          <span class="dual-progress__pct dual-progress__pct--amber">₹{{ fmtK(emp.deductionBalance) }}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div class="d-flex align-center justify-center" style="gap: 6px">
                        <v-btn size="x-small" color="primary" variant="tonal" rounded="lg" :disabled="emp.totalPending <= 0" @click="openPayDialog(emp)">
                          <v-icon size="14" class="mr-1">mdi-cash-plus</v-icon>Pay
                        </v-btn>
                        <v-btn size="x-small" color="warning" variant="tonal" rounded="lg" :disabled="emp.deductionBalance <= 0" @click="openDeductDialog(emp)">
                          <v-icon size="14" class="mr-1">mdi-piggy-bank</v-icon>Deduction
                        </v-btn>
                        <v-btn size="x-small" icon="mdi-history" variant="text" color="primary" @click="openPayHistory(emp)" />
                      </div>
                    </td>
                  </tr>
                </tbody>
                <tfoot v-if="filteredPaymentSummary.length">
                  <tr class="totals-row">
                    <td class="text-left font-weight-bold" style="padding-left: 20px">TOTAL ({{ filteredPaymentSummary.length }})</td>
                    <td class="font-weight-bold">₹{{ fmt(filteredTotals.earned) }}</td>
                    <td class="font-weight-bold text-success">₹{{ fmt(filteredTotals.paid) }}</td>
                    <td class="font-weight-bold text-error">₹{{ fmt(filteredTotals.pending) }}</td>
                    <td class="font-weight-bold pay-stat__val--amber">₹{{ fmt(filteredTotals.deductionBal) }}</td>
                    <td></td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      </template>
    </template>

    <!-- ═══════════════════════════════════════════════════════════════════════ -->
    <!-- PAYSLIP -->
    <!-- ═══════════════════════════════════════════════════════════════════════ -->
    <template v-if="activeModule === 'payslip'">
      <div class="glass-card mb-4">
        <div class="glass-card__body">
          <v-row dense align="center">
            <v-col cols="12" md="4">
              <v-select v-model="payslipEmpId" :items="employees" item-title="name" item-value="_id" label="Select Employee" density="compact" variant="outlined" rounded="lg" hide-details @update:model-value="loadPayslip" />
            </v-col>
            <v-col cols="6" md="2">
              <v-select v-model="payslipMonth" :items="monthItems" item-title="label" item-value="value" label="Month" density="compact" variant="outlined" rounded="lg" hide-details @update:model-value="loadPayslip" />
            </v-col>
            <v-col cols="6" md="2">
              <v-select v-model="payslipYear" :items="yearItems" label="Year" density="compact" variant="outlined" rounded="lg" hide-details @update:model-value="loadPayslip" />
            </v-col>
            <v-col cols="12" md="4" class="d-flex align-center" style="gap: 8px">
              <v-btn color="primary" prepend-icon="mdi-magnify" rounded="lg" :loading="loadingPayslip" @click="loadPayslip">Generate</v-btn>
              <v-btn v-if="payslipData" color="secondary" variant="tonal" prepend-icon="mdi-download" rounded="lg" @click="printPayslip">Download PDF</v-btn>
              <v-btn v-if="payslipData" color="success" variant="tonal" prepend-icon="mdi-whatsapp" rounded="lg" @click="sendPayslipWhatsApp">WhatsApp</v-btn>
            </v-col>
          </v-row>
        </div>
      </div>

      <div v-if="!payslipData && !loadingPayslip" class="empty-state">
        <div class="empty-state__icon">
          <v-icon icon="mdi-file-document-outline" size="48" color="primary" />
        </div>
        <h3>Generate Payslip</h3>
        <p>Select an employee and month above to auto-generate payslip</p>
      </div>

      <div v-if="loadingPayslip" class="text-center pa-10">
        <v-progress-circular indeterminate color="primary" size="44" />
      </div>

      <div v-if="payslipData" id="payslip-printable" class="payslip-doc">
        <div class="payslip-doc__header">
          <div>
            <div class="payslip-doc__company">ASHOK TEX</div>
            <div class="payslip-doc__sub">AUTOLOOM</div>
          </div>
          <div class="text-right">
            <div class="payslip-doc__badge">PAYSLIP</div>
            <div class="payslip-doc__period">{{ monthName(payslipData.month) }} {{ payslipData.year }}</div>
          </div>
        </div>
        <div class="payslip-doc__emp">
          <div class="d-flex justify-space-between align-center">
            <span>Employee: <strong>{{ payslipData.name }}</strong></span>
            <span class="text-caption text-medium-emphasis">Generated: {{ new Date().toLocaleDateString('en-IN') }}</span>
          </div>
        </div>

        <!-- Quick Stats: always 4 even cards -->
        <div class="payslip-quick-stats">
          <div class="payslip-quick-stat">
            <span class="payslip-quick-stat__icon">📅</span>
            <span class="payslip-quick-stat__val">{{ payslipData.entries.length }}</span>
            <span class="payslip-quick-stat__label">Weeks</span>
          </div>
          <div class="payslip-quick-stat">
            <span class="payslip-quick-stat__icon">🗓️</span>
            <span class="payslip-quick-stat__val">{{ payslipData.entries.reduce((s, e) => s + (e.daysWorked || 0), 0) }}</span>
            <span class="payslip-quick-stat__label">Days Worked</span>
          </div>
          <div class="payslip-quick-stat payslip-quick-stat--green">
            <span class="payslip-quick-stat__icon">💰</span>
            <span class="payslip-quick-stat__val payslip-quick-stat__val--green">₹{{ fmt(payslipData.totalFinal) }}</span>
            <span class="payslip-quick-stat__label">Net Salary</span>
          </div>
          <div class="payslip-quick-stat" :class="payslipData.totalPaid > 0 ? 'payslip-quick-stat--green' : ''">
            <span class="payslip-quick-stat__icon">✅</span>
            <span class="payslip-quick-stat__val" :class="payslipData.totalPaid > 0 ? 'payslip-quick-stat__val--green' : 'payslip-quick-stat__val--muted'">₹{{ fmt(payslipData.totalPaid) }}</span>
            <span class="payslip-quick-stat__label">Paid This Month</span>
          </div>
        </div>

        <!-- Outstanding Balance Bar (shown only when there's pending) -->
        <div v-if="payslipData.totalOutstanding > 0" class="payslip-outstanding-bar">
          <div class="payslip-outstanding-bar__item">
            <span class="payslip-outstanding-bar__label">Balance This Month</span>
            <span class="payslip-outstanding-bar__val">₹{{ fmt(payslipData.totalPending) }}</span>
          </div>
          <template v-if="payslipData.carryForwardPending > 0">
            <div class="payslip-outstanding-bar__sep">+</div>
            <div class="payslip-outstanding-bar__item">
              <span class="payslip-outstanding-bar__label">Carry-forward (Prev Months)</span>
              <span class="payslip-outstanding-bar__val">₹{{ fmt(payslipData.carryForwardPending) }}</span>
            </div>
            <div class="payslip-outstanding-bar__sep">=</div>
          </template>
          <div class="payslip-outstanding-bar__total">
            <span class="payslip-outstanding-bar__label">Total Outstanding</span>
            <span class="payslip-outstanding-bar__total-val">₹{{ fmt(payslipData.totalOutstanding) }}</span>
          </div>
        </div>

        <div class="payslip-section-title">Period-wise Salary Details</div>
        <div class="payslip-table-wrap">
          <table class="payslip-table">
            <thead>
              <tr>
                <th>#</th>
                <th>From</th>
                <th>To</th>
                <th class="text-right">Days</th>
                <th class="text-right">Gross</th>
                <th class="text-right">Deduction</th>
                <th class="text-right">Market</th>
                <th class="text-right">Advance</th>
                <th class="text-right">Final</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(entry, i) in payslipData.entries" :key="i">
                <td class="text-medium-emphasis">{{ i + 1 }}</td>
                <td>{{ fmtDateShort(entry.periodStart) }}</td>
                <td>{{ fmtDateShort(entry.periodEnd) }}</td>
                <td class="text-right">{{ entry.daysWorked }}</td>
                <td class="text-right">₹{{ fmt(entry.grossWages) }}</td>
                <td class="text-right deduct-val">₹{{ fmt(entry.deductionAmount) }}</td>
                <td class="text-right">₹{{ fmt(entry.market || 0) }}</td>
                <td class="text-right">₹{{ fmt(entry.advance || 0) }}</td>
                <td class="text-right font-weight-bold">₹{{ fmt(entry.finalSalary) }}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr class="totals-row">
                <td colspan="3" class="text-left font-weight-bold" style="padding-left: 12px">TOTAL</td>
                <td class="text-right font-weight-bold">{{ payslipData.entries.reduce((s, e) => s + (e.daysWorked || 0), 0) }}</td>
                <td class="text-right font-weight-bold">₹{{ fmt(payslipData.totalGross) }}</td>
                <td class="text-right font-weight-bold deduct-val">₹{{ fmt(payslipData.totalDeduction) }}</td>
                <td class="text-right font-weight-bold">₹{{ fmt(payslipData.entries.reduce((s, e) => s + (e.market || 0), 0)) }}</td>
                <td class="text-right font-weight-bold">₹{{ fmt(payslipData.entries.reduce((s, e) => s + (e.advance || 0), 0)) }}</td>
                <td class="text-right font-weight-bold" style="color: #059669">₹{{ fmt(payslipData.totalFinal) }}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div class="payslip-section-title">Payment Summary</div>
        <div class="payslip-summary">
          <div class="payslip-summary__row"><span>Gross Salary</span><strong>₹{{ fmt(payslipData.totalGross) }}</strong></div>
          <div class="payslip-summary__row"><span>(-) Deduction (Fund Contribution)</span><strong class="deduct-val">₹{{ fmt(payslipData.totalDeduction) }}</strong></div>
          <div class="payslip-summary__row payslip-summary__row--highlight"><span>Net (Final) Salary</span><strong style="color: #059669; font-size: 18px">₹{{ fmt(payslipData.totalFinal) }}</strong></div>
          <div class="payslip-summary__row"><span>Amount Paid (This Month)</span><strong class="text-success">₹{{ fmt(payslipData.totalPaid) }}</strong></div>
          <div class="payslip-summary__row"><span>Balance This Month</span><strong :class="payslipData.totalPending > 0 ? 'text-error' : 'text-success'">₹{{ fmt(payslipData.totalPending) }}</strong></div>
          <template v-if="payslipData.carryForwardPending > 0">
            <div class="payslip-summary__row payslip-summary__row--carryforward"><span>(+) Carry-forward from Previous Months</span><strong style="color: #b45309">₹{{ fmt(payslipData.carryForwardPending) }}</strong></div>
            <div class="payslip-summary__row payslip-summary__row--outstanding"><span>Total Outstanding</span><strong class="text-error" style="font-size: 17px">₹{{ fmt(payslipData.totalOutstanding) }}</strong></div>
          </template>
        </div>

        <!-- Deduction Fund Summary -->
        <div class="payslip-section-title">
          Deduction Fund
          <span class="payslip-fund-note">Deducted amounts saved for employee — can be given back when needed</span>
        </div>
        <div class="payslip-fund-box">
          <div class="payslip-fund-row">
            <div class="payslip-fund-item">
              <div class="payslip-fund-item__label">Contributed This Month</div>
              <div class="payslip-fund-item__val payslip-fund-item__val--red">₹{{ fmt(payslipData.deductionFund?.deductedThisMonth ?? payslipData.totalDeduction) }}</div>
            </div>
            <div class="payslip-fund-item">
              <div class="payslip-fund-item__label">Withdrawn This Month</div>
              <div class="payslip-fund-item__val payslip-fund-item__val--blue">₹{{ fmt(payslipData.deductionFund?.returnedThisMonth ?? 0) }}</div>
            </div>
            <div class="payslip-fund-item">
              <div class="payslip-fund-item__label">Total Accumulated (All-time)</div>
              <div class="payslip-fund-item__val">₹{{ fmt(payslipData.deductionFund?.totalAccumulated ?? payslipData.totalDeduction) }}</div>
            </div>
            <div class="payslip-fund-item payslip-fund-item--highlight">
              <div class="payslip-fund-item__label">Available Fund Balance</div>
              <div class="payslip-fund-item__val payslip-fund-item__val--amber">₹{{ fmt(payslipData.deductionFund?.balance ?? 0) }}</div>
            </div>
          </div>
        </div>

        <div class="payslip-status-bar" :class="payslipData.paymentStatus === 'paid' ? 'payslip-status-bar--paid' : 'payslip-status-bar--pending'">
          <v-icon :icon="payslipData.paymentStatus === 'paid' ? 'mdi-check-circle' : 'mdi-clock-outline'" size="16" class="mr-1" />
          {{ payslipData.paymentStatus === 'paid' ? 'FULLY PAID' : payslipData.paymentStatus === 'partial' ? 'PARTIAL PAYMENT' : 'PAYMENT PENDING' }}
        </div>
      </div>
    </template>

    <!-- ═══════════════════════════════════════════════════════════════════════ -->
    <!-- EMPLOYEE SUMMARY -->
    <!-- ═══════════════════════════════════════════════════════════════════════ -->
    <template v-if="activeModule === 'emp-summary'">
      <!-- ── Filter Bar ── -->
      <div class="summ-filter-bar mb-5">
        <div class="summ-filter-bar__grid">
          <div class="summ-filter-item">
            <label class="summ-filter-label">Employee</label>
            <v-select v-model="summaryEmpId" :items="[{ name: 'All Employees', _id: '' }, ...employees]" item-title="name" item-value="_id" density="compact" variant="outlined" rounded="lg" hide-details @update:model-value="loadEmpSummary" />
          </div>
          <div class="summ-filter-item">
            <label class="summ-filter-label">Month</label>
            <v-select v-model="summaryMonth" :items="[{ label: 'All Months', value: '' }, ...monthItems]" item-title="label" item-value="value" density="compact" variant="outlined" rounded="lg" hide-details @update:model-value="onSummaryFilterChange" />
          </div>
          <div class="summ-filter-item">
            <label class="summ-filter-label">Year</label>
            <v-select v-model="summaryYear" :items="['', ...yearItems]" density="compact" variant="outlined" rounded="lg" hide-details @update:model-value="onSummaryFilterChange">
              <template #item="{ item, props: ip }"><v-list-item v-bind="ip" :title="item.value === '' ? 'All Years' : String(item.value)" /></template>
              <template #selection="{ item }">{{ item.value === '' ? 'All Years' : item.value }}</template>
            </v-select>
          </div>
          <div class="summ-filter-item">
            <label class="summ-filter-label">From Date</label>
            <v-menu v-model="summaryFromMenu" :close-on-content-click="false" location="bottom start">
              <template #activator="{ props }">
                <v-text-field :model-value="summaryFromDate ? fmtDateDisplay(summaryFromDate) : ''" density="compact" variant="outlined" rounded="lg" hide-details readonly v-bind="props" prepend-inner-icon="mdi-calendar" placeholder="Pick date" />
              </template>
              <v-date-picker :model-value="summaryFromDate ? new Date(summaryFromDate) : undefined" @update:model-value="onPickSummaryFrom" :first-day-of-week="1" color="primary" show-adjacent-months />
            </v-menu>
          </div>
          <div class="summ-filter-item">
            <label class="summ-filter-label">To Date</label>
            <v-menu v-model="summaryToMenu" :close-on-content-click="false" location="bottom start">
              <template #activator="{ props }">
                <v-text-field :model-value="summaryToDate ? fmtDateDisplay(summaryToDate) : ''" density="compact" variant="outlined" rounded="lg" hide-details readonly v-bind="props" prepend-inner-icon="mdi-calendar" placeholder="Pick date" />
              </template>
              <v-date-picker :model-value="summaryToDate ? new Date(summaryToDate) : undefined" @update:model-value="onPickSummaryTo" :first-day-of-week="1" color="primary" show-adjacent-months />
            </v-menu>
          </div>
          <div class="summ-filter-item summ-filter-item--actions">
            <label class="summ-filter-label">&nbsp;</label>
            <div class="d-flex" style="gap:8px">
              <v-btn color="primary" rounded="lg" :loading="loadingSummary" prepend-icon="mdi-magnify" @click="loadEmpSummary">Search</v-btn>
              <v-btn rounded="lg" variant="tonal" color="secondary" prepend-icon="mdi-filter-off" @click="clearSummaryFilters">Clear</v-btn>
            </div>
          </div>
        </div>
      </div>

      <div v-if="loadingSummary" class="text-center pa-10">
        <v-progress-circular indeterminate color="primary" size="44" />
      </div>

      <template v-else-if="empSummaryData">
        <!-- ── KPI Cards ── -->
        <div class="summ-kpi-row mb-5">
          <div class="summ-kpi summ-kpi--purple">
            <v-icon icon="mdi-calendar-check" size="28" />
            <div class="summ-kpi__body">
              <span class="summ-kpi__val">{{ empSummaryData.summary.totalDaysWorked }}</span>
              <span class="summ-kpi__label">Days Worked</span>
            </div>
          </div>
          <div class="summ-kpi summ-kpi--blue">
            <v-icon icon="mdi-currency-inr" size="28" />
            <div class="summ-kpi__body">
              <span class="summ-kpi__val">₹{{ fmt(empSummaryData.summary.totalWages) }}</span>
              <span class="summ-kpi__label">Gross Wages</span>
            </div>
          </div>
          <div class="summ-kpi summ-kpi--amber">
            <v-icon icon="mdi-piggy-bank" size="28" />
            <div class="summ-kpi__body">
              <span class="summ-kpi__val">₹{{ fmt(empSummaryData.summary.totalDeduction) }}</span>
              <span class="summ-kpi__label">Deduction Hold</span>
            </div>
          </div>
          <div class="summ-kpi summ-kpi--green">
            <v-icon icon="mdi-cash-check" size="28" />
            <div class="summ-kpi__body">
              <span class="summ-kpi__val">₹{{ fmt(empSummaryData.summary.totalFinalSalary) }}</span>
              <span class="summ-kpi__label">Net Final Salary</span>
            </div>
          </div>
          <div class="summ-kpi summ-kpi--teal">
            <v-icon icon="mdi-cash-multiple" size="28" />
            <div class="summ-kpi__body">
              <span class="summ-kpi__val">₹{{ fmt(empSummaryData.summary.totalPaid) }}</span>
              <span class="summ-kpi__label">Total Paid</span>
            </div>
          </div>
          <div class="summ-kpi" :class="empSummaryData.summary.totalBalance > 0 ? 'summ-kpi--red' : 'summ-kpi--green'">
            <v-icon icon="mdi-alert-circle-outline" size="28" />
            <div class="summ-kpi__body">
              <span class="summ-kpi__val">₹{{ fmt(empSummaryData.summary.totalBalance) }}</span>
              <span class="summ-kpi__label">Balance Due</span>
            </div>
          </div>
        </div>

        <!-- ── Month-grouped Cards ── -->
        <div v-if="groupedByMonth.length" class="summ-groups">
          <div v-for="group in groupedByMonth" :key="group.key" class="summ-month-group">
            <!-- Month Header -->
            <div class="summ-month-hdr">
              <div class="summ-month-hdr__left">
                <span class="summ-month-hdr__badge">{{ MONTH_NAMES[group.month] }} {{ group.year }}</span>
                <span class="summ-month-hdr__meta">{{ group.employeeGroupList.length }} employee{{ group.employeeGroupList.length > 1 ? 's' : '' }} · {{ group.weeks.length }} week{{ group.weeks.length > 1 ? 's' : '' }} · {{ group.days }} days</span>
              </div>
              <div class="summ-month-hdr__stats">
                <span class="summ-month-stat">Gross <strong>₹{{ fmt(group.gross) }}</strong></span>
                <span class="summ-month-stat summ-month-stat--deduct">Deduct <strong>₹{{ fmt(group.deduction) }}</strong></span>
                <span class="summ-month-stat summ-month-stat--net">Net <strong>₹{{ fmt(group.final) }}</strong></span>
                <span class="summ-month-stat summ-month-stat--paid">Paid <strong>₹{{ fmt(group.paid) }}</strong></span>
                <span v-if="group.balance > 0" class="summ-month-stat summ-month-stat--bal">Due <strong>₹{{ fmt(group.balance) }}</strong></span>
                <span v-else class="summ-month-stat summ-month-stat--clr">✓ Cleared</span>
              </div>
            </div>

            <!-- Employee Cards within this month -->
            <div class="summ-emp-cards">
              <div v-for="empGroup in group.employeeGroupList" :key="empGroup.employeeId" class="summ-emp-card">
                <!-- Employee Card Header -->
                <div class="summ-emp-card__hdr">
                  <div class="summ-emp-card__info">
                    <div class="summ-emp-card__avatar">{{ (empGroup.employeeName || '?').charAt(0).toUpperCase() }}</div>
                    <div>
                      <div class="summ-emp-card__name">{{ empGroup.employeeName }}</div>
                      <div class="summ-emp-card__meta">{{ empGroup.weeks.length }} week{{ empGroup.weeks.length > 1 ? 's' : '' }} · {{ empGroup.days }} days</div>
                    </div>
                  </div>
                  <div class="summ-emp-card__totals">
                    <div class="summ-emp-card__stat-item">
                      <span class="summ-emp-card__stat-val">₹{{ fmt(empGroup.gross) }}</span>
                      <span class="summ-emp-card__stat-lbl">Gross</span>
                    </div>
                    <div class="summ-emp-card__stat-item">
                      <span class="summ-emp-card__stat-val" style="color:#059669">₹{{ fmt(empGroup.final) }}</span>
                      <span class="summ-emp-card__stat-lbl">Net</span>
                    </div>
                    <div class="summ-emp-card__stat-item">
                      <span class="summ-emp-card__stat-val text-success">₹{{ fmt(empGroup.paid) }}</span>
                      <span class="summ-emp-card__stat-lbl">Paid</span>
                    </div>
                    <div class="summ-emp-card__stat-item">
                      <span class="summ-emp-card__stat-val" :class="empGroup.balance > 0 ? 'text-error' : 'text-success'">{{ empGroup.balance > 0 ? '₹' + fmt(empGroup.balance) : '✓' }}</span>
                      <span class="summ-emp-card__stat-lbl">{{ empGroup.balance > 0 ? 'Due' : 'Cleared' }}</span>
                    </div>
                  </div>
                </div>

                <!-- Week Rows for this employee (latest first) -->
                <div class="summ-emp-card__weeks">
                  <div v-for="(week, wi) in empGroup.weeks" :key="`${week.employeeId}-${week.periodStart}`" class="summ-week-item" :class="{ 'summ-week-item--alt': wi % 2 === 1 }">
                    <div class="summ-week-item__row">
                      <div class="summ-week-item__period">{{ fmtDateShort(week.periodStart) }} – {{ fmtDateShort(week.periodEnd) }}</div>
                      <div class="summ-week-item__stats">
                        <span class="summ-week-item__chip"><strong>{{ week.daysWorked }}</strong>d</span>
                        <span class="summ-week-item__chip">₹{{ fmt(week.grossWages) }}</span>
                        <span v-if="week.deductionAmount > 0" class="summ-week-item__chip summ-week-item__chip--amber">-₹{{ fmt(week.deductionAmount) }}</span>
                        <span v-if="week.market > 0" class="summ-week-item__chip summ-week-item__chip--muted">mkt ₹{{ fmt(week.market) }}</span>
                        <span v-if="week.advance > 0" class="summ-week-item__chip summ-week-item__chip--muted">adv ₹{{ fmt(week.advance) }}</span>
                        <span class="summ-week-item__chip summ-week-item__chip--net">₹{{ fmt(week.finalSalary) }}</span>
                        <span class="summ-week-item__badge" :class="`summ-week-item__badge--${week.status}`">{{ week.status }}</span>
                      </div>
                      <button class="summ-week-item__expand" @click="expandedWeeks[`${week.employeeId}-${week.periodStart}`] = !expandedWeeks[`${week.employeeId}-${week.periodStart}`]">
                        <v-icon size="16">{{ expandedWeeks[`${week.employeeId}-${week.periodStart}`] ? 'mdi-chevron-up' : 'mdi-chevron-down' }}</v-icon>
                      </button>
                    </div>
                    <!-- Day detail -->
                    <div v-if="expandedWeeks[`${week.employeeId}-${week.periodStart}`]" class="summ-week-item__days">
                      <div
                        v-for="day in getSummaryWeekDays(week)" :key="day.date"
                        class="summ-day-cell"
                        :class="day.worked ? 'summ-day-cell--on' : 'summ-day-cell--off'"
                      >
                        <span class="summ-day-cell__name">{{ day.dayName }}</span>
                        <span class="summ-day-cell__date">{{ day.dateShort }}</span>
                        <span class="summ-day-cell__val">{{ day.worked ? '₹' + day.wage : 'OFF' }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Grand Total -->
          <div class="summ-grand-total">
            <span class="font-weight-bold text-medium-emphasis">GRAND TOTAL — {{ empSummaryData.weeks.length }} entries</span>
            <div class="summ-grand-stats">
              <span><em>Days</em> <strong>{{ empSummaryData.summary.totalDaysWorked }}</strong></span>
              <span><em>Gross</em> <strong>₹{{ fmt(empSummaryData.summary.totalWages) }}</strong></span>
              <span><em>Deduction</em> <strong class="deduct-val">₹{{ fmt(empSummaryData.summary.totalDeduction) }}</strong></span>
              <span><em>Net Final</em> <strong style="color:#059669">₹{{ fmt(empSummaryData.summary.totalFinalSalary) }}</strong></span>
              <span><em>Paid</em> <strong class="text-success">₹{{ fmt(empSummaryData.summary.totalPaid) }}</strong></span>
              <span><em>Balance</em> <strong :class="empSummaryData.summary.totalBalance > 0 ? 'text-error' : 'text-success'">₹{{ fmt(empSummaryData.summary.totalBalance) }}</strong></span>
            </div>
          </div>
        </div>

        <div v-else class="empty-state">
          <div class="empty-state__icon"><v-icon icon="mdi-calendar-blank" size="48" color="primary" /></div>
          <h3>No Data</h3>
          <p>No payroll entries found for selected filters</p>
        </div>
      </template>

      <div v-else-if="!loadingSummary && !empSummaryData" class="empty-state">
        <div class="empty-state__icon"><v-icon icon="mdi-chart-box-outline" size="48" color="primary" /></div>
        <h3>Employee Summary</h3>
        <p>Select filters above and click Search to view payroll summary</p>
      </div>
    </template>

    <!-- ══ Pay Salary Dialog ══ -->
    <v-dialog v-model="payDialog" max-width="420">
      <v-card rounded="xl">
        <div class="dialog-header dialog-header--green">
          <v-icon icon="mdi-cash-plus" size="22" class="mr-2" />
          Record Salary Payment
        </div>
        <v-card-text class="pa-5">
          <div class="payment-info-box mb-4">
            <div class="payment-info-row"><span>Employee</span><strong>{{ payTarget?.name }}</strong></div>
            <div class="payment-info-row"><span>Total Pending</span><strong class="text-error">₹{{ fmt(payTarget?.totalPending) }}</strong></div>
          </div>
          <v-text-field v-model.number="payForm.amount" label="Amount (₹) *" type="number" min="0" density="compact" variant="outlined" rounded="lg" class="mb-3" />
          <v-select v-model="payForm.method" :items="PAYMENT_METHODS" label="Payment Method" density="compact" variant="outlined" rounded="lg" class="mb-3" />
          <v-textarea v-model="payForm.notes" label="Notes" rows="2" density="compact" variant="outlined" rounded="lg" />
        </v-card-text>
        <v-card-actions class="pa-5 pt-0">
          <v-spacer />
          <v-btn variant="text" rounded="lg" @click="payDialog = false">Cancel</v-btn>
          <v-btn color="success" rounded="lg" elevation="0" :loading="saving" @click="recordPayment">Record</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- ══ Deduction Return Dialog ══ -->
    <v-dialog v-model="deductDialog" max-width="440">
      <v-card rounded="xl">
        <div class="dialog-header dialog-header--amber">
          <v-icon icon="mdi-piggy-bank" size="22" class="mr-2" />
          Deduction Fund Withdrawal
        </div>
        <v-card-text class="pa-5">
          <div class="payment-info-box mb-3">
            <div class="payment-info-row"><span>Employee</span><strong>{{ deductTarget?.name }}</strong></div>
            <div class="payment-info-row"><span>Total Accumulated</span><strong>₹{{ fmt(deductTarget?.totalDeductionAmount) }}</strong></div>
            <div class="payment-info-row"><span>Already Withdrawn</span><strong>₹{{ fmt(deductTarget?.totalDeductionReturned) }}</strong></div>
            <div class="payment-info-row"><span>Available Fund Balance</span><strong class="pay-stat__val--amber">₹{{ fmt(deductTarget?.deductionBalance) }}</strong></div>
          </div>
          <div class="text-caption text-medium-emphasis mb-4" style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:8px 12px">
            This amount was accumulated from weekly deductions. Enter how much to give back to the employee today.
          </div>
          <v-text-field
            v-model.number="deductForm.amount"
            label="Amount to Give (₹) *"
            type="number"
            min="0"
            :max="deductTarget?.deductionBalance"
            density="compact"
            variant="outlined"
            rounded="lg"
            class="mb-3"
          />
          <v-select v-model="deductForm.method" :items="PAYMENT_METHODS" label="Payment Method" density="compact" variant="outlined" rounded="lg" class="mb-3" />
          <v-textarea v-model="deductForm.notes" label="Reason / Notes" rows="2" density="compact" variant="outlined" rounded="lg" />
        </v-card-text>
        <v-card-actions class="pa-5 pt-0">
          <v-spacer />
          <v-btn variant="text" rounded="lg" @click="deductDialog = false">Cancel</v-btn>
          <v-btn color="warning" rounded="lg" elevation="0" :loading="saving" @click="recordDeductReturn">Give Fund</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- ══ Payment History Dialog ══ -->
    <v-dialog v-model="historyDialog" max-width="560" scrollable>
      <v-card rounded="xl">
        <div class="dialog-header dialog-header--blue">
          <v-icon icon="mdi-history" size="22" class="mr-2" />
          Payment History — {{ historyTarget?.name }}
        </div>
        <v-card-text class="pa-4">
          <div v-if="loadingHistory" class="text-center pa-6">
            <v-progress-circular indeterminate color="primary" size="36" />
          </div>
          <div v-else-if="!monthlyBreakdown.length && !paymentHistory.filter(h => h.paymentType === 'deduction_return').length" class="text-center pa-6 text-medium-emphasis">No payment history yet</div>
          <template v-else>
            <!-- Summary row -->
            <div class="hist-summary-row mb-4">
              <div class="hist-summary-item">
                <div class="hist-summary-label">Total Salary Paid</div>
                <div class="hist-summary-val hist-summary-val--green">₹{{ fmt(paymentHistory.filter(h => h.paymentType === 'salary').reduce((s, h) => s + h.amountPaid, 0)) }}</div>
              </div>
              <div class="hist-summary-item">
                <div class="hist-summary-label">Total Pending</div>
                <div class="hist-summary-val" :class="(historyTarget?.totalPending || 0) > 0 ? 'hist-summary-val--red' : 'hist-summary-val--green'">
                  ₹{{ fmt(historyTarget?.totalPending || 0) }}
                </div>
              </div>
              <div class="hist-summary-item">
                <div class="hist-summary-label">Deduction Given</div>
                <div class="hist-summary-val hist-summary-val--amber">₹{{ fmt(paymentHistory.filter(h => h.paymentType === 'deduction_return').reduce((s, h) => s + h.amountPaid, 0)) }}</div>
              </div>
            </div>

            <!-- Month-wise salary breakdown -->
            <div class="hist-section-label mb-2">Month-wise Salary Status</div>
            <div v-if="!monthlyBreakdown.length" class="text-caption text-medium-emphasis mb-3">No salary records</div>
            <table v-else class="history-table mb-4">
              <thead>
                <tr>
                  <th>Month</th>
                  <th class="text-right">Due</th>
                  <th class="text-right">Paid</th>
                  <th class="text-right">Pending</th>
                  <th class="text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="m in monthlyBreakdown" :key="m.key">
                  <td class="font-weight-medium">{{ MONTH_NAMES[m.month] }} {{ m.year }}</td>
                  <td class="text-right">₹{{ fmt(m.due) }}</td>
                  <td class="text-right text-success font-weight-bold">₹{{ fmt(m.paid) }}</td>
                  <td class="text-right" :class="m.pending > 0 ? 'text-error font-weight-bold' : 'text-success'">₹{{ fmt(m.pending) }}</td>
                  <td class="text-center">
                    <span class="status-chip" :class="`status-chip--${m.status}`">{{ m.status }}</span>
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr style="background:#f8fafc;font-weight:700">
                  <td class="text-medium-emphasis" style="padding:8px 12px">TOTAL</td>
                  <td class="text-right" style="padding:8px 12px">₹{{ fmt(monthlyBreakdown.reduce((s,m) => s + m.due, 0)) }}</td>
                  <td class="text-right text-success" style="padding:8px 12px">₹{{ fmt(paymentHistory.filter(h => h.paymentType === 'salary').reduce((s,h) => s + h.amountPaid, 0)) }}</td>
                  <td class="text-right text-error" style="padding:8px 12px">₹{{ fmt(historyTarget?.totalPending || 0) }}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>

            <!-- Deduction returns individually -->
            <template v-if="paymentHistory.filter(h => h.paymentType === 'deduction_return').length">
              <div class="hist-section-label mb-2">Deduction Fund Given Back</div>
              <table class="history-table">
                <thead>
                  <tr><th>Date</th><th class="text-right">Amount</th><th>Method</th><th>Notes</th></tr>
                </thead>
                <tbody>
                  <tr v-for="h in paymentHistory.filter(h => h.paymentType === 'deduction_return')" :key="h._id">
                    <td>{{ fmtDateShort(h.paymentDate) }}</td>
                    <td class="text-right font-weight-bold pay-stat__val--amber">₹{{ fmt(h.amountPaid) }}</td>
                    <td class="text-capitalize text-caption">{{ h.paymentMethod }}</td>
                    <td class="text-caption text-medium-emphasis">{{ h.notes || '—' }}</td>
                  </tr>
                </tbody>
              </table>
            </template>
          </template>
        </v-card-text>
        <v-card-actions class="pa-4 pt-0">
          <v-spacer />
          <v-btn variant="tonal" color="primary" rounded="lg" @click="historyDialog = false">Close</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- ══ Confirm Dialog ══ -->
    <v-dialog v-model="confirmDialog" max-width="400">
      <v-card rounded="xl">
        <div class="confirm-header">
          <v-icon icon="mdi-alert-circle" size="22" class="mr-2" />
          Confirm
        </div>
        <v-card-text class="pa-5">{{ confirmMessage }}</v-card-text>
        <v-card-actions class="pa-5 pt-0">
          <v-spacer />
          <v-btn variant="text" rounded="lg" @click="confirmDialog = false">Cancel</v-btn>
          <v-btn color="error" rounded="lg" elevation="0" @click="confirmAction">Confirm</v-btn>
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
import { ref, reactive, computed, onMounted } from 'vue'
import { downloadPayslip } from '@/utils/payslipPdf'
import api from '@/plugins/axios'

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

// ── State ──────────────────────────────────────────────────────────────────────
const activeModule = ref('employees')
const employees = ref([])
const saving = ref(false)
const salaryRuns = ref([])

const snack = ref({ show: false, text: '', color: 'success' })
const confirmDialog = ref(false)
const confirmMessage = ref('')
const confirmAction = ref(() => {})

const deductionTypes = [
  { label: 'Percentage', value: 'percentage' },
  { label: 'Fixed Amount', value: 'fixed' },
]

const MONTHS = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

// ── Employee Form ──────────────────────────────────────────────────────────────
const showEmpForm = ref(false)
const editingEmp = ref(null)
const empForm = ref({
  name: '',
  phone: '',
  currentDefaultDailyWage: 0,
  deductionType: 'percentage',
  deductionValue: 0,
})

// ── Salary Run State ───────────────────────────────────────────────────────────
const salaryRunMode = ref(null)
const runStartDate = ref('')
const runEndDate = ref('')
const startDateMenu = ref(false)
const endDateMenu = ref(false)
const runMonth = ref(null)
const runYear = ref(null)
const weekDays = ref([])
const periodRows = ref([])
const selectedEmployeeId = ref(null)
const employeeWeeks = ref([])

// ── Helpers ────────────────────────────────────────────────────────────────────
const fmt = (num) => new Intl.NumberFormat('en-IN').format(Math.round(Number(num) || 0))
const notify = (text, color = 'success') => { snack.value = { show: true, text, color } }
const monthName = (m) => MONTHS[m] || ''

function onlyDigits(event) {
  if (!/\d/.test(event.key)) event.preventDefault()
}

function fmtDateShort(d) {
  if (!d) return '—'
  const dt = new Date(d)
  return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function toDateStr(d) {
  const dt = new Date(d)
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
}

function fmtDateDisplay(dateStr) {
  if (!dateStr) return ''
  const dt = new Date(dateStr)
  return dt.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function onPickStartDate(val) {
  if (!val) return
  runStartDate.value = toDateStr(val)
  startDateMenu.value = false
  onStartDateChange(runStartDate.value)
}

function onPickEndDate(val) {
  if (!val) return
  runEndDate.value = toDateStr(val)
  endDateMenu.value = false
  onEndDateChange()
}

function getMonday(dateStr) {
  const d = new Date(dateStr)
  d.setHours(0, 0, 0, 0)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d
}

function generateWeekDays(dateStr, month, year) {
  const monday = getMonday(dateStr)
  const days = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    const dateKey = toDateStr(d)
    const editable = d.getMonth() + 1 === month && d.getFullYear() === year
    days.push({
      date: dateKey,
      dayName: DAY_NAMES[i],
      dateShort: `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`,
      editable,
    })
  }
  return days
}

function askConfirm(message, action) {
  confirmMessage.value = message
  confirmAction.value = async () => { confirmDialog.value = false; await action() }
  confirmDialog.value = true
}

// ── Employee CRUD ──────────────────────────────────────────────────────────────
async function loadEmployees() {
  try {
    const res = await api.get('/salary/employees')
    employees.value = res.data.data || []
  } catch {
    notify('Failed to load employees', 'error')
  }
}

function openEmpForm(emp = null) {
  editingEmp.value = emp
  empForm.value = emp
    ? { name: emp.name, phone: emp.phone || '', currentDefaultDailyWage: emp.currentDefaultDailyWage || 0, deductionType: emp.deductionType || 'percentage', deductionValue: emp.deductionValue || 0 }
    : { name: '', phone: '', currentDefaultDailyWage: 0, deductionType: 'percentage', deductionValue: 0 }
  showEmpForm.value = true
}

function cancelEmpForm() {
  showEmpForm.value = false
  editingEmp.value = null
}

async function saveEmployee() {
  if (!empForm.value.name.trim()) return notify('Name is required', 'error')
  if (!empForm.value.currentDefaultDailyWage) return notify('Daily wage is required', 'error')
  saving.value = true
  try {
    if (editingEmp.value) {
      await api.put(`/salary/employees/${editingEmp.value._id}`, empForm.value)
      notify('Employee updated')
    } else {
      await api.post('/salary/employees', empForm.value)
      notify('Employee added')
    }
    showEmpForm.value = false
    editingEmp.value = null
    await loadEmployees()
  } catch (e) {
    notify(e.response?.data?.error || 'Failed to save', 'error')
  } finally {
    saving.value = false
  }
}

function confirmDeleteEmp(emp) {
  askConfirm(`Delete "${emp.name}"? This cannot be undone.`, async () => {
    try {
      await api.delete(`/salary/employees/${emp._id}`)
      notify('Employee deleted')
      await loadEmployees()
    } catch (e) {
      notify(e.response?.data?.error || 'Failed to delete', 'error')
    }
  })
}

// ── Salary Run Logic ───────────────────────────────────────────────────────────
function startSalaryRun(mode) {
  salaryRunMode.value = mode
  runStartDate.value = ''
  runEndDate.value = ''
  weekDays.value = []
  periodRows.value = []
  employeeWeeks.value = []
  selectedEmployeeId.value = null
  coveredWeeksMessage.value = ''
}

function onStartDateChange(val) {
  if (!val) return
  const d = new Date(val)
  runMonth.value = d.getMonth() + 1
  runYear.value = d.getFullYear()

  if (salaryRunMode.value === 'by_period') {
    weekDays.value = generateWeekDays(val, runMonth.value, runYear.value)
    generatePeriodRows()
  } else if (salaryRunMode.value === 'by_employee') {
    if (runEndDate.value && selectedEmployeeId.value) generateByEmployee()
  }
}

function onEndDateChange() {
  if (runStartDate.value && selectedEmployeeId.value) generateByEmployee()
}

function generatePeriodRows() {
  // Find which employees already have entries for this week
  const weekStart = weekDays.value[0]?.date
  const weekEnd = weekDays.value[6]?.date
  const alreadyEnteredEmpIds = new Set()
  for (const run of salaryRuns.value) {
    const runStart = toDateStr(run.periodStartDate)
    const runEnd = toDateStr(run.periodEndDate)
    if (runStart === weekStart && runEnd === weekEnd && run.month === runMonth.value && run.year === runYear.value) {
      for (const e of (run.employees || [])) {
        alreadyEnteredEmpIds.add(e.employeeId?.toString() || e._id)
      }
    }
  }

  periodRows.value = employees.value.map(emp => {
    const alreadyEntered = alreadyEnteredEmpIds.has(emp._id)
    const dailyEntries = {}
    weekDays.value.forEach(day => {
      if (day.editable) {
        dailyEntries[day.date] = { worked: !alreadyEntered, wage: alreadyEntered ? 0 : (emp.currentDefaultDailyWage || 0) }
      }
    })
    return {
      employeeId: emp._id,
      name: emp.name,
      defaultWage: emp.currentDefaultDailyWage || 0,
      deductionType: emp.deductionType || 'percentage',
      deductionValue: emp.deductionValue || 0,
      market: 0,
      advance: 0,
      dailyEntries,
      alreadyEntered,
    }
  })
}

function generateByEmployee() {
  if (!runStartDate.value || !runEndDate.value || !selectedEmployeeId.value) return
  const emp = employees.value.find(e => e._id === selectedEmployeeId.value)
  if (!emp) return

  const d = new Date(runStartDate.value)
  runMonth.value = d.getMonth() + 1
  runYear.value = d.getFullYear()

  // Find dates already covered by existing salary runs for this employee (same month/year only)
  const coveredDates = new Set()
  const coveredPeriods = []
  for (const run of salaryRuns.value) {
    if (run.month !== runMonth.value || run.year !== runYear.value) continue
    const hasEmp = (run.employees || []).some(e => (e.employeeId?.toString() || e._id) === selectedEmployeeId.value)
    if (hasEmp) {
      const runStart = new Date(run.periodStartDate)
      coveredPeriods.push(`${fmtDateShort(run.periodStartDate)} → ${fmtDateShort(run.periodEndDate)}`)
      for (let i = 0; i < 7; i++) {
        const dt = new Date(runStart)
        dt.setDate(runStart.getDate() + i)
        coveredDates.add(toDateStr(dt))
      }
    }
  }

  coveredWeeksMessage.value = coveredPeriods.length
    ? `Already entered for ${emp.name}: ${coveredPeriods.join(', ')}. Those dates are disabled below.`
    : ''

  const startMon = getMonday(runStartDate.value)
  const endDate = new Date(runEndDate.value)
  const weeks = []

  let current = new Date(startMon)
  while (current <= endDate) {
    const weekStart = toDateStr(current)
    const days = generateWeekDays(weekStart, runMonth.value, runYear.value)

    // Check if this entire week is already covered
    const allCovered = days.every(day => coveredDates.has(day.date) || !day.editable)
    if (allCovered) {
      current.setDate(current.getDate() + 7)
      continue
    }

    // Mark already-entered dates as non-editable
    days.forEach(day => {
      if (coveredDates.has(day.date)) {
        day.editable = false
        day.alreadyEntered = true
      }
    })

    const dailyEntries = {}
    days.forEach(day => {
      if (day.editable) {
        dailyEntries[day.date] = { worked: true, wage: emp.currentDefaultDailyWage || 0 }
      }
    })
    weeks.push({
      days,
      dailyEntries,
      market: 0,
      advance: 0,
    })
    current.setDate(current.getDate() + 7)
  }

  weekDays.value = weeks.length ? weeks[0].days : []
  employeeWeeks.value = weeks
}

// ── Day Entry Helpers ──────────────────────────────────────────────────────────
function getDayEntry(row, date) {
  return row.dailyEntries[date] || { worked: false, wage: 0 }
}

function getEmpDayEntry(weekIdx, date) {
  return employeeWeeks.value[weekIdx]?.dailyEntries[date] || { worked: false, wage: 0 }
}

function toggleDay(row, date) {
  if (!row.dailyEntries[date]) {
    row.dailyEntries[date] = { worked: true, wage: row.defaultWage }
  } else {
    row.dailyEntries[date].worked = !row.dailyEntries[date].worked
    if (row.dailyEntries[date].worked && !row.dailyEntries[date].wage) {
      row.dailyEntries[date].wage = row.defaultWage
    }
  }
}

function toggleDayEmp(weekIdx, date) {
  const week = employeeWeeks.value[weekIdx]
  const emp = employees.value.find(e => e._id === selectedEmployeeId.value)
  if (!week.dailyEntries[date]) {
    week.dailyEntries[date] = { worked: true, wage: emp?.currentDefaultDailyWage || 0 }
  } else {
    week.dailyEntries[date].worked = !week.dailyEntries[date].worked
    if (week.dailyEntries[date].worked && !week.dailyEntries[date].wage) {
      week.dailyEntries[date].wage = emp?.currentDefaultDailyWage || 0
    }
  }
}

function onWageInput(row, date, event) {
  const val = Number(event.target.value) || 0
  if (!row.dailyEntries[date]) {
    row.dailyEntries[date] = { worked: true, wage: val }
  } else {
    row.dailyEntries[date].wage = val
    if (val > 0) row.dailyEntries[date].worked = true
  }
}

function onEmpWageInput(weekIdx, date, event) {
  const val = Number(event.target.value) || 0
  const week = employeeWeeks.value[weekIdx]
  if (!week.dailyEntries[date]) {
    week.dailyEntries[date] = { worked: true, wage: val }
  } else {
    week.dailyEntries[date].wage = val
    if (val > 0) week.dailyEntries[date].worked = true
  }
}

// ── Row Actions ────────────────────────────────────────────────────────────────
function fillWeek(row) {
  weekDays.value.forEach(day => {
    if (day.editable) {
      row.dailyEntries[day.date] = { worked: true, wage: row.defaultWage }
    }
  })
}

function markAllAbsent(row) {
  weekDays.value.forEach(day => {
    if (day.editable) {
      row.dailyEntries[day.date] = { worked: false, wage: 0 }
    }
  })
}

function clearWeek(row) {
  weekDays.value.forEach(day => {
    if (day.editable) {
      row.dailyEntries[day.date] = { worked: true, wage: row.defaultWage }
    }
  })
}

function fillWeekByEmployee(weekIdx) {
  const emp = employees.value.find(e => e._id === selectedEmployeeId.value)
  const week = employeeWeeks.value[weekIdx]
  week.days.forEach(day => {
    if (day.editable) {
      week.dailyEntries[day.date] = { worked: true, wage: emp?.currentDefaultDailyWage || 0 }
    }
  })
}

function markAbsentByEmployee(weekIdx) {
  const week = employeeWeeks.value[weekIdx]
  week.days.forEach(day => {
    if (day.editable) {
      week.dailyEntries[day.date] = { worked: false, wage: 0 }
    }
  })
}


// ── Calculations ───────────────────────────────────────────────────────────────
function calcRow(row) {
  const entries = Object.values(row.dailyEntries)
  const workedEntries = entries.filter(e => e.worked)
  const daysWorked = workedEntries.length
  const gross = workedEntries.reduce((sum, e) => sum + (e.wage || 0), 0)
  let deduction = 0
  if (row.deductionType === 'percentage') {
    deduction = Math.round((gross * row.deductionValue) / 100)
  } else {
    deduction = Math.round((row.deductionValue || 0) * daysWorked)
  }
  const final = Math.max(0, gross - deduction - (row.market || 0) - (row.advance || 0))
  return { daysWorked, gross, deduction, final }
}

function calcEmpWeek(weekIdx) {
  const week = employeeWeeks.value[weekIdx]
  const emp = employees.value.find(e => e._id === selectedEmployeeId.value)
  const entries = Object.values(week.dailyEntries)
  const workedEntries = entries.filter(e => e.worked)
  const daysWorked = workedEntries.length
  const gross = workedEntries.reduce((sum, e) => sum + (e.wage || 0), 0)
  let deduction = 0
  if (emp?.deductionType === 'percentage') {
    deduction = Math.round((gross * (emp?.deductionValue || 0)) / 100)
  } else {
    deduction = Math.round((emp?.deductionValue || 0) * daysWorked)
  }
  const final = Math.max(0, gross - deduction - (week.market || 0) - (week.advance || 0))
  return { daysWorked, gross, deduction, final }
}

const periodTotals = computed(() => {
  let daysWorked = 0, gross = 0, deduction = 0, market = 0, advance = 0, final = 0
  periodRows.value.forEach(row => {
    const r = calcRow(row)
    daysWorked += r.daysWorked
    gross += r.gross
    deduction += r.deduction
    market += (row.market || 0)
    advance += (row.advance || 0)
    final += r.final
  })
  return { daysWorked, gross, deduction, market, advance, final }
})

// ── Salary Entries Month Filter ───────────────────────────────────────────────
const entriesMonth = ref(new Date().getMonth() + 1)
const entriesYear = ref(new Date().getFullYear())

const filteredGroupedRuns = computed(() => {
  const groups = {}
  const mStart = new Date(entriesYear.value, entriesMonth.value - 1, 1)
  const mEnd = new Date(entriesYear.value, entriesMonth.value, 0)
  for (const run of salaryRuns.value) {
    if (run.month !== entriesMonth.value || run.year !== entriesYear.value) continue
    for (const emp of (run.employees || [])) {
      const id = emp.employeeId?.toString() || emp._id
      if (!groups[id]) {
        groups[id] = { employeeId: id, name: emp.employeeName || 'Unknown', runs: [], totalFinal: 0 }
      }
      const pStart = new Date(run.periodStartDate)
      const pEnd = new Date(run.periodEndDate)
      groups[id].runs.push({
        sreId: emp._id,
        run,
        periodStart: pStart < mStart ? mStart.toISOString() : run.periodStartDate,
        periodEnd: pEnd > mEnd ? mEnd.toISOString() : run.periodEndDate,
        daysWorked: emp.daysWorked || 0,
        gross: emp.grossWages || 0,
        deductionAmount: emp.deductionAmount || 0,
        market: emp.market || 0,
        advance: emp.advance || 0,
        final: emp.finalSalary || 0,
        type: run.type,
        status: run.status,
        dailyEntries: emp.dailyEntries || [],
        deductionType: emp.deductionType,
        deductionValue: emp.deductionValue,
        defaultDailyWageUsed: emp.defaultDailyWageUsed,
        employeeName: emp.employeeName,
        employeeId: id,
      })
      groups[id].totalFinal += (emp.finalSalary || 0)
    }
  }
  const result = Object.values(groups)
  result.forEach(g => g.runs.sort((a, b) => new Date(a.periodStart) - new Date(b.periodStart)))
  return result.sort((a, b) => a.name.localeCompare(b.name))
})

// ── Grouped Salary Runs (all, for other usages) ──────────────────────────────
const groupedSalaryRuns = computed(() => {
  const groups = {}
  for (const run of salaryRuns.value) {
    for (const emp of (run.employees || [])) {
      const id = emp.employeeId?.toString() || emp._id
      if (!groups[id]) {
        groups[id] = { employeeId: id, name: emp.employeeName || 'Unknown', runs: [], totalFinal: 0 }
      }
      groups[id].runs.push({
        sreId: emp._id,
        run,
        periodStart: run.periodStartDate,
        periodEnd: run.periodEndDate,
        daysWorked: emp.daysWorked || 0,
        gross: emp.grossWages || 0,
        deductionAmount: emp.deductionAmount || 0,
        market: emp.market || 0,
        advance: emp.advance || 0,
        final: emp.finalSalary || 0,
        type: run.type,
        status: run.status,
        dailyEntries: emp.dailyEntries || [],
        deductionType: emp.deductionType,
        deductionValue: emp.deductionValue,
        defaultDailyWageUsed: emp.defaultDailyWageUsed,
        employeeName: emp.employeeName,
        employeeId: id,
      })
      groups[id].totalFinal += (emp.finalSalary || 0)
    }
  }
  return Object.values(groups).sort((a, b) => a.name.localeCompare(b.name))
})

// ── Salary Entries Edit ───────────────────────────────────────────────────────
const editEntry = ref(null)

function openEditEntry(item) {
  const run = item.run
  const monday = getMonday(run.periodStartDate)
  const days = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    const dateKey = toDateStr(d)
    const editable = d.getMonth() + 1 === run.month && d.getFullYear() === run.year
    days.push({
      date: dateKey,
      dayName: DAY_NAMES[i],
      dateShort: `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`,
      editable,
    })
  }

  const dailyEntries = {}
  for (const de of (item.dailyEntries || [])) {
    const key = toDateStr(de.date)
    dailyEntries[key] = { worked: de.worked, wage: de.wage || 0 }
  }
  // Fill missing editable days
  days.forEach(day => {
    if (day.editable && !dailyEntries[day.date]) {
      dailyEntries[day.date] = { worked: false, wage: 0 }
    }
  })

  editEntry.value = {
    sreId: item.sreId,
    runId: run._id,
    employeeId: item.employeeId,
    employeeName: item.employeeName,
    periodStart: run.periodStartDate,
    periodEnd: run.periodEndDate,
    days,
    dailyEntries,
    market: item.market || 0,
    advance: item.advance || 0,
    deductionType: item.deductionType || 'percentage',
    deductionValue: item.deductionValue || 0,
    defaultWage: item.defaultDailyWageUsed || 0,
  }
}

function toggleEditDay(date) {
  const e = editEntry.value.dailyEntries[date]
  if (e) {
    e.worked = !e.worked
    if (e.worked && !e.wage) e.wage = editEntry.value.defaultWage
  }
}

function onEditWageInput(date, event) {
  const val = Number(event.target.value) || 0
  const e = editEntry.value.dailyEntries[date]
  if (e) {
    e.wage = val
    if (val > 0) e.worked = true
  }
}

function calcEditEntry() {
  if (!editEntry.value) return { daysWorked: 0, gross: 0, deduction: 0, final: 0 }
  const entries = Object.values(editEntry.value.dailyEntries)
  const workedEntries = entries.filter(e => e.worked)
  const daysWorked = workedEntries.length
  const gross = workedEntries.reduce((sum, e) => sum + (e.wage || 0), 0)
  let deduction = 0
  if (editEntry.value.deductionType === 'percentage') {
    deduction = Math.round((gross * editEntry.value.deductionValue) / 100)
  } else {
    deduction = Math.round((editEntry.value.deductionValue || 0) * daysWorked)
  }
  const final = Math.max(0, gross - deduction - (editEntry.value.market || 0) - (editEntry.value.advance || 0))
  return { daysWorked, gross, deduction, final }
}

async function saveEditEntry() {
  if (!editEntry.value) return
  saving.value = true
  try {
    const dailyEntries = Object.entries(editEntry.value.dailyEntries).map(([date, entry]) => ({
      date,
      worked: entry.worked,
      wage: entry.wage || 0,
    }))
    await api.put(`/salary/salary-runs/${editEntry.value.runId}`, {
      employees: [{
        employeeId: editEntry.value.employeeId,
        market: editEntry.value.market || 0,
        advance: editEntry.value.advance || 0,
        dailyEntries,
      }],
    })
    notify('Entry updated successfully')
    editEntry.value = null
    await loadSalaryRuns()
  } catch (e) {
    notify(e.response?.data?.error || 'Failed to update', 'error')
  } finally {
    saving.value = false
  }
}

function getEntryDays(item) {
  const monday = getMonday(item.periodStart)
  const dailyMap = {}
  for (const de of (item.dailyEntries || [])) {
    dailyMap[toDateStr(de.date)] = de
  }
  const days = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    const dateKey = toDateStr(d)
    const entry = dailyMap[dateKey]
    days.push({
      date: dateKey,
      dayName: DAY_NAMES[i],
      dateShort: `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`,
      worked: entry?.worked || false,
      wage: entry?.wage || 0,
    })
  }
  return days
}

function getSummaryWeekDays(week) {
  const dailyMap = {}
  for (const de of (week.dailyEntries || [])) {
    dailyMap[toDateStr(de.date)] = de
  }
  const monday = getMonday(week.periodStart)
  const days = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    const dateKey = toDateStr(d)
    const entry = dailyMap[dateKey]
    days.push({
      date: dateKey,
      dayName: DAY_NAMES[i],
      dateShort: `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`,
      worked: entry?.worked || false,
      wage: entry?.wage || 0,
    })
  }
  return days
}

// ── Covered weeks message for By Employee ─────────────────────────────────────
const coveredWeeksMessage = ref('')

// ── Emp deduction label for By Employee table ─────────────────────────────────
const empDeductionLabel = computed(() => {
  const emp = employees.value.find(e => e._id === selectedEmployeeId.value)
  if (!emp) return ''
  return emp.deductionType === 'percentage' ? `${emp.deductionValue}%` : `₹${emp.deductionValue}/day`
})

// ── Save Salary Run ────────────────────────────────────────────────────────────
async function saveSalaryRun() {
  if (!weekDays.value.length) return notify('Select a date first', 'error')
  if (!periodRows.value.length) return notify('No employees to save', 'error')

  saving.value = true
  try {
    const empEntries = periodRows.value
      .filter(row => !row.alreadyEntered)
      .map(row => ({
        employeeId: row.employeeId,
        market: row.market || 0,
        advance: row.advance || 0,
        dailyEntries: Object.entries(row.dailyEntries).map(([date, entry]) => ({
          date,
          worked: entry.worked,
          wage: entry.wage || 0,
        })),
      }))

    await api.post('/salary/salary-runs', {
      type: 'by_period',
      month: runMonth.value,
      year: runYear.value,
      startDate: runStartDate.value,
      employees: empEntries,
    })
    notify('Salary run saved successfully!')
    await loadSalaryRuns()
    salaryRunMode.value = null
  } catch (e) {
    notify(e.response?.data?.error || 'Failed to save salary run', 'error')
  } finally {
    saving.value = false
  }
}

async function saveSalaryRunByEmployee() {
  if (!employeeWeeks.value.length || !selectedEmployeeId.value) return notify('No data to save', 'error')

  saving.value = true
  try {
    for (const week of employeeWeeks.value) {
      const startDate = week.days[0].date
      await api.post('/salary/salary-runs', {
        type: 'by_employee',
        month: runMonth.value,
        year: runYear.value,
        startDate,
        employees: [{
          employeeId: selectedEmployeeId.value,
          market: week.market || 0,
          advance: week.advance || 0,
          dailyEntries: Object.entries(week.dailyEntries).map(([date, entry]) => ({
            date,
            worked: entry.worked,
            wage: entry.wage || 0,
          })),
        }],
      })
    }
    notify('All weeks saved successfully!')
    await loadSalaryRuns()
    salaryRunMode.value = null
  } catch (e) {
    notify(e.response?.data?.error || 'Failed to save', 'error')
  } finally {
    saving.value = false
  }
}

// ── Load Salary Runs ───────────────────────────────────────────────────────────
async function loadSalaryRuns() {
  try {
    const res = await api.get('/salary/salary-runs')
    salaryRuns.value = res.data.data || []
  } catch {
    // silent
  }
}

function runGross(run) {
  return (run.employees || []).reduce((sum, e) => sum + (e.grossWages || 0), 0)
}

function runFinal(run) {
  return (run.employees || []).reduce((sum, e) => sum + (e.finalSalary || 0), 0)
}

function confirmDeleteRun(run) {
  askConfirm('Delete this salary run? This cannot be undone.', async () => {
    try {
      await api.delete(`/salary/salary-runs/${run._id}`)
      notify('Salary run deleted')
      await loadSalaryRuns()
    } catch (e) {
      notify(e.response?.data?.error || 'Failed to delete', 'error')
    }
  })
}

// ── Payments Tab ──────────────────────────────────────────────────────────────
const PAYMENT_METHODS = ['cash', 'transfer', 'check', 'other']
const paymentSummary = ref([])
const loadingPayments = ref(false)
const payDialog = ref(false)
const payTarget = ref(null)
const payForm = ref({ amount: 0, method: 'cash', notes: '' })
const deductDialog = ref(false)
const deductTarget = ref(null)
const deductForm = ref({ amount: 0, method: 'cash', notes: '' })
const historyDialog = ref(false)
const historyTarget = ref(null)
const paymentHistory = ref([])
const monthlyBreakdown = ref([])
const loadingHistory = ref(false)
const paySearchQuery = ref('')
const payFilterStatus = ref('all')
const paySortBy = ref('name')

const payOverviewTotals = computed(() => {
  const list = paymentSummary.value
  return {
    earned: list.reduce((s, e) => s + (e.totalNet || 0), 0),
    paid: list.reduce((s, e) => s + (e.totalPaid || 0), 0),
    pending: list.reduce((s, e) => s + (e.totalPending || 0), 0),
    deductionBal: list.reduce((s, e) => s + (e.deductionBalance || 0), 0),
  }
})

const filteredPaymentSummary = computed(() => {
  let list = [...paymentSummary.value]
  if (paySearchQuery.value) {
    const q = paySearchQuery.value.toLowerCase()
    list = list.filter(e => e.name.toLowerCase().includes(q))
  }
  if (payFilterStatus.value === 'pending') list = list.filter(e => e.totalPending > 0)
  if (payFilterStatus.value === 'settled') list = list.filter(e => e.totalPending <= 0)
  if (paySortBy.value === 'pending_desc') list.sort((a, b) => b.totalPending - a.totalPending)
  else if (paySortBy.value === 'pending_asc') list.sort((a, b) => a.totalPending - b.totalPending)
  else list.sort((a, b) => a.name.localeCompare(b.name))
  return list
})

const filteredTotals = computed(() => {
  const list = filteredPaymentSummary.value
  return {
    earned: list.reduce((s, e) => s + (e.totalNet || 0), 0),
    paid: list.reduce((s, e) => s + (e.totalPaid || 0), 0),
    pending: list.reduce((s, e) => s + (e.totalPending || 0), 0),
    deductionBal: list.reduce((s, e) => s + (e.deductionBalance || 0), 0),
  }
})

function clearPayFilters() {
  paySearchQuery.value = ''
  payFilterStatus.value = 'all'
  paySortBy.value = 'name'
}

function payPercent(emp) {
  if (!emp.totalNet || emp.totalNet <= 0) return 0
  return Math.min(100, Math.round((emp.totalPaid / emp.totalNet) * 100))
}

// Segment progress: 2 segments — paid vs pending based on totalNet
function segBase(emp) {
  return Math.max(1, emp.totalNet || 0)
}
function segPaidPct(emp) {
  return Math.min(100, Math.round(((emp.totalPaid || 0) / segBase(emp)) * 100))
}
function segPendingPct(emp) {
  return Math.max(0, 100 - segPaidPct(emp))
}
// Deduction fund progress: returned vs held
function deductReturnedPct(emp) {
  const total = emp.totalDeductionAmount || 0
  if (total <= 0) return 0
  const returned = Math.max(0, total - (emp.deductionBalance || 0))
  return Math.min(100, Math.round((returned / total) * 100))
}
function deductHeldPct(emp) {
  return Math.max(0, 100 - deductReturnedPct(emp))
}
function fmtK(n) {
  if (n >= 100000) return (n / 100000).toFixed(1) + 'L'
  if (n >= 1000) return Math.round(n / 1000) + 'K'
  return String(Math.round(n))
}

async function loadPaymentSummary() {
  loadingPayments.value = true
  try {
    const res = await api.get('/salary/employees/summary')
    paymentSummary.value = res.data.data || []
  } catch {
    notify('Failed to load payment summary', 'error')
  } finally {
    loadingPayments.value = false
  }
}

function openPayDialog(emp) {
  payTarget.value = emp
  payForm.value = { amount: emp.totalPending, method: 'cash', notes: '' }
  payDialog.value = true
}

function openPayAllDialog() {
  payTarget.value = { _id: '__all__', name: 'ALL EMPLOYEES', totalPending: payOverviewTotals.value.pending }
  payForm.value = { amount: payOverviewTotals.value.pending, method: 'cash', notes: 'Bulk payment - all employees' }
  payDialog.value = true
}

async function recordPayment() {
  if (!payForm.value.amount || payForm.value.amount <= 0) return notify('Enter a valid amount', 'error')
  saving.value = true
  try {
    if (payTarget.value._id === '__all__') {
      for (const emp of paymentSummary.value.filter(e => e.totalPending > 0)) {
        await api.post('/salary/payment/settle-total', {
          employeeId: emp._id,
          amountPaid: emp.totalPending,
          paymentMethod: payForm.value.method,
          notes: payForm.value.notes,
        })
      }
    } else {
      await api.post('/salary/payment/settle-total', {
        employeeId: payTarget.value._id,
        amountPaid: payForm.value.amount,
        paymentMethod: payForm.value.method,
        notes: payForm.value.notes,
      })
    }
    payDialog.value = false
    notify('Payment recorded')
    await loadPaymentSummary()
  } catch (e) {
    notify(e.response?.data?.error || 'Failed to record payment', 'error')
  } finally {
    saving.value = false
  }
}

function openDeductDialog(emp) {
  deductTarget.value = emp
  deductForm.value = { amount: emp.deductionBalance, method: 'cash', notes: '' }
  deductDialog.value = true
}

async function recordDeductReturn() {
  if (!deductForm.value.amount || deductForm.value.amount <= 0) return notify('Enter a valid amount', 'error')
  saving.value = true
  try {
    await api.post('/salary/payment/deduction-return', {
      employeeId: deductTarget.value._id,
      amountPaid: deductForm.value.amount,
      paymentMethod: deductForm.value.method,
      notes: deductForm.value.notes,
    })
    deductDialog.value = false
    notify('Deduction return recorded')
    await loadPaymentSummary()
  } catch (e) {
    notify(e.response?.data?.error || 'Failed to record deduction return', 'error')
  } finally {
    saving.value = false
  }
}

async function openPayHistory(emp) {
  historyTarget.value = emp
  historyDialog.value = true
  paymentHistory.value = []
  monthlyBreakdown.value = []
  loadingHistory.value = true
  try {
    const [histRes, breakdownRes] = await Promise.all([
      api.get(`/salary/payment-history/${emp._id}`),
      api.get(`/salary/monthly-breakdown/${emp._id}`),
    ])
    paymentHistory.value = histRes.data.data || []
    monthlyBreakdown.value = breakdownRes.data.data || []
  } catch {
    notify('Failed to load history', 'error')
  } finally {
    loadingHistory.value = false
  }
}

const MONTH_NAMES = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const groupedSalaryHistory = computed(() => {
  const salaryEntries = paymentHistory.value.filter(h => h.paymentType === 'salary')
  const groups = {}
  for (const h of salaryEntries) {
    const d = new Date(h.paymentDate)
    const m = h.payrollMonth || (d.getMonth() + 1)
    const y = h.payrollYear || d.getFullYear()
    const key = `${y}-${String(m).padStart(2, '0')}`
    if (!groups[key]) groups[key] = { key, label: `${MONTH_NAMES[m]} ${y}`, total: 0, methods: new Set() }
    groups[key].total += h.amountPaid
    groups[key].methods.add(h.paymentMethod)
  }
  return Object.values(groups)
    .map(g => ({ ...g, methods: [...g.methods].join(', ') }))
    .sort((a, b) => b.key.localeCompare(a.key))
})

// ── Payslip Tab ───────────────────────────────────────────────────────────────
const now = new Date()
const payslipEmpId = ref(null)
const payslipMonth = ref(now.getMonth() + 1)
const payslipYear = ref(now.getFullYear())
const payslipData = ref(null)
const loadingPayslip = ref(false)

const monthItems = [
  { label: 'January', value: 1 }, { label: 'February', value: 2 },
  { label: 'March', value: 3 }, { label: 'April', value: 4 },
  { label: 'May', value: 5 }, { label: 'June', value: 6 },
  { label: 'July', value: 7 }, { label: 'August', value: 8 },
  { label: 'September', value: 9 }, { label: 'October', value: 10 },
  { label: 'November', value: 11 }, { label: 'December', value: 12 },
]
const yearItems = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i)

async function loadPayslip() {
  if (!payslipEmpId.value) return
  loadingPayslip.value = true
  payslipData.value = null
  try {
    const res = await api.get('/salary/payslip', {
      params: { employeeId: payslipEmpId.value, month: payslipMonth.value, year: payslipYear.value }
    })
    payslipData.value = res.data.data
  } catch {
    notify('Failed to generate payslip', 'error')
  } finally {
    loadingPayslip.value = false
  }
}

function printPayslip() {
  if (!payslipData.value) return
  downloadPayslip(payslipData.value)
}

function sendPayslipWhatsApp() {
  if (!payslipData.value) return
  const emp = employees.value.find(e => e._id === payslipEmpId.value)
  const phone = emp?.phone ? String(emp.phone).replace(/\D/g, '') : ''
  if (!phone) {
    notify('No phone number found for this employee', 'error')
    return
  }
  // Download PDF first
  downloadPayslip(payslipData.value)

  const phoneNum = phone.startsWith('91') ? phone : `91${phone}`
  const d = payslipData.value
  const totalDays = d.entries.reduce((s, e) => s + (e.daysWorked || 0), 0)
  const outstanding = d.totalOutstanding || ((d.totalPending || 0) + (d.carryForwardPending || 0))
  const cfLine = d.carryForwardPending > 0 ? `\nCarry-forward: ₹${fmt(d.carryForwardPending)}\nTotal Outstanding: ₹${fmt(outstanding)}` : ''
  const statusIcon = d.paymentStatus === 'paid' ? '✅ FULLY PAID' : d.paymentStatus === 'partial' ? '⏳ PARTIAL' : '❌ PENDING'

  const msg = `*ASHOK TEX - PAYSLIP*\n*${monthName(d.month)} ${d.year}*\n\nEmployee: *${d.name}*\n\nWeeks: ${d.entries.length}  |  Days Worked: ${totalDays}\n\nGross Salary: ₹${fmt(d.totalGross)}\n(-) Deduction Hold: ₹${fmt(d.totalDeduction)}\n*Net Salary: ₹${fmt(d.totalFinal)}*\n\nPaid This Month: ₹${fmt(d.totalPaid)}\nBalance This Month: ₹${fmt(d.totalPending)}${cfLine}\n\n*Deduction Fund*\nContributed: ₹${fmt(d.deductionFund?.deductedThisMonth ?? d.totalDeduction)}\nWithdrawn: ₹${fmt(d.deductionFund?.returnedThisMonth ?? 0)}\nAvailable Balance: ₹${fmt(d.deductionFund?.balance ?? 0)}\n\nStatus: ${statusIcon}\n\n_(PDF payslip downloaded — please attach to this chat)_`

  window.open(`https://wa.me/${phoneNum}?text=${encodeURIComponent(msg)}`, '_blank')
  notify('PDF downloaded. Please attach it in the WhatsApp chat.', 'success')
}

// ── Employee Summary Tab ──────────────────────────────────────────────────────
const summaryEmpId = ref('')
const summaryMonth = ref('')
const summaryYear = ref('')
const summaryFromDate = ref('')
const summaryToDate = ref('')
const summaryFromMenu = ref(false)
const summaryToMenu = ref(false)
const empSummaryData = ref(null)
const loadingSummary = ref(false)

function onSummaryFilterChange() {
  // When both month + year are set, auto-fill date range for convenience
  if (summaryMonth.value && summaryYear.value) {
    const m = summaryMonth.value
    const y = summaryYear.value
    const lastDay = new Date(y, m, 0).getDate()
    summaryFromDate.value = `${y}-${String(m).padStart(2, '0')}-01`
    summaryToDate.value   = `${y}-${String(m).padStart(2, '0')}-${lastDay}`
  } else {
    // When only month or only year is set, clear date range so backend uses the raw filter
    summaryFromDate.value = ''
    summaryToDate.value   = ''
  }
  loadEmpSummary()
}

function onPickSummaryFrom(val) {
  if (!val) return
  summaryFromDate.value = toDateStr(val)
  summaryFromMenu.value = false
  const d = new Date(val)
  summaryMonth.value = d.getMonth() + 1
  summaryYear.value = d.getFullYear()
  loadEmpSummary()
}

function onPickSummaryTo(val) {
  if (!val) return
  summaryToDate.value = toDateStr(val)
  summaryToMenu.value = false
  loadEmpSummary()
}

function clearSummaryFilters() {
  summaryEmpId.value = ''
  summaryMonth.value = ''
  summaryYear.value = ''
  summaryFromDate.value = ''
  summaryToDate.value = ''
  loadEmpSummary()
}

async function loadEmpSummary() {
  loadingSummary.value = true
  empSummaryData.value = null
  try {
    const params = {}
    if (summaryEmpId.value) params.employeeId = summaryEmpId.value
    if (summaryMonth.value) params.month = summaryMonth.value
    if (summaryYear.value)  params.year  = summaryYear.value
    if (summaryFromDate.value) params.fromDate = summaryFromDate.value
    if (summaryToDate.value) params.toDate = summaryToDate.value
    const res = await api.get('/salary/employee-summary', { params })
    empSummaryData.value = res.data.data
  } catch {
    notify('Failed to load summary', 'error')
  } finally {
    loadingSummary.value = false
  }
}

// ── Sorted Summary Weeks (latest first) ───────────────────────────────────────
const sortedSummaryWeeks = computed(() => {
  if (!empSummaryData.value?.weeks) return []
  return [...empSummaryData.value.weeks].sort((a, b) => new Date(b.periodStart) - new Date(a.periodStart))
})

// ── Group weeks by month for Employee Summary ──────────────────────────────────
const groupedByMonth = computed(() => {
  if (!empSummaryData.value?.weeks) return []
  const map = {}
  for (const w of empSummaryData.value.weeks) {
    const key = `${w.year}-${String(w.month).padStart(2, '0')}`
    if (!map[key]) map[key] = { key, month: w.month, year: w.year, weeks: [], gross: 0, deduction: 0, final: 0, paid: 0, balance: 0, days: 0, employeeGroups: {} }
    map[key].weeks.push(w)
    map[key].gross     += w.grossWages || 0
    map[key].deduction += w.deductionAmount || 0
    map[key].final     += w.finalSalary || 0
    map[key].paid      += w.paidAmount || 0
    map[key].balance   += w.balance || 0
    map[key].days      += w.daysWorked || 0

    const empId = w.employeeId || w.employeeName
    if (!map[key].employeeGroups[empId]) {
      map[key].employeeGroups[empId] = { employeeId: empId, employeeName: w.employeeName, weeks: [], gross: 0, deduction: 0, final: 0, paid: 0, balance: 0, days: 0 }
    }
    const eg = map[key].employeeGroups[empId]
    eg.weeks.push(w)
    eg.gross     += w.grossWages || 0
    eg.deduction += w.deductionAmount || 0
    eg.final     += w.finalSalary || 0
    eg.paid      += w.paidAmount || 0
    eg.balance   += w.balance || 0
    eg.days      += w.daysWorked || 0
  }
  const result = Object.values(map).sort((a, b) => b.key.localeCompare(a.key))
  for (const group of result) {
    group.employeeGroupList = Object.values(group.employeeGroups).sort((a, b) => a.employeeName.localeCompare(b.employeeName))
    for (const eg of group.employeeGroupList) {
      eg.weeks.sort((a, b) => new Date(b.periodStart) - new Date(a.periodStart))
    }
  }
  return result
})

// ── Expandable week rows in Employee Summary ───────────────────────────────────
const expandedWeeks = ref({})

// ── Init ───────────────────────────────────────────────────────────────────────
onMounted(async () => {
  await Promise.all([loadEmployees(), loadSalaryRuns()])
})
</script>

<style scoped>
/* ══ Root ══════════════════════════════════════════════════════════════════════ */
.payroll-root {
  padding: 24px;
  min-height: 100vh;
  background: linear-gradient(160deg, #f0f4ff 0%, #fafbfe 50%, #f5f0ff 100%);
}

/* ══ Hero ══════════════════════════════════════════════════════════════════════ */
.hero {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 20px;
  padding: 28px 32px;
  margin-bottom: 24px;
  box-shadow: 0 8px 32px rgba(102, 126, 234, 0.3);
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.hero__left { display: flex; align-items: center; gap: 16px; }
.hero__icon-wrap {
  width: 56px; height: 56px;
  border-radius: 16px;
  background: rgba(255,255,255,0.2);
  backdrop-filter: blur(10px);
  display: flex; align-items: center; justify-content: center;
}
.hero__title { font-size: 24px; font-weight: 800; color: #fff; margin: 0; letter-spacing: -0.5px; }
.hero__sub { font-size: 13px; color: rgba(255,255,255,0.8); margin: 4px 0 0; }

/* ══ Navigation Strip ══════════════════════════════════════════════════════════ */
.nav-strip {
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
  background: #fff;
  padding: 6px;
  border-radius: 14px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.06);
  width: fit-content;
}
.nav-btn {
  display: flex; align-items: center;
  padding: 10px 20px;
  border-radius: 10px;
  border: none;
  background: transparent;
  font-size: 14px;
  font-weight: 600;
  color: #64748b;
  cursor: pointer;
  transition: all 0.2s ease;
}
.nav-btn:hover { background: #f1f5f9; color: #334155; }
.nav-btn--active {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: #fff;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}
.nav-btn--active:hover { background: linear-gradient(135deg, #667eea, #764ba2); color: #fff; }

/* ══ Glass Card ════════════════════════════════════════════════════════════════ */
.glass-card {
  background: #fff;
  border-radius: 16px;
  border: 1px solid rgba(226, 232, 240, 0.8);
  box-shadow: 0 4px 20px rgba(0,0,0,0.05);
  overflow: hidden;
  transition: box-shadow 0.2s;
}
.glass-card:hover { box-shadow: 0 8px 30px rgba(0,0,0,0.08); }
.glass-card__header {
  padding: 16px 20px;
  font-size: 14px;
  font-weight: 700;
  color: #1e293b;
  border-bottom: 1px solid #f1f5f9;
  display: flex;
  align-items: center;
  background: linear-gradient(135deg, #fafbff, #f8fafc);
}
.glass-card__header--between { justify-content: space-between; }
.glass-card__body { padding: 20px; }

/* ══ Employee Table ════════════════════════════════════════════════════════════ */
.emp-table-wrap { overflow-x: auto; }
.emp-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}
.emp-table th {
  background: #f8fafc;
  padding: 12px 16px;
  font-size: 11px;
  font-weight: 700;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  text-align: left;
  border-bottom: 1px solid #e2e8f0;
}
.emp-table td {
  padding: 14px 16px;
  border-bottom: 1px solid #f1f5f9;
  vertical-align: middle;
}
.emp-table tbody tr { transition: background 0.15s; }
.emp-table tbody tr:hover { background: #f8fafc; }

.emp-cell { display: flex; align-items: center; gap: 12px; }
.emp-name { font-weight: 600; color: #1e293b; }

.deduction-chip {
  display: inline-block;
  background: linear-gradient(135deg, #fef3c7, #fde68a);
  color: #92400e;
  border-radius: 8px;
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 700;
}

/* ══ Empty State ═══════════════════════════════════════════════════════════════ */
.empty-state {
  text-align: center;
  padding: 60px 20px;
}
.empty-state__icon {
  width: 80px; height: 80px;
  border-radius: 50%;
  background: linear-gradient(135deg, #ede9fe, #e0e7ff);
  display: flex; align-items: center; justify-content: center;
  margin: 0 auto 16px;
}
.empty-state h3 { font-size: 18px; font-weight: 700; color: #1e293b; margin: 0 0 6px; }
.empty-state p { font-size: 14px; color: #64748b; margin: 0 0 20px; }

/* ══ Mode Selection ════════════════════════════════════════════════════════════ */
.mode-selection { text-align: center; padding: 40px 20px; }
.mode-selection__title { font-size: 24px; font-weight: 800; color: #1e293b; margin: 0 0 8px; }
.mode-selection__sub { font-size: 15px; color: #64748b; margin: 0 0 32px; }
.mode-cards { display: flex; gap: 24px; justify-content: center; flex-wrap: wrap; }
.mode-card {
  background: #fff;
  border: 2px solid #e2e8f0;
  border-radius: 20px;
  padding: 36px 32px;
  width: 260px;
  cursor: pointer;
  transition: all 0.25s ease;
  text-align: center;
}
.mode-card:hover {
  border-color: #667eea;
  transform: translateY(-4px);
  box-shadow: 0 12px 40px rgba(102, 126, 234, 0.15);
}
.mode-card__icon {
  width: 72px; height: 72px;
  border-radius: 20px;
  display: flex; align-items: center; justify-content: center;
  margin: 0 auto 16px;
}
.mode-card__icon--blue { background: linear-gradient(135deg, #667eea, #764ba2); }
.mode-card__icon--green { background: linear-gradient(135deg, #10b981, #059669); }
.mode-card h3 { font-size: 16px; font-weight: 700; color: #1e293b; margin: 0 0 8px; }
.mode-card p { font-size: 13px; color: #64748b; margin: 0; line-height: 1.5; }

/* ══ Run Mode Badge ════════════════════════════════════════════════════════════ */
.run-mode-badge {
  display: inline-flex; align-items: center;
  background: linear-gradient(135deg, #ede9fe, #e0e7ff);
  color: #5b21b6;
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 700;
}

/* ══ Week Display ══════════════════════════════════════════════════════════════ */
.week-display {
  display: flex; align-items: center;
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: 10px;
  padding: 8px 12px;
  font-size: 13px;
  font-weight: 600;
  color: #166534;
}
.month-badge {
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 10px;
  padding: 8px 12px;
  font-size: 13px;
  color: #1e40af;
}

/* ══ Salary Table ══════════════════════════════════════════════════════════════ */
.salary-table-wrap {
  overflow-x: auto;
  overflow-y: visible;
}
.salary-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  min-width: 1200px;
}
.salary-table--compact { min-width: 900px; }
.salary-table th {
  background: #f8fafc;
  padding: 10px 8px;
  font-size: 10px;
  font-weight: 700;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  text-align: center;
  border-bottom: 1px solid #e2e8f0;
  white-space: nowrap;
}
.salary-table td {
  padding: 8px 6px;
  border-bottom: 1px solid #f1f5f9;
  vertical-align: middle;
  text-align: center;
}
.salary-table tbody tr { transition: background 0.1s; }
.salary-table tbody tr:hover { background: #fafbff; }

.sticky-col {
  position: sticky;
  left: 0;
  z-index: 2;
  background: #fff;
  text-align: left !important;
  min-width: 160px;
  padding-left: 16px !important;
}
.salary-table thead .sticky-col { background: #f8fafc; }
.salary-table tfoot .sticky-col { background: #f0f4ff; }

.day-col { min-width: 80px; }
.day-header { display: flex; flex-direction: column; align-items: center; gap: 2px; }
.day-name { font-weight: 700; font-size: 11px; }
.day-date { font-size: 10px; color: #94a3b8; font-weight: 500; }

.disabled-col { background: #f8fafc !important; opacity: 0.5; }
.disabled-day { color: #cbd5e1; font-size: 12px; }

.num-col { min-width: 70px; white-space: nowrap; }
.final-col { color: #059669 !important; }
.deduct-val { color: #dc2626; }
.action-col { min-width: 100px; }

.wage-cell {
  position: relative;
  display: flex;
  align-items: center;
  gap: 2px;
}
.wage-input {
  width: 58px;
  padding: 5px 6px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  text-align: center;
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
  background: #fff;
}
.wage-input:focus {
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}
.wage-input--absent {
  background: #fef2f2;
  border-color: #fecaca;
  color: #b91c1c;
}
.wage-input::-webkit-inner-spin-button { display: none; }

.absent-toggle {
  width: 18px; height: 18px;
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  background: #dcfce7;
  color: #16a34a;
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.15s;
}
.absent-toggle--off {
  background: #fee2e2;
  color: #dc2626;
}

.summary-input {
  width: 60px;
  padding: 4px 6px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 12px;
  text-align: center;
  outline: none;
}
.summary-input:focus { border-color: #667eea; }
.summary-input::-webkit-inner-spin-button { display: none; }

/* Row Actions */
.row-actions { display: flex; gap: 4px; justify-content: center; }
.row-action-btn {
  width: 26px; height: 26px;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
  background: #fff;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
  transition: all 0.15s;
  color: #3b82f6;
}
.row-action-btn:hover { background: #eff6ff; border-color: #93c5fd; }
.row-action-btn--red { color: #ef4444; }
.row-action-btn--red:hover { background: #fef2f2; border-color: #fca5a5; }
.row-action-btn--grey { color: #6b7280; }
.row-action-btn--grey:hover { background: #f3f4f6; border-color: #d1d5db; }

/* Totals Row */
.totals-row td {
  background: #f0f4ff !important;
  border-top: 2px solid #c7d2fe;
  font-weight: 700;
  color: #1e293b;
}

/* ══ Runs List (Grouped by Employee) ══════════════════════════════════════════ */
.emp-run-group { border-bottom: 1px solid #e2e8f0; }
.emp-run-group:last-child { border-bottom: none; }
.emp-run-group__header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 20px;
  background: linear-gradient(135deg, #fafbff, #f0f4ff);
  border-bottom: 1px solid #f1f5f9;
}
.emp-run-group__body { padding: 0; }

.run-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px 12px 36px;
  border-bottom: 1px solid #f1f5f9;
  transition: background 0.15s;
  gap: 12px;
  flex-wrap: wrap;
}
.run-item--compact { padding: 10px 20px 10px 36px; }
.run-item:hover { background: #fafbff; }
.run-item:last-child { border-bottom: none; }
.run-item__left { display: flex; align-items: center; gap: 12px; }
.run-item__icon {
  width: 36px; height: 36px;
  border-radius: 10px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.run-item__icon--sm { width: 28px; height: 28px; border-radius: 8px; }
.run-item__dates { font-size: 14px; font-weight: 600; color: #1e293b; }
.run-item__meta { font-size: 12px; color: #64748b; margin-top: 2px; }
.run-item__right { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
.run-item__stat { display: flex; flex-direction: column; align-items: flex-end; }
.run-item__stat-label { font-size: 10px; color: #94a3b8; text-transform: uppercase; font-weight: 600; }
.run-item__stat-value { font-size: 14px; font-weight: 700; color: #1e293b; }
.run-item__stat-value--green { color: #059669; }

/* ══ Already Entered Indicator ════════════════════════════════════════════════ */
.already-entered-col { background: #fffbeb !important; opacity: 0.7; }
.already-entered-day {
  display: flex; flex-direction: column; align-items: center; gap: 2px;
  font-size: 10px; color: #d97706; font-weight: 600;
}

/* ══ Status Chip ═══════════════════════════════════════════════════════════════ */
.status-chip {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 700;
  text-transform: capitalize;
}
.status-chip--draft { background: #fef3c7; color: #92400e; }
.status-chip--completed { background: #dcfce7; color: #166534; }
.status-chip--locked { background: #e0e7ff; color: #3730a3; }

/* ══ Confirm Dialog ════════════════════════════════════════════════════════════ */
.confirm-header {
  display: flex; align-items: center;
  padding: 16px 20px;
  background: linear-gradient(135deg, #ef4444, #dc2626);
  color: #fff;
  font-size: 15px;
  font-weight: 700;
}

/* ══ Transitions ═══════════════════════════════════════════════════════════════ */
.slide-fade-enter-active { transition: all 0.3s ease; }
.slide-fade-leave-active { transition: all 0.2s ease; }
.slide-fade-enter-from { transform: translateY(-10px); opacity: 0; }
.slide-fade-leave-to { transform: translateY(-10px); opacity: 0; }

/* ══ Payment Cards ════════════════════════════════════════════════════════════ */
.pay-card {
  border-radius: 16px;
  background: #fff;
  border: 1px solid #e2e8f0;
  box-shadow: 0 2px 12px rgba(0,0,0,0.05);
  overflow: hidden;
  transition: box-shadow 0.2s, transform 0.2s;
}
.pay-card:hover { box-shadow: 0 8px 24px rgba(0,0,0,0.1); transform: translateY(-2px); }
.pay-card--pending { border-top: 4px solid #ef4444; }
.pay-card--settled { border-top: 4px solid #10b981; }
.pay-card__top { display: flex; align-items: flex-start; justify-content: space-between; padding: 16px 16px 10px; }
.pay-card__name { font-weight: 700; font-size: 15px; color: #1e293b; }
.pay-status {
  padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 700;
}
.pay-status--pending { background: #fef2f2; color: #b91c1c; }
.pay-status--settled { background: #f0fdf4; color: #166534; }
.pay-card__stats { display: grid; grid-template-columns: 1fr 1fr; gap: 0; padding: 0 16px 10px; }
.pay-stat { padding: 6px 4px; }
.pay-stat__label { font-size: 10.5px; color: #64748b; letter-spacing: 0.3px; margin-bottom: 2px; }
.pay-stat__val { font-size: 14px; font-weight: 700; color: #1e293b; }
.pay-stat__val--green { color: #059669; }
.pay-stat__val--red { color: #dc2626; }
.pay-stat__val--amber { color: #d97706; }
.pay-card__actions {
  border-top: 1px solid #f1f5f9;
  padding: 10px 12px;
  display: flex; align-items: center; gap: 8px;
}

/* ══ Payslip Document ════════════════════════════════════════════════════════ */
.payslip-doc {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0,0,0,0.05);
}
.payslip-doc__header {
  background: linear-gradient(135deg, #667eea, #764ba2);
  padding: 20px 24px;
  display: flex; align-items: flex-start; justify-content: space-between;
  color: #fff;
}
.payslip-doc__company { font-size: 20px; font-weight: 800; letter-spacing: 1px; }
.payslip-doc__sub { font-size: 11px; opacity: 0.75; letter-spacing: 2px; margin-top: 2px; }
.payslip-doc__badge {
  background: rgba(255,255,255,0.2);
  padding: 4px 12px; border-radius: 20px;
  font-size: 12px; font-weight: 700; letter-spacing: 1px;
}
.payslip-doc__period { font-size: 12px; opacity: 0.8; text-align: right; margin-top: 6px; }
.payslip-doc__emp { padding: 14px 24px; background: #f8fafc; font-size: 14px; border-bottom: 1px solid #e2e8f0; }
.payslip-section-title {
  font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.6px;
  color: #667eea; padding: 16px 24px 8px;
}
.payslip-table-wrap { overflow-x: auto; padding: 0 24px 16px; }
.payslip-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.payslip-table th {
  background: #f8fafc; padding: 10px 12px; font-size: 11px; font-weight: 700;
  color: #64748b; text-transform: uppercase; text-align: left; border-bottom: 1px solid #e2e8f0;
}
.payslip-table td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; }
.payslip-summary { padding: 8px 24px 16px; }
.payslip-summary__row {
  display: flex; justify-content: space-between; align-items: center;
  padding: 8px 0; border-bottom: 1px dashed #f1f5f9; font-size: 14px;
}
.payslip-summary__row:last-child { border-bottom: none; }
.payslip-summary__row span { color: #64748b; }
.payslip-status-bar {
  display: flex; align-items: center; justify-content: center;
  margin: 0 24px 20px; padding: 12px; border-radius: 10px;
  font-size: 13px; font-weight: 700; letter-spacing: 0.5px;
}
.payslip-status-bar--paid { background: #f0fdf4; color: #166534; }
.payslip-status-bar--pending { background: #fef2f2; color: #b91c1c; }

/* ══ Employee Summary Grid ════════════════════════════════════════════════════ */
.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 12px;
}
.summary-item {
  border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px 14px;
  display: flex; flex-direction: column; gap: 4px;
}
.summary-item span { font-size: 12px; color: #64748b; }
.summary-item strong { font-size: 18px; color: #1e293b; }

/* ══ Dialog Headers ══════════════════════════════════════════════════════════ */
.dialog-header {
  display: flex; align-items: center;
  padding: 16px 20px; font-size: 15px; font-weight: 700; color: #fff;
}
.dialog-header--blue { background: linear-gradient(135deg, #667eea, #764ba2); }
.dialog-header--green { background: linear-gradient(135deg, #059669, #10b981); }
.dialog-header--amber { background: linear-gradient(135deg, #d97706, #f59e0b); }

/* ══ Payment Info Box ════════════════════════════════════════════════════════ */
.payment-info-box { background: #f8fafc; border-radius: 12px; padding: 14px 16px; border: 1px solid #e2e8f0; }
.payment-info-row { display: flex; justify-content: space-between; align-items: center; font-size: 14px; padding: 4px 0; color: #475569; }

/* ══ History Table ═══════════════════════════════════════════════════════════ */
.history-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.history-table th {
  background: #f8fafc; padding: 10px 12px; font-size: 11px; font-weight: 700;
  color: #64748b; text-transform: uppercase; text-align: left; border-bottom: 1px solid #e2e8f0;
}
.history-table td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; }
.history-table tbody tr:hover td { background: #fafbff; }

/* ══ History Summary Row ═════════════════════════════════════════════════════ */
.hist-summary-row {
  display: flex;
  gap: 12px;
}
.hist-summary-item {
  flex: 1;
  padding: 12px 16px;
  border-radius: 10px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
}
.hist-summary-label { font-size: 11px; text-transform: uppercase; font-weight: 700; color: #64748b; margin-bottom: 4px; }
.hist-summary-val { font-size: 20px; font-weight: 800; }
.hist-summary-val--green { color: #059669; }
.hist-summary-val--amber { color: #d97706; }
.hist-summary-val--red { color: #dc2626; }
.hist-section-label { font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; margin-bottom: 8px; letter-spacing: 0.5px; }

/* ══ Disabled Row ═════════════════════════════════════════════════════════════ */
.row-disabled { opacity: 0.5; background: #f8fafc; }
.row-disabled td { pointer-events: none; }
.row-disabled .sticky-col { pointer-events: auto; }

/* ══ Deduction Chip Small ═════════════════════════════════════════════════════ */
.deduction-chip--sm { font-size: 10px; padding: 2px 6px; }

/* ══ Expansion Panels ═════════════════════════════════════════════════════════ */
.entries-panels { border-radius: 16px; overflow: hidden; }
.w-100 { width: 100%; }

/* ══ Entry Week Block ═════════════════════════════════════════════════════════ */
.entry-week-block { border-bottom: 1px solid #e2e8f0; padding-bottom: 12px; margin-bottom: 12px; }
.entry-week-block:last-child { border-bottom: none; margin-bottom: 0; padding-bottom: 0; }
.entry-week-block__header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 8px 0; margin-bottom: 8px;
}

/* ══ Wage Display (read-only) ═════════════════════════════════════════════════ */
.wage-display {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 700;
  text-align: center;
  min-width: 48px;
}
.wage-display--worked { background: #dcfce7; color: #166534; }
.wage-display--off { background: #fee2e2; color: #b91c1c; font-size: 10px; }

/* text helpers */
.text-success { color: #059679 !important; }
.text-error { color: #dc2626 !important; }

/* ══ Payment Overview Cards ══════════════════════════════════════════════════ */
.pay-overview {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}
.pay-overview__card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px 20px;
  border-radius: 14px;
  color: #fff;
  box-shadow: 0 4px 16px rgba(0,0,0,0.12);
}
.pay-overview__card--total { background: linear-gradient(135deg, #667eea, #764ba2); }
.pay-overview__card--paid { background: linear-gradient(135deg, #10b981, #059669); }
.pay-overview__card--pending { background: linear-gradient(135deg, #ef4444, #dc2626); }
.pay-overview__card--deduction { background: linear-gradient(135deg, #f59e0b, #d97706); }
.pay-overview__info { display: flex; flex-direction: column; }
.pay-overview__label { font-size: 11px; opacity: 0.85; font-weight: 500; }
.pay-overview__val { font-size: 20px; font-weight: 800; letter-spacing: -0.5px; }

/* ══ Payment Progress Bar (legacy) ══════════════════════════════════════════ */
.pay-progress { display: flex; align-items: center; gap: 8px; }
.pay-progress__bar { flex: 1; height: 6px; background: #e2e8f0; border-radius: 10px; overflow: hidden; min-width: 60px; }
.pay-progress__fill { height: 100%; background: linear-gradient(90deg, #10b981, #059669); border-radius: 10px; transition: width 0.3s ease; }
.pay-progress__text { font-size: 11px; font-weight: 700; color: #64748b; white-space: nowrap; }

/* ══ Dual Progress Bars ══════════════════════════════════════════════════ */
.dual-progress { display: flex; flex-direction: column; gap: 5px; min-width: 150px; }
.dual-progress__row { display: flex; align-items: center; gap: 6px; }
.dual-progress__lbl { font-size: 9px; font-weight: 700; color: #059669; text-transform: uppercase; width: 36px; flex-shrink: 0; }
.dual-progress__lbl--amber { color: #d97706; }
.dual-progress__bar {
  flex: 1;
  height: 8px;
  border-radius: 10px;
  overflow: hidden;
  background: #f1f5f9;
  display: flex;
}
.dual-progress__fill { height: 100%; transition: width 0.35s ease; }
.dual-progress__fill--paid    { background: linear-gradient(90deg, #10b981, #059669); }
.dual-progress__fill--pending { background: linear-gradient(90deg, #f87171, #ef4444); }
.dual-progress__fill--returned { background: linear-gradient(90deg, #10b981, #059669); }
.dual-progress__fill--held    { background: linear-gradient(90deg, #f87171, #ef4444); }
.dual-progress__pct { font-size: 10px; font-weight: 700; white-space: nowrap; width: 40px; text-align: right; flex-shrink: 0; }
.dual-progress__pct--green  { color: #059669; }
.dual-progress__pct--red    { color: #dc2626; }
.dual-progress__pct--amber  { color: #d97706; }

/* ══ Payslip Quick Stats ════════════════════════════════════════════════════ */
.payslip-quick-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0;
  border-bottom: 1px solid #e2e8f0;
}
.payslip-quick-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px 12px 16px;
  border-right: 1px solid #f1f5f9;
  transition: background 0.15s;
}
.payslip-quick-stat:last-child { border-right: none; }
.payslip-quick-stat--green { background: #f0fdf4; }
.payslip-quick-stat__icon { font-size: 16px; margin-bottom: 4px; line-height: 1; }
.payslip-quick-stat__val { font-size: 22px; font-weight: 800; color: #1e293b; line-height: 1.1; }
.payslip-quick-stat__val--green { color: #059669; }
.payslip-quick-stat__val--red { color: #dc2626; }
.payslip-quick-stat__val--muted { color: #94a3b8; }
.payslip-quick-stat__label { font-size: 10px; color: #94a3b8; margin-top: 5px; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px; }

/* ══ Outstanding Balance Bar ════════════════════════════════════════════════ */
.payslip-outstanding-bar {
  display: flex;
  align-items: center;
  gap: 0;
  background: linear-gradient(135deg, #fef2f2 0%, #fff5f5 100%);
  border-bottom: 2px solid #fca5a5;
  padding: 12px 24px;
  flex-wrap: wrap;
}
.payslip-outstanding-bar__item {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  min-width: 120px;
  padding: 4px 12px;
}
.payslip-outstanding-bar__sep {
  font-size: 22px;
  font-weight: 900;
  color: #f87171;
  padding: 0 4px;
  line-height: 1;
}
.payslip-outstanding-bar__total {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  min-width: 140px;
  background: #dc2626;
  border-radius: 10px;
  padding: 8px 16px;
  margin-left: 8px;
}
.payslip-outstanding-bar__label { font-size: 10px; font-weight: 700; color: #ef4444; text-transform: uppercase; letter-spacing: 0.5px; }
.payslip-outstanding-bar__val { font-size: 17px; font-weight: 800; color: #dc2626; margin-top: 2px; }
.payslip-outstanding-bar__total .payslip-outstanding-bar__label { color: rgba(255,255,255,0.8); }
.payslip-outstanding-bar__total-val { font-size: 20px; font-weight: 900; color: #fff; margin-top: 2px; }

.payslip-summary__row--highlight {
  background: #f0fdf4;
  border-radius: 8px;
  padding: 10px 8px !important;
  margin: 4px -8px;
  border: 1px solid #bbf7d0;
}
.payslip-summary__row--carryforward {
  background: #fffbeb;
  border-radius: 8px;
  padding: 8px 8px !important;
  margin: 4px -8px;
  border: 1px solid #fde68a;
}
.payslip-summary__row--outstanding {
  background: #fef2f2;
  border-radius: 8px;
  padding: 10px 8px !important;
  margin: 4px -8px;
  border: 1px solid #fecaca;
}

/* ══ Deduction Fund Box (Payslip) ═════════════════════════════════════════════ */
.payslip-fund-note {
  font-size: 11px;
  font-weight: 400;
  color: #94a3b8;
  margin-left: 8px;
  font-style: italic;
}
.payslip-fund-box {
  margin: 0 24px 20px;
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: 12px;
  padding: 16px;
}
.payslip-fund-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
}
.payslip-fund-item {
  padding: 10px 14px;
  background: #fff;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
}
.payslip-fund-item--highlight {
  background: #fffdf0;
  border-color: #fbbf24;
}
.payslip-fund-item__label {
  font-size: 10px;
  text-transform: uppercase;
  font-weight: 700;
  color: #92400e;
  letter-spacing: 0.5px;
  margin-bottom: 4px;
}
.payslip-fund-item__val {
  font-size: 18px;
  font-weight: 800;
  color: #1e293b;
}
.payslip-fund-item__val--red { color: #dc2626; }
.payslip-fund-item__val--blue { color: #2563eb; }
.payslip-fund-item__val--amber { color: #d97706; }

/* ══ Summary Stat Inline ══════════════════════════════════════════════════════ */
.summary-stat-inline {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
}
.summary-stat-inline span { color: #64748b; }
.summary-stat-inline strong { font-size: 15px; }

/* ══ Status Chips (extended) ═════════════════════════════════════════════════ */
.status-chip--pending { background: #fef2f2; color: #b91c1c; }
.status-chip--partial { background: #fffbeb; color: #92400e; }
.status-chip--paid { background: #f0fdf4; color: #166534; }

/* ══ Week Row Block (Salary Entries & Employee Summary) ═════════════════════ */
.week-row-block {
  padding: 12px 20px;
  border-bottom: 1px solid #e8edf3;
}
.week-row-block:last-child { border-bottom: none; }
.week-row-block:hover { background: #fafbff; }
.week-row-block__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  flex-wrap: wrap;
  gap: 6px;
}
.week-row-block__period {
  font-size: 13px;
  font-weight: 600;
  color: #334155;
}
.week-row-block__final {
  font-size: 15px;
  font-weight: 800;
  color: #059669;
}
.week-row-block__body {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}
.week-row-days {
  display: flex;
  gap: 3px;
  flex: 1;
  min-width: 0;
}
.week-row-day {
  flex: 1;
  text-align: center;
  border-radius: 6px;
  padding: 4px 2px;
  min-width: 44px;
}
.week-row-day--worked {
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
}
.week-row-day--off {
  background: #fef2f2;
  border: 1px solid #fecaca;
}
.week-row-day__label {
  display: block;
  font-size: 9px;
  color: #64748b;
  font-weight: 600;
  line-height: 1.2;
  text-transform: uppercase;
}
.week-row-day__val {
  display: block;
  font-size: 12px;
  font-weight: 700;
  margin-top: 2px;
}
.week-row-day--worked .week-row-day__val { color: #166534; }
.week-row-day--off .week-row-day__val { color: #b91c1c; font-size: 9px; }

.week-row-summary {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
  flex-wrap: wrap;
}
.week-row-stat {
  font-size: 12px;
  font-weight: 600;
  color: #475569;
  white-space: nowrap;
}
.week-row-stat em {
  font-style: normal;
  background: #e0e7ff;
  color: #3730a3;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 11px;
}
.week-row-stat small {
  font-size: 9px;
  color: #94a3b8;
  font-weight: 500;
}
.week-row-stat--red { color: #dc2626; }
.week-row-stat--green { color: #059669; }

.week-card-totals {
  padding: 14px 20px;
  background: linear-gradient(135deg, #f0f4ff, #ede9fe);
  border-top: 2px solid #c7d2fe;
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

/* ══ Employee Summary Redesign ════════════════════════════════════════════════ */
/* Filter bar */
.summ-filter-bar {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 18px 20px;
  box-shadow: 0 2px 12px rgba(0,0,0,.05);
}
.summ-filter-bar__grid {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1.3fr 1.3fr auto;
  gap: 12px;
  align-items: end;
}
.summ-filter-item { display: flex; flex-direction: column; gap: 4px; }
.summ-filter-item--actions { justify-content: flex-end; }
.summ-filter-label {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: .5px;
  text-transform: uppercase;
  color: #64748b;
}

/* KPI row */
.summ-kpi-row {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 12px;
}
.summ-kpi {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 18px;
  border-radius: 14px;
  color: #fff;
  box-shadow: 0 4px 14px rgba(0,0,0,.10);
}
.summ-kpi--purple { background: linear-gradient(135deg, #7c3aed, #9f67fa); }
.summ-kpi--blue   { background: linear-gradient(135deg, #2563eb, #60a5fa); }
.summ-kpi--amber  { background: linear-gradient(135deg, #d97706, #fbbf24); }
.summ-kpi--green  { background: linear-gradient(135deg, #059669, #34d399); }
.summ-kpi--teal   { background: linear-gradient(135deg, #0d9488, #2dd4bf); }
.summ-kpi--red    { background: linear-gradient(135deg, #dc2626, #f87171); }
.summ-kpi__body { display: flex; flex-direction: column; min-width: 0; }
.summ-kpi__val { font-size: 20px; font-weight: 700; line-height: 1.2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.summ-kpi__label { font-size: 11px; opacity: .85; font-weight: 500; letter-spacing: .3px; white-space: nowrap; }

/* Month groups */
.summ-groups { display: flex; flex-direction: column; gap: 24px; }
.summ-month-group { border-radius: 16px; overflow: hidden; box-shadow: 0 2px 16px rgba(0,0,0,.07); border: 1px solid #e2e8f0; }
.summ-month-hdr {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  padding: 14px 20px;
  background: linear-gradient(135deg, #3730a3 0%, #4f46e5 60%, #6366f1 100%);
  color: #fff;
}
.summ-month-hdr__left { display: flex; align-items: center; gap: 12px; }
.summ-month-hdr__badge {
  font-size: 15px;
  font-weight: 700;
  letter-spacing: .5px;
  text-transform: uppercase;
}
.summ-month-hdr__meta { font-size: 12px; opacity: .8; }
.summ-month-hdr__stats { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.summ-month-stat {
  font-size: 12px;
  background: rgba(255,255,255,.15);
  padding: 3px 10px;
  border-radius: 20px;
  white-space: nowrap;
}
.summ-month-stat strong { font-weight: 700; }
.summ-month-stat--deduct { background: rgba(251,191,36,.25); }
.summ-month-stat--net    { background: rgba(52,211,153,.25); }
.summ-month-stat--paid   { background: rgba(167,243,208,.2); }
.summ-month-stat--bal    { background: rgba(252,165,165,.3); }
.summ-month-stat--clr    { background: rgba(110,231,183,.3); }

/* Employee Cards */
.summ-emp-cards { padding: 16px; display: flex; flex-direction: column; gap: 14px; background: #fff; }
.summ-emp-card {
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  overflow: hidden;
  transition: box-shadow .2s;
}
.summ-emp-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,.08); }
.summ-emp-card__hdr {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  padding: 14px 18px;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
}
.summ-emp-card__info { display: flex; align-items: center; gap: 10px; }
.summ-emp-card__avatar {
  width: 36px; height: 36px;
  border-radius: 10px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: #fff;
  display: flex; align-items: center; justify-content: center;
  font-weight: 700; font-size: 14px;
}
.summ-emp-card__name { font-size: 15px; font-weight: 700; color: #1e293b; }
.summ-emp-card__meta { font-size: 12px; color: #64748b; }
.summ-emp-card__totals { display: flex; gap: 20px; }
.summ-emp-card__stat-item { display: flex; flex-direction: column; align-items: center; gap: 1px; }
.summ-emp-card__stat-val { font-size: 15px; font-weight: 700; color: #1e293b; }
.summ-emp-card__stat-lbl { font-size: 10px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: .5px; }

/* Week items inside employee card */
.summ-emp-card__weeks { padding: 0; }
.summ-week-item { border-bottom: 1px solid #f1f5f9; }
.summ-week-item:last-child { border-bottom: none; }
.summ-week-item--alt { background: #fafbfe; }
.summ-week-item__row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 18px;
}
.summ-week-item__period {
  font-size: 13px;
  font-weight: 500;
  color: #475569;
  white-space: nowrap;
  min-width: 180px;
}
.summ-week-item__stats {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  flex: 1;
}
.summ-week-item__chip {
  font-size: 12px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 6px;
  background: #f1f5f9;
  color: #334155;
  white-space: nowrap;
}
.summ-week-item__chip--amber { background: #fef3c7; color: #92400e; }
.summ-week-item__chip--muted { background: #f1f5f9; color: #94a3b8; font-weight: 500; }
.summ-week-item__chip--net { background: #d1fae5; color: #065f46; font-weight: 700; }
.summ-week-item__badge {
  font-size: 10px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 10px;
  text-transform: uppercase;
  letter-spacing: .5px;
}
.summ-week-item__badge--paid { background: #d1fae5; color: #065f46; }
.summ-week-item__badge--partial { background: #fef3c7; color: #92400e; }
.summ-week-item__badge--pending { background: #fee2e2; color: #991b1b; }
.summ-week-item__expand {
  border: none;
  background: none;
  cursor: pointer;
  padding: 4px;
  border-radius: 6px;
  color: #64748b;
  transition: background .15s;
}
.summ-week-item__expand:hover { background: #e2e8f0; }
.summ-week-item__days {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 8px 18px 14px;
  border-top: 1px dashed #e2e8f0;
}

/* Day detail cells */
.summ-day-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 8px 10px;
  border-radius: 10px;
  min-width: 60px;
  text-align: center;
}
.summ-day-cell--on  { background: #d1fae5; border: 1px solid #6ee7b7; }
.summ-day-cell--off { background: #f1f5f9; border: 1px solid #e2e8f0; opacity: .7; }
.summ-day-cell__name { font-size: 10px; font-weight: 700; text-transform: uppercase; color: #64748b; letter-spacing: .5px; }
.summ-day-cell__date { font-size: 11px; color: #475569; }
.summ-day-cell__val { font-size: 12px; font-weight: 700; color: #059669; }
.summ-day-cell--off .summ-day-cell__val { color: #94a3b8; }

/* Misc shared */
.deduct-val { color: #b45309; }
.emp-cell { display: flex; align-items: center; gap: 8px; min-width: 140px; }

/* Grand total */
.summ-grand-total {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 16px;
  padding: 16px 22px;
  background: linear-gradient(135deg, #1e1b4b, #312e81);
  border-radius: 14px;
  color: #fff;
}
.summ-grand-stats { display: flex; flex-wrap: wrap; gap: 20px; }
.summ-grand-stats span { display: flex; flex-direction: column; align-items: center; gap: 2px; }
.summ-grand-stats em { font-style: normal; font-size: 10px; opacity: .7; letter-spacing: .5px; text-transform: uppercase; }
.summ-grand-stats strong { font-size: 15px; font-weight: 700; }

/* ══ Responsive ════════════════════════════════════════════════════════════════ */
@media (max-width: 768px) {
  .payroll-root { padding: 12px; }
  .hero { padding: 20px; border-radius: 16px; }
  .hero__title { font-size: 18px; }
  .mode-cards { flex-direction: column; align-items: center; }
  .mode-card { width: 100%; max-width: 300px; }
  .nav-strip { width: 100%; overflow-x: auto; flex-wrap: nowrap; }
  .nav-btn { flex: 0 0 auto; justify-content: center; padding: 10px 12px; font-size: 12px; }
  .summary-grid { grid-template-columns: 1fr 1fr; }
  .pay-overview { grid-template-columns: 1fr 1fr; }
  .payslip-quick-stats { grid-template-columns: 1fr 1fr; }
  .week-card-block__calendar { grid-template-columns: repeat(4, 1fr); }
  .summ-filter-bar__grid { grid-template-columns: 1fr 1fr; }
  .summ-kpi-row { grid-template-columns: 1fr 1fr 1fr; }
  .summ-month-hdr { flex-direction: column; align-items: flex-start; }
  .summ-grand-total { flex-direction: column; align-items: flex-start; }
  .summ-emp-card__hdr { flex-direction: column; align-items: flex-start; }
  .summ-emp-card__totals { gap: 12px; }
  .summ-week-item__row { flex-direction: column; align-items: flex-start; gap: 6px; }
  .summ-week-item__period { min-width: unset; }
}
</style>
