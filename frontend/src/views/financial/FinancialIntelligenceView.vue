<template>
  <div class="page-container fi-root">
    <div class="fi-header mb-5">
      <div>
        <h2 class="fi-title">Financial Intelligence</h2>
        <p class="fi-sub">Personal CFO for debt elimination, forecasting, and risk-aware cashflow control.</p>
      </div>
      <div class="d-flex ga-2 align-center">
        <v-select
          v-model="selectedMonthNumber"
          :items="monthOptions"
          item-title="title"
          item-value="value"
          density="compact"
          variant="outlined"
          hide-details
          style="min-width: 180px"
        />
        <v-select
          v-model="selectedYearNumber"
          :items="yearOptions"
          density="compact"
          variant="outlined"
          hide-details
          style="min-width: 130px"
        />
        <v-btn color="primary" prepend-icon="mdi-refresh" :loading="store.loading" @click="loadAll">Refresh</v-btn>
      </div>
    </div>

    <v-row class="mb-3">
      <v-col cols="12" md="3">
        <v-card class="fi-stat" rounded="xl">
          <div class="fi-stat-label">Total Debt</div>
          <div class="fi-stat-value">{{ money(summary?.totalDebt || 0) }}</div>
        </v-card>
      </v-col>
      <v-col cols="12" md="3">
        <v-card class="fi-stat" rounded="xl">
          <div class="fi-stat-label">{{ currentAvailableSurplus >= 0 ? 'Available Surplus' : 'Monthly Deficit' }}</div>
          <div class="fi-stat-value" :class="currentAvailableSurplus < 0 ? 'text-error' : 'text-success'">{{ money(currentAvailableSurplus) }}</div>
        </v-card>
      </v-col>
      <v-col cols="12" md="3">
        <v-card class="fi-stat" rounded="xl">
          <div class="fi-stat-label">Debt-Free Date</div>
          <div class="fi-stat-value fi-date">{{ debtFreeEstimateLabel }}</div>
        </v-card>
      </v-col>
      <v-col cols="12" md="3">
        <v-card class="fi-stat" rounded="xl">
          <div class="fi-stat-label">Financial Health</div>
          <div class="fi-stat-value">{{ summary?.health?.score || 0 }}/100</div>
          <div class="fi-health">{{ summary?.health?.band || 'Poor' }}</div>
        </v-card>
      </v-col>
    </v-row>

    <v-card class="mb-4" rounded="xl" variant="tonal">
      <v-card-text>
        <div class="text-caption text-medium-emphasis mb-1">Priority Order</div>
        <div class="d-flex flex-wrap ga-2">
          <v-chip v-for="(item, idx) in (profile.priorityOrder || [])" :key="`priority-top-${item}-${idx}`" size="small" color="primary" variant="flat">
            {{ idx + 1 }}. {{ item }}
          </v-chip>
          <span v-if="!(profile.priorityOrder || []).length" class="text-caption text-medium-emphasis">No custom priority set yet.</span>
        </div>
      </v-card-text>
    </v-card>

    <v-card class="mb-4" rounded="xl">
      <v-card-title class="d-flex align-center justify-space-between">
        <span>Monthly Data Entry</span>
        <div class="d-flex ga-2">
          <v-chip size="small" :color="monthlyEntryMode === 'edit' ? 'warning' : 'primary'" variant="tonal">
            {{ monthlyEntryMode === 'edit' ? 'Edit Mode' : 'Add Mode' }}
          </v-chip>
          <v-btn v-if="monthlyEntryMode === 'edit'" size="small" variant="outlined" @click="resetMonthlyForm">Cancel Edit</v-btn>
          <v-btn size="small" color="primary" variant="flat" :loading="store.loading" @click="saveProfile">
            {{ monthlyEntryMode === 'edit' ? 'Update Monthly Entry' : 'Save Monthly Entry' }}
          </v-btn>
        </div>
      </v-card-title>
      <v-card-text>
        <v-row>
          <v-col cols="12" md="6">
            <h4 class="fi-block-title">Monthly Income</h4>
            <IndianCurrencyField v-model="monthlyForm.monthlyIncome.powerloomIncome" label="Powerloom Income" />
            <IndianCurrencyField v-model="monthlyForm.monthlyIncome.ashokContribution" label="Ashok Contribution" />
            <IndianCurrencyField v-model="monthlyForm.monthlyIncome.rentalIncome" label="Rental Income" />
          </v-col>
          <v-col cols="12" md="6">
            <h4 class="fi-block-title">Monthly Expenses</h4>
            <IndianCurrencyField v-model="monthlyForm.monthlyExpenses.workerWages" label="Worker Wages" />
            <IndianCurrencyField v-model="monthlyForm.monthlyExpenses.familyExpenses" label="Family Expenses" />
            <IndianCurrencyField v-model="monthlyForm.monthlyExpenses.otherMonthlyExpenses" label="Other Monthly Expenses" />
          </v-col>
        </v-row>
        <v-divider class="my-4" />
        <h4 class="fi-block-title mb-2">Debt Priority Order</h4>
        <v-combobox
          v-model="profile.priorityOrder"
          :items="store.debts.map(d => d.name)"
          chips
          multiple
          clearable
          density="compact"
          variant="outlined"
          label="Example: Subbaiyan, OD1, Auto Loan, Rani, OD2"
        />
        <v-divider class="my-4" />
        <div class="fi-monthly-summary">
          <div class="fi-summary-row">
            <div class="fi-summary-col">
              <div class="fi-total-label">Total Monthly Income</div>
              <div class="fi-total-value text-primary">{{ money(monthlyTotals.totalIncome) }}</div>
            </div>
            <div class="fi-summary-col">
              <div class="fi-total-label">Total Monthly Expenses</div>
              <div class="fi-total-value">{{ money(monthlyTotals.totalExpenses) }}</div>
            </div>
            <div class="fi-summary-col fi-summary-col--accent">
              <div class="fi-total-label">Initial Surplus</div>
              <div class="fi-total-value" :class="monthlyTotals.totalBalance >= 0 ? 'text-success' : 'text-error'">
                {{ money(monthlyTotals.totalBalance) }}
              </div>
              <div class="text-caption text-medium-emphasis">Income − Expenses</div>
            </div>
          </div>
          <v-divider class="my-3" />
          <div class="fi-summary-row">
            <div class="fi-summary-col">
              <div class="fi-total-label">Total Debt Payments (This Month)</div>
              <div class="fi-total-value text-warning">{{ money(monthlyActionTotals.amountPaid) }}</div>
            </div>
            <div class="fi-summary-col fi-summary-col--highlight">
              <div class="fi-total-label">
                {{ currentAvailableSurplus >= 0 ? 'Remaining Surplus' : 'Deficit' }}
              </div>
              <div class="fi-total-value" :class="currentAvailableSurplus >= 0 ? 'text-success' : 'text-error'">
                {{ money(currentAvailableSurplus) }}
              </div>
              <div class="text-caption text-medium-emphasis">Income − Expenses − Debt Payments</div>
            </div>
          </div>
        </div>

      </v-card-text>
    </v-card>

    <v-card class="mb-4" rounded="xl">
      <v-card-title>Monthly Financial Tracking</v-card-title>
      <v-card-text>
        <div class="fi-table-wrap">
          <v-table density="comfortable" class="fi-table">
            <thead>
              <tr>
                <th>Month</th>
                <th class="text-right">Income</th>
                <th class="text-right">Total Expenses</th>
                <th class="text-right">Available Surplus</th>
                <th class="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in monthlyTrackingRows" :key="`${row.year}-${row.month}`">
                <td>{{ monthLabel(row.year, row.month) }}</td>
                <td class="text-right">{{ money(row?.totals?.totalIncome || 0) }}</td>
                <td class="text-right">{{ money((row?.totals?.totalExpenses ?? row?.totals?.totalMonthlyExpenses) || 0) }}</td>
                <td class="text-right">
                  <span :class="monthlyRowBalance(row) >= 0 ? 'text-success font-weight-bold' : 'text-error font-weight-bold'">
                    {{ monthlyRowBalance(row) >= 0 ? money(monthlyRowBalance(row)) : '−' + money(Math.abs(monthlyRowBalance(row))) }}
                  </span>
                  <div v-if="monthlyRowBalance(row) < 0" class="text-caption text-error">Deficit</div>
                </td>
                <td class="fi-actions-cell fi-actions-cell--center">
                  <v-btn size="small" color="primary" variant="flat" @click="editTransaction(row._tx)">Edit</v-btn>
                  <v-btn size="small" color="error" variant="flat" @click="removeTransaction(row._tx)">Delete</v-btn>
                </td>
              </tr>
              <tr v-if="!monthlyTrackingRows.length">
                <td colspan="5" class="text-center text-medium-emphasis">No record saved for selected month.</td>
              </tr>
            </tbody>
          </v-table>
        </div>
      </v-card-text>
    </v-card>

    <v-card class="mb-4" rounded="xl">
      <v-card-title>Monthly Actions ({{ selectedMonth }})</v-card-title>
      <v-card-text>
        <div class="fi-table-wrap">
          <v-table density="comfortable" class="fi-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Debt</th>
                <th class="text-right">Interest Paid</th>
                <th class="text-right">Principal Paid</th>
                <th class="text-right">Extra Principal</th>
                <th class="text-right">Charges</th>
                <th class="text-right">Total Amount Paid</th>
                <th class="text-right">Remaining</th>
                <th class="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="action in (store.dashboard?.monthlyActions || [])" :key="action._id">
                <td>{{ action.date ? new Date(action.date).toLocaleDateString('en-IN') : '-' }}</td>
                <td>{{ debtName(action.debt) }}</td>
                <td class="text-right">{{ money(action.interestPaid || 0) }}</td>
                <td class="text-right">{{ money(Math.max(0, (action.principalPaid || 0) - (action.extraPaymentAmount || 0))) }}</td>
                <td class="text-right">{{ money(action.extraPaymentAmount || 0) }}</td>
                <td class="text-right">{{ money(action.additionalCharges || 0) }}</td>
                <td class="text-right font-weight-medium">{{ money(action.amountPaid || 0) }}</td>
                <td class="text-right">{{ money(action.remainingBalanceAfterPayment || 0) }}</td>
                <td class="fi-actions-cell fi-actions-cell--center">
                  <v-btn size="small" color="primary" variant="flat" @click="openEditMonthlyAction(action)">Edit</v-btn>
                  <v-btn size="small" color="error" variant="flat" @click="removeMonthlyAction(action._id)">Delete</v-btn>
                </td>
              </tr>
              <tr v-if="!(store.dashboard?.monthlyActions || []).length">
                <td colspan="9" class="text-center text-medium-emphasis">No actions recorded for this month.</td>
              </tr>
              <tr v-if="(store.dashboard?.monthlyActions || []).length" class="fi-totals-row">
                <td colspan="2" class="font-weight-bold">Totals</td>
                <td class="text-right font-weight-bold">{{ money(monthlyActionTotals.interestPaid) }}</td>
                <td class="text-right font-weight-bold">{{ money(monthlyActionTotals.basePrincipalPaid) }}</td>
                <td class="text-right font-weight-bold">{{ money(monthlyActionTotals.extraPaymentAmount) }}</td>
                <td class="text-right font-weight-bold">{{ money(monthlyActionTotals.additionalCharges) }}</td>
                <td class="text-right font-weight-bold">{{ money(monthlyActionTotals.amountPaid) }}</td>
                <td class="text-right font-weight-bold" :title="'Current total outstanding across all debts'">{{ money(debtCenterTotals.totalBalance) }}</td>
                <td></td>
              </tr>
            </tbody>
          </v-table>
        </div>
      </v-card-text>
    </v-card>

    <v-card class="mb-4" rounded="xl">
      <v-card-title class="d-flex align-center justify-space-between">
        <span>Debt Center</span>
        <div class="d-flex ga-2">
          <v-btn size="small" color="primary" variant="outlined" prepend-icon="mdi-cash-plus" @click="openPaymentDialog">Add Payment</v-btn>
          <v-btn size="small" color="primary" variant="flat" prepend-icon="mdi-plus" @click="openDebtDialog">Add Debt</v-btn>
        </div>
      </v-card-title>
      <v-card-text>
        <div class="mb-3">
          <div class="text-caption text-medium-emphasis mb-1">Priority Order</div>
          <div class="d-flex flex-wrap ga-2">
            <v-chip
              v-for="(item, idx) in (profile.priorityOrder || [])"
              :key="`${item}-${idx}`"
              size="small"
              color="primary"
              variant="tonal"
            >
              {{ idx + 1 }}. {{ item }}
            </v-chip>
            <span v-if="!(profile.priorityOrder || []).length" class="text-caption text-medium-emphasis">No custom priority set yet.</span>
          </div>
        </div>
        <div class="fi-table-wrap">
          <v-table density="comfortable" class="fi-table fi-debt-table">
            <thead>
              <tr>
                <th>Debt Name</th>
                <th>Type</th>
                <th class="text-right">Outstanding Balance</th>
                <th class="text-right">Monthly Payment</th>
                <th class="text-right">Monthly Interest</th>
                <th class="text-right">Priority</th>
                <th>Status</th>
                <th class="fi-actions-header">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in prioritizedDebtRows" :key="row.debtId">
                <td>
                  <div class="font-weight-medium">{{ row.debtName }}</div>
                </td>
                <td>
                  <v-chip size="small" variant="tonal" color="info">{{ debtTypeLabel(row.debtType) }}</v-chip>
                </td>
                <td class="text-right fi-highlight-balance">{{ money(row.currentBalance || 0) }}</td>
                <td class="text-right fi-highlight-payment">{{ money(row.monthlyPayment || 0) }}</td>
                <td class="text-right fi-highlight-interest">{{ money(row.interest || 0) }}</td>
                <td class="text-right">
                  <v-chip size="small" :color="row.priority <= 2 ? 'error' : row.priority <= 4 ? 'warning' : 'secondary'" variant="flat">P{{ row.priority }}</v-chip>
                </td>
                <td>
                  <v-chip size="x-small" :color="row.status === 'closed' ? 'success' : 'warning'">{{ row.status }}</v-chip>
                </td>
                <td class="fi-actions-cell fi-actions-cell--center">
                  <v-btn variant="flat" size="small" color="primary" prepend-icon="mdi-pencil" @click="openEditDebtDialog(row.debtId)">Edit</v-btn>
                  <v-btn variant="flat" size="small" color="error" prepend-icon="mdi-delete" @click="removeDebt(row.debtId)">Delete</v-btn>
                  <v-btn variant="outlined" size="small" color="primary" prepend-icon="mdi-eye" :to="`/financial-intelligence/debts/${row.debtId}`">View</v-btn>
                </td>
              </tr>
              <tr v-if="!prioritizedDebtRows.length">
                <td colspan="8" class="text-center text-medium-emphasis">No debts added for this month.</td>
              </tr>
              <tr v-if="prioritizedDebtRows.length" class="fi-totals-row">
                <td class="font-weight-bold">Totals</td>
                <td></td>
                <td class="text-right font-weight-bold fi-highlight-balance">{{ money(debtCenterTotals.totalBalance) }}</td>
                <td class="text-right font-weight-bold fi-highlight-payment">{{ money(debtCenterTotals.totalMonthlyPayment) }}</td>
                <td class="text-right font-weight-bold fi-highlight-interest">{{ money(debtCenterTotals.totalMonthlyInterest) }}</td>
                <td></td>
                <td></td>
                <td></td>
              </tr>
            </tbody>
          </v-table>
        </div>
      </v-card-text>
    </v-card>

    <v-row class="mb-4">
      <v-col cols="12">
        <v-card rounded="xl" class="h-100">
          <v-card-title class="d-flex align-center justify-space-between">
            <span>AI Advisor Dashboard</span>
            <v-chip size="small" :color="['gemini', 'groq'].includes(store.aiSource) ? 'success' : (store.aiSource === 'cache' ? 'info' : 'warning')" variant="tonal">
              {{ store.aiSource === 'gemini' ? 'Gemini Powered' : (store.aiSource === 'groq' ? 'Groq Llama 3.3 Powered' : (store.aiSource === 'cache' ? 'Cached Insights' : 'Not Generated')) }}
            </v-chip>
          </v-card-title>
          <v-card-text>
            <div class="d-flex flex-wrap ga-2 align-center mb-4">
              <v-btn
                color="primary"
                prepend-icon="mdi-robot-outline"
                :loading="store.aiLoading"
                @click="generateAIInsights"
              >
                Generate AI Insights
              </v-btn>
              <v-btn
                variant="outlined"
                color="primary"
                prepend-icon="mdi-refresh"
                :loading="store.aiLoading"
                @click="retryAIInsights"
              >
                Retry
              </v-btn>
              <v-chip size="small" color="secondary" variant="tonal" v-if="store.aiLastGeneratedAt">
                Last Generated: {{ dateLabel(store.aiLastGeneratedAt) }}
              </v-chip>
              <v-chip size="small" color="warning" variant="tonal" v-if="store.aiRequiresRegeneration">
                Financial data changed. Regenerate insights.
              </v-chip>
            </div>

            <v-alert v-if="store.aiError" type="error" variant="tonal" class="mb-3">
              {{ store.aiError }}
            </v-alert>

            <div v-if="store.aiLoading" class="d-flex align-center ga-3 py-4">
              <v-progress-circular indeterminate color="primary" />
              <div class="text-body-2">Analyzing income, expenses, debt balances, interest, priorities, and payment behavior...</div>
            </div>

            <template v-else>
              <v-card rounded="lg" variant="outlined" class="mb-3">
                <v-card-title class="text-subtitle-2">Financial Health Summary</v-card-title>
                <v-card-text>
                  <v-row>
                    <v-col cols="12" md="6" v-for="row in financialHealthSummaryRows" :key="row.label">
                      <div class="d-flex justify-space-between align-center py-1">
                        <span class="text-caption text-medium-emphasis">{{ row.label }}</span>
                        <span class="font-weight-medium">{{ row.value }}</span>
                      </div>
                    </v-col>
                  </v-row>
                </v-card-text>
              </v-card>

              <v-row class="mb-2">
                <v-col cols="12" md="4">
                  <v-card variant="tonal" color="primary" rounded="lg">
                    <v-card-text>
                      <div class="text-caption">Financial Health Score</div>
                      <div class="text-h5 font-weight-bold">{{ store.aiInsights.financialHealthScore }}/100</div>
                    </v-card-text>
                  </v-card>
                </v-col>
                <v-col cols="12" md="8">
                  <v-card variant="tonal" color="info" rounded="lg">
                    <v-card-text>
                      <div class="text-caption">Overall Assessment</div>
                      <div class="text-body-1">{{ compactText(store.aiInsights.overallAssessment || 'Generate insights to view assessment.', 220) }}</div>
                    </v-card-text>
                  </v-card>
                </v-col>
              </v-row>

              <v-row>
                <v-col cols="12" md="6">
                  <v-card rounded="lg" variant="outlined" class="mb-3">
                    <v-card-title class="text-subtitle-2">Spending Insights</v-card-title>
                    <v-card-text>
                      <v-alert v-for="(item, idx) in store.aiInsights.spendingInsights" :key="`sp-${idx}`" type="info" variant="tonal" class="mb-2">
                        {{ compactText(item, 160) }}
                      </v-alert>
                      <div v-if="!store.aiInsights.spendingInsights.length" class="text-caption text-medium-emphasis">No spending insights generated yet.</div>
                    </v-card-text>
                  </v-card>
                </v-col>
                <v-col cols="12" md="6">
                  <v-card rounded="lg" variant="outlined" class="mb-3">
                    <v-card-title class="text-subtitle-2">Debt Insights</v-card-title>
                    <v-card-text>
                      <v-alert v-for="(item, idx) in store.aiInsights.debtInsights" :key="`de-${idx}`" type="warning" variant="tonal" class="mb-2">
                        {{ compactText(item, 160) }}
                      </v-alert>
                      <div v-if="!store.aiInsights.debtInsights.length" class="text-caption text-medium-emphasis">No debt insights generated yet.</div>
                    </v-card-text>
                  </v-card>
                </v-col>
                <v-col cols="12" md="6">
                  <v-card rounded="lg" variant="outlined" class="mb-3">
                    <v-card-title class="text-subtitle-2">Savings Opportunities</v-card-title>
                    <v-card-text>
                      <v-alert v-for="(item, idx) in store.aiInsights.savingsOpportunities" :key="`sv-${idx}`" type="success" variant="tonal" class="mb-2">
                        {{ compactText(item, 160) }}
                      </v-alert>
                      <div v-if="!store.aiInsights.savingsOpportunities.length" class="text-caption text-medium-emphasis">No savings opportunities generated yet.</div>
                    </v-card-text>
                  </v-card>
                </v-col>
                <v-col cols="12" md="6">
                  <v-card rounded="lg" variant="outlined" class="mb-3">
                    <v-card-title class="text-subtitle-2">Risk Warnings</v-card-title>
                    <v-card-text>
                      <v-alert v-for="(item, idx) in store.aiInsights.riskWarnings" :key="`rw-${idx}`" type="error" variant="tonal" class="mb-2">
                        {{ compactText(item, 160) }}
                      </v-alert>
                      <div v-if="!store.aiInsights.riskWarnings.length" class="text-caption text-medium-emphasis">No risk warnings generated yet.</div>
                    </v-card-text>
                  </v-card>
                </v-col>
              </v-row>

              <v-card rounded="lg" variant="outlined" class="mb-3">
                <v-card-title class="text-subtitle-2">Recommended Actions</v-card-title>
                <v-card-text>
                  <v-table density="compact" v-if="recommendedActionRows.length">
                    <thead>
                      <tr>
                        <th>Priority</th>
                        <th>Action</th>
                        <th>Expected Impact</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="(row, idx) in recommendedActionRows" :key="`recommended-row-${idx}`">
                        <td>
                          <v-chip size="x-small" :color="row.priority === 'High' ? 'error' : row.priority === 'Medium' ? 'warning' : 'info'" variant="flat">
                            {{ row.priority }}
                          </v-chip>
                        </td>
                        <td>{{ compactText(row.action, 140) }}</td>
                        <td>{{ row.expectedImpact }}</td>
                      </tr>
                    </tbody>
                  </v-table>
                  <div v-else class="text-caption text-medium-emphasis">No recommended actions generated yet.</div>
                </v-card-text>
              </v-card>

              <v-card rounded="lg" variant="outlined" class="mb-3">
                <v-card-title class="text-subtitle-2">Key Alerts</v-card-title>
                <v-card-text>
                  <v-chip v-for="(item, idx) in keyAlerts" :key="`key-alert-${idx}`" size="small" color="warning" variant="tonal" class="mr-2 mb-2">
                    {{ item }}
                  </v-chip>
                  <span v-if="!keyAlerts.length" class="text-caption text-medium-emphasis">No key alerts.</span>
                </v-card-text>
              </v-card>

              <v-row>
                <v-col cols="12" md="8">
                  <v-card rounded="lg" variant="outlined" class="mb-3">
                    <v-card-title class="text-subtitle-2">Debt Payoff Strategy</v-card-title>
                    <v-card-text>
                      <div class="mb-2"><strong>Method:</strong> {{ store.aiInsights.debtPayoffStrategy.method || '-' }}</div>
                      <div class="mb-3"><strong>Reason:</strong> {{ store.aiInsights.debtPayoffStrategy.reason || '-' }}</div>
                      <v-table density="compact" v-if="store.aiInsights.debtPayoffStrategy.allocationPlan.length">
                        <thead>
                          <tr>
                            <th>Debt</th>
                            <th class="text-right">Allocation</th>
                            <th>Reason</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr v-for="(row, idx) in store.aiInsights.debtPayoffStrategy.allocationPlan" :key="`plan-${idx}`">
                            <td>{{ row.debtName }}</td>
                            <td class="text-right">{{ money(row.allocationAmount) }}</td>
                            <td>{{ row.reason || '-' }}</td>
                          </tr>
                        </tbody>
                      </v-table>
                    </v-card-text>
                  </v-card>
                </v-col>
                <v-col cols="12" md="4">
                  <v-card rounded="lg" variant="outlined" class="mb-3">
                    <v-card-title class="text-subtitle-2">Debt-Free Forecast</v-card-title>
                    <v-card-text>
                      <div class="mb-2"><strong>Estimated Debt-Free Date:</strong> {{ store.aiInsights.forecast.estimatedDebtFreeDate || '-' }}</div>
                      <div><strong>Estimated Interest Savings:</strong> {{ money(store.aiInsights.forecast.estimatedInterestSavings || 0) }}</div>
                    </v-card-text>
                  </v-card>
                </v-col>
              </v-row>
            </template>

            <div class="mt-2">
              <div class="text-caption text-medium-emphasis mb-1">Priority Order</div>
              <div class="d-flex flex-wrap ga-2 mb-3">
                <v-chip v-for="(item, idx) in (profile.priorityOrder || [])" :key="`ai-priority-${item}-${idx}`" size="small" color="primary" variant="tonal">
                  {{ idx + 1 }}. {{ item }}
                </v-chip>
                <span v-if="!(profile.priorityOrder || []).length" class="text-caption text-medium-emphasis">No custom priority set yet.</span>
              </div>
              <div class="text-caption text-medium-emphasis">Current target debt</div>
              <div class="text-subtitle-1 font-weight-bold">
                {{ store.currentTarget?.name || 'No active target' }}
                <span v-if="store.currentTarget"> • {{ money(store.currentTarget.currentBalance || 0) }}</span>
              </div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-row class="mb-4">
      <v-col cols="12" md="3">
        <v-card rounded="xl" class="fi-stat">
          <div class="fi-stat-label">Total Monthly Interest</div>
          <div class="fi-stat-value">{{ money((store.debtRows || []).reduce((sum, row) => sum + Number(row.interest || 0), 0)) }}</div>
        </v-card>
      </v-col>
      <v-col cols="12" md="3">
        <v-card rounded="xl" class="fi-stat">
          <div class="fi-stat-label">Total Monthly Obligations</div>
          <div class="fi-stat-value">{{ money((store.debtRows || []).reduce((sum, row) => sum + Number(row.monthlyPayment || 0), 0)) }}</div>
        </v-card>
      </v-col>
      <v-col cols="12" md="3">
        <v-card rounded="xl" class="fi-stat">
          <div class="fi-stat-label">Total Paid This Month</div>
          <div class="fi-stat-value">{{ money(paymentAnalytics.totalPaidThisMonth || 0) }}</div>
        </v-card>
      </v-col>
      <v-col cols="12" md="3">
        <v-card rounded="xl" class="fi-stat">
          <div class="fi-stat-label">Principal Reduced</div>
          <div class="fi-stat-value">{{ money(paymentAnalytics.totalPrincipalReduced || 0) }}</div>
          <div class="fi-health">Extra Payments: {{ paymentAnalytics.extraPaymentsMade || 0 }}</div>
        </v-card>
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12">
        <div class="fi-chart-group-title">Debt Overview</div>
      </v-col>
      <v-col cols="12" md="6">
        <v-card rounded="xl" class="mb-4">
          <v-card-title>Debt Burn Down</v-card-title>
          <v-card-text>
            <apexchart type="line" :height="chartHeight" :options="burnDownOptions" :series="burnDownSeries" />
            <v-table density="compact" class="mt-3">
              <thead>
                <tr>
                  <th>Month</th>
                  <th class="text-right">Opening Debt</th>
                  <th class="text-right">Principal Paid</th>
                  <th class="text-right">Closing Debt</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in burnDownTableRows" :key="row.key">
                  <td>{{ row.monthLabel }}</td>
                  <td class="text-right">{{ money(row.openingDebt) }}</td>
                  <td class="text-right">{{ money(row.principalPaid) }}</td>
                  <td class="text-right">{{ money(row.closingDebt) }}</td>
                </tr>
              </tbody>
            </v-table>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" md="6">
        <v-card rounded="xl" class="mb-4">
          <v-card-title>Monthly Cash Flow</v-card-title>
          <v-card-text>
            <apexchart type="line" :height="chartHeight" :options="cashFlowOptions" :series="cashFlowSeries" />
            <v-table density="compact" class="mt-3">
              <thead>
                <tr>
                  <th>Month</th>
                  <th class="text-right">Income</th>
                  <th class="text-right">Expenses</th>
                  <th class="text-right">Debt Payments</th>
                  <th class="text-right">Surplus</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in cashFlowTableRows" :key="row.key">
                  <td>{{ row.monthLabel }}</td>
                  <td class="text-right">{{ money(row.income) }}</td>
                  <td class="text-right">{{ money(row.expenses) }}</td>
                  <td class="text-right">{{ money(row.debtPayments) }}</td>
                  <td class="text-right" :class="row.surplus >= 0 ? 'text-success' : 'text-error'">{{ money(row.surplus) }}</td>
                </tr>
              </tbody>
            </v-table>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12">
        <div class="fi-chart-group-title">Financial Overview</div>
      </v-col>
      <v-col cols="12" md="6">
        <v-card rounded="xl" class="mb-4">
          <v-card-title>Debt Composition</v-card-title>
          <v-card-text>
            <apexchart type="donut" :height="chartHeight" :options="compositionOptions" :series="compositionSeries" />
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" md="6">
        <v-card rounded="xl" class="mb-4">
          <v-card-title>Expense Breakdown</v-card-title>
          <v-card-text>
            <apexchart type="pie" :height="chartHeight" :options="expenseOptions" :series="expenseSeries" />
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" md="6">
        <v-card rounded="xl" class="mb-4">
          <v-card-title>Debt Priority Funnel</v-card-title>
          <v-card-text>
            <apexchart type="bar" :height="chartHeight" :options="priorityOptions" :series="prioritySeries" />
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" md="6">
        <v-card rounded="xl" class="mb-4">
          <v-card-title>Interest Leakage</v-card-title>
          <v-card-text>
            <apexchart type="bar" :height="chartHeight" :options="interestOptions" :series="interestSeries" />
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" md="6">
        <v-card rounded="xl" class="mb-4">
          <v-card-title>Debt by Category</v-card-title>
          <v-card-text>
            <apexchart type="donut" :height="chartHeight" :options="debtByCategoryChartOptions" :series="debtByCategoryChartSeries" />
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" md="6">
        <v-card rounded="xl" class="mb-4">
          <v-card-title>Historical Surplus Trend</v-card-title>
          <v-card-text>
            <apexchart type="line" :height="chartHeight" :options="surplusTrendOptions" :series="surplusTrendSeries" />
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12">
        <div class="fi-chart-group-title">Progress Tracking</div>
      </v-col>
      <v-col cols="12">
        <v-card rounded="xl" class="mb-4">
          <v-card-title>Payment Analytics</v-card-title>
          <v-card-text>
            <apexchart type="bar" :height="chartHeight" :options="paymentTrendOptions" :series="paymentTrendSeries" />
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-card class="mb-4" rounded="xl">
      <v-card-title>Yearly Analysis ({{ selectedYearNumber }})</v-card-title>
      <v-card-text>
        <v-row>
          <v-col cols="12" md="6">
            <h4 class="fi-block-title mb-2">Yearly Financial Summary</h4>
            <div class="fi-table-wrap">
              <v-table density="comfortable" class="fi-table">
                <tbody>
                  <tr v-for="row in yearlyFinancialSummaryRows" :key="row.label">
                    <td>{{ row.label }}</td>
                    <td class="text-right font-weight-bold">{{ money(row.value) }}</td>
                  </tr>
                </tbody>
              </v-table>
            </div>
          </v-col>
          <v-col cols="12" md="6">
            <h4 class="fi-block-title mb-2">Yearly Debt Summary</h4>
            <div class="fi-table-wrap">
              <v-table density="comfortable" class="fi-table">
                <tbody>
                  <tr v-for="row in yearlyDebtSummaryRows" :key="row.label">
                    <td>{{ row.label }}</td>
                    <td class="text-right font-weight-bold">{{ money(row.value) }}</td>
                  </tr>
                </tbody>
              </v-table>
            </div>
          </v-col>
          <v-col cols="12" md="6">
            <v-card variant="tonal" rounded="lg" class="mb-2">
              <v-card-title class="text-subtitle-2">Yearly Debt Reduction Trend</v-card-title>
              <v-card-text>
                <apexchart type="line" :height="compactChartHeight" :options="yearlyDebtReductionOptions" :series="yearlyDebtReductionSeries" />
              </v-card-text>
            </v-card>
          </v-col>
          <v-col cols="12" md="6">
            <v-card variant="tonal" rounded="lg" class="mb-2">
              <v-card-title class="text-subtitle-2">Yearly Income vs Expenses</v-card-title>
              <v-card-text>
                <apexchart type="bar" :height="compactChartHeight" :options="yearlyIncomeExpenseOptions" :series="yearlyIncomeExpenseSeries" />
              </v-card-text>
            </v-card>
          </v-col>
          <v-col cols="12" md="6">
            <v-card variant="tonal" rounded="lg" class="mb-2">
              <v-card-title class="text-subtitle-2">Yearly Surplus Trend</v-card-title>
              <v-card-text>
                <apexchart type="line" :height="compactChartHeight" :options="yearlySurplusOptions" :series="yearlySurplusSeries" />
              </v-card-text>
            </v-card>
          </v-col>
          <v-col cols="12" md="6">
            <v-card variant="tonal" rounded="lg" class="mb-2">
              <v-card-title class="text-subtitle-2">Yearly Payment Distribution</v-card-title>
              <v-card-text>
                <apexchart type="donut" :height="compactChartHeight" :options="yearlyDistributionOptions" :series="yearlyDistributionSeries" />
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <v-dialog v-model="debtDialog" max-width="760">
      <v-card>
        <v-card-title>{{ editingDebtId ? 'Edit Debt' : 'Add Debt' }}</v-card-title>
        <v-card-text>
          <v-row>
            <v-col cols="12" md="6">
              <v-text-field v-model="debtForm.name" label="Debt Name" density="compact" variant="outlined" />
            </v-col>
            <v-col cols="12" md="6">
              <v-select
                v-model="debtForm.debtType"
                :items="debtTypes"
                item-title="label"
                item-value="value"
                label="Debt Type"
                density="compact"
                variant="outlined"
              />
            </v-col>
          </v-row>
          <v-row>
            <v-col cols="12" md="6"><IndianCurrencyField v-model="debtForm.originalAmount" label="Original Amount" /></v-col>
            <v-col cols="12" md="6"><IndianCurrencyField v-model="debtForm.currentBalance" label="Current Balance" /></v-col>
            <v-col cols="12" md="6" v-if="debtForm.debtType === 'vehicle_loan'"><IndianCurrencyField v-model="debtForm.emi" label="Monthly Payment (EMI)" /></v-col>
            <v-col cols="12" md="6" v-if="debtForm.debtType === 'vehicle_loan'"><v-text-field v-model.number="debtForm.interestRate" label="Interest Rate %" type="number" density="compact" variant="outlined" /></v-col>
            <v-col cols="12" md="6" v-if="debtForm.debtType === 'business_loan' || debtForm.debtType === 'friends_family_loan' || debtForm.debtType === 'jewelry_loan'"><v-text-field v-model.number="debtForm.interestRate" label="Interest Rate %" type="number" density="compact" variant="outlined" /></v-col>
            <v-col cols="12" md="6" v-if="debtForm.debtType === 'business_loan' || debtForm.debtType === 'friends_family_loan' || debtForm.debtType === 'jewelry_loan'"><IndianCurrencyField v-model="debtForm.currentMonthlyInterest" label="Current Monthly Interest (Auto Calculated)" disabled /></v-col>
            <v-col cols="12" md="6" v-if="debtForm.debtType === 'chit_fund'"><IndianCurrencyField v-model="debtForm.chitTotalValue" label="Total Chit Value" /></v-col>
            <v-col cols="12" md="6" v-if="debtForm.debtType === 'chit_fund'"><IndianCurrencyField v-model="debtForm.monthlyInstallment" label="Monthly Contribution" /></v-col>
            <v-col cols="12" md="6" v-if="debtForm.debtType === 'chit_fund'"><v-text-field v-model.number="debtForm.totalInstallments" label="Total Installments" type="number" density="compact" variant="outlined" /></v-col>
            <v-col cols="12" md="6" v-if="debtForm.debtType === 'chit_fund'"><v-text-field v-model.number="debtForm.remainingMonths" label="Remaining Installments" type="number" density="compact" variant="outlined" /></v-col>
          </v-row>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="closeDebtDialog">Cancel</v-btn>
          <v-btn color="primary" :loading="store.loading" @click="saveDebt">Save</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="paymentDialog" max-width="620">
      <v-card>
        <v-card-title>{{ editingPaymentId ? 'Edit Payment' : 'Add Payment' }}</v-card-title>
        <v-card-text>
          <v-select
            v-model="paymentForm.debt"
            :items="paymentDialogDebtOptions"
            item-title="name"
            item-value="_id"
            label="Debt Name"
            density="compact"
            variant="outlined"
          />
          <v-alert v-if="selectedPaymentDebt" type="info" variant="tonal" class="mb-3">
            <div><strong>{{ selectedPaymentDebt.name }}</strong> ({{ debtTypeLabel(selectedPaymentDebt.debtType) }})</div>
            <div>Current Outstanding Principal: {{ money(selectedPaymentDebt.currentBalance || 0) }}</div>
            <div>Current Monthly Interest: {{ money(selectedPaymentMonthlyInterest || 0) }}</div>
            <div>Next Expected Interest: {{ money(selectedPaymentNextInterest || 0) }}</div>
          </v-alert>
          <v-text-field v-model="paymentForm.date" label="Payment Date" type="date" density="compact" variant="outlined" />
          <v-select
            v-model="paymentForm.paymentType"
            :items="paymentTypeOptions"
            item-title="title"
            item-value="value"
            label="Payment Type"
            density="compact"
            variant="outlined"
          />
          <IndianCurrencyField v-model="paymentForm.interestPaid" label="Interest Paid" :disabled="!isInterestInputEnabled" />
          <IndianCurrencyField v-model="paymentForm.principalPaid" label="Principal Paid" :disabled="!isPrincipalInputEnabled" />
          <v-checkbox v-model="paymentForm.isExtra" label="Add Extra Principal" density="compact" hide-details class="mb-3" />
          <IndianCurrencyField v-if="paymentForm.isExtra" v-model="paymentForm.extraPrincipalAmount" label="Extra Principal Payment" />
          <IndianCurrencyField v-model="paymentForm.additionalCharges" label="Additional Charges (Penalty / Processing / Other)" />
          <v-text-field :model-value="money(totalPaymentAmount)" label="Total Payment (Auto)" density="compact" variant="outlined" readonly />
          <v-alert v-if="paymentExceedsSurplusWarning" type="warning" variant="tonal" density="compact" class="mb-2">
            <strong>Overspending alert:</strong> This payment exceeds your available surplus for the month.
            New Available Surplus after save: <strong>{{ money(surplusAfterPayment) }}</strong>
          </v-alert>
          <v-textarea v-model="paymentForm.notes" label="Notes" density="compact" variant="outlined" rows="2" auto-grow />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="paymentDialog = false">Cancel</v-btn>
          <v-btn color="primary" :loading="store.loading" @click="savePayment">Save</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import VueApexCharts from 'vue3-apexcharts'
import { useFinancialIntelligenceStore } from '@/stores/financialIntelligence'
import api from '@/plugins/axios'
import IndianCurrencyField from '@/components/common/IndianCurrencyField.vue'
import { useConfirm } from '@/composables/useConfirm'
import { formatIndianCurrency, formatIndianNumber } from '@/utils/currency'

const apexchart = VueApexCharts
const store = useFinancialIntelligenceStore()
const { confirm } = useConfirm()
const FI_SCROLL_KEY = 'fi-scroll-position-v1'

const debtDialog = ref(false)
const paymentDialog = ref(false)
const editingDebtId = ref(null)
const editingPaymentId = ref(null)
const editingTransactionId = ref(null)
const selectedMonth = ref(new Date().toISOString().slice(0, 7))
const monthlyEntryMode = ref('add')
const isHydratingPriority = ref(false)
let prioritySyncTimer = null

const profile = reactive({
  priorityOrder: [],
})

const monthlyForm = reactive({
  monthlyIncome: { powerloomIncome: 0, ashokContribution: 0, rentalIncome: 0 },
  weeklyExpenses: { workerWages: 0, familyExpenses: 0 },
  monthlyExpenses: { workerWages: 0, familyExpenses: 0, otherMonthlyExpenses: 0 },
})

const isMobile = ref(typeof window !== 'undefined' ? window.innerWidth < 768 : false)
const chartHeight = computed(() => (isMobile.value ? 220 : 280))
const compactChartHeight = computed(() => (isMobile.value ? 210 : 260))

const debtTypes = [
  { label: 'Vehicle Loan', value: 'vehicle_loan' },
  { label: 'Business Loan', value: 'business_loan' },
  { label: 'Friends and Relatives Loan', value: 'friends_family_loan' },
  { label: 'Jewelry Loan', value: 'jewelry_loan' },
  { label: 'Chit Fund', value: 'chit_fund' },
]

const debtForm = reactive({
  name: '',
  debtType: 'business_loan',
  originalAmount: 0,
  currentBalance: 0,
  monthlyAmount: 0,
  emi: 0,
  interestComponent: 0,
  principalComponent: 0,
  interestRate: 0,
  currentMonthlyInterest: 0,
  monthlyInterest: 0,
  chitTotalValue: 0,
  totalInstallments: 0,
  monthlyInstallment: 0,
  remainingMonths: 0,
})

const paymentForm = reactive({
  debt: null,
  amountPaid: 0,
  paymentType: 'interest_only',
  interestPaid: 0,
  principalPaid: 0,
  extraPrincipalAmount: 0,
  additionalCharges: 0,
  date: new Date().toISOString().slice(0, 10),
  notes: '',
  isExtra: false,
})

const monthOptions = [
  { title: 'January', value: 1 },
  { title: 'February', value: 2 },
  { title: 'March', value: 3 },
  { title: 'April', value: 4 },
  { title: 'May', value: 5 },
  { title: 'June', value: 6 },
  { title: 'July', value: 7 },
  { title: 'August', value: 8 },
  { title: 'September', value: 9 },
  { title: 'October', value: 10 },
  { title: 'November', value: 11 },
  { title: 'December', value: 12 },
]

const yearOptions = computed(() => {
  const currentYear = new Date().getFullYear()
  return Array.from({ length: 7 }, (_, index) => currentYear - 3 + index)
})

const selectedMonthNumber = computed({
  get: () => Number(String(selectedMonth.value).split('-')[1] || 1),
  set: (month) => {
    const year = Number(String(selectedMonth.value).split('-')[0] || new Date().getFullYear())
    selectedMonth.value = `${year}-${String(month).padStart(2, '0')}`
  },
})

const selectedYearNumber = computed({
  get: () => Number(String(selectedMonth.value).split('-')[0] || new Date().getFullYear()),
  set: (year) => {
    const month = Number(String(selectedMonth.value).split('-')[1] || (new Date().getMonth() + 1))
    selectedMonth.value = `${year}-${String(month).padStart(2, '0')}`
  },
})

const summary = computed(() => store.summary)
const paymentAnalytics = computed(() => store.dashboard?.paymentAnalytics || {})
const prioritizedDebtRows = computed(() => {
  const rows = Array.isArray(store.debtRows) ? [...store.debtRows] : []
  const order = Array.isArray(profile.priorityOrder)
    ? profile.priorityOrder.map(v => String(v || '').trim().toLowerCase()).filter(Boolean)
    : []
  if (!order.length) return rows
  const rank = new Map(order.map((name, index) => [name, index]))
  return rows.sort((a, b) => {
    const aRank = rank.has(String(a.debtName || '').toLowerCase()) ? rank.get(String(a.debtName || '').toLowerCase()) : Number.MAX_SAFE_INTEGER
    const bRank = rank.has(String(b.debtName || '').toLowerCase()) ? rank.get(String(b.debtName || '').toLowerCase()) : Number.MAX_SAFE_INTEGER
    if (aRank !== bRank) return aRank - bRank
    return Number(a.priority || 0) - Number(b.priority || 0)
  })
})
const isInterestInputEnabled = computed(() => paymentForm.paymentType === 'interest_only' || paymentForm.paymentType === 'custom_split')
const isPrincipalInputEnabled = computed(() => paymentForm.paymentType === 'principal_only' || paymentForm.paymentType === 'custom_split')
const totalPaymentAmount = computed(() => {
  const interest = Number(paymentForm.interestPaid || 0)
  const principal = Number(paymentForm.principalPaid || 0)
  const extraPrincipal = paymentForm.isExtra ? Number(paymentForm.extraPrincipalAmount || 0) : 0
  const additionalCharges = Number(paymentForm.additionalCharges || 0)
  return Number((interest + principal + extraPrincipal + additionalCharges).toFixed(2))
})
const yearlyAnalysis = computed(() => store.reports?.yearlyAnalysis || null)
const yearlyFinancialSummaryRows = computed(() => {
  const summaryRow = yearlyAnalysis.value?.financialSummary || {}
  return [
    { label: 'Total Income', value: Number(summaryRow.totalIncome || 0) },
    { label: 'Total Expenses', value: Number(summaryRow.totalExpenses || 0) },
    { label: 'Total Debt Payments', value: Number(summaryRow.totalDebtPayments || 0) },
    { label: 'Total Interest Paid', value: Number(summaryRow.totalInterestPaid || 0) },
    { label: 'Total Principal Reduced', value: Number(summaryRow.totalPrincipalReduced || 0) },
    { label: 'Total Surplus', value: Number(summaryRow.totalSurplus || 0) },
  ]
})
const yearlyDebtSummaryRows = computed(() => {
  const debtSummary = yearlyAnalysis.value?.debtSummary || {}
  return [
    { label: 'Opening Debt Balance', value: Number(debtSummary.openingDebtBalance || 0) },
    { label: 'Closing Debt Balance', value: Number(debtSummary.closingDebtBalance || 0) },
    { label: 'Total Debt Reduction', value: Number(debtSummary.totalDebtReduction || 0) },
  ]
})
const yearlyDebtReductionSeries = computed(() => [{
  name: 'Debt Reduction',
  data: (yearlyAnalysis.value?.charts?.debtReductionTrend || []).map(row => Number(row.value || 0)),
}])
const yearlyDebtReductionOptions = computed(() => ({
  chart: { toolbar: { show: false } },
  xaxis: { categories: (yearlyAnalysis.value?.charts?.debtReductionTrend || []).map(row => row.month) },
  yaxis: { labels: { formatter: value => formatIndianNumber(value) } },
  tooltip: { y: { formatter: value => money(value) } },
  dataLabels: { enabled: false },
}))
const yearlyIncomeExpenseSeries = computed(() => [
  {
    name: 'Income',
    data: (yearlyAnalysis.value?.charts?.incomeVsExpenses || []).map(row => Number(row.income || 0)),
  },
  {
    name: 'Expenses',
    data: (yearlyAnalysis.value?.charts?.incomeVsExpenses || []).map(row => Number(row.expenses || 0)),
  },
])
const yearlyIncomeExpenseOptions = computed(() => ({
  chart: { toolbar: { show: false } },
  xaxis: { categories: (yearlyAnalysis.value?.charts?.incomeVsExpenses || []).map(row => row.month) },
  yaxis: { labels: { formatter: value => formatIndianNumber(value) } },
  tooltip: { y: { formatter: value => money(value) } },
  dataLabels: { enabled: false },
}))
const yearlySurplusSeries = computed(() => [{
  name: 'Surplus',
  data: (yearlyAnalysis.value?.charts?.surplusTrend || []).map(row => Number(row.value || 0)),
}])
const yearlySurplusOptions = computed(() => ({
  chart: { toolbar: { show: false } },
  xaxis: { categories: (yearlyAnalysis.value?.charts?.surplusTrend || []).map(row => row.month) },
  yaxis: { labels: { formatter: value => formatIndianNumber(value) } },
  tooltip: { y: { formatter: value => money(value) } },
  dataLabels: { enabled: false },
}))
const yearlyDistributionSeries = computed(() => (yearlyAnalysis.value?.charts?.paymentDistribution || []).map(row => Number(row.value || 0)))
const yearlyDistributionOptions = computed(() => ({
  labels: (yearlyAnalysis.value?.charts?.paymentDistribution || []).map(row => row.name),
  legend: { position: 'bottom' },
}))
const debtCategorySeries = computed(() => {
  const totals = {
    vehicle_loan: 0,
    business_loan: 0,
    friends_family_loan: 0,
    jewelry_loan: 0,
    chit_fund: 0,
  }
  for (const debt of store.debtRows || []) {
    const key = normalizeDebtType(debt.debtType)
    totals[key] = Number(totals[key] || 0) + Number(debt.currentBalance || 0)
  }
  return totals
})
const surplusTrendSeries = computed(() => [{
  name: 'Surplus',
  data: monthlyHistory.value.map(row => Number(row?.totals?.totalBalance || 0)),
}])
const surplusTrendOptions = computed(() => ({
  chart: { toolbar: { show: false } },
  xaxis: { categories: monthlyHistory.value.map(row => monthLabel(row.year, row.month)) },
  stroke: { curve: 'smooth', width: 3 },
  dataLabels: { enabled: false },
  yaxis: { labels: { formatter: value => formatIndianNumber(value) } },
  tooltip: { y: { formatter: value => money(value) } },
}))
const paymentTrendSeries = computed(() => [{
  name: 'Principal Reduced',
  data: (store.dashboard?.monthlyActions || []).map(item => Number(item.principalPaid || 0)),
}, {
  name: 'Interest Paid',
  data: (store.dashboard?.monthlyActions || []).map(item => Number(item.interestPaid || 0)),
}])
const paymentTrendOptions = computed(() => ({
  chart: { toolbar: { show: false } },
  xaxis: { categories: (store.dashboard?.monthlyActions || []).map(item => item.date ? new Date(item.date).toLocaleDateString('en-IN') : '-') },
  dataLabels: { enabled: false },
  yaxis: { labels: { formatter: value => formatIndianNumber(value) } },
  tooltip: { y: { formatter: value => money(value) } },
}))
const debtByCategoryChartSeries = computed(() => Object.values(debtCategorySeries.value))
const debtByCategoryChartOptions = computed(() => ({
  labels: ['Vehicle Loan', 'Business Loan', 'Friends & Relatives', 'Jewelry Loan', 'Chit Fund'],
  legend: { position: 'bottom' },
}))

const debtFreeEstimateLabel = computed(() => {
  const date = store.dashboard?.forecast?.debtFreeDate
  if (date) return dateLabel(date)
  return store.dashboard?.forecast?.debtFreeReason || 'Insufficient payment data to calculate.'
})

const financialHealthSummaryRows = computed(() => {
  const topDebt = prioritizedDebtRows.value[0] || null
  return [
    { label: 'Total Debt', value: money(summary.value?.totalDebt || 0) },
    { label: 'Available Surplus', value: money(summary.value?.remainingCash || 0) },
    { label: 'Monthly Interest Obligation', value: money((store.debtRows || []).reduce((sum, row) => sum + Number(row.interest || 0), 0)) },
    { label: 'Debt-Free Estimate', value: debtFreeEstimateLabel.value },
    { label: 'Highest Priority Debt', value: topDebt ? `${topDebt.debtName} (${money(topDebt.currentBalance || 0)})` : 'No active debt' },
  ]
})

const keyAlerts = computed(() => {
  const alerts = []
  if (monthComparison.value.balanceDelta < 0) alerts.push('Surplus decreased compared to last month.')
  if ((store.debtRows || []).some(row => Number(row.interest || 0) > 0)) alerts.push('High-interest debt requires attention.')
  if ((store.debtRows || []).some(row => normalizeDebtType(row.debtType) === 'chit_fund' && Number(row.remainingMonths || 0) > 0)) {
    alerts.push('Upcoming chit installment due.')
  }
  return alerts
})

const recommendedActionRows = computed(() => {
  const items = (store.aiInsights?.recommendedActions || []).slice(0, 6)
  const priorities = ['High', 'Medium', 'Low', 'Low', 'Low', 'Low']
  return items.map((item, idx) => ({
    priority: priorities[idx] || 'Low',
    action: String(item || '').trim(),
    expectedImpact: idx === 0 ? 'Highest impact on debt reduction' : idx === 1 ? 'Improves debt-free timeline' : 'Supports stable cash flow',
  }))
})

function compactText(value, max = 160) {
  const text = String(value || '').replace(/\s+/g, ' ').trim()
  if (text.length <= max) return text
  return `${text.slice(0, max - 1)}...`
}

const burnDownTableRows = computed(() => {
  const rows = store.charts?.burnDown || []
  return rows.slice(0, 12).map((row, idx) => {
    const openingDebt = Number(row.openingDebt || (Number(row.totalDebt || 0) + Number(row.reduction || 0)))
    const principalPaid = Number(row.principalPaid || row.reduction || 0)
    const closingDebt = Number(row.closingDebt || row.totalDebt || 0)
    return {
      key: row.key || `${row.year}-${row.month}-${idx}`,
      monthLabel: row.label || monthLabel(row.year, row.month),
      openingDebt,
      principalPaid,
      closingDebt,
    }
  })
})

const cashFlowTableRows = computed(() => {
  const rows = store.charts?.cashFlow || []
  return rows.slice(0, 12).map((row, idx) => ({
    key: row.key || `${row.year}-${row.month}-${idx}`,
    monthLabel: row.label || monthLabel(row.year, row.month),
    income: Number(row.income || 0),
    expenses: Number(row.expenses || 0),
    debtPayments: Number(row.debtPayments || 0),
    surplus: Number(row.surplus || 0),
  }))
})

async function askDeleteConfirm(entityLabel = 'this record') {
  return confirm({
    title: 'Confirm Delete',
    message: `Are you sure you want to delete ${entityLabel}? This action cannot be undone.`,
    confirmText: 'Delete',
    confirmColor: 'error',
  })
}

const monthlyFormTotals = computed(() => {
  const totalIncome = Number(monthlyForm.monthlyIncome.powerloomIncome || 0)
    + Number(monthlyForm.monthlyIncome.ashokContribution || 0)
    + Number(monthlyForm.monthlyIncome.rentalIncome || 0)
  const totalWorkerWages = Number(monthlyForm.monthlyExpenses.workerWages || 0)
  const totalFamilyExpenses = Number(monthlyForm.monthlyExpenses.familyExpenses || 0)
  const totalOtherMonthlyExpenses = Number(monthlyForm.monthlyExpenses.otherMonthlyExpenses || 0)
  const totalMonthlyExpenses = totalWorkerWages + totalFamilyExpenses + totalOtherMonthlyExpenses
  const totalBalance = totalIncome - totalMonthlyExpenses

  return {
    totalIncome,
    totalWorkerWages,
    totalFamilyExpenses,
    totalOtherMonthlyExpenses,
    totalWeeklyExpenses: 0,
    totalExpenses: totalMonthlyExpenses,
    totalMonthlyExpenses,
    totalBalance,
  }
})

const monthlyFormHasValues = computed(() => {
  const t = monthlyFormTotals.value
  return Number(t.totalIncome || 0) > 0 || Number(t.totalExpenses || 0) > 0
})

const monthlyTotals = computed(() => {
  // While typing or editing, show live form totals.
  if (monthlyEntryMode.value === 'edit' || monthlyFormHasValues.value) {
    return monthlyFormTotals.value
  }
  // When form is reset/empty, show saved month totals.
  return store.monthlyEntry?.totals || monthlyFormTotals.value
})
const monthlyHistory = computed(() => {
  const rows = Array.isArray(store.monthlyEntries) ? [...store.monthlyEntries] : []
  return rows.sort((a, b) => {
    const yearDiff = Number(b.year || 0) - Number(a.year || 0)
    if (yearDiff !== 0) return yearDiff
    return Number(b.month || 0) - Number(a.month || 0)
  })
})
const selectedMonthEntry = computed(() => {
  const { month, year } = getMonthYear()
  return (store.monthlyEntries || []).find(row => Number(row.month) === Number(month) && Number(row.year) === Number(year)) || null
})
const monthlyTrackingRows = computed(() => {
  const entry = selectedMonthEntry.value || store.monthlyEntry
  const month = Number(entry?.month || getMonthYear().month)
  const year = Number(entry?.year || getMonthYear().year)
  const txs = Array.isArray(entry?.transactions) ? entry.transactions : []

  return txs.map((tx) => {
    const txIncome = Number(tx.monthlyIncome?.powerloomIncome || 0)
      + Number(tx.monthlyIncome?.ashokContribution || 0)
      + Number(tx.monthlyIncome?.rentalIncome || 0)
    const txExpenses = Number(tx.monthlyExpenses?.workerWages || 0)
      + Number(tx.monthlyExpenses?.familyExpenses || 0)
      + Number(tx.monthlyExpenses?.otherMonthlyExpenses || 0)
    const txBalance = txIncome - txExpenses
    return {
      month,
      year,
      _tx: tx,
      totals: {
        totalIncome: txIncome,
        totalExpenses: txExpenses,
        totalMonthlyExpenses: txExpenses,
        totalBalance: txBalance,
      },
      availableSurplus: txBalance,
    }
  })
})

// Transactions for the currently selected month (from the monthly entry stored in store)
const currentMonthTransactions = computed(() => {
  const entry = selectedMonthEntry.value || store.monthlyEntry
  return Array.isArray(entry?.transactions) ? entry.transactions : []
})

function txNetBalance(tx) {
  const income = Number(tx.monthlyIncome?.powerloomIncome || 0)
    + Number(tx.monthlyIncome?.ashokContribution || 0)
    + Number(tx.monthlyIncome?.rentalIncome || 0)
  const expenses = Number(tx.monthlyExpenses?.workerWages || 0)
    + Number(tx.monthlyExpenses?.familyExpenses || 0)
    + Number(tx.monthlyExpenses?.otherMonthlyExpenses || 0)
  return income - expenses
}
const previousMonthEntry = computed(() => {
  const { month, year } = getMonthYear()
  const prev = month > 1 ? { month: month - 1, year } : { month: 12, year: year - 1 }
  return (store.monthlyEntries || []).find(row => Number(row.month) === prev.month && Number(row.year) === prev.year) || null
})
const monthComparison = computed(() => {
  const hasSavedCurrent = !!selectedMonthEntry.value
  const hasPrevious = !!previousMonthEntry.value
  if (!hasSavedCurrent || !hasPrevious) {
    return {
      incomeDelta: 0,
      expenseDelta: 0,
      balanceDelta: 0,
    }
  }

  const current = selectedMonthEntry.value?.totals || { totalIncome: 0, totalExpenses: 0, totalMonthlyExpenses: 0, totalBalance: 0 }
  const previous = previousMonthEntry.value?.totals || { totalIncome: 0, totalExpenses: 0, totalMonthlyExpenses: 0, totalBalance: 0 }
  const currentBalance = monthlyRowBalance(selectedMonthEntry.value)
  const previousBalance = monthlyRowBalance(previousMonthEntry.value)
  return {
    incomeDelta: Number((current.totalIncome - previous.totalIncome).toFixed(2)),
    expenseDelta: Number(((current.totalExpenses ?? current.totalMonthlyExpenses) - (previous.totalExpenses ?? previous.totalMonthlyExpenses)).toFixed(2)),
    balanceDelta: Number((currentBalance - previousBalance).toFixed(2)),
  }
})
const activeDebts = computed(() => {
  return (store.debts || []).filter((debt) => {
    if (String(debt.status || '').toLowerCase() === 'closed') return false
    const type = normalizeDebtType(debt.debtType)
    if (type === 'chit_fund') return Number(debt.remainingMonths || 0) > 0
    return Number(debt.currentBalance || 0) > 0
  })
})

const monthlyActionTotals = computed(() => {
  const actions = store.dashboard?.monthlyActions || []
  const totalPrincipalPaid = actions.reduce((s, a) => s + Number(a.principalPaid || 0), 0)
  const totalExtraPayment = actions.reduce((s, a) => s + Number(a.extraPaymentAmount || 0), 0)
  return {
    amountPaid: actions.reduce((s, a) => s + Number(a.amountPaid || 0), 0),
    interestPaid: actions.reduce((s, a) => s + Number(a.interestPaid || 0), 0),
    principalPaid: totalPrincipalPaid,
    basePrincipalPaid: Math.max(0, totalPrincipalPaid - totalExtraPayment),
    extraPaymentAmount: totalExtraPayment,
    additionalCharges: actions.reduce((s, a) => s + Number(a.additionalCharges || 0), 0),
    remainingBalanceAfterPayment: actions.reduce((s, a) => s + Number(a.remainingBalanceAfterPayment || 0), 0),
  }
})

const debtCenterTotals = computed(() => {
  const rows = prioritizedDebtRows.value
  return {
    totalBalance: rows.reduce((s, r) => s + Number(r.currentBalance || 0), 0),
    totalMonthlyPayment: rows.reduce((s, r) => s + Number(r.monthlyPayment || 0), 0),
    totalMonthlyInterest: rows.reduce((s, r) => s + Number(r.interest || 0), 0),
  }
})

// Real-time available surplus: always computed from live income/expense totals minus actual payments
const currentAvailableSurplus = computed(() => {
  const balance = Number(monthlyTotals.value?.totalBalance ?? 0)
  const payments = Number(monthlyActionTotals.value?.amountPaid ?? 0)
  return balance - payments
})

const currentMonthAvailableSurplus = computed(() => currentAvailableSurplus.value)

const surplusAfterPayment = computed(() => {
  if (!editingPaymentId.value) {
    return currentMonthAvailableSurplus.value - Number(totalPaymentAmount.value || 0)
  }
  return currentMonthAvailableSurplus.value
})

const paymentExceedsSurplusWarning = computed(() => {
  if (editingPaymentId.value) return false
  const surplus = currentMonthAvailableSurplus.value
  const amount = Number(totalPaymentAmount.value || 0)
  return amount > 0 && amount > surplus
})
const paymentDialogDebtOptions = computed(() => editingPaymentId.value ? (store.debts || []) : activeDebts.value)
const selectedPaymentDebt = computed(() => {
  return paymentDialogDebtOptions.value.find(debt => debt._id === paymentForm.debt) || null
})
const selectedPaymentMonthlyInterest = computed(() => {
  const debt = selectedPaymentDebt.value
  if (!debt) return 0
  const balance = Number(debt.currentBalance || 0)
  const rate = Number(debt.interestRate || 0)
  if (rate > 0) return (balance * rate) / 1200
  return Number(debt.currentMonthlyInterest || debt.monthlyInterest || debt.interestComponent || 0)
})
const selectedPaymentNextInterest = computed(() => {
  const debt = selectedPaymentDebt.value
  if (!debt) return 0
  const principalReduction = Number(paymentForm.principalPaid || 0) + Number(paymentForm.extraPrincipalAmount || 0)
  const projectedBalance = Math.max(0, Number(debt.currentBalance || 0) - principalReduction)
  const rate = Number(debt.interestRate || 0)
  if (rate > 0) return (projectedBalance * rate) / 1200
  const currentBalance = Number(debt.currentBalance || 0)
  const monthlyInterest = Number(selectedPaymentMonthlyInterest.value || 0)
  if (currentBalance <= 0 || monthlyInterest <= 0) return 0
  const impliedRate = monthlyInterest / currentBalance
  return projectedBalance * impliedRate
})

function getMonthYear() {
  const [year, month] = String(selectedMonth.value || '').split('-').map(Number)
  return {
    month: Number.isFinite(month) ? month : (new Date().getMonth() + 1),
    year: Number.isFinite(year) ? year : new Date().getFullYear(),
  }
}
function normalizeDebtType(value) {
  const normalized = String(value || '').trim().toLowerCase()
  if (normalized === 'auto_loan') return 'vehicle_loan'
  if (normalized === 'od_account') return 'business_loan'
  if (normalized === 'rani_loan') return 'friends_family_loan'
  if (normalized === 'gold_loan' || normalized === 'jewel_loan') return 'jewelry_loan'
  if (normalized === 'chit') return 'chit_fund'
  return normalized
}

function money(value) {
  return formatIndianCurrency(value)
}

function dateLabel(value) {
  if (!value) return '-'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '-'
  return d.toLocaleDateString('en-IN', { year: 'numeric', month: 'short' })
}

function debtTypeLabel(value) {
  if (value === 'current_bill') return 'Current Bill'
  const normalized = normalizeDebtType(value)
  if (normalized === 'current_bill') return 'Current Bill'
  return debtTypes.find(t => t.value === normalized)?.label || normalized
}

function debtName(id) {
  return (store.debts || []).find(d => d._id === id)?.name || 'Debt'
}

function monthLabel(year, month) {
  return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
}

function monthlyRowBalance(row) {
  return Number(row?.availableSurplus ?? row?.totals?.totalBalance ?? 0)
}

function fillProfileForm(data) {
  isHydratingPriority.value = true
  profile.priorityOrder = Array.isArray(data?.priorityOrder) ? [...data.priorityOrder] : []
  setTimeout(() => {
    isHydratingPriority.value = false
  }, 0)
}

function fillMonthlyForm(data) {
  monthlyForm.monthlyIncome.powerloomIncome = Number(data?.monthlyIncome?.powerloomIncome || 0)
  monthlyForm.monthlyIncome.ashokContribution = Number(data?.monthlyIncome?.ashokContribution || 0)
  monthlyForm.monthlyIncome.rentalIncome = Number(data?.monthlyIncome?.rentalIncome || 0)
  monthlyForm.weeklyExpenses.workerWages = Number(data?.weeklyExpenses?.workerWages || 0)
  monthlyForm.weeklyExpenses.familyExpenses = Number(data?.weeklyExpenses?.familyExpenses || 0)
  monthlyForm.monthlyExpenses.workerWages = Number(data?.monthlyExpenses?.workerWages ?? (Number(data?.weeklyExpenses?.workerWages || 0) * 4.33))
  monthlyForm.monthlyExpenses.familyExpenses = Number(data?.monthlyExpenses?.familyExpenses ?? (Number(data?.weeklyExpenses?.familyExpenses || 0) * 4.33))
  monthlyForm.monthlyExpenses.otherMonthlyExpenses = Number(data?.monthlyExpenses?.otherMonthlyExpenses
    ?? (Number(data?.monthlyExpenses?.electricity || 0) + Number(data?.monthlyExpenses?.maintenance || 0)))
}

function resetMonthlyForm() {
  fillMonthlyForm(null)
  monthlyEntryMode.value = 'add'
  editingTransactionId.value = null
}

const paymentTypeOptions = computed(() => {
  const debtType = normalizeDebtType(selectedPaymentDebt.value?.debtType)
  if (debtType === 'chit_fund') return [{ title: 'Monthly Contribution', value: 'principal_only' }]
  return [
    { title: 'Interest Payment', value: 'interest_only' },
    { title: 'Principal Payment', value: 'principal_only' },
    { title: 'Custom Split', value: 'custom_split' },
  ]
})

async function loadAll() {
  const { month, year } = getMonthYear()
  store.setSelectedPeriod(month, year)
  const [entryRes, profileRes] = await Promise.all([
    store.fetchMonthlyEntry(month, year),
    store.fetchProfile(),
    store.fetchDebts(),
    store.fetchDashboard(month, year),
    store.fetchReports(month, year),
    store.fetchMonthlyEntries(year),
  ])
  fillProfileForm({ ...entryRes, priorityOrder: profileRes?.priorityOrder || [] })
}

async function saveProfile() {
  const { month, year } = getMonthYear()
  const entryPayload = {
    ...JSON.parse(JSON.stringify(monthlyForm)),
    month,
    year,
  }
  if (editingTransactionId.value) {
    entryPayload._transactionId = editingTransactionId.value
  }
  await Promise.all([
    store.updateMonthlyEntry(entryPayload),
    store.updateProfile({ priorityOrder: [...profile.priorityOrder] }),
  ])
  // Always reset form to Add Mode and clear fields after successful save
  resetMonthlyForm()
  await loadAll()
}

async function generateAIInsights() {
  await store.generateAIInsights({ force: true, retries: 1 })
}

async function retryAIInsights() {
  await store.generateAIInsights({ force: true, retries: 2 })
}

async function syncPriorityOrder() {
  const { month, year } = getMonthYear()
  await api.put('/financial-intelligence/profile', {
    priorityOrder: [...(profile.priorityOrder || [])],
  })
  await store.fetchProfile()
  await store.fetchDashboard(month, year)
}

// Edit a specific transaction from the transactions list
function editTransaction(tx) {
  monthlyEntryMode.value = 'edit'
  editingTransactionId.value = String(tx._id)
  fillMonthlyForm(tx)
}

// Delete a specific transaction
async function removeTransaction(tx) {
  const ok = await askDeleteConfirm('this income/expense entry')
  if (!ok) return
  const { month, year } = getMonthYear()
  await store.deleteMonthlyTransaction(Number(month), Number(year), String(tx._id))
  resetMonthlyForm()
  await loadAll()
}

function openDebtDialog() {
  resetDebtForm()
  editingDebtId.value = null
  debtDialog.value = true
}

async function saveDebt() {
  const payload = JSON.parse(JSON.stringify(debtForm))
  if (editingDebtId.value) {
    await store.updateDebt(editingDebtId.value, payload)
  } else {
    await store.createDebt(payload)
  }
  closeDebtDialog()
  await loadAll()
}

function resetDebtForm() {
  debtForm.name = ''
  debtForm.debtType = 'business_loan'
  debtForm.originalAmount = 0
  debtForm.currentBalance = 0
  debtForm.monthlyAmount = 0
  debtForm.emi = 0
  debtForm.interestComponent = 0
  debtForm.principalComponent = 0
  debtForm.interestRate = 0
  debtForm.currentMonthlyInterest = 0
  debtForm.monthlyInterest = 0
  debtForm.chitTotalValue = 0
  debtForm.totalInstallments = 0
  debtForm.monthlyInstallment = 0
  debtForm.remainingMonths = 0
}

function closeDebtDialog() {
  debtDialog.value = false
  editingDebtId.value = null
  resetDebtForm()
}

function openEditDebtDialog(debtId) {
  const debt = (store.debts || []).find(d => d._id === debtId)
  if (!debt) return
  editingDebtId.value = debtId
  debtForm.name = debt.name || ''
  debtForm.debtType = normalizeDebtType(debt.debtType) || 'business_loan'
  debtForm.originalAmount = Number(debt.originalAmount || 0)
  debtForm.currentBalance = Number(debt.currentBalance || 0)
  debtForm.monthlyAmount = Number(debt.monthlyAmount || 0)
  debtForm.emi = Number(debt.emi || 0)
  debtForm.interestComponent = Number(debt.interestComponent || 0)
  debtForm.principalComponent = Number(debt.principalComponent || 0)
  debtForm.interestRate = Number(debt.interestRate || 0)
  debtForm.currentMonthlyInterest = Number(debt.currentMonthlyInterest || 0)
  debtForm.monthlyInterest = Number(debt.monthlyInterest || 0)
  debtForm.chitTotalValue = Number(debt.chitTotalValue || 0)
  debtForm.totalInstallments = Number(debt.totalInstallments || 0)
  debtForm.monthlyInstallment = Number(debt.monthlyInstallment || 0)
  debtForm.remainingMonths = Number(debt.remainingMonths || 0)
  debtDialog.value = true
}

async function removeDebt(debtId) {
  const ok = await askDeleteConfirm('this debt')
  if (!ok) return
  await store.deleteDebt(debtId)
  await loadAll()
}

function openPaymentDialog() {
  editingPaymentId.value = null
  paymentForm.debt = activeDebts.value[0]?._id || null
  paymentForm.amountPaid = 0
  paymentForm.paymentType = 'interest_only'
  paymentForm.interestPaid = 0
  paymentForm.principalPaid = 0
  paymentForm.extraPrincipalAmount = 0
  paymentForm.additionalCharges = 0
  paymentForm.date = new Date().toISOString().slice(0, 10)
  paymentForm.notes = ''
  paymentForm.isExtra = false
  paymentDialog.value = true
}

function openEditMonthlyAction(action) {
  editingPaymentId.value = action._id
  paymentForm.debt = action.debt
  paymentForm.amountPaid = Number(action.amountPaid || 0)
  paymentForm.paymentType = action.paymentType || 'custom_split'
  paymentForm.interestPaid = Number(action.interestPaid || 0)
  paymentForm.principalPaid = Math.max(0, Number(action.principalPaid || 0) - Number(action.extraPaymentAmount || 0))
  paymentForm.extraPrincipalAmount = Number(action.extraPaymentAmount || 0)
  paymentForm.additionalCharges = Number(action.additionalCharges || 0)
  paymentForm.date = action.date ? new Date(action.date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10)
  paymentForm.notes = action.notes || ''
  paymentForm.isExtra = !!action.isExtra
  paymentDialog.value = true
}

async function removeMonthlyAction(id) {
  const ok = await askDeleteConfirm('this payment action')
  if (!ok) return
  await store.deleteDebtPayment(id)
  await loadAll()
}

async function savePayment() {
  const { month, year } = getMonthYear()
  const payload = {
    debt: paymentForm.debt,
    amountPaid: Number(totalPaymentAmount.value || 0),
    interestPaid: Number(paymentForm.interestPaid || 0),
    principalPaid: Number(paymentForm.principalPaid || 0),
    extraPrincipalAmount: Number(paymentForm.extraPrincipalAmount || 0),
    additionalCharges: Number(paymentForm.additionalCharges || 0),
    paymentType: paymentForm.paymentType,
    date: paymentForm.date,
    month,
    year,
    notes: paymentForm.notes,
    isExtra: paymentForm.isExtra,
  }

  if (editingPaymentId.value) {
    await store.updateDebtPayment(editingPaymentId.value, payload)
  } else {
    await store.addDebtPayment(payload)
  }
  paymentDialog.value = false
  editingPaymentId.value = null
  await loadAll()
}

watch(() => selectedMonth.value, () => {
  loadAll()
})

watch(() => paymentForm.debt, () => {
  if (!paymentForm.debt) return
  if (!editingPaymentId.value) {
    paymentForm.amountPaid = 0
    paymentForm.interestPaid = 0
    paymentForm.principalPaid = 0
    paymentForm.extraPrincipalAmount = 0
    paymentForm.additionalCharges = 0
    paymentForm.paymentType = 'interest_only'
    paymentForm.isExtra = false
  }
})

watch(() => [paymentForm.paymentType, paymentForm.isExtra], () => {
  if (paymentForm.paymentType === 'interest_only') {
    paymentForm.principalPaid = 0
  } else if (paymentForm.paymentType === 'principal_only') {
    paymentForm.interestPaid = 0
  }
  if (!paymentForm.isExtra) {
    paymentForm.extraPrincipalAmount = 0
  }
  paymentForm.amountPaid = Number(totalPaymentAmount.value || 0)
})

watch(() => [paymentForm.interestPaid, paymentForm.principalPaid, paymentForm.additionalCharges, paymentForm.extraPrincipalAmount], () => {
  paymentForm.amountPaid = Number(totalPaymentAmount.value || 0)
})

watch(() => [debtForm.currentBalance, debtForm.interestRate, debtForm.debtType], () => {
  const type = normalizeDebtType(debtForm.debtType)
  if (type === 'business_loan' || type === 'friends_family_loan' || type === 'vehicle_loan' || type === 'jewelry_loan') {
    const principal = Number(debtForm.currentBalance || 0)
    const rate = Number(debtForm.interestRate || 0)
    const monthlyInterest = rate > 0 ? (principal * rate) / 1200 : 0
    debtForm.currentMonthlyInterest = Number(monthlyInterest.toFixed(2))
  }
})

watch(() => profile.priorityOrder, () => {
  if (isHydratingPriority.value) return
  if (prioritySyncTimer) clearTimeout(prioritySyncTimer)
  prioritySyncTimer = setTimeout(() => {
    syncPriorityOrder().catch(() => {})
  }, 300)
}, { deep: true })

const burnDownSeries = computed(() => [{
  name: 'Opening Debt',
  data: sampledBurnDown.value.map(x => Number(x.openingDebt || (Number(x.totalDebt || 0) + Number(x.reduction || 0)))),
}, {
  name: 'Principal Paid',
  data: sampledBurnDown.value.map(x => Number(x.principalPaid || x.reduction || 0)),
}, {
  name: 'Closing Debt',
  data: sampledBurnDown.value.map(x => Number(x.closingDebt || x.totalDebt || 0)),
}])

const sampledBurnDown = computed(() => {
  const rows = store.charts?.burnDown || []
  if (rows.length <= 12) return rows
  const step = Math.ceil(rows.length / 12)
  return rows.filter((_, idx) => idx % step === 0 || idx === rows.length - 1)
})

const burnDownOptions = computed(() => ({
  chart: { toolbar: { show: false }, zoom: { enabled: false } },
  grid: { padding: { left: 8, right: 8, top: 4, bottom: 0 } },
  xaxis: {
    categories: sampledBurnDown.value.map(x => x.label || monthLabel(x.year, x.month)),
    tickAmount: 6,
    labels: { rotate: 0, hideOverlappingLabels: true },
  },
  yaxis: { labels: { formatter: value => formatIndianNumber(value) } },
  stroke: { curve: 'smooth', width: [2, 2, 3] },
  colors: ['#0ea5e9', '#16a34a', '#f97316'],
  dataLabels: { enabled: false },
  legend: { position: 'top', fontSize: '12px' },
  tooltip: { y: { formatter: value => money(value) } },
}))

const compositionSeries = computed(() => (store.charts?.composition || []).map(x => Number(x.value || 0)))
const compositionOptions = computed(() => ({
  labels: (store.charts?.composition || []).map(x => x.name),
  legend: { position: 'bottom', fontSize: '12px' },
  colors: ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#06b6d4'],
}))

const sampledCashFlow = computed(() => {
  const rows = store.charts?.cashFlow || []
  if (rows.length <= 12) return rows
  const step = Math.ceil(rows.length / 12)
  return rows.filter((_, idx) => idx % step === 0 || idx === rows.length - 1)
})

const cashFlowSeries = computed(() => [
  { name: 'Income', data: sampledCashFlow.value.map(x => Number(x.income || 0)) },
  { name: 'Expenses', data: sampledCashFlow.value.map(x => Number(x.expenses || 0)) },
  { name: 'Debt Payments', data: sampledCashFlow.value.map(x => Number(x.debtPayments || 0)) },
  { name: 'Surplus', data: sampledCashFlow.value.map(x => Number(x.surplus || 0)) },
])

const cashFlowOptions = computed(() => ({
  chart: { toolbar: { show: false }, zoom: { enabled: false } },
  grid: { padding: { left: 8, right: 8, top: 4, bottom: 0 } },
  stroke: { curve: 'smooth', width: [2, 2, 2, 3] },
  xaxis: {
    categories: sampledCashFlow.value.map(x => x.label || monthLabel(x.year, x.month)),
    tickAmount: 6,
    labels: { rotate: 0, hideOverlappingLabels: true },
  },
  legend: { position: 'bottom', fontSize: '12px' },
  markers: { size: 0 },
  dataLabels: { enabled: false },
  yaxis: { labels: { formatter: value => formatIndianNumber(value) } },
  tooltip: { y: { formatter: value => money(value) } },
}))

const expenseSeries = computed(() => (store.charts?.expenseBreakdown || []).map(x => Number(x.value || 0)))
const expenseOptions = computed(() => ({
  labels: (store.charts?.expenseBreakdown || []).map(x => x.name),
  legend: { position: 'bottom', fontSize: '12px' },
}))

const prioritySeries = computed(() => [{
  name: 'Balance',
  data: (store.charts?.priorityFunnel || []).map(x => Number(x.value || 0)),
}])
const priorityOptions = computed(() => ({
  chart: { toolbar: { show: false } },
  plotOptions: { bar: { horizontal: true, borderRadius: 4 } },
  dataLabels: { enabled: false },
  xaxis: { categories: (store.charts?.priorityFunnel || []).map(x => x.debtName) },
  yaxis: { labels: { maxWidth: 220 } },
  colors: ['#0ea5e9'],
  tooltip: { y: { formatter: value => money(value) } },
}))

const interestSeries = computed(() => [{
  name: 'Monthly Interest',
  data: (store.charts?.interestLeakage?.byDebt || []).map(x => Number(x.value || 0)),
}])
const interestOptions = computed(() => ({
  chart: { toolbar: { show: false } },
  xaxis: { categories: (store.charts?.interestLeakage?.byDebt || []).map(x => x.name) },
  dataLabels: { enabled: false },
  yaxis: { labels: { formatter: value => formatIndianNumber(value) } },
  colors: ['#dc2626'],
  tooltip: { y: { formatter: value => money(value) } },
}))

function handleViewportResize() {
  isMobile.value = window.innerWidth < 768
}

function saveScrollPosition() {
  try {
    sessionStorage.setItem(FI_SCROLL_KEY, String(window.scrollY || 0))
  } catch {
    // Ignore storage errors.
  }
}

function restoreScrollPosition() {
  try {
    const raw = sessionStorage.getItem(FI_SCROLL_KEY)
    if (!raw) return
    const y = Number(raw)
    if (Number.isFinite(y) && y > 0) {
      window.scrollTo({ top: y, left: 0, behavior: 'auto' })
    }
  } catch {
    // Ignore storage errors.
  }
}

onMounted(() => {
  loadAll().finally(() => {
    nextTick(() => restoreScrollPosition())
  })
  window.addEventListener('resize', handleViewportResize, { passive: true })
  window.addEventListener('scroll', saveScrollPosition, { passive: true })
})

onUnmounted(() => {
  saveScrollPosition()
  window.removeEventListener('resize', handleViewportResize)
  window.removeEventListener('scroll', saveScrollPosition)
})
</script>

<style scoped>
.fi-root {
  background: radial-gradient(circle at top left, #fff5e5 0%, #f5fbff 45%, #eefaf4 100%);
  min-height: 100%;
}

.fi-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.fi-title {
  font-family: 'Avenir Next', 'Trebuchet MS', sans-serif;
  letter-spacing: 0.2px;
  margin: 0;
  color: #1f2937;
}

.fi-sub {
  margin: 2px 0 0;
  color: #6b7280;
}

.fi-stat {
  padding: 14px;
  background: #ffffffcc;
  border: 1px solid #e8edf4;
  min-height: 108px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.fi-stat-label {
  color: #6b7280;
  font-size: 12px;
}

.fi-stat-value {
  font-size: 20px;
  font-weight: 700;
  color: #1f2937;
}

.fi-date {
  font-size: 17px;
}

.fi-health {
  font-size: 12px;
  color: #0f766e;
  font-weight: 600;
}

.fi-block-title {
  font-size: 13px;
  color: #374151;
  margin-bottom: 8px;
}

.fi-total-wrap {
  padding: 10px 12px;
  border: 1px dashed #d7e2ef;
  border-radius: 10px;
  background: #f9fcff;
}

.fi-total-item {
  min-width: 210px;
}

.fi-total-label {
  font-size: 12px;
  color: #64748b;
}

.fi-total-value {
  font-size: 18px;
  font-weight: 700;
  color: #1f2937;
}

.fi-balance .fi-total-value {
  color: #0f766e;
}

.fi-table-wrap {
  overflow-x: auto;
}

.fi-table {
  width: 100%;
}

.fi-table :deep(table) {
  width: 100%;
  table-layout: auto;
}

.fi-table :deep(th),
.fi-table :deep(td) {
  white-space: nowrap;
  vertical-align: middle;
}

.fi-table :deep(th:last-child),
.fi-table :deep(td:last-child) {
  position: sticky;
  right: 0;
  background: #fff;
  z-index: 1;
}

.fi-table :deep(th) {
  font-size: 12px;
  color: #51627a;
  letter-spacing: 0.2px;
}

.fi-highlight-balance {
  font-weight: 700;
  color: #8b1e3f;
}

.fi-highlight-interest {
  font-weight: 700;
  color: #b45309;
}

.fi-highlight-payment {
  font-weight: 700;
  color: #0f766e;
}

.fi-compare-box {
  border: 1px solid #e1ebf6;
  border-radius: 10px;
  padding: 10px 12px;
  background: #f8fbff;
}

.fi-chart-group-title {
  font-size: 13px;
  font-weight: 700;
  color: #334155;
  letter-spacing: 0.3px;
  text-transform: uppercase;
  margin-bottom: 2px;
}

.fi-totals-row td {
  background: #f0f4f8;
  border-top: 2px solid #c7d7e8;
  font-size: 13px;
  padding-top: 8px;
  padding-bottom: 8px;
}

.fi-totals-row .fi-highlight-balance {
  color: #8b1e3f;
}

.fi-totals-row .fi-highlight-payment {
  color: #0f766e;
}

.fi-totals-row .fi-highlight-interest {
  color: #b45309;
}

.fi-monthly-summary {
  border: 1px dashed #d7e2ef;
  border-radius: 10px;
  background: #f9fcff;
  padding: 14px 16px 10px;
}

.fi-summary-row {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: flex-start;
}

.fi-summary-col {
  flex: 1 1 180px;
  min-width: 160px;
}

.fi-summary-col--accent {
  border-left: 3px solid #0f766e;
  padding-left: 12px;
}

.fi-summary-col--highlight {
  border-left: 3px solid #1565C0;
  padding-left: 12px;
}

.fi-actions-cell {
  display: flex;
  gap: 6px;
  flex-wrap: nowrap;
  align-items: center;
  justify-content: flex-start;
  min-height: 40px;
  min-width: fit-content;
}

.fi-actions-cell--center {
  justify-content: center;
}

.fi-actions-header {
  min-width: 210px;
}

@media (max-width: 960px) {
  .fi-header {
    flex-direction: column;
    align-items: stretch;
  }

  .fi-actions-cell {
    min-width: 180px;
  }
}

@media (max-width: 768px) {
  .fi-root {
    padding: 12px !important;
  }

  .fi-stat {
    padding: 12px;
    min-height: 90px;
  }

  .fi-stat-value {
    font-size: 16px;
  }

  .fi-total-wrap {
    padding: 8px 10px;
  }

  .fi-total-item {
    min-width: 140px;
  }

  .fi-total-value {
    font-size: 15px;
  }

  .fi-summary-row {
    flex-direction: column;
    gap: 10px;
  }

  .fi-summary-col {
    flex: 1 1 auto;
    min-width: auto;
  }

  .fi-compare-box {
    padding: 8px 10px;
  }

  .fi-chart-group-title {
    font-size: 12px;
  }

  .fi-monthly-summary {
    padding: 10px 12px 8px;
  }
}

@media (max-width: 480px) {
  .fi-title {
    font-size: 18px;
  }

  .fi-stat-value {
    font-size: 14px;
  }

  .fi-date {
    font-size: 14px;
  }

  .fi-actions-cell {
    min-width: auto;
    flex-wrap: wrap;
  }
}
</style>
