<template>
  <div class="dashboard-page" @pointermove="onFx">
    <!-- Hero -->
    <section class="hero reveal" style="--i: 0">
      <div class="hero-aurora" aria-hidden="true"></div>
      <div class="hero-glow hero-glow-a"></div>
      <div class="hero-glow hero-glow-b"></div>
      <div class="hero-grid"></div>
      <svg class="hero-weave" viewBox="0 0 1200 120" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 40 C150 0 300 80 450 40 S750 0 900 40 S1100 80 1200 40" />
        <path d="M0 66 C150 26 300 106 450 66 S750 26 900 66 S1100 106 1200 66" />
        <path d="M0 92 C150 52 300 132 450 92 S750 52 900 92 S1100 132 1200 92" />
      </svg>
      <span v-for="n in 16" :key="n" class="hero-fleck" :style="{ '--n': n }" aria-hidden="true"></span>
      <div class="hero-top">
        <div>
          <div class="hero-greeting"><span class="live-dot" aria-hidden="true"></span>{{ greetingText }}, {{ currentUserName }}</div>
          <h1 class="hero-title">{{ t('dbDashboard') }}</h1>
          <p class="hero-date"><v-icon size="14" class="mr-1">mdi-calendar-blank-outline</v-icon>{{ fmtDate(new Date()) }}<span v-if="periodLabel" class="hero-period-tag">{{ periodLabel }}</span></p>
        </div>
        <div class="hero-actions">
          <div class="period-picker" role="group" :aria-label="t('dbAnalyticsPeriod')">
            <button v-for="p in periodPresets" :key="p.key" type="button" class="period-chip" :class="{ active: period.preset === p.key }" @click="setPeriodPreset(p.key)">{{ p.label }}</button>
            <div ref="customPeriodRef" class="period-custom">
              <button type="button" class="period-chip" :class="{ active: period.preset === 'custom' }" :aria-expanded="customPeriodMenu" @click="toggleCustomPeriod">
                <v-icon size="13" class="mr-1">mdi-calendar-range</v-icon>{{ period.preset === 'custom' ? customRangeLabel : t('dbCustom') }}
              </button>
              <div v-if="customPeriodMenu" class="period-popover">
                <div class="period-popover-title">{{ t('dbCustomRange') }}</div>
                <div class="period-popover-row">
                  <label>{{ t('dbFrom') }}<input v-model="customDraft.from" type="date" :max="customDraft.to || today()" /></label>
                  <label>{{ t('dbTo') }}<input v-model="customDraft.to" type="date" :min="customDraft.from" :max="today()" /></label>
                </div>
                <div class="period-popover-actions">
                  <v-btn size="small" variant="text" @click="customPeriodMenu = false">{{ t('cancel') }}</v-btn>
                  <v-btn size="small" color="primary" variant="flat" :disabled="!customDraft.from || !customDraft.to" @click="applyCustomPeriod">{{ t('dbApply') }}</v-btn>
                </div>
              </div>
            </div>
          </div>
          <v-btn class="hero-refresh" variant="flat" prepend-icon="mdi-refresh" size="small" :loading="analyticsLoading" @click="load(true)">{{ t('dbRefresh') }}</v-btn>
        </div>
      </div>
      <div class="hero-kpis">
        <div class="hero-kpi">
          <div class="hero-kpi-icon tone-indigo"><v-icon size="20">mdi-domain</v-icon></div>
          <div>
            <div class="hero-kpi-label">{{ t('dbCompanies') }}</div>
            <div class="hero-kpi-value"><AnimatedNumber :value="Number(companyGlobal.totalCompanies || 0)" /></div>
          </div>
        </div>
        <div class="hero-kpi">
          <div class="hero-kpi-icon tone-sky"><v-icon size="20">mdi-wallet-outline</v-icon></div>
          <div>
            <div class="hero-kpi-label">{{ t('dbTotalPayable') }}</div>
            <div class="hero-kpi-value"><AnimatedNumber :value="Number(companyGlobal.totalPayable || 0)" :format="fmtWhole" /></div>
          </div>
        </div>
        <div class="hero-kpi">
          <div class="hero-kpi-icon tone-emerald"><v-icon size="20">mdi-check-circle-outline</v-icon></div>
          <div>
            <div class="hero-kpi-label">{{ t('dbTotalReceipt') }}</div>
            <div class="hero-kpi-value"><AnimatedNumber :value="Number(companyGlobal.totalPaid || 0)" :format="fmtWhole" /></div>
          </div>
        </div>
        <div class="hero-kpi hero-kpi-ring">
          <div>
            <div class="hero-kpi-label">{{ t('dbCollection') }}</div>
            <div class="hero-kpi-value"><AnimatedNumber :value="Number(collectionPct)" :format="v => v.toFixed(1) + '%'" /></div>
            <div class="hero-kpi-sub">{{ t('dbPendingV', { v: fmtCompact(companyGlobal.totalPending || 0) }) }}</div>
          </div>
        </div>
      </div>
    </section>

    <!-- Insight Cards -->
    <div class="insight-grid">
      <div v-for="(insight, idx) in insights" :key="insight.label" class="insight-card reveal" :class="insight.tone" :style="{ '--i': idx + 1 }">
        <div class="insight-rail"></div>
        <div class="insight-body">
          <div class="insight-top">
            <div class="insight-icon-wrap" :class="insight.iconTone">
              <v-icon size="20" color="white">{{ insight.icon }}</v-icon>
            </div>
            <div class="insight-label">{{ insight.label }}</div>
          </div>
          <div class="insight-value">{{ insight.value }}</div>
          <div class="insight-sub">{{ insight.sub }}</div>
          <div class="insight-kpis">
            <span>{{ insight.supportA }}</span>
            <span>{{ insight.supportB }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Quick Stats -->
    <div class="stats-grid">
      <div v-for="(s, idx) in stats" :key="s.label" class="stat-tile reveal" :style="{ '--tile-color': s.chipColor, '--i': idx + 5 }">
        <div class="stat-icon-box">
          <v-icon size="17">{{ s.icon }}</v-icon>
        </div>
        <div class="stat-content">
          <span class="stat-label">{{ s.label }}</span>
          <span class="stat-value">{{ s.value }}</span>
        </div>
      </div>
    </div>

    <!-- Pulse strip (period comparisons) -->
    <div class="pulse-grid">
      <div v-for="(p, idx) in pulseTiles" :key="p.key" class="pulse-tile reveal" :style="{ '--p': p.color, '--i': idx + 8 }">
        <div class="pulse-head">
          <div class="pulse-icon"><v-icon size="16">{{ p.icon }}</v-icon></div>
          <span class="pulse-label">{{ p.label }}</span>
        </div>
        <div class="pulse-value"><AnimatedNumber :value="p.value" :format="p.format" /></div>
        <div v-if="p.delta !== undefined && p.delta !== null" class="pulse-delta" :class="deltaClass(p.delta, p.invert)">
          <v-icon size="13">{{ Number(p.delta) > 0 ? 'mdi-trending-up' : Number(p.delta) < 0 ? 'mdi-trending-down' : 'mdi-minus' }}</v-icon>
          {{ Math.abs(Number(p.delta || 0)) }}% <span>{{ p.deltaLabel }}</span>
        </div>
        <div v-else class="pulse-sub">{{ p.sub }}</div>
        <div class="pulse-spark"></div>
      </div>
    </div>

    <!-- Company Overview Section -->
    <div class="section-card reveal" style="--i: 20">
      <div class="section-header">
        <div class="section-header-left">
          <div class="section-icon">
            <v-icon size="20" color="white">mdi-office-building-outline</v-icon>
          </div>
          <div>
            <h2 class="section-title">{{ t('dbCompanyOverview') }}</h2>
            <p class="section-sub">{{ t('dbCompanyOverviewSub') }}</p>
          </div>
        </div>
        <div class="section-header-right">
          <div class="section-badges">
            <span class="s-badge blue">{{ t('dbCompaniesBadge', { n: companyGlobal.totalCompanies }) }}</span>
            <span class="s-badge green">{{ t('dbReceiptBadge', { v: fmt(companyGlobal.totalPaid || 0) }) }}</span>
            <span class="s-badge orange">{{ t('dbPendingBadge', { v: fmt(companyGlobal.totalPending || 0) }) }}</span>
          </div>
          <div class="section-actions">
            <v-text-field
              v-model="dashboardSearch"
              :placeholder="t('dbSearchPlaceholder')"
              prepend-inner-icon="mdi-magnify"
              density="compact"
              variant="outlined"
              hide-details
              clearable
              autocomplete="off"
              class="dashboard-search"
            />
            <v-btn size="small" variant="flat" color="primary" prepend-icon="mdi-plus" @click="router.push('/companies?add=1')">{{ t('dbAddCompany') }}</v-btn>
            <v-btn size="small" variant="tonal" color="primary" @click="expandAllCompanies">{{ t('dbExpandAll') }}</v-btn>
            <v-btn size="small" variant="tonal" color="primary" @click="collapseAllCompanies">{{ t('dbCollapseAll') }}</v-btn>
          </div>
        </div>
      </div>

      <div v-if="filteredCompanyGroups.length" class="company-list">
        <div v-for="(company, cIdx) in filteredCompanyGroups" :key="company.companyId + '-' + company.companyName" class="company-card reveal" :style="{ '--company-color': nameColor(company.companyName), '--i': Math.min(cIdx, 8) + 21 }">
          <!-- Company Header -->
          <div
            class="company-header"
            role="button"
            tabindex="0"
            :aria-expanded="isCompanyExpanded(company.companyId)"
            @click="toggleCompany(company.companyId)"
            @keydown.enter.prevent="toggleCompany(company.companyId)"
            @keydown.space.prevent="toggleCompany(company.companyId)"
          >
            <div class="company-header-left">
              <div class="tex-av-3d" style="width:42px;height:42px;font-size:14px" :style="{ backgroundColor: nameColor(company.companyName) }">
                {{ nameInitials(company.companyName) }}
              </div>
              <div>
                <div class="company-name">
                  {{ company.companyName }}
                  <v-tooltip v-if="company.balanceAlert" location="top">
                    <template #activator="{ props }">
                      <v-icon v-bind="props" size="14" color="#E65100" class="ml-1">mdi-alert-circle</v-icon>
                    </template>
                    <span>{{ t('shortBalanceTip', { count: company.pendingCloseCount, amount: fmt(company.pendingCloseTotal || 0), unallocated: fmt(company.totalUnallocatedAmount || 0) }) }}</span>
                  </v-tooltip>
                </div>
                <div class="company-meta">{{ company.orderCount }} {{ t('orders') }} &middot; {{ t('dbActiveCount', { n: company.activeOrders }) }}<span v-if="company.pendingCloseCount"> &middot; {{ t('dbReadyCount', { n: company.pendingCloseCount }) }}</span></div>
              </div>
            </div>
            <div class="company-header-right">
              <v-btn size="small" color="primary" variant="tonal" prepend-icon="mdi-plus" @click.stop="openAddOrder(company)">
                {{ t('dbAddOrder') }}
              </v-btn>
              <v-btn size="small" class="pay-btn-primary" variant="flat" prepend-icon="mdi-cash-plus" @click.stop="openCompanyPayments(company)">
                {{ t('dbPayment') }}
              </v-btn>
              <v-tooltip :disabled="company.canSettle" location="top">
                <template #activator="{ props }">
                  <span v-bind="props" class="d-inline-flex">
                    <v-btn size="small" :color="company.canSettle ? 'success' : 'grey'" variant="flat" prepend-icon="mdi-gift-outline" :disabled="!company.canSettle" @click.stop="openSettleDialog(company)">
                      {{ t('settleCompany') }}
                    </v-btn>
                  </span>
                </template>
                <span>{{ settleBlockedReason(company) }}</span>
              </v-tooltip>
              <v-btn
                size="small"
                variant="text"
                color="primary"
                :icon="isCompanyExpanded(company.companyId) ? 'mdi-chevron-up' : 'mdi-chevron-down'"
                @click.stop="toggleCompany(company.companyId)"
              />
            </div>
          </div>

          <!-- Company Metrics -->
          <div class="company-metrics">
            <div class="metric-group finance">
              <div class="metric-group-title"><v-icon size="13">mdi-cash-multiple</v-icon>{{ t('dbFinance') }}</div>
              <div class="metric-row">
                <div class="metric-pill payable">
                  <span class="metric-label">{{ t('dbPayable') }}</span>
                  <span class="metric-value">{{ fmt(company.totalPayableAmount || 0) }}</span>
                </div>
                <div class="metric-pill paid">
                  <span class="metric-label">{{ t('dbTotalReceipt') }}</span>
                  <span class="metric-value">{{ fmt(company.totalPaidAmount || 0) }}</span>
                </div>
                <div class="metric-pill pending">
                  <span class="metric-label">{{ t('pending') }}</span>
                  <span class="metric-value">{{ fmt(company.totalPendingToPay || 0) }}</span>
                </div>
                <div class="metric-pill paid">
                  <span class="metric-label">{{ t('dbTotalAllocated') }}</span>
                  <span class="metric-value">{{ fmt(company.totalAllocatedAmount || 0) }}</span>
                </div>
                <div class="metric-pill unallocated">
                  <span class="metric-label">{{ t('dbUnallocated') }}</span>
                  <span class="metric-value">{{ fmt(company.totalUnallocatedAmount || 0) }}</span>
                </div>
              </div>
            </div>
            <div class="metric-group production">
              <div class="metric-group-title"><v-icon size="13">mdi-factory</v-icon>{{ t('dbProdDeduction') }}</div>
              <div class="metric-row">
                <div class="metric-pill deduction-collected">
                  <span class="metric-label">{{ t('dbDedCollected') }}</span>
                  <span class="metric-value">{{ fmt(company.totalDeductionCollected || 0) }}</span>
                </div>
                <div class="metric-pill deduction">
                  <span class="metric-label">{{ t('dbDedToGet') }}</span>
                  <span class="metric-value">{{ fmt(company.totalDeductionNeedToGet || 0) }}</span>
                </div>
                <div class="metric-pill meter-lost">
                  <span class="metric-label">{{ t('dbRejectedMeter') }}</span>
                  <span class="metric-value">{{ fmtN(company.rejectedMeter || 0) }} m</span>
                </div>
                <div class="metric-pill loss">
                  <span class="metric-label">{{ t('dbRejectionLoss') }}</span>
                  <span class="metric-value">{{ fmt(company.totalRejectionGrossLoss || 0) }}</span>
                </div>
                <div class="metric-pill">
                  <span class="metric-label">{{ t('dbArchived') }}</span>
                  <span class="metric-value">{{ fmt(company.totalArchivedAllocatedAmount || 0) }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Expanded Content -->
          <v-expand-transition>
            <div v-show="isCompanyExpanded(company.companyId)" class="company-expanded">
              <!-- Settlement Progress -->
              <div class="progress-section">
                <div class="progress-row">
                  <div class="progress-block settle-block">
                    <div class="progress-header">
                      <span class="progress-title">{{ t('dbSettlement') }}</span>
                      <span class="progress-pct">{{ companySettlePct(company) }}%</span>
                    </div>
                    <div class="progress-track">
                      <div class="progress-fill settlement" :class="settleClass(company)" :style="{ width: companySettlePct(company) + '%' }" />
                    </div>
                    <span class="progress-detail">{{ fmt(company.totalPaidAmount || 0) }} / {{ fmt(company.totalPayableAmount || 0) }}</span>
                  </div>
                  <div class="progress-block deduct-block">
                    <div class="progress-header">
                      <span class="progress-title">{{ t('dbDeductionRecovery') }}</span>
                      <span class="progress-pct">{{ companyDeductionPct(company) }}%</span>
                    </div>
                    <div class="progress-track">
                      <div class="progress-fill deduction" :class="deductionClass(company)" :style="{ width: companyDeductionPct(company) + '%' }" />
                    </div>
                    <span class="progress-detail">{{ fmt(company.totalDeductionCollected || 0) }} / {{ fmt(companyDeductionTotal(company)) }}</span>
                  </div>
                </div>
              </div>

              <!-- Order Table -->
              <div class="order-table-wrap">
                <div class="order-table-header">
                  <span class="order-table-title">
                    <v-icon size="15" class="mr-1">mdi-package-variant-closed</v-icon>
                    {{ t('dbOrderProduction') }}
                    <span class="order-count-chip">{{ company.orders.length }}</span>
                  </span>
                  <span class="order-table-summary">
                    <span class="order-table-summary-bar"><i :style="{ width: orderTablePct(company) + '%' }"></i></span>
                    {{ fmtN(company.periodProducedMeter || 0) }} / {{ fmtN(company.expectedMeter || 0) }} m
                  </span>
                </div>
                <div class="order-table-scroll">
                  <table class="order-table" v-if="company.orders.length">
                    <thead>
                      <tr class="order-table-groups">
                        <th colspan="2"></th>
                        <th colspan="4" class="group-meters">{{ t('dbMeters') }}</th>
                        <th colspan="6" class="group-money">{{ t('dbAmount') }}</th>
                      </tr>
                      <tr>
                        <th>{{ t('dbOrder') }}</th>
                        <th>{{ t('dbState') }}</th>
                        <th class="num">{{ t('dbExpected') }}</th>
                        <th class="num">{{ t('dbProduced') }}</th>
                        <th class="num">{{ t('dbRejected') }}</th>
                        <th class="num">{{ t('dbAccepted') }}</th>
                        <th class="num">{{ t('dbRatePerM') }}</th>
                        <th class="num">{{ t('dbTotalAmt') }}</th>
                        <th class="num">{{ t('dbDedPct') }}</th>
                        <th class="num">{{ t('dbDedAmt') }}</th>
                        <th class="num">{{ t('dbRejLoss') }}</th>
                        <th class="num">{{ t('dbPayableCol') }}</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="(row, rIdx) in company.orders" :key="row._id" :data-order-id="row._id" :class="{ 'highlight-row': highlightOrderId === row._id }" :style="{ '--i': Math.min(rIdx, 12) }" @click="goToOrderDetail(row)">
                        <td class="order-name-cell">
                          <a :href="getOrderDetailHref(row)" class="order-link" @click.stop>
                            {{ row.orderName }}
                          </a>
                          <div class="order-mini-bar"><i :class="row.executionState.tone" :style="{ width: orderRowPct(row) + '%' }"></i></div>
                        </td>
                        <td>
                          <span :class="['order-state', row.executionState.tone]"><i></i>{{ row.executionState.label }}</span>
                        </td>
                        <td class="num">{{ fmtN(row.expectedMeter || 0) }} m</td>
                        <td class="num">{{ fmtN(Number(row.periodProducedMeter || 0) + Number(row.periodRejectedMeter || 0)) }} m</td>
                        <td class="num" :class="{ 'is-bad': Number(row.periodRejectedMeter || 0) > 0 }">{{ fmtN(row.periodRejectedMeter || 0) }} m</td>
                        <td class="num is-accepted">{{ fmtN(row.periodProducedMeter || 0) }} m</td>
                        <td class="num">{{ fmtRatePerMeter(row.ratePerMeter || 0) }}</td>
                        <td class="num">{{ fmtRounded(row.periodTotalValue || 0) }}</td>
                        <td class="num muted">{{ Number(row.deductionPct || 0).toFixed(2) }}%</td>
                        <td class="num muted">{{ fmtRounded(row.periodDeductionAmt || 0) }}</td>
                        <td class="num" :class="{ 'is-bad': Number(row.periodRejectionGrossLoss || 0) > 0 }">{{ fmtRounded(row.periodRejectionGrossLoss || 0) }}</td>
                        <td class="num payable-cell"><span class="payable-chip">{{ fmtRounded(row.periodPayableAmt || 0) }}</span></td>
                      </tr>
                    </tbody>
                    <tfoot>
                      <tr>
                        <td><strong>{{ t('dbTotalRow') }}</strong></td>
                        <td>-</td>
                        <td class="num">{{ fmtN(company.orderTotals.expectedMeter) }} m</td>
                        <td class="num">{{ fmtN(company.orderTotals.producedMeter) }} m</td>
                        <td class="num">{{ fmtN(company.orderTotals.rejectedMeter) }} m</td>
                        <td class="num">{{ fmtN(company.orderTotals.acceptedMeter) }} m</td>
                        <td class="num">-</td>
                        <td class="num">{{ fmtRounded(company.orderTotals.totalAmount) }}</td>
                        <td class="num">-</td>
                        <td class="num">{{ fmtRounded(company.orderTotals.deductionAmount) }}</td>
                        <td class="num">{{ fmtRounded(company.orderTotals.rejectionLoss) }}</td>
                        <td class="num"><strong>{{ fmtRounded(company.orderTotals.payableAmount) }}</strong></td>
                      </tr>
                    </tfoot>
                  </table>
                  <div v-else class="no-orders">{{ t('noData') }}</div>
                </div>
              </div>
            </div>
          </v-expand-transition>
        </div>
      </div>
      <div v-else class="empty-state">
        <v-icon size="48" color="grey-lighten-1">{{ dashboardSearch ? 'mdi-magnify' : 'mdi-office-building-outline' }}</v-icon>
        <p>{{ dashboardSearch ? t('dbNoResults', { q: dashboardSearch }) : t('noData') }}</p>
      </div>
    </div>


    <!-- Settle Company Dialog (Diwali settlement: closes + archives all ready orders) -->
    <v-dialog v-model="settleDialog" max-width="500" persistent>
      <v-card rounded="xl" class="pa-4">
        <div class="text-h6 mb-1">{{ t('settleTitle', { name: settleTarget?.companyName }) }}</div>
        <div class="text-body-2 text-medium-emphasis mb-4">{{ t('settleDesc', { count: settlePreview?.orderCount ?? 0 }) }}</div>

        <v-text-field v-model="settleLabel" :label="t('settleLabel')" placeholder="e.g. Diwali 2025" variant="outlined" density="comfortable" class="mb-2" />

        <v-alert v-if="settleDedDue > 0.01" type="warning" variant="tonal" density="compact" class="mb-2">
          {{ t('settleDedRequired', { amount: fmt(settleDedDue) }) }}
        </v-alert>

        <div v-if="settleDedDue > 0.01" class="d-flex justify-space-between mt-3 mb-1 text-error"><span>{{ t('settleDedStillNeeded') }}</span><strong>{{ fmt(settleDedDue) }}</strong></div>

        <div class="d-flex justify-end ga-2 mt-4">
          <v-btn variant="text" :disabled="settling" @click="settleDialog = false">{{ t('cancel') }}</v-btn>
          <v-tooltip :disabled="settleDedDue <= 0.01" location="top" :text="t('settleDedRequiredTip', { amount: fmt(settleDedDue) })">
            <template #activator="{ props: tipProps }">
              <span v-bind="tipProps">
                <v-btn color="success" variant="flat" :loading="settling" :disabled="!settleReady" @click="confirmSettle">{{ t('settleCompany') }}</v-btn>
              </span>
            </template>
          </v-tooltip>
        </div>
      </v-card>
    </v-dialog>

    <!-- Company Payments Dialog -->
    <v-dialog v-model="targetDialog" max-width="520">
      <v-card rounded="xl" class="target-dialog">
        <div class="target-dialog-head">
          <div class="section-icon"><v-icon size="20" color="white">mdi-bullseye-arrow</v-icon></div>
          <div>
            <div class="pd-title" style="font-size:18px">{{ t('dbMonthlyTargets') }}</div>
            <div class="chart-sub">{{ t('dbTargetsSub') }}</div>
          </div>
          <v-btn icon variant="text" size="small" class="ml-auto" :aria-label="t('dbClose')" @click="targetDialog = false"><v-icon size="20">mdi-close</v-icon></v-btn>
        </div>
        <div class="target-dialog-body">
          <div class="pd-field">
            <label class="pay-field-label" for="tg-prod">{{ t('dbProdTarget') }}</label>
            <v-text-field id="tg-prod" v-model.number="targetForm.monthlyProductionMeter" type="number" min="0" inputmode="numeric" suffix="m" density="compact" variant="outlined" hide-details :placeholder="t('dbEg', { v: 60000 })" />
            <div class="target-hint">{{ t('dbLastMonthWove', { a: fmtN(monthComparison.production?.previous || 0) + ' m', b: fmtN(monthComparison.production?.current || 0) + ' m' }) }}</div>
          </div>
          <div class="pd-field">
            <label class="pay-field-label" for="tg-coll">{{ t('dbCollTarget') }}</label>
            <v-text-field id="tg-coll" v-model.number="targetForm.monthlyCollectionAmount" type="number" min="0" inputmode="numeric" prefix="₹" density="compact" variant="outlined" hide-details :placeholder="t('dbEg', { v: 1500000 })" />
            <div class="target-hint">{{ t('dbLastMonthRecv', { a: fmtCompact(monthComparison.receipts?.previous || 0), b: fmtCompact(companyGlobal.totalPending || 0) }) }}</div>
          </div>
          <div class="pd-field">
            <label class="pay-field-label" for="tg-rej">{{ t('dbRejTarget') }}</label>
            <v-text-field id="tg-rej" v-model.number="targetForm.maxRejectionPct" type="number" min="0" max="100" step="0.5" inputmode="decimal" suffix="%" density="compact" variant="outlined" hide-details />
            <div class="target-hint">{{ t('dbCurrRejRate', { v: Number(analyticsData?.production?.rejectionRate || 0).toFixed(1) }) }}</div>
          </div>
          <div v-if="targetError" class="target-error">{{ targetError }}</div>
        </div>
        <div class="target-dialog-actions">
          <v-btn class="pay-btn-secondary" height="40" :disabled="targetSaving" @click="targetDialog = false">{{ t('cancel') }}</v-btn>
          <v-btn class="pay-btn-primary" height="40" :loading="targetSaving" @click="saveTargets"><v-icon size="17" class="mr-1">mdi-content-save-outline</v-icon>{{ t('dbSaveTargets') }}</v-btn>
        </div>
      </v-card>
    </v-dialog>
    <v-dialog v-model="companyPaymentsDialog" max-width="1240" :scrim="true" scrim-opacity="0.5" :fullscreen="$vuetify.display.smAndDown">
      <v-card rounded="xl" class="pd pay-form" elevation="0">
        <!-- Header -->
        <div class="pd-header">
          <div class="pd-header-left">
            <div class="pd-greeting">{{ greetingText }}, {{ currentUserName }} <span aria-hidden="true">👋</span></div>
            <h2 class="pd-title">{{ selectedCompany?.companyName || t('company') }}</h2>
            <p class="pd-subtitle">{{ t('dbReceiptDeductionMgmt') }}</p>
          </div>
          <div class="pd-header-right">
            <div class="pd-header-row pd-header-row--top">
              <div class="pd-user">
                <div class="pd-user-avatar">{{ currentUserName.charAt(0).toUpperCase() }}</div>
                <div class="pd-user-text">
                  <span class="pd-user-name">{{ currentUserName }}</span>
                  <span class="pd-user-role">{{ currentUserRole }}</span>
                </div>
              </div>
              <v-btn icon variant="text" size="small" class="pd-close-btn" :aria-label="t('dbClose')" @click="companyPaymentsDialog = false">
                <v-icon size="20">mdi-close</v-icon>
              </v-btn>
            </div>
            <div class="pd-header-row">
              <div class="pd-range" role="group" :aria-label="t('dbPayRange')">
                <v-icon size="16" class="pd-range-icon">mdi-calendar-blank-outline</v-icon>
                <input v-model="companyPaymentFilter.from" type="date" class="pd-range-input" :aria-label="t('dbFromDate')" @keydown.enter="loadCompanyPayments" />
                <span class="pd-range-sep">–</span>
                <input v-model="companyPaymentFilter.to" type="date" class="pd-range-input" :aria-label="t('dbToDate')" @keydown.enter="loadCompanyPayments" />
              </div>
              <v-btn class="pay-btn-primary pd-filter-btn" size="small" height="36" :loading="companyPaymentLoading" prepend-icon="mdi-filter-variant" @click="loadCompanyPayments">
                {{ t('dbFilter') }}
              </v-btn>
              <v-btn class="pay-btn-secondary pd-icon-only" size="small" height="36" width="36" :disabled="companyPaymentLoading" :aria-label="t('dbClearDateFilter')" :title="t('dbClearDateFilter')" @click="clearCompanyPaymentFilter">
                <v-icon size="18">mdi-filter-remove-outline</v-icon>
              </v-btn>
            </div>
          </div>
        </div>

        <div class="pd-body">
          <!-- Key Financial Metrics (top 4) -->
          <div class="pd-summary">
            <div v-for="card in companyPaymentCards.slice(0, 4)" :key="card.label" class="pay-stat" :class="card.toneClass">
              <div class="pay-icon-box">
                <v-icon size="20">{{ card.icon }}</v-icon>
              </div>
              <div class="pay-stat__body">
                <div class="pay-stat__label">{{ card.label }}</div>
                <div class="pay-stat__value">{{ card.value }}</div>
                <div class="pay-stat__sub">{{ card.sub }}</div>
              </div>
            </div>
          </div>

          <div class="pd-grid">
            <!-- Main column -->
            <div class="pd-main">
              <!-- Payment Entry Form -->
              <section ref="pdFormRef" class="pay-card pd-form-card" :class="{ 'is-editing': editingPaymentId }" aria-labelledby="pd-entries-title">
                <div class="pay-card__head">
                  <div class="pay-card__title-wrap">
                    <div class="pay-icon-box pay-tone-blue">
                      <v-icon size="20">mdi-file-document-edit-outline</v-icon>
                    </div>
                    <div>
                      <div id="pd-entries-title" class="pay-card__title">{{ t('dbPaymentEntries') }}</div>
                      <div class="pay-card__sub">{{ t('dbPaymentEntriesSub') }}</div>
                    </div>
                  </div>
                  <div class="pd-form-head-actions">
                    <span v-if="editingPaymentId" class="pay-badge pay-tone-orange pd-form-badge">
                      <v-icon size="13">mdi-pencil</v-icon>{{ t('dbEditingEntry') }}
                    </span>
                    <v-btn class="pay-btn-primary" size="small" height="36" prepend-icon="mdi-plus" :disabled="companyPaymentSaving" @click="resetCompanyPaymentForm">
                      {{ t('dbNewEntry') }}
                    </v-btn>
                  </div>
                </div>
                <div class="pay-card__body">
                  <div class="pd-form-grid">
                    <div class="pd-field">
                      <label class="pay-field-label" for="pd-type">{{ t('type') }}</label>
                      <v-select
                        id="pd-type"
                        v-model="companyPaymentForm.transactionType"
                        :items="transactionTypeItems"
                        item-value="value"
                        item-title="title"
                        density="compact"
                        variant="outlined"
                        hide-details
                        :disabled="companyPaymentSaving"
                      />
                    </div>
                    <div class="pd-field">
                      <label class="pay-field-label" for="pd-date">{{ t('date') }}</label>
                      <v-text-field
                        id="pd-date"
                        v-model="companyPaymentForm.date"
                        type="date"
                        density="compact"
                        variant="outlined"
                        hide-details
                        :disabled="companyPaymentSaving"
                        class="pd-input-date"
                      />
                    </div>
                    <div class="pd-field">
                      <label class="pay-field-label" for="pd-amount">{{ t('amount') }}</label>
                      <v-text-field
                        id="pd-amount"
                        v-model.number="companyPaymentForm.amount"
                        type="number"
                        min="0"
                        inputmode="decimal"
                        prefix="₹"
                        :placeholder="t('dbEnterAmount')"
                        density="compact"
                        variant="outlined"
                        hide-details
                        :disabled="companyPaymentSaving"
                        @keydown.enter="saveCompanyPayment"
                      />
                    </div>
                    <div v-if="companyPaymentForm.transactionType === 'payment'" class="pd-field">
                      <label class="pay-field-label" for="pd-mode">{{ t('dbMode') }}</label>
                      <v-select
                        id="pd-mode"
                        v-model="companyPaymentForm.mode"
                        :items="paymentModes"
                        item-value="value"
                        item-title="title"
                        density="compact"
                        variant="outlined"
                        hide-details
                        :disabled="companyPaymentSaving"
                      />
                    </div>
                    <div class="pd-field pd-field-notes">
                      <label class="pay-field-label" for="pd-notes">{{ t('notes') }}</label>
                      <v-text-field
                        id="pd-notes"
                        v-model="companyPaymentForm.notes"
                        :placeholder="t('dbAddNotes')"
                        density="compact"
                        variant="outlined"
                        hide-details
                        :disabled="companyPaymentSaving"
                        @keydown.enter="saveCompanyPayment"
                      />
                    </div>
                    <div class="pd-form-btns">
                      <v-btn class="pay-btn-secondary" height="42" :disabled="companyPaymentSaving" @click="resetCompanyPaymentForm">
                        {{ editingPaymentId ? t('cancel') : t('dbClear') }}
                      </v-btn>
                      <v-btn
                        class="pay-btn-primary pd-save-btn"
                        :class="{ 'is-editing': editingPaymentId }"
                        height="42"
                        :loading="companyPaymentSaving"
                        @click="saveCompanyPayment"
                      >
                        <v-icon size="17" class="mr-1">{{ editingPaymentId ? 'mdi-check' : 'mdi-content-save-outline' }}</v-icon>
                        {{ editingPaymentId ? t('dbUpdateEntry') : t('dbSaveEntry') }}
                      </v-btn>
                    </div>
                  </div>
                  <div v-if="paymentAmountInWords" class="pd-words" aria-live="polite">
                    <v-icon size="13" class="mr-1">mdi-information-outline</v-icon>{{ paymentAmountInWords }}
                  </div>
                  <div v-if="companyPaymentForm.transactionType === 'payment_surplus' && surplusAvailable > 0" class="pd-words">
                    <v-icon size="13" class="mr-1">mdi-information-outline</v-icon>{{ t('dbUnallocated') }}: ₹{{ surplusAvailable.toFixed(2) }}
                    <button type="button" class="pd-link-btn ml-2" @click="companyPaymentForm.amount = surplusAvailable">{{ t('dbUseFullAmount') }}</button>
                  </div>
                </div>
              </section>

              <!-- Payment History -->
              <section ref="pdHistoryRef" class="pay-card pd-history" aria-labelledby="pd-history-title">
                <div class="pay-card__head">
                  <div class="pay-card__title-wrap">
                    <div class="pay-icon-box pay-tone-blue">
                      <v-icon size="20">mdi-history</v-icon>
                    </div>
                    <div>
                      <div id="pd-history-title" class="pay-card__title">{{ t('dbPaymentHistory') }}</div>
                    </div>
                  </div>
                  <div class="pd-history-tools">
                    <v-text-field
                      v-model="companyPaymentSearch"
                      class="pay-search pd-search"
                      :placeholder="t('dbSearchPayments')"
                      prepend-inner-icon="mdi-magnify"
                      density="compact"
                      variant="outlined"
                      hide-details
                      clearable
                      autocomplete="off"
                      :aria-label="t('dbSearchPaymentHistory')"
                    />
                    <v-menu location="bottom end">
                      <template #activator="{ props }">
                        <button type="button" v-bind="props" class="pd-tool-btn" :class="{ 'is-active': companyPaymentTypeFilter !== 'all' }" :aria-label="t('dbFilterByType')" :title="t('dbFilterByType')">
                          <v-icon size="18">mdi-filter-variant</v-icon>
                        </button>
                      </template>
                      <v-list density="compact" class="pd-menu">
                        <v-list-item v-for="opt in paymentTypeFilterItems" :key="opt.value" :active="companyPaymentTypeFilter === opt.value" @click="companyPaymentTypeFilter = opt.value">
                          <template #prepend><v-icon size="16">{{ opt.icon }}</v-icon></template>
                          <v-list-item-title>{{ opt.title }}</v-list-item-title>
                        </v-list-item>
                      </v-list>
                    </v-menu>
                  </div>
                </div>

                <div v-if="companyPaymentLoading" class="pay-loading">
                  <v-progress-circular indeterminate color="primary" size="32" width="3" />
                </div>
                <template v-else>
                  <div class="pay-table-wrap pd-history-scroll pd-history-table-wrap">
                    <table class="pay-table pd-table">
                      <thead>
                        <tr>
                          <th class="is-idx">#</th>
                          <th>{{ t('type') }}</th>
                          <th>{{ t('date') }}</th>
                          <th>{{ t('dbMode') }}</th>
                          <th class="is-num">{{ t('amount') }}</th>
                          <th>{{ t('notes') }}</th>
                          <th class="is-center">{{ t('dbActions') }}</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr
                          v-for="(row, i) in pagedCompanyPaymentRows"
                          :key="row._id"
                          class="pd-row"
                          :class="{ 'is-deduction': row.transactionType === 'deduction' || row.transactionType === 'loss', 'is-editing-row': editingPaymentId === row._id }"
                        >
                          <td class="is-idx">{{ companyPaymentPageStart + i + 1 }}</td>
                          <td>
                            <span class="pay-badge" :class="row.transactionType === 'receipt' || row.transactionType === 'payment' ? 'pay-tone-green' : 'pay-tone-red'">
                              <v-icon size="12">{{ row.transactionType === 'loss' ? 'mdi-alert-circle-outline' : row.transactionType === 'deduction' ? 'mdi-minus' : 'mdi-plus' }}</v-icon>
                              {{ row.transactionType === 'loss' ? (row.lossKind === 'payment' ? t('dbPaymentLoss') : row.lossKind === 'surplus' ? t('dbPaymentSurplus') : t('dbDeductionLoss')) : row.transactionType === 'deduction' ? t('dbDeductionReceived') : t('dbPaymentReceived') }}
                            </span>
                          </td>
                          <td class="pd-cell-date">{{ fmtDate(row.date) }}</td>
                          <td>
                            <span v-if="row.transactionType !== 'deduction' && row.transactionType !== 'loss'" class="pay-badge is-square pay-tone-blue pd-mode-chip">{{ t(row.mode || 'cash') }}</span>
                            <span v-else class="pd-mode-na">—</span>
                          </td>
                          <td class="is-num" :class="row.transactionType === 'receipt' || row.transactionType === 'payment' ? 'c-green' : 'c-red'">
                            {{ fmt(row.amount || 0) }}
                          </td>
                          <td class="pd-cell-notes is-muted" :title="row.notes || ''">{{ row.notes || '—' }}</td>
                          <td class="is-center">
                            <div v-if="row.transactionType !== 'loss' || row.manual" class="pd-actions">
                              <button v-if="row.transactionType !== 'loss'" type="button" class="pay-icon-btn pay-tone-blue" :disabled="companyPaymentSaving" aria-label="Edit entry" :title="t('dbEdit')" @click="startEditCompanyPayment(row)">
                                <v-icon size="14">mdi-pencil</v-icon>
                              </button>
                              <button type="button" class="pay-icon-btn pay-tone-red" :disabled="companyPaymentSaving" aria-label="Delete entry" :title="t('dbDelete')" @click="deleteCompanyPayment(row._id)">
                                <v-icon size="14">mdi-delete-outline</v-icon>
                              </button>
                            </div>
                          </td>
                        </tr>
                      </tbody>
                      <tfoot v-if="companyPaymentRows.length">
                        <tr class="pd-footer-row">
                          <td colspan="4" class="pd-footer-label">{{ t('total') }}</td>
                          <td class="is-num pd-footer-amount">{{ fmt(paymentTotalAmount + deductionTotalAmount) }}</td>
                          <td colspan="2"></td>
                        </tr>
                      </tfoot>
                    </table>
                    <div v-if="!companyPaymentRows.length" class="pay-empty">
                      <div class="pay-icon-box is-lg pay-tone-neutral"><v-icon size="24">mdi-receipt-text-outline</v-icon></div>
                      <div class="pay-empty__title">{{ t('dbNoPayments') }}</div>
                      <span>{{ t('dbNoPaymentsSub') }}</span>
                    </div>
                    <div v-else-if="!filteredCompanyPaymentRows.length" class="pay-empty">
                      <div class="pay-icon-box is-lg pay-tone-neutral"><v-icon size="24">mdi-magnify</v-icon></div>
                      <div class="pay-empty__title">{{ t('dbNoMatching') }}</div>
                      <v-btn class="pay-btn-secondary" size="small" @click="companyPaymentSearch = ''; companyPaymentTypeFilter = 'all'">{{ t('dbClearFilters') }}</v-btn>
                    </div>
                  </div>
                  <div v-if="filteredCompanyPaymentRows.length" class="pay-pager">
                    <span>{{ t('dbShowingRange', { a: companyPaymentPageStart + 1, b: Math.min(companyPaymentPageStart + companyPaymentPageSize, filteredCompanyPaymentRows.length), c: filteredCompanyPaymentRows.length }) }}</span>
                    <div class="pay-pager__btns" role="navigation" :aria-label="t('dbPaginationLabel')">
                      <button type="button" class="pay-pager__btn" :disabled="companyPaymentPage <= 1" :aria-label="t('dbPrevPage')" @click="companyPaymentPage--">
                        <v-icon size="16">mdi-chevron-left</v-icon>
                      </button>
                      <button
                        v-for="p in companyPaymentPageItems"
                        :key="p.key"
                        type="button"
                        class="pay-pager__btn"
                        :class="{ 'is-active': p.page === companyPaymentPage, 'is-gap': p.gap }"
                        :disabled="p.gap"
                        :aria-current="p.page === companyPaymentPage ? 'page' : undefined"
                        @click="!p.gap && (companyPaymentPage = p.page)"
                      >
                        {{ p.gap ? '…' : p.page }}
                      </button>
                      <button type="button" class="pay-pager__btn" :disabled="companyPaymentPage >= companyPaymentPageCount" :aria-label="t('dbNextPage')" @click="companyPaymentPage++">
                        <v-icon size="16">mdi-chevron-right</v-icon>
                      </button>
                    </div>
                  </div>
                </template>
              </section>
            </div>

            <!-- Side column -->
            <aside class="pd-side">
              <!-- Payment Overview -->
              <section class="pay-card" aria-labelledby="pd-overview-title">
                <div class="pay-card__head">
                  <div class="pay-card__title-wrap">
                    <div class="pay-icon-box pay-tone-blue">
                      <v-icon size="20">mdi-chart-bar</v-icon>
                    </div>
                    <div id="pd-overview-title" class="pay-card__title">{{ t('dbPaymentOverview') }}</div>
                  </div>
                  <span class="pay-badge pay-tone-neutral is-square pd-overview-scope">{{ t('dbAllTime') }}</span>
                </div>
                <div class="pay-card__body">
                  <div class="pd-overview">
                    <div class="pay-donut" :style="{ background: paymentOverviewDonut }" role="img" :aria-label="t('dbReceivedPct', { v: paymentOverviewLegend[0]?.pct })">
                      <div class="pay-donut__center">
                        <span class="pay-donut__value">{{ fmtCompact(companyPaymentSummary.totalPayableAmount || 0) }}</span>
                        <span class="pay-donut__label">{{ t('dbTotalPayable') }}</span>
                      </div>
                    </div>
                    <div class="pay-legend">
                      <div v-for="item in paymentOverviewLegend" :key="item.label" class="pay-legend__item" :class="item.toneClass">
                        <span class="pay-legend__swatch" :style="{ background: item.color }"></span>
                        <span class="pay-legend__label">{{ item.label }}</span>
                        <span class="pay-legend__value">{{ fmt(item.value) }}</span>
                        <span class="pay-legend__pct">({{ item.pct }}%)</span>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <!-- Meter Summary -->
              <section class="pay-card" aria-labelledby="pd-meter-title">
                <div class="pay-card__head">
                  <div class="pay-card__title-wrap">
                    <div class="pay-icon-box pay-tone-blue">
                      <v-icon size="20">mdi-gauge</v-icon>
                    </div>
                    <div id="pd-meter-title" class="pay-card__title">{{ t('dbMeterSummary') }}</div>
                  </div>
                  <button v-if="selectedCompany?.companyId && selectedCompany.companyId !== 'unknown'" type="button" class="pd-link-btn" @click="openAllocatePayments">{{ t('dbViewAll') }}</button>
                </div>
                <div class="pay-card__body">
                  <div class="pd-meter-grid">
                    <div v-for="card in companyPaymentCards.slice(4)" :key="card.label" class="pay-mini" :class="card.toneClass">
                      <div class="pay-icon-box is-sm">
                        <v-icon size="16">{{ card.icon }}</v-icon>
                      </div>
                      <div class="pd-mini-body">
                        <div class="pay-mini__label">{{ card.label }}</div>
                        <div class="pay-mini__value">{{ card.value }}</div>
                        <div v-if="card.sub" class="pay-mini__sub">{{ card.sub }}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <!-- Recent Activity -->
              <section class="pay-card" aria-labelledby="pd-activity-title">
                <div class="pay-card__head">
                  <div class="pay-card__title-wrap">
                    <div class="pay-icon-box pay-tone-blue">
                      <v-icon size="20">mdi-clock-outline</v-icon>
                    </div>
                    <div id="pd-activity-title" class="pay-card__title">{{ t('dbRecentActivity') }}</div>
                  </div>
                  <button v-if="companyPaymentRows.length" type="button" class="pd-link-btn" @click="viewAllCompanyPayments">{{ t('dbViewAll') }}</button>
                </div>
                <div class="pay-card__body">
                  <div v-if="recentCompanyPayments.length" class="pay-activity">
                    <div v-for="row in recentCompanyPayments" :key="row._id" class="pay-activity__item" :class="row.transactionType === 'deduction' ? 'pay-tone-red' : 'pay-tone-green'">
                      <span class="pay-activity__dot"></span>
                      <div class="pd-activity-text">
                        <div class="pay-activity__title">{{ row.transactionType === 'deduction' ? t('dbDeductionRecorded') : t('dbPaymentReceived') }}</div>
                        <div class="pay-activity__meta">
                          {{ fmtDate(row.date) }}<template v-if="row.transactionType !== 'deduction'"> · {{ t(row.mode || 'cash') }}</template>
                        </div>
                      </div>
                      <span class="pay-activity__amt">{{ fmt(row.amount || 0) }}</span>
                    </div>
                  </div>
                  <div v-else class="pay-empty pd-activity-empty">
                    <span>{{ t('dbNoRecentActivity') }}</span>
                  </div>
                </div>
              </section>
            </aside>
          </div>

          <!-- Settlement History -->
          <section class="pay-card pd-settle-history" aria-labelledby="pd-settle-title">
            <div class="pay-card__head">
              <div class="pay-card__title-wrap">
                <div class="pay-icon-box pay-tone-green">
                  <v-icon size="20">mdi-gift-outline</v-icon>
                </div>
                <div id="pd-settle-title" class="pay-card__title">{{ t('settleHistory') }}</div>
              </div>
            </div>
            <div v-if="companySettlements.length" class="pay-table-wrap">
              <table class="pay-table pd-settle-table">
                <thead>
                  <tr>
                    <th>{{ t('date') }}</th>
                    <th>{{ t('settleLabel') }}</th>
                    <th class="is-num">{{ t('orders') }}</th>
                    <th class="is-num">{{ t('settleDedThisSettle') }}</th>
                    <th class="is-num">{{ t('dbLoss') }}</th>
                    <th>{{ t('settleLossReasonShort') }}</th>
                    <th class="is-center">{{ t('dbActions') }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="s in companySettlements" :key="s._id" class="pd-row">
                    <td class="pd-cell-date">{{ fmtDate(s.settledAt) }}</td>
                    <td>{{ s.label || t('settleCompany') }}</td>
                    <td class="is-num">{{ s.orderCount }}</td>
                    <td class="is-num">{{ fmt(s.deductionTotal || 0) }}</td>
                    <td class="is-num" :class="s.lossAmount > 0 ? 'c-red' : ''">{{ s.lossAmount > 0 ? fmt(s.lossAmount) : '—' }}</td>
                    <td class="pd-cell-notes is-muted" :title="s.lossReason || ''">{{ s.lossReason || '—' }}</td>
                    <td class="is-center">
                      <v-btn size="x-small" variant="tonal" color="primary" prepend-icon="mdi-camera-outline" @click="openSettlementSnapshot(s)">{{ t('settleSnapshot') }}</v-btn>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div v-else class="pay-empty pd-activity-empty">
              <span>{{ t('settleHistoryEmpty') }}</span>
            </div>
          </section>
        </div>
      </v-card>
    </v-dialog>

    <!-- Settlement Snapshot Dialog -->
    <v-dialog v-model="snapshotDialog" max-width="1000" scrollable>
      <v-card v-if="snapshotTarget" :key="snapshotTarget._id" class="snap-card" rounded="xl">
        <header class="snap-hero">
          <span class="snap-hero__glow" aria-hidden="true"></span>
          <span class="snap-hero__glow snap-hero__glow--b" aria-hidden="true"></span>
          <div class="snap-hero__icon"><v-icon size="30">mdi-gift-outline</v-icon></div>
          <div class="snap-hero__text">
            <div class="snap-hero__eyebrow">{{ t('settleSnapshot') }}</div>
            <div class="snap-hero__title">{{ snapshotTarget.label }}</div>
            <div class="snap-hero__chips">
              <span class="snap-chip"><v-icon size="14">mdi-domain</v-icon>{{ selectedCompany?.companyName }}</span>
              <span class="snap-chip"><v-icon size="14">mdi-calendar-check-outline</v-icon>{{ fmtDate(snapshotTarget.settledAt) }}</span>
              <span v-if="snapshotTarget.by" class="snap-chip"><v-icon size="14">mdi-account-outline</v-icon>{{ snapshotTarget.by }}</span>
              <span class="snap-chip"><v-icon size="14">mdi-package-variant-closed</v-icon>{{ snapshotTarget.orderCount }} {{ t('snapOrders') }}</span>
            </div>
          </div>
          <v-btn class="snap-hero__close" icon="mdi-close" variant="text" size="small" color="white" :aria-label="'Close'" @click="snapshotDialog = false" />
        </header>

        <v-card-text class="snap-body">
          <template v-if="snapshotTarget.snapshot">
            <div class="snap-kpis">
              <div v-for="(k, i) in snapKpis" :key="k.key" class="snap-kpi" :class="`snap-tone-${k.tone}`" :style="{ '--i': i }">
                <div class="snap-kpi__icon"><v-icon size="20">{{ k.icon }}</v-icon></div>
                <div class="snap-kpi__label">{{ k.label }}</div>
                <div class="snap-kpi__value"><AnimatedNumber :value="k.value" :format="k.format" /></div>
                <div v-if="k.sub" class="snap-kpi__sub">{{ k.sub }}</div>
              </div>
            </div>

            <section v-if="snapFlow.length" class="snap-section" style="--i: 5">
              <div class="snap-section__title"><v-icon size="18">mdi-swap-horizontal-bold</v-icon>{{ t('snapBalanceFlow') }}</div>
              <div class="snap-flow">
                <template v-for="(f, i) in snapFlow" :key="f.label">
                  <div class="snap-flow__step" :class="`snap-tone-${f.tone}`" :style="{ '--i': i }">
                    <div class="snap-flow__label">{{ f.label }}</div>
                    <div class="snap-flow__value">{{ f.sign }}<AnimatedNumber :value="f.value" :format="fmt" /></div>
                  </div>
                  <div v-if="i < snapFlow.length - 1" class="snap-flow__arrow" aria-hidden="true"><v-icon size="22">mdi-arrow-right-thin</v-icon></div>
                </template>
              </div>
            </section>

            <section class="snap-section" style="--i: 6">
              <div class="snap-section__head">
                <div class="snap-section__title"><v-icon size="18">mdi-format-list-bulleted-square</v-icon>{{ t('snapOrderDetails') }}</div>
                <div class="snap-search">
                  <v-icon size="16">mdi-magnify</v-icon>
                  <input v-model="snapSearch" type="search" :placeholder="t('snapSearch')" :aria-label="t('snapSearch')" />
                </div>
              </div>
              <div class="snap-table-wrap">
                <table class="snap-table">
                  <thead>
                    <tr>
                      <th class="snap-col-idx">#</th>
                      <th>{{ t('settleSnapOrder') }}</th>
                      <th v-for="c in snapColumns" :key="c.key" class="is-num is-sortable" :class="{ 'is-sorted': snapSort.key === c.key }" @click="toggleSnapSort(c.key)">
                        {{ c.label }}<v-icon v-if="snapSort.key === c.key" size="12">{{ snapSort.dir === 'asc' ? 'mdi-arrow-up' : 'mdi-arrow-down' }}</v-icon>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(o, i) in snapVisibleOrders" :key="o.orderId || o.orderName" class="snap-row" :style="{ '--i': Math.min(i, 14) }">
                      <td class="snap-col-idx">{{ i + 1 }}</td>
                      <td>
                        <a v-if="o.orderId" class="snap-order-name snap-order-link" :href="snapOrderHref(o)" target="_blank" rel="noopener">{{ o.orderName }}<v-icon size="12">mdi-open-in-new</v-icon></a>
                        <div v-else class="snap-order-name">{{ o.orderName }}</div>
                        <div v-if="typeof o.producedMeter === 'number'" class="snap-order-sub">
                          {{ t('snapProduced') }} {{ fmtN(o.producedMeter) }} m
                          <template v-if="o.rejectedMeter > 0"> · <span class="c-red">{{ t('snapRejected') }} {{ fmtN(o.rejectedMeter) }} m</span></template>
                        </div>
                      </td>
                      <td class="is-num">{{ fmtN(o.acceptedMeter) }} m</td>
                      <td class="is-num">{{ fmt(o.ratePerMeter) }}</td>
                      <td class="is-num">{{ fmt(o.grossAmount) }}</td>
                      <td class="is-num">
                        <span class="snap-ded">{{ fmt(o.deductionAmount) }}</span>
                        <span class="snap-pct">{{ o.deductionPct }}%</span>
                      </td>
                      <td class="is-num snap-payable">
                        <strong :title="`${fmt(o.grossAmount)} − ${fmt(o.deductionAmount)}`">{{ fmt(o.payableAmount) }}</strong>
                        <span class="snap-paid"><v-icon size="12">mdi-check-circle</v-icon>{{ t('dbReceived') }} {{ fmt(o.payableAmount) }} · {{ t('snapPending') }} {{ fmt(0) }}</span>
                        <span class="snap-bar"><span class="snap-bar__fill" style="--w: 100%"></span></span>
                      </td>
                    </tr>
                    <tr v-if="!snapVisibleOrders.length">
                      <td colspan="7" class="snap-empty">{{ t('snapNoMatch') }}</td>
                    </tr>
                  </tbody>
                  <tfoot>
                    <tr>
                      <td></td>
                      <td>{{ t('snapTotal') }}<span v-if="snapVisibleOrders.length !== snapOrders.length" class="snap-order-sub"> · {{ t('snapShowing', { n: snapVisibleOrders.length, total: snapOrders.length }) }}</span></td>
                      <td class="is-num">{{ fmtN(snapTotals.accepted) }} m</td>
                      <td class="is-num">{{ fmt(snapTotals.avgRate) }}</td>
                      <td class="is-num">{{ fmt(snapTotals.gross) }}</td>
                      <td class="is-num"><span class="snap-ded">{{ fmt(snapTotals.deduction) }}</span><span class="snap-pct">{{ snapTotals.dedPct }}%</span></td>
                      <td class="is-num">
                        {{ fmt(snapTotals.payable) }}
                        <span class="snap-paid"><v-icon size="12">mdi-check-circle</v-icon>{{ t('dbReceived') }} {{ fmt(snapTotals.payable) }} · {{ t('snapPending') }} {{ fmt(0) }}</span>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </section>

            <section v-if="snapDeductionItems.length" class="snap-section" style="--i: 7">
              <div class="snap-section__title"><v-icon size="18">mdi-percent-outline</v-icon>{{ t('snapDeductionSummary') }}</div>
              <div v-if="snapRecoveredPct !== null" class="snap-recover">
                <div class="snap-recover__head"><span>{{ t('snapRecovered') }}</span><strong>{{ snapRecoveredPct }}%</strong></div>
                <div class="snap-recover__track"><span class="snap-recover__fill" :style="{ '--w': snapRecoveredPct + '%' }"></span></div>
              </div>
              <div class="snap-ledger">
                <div v-for="(d, i) in snapDeductionItems" :key="d.key" class="snap-ledger__item" :class="`snap-tone-${d.tone}`" :style="{ '--i': i }">
                  <span class="snap-ledger__icon"><v-icon size="18">{{ d.icon }}</v-icon></span>
                  <span class="snap-ledger__label">{{ d.label }}</span>
                  <strong class="snap-ledger__value">{{ fmt(d.value) }}</strong>
                </div>
              </div>
            </section>

            <div v-if="snapshotTarget.lossReason" class="snap-loss">
              <v-icon size="18">mdi-alert-circle-outline</v-icon>
              <div><strong>{{ t('settleLossReasonShort') }}:</strong> {{ snapshotTarget.lossReason }}</div>
            </div>
          </template>
          <div v-else class="snap-none">
            <v-icon size="32">mdi-camera-off-outline</v-icon>
            <div>{{ t('settleSnapshotNone') }}</div>
          </div>
        </v-card-text>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { computed, nextTick, onActivated, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useOrderStore, useDashboardStore } from '@/stores/index'
import { useAuthStore } from '@/stores/auth'
import { useRoute, useRouter } from 'vue-router'
import api from '@/plugins/axios'
import { useUtils } from '@/composables/useUtils'
import { useNotify } from '@/composables/useNotify'
import { useConfirm } from '@/composables/useConfirm'
import AgTable from '@/components/common/AgTable.vue'
import AnimatedNumber from '@/components/common/AnimatedNumber.vue'
import { celebrate } from '@/composables/useCelebrate'

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

const { t } = useI18n()
const { fmt, fmtN, fmtDate, today, pct, paymentModes, numToWords } = useUtils()
const notify = useNotify()
const { confirm } = useConfirm()
const route = useRoute()
const router = useRouter()

function fmtRatePerMeter(value) {
  const n = Number(value || 0)
  if (!Number.isFinite(n)) return '₹0'
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 20 })}`
}

const orderStore = useOrderStore()
const dashboardStore = useDashboardStore()
const authStore = useAuthStore()

const currentUserName = computed(() => {
  const raw = String(authStore.user?.name || authStore.user?.username || 'User')
  return raw.charAt(0).toUpperCase() + raw.slice(1)
})
const currentUserRole = computed(() => {
  const raw = String(authStore.user?.role || 'user')
  return raw.charAt(0).toUpperCase() + raw.slice(1)
})
const greetingText = computed(() => {
  const h = new Date().getHours()
  if (h < 12) return t('dbGoodMorning')
  if (h < 17) return t('dbGoodAfternoon')
  return t('dbGoodEvening')
})

const companyPaymentsDialog = ref(false)
const companyPaymentLoading = ref(false)
const companyPaymentSaving = ref(false)
const selectedCompany = ref(null)
function defaultCompanyPaymentFilter() {
  return {
    from: '',
    to: '',
  }
}

const companyPaymentFilter = ref(defaultCompanyPaymentFilter())
const companyPaymentRows = ref([])
const companySettlements = ref([])
const snapshotDialog = ref(false)
const snapshotTarget = ref(null)
function openSettlementSnapshot(s) {
  snapshotTarget.value = s
  snapshotDialog.value = true
}
const snapSearch = ref('')
const snapSort = ref({ key: '', dir: 'desc' })
watch(snapshotDialog, open => { if (open) { snapSearch.value = ''; snapSort.value = { key: '', dir: 'desc' } } })

const snapOrders = computed(() => snapshotTarget.value?.snapshot?.orders || [])
const snapTotals = computed(() => {
  const sum = key => snapOrders.value.reduce((n, o) => n + Number(o[key] || 0), 0)
  const accepted = sum('acceptedMeter')
  const gross = sum('grossAmount')
  const deduction = sum('deductionAmount')
  return {
    count: snapOrders.value.length,
    accepted,
    gross,
    deduction,
    payable: sum('payableAmount'),
    avgRate: accepted ? gross / accepted : 0,
    dedPct: gross ? Math.round((deduction / gross) * 1000) / 10 : 0,
  }
})
const snapKpis = computed(() => {
  const tt = snapTotals.value
  return [
    { key: 'orders', label: t('snapOrdersSettled'), icon: 'mdi-package-variant-closed', tone: 'blue', value: tt.count, format: v => String(Math.round(v)) },
    { key: 'meters', label: t('snapAcceptedMeters'), icon: 'mdi-ruler', tone: 'teal', value: tt.accepted, format: v => `${fmtN(Math.round(v))} m`, sub: `${t('snapAvgRate')} ${fmt(tt.avgRate)}` },
    { key: 'gross', label: t('snapGrossValue'), icon: 'mdi-cash-multiple', tone: 'neutral', value: tt.gross, format: fmt },
    { key: 'ded', label: t('snapTotalDeduction'), icon: 'mdi-percent-outline', tone: 'red', value: tt.deduction, format: fmt, sub: `${tt.dedPct}% ${t('snapOfGross')}` },
    { key: 'net', label: t('snapNetPayable'), icon: 'mdi-wallet-outline', tone: 'green', value: tt.payable, format: fmt, sub: `${t('dbReceived')} ${fmt(tt.payable)} · ${t('snapPending')} ${fmt(0)}` },
  ]
})
const snapColumns = computed(() => [
  { key: 'acceptedMeter', label: t('settleSnapMeters') },
  { key: 'ratePerMeter', label: t('settleSnapRate') },
  { key: 'grossAmount', label: t('settleSnapGross') },
  { key: 'deductionAmount', label: t('dbDeduction') },
  { key: 'payableAmount', label: t('settleSnapPayable') },
])
const snapVisibleOrders = computed(() => {
  const q = snapSearch.value.trim().toLowerCase()
  let list = q ? snapOrders.value.filter(o => String(o.orderName || '').toLowerCase().includes(q)) : [...snapOrders.value]
  const { key, dir } = snapSort.value
  if (key) list.sort((a, b) => (dir === 'asc' ? 1 : -1) * (Number(a[key] || 0) - Number(b[key] || 0)))
  return list
})
function toggleSnapSort(key) {
  const cur = snapSort.value
  if (cur.key !== key) snapSort.value = { key, dir: 'desc' }
  else if (cur.dir === 'desc') snapSort.value = { key, dir: 'asc' }
  else snapSort.value = { key: '', dir: 'desc' }
}
function snapOrderHref(o) {
  return router.resolve({ name: 'order-detail', params: { id: String(o.orderId) } }).href
}
const snapFlow = computed(() => {
  const sn = snapshotTarget.value?.snapshot
  if (!sn || typeof sn.balanceBefore !== 'number') return []
  const steps = [{ label: t('settleSnapBalBefore'), value: sn.balanceBefore, tone: 'blue', sign: '' }]
  if (typeof sn.cashUsedToCloseOrders === 'number') steps.push({ label: t('settleSnapCash'), value: sn.cashUsedToCloseOrders, tone: 'orange', sign: '− ' })
  if (typeof sn.balanceAfter === 'number') steps.push({ label: t('settleSnapBalAfter'), value: sn.balanceAfter, tone: 'green', sign: '' })
  return steps
})
const snapDeductionItems = computed(() => {
  const sn = snapshotTarget.value?.snapshot
  if (!sn) return []
  const items = []
  const add = (key, label, value, icon, tone) => { if (typeof value === 'number') items.push({ key, label, value, icon, tone }) }
  add('pending', t('settleDedOutstanding'), sn.deductionPendingBefore, 'mdi-clock-alert-outline', 'orange')
  add('onOrders', t('settleDedThisSettle'), sn.deductionOnSettledOrders, 'mdi-percent-outline', 'blue')
  if (sn.deductionReceivedUnapplied > 0) add('credit', t('settleDedCredit'), sn.deductionReceivedUnapplied, 'mdi-cash-check', 'green')
  if (sn.surplusMoved > 0) add('surplus', t('settleSurplusInput'), sn.surplusMoved, 'mdi-swap-horizontal', 'green')
  add('applied', t('settleSnapDedApplied'), sn.deductionAllocated, 'mdi-check-decagram-outline', 'green')
  add('carried', t('settleDedCarried'), sn.deductionCarried, 'mdi-arrow-right-bold-circle-outline', sn.deductionCarried > 0 ? 'red' : 'neutral')
  const loss = sn.lossAmount ?? snapshotTarget.value?.lossAmount
  if (loss > 0) add('loss', t('settleLossAmount'), loss, 'mdi-alert-circle-outline', 'red')
  return items
})
const snapRecoveredPct = computed(() => {
  const sn = snapshotTarget.value?.snapshot
  if (!sn || typeof sn.deductionAllocated !== 'number' || typeof sn.deductionCarried !== 'number') return null
  const total = sn.deductionAllocated + sn.deductionCarried
  return total > 0 ? Math.round((sn.deductionAllocated / total) * 100) : null
})
const companyPaymentSummary = ref({
  totalPaidAmount: 0,
  totalReceiptAmount: 0,
  totalUnallocatedAmount: 0,
  totalArchivedAllocatedAmount: 0,
  totalPendingToPay: 0,
  totalDeductionNeedToGet: 0,
  totalDeductionCollected: 0,
  totalPayableAmount: 0,
})
function defaultCompanyPaymentForm() {
  return { transactionType: 'payment', date: today(), amount: null, mode: 'bank', notes: '' }
}

const companyPaymentForm = ref(defaultCompanyPaymentForm())
const editingPaymentId = ref(null)
const paymentAmountInWords = computed(() => numToWords(companyPaymentForm.value.amount))
const surplusAvailable = computed(() => Math.floor(Math.max(0, Number(companyPaymentSummary.value.companyBalance || 0)) * 100) / 100)

const paymentTotalAmount = computed(() => {
  return companyPaymentRows.value
    .filter(r => r.transactionType !== 'deduction' && r.transactionType !== 'loss')
    .reduce((sum, r) => sum + Number(r.amount || 0), 0)
})
const deductionTotalAmount = computed(() => {
  return companyPaymentRows.value
    .filter(r => r.transactionType === 'deduction')
    .reduce((sum, r) => sum + Number(r.amount || 0), 0)
})
const companyPaymentFooterRows = computed(() => {
  if (!companyPaymentRows.value.length) return []
  return [{
    __isFooter: true,
    transactionType: '',
    date: '',
    mode: 'Total',
    amount: paymentTotalAmount.value + deductionTotalAmount.value,
    notes: '',
    _actions: '',
  }]
})
function shareOfPayable(value) {
  const payable = Number(companyPaymentSummary.value.totalPayableAmount || 0)
  if (payable <= 0) return 0
  return Math.max(0, Math.round((Number(value || 0) / payable) * 100))
}

const companyPaymentCards = computed(() => [
  { label: t('dbTotalPayable'), value: fmt(companyPaymentSummary.value.totalPayableAmount || 0), tone: 'payable', toneClass: 'pay-tone-blue', icon: 'mdi-wallet-outline', sub: t('dbAmtToBePaid') },
  { label: t('dbTotalReceipt'), value: fmt(companyPaymentSummary.value.totalReceiptAmount || 0), tone: 'paid', toneClass: 'pay-tone-green', icon: 'mdi-check-circle-outline', sub: t('dbAmtReceived') },
  { label: t('pending'), value: fmt(companyPaymentSummary.value.totalPendingToPay || 0), tone: 'pending', toneClass: 'pay-tone-orange', icon: 'mdi-clock-outline', sub: t('dbYetToReceive') },
  { label: t('dbDedToGet'), value: fmt(companyPaymentSummary.value.totalDeductionNeedToGet || 0), tone: 'deduction', toneClass: 'pay-tone-red', icon: 'mdi-minus-circle-outline', sub: t('dbToBeDeducted') },
  { label: t('dbTotalAllocated'), value: fmt(companyPaymentSummary.value.totalPaidAmount || 0), tone: 'paid', toneClass: 'pay-tone-blue', icon: 'mdi-layers-outline', sub: t('dbPctOfTotal', { v: shareOfPayable(companyPaymentSummary.value.totalPaidAmount) }) },
  { label: t('dbUnallocated'), value: fmt(companyPaymentSummary.value.totalUnallocatedAmount || 0), tone: '', toneClass: 'pay-tone-blue', icon: 'mdi-cube-outline', sub: t('dbPctOfTotal', { v: shareOfPayable(companyPaymentSummary.value.totalUnallocatedAmount) }) },
  { label: t('dbArchived'), value: fmt(companyPaymentSummary.value.totalArchivedAllocatedAmount || 0), tone: '', toneClass: 'pay-tone-blue', icon: 'mdi-archive-outline', sub: t('dbArchivedSub') },
  { label: t('dbRejectedMeter'), value: `${fmtN(selectedCompany.value?.rejectedMeter || 0)} m`, tone: 'meter-lost', toneClass: 'pay-tone-red', icon: 'mdi-alert-outline', sub: t('dbPctOfProduced', { v: pct(selectedCompany.value?.rejectedMeter || 0, selectedCompany.value?.producedMeter || 0) }) },
  { label: t('dbRejectionLoss'), value: fmt(selectedCompany.value?.totalRejectionGrossLoss || 0), tone: 'loss', toneClass: 'pay-tone-red', icon: 'mdi-trending-down', sub: t('dbPctOfPayable', { v: shareOfPayable(selectedCompany.value?.totalRejectionGrossLoss) }) },
])
const transactionTypeItems = computed(() => [
  { title: t('dbPaymentReceived'), value: 'payment' },
  { title: t('dbPaymentLoss'), value: 'payment_loss' },
  { title: t('dbPaymentSurplus'), value: 'payment_surplus' },
  { title: t('dbDeductionReceived'), value: 'deduction' },
  { title: t('dbDeductionLoss'), value: 'deduction_loss' },
])

// ── Payment history search + pagination (client-side, presentation only) ──
const companyPaymentSearch = ref('')
const companyPaymentTypeFilter = ref('all')
const paymentTypeFilterItems = computed(() => [
  { title: t('dbAllEntries'), value: 'all', icon: 'mdi-format-list-bulleted' },
  { title: t('dbReceiptsOnly'), value: 'receipt', icon: 'mdi-plus-circle-outline' },
  { title: t('dbDeductionsOnly'), value: 'deduction', icon: 'mdi-minus-circle-outline' },
  { title: t('dbLossesOnly'), value: 'loss', icon: 'mdi-alert-circle-outline' },
])
const companyPaymentPage = ref(1)
const companyPaymentPageSize = 8
const pdFormRef = ref(null)
const pdHistoryRef = ref(null)

const filteredCompanyPaymentRows = computed(() => {
  const term = String(companyPaymentSearch.value || '').trim().toLowerCase()
  const typeFilter = companyPaymentTypeFilter.value
  return companyPaymentRows.value.filter(row => {
    const isDeduction = row.transactionType === 'deduction'
    const isLoss = row.transactionType === 'loss'
    if (typeFilter === 'receipt' && (isDeduction || isLoss)) return false
    if (typeFilter === 'deduction' && !isDeduction) return false
    if (typeFilter === 'loss' && !isLoss) return false
    if (!term) return true
    const type = isLoss ? 'loss' : isDeduction ? 'deduction' : 'receipt payment'
    const mode = isDeduction || isLoss ? '' : String(t(row.mode || 'cash') || '') + ' ' + String(row.mode || '')
    const haystack = [type, mode, row.notes, fmtDate(row.date), String(row.amount ?? ''), fmt(row.amount || 0)]
      .join(' ')
      .toLowerCase()
    return haystack.includes(term)
  })
})

const companyPaymentPageCount = computed(() => Math.max(1, Math.ceil(filteredCompanyPaymentRows.value.length / companyPaymentPageSize)))
const companyPaymentPageStart = computed(() => (companyPaymentPage.value - 1) * companyPaymentPageSize)
const pagedCompanyPaymentRows = computed(() =>
  filteredCompanyPaymentRows.value.slice(companyPaymentPageStart.value, companyPaymentPageStart.value + companyPaymentPageSize)
)

const companyPaymentPageItems = computed(() => {
  const total = companyPaymentPageCount.value
  const current = companyPaymentPage.value
  if (total <= 5) return Array.from({ length: total }, (_, i) => ({ key: i + 1, page: i + 1 }))
  const pages = new Set([1, total, current - 1, current, current + 1].filter(p => p >= 1 && p <= total))
  const sorted = [...pages].sort((a, b) => a - b)
  const items = []
  sorted.forEach((p, idx) => {
    if (idx > 0 && p - sorted[idx - 1] > 1) items.push({ key: `gap-${p}`, gap: true })
    items.push({ key: p, page: p })
  })
  return items
})

watch([filteredCompanyPaymentRows, companyPaymentPageCount], () => {
  if (companyPaymentPage.value > companyPaymentPageCount.value) companyPaymentPage.value = companyPaymentPageCount.value
})
watch(companyPaymentSearch, () => { companyPaymentPage.value = 1 })
watch(companyPaymentTypeFilter, () => { companyPaymentPage.value = 1 })

const recentCompanyPayments = computed(() => companyPaymentRows.value.filter(r => r.transactionType !== 'loss').slice(0, 4))

const paymentOverviewLegend = computed(() => {
  const s = companyPaymentSummary.value
  return [
    { label: t('dbReceived'), value: Number(s.totalReceiptAmount || 0), pct: shareOfPayable(s.totalReceiptAmount), toneClass: 'pay-tone-green', color: '#2E7D32' },
    { label: t('pending'), value: Number(s.totalPendingToPay || 0), pct: shareOfPayable(s.totalPendingToPay), toneClass: 'pay-tone-orange', color: '#F57C00' },
    { label: t('dbDeduction'), value: Number(s.totalDeductionNeedToGet || 0), pct: shareOfPayable(s.totalDeductionNeedToGet), toneClass: 'pay-tone-red', color: '#E53935' },
    { label: t('dbUnallocated'), value: Number(s.totalUnallocatedAmount || 0), pct: shareOfPayable(s.totalUnallocatedAmount), toneClass: 'pay-tone-blue', color: '#90CAF9' },
  ]
})

// Donut segments are proportional to each other (display only); legend % stays relative to payable
const paymentOverviewDonut = computed(() => {
  const items = paymentOverviewLegend.value.filter(i => i.value > 0)
  const total = items.reduce((s, i) => s + i.value, 0)
  if (total <= 0) return 'conic-gradient(#E2E8F0 0 100%)'
  let cursor = 0
  const stops = items.map(i => {
    const start = cursor
    cursor += (i.value / total) * 100
    return `${i.color} ${start.toFixed(2)}% ${cursor.toFixed(2)}%`
  })
  return `conic-gradient(${stops.join(', ')})`
})

function settleBlockedReason(company) {
  const due = Number(company?.settleDeductionDue || 0)
  if (due > 0.01) return t('settleDedRequiredTip', { amount: fmt(due) })
  return t('settleNoOrdersTip')
}

function fmtCompact(value) {
  const n = Number(value || 0)
  const abs = Math.abs(n)
  if (abs >= 1e7) return `₹${(n / 1e7).toFixed(2).replace(/\.?0+$/, '')}Cr`
  if (abs >= 1e5) return `₹${(n / 1e5).toFixed(2).replace(/\.?0+$/, '')}L`
  if (abs >= 1e3) return `₹${(n / 1e3).toFixed(1).replace(/\.?0+$/, '')}K`
  return fmt(n)
}

function viewAllCompanyPayments() {
  companyPaymentSearch.value = ''
  companyPaymentPage.value = 1
  nextTick(() => pdHistoryRef.value?.scrollIntoView?.({ behavior: 'smooth', block: 'start' }))
}

const expandedCompanyIds = ref([])
const expandedInitialized = ref(false)
const highlightOrderId = ref(null)
const dashboardSearch = ref('')
let pendingDashboardUiState = null

function readDashboardUiStateFromQuery() {
  const stateKey = String(route.query.drs || '').trim()
  if (!stateKey) {
    pendingDashboardUiState = null
    return
  }

  try {
    const raw = sessionStorage.getItem(stateKey)
    if (!raw) {
      pendingDashboardUiState = null
      return
    }
    pendingDashboardUiState = JSON.parse(raw)
  } catch {
    pendingDashboardUiState = null
  }
}

function createDashboardUiSnapshot() {
  const snapshot = {
    expandedCompanyIds: [...expandedCompanyIds.value],
    pageScrollY: Number(window.scrollY || window.pageYOffset || 0),
  }
  const key = `dashboard-ui-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  try {
    sessionStorage.setItem(key, JSON.stringify(snapshot))
  } catch {
    return ''
  }
  return key
}

function applyPendingDashboardUiState() {
  if (!pendingDashboardUiState) return

  const companyIds = companyGroups.value.map(row => row.companyId)
  const requestedCompanyId = String(route.query.expandCompany || '').trim()
  if (requestedCompanyId && companyIds.includes(requestedCompanyId)) {
    // Opened from an order: show only that order's company
    expandedCompanyIds.value = [requestedCompanyId]
  } else if (Array.isArray(pendingDashboardUiState.expandedCompanyIds)) {
    expandedCompanyIds.value = pendingDashboardUiState.expandedCompanyIds.filter(id => companyIds.includes(id))
  }

  const pageScrollY = Number(pendingDashboardUiState.pageScrollY || 0)
  requestAnimationFrame(() => {
    if (pageScrollY > 0) window.scrollTo({ top: pageScrollY, behavior: 'auto' })
    scrollToHighlightedOrder()
  })

  pendingDashboardUiState = null
}

let highlightTimer = null

function scrollToHighlightedOrder(attempt = 0) {
  const orderId = String(route.query.highlightOrder || '').trim()
  if (!orderId) return
  const el = document.querySelector(`tr[data-order-id="${orderId}"]`)
  if (!el || !el.getClientRects().length) {
    // Row appears only after its company is expanded and data renders
    if (attempt < 100) setTimeout(() => scrollToHighlightedOrder(attempt + 1), 150)
    return
  }
  highlightOrderId.value = orderId
  el.scrollIntoView({ behavior: 'instant', block: 'center' })
  clearTimeout(highlightTimer)
  highlightTimer = setTimeout(() => { highlightOrderId.value = null }, 4000)

  // Layout can shift while the company panel expands and data reloads; re-centre a few times if the row drifted
  if (attempt === 0) {
    ;[300, 800, 1500, 2500].forEach(delay => {
      setTimeout(() => {
        const current = document.querySelector(`tr[data-order-id="${orderId}"]`)
        if (!current || !current.getClientRects().length) return
        const rect = current.getBoundingClientRect()
        if (rect.top < 0 || rect.bottom > window.innerHeight) current.scrollIntoView({ behavior: 'instant', block: 'center' })
      }, delay)
    })
  }
}

const dashboardStats = computed(() => dashboardStore.stats || {})
const totalExpectedMeter = computed(() => Number(dashboardStats.value.companyOrderSummary?.reduce((s, c) => s + Number(c.expectedMeter || 0), 0) || 0))
const totalProducedMeter = computed(() => Number(dashboardStats.value.companyOrderSummary?.reduce((s, c) => s + Number(c.producedMeter || 0), 0) || 0))
const totalPendingAmount = computed(() => Number(dashboardStats.value.pendingAmount || 0))
const totalPayableAmount = computed(() => Number(dashboardStats.value.companyOrderSummary?.reduce((s, c) => s + Number(c.totalPayableAmount || 0), 0) || 0))
const totalPaidAmount = computed(() => Number(dashboardStats.value.companyOrderSummary?.reduce((s, c) => s + Number(c.totalPaidAmount || 0), 0) || 0))
const collectionPct = computed(() => {
  if (totalPayableAmount.value <= 0) return 0
  return Math.max(0, Math.min(100, Math.round((totalPaidAmount.value / totalPayableAmount.value) * 1000) / 10))
})

const insights = computed(() => [
  {
    label: t('dbProductionOutput'),
    value: fmtN(totalProducedMeter.value) + ' m',
    sub: t('dbAgainstTarget', { v: fmtN(totalExpectedMeter.value) + ' m' }),
    supportA: t('dbRemainingV', { v: fmtN(Math.max(0, totalExpectedMeter.value - totalProducedMeter.value)) + ' m' }),
    supportB: t('dbLostV', { v: fmtN(dashboardStats.value.totalRejectedMeter || 0) + ' m' }),
    progress: globalProductionPct.value,
    tone: 'tone-blue', iconTone: 'icon-blue', icon: 'mdi-factory',
  },
  {
    label: t('dbPendingCollection'),
    value: fmt(totalPendingAmount.value),
    sub: t('dbCompaniesFollowUp', { n: dashboardStats.value.pendingPaymentCount || 0 }),
    supportA: t('dbPayableV', { v: fmt(totalPayableAmount.value) }),
    supportB: t('dbCollectedPct', { v: collectionPct.value }),
    progress: collectionPct.value,
    tone: 'tone-orange', iconTone: 'icon-orange', icon: 'mdi-clock-alert-outline',
  },
  {
    label: t('dbMonthlyReceipt'),
    value: fmt(dashboardStats.value.monthlyReceipt || 0),
    sub: t('dbReceivedThisMonth'),
    supportA: t('dbTotalPaidV', { v: fmt(totalPaidAmount.value) }),
    supportB: t('dbUnallocatedV', { v: fmt(companyGlobal.value.totalUnallocated || 0) }),
    progress: totalPayableAmount.value > 0 ? Math.max(0, Math.min(100, Math.round(((dashboardStats.value.monthlyReceipt || 0) / totalPayableAmount.value) * 1000) / 10)) : 0,
    tone: 'tone-green', iconTone: 'icon-green', icon: 'mdi-trending-up',
  },
  {
    label: t('dbDeductionBalance'),
    value: fmt(dashboardStats.value.deductionHoldAmount || 0),
    sub: t('dbDeductionStillToCollect'),
    supportA: t('dbCollectedV', { v: fmt(dashboardStats.value.companyOrderSummary?.reduce((s, c) => s + Number(c.totalDeductionCollected || 0), 0) || 0) }),
    supportB: t('dbRejectionLossV', { v: fmt(dashboardStats.value.totalRejectionGrossLoss || 0) }),
    progress: (() => {
      const totalNeed = Number((dashboardStats.value.companyOrderSummary || []).reduce((s, c) => s + Number(c.totalDeductionNeedToGet || 0) + Number(c.totalDeductionCollected || 0), 0))
      const collected = Number((dashboardStats.value.companyOrderSummary || []).reduce((s, c) => s + Number(c.totalDeductionCollected || 0), 0))
      if (totalNeed <= 0) return 0
      return Math.max(0, Math.min(100, Math.round((collected / totalNeed) * 1000) / 10))
    })(),
    tone: 'tone-violet', iconTone: 'icon-violet', icon: 'mdi-hand-coin-outline',
  },
])

const globalProductionPct = computed(() => {
  const expected = Number(dashboardStats.value.companyOrderSummary?.reduce((sum, row) => sum + Number(row.expectedMeter || 0), 0) || 0)
  const produced = Number(dashboardStats.value.companyOrderSummary?.reduce((sum, row) => sum + Number(row.producedMeter || 0), 0) || 0)
  if (expected <= 0) return 0
  return Math.max(0, Math.min(100, Math.round((produced / expected) * 100)))
})

// ── Charts & insights (presentation only) ──────────────────────────────
const analyticsData = ref(null)
const analyticsLoading = ref(false)

// ── Analytics period (Indian FY = Apr–Mar) ──
const PERIOD_KEY = 'at-dashboard-period'
const periodPresets = computed(() => [
  { key: 'thisMonth', label: t('dbPresetThisMonth') },
  { key: 'last3', label: t('dbPreset3Months') },
  { key: 'thisFY', label: t('dbPresetThisFY') },
  { key: 'lastFY', label: t('dbPresetLastFY') },
  { key: 'thisYear', label: t('dbPresetCalYear') },
])
function readStoredPeriod() {
  try { return JSON.parse(localStorage.getItem(PERIOD_KEY) || 'null') } catch { return null }
}
const period = ref(readStoredPeriod() || { preset: 'thisFY', from: '', to: '' })
const customPeriodMenu = ref(false)
const customPeriodRef = ref(null)
const customDraft = ref({ from: period.value.from || '', to: period.value.to || '' })

function toggleCustomPeriod() {
  customPeriodMenu.value = !customPeriodMenu.value
  if (customPeriodMenu.value) customDraft.value = { from: period.value.from || '', to: period.value.to || '' }
}
function onDocumentClick(e) {
  if (customPeriodMenu.value && customPeriodRef.value && !customPeriodRef.value.contains(e.target)) customPeriodMenu.value = false
}
onMounted(() => document.addEventListener('mousedown', onDocumentClick))
onBeforeUnmount(() => document.removeEventListener('mousedown', onDocumentClick))

function isoDate(d) {
  const x = new Date(d)
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`
}
function fyStartYear(d) { return d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1 }
function periodRange(p) {
  const now = new Date()
  switch (p.preset) {
    case 'thisMonth': return { from: isoDate(new Date(now.getFullYear(), now.getMonth(), 1)), to: isoDate(now) }
    case 'last3': return { from: isoDate(new Date(now.getFullYear(), now.getMonth() - 2, 1)), to: isoDate(now) }
    case 'thisYear': return { from: isoDate(new Date(now.getFullYear(), 0, 1)), to: isoDate(now) }
    case 'thisFY': { const y = fyStartYear(now); return { from: `${y}-04-01`, to: isoDate(now) } }
    case 'lastFY': { const y = fyStartYear(now) - 1; return { from: `${y}-04-01`, to: `${y + 1}-03-31` } }
    case 'custom': return { from: p.from, to: p.to }
    default: return { from: '', to: '' }
  }
}
const periodLabel = computed(() => {
  const p = period.value
  const now = new Date()
  if (p.preset === 'thisFY') { const y = fyStartYear(now); return t('dbFYLabel', { a: y, b: String(y + 1).slice(2) }) }
  if (p.preset === 'lastFY') { const y = fyStartYear(now) - 1; return t('dbFYLabel', { a: y, b: String(y + 1).slice(2) }) }
  if (p.preset === 'thisYear') return String(now.getFullYear())
  if (p.preset === 'thisMonth') return now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
  if (p.preset === 'last3') return t('dbLast3Months')
  if (p.preset === 'custom' && p.from && p.to) return `${fmtDate(p.from)} – ${fmtDate(p.to)}`
  return ''
})
const customRangeLabel = computed(() => period.value.from && period.value.to ? `${fmtDate(period.value.from)} – ${fmtDate(period.value.to)}` : t('dbCustom'))
// Remount multi-axis charts once new data lands; updateOptions drops yaxis formatter functions

function persistPeriod() {
  try { localStorage.setItem(PERIOD_KEY, JSON.stringify(period.value)) } catch { /* storage unavailable */ }
}
function setPeriodPreset(key) {
  if (period.value.preset === key) return
  period.value = { preset: key, from: '', to: '' }
  persistPeriod()
  loadAnalytics()
}
function applyCustomPeriod() {
  if (!customDraft.value.from || !customDraft.value.to) return
  const from = customDraft.value.from <= customDraft.value.to ? customDraft.value.from : customDraft.value.to
  const to = customDraft.value.from <= customDraft.value.to ? customDraft.value.to : customDraft.value.from
  period.value = { preset: 'custom', from, to }
  customPeriodMenu.value = false
  persistPeriod()
  loadAnalytics()
}

async function loadAnalytics() {
  analyticsLoading.value = true
  try {
    const { from, to } = periodRange(period.value)
    const params = {}
    if (from) params.from = from
    if (to) params.to = to
    analyticsData.value = (await api.get('/analytics', { params })).data
  } catch (error) {
    analyticsData.value = null
    notify.apiError(error, t('analyticsLoadFailed'))
  } finally {
    analyticsLoading.value = false
  }
}

// ── Monthly targets ──
const targets = ref({ monthlyProductionMeter: 0, monthlyCollectionAmount: 0, maxRejectionPct: 3 })
const targetDialog = ref(false)
const targetSaving = ref(false)
const targetError = ref('')
const targetForm = ref({ ...targets.value })

async function loadTargets() {
  try { targets.value = { ...targets.value, ...(await api.get('/settings/targets')).data } } catch { /* keep defaults */ }
}
function openTargetDialog() {
  targetForm.value = { ...targets.value }
  targetError.value = ''
  targetDialog.value = true
}
async function saveTargets() {
  targetError.value = ''
  const body = {
    monthlyProductionMeter: Number(targetForm.value.monthlyProductionMeter || 0),
    monthlyCollectionAmount: Number(targetForm.value.monthlyCollectionAmount || 0),
    maxRejectionPct: Number(targetForm.value.maxRejectionPct ?? 3),
  }
  if (Object.values(body).some(v => !Number.isFinite(v) || v < 0)) { targetError.value = t('valNonNegative'); return }
  if (body.maxRejectionPct > 100) { targetError.value = t('valPercent'); return }
  targetSaving.value = true
  try {
    targets.value = { ...targets.value, ...(await api.put('/settings/targets', body)).data }
    targetDialog.value = false
    notify.success(t('targetsSaved'))
  } catch (e) {
    targetError.value = e?.response?.data?.message || t('targetsSaveFailed')
    notify.apiError(e, t('targetsSaveFailed'))
  } finally {
    targetSaving.value = false
  }
}

const hasTargets = computed(() => Number(targets.value.monthlyProductionMeter || 0) > 0 || Number(targets.value.monthlyCollectionAmount || 0) > 0)
const monthComparison = computed(() => analyticsData.value?.monthComparison || {})
const targetAsOf = computed(() => analyticsData.value?.period?.asOf ? new Date(analyticsData.value.period.asOf) : new Date())
const targetMonthLabel = computed(() => targetAsOf.value.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }))
const targetDaysInfo = computed(() => {
  const d = targetAsOf.value
  const daysInMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
  const elapsed = Math.max(1, d.getDate())
  return { daysInMonth, elapsed, left: Math.max(0, daysInMonth - elapsed), pacePct: Math.round((elapsed / daysInMonth) * 100) }
})
const targetDaysNote = computed(() => {
  const i = targetDaysInfo.value
  return analyticsData.value?.period?.isHistorical ? t('dbAsOf', { v: fmtDate(targetAsOf.value) }) : `${t('dbDayProgress', { a: i.elapsed, b: i.daysInMonth })} · ${t('dbDaysLeft', { n: i.left })}`
})

function buildTargetCard({ key, label, actual, target, color, format }) {
  const info = targetDaysInfo.value
  const pct = target > 0 ? Math.round((actual / target) * 1000) / 10 : 0
  const projected = info.elapsed > 0 ? Math.round((actual / info.elapsed) * info.daysInMonth) : 0
  const needPerDay = info.left > 0 ? Math.max(0, Math.ceil((target - actual) / info.left)) : 0
  let status = 'on-track'
  let statusLabel = t('dbOnTrack')
  if (pct >= 100) { status = 'achieved'; statusLabel = t('dbTargetAchieved') }
  else if (pct + 5 < info.pacePct) { status = 'behind'; statusLabel = t('dbBehindPace', { v: Math.round(info.pacePct - pct) }) }
  else if (pct > info.pacePct + 5) { status = 'ahead'; statusLabel = t('dbAheadOfPace') }
  const forecastText = pct >= 100
    ? t('dbFinishedAbove', { v: format(actual - target) })
    : info.left > 0
      ? t('dbProjectedNeed', { v: format(projected), n: format(needPerDay) })
      : t('dbMonthClosedAt', { v: pct })
  return { key, label, actual, target, pct, color, format, status, statusLabel, forecastText, pacePct: info.pacePct }
}

const targetCards = computed(() => {
  const cards = []
  const prodTarget = Number(targets.value.monthlyProductionMeter || 0)
  const collTarget = Number(targets.value.monthlyCollectionAmount || 0)
  if (prodTarget > 0) cards.push(buildTargetCard({ key: 'prod', label: t('dbProduction'), actual: Number(analyticsData.value?.production?.thisMonth || 0), target: prodTarget, color: '#6366F1', format: v => `${fmtN(Math.round(v))} m` }))
  if (collTarget > 0) cards.push(buildTargetCard({ key: 'coll', label: t('dbCollection'), actual: Number(analyticsData.value?.receipts?.thisMonth || 0), target: collTarget, color: '#10B981', format: v => fmtCompact(v) }))
  const maxRej = Number(targets.value.maxRejectionPct || 0)
  if (maxRej > 0) {
    const rate = Number(analyticsData.value?.production?.rejectionRate || 0)
    const within = rate <= maxRej
    cards.push({
      key: 'rej', label: t('dbRejectionLimit'), actual: rate, target: maxRej, color: within ? '#10B981' : '#F43F5E',
      pct: maxRej > 0 ? Math.round((rate / maxRej) * 100) : 0, format: v => `${Number(v).toFixed(1)}%`,
      status: within ? 'achieved' : 'behind', statusLabel: within ? t('dbWithinLimit') : t('dbOverLimitBy', { v: (rate - maxRej).toFixed(1) }),
      forecastText: within ? t('dbHeadroom', { v: (maxRej - rate).toFixed(1) }) : t('dbReviewReasons'), pacePct: null,
    })
  }
  return cards
})

function targetRingOptions(tg) {
  return ringOptions(tg.color, '#F1F5F9', '62%', tg.color, '15px')
}

// ── Rejection reasons ──
const REASON_COLORS = ['#F43F5E', '#F97316', '#F59E0B', '#8B5CF6', '#0EA5E9', '#14B8A6', '#EC4899', '#94A3B8']
const reasonRows = computed(() => {
  const rows = (analyticsData.value?.rejectionsByReason || []).filter(r => Number(r.qty || 0) > 0).slice(0, 8)
  const total = rows.reduce((s, r) => s + Number(r.qty || 0), 0)
  return rows.map((r, i) => ({ ...r, pct: total > 0 ? Math.round((Number(r.qty) / total) * 100) : 0, color: r.reason === 'Unspecified' ? '#94A3B8' : REASON_COLORS[i % REASON_COLORS.length] }))
})
const reasonTotalQty = computed(() => reasonRows.value.reduce((s, r) => s + Number(r.qty || 0), 0))
const reasonSeries = computed(() => reasonRows.value.map(r => Math.round(Number(r.qty || 0))))
const reasonOptions = computed(() => ({
  chart: { type: 'donut', fontFamily: CHART_FONT, animations: { speed: 700 } },
  labels: reasonRows.value.map(r => r.reason),
  colors: reasonRows.value.map(r => r.color),
  legend: { show: false },
  dataLabels: { enabled: false },
  stroke: { width: 3, colors: ['#fff'] },
  plotOptions: { pie: { donut: { size: '72%', labels: { show: true, name: { show: true, fontSize: '11px', color: '#94A3B8', fontWeight: 600, offsetY: 16 }, value: { show: true, fontSize: '15px', fontWeight: 800, color: '#0F172A', offsetY: -12, formatter: v => `${fmtN(v)} m` }, total: { show: true, label: t('dbRejectedTotal'), fontSize: '11px', color: '#94A3B8', formatter: () => `${fmtN(reasonTotalQty.value)} m` } } } } },
  tooltip: { y: { formatter: (v, { seriesIndex }) => `${fmtN(v)} m · ${reasonRows.value[seriesIndex]?.count || 0} entries · ${fmtCompact(reasonRows.value[seriesIndex]?.loss || 0)}` } },
}))

const CHART_FONT = 'Inter, Roboto, system-ui, sans-serif'
const TONE_HEX = { 'tone-blue': '#3B82F6', 'tone-orange': '#F97316', 'tone-green': '#10B981', 'tone-violet': '#8B5CF6' }

function ringOptions(color, track = '#EEF2FF', size = '58%', labelColor = '#1E293B', fontSize = '15px') {
  return {
    chart: { type: 'radialBar', sparkline: { enabled: true }, animations: { speed: 700 }, fontFamily: CHART_FONT },
    plotOptions: {
      radialBar: {
        hollow: { size },
        track: { background: track, strokeWidth: '100%' },
        dataLabels: {
          name: { show: false },
          value: { show: true, offsetY: 5, fontSize, fontWeight: 800, color: labelColor, formatter: v => `${Math.round(v)}%` },
        },
      },
    },
    fill: { type: 'gradient', gradient: { shade: 'light', type: 'horizontal', gradientToColors: [color], stops: [0, 100] } },
    colors: [color],
    stroke: { lineCap: 'round' },
  }
}

const collectionRingOptions = computed(() => ringOptions('#FBBF24', 'rgba(255,255,255,0.16)', '56%', '#fff', '14px'))
function insightRingOptions(tone) {
  return ringOptions(TONE_HEX[tone] || '#3B82F6', '#F1F5F9', '60%', TONE_HEX[tone] || '#1E293B', '14px')
}

const moneySplitLegend = computed(() => {
  const g = companyGlobal.value
  return [
    { label: t('dbReceived'), value: Number(g.totalPaid || 0), color: '#10B981' },
    { label: t('pending'), value: Number(g.totalPending || 0), color: '#F97316' },
    { label: t('dbUnallocated'), value: Number(g.totalUnallocated || 0), color: '#38BDF8' },
    { label: t('dbDeductionToGet'), value: Number(g.totalDeduction || 0), color: '#EF4444' },
  ]
})
const moneySplitSeries = computed(() => moneySplitLegend.value.map(i => Math.max(0, Math.round(i.value))))
const moneySplitOptions = computed(() => ({
  chart: { type: 'donut', fontFamily: CHART_FONT, animations: { speed: 700 } },
  labels: moneySplitLegend.value.map(i => i.label),
  colors: moneySplitLegend.value.map(i => i.color),
  legend: { show: false },
  dataLabels: { enabled: false },
  stroke: { width: 3, colors: ['#fff'] },
  plotOptions: {
    pie: {
      donut: {
        size: '74%',
        labels: {
          show: true,
          name: { show: true, fontSize: '11px', color: '#94A3B8', fontWeight: 600, offsetY: 18 },
          value: { show: true, fontSize: '17px', fontWeight: 800, color: '#0F172A', offsetY: -14, formatter: v => fmtCompact(v) },
          total: { show: true, label: t('dbPayableLabel'), fontSize: '11px', color: '#94A3B8', formatter: () => fmtCompact(companyGlobal.value.totalPayable || 0) },
        },
      },
    },
  },
  tooltip: { y: { formatter: v => fmt(v) } },
}))

const topProgressCompanies = computed(() =>
  [...companyGroups.value]
    .filter(c => Number(c.expectedMeter || 0) > 0)
    .sort((a, b) => Number(b.expectedMeter || 0) - Number(a.expectedMeter || 0))
    .slice(0, 7)
)
const progressBarCategories = computed(() => topProgressCompanies.value.map(c => c.companyName))
const progressBarSeries = computed(() => [
  { name: t('dbSeriesProduced'), data: topProgressCompanies.value.map(c => Math.round(Number(c.producedMeter || 0))) },
  { name: t('dbSeriesExpected'), data: topProgressCompanies.value.map(c => Math.round(Number(c.expectedMeter || 0))) },
])
const progressBarOptions = computed(() => ({
  chart: { type: 'bar', toolbar: { show: false }, fontFamily: CHART_FONT, animations: { speed: 700 } },
  colors: ['#6366F1', '#C7D2FE'],
  plotOptions: { bar: { columnWidth: '48%', borderRadius: 6, borderRadiusApplication: 'end' } },
  dataLabels: { enabled: false },
  legend: { position: 'top', horizontalAlign: 'right', fontSize: '11px', fontWeight: 600, markers: { radius: 12 }, labels: { colors: '#64748B' } },
  grid: { borderColor: '#EEF2F7', strokeDashArray: 4 },
  xaxis: { categories: progressBarCategories.value, labels: { style: { colors: '#334155', fontSize: '10px', fontWeight: 600 }, rotate: -25, trim: true, hideOverlappingLabels: false }, axisBorder: { show: false }, axisTicks: { show: false } },
  yaxis: { labels: { style: { colors: '#94A3B8', fontSize: '10px' }, formatter: v => fmtN(Math.round(v)) } },
  tooltip: { shared: true, intersect: false, y: { formatter: v => `${fmtN(v)} m` } },
}))

const attentionItems = computed(() => {
  const items = []
  for (const c of companyGroups.value) {
    const payable = Number(c.totalPayableAmount || 0)
    const pending = Number(c.totalPendingToPay || 0)
    const settle = companySettlePct(c)
    if (c.balanceAlert) {
      items.push({ key: `bal-${c.companyId}`, companyId: c.companyId, tone: 'red', icon: 'mdi-alert-circle-outline', title: `${c.companyName} · ${t('dbIssueShortBalance')}`, desc: t('shortBalanceAlert', { count: c.pendingCloseCount, amount: fmtCompact(c.pendingCloseTotal), unallocated: fmtCompact(c.totalUnallocatedAmount) }) })
    } else if (c.pendingCloseCount > 0) {
      items.push({ key: `close-${c.companyId}`, companyId: c.companyId, tone: 'green', icon: 'mdi-check-decagram-outline', title: `${c.companyName} · ${t('dbIssueReadyClose')}`, desc: t('dbReadyCloseDesc', { n: c.pendingCloseCount, v: fmtCompact(c.pendingCloseTotal) }) })
    }
    if (payable > 0 && settle < 50 && pending > 0) {
      items.push({ key: `coll-${c.companyId}`, companyId: c.companyId, tone: 'orange', icon: 'mdi-cash-clock', title: `${c.companyName} · ${t('dbIssueLowCollection')}`, desc: t('dbLowCollDesc', { p: settle, v: fmtCompact(pending) }) })
    }
    if (Number(c.rejectedMeter || 0) > 0 && Number(c.producedMeter || 0) > 0 && pct(c.rejectedMeter, Number(c.producedMeter) + Number(c.rejectedMeter)) >= 3) {
      items.push({ key: `rej-${c.companyId}`, companyId: c.companyId, tone: 'violet', icon: 'mdi-close-octagon-outline', title: `${c.companyName} · ${t('dbIssueHighRejection')}`, desc: t('dbHighRejDesc', { m: fmtN(c.rejectedMeter), v: fmtCompact(c.totalRejectionGrossLoss) }) })
    }
  }
  const rank = { red: 0, orange: 1, violet: 2, green: 3 }
  return items.sort((a, b) => rank[a.tone] - rank[b.tone]).slice(0, 8)
})

function focusCompany(companyId) {
  if (!companyId) return
  if (!isCompanyExpanded(companyId)) expandedCompanyIds.value = [...expandedCompanyIds.value, companyId]
  nextTick(() => {
    const idx = filteredCompanyGroups.value.findIndex(c => c.companyId === companyId)
    const el = document.querySelectorAll('.company-card')[idx]
    el?.scrollIntoView?.({ behavior: 'smooth', block: 'start' })
  })
}

function fmtWhole(v) {
  return fmt(Math.round(Number(v || 0)))
}

function deltaClass(delta, invert = false) {
  const n = Number(delta || 0)
  if (n === 0) return 'flat'
  const positive = invert ? n < 0 : n > 0
  return positive ? 'up' : 'down'
}

function healthLabel(health) {
  return health === 'critical' ? t('dbHealthCritical') : health === 'follow' ? t('dbHealthFollow') : t('dbHealthy')
}

function relativeDay(date) {
  if (!date) return '-'
  const d = new Date(date); d.setHours(0, 0, 0, 0)
  const now = new Date(); now.setHours(0, 0, 0, 0)
  const diff = Math.round((now - d) / 86400000)
  if (diff <= 0) return t('dbToday')
  if (diff === 1) return t('dbYesterday')
  if (diff < 7) return t('dbDaysAgo', { n: diff })
  return fmtDate(date)
}

const pulseTiles = computed(() => {
  const a = analyticsData.value || {}
  const wk = a.weeklyComparison || {}
  const prod = a.production || {}
  const rec = a.receipts || {}
  const td = a.todayActivity || {}
  const os = a.orderStatus || {}
  const nool = a.noolBalance || {}
  const wf = a.workforce || {}
  const totalOrders = Number(os.active?.count || 0) + Number(os.completed?.count || 0)
  return [
    { key: 'completion', label: t('dbOrderCompletion'), value: Number(os.completionRate || 0), format: v => `${Math.round(v)}%`, sub: t('dbOrdersDoneOf', { done: os.completed?.count || 0, total: totalOrders }), icon: 'mdi-progress-check', color: '#8B5CF6' },
    { key: 'rej', label: t('dbRejectionRate'), value: Number(prod.rejectionRate || 0), format: v => `${v.toFixed(1)}%`, sub: t('dbRejectedOverall', { v: fmtN(prod.totalRejected || 0) }), icon: 'mdi-close-octagon-outline', color: '#F43F5E' },
    { key: 'nool', label: t('dbYarnBalance'), value: Number(nool.balance || 0), format: v => `${fmtN(Math.round(v))} kg`, sub: nool.daysRemaining != null ? t('dbDaysAtUse', { n: nool.daysRemaining }) : t('dbConsumptionNA'), icon: 'mdi-basket-outline', color: '#14B8A6' },
    { key: 'wf', label: t('dbActiveWorkforce'), value: Number(wf.active || 0), format: v => `${Math.round(v)} / ${wf.total || 0}`, sub: t('dbWageBillPerDay', { v: fmtCompact(wf.totalDailyWageBill || 0) }), icon: 'mdi-account-group-outline', color: '#EC4899' },
  ]
})

const topOrdersRows = computed(() => (analyticsData.value?.topOrders || []).slice(0, 6))
const topOrdersCategories = computed(() => topOrdersRows.value.map(o => o.orderName))
const topOrdersSeries = computed(() => [{ name: t('dbSeriesProduced'), data: topOrdersRows.value.map(o => Math.round(Number(o.totalProduced || 0))) }])
const topOrdersOptions = computed(() => ({
  chart: { type: 'bar', toolbar: { show: false }, fontFamily: CHART_FONT, animations: { speed: 700 } },
  colors: ['#6366F1'],
  fill: { type: 'gradient', gradient: { shade: 'light', type: 'horizontal', gradientToColors: ['#22D3EE'], stops: [0, 100] } },
  plotOptions: { bar: { horizontal: true, barHeight: '55%', borderRadius: 6, borderRadiusApplication: 'end', dataLabels: { position: 'top' } } },
  dataLabels: { enabled: true, formatter: v => `${fmtN(v)} m`, style: { fontSize: '10px', fontWeight: 700, colors: ['#334155'] }, offsetX: 34, textAnchor: 'middle' },
  grid: { borderColor: '#EEF2F7', strokeDashArray: 4, xaxis: { lines: { show: true } }, yaxis: { lines: { show: false } }, padding: { right: 30 } },
  xaxis: { categories: topOrdersCategories.value, labels: { style: { colors: '#94A3B8', fontSize: '10px' }, formatter: v => fmtN(Math.round(v)) }, axisBorder: { show: false }, axisTicks: { show: false } },
  yaxis: { labels: { style: { colors: '#334155', fontSize: '11px', fontWeight: 600 }, maxWidth: 150 } },
  tooltip: { y: { formatter: (v, { dataPointIndex }) => `${fmtN(v)} m · ${topOrdersRows.value[dataPointIndex]?.companyName || ''}` } },
}))

const rejectionRows = computed(() => (analyticsData.value?.rejectionsByCompany || []).slice(0, 6))
const rejectionCategories = computed(() => rejectionRows.value.map(r => r.companyName))
const rejectionSeries = computed(() => [{ name: t('dbSeriesLoss'), data: rejectionRows.value.map(r => Math.round(Number(r.lossAmount || 0))) }])
const rejectionOptions = computed(() => ({
  chart: { type: 'bar', toolbar: { show: false }, fontFamily: CHART_FONT, animations: { speed: 700 } },
  colors: ['#F43F5E'],
  fill: { type: 'gradient', gradient: { shade: 'light', type: 'horizontal', gradientToColors: ['#FB923C'], stops: [0, 100] } },
  plotOptions: { bar: { horizontal: true, barHeight: '55%', borderRadius: 6, borderRadiusApplication: 'end' } },
  dataLabels: { enabled: false },
  grid: { borderColor: '#EEF2F7', strokeDashArray: 4, xaxis: { lines: { show: true } }, yaxis: { lines: { show: false } } },
  xaxis: { categories: rejectionCategories.value, labels: { style: { colors: '#94A3B8', fontSize: '10px' }, formatter: v => fmtCompact(v) }, axisBorder: { show: false }, axisTicks: { show: false } },
  yaxis: { labels: { style: { colors: '#334155', fontSize: '11px', fontWeight: 600 }, maxWidth: 150 } },
  tooltip: { y: { formatter: (v, { dataPointIndex }) => `${fmt(v)} · ${fmtN(rejectionRows.value[dataPointIndex]?.rejected || 0)} m` } },
}))

const MODE_COLORS = { cash: '#F59E0B', bank: '#3B82F6', cheque: '#8B5CF6', upi: '#10B981', online: '#06B6D4' }
const paymentModeLegend = computed(() =>
  (analyticsData.value?.paymentModes || [])
    .filter(m => Number(m.total || 0) > 0)
    .map(m => ({ mode: m.mode || 'cash', label: t(m.mode || 'cash'), total: Number(m.total || 0), count: Number(m.count || 0), color: MODE_COLORS[m.mode] || '#94A3B8' }))
    .sort((a, b) => b.total - a.total)
)
const paymentModeSeries = computed(() => paymentModeLegend.value.map(m => Math.round(m.total)))
const paymentModeOptions = computed(() => ({
  chart: { type: 'donut', fontFamily: CHART_FONT, animations: { speed: 700 } },
  labels: paymentModeLegend.value.map(m => m.label),
  colors: paymentModeLegend.value.map(m => m.color),
  legend: { show: false },
  dataLabels: { enabled: false },
  stroke: { width: 3, colors: ['#fff'] },
  plotOptions: { pie: { donut: { size: '72%', labels: { show: true, name: { show: true, fontSize: '11px', color: '#94A3B8', fontWeight: 600, offsetY: 16 }, value: { show: true, fontSize: '15px', fontWeight: 800, color: '#0F172A', offsetY: -12, formatter: v => fmtCompact(v) }, total: { show: true, label: t('dbAllModes'), fontSize: '11px', color: '#94A3B8', formatter: w => fmtCompact(w.globals.seriesTotals.reduce((s, v) => s + v, 0)) } } } } },
  tooltip: { y: { formatter: v => fmt(v) } },
}))

const scoreboardRows = computed(() =>
  companyGroups.value.map(c => {
    const payable = Number(c.totalPayableAmount || 0)
    const paid = Number(c.totalPaidAmount || 0)
    const pending = Number(c.totalPendingToPay || 0)
    const coll = companySettlePct(c)
    const expected = Number(c.expectedMeter || 0)
    const prodPct = expected > 0 ? Math.max(0, Math.min(100, Math.round((Number(c.producedMeter || 0) / expected) * 100))) : 0
    const health = c.balanceAlert ? 'critical' : (payable > 0 && coll < 50 && pending > 0) ? 'follow' : 'healthy'
    return { ...c, payable, paid, pending, coll, prodPct, health }
  }).sort((a, b) => b.pending - a.pending)
)

const recentReceipts = computed(() => (analyticsData.value?.recentPayments || []).slice(0, 8))
const recentReceiptsTotal = computed(() => recentReceipts.value.reduce((s, r) => s + Number(r.amount || 0), 0))

// ── Deeper insights ──────────────────────────────────────────────────────────
const smartInsights = computed(() => (analyticsData.value?.insights || []).slice(0, 6))

const profit = computed(() => analyticsData.value?.profitability || {})

function fmtSigned(v) {
  const n = Math.round(Number(v || 0))
  return (n < 0 ? '−' : '') + fmtCompact(Math.abs(n))
}

const plKpis = computed(() => {
  const p = profit.value
  return [
    { label: t('dbRevenue'), value: Number(p.totalRevenue || 0), color: '#10B981', sub: t('dbThisMonthV', { v: fmtCompact(p.monthReceipt || 0) }) },
    { label: t('dbPayrollCost'), value: Number(p.totalPayrollCost || 0), color: '#F59E0B', sub: t('dbThisMonthV', { v: fmtCompact(p.monthPayroll || 0) }) },
    { label: t('dbExpenses'), value: Number(p.totalExpenses || 0), color: '#F43F5E', sub: t('dbAllExpenses') },
    { label: t('dbNetProfit'), value: Number(p.netProfit ?? p.grossProfit ?? 0), color: '#6366F1', sub: t('dbNetMarginV', { v: Number(p.netMarginPct ?? p.grossMarginPct ?? 0) }) },
  ]
})

const plCategories = computed(() => (analyticsData.value?.trends?.payments || []).map(p => p.month))
const plSeries = computed(() => {
  const pay = analyticsData.value?.trends?.payments || []
  const year = String(new Date().getFullYear())
  const payrollByMonth = new Map((analyticsData.value?.payrollTrend || []).filter(r => String(r.period || '').endsWith(year)).map(r => [String(r.period).split(' ')[0], Number(r.net || 0)]))
  const receipts = pay.map(p => Math.round(Number(p.value || 0)))
  const payroll = pay.map(p => Math.round(payrollByMonth.get(p.month) || 0))
  return [
    { name: 'Receipts', type: 'column', data: receipts },
    { name: 'Payroll', type: 'column', data: payroll },
    { name: 'Net', type: 'line', data: receipts.map((r, i) => r - payroll[i]) },
  ]
})
const plOptions = computed(() => ({
  chart: { type: 'line', stacked: false, toolbar: { show: false }, fontFamily: CHART_FONT, animations: { speed: 700 } },
  colors: ['#10B981', '#F59E0B', '#6366F1'],
  stroke: { width: [0, 0, 3], curve: 'smooth' },
  plotOptions: { bar: { columnWidth: '55%', borderRadius: 5, borderRadiusApplication: 'end' } },
  markers: { size: [0, 0, 4], strokeWidth: 2, strokeColors: '#fff' },
  dataLabels: { enabled: false },
  legend: { position: 'top', horizontalAlign: 'right', fontSize: '11px', fontWeight: 600, markers: { radius: 12 }, labels: { colors: '#64748B' } },
  grid: { borderColor: '#EEF2F7', strokeDashArray: 4 },
  xaxis: { categories: plCategories.value, labels: { style: { colors: '#94A3B8', fontSize: '10px', fontWeight: 600 } }, axisBorder: { show: false }, axisTicks: { show: false } },
  yaxis: { labels: { style: { colors: '#94A3B8', fontSize: '10px' }, formatter: v => fmtSigned(v) } },
  tooltip: { shared: true, intersect: false, y: { formatter: v => fmtSigned(v) } },
}))

const prodHealth = computed(() => {
  const p = analyticsData.value?.production || {}
  const trend = analyticsData.value?.trends?.production || []
  const remaining = Math.max(0, totalExpectedMeter.value - totalProducedMeter.value)
  const active = trend.filter(m => Number(m.value || 0) > 0)
  const lastActive = active[active.length - 1]
  let avgDaily = Number(p.avgDaily || 0)
  let paceNote = 'this month'
  if (avgDaily <= 0 && lastActive) {
    avgDaily = Math.round(Number(lastActive.value || 0) / 30)
    paceNote = `based on ${lastActive.month} (last active month)`
  }
  const bestMonth = active.reduce((best, m) => (!best || Number(m.value) > Number(best.value) ? m : best), null)
  return {
    avgDaily,
    paceNote,
    highDay: p.highDay,
    lowDay: p.lowDay,
    efficiency: Number(p.efficiency ?? 100),
    remaining,
    etaDays: avgDaily > 0 ? Math.ceil(remaining / avgDaily) : null,
    bestMonth,
    yearTotal: Number(p.thisYear || 0),
    activeMonths: active.length,
  }
})

const SHIFT_COLORS = ['#6366F1', '#F59E0B', '#10B981', '#EC4899']
const shiftLegend = computed(() => {
  const rows = (analyticsData.value?.shiftBreakdown || []).filter(s => Number(s.total || 0) > 0)
  const total = rows.reduce((s, r) => s + Number(r.total || 0), 0)
  return rows.map((r, i) => ({
    shift: r.shift || 'unknown',
    label: t(r.shift || 'unknown'),
    total: Number(r.total || 0),
    pct: total > 0 ? Math.round((Number(r.total || 0) / total) * 100) : 0,
    color: SHIFT_COLORS[i % SHIFT_COLORS.length],
  }))
})
const shiftSeries = computed(() => shiftLegend.value.map(s => Math.round(s.total)))
const shiftOptions = computed(() => ({
  chart: { type: 'donut', fontFamily: CHART_FONT, sparkline: { enabled: true }, animations: { speed: 700 } },
  labels: shiftLegend.value.map(s => s.label),
  colors: shiftLegend.value.map(s => s.color),
  legend: { show: false },
  dataLabels: { enabled: false },
  stroke: { width: 2, colors: ['#fff'] },
  plotOptions: { pie: { donut: { size: '70%' } } },
  tooltip: { y: { formatter: v => `${fmtN(v)} m` } },
}))

const noolBalance = computed(() => analyticsData.value?.noolBalance || {})
const noolRows = computed(() => analyticsData.value?.noolMonthly || [])
const noolCategories = computed(() => noolRows.value.map(r => r.month))
const noolSeries = computed(() => [
  { name: 'Received', data: noolRows.value.map(r => Math.round(Number(r.received || 0))) },
  { name: 'Used', data: noolRows.value.map(r => Math.round(Number(r.used || 0))) },
])
const noolOptions = computed(() => ({
  chart: { type: 'bar', toolbar: { show: false }, fontFamily: CHART_FONT, animations: { speed: 700 } },
  colors: ['#14B8A6', '#F97316'],
  plotOptions: { bar: { columnWidth: '55%', borderRadius: 5, borderRadiusApplication: 'end' } },
  dataLabels: { enabled: false },
  legend: { position: 'top', horizontalAlign: 'right', fontSize: '11px', fontWeight: 600, markers: { radius: 12 }, labels: { colors: '#64748B' } },
  grid: { borderColor: '#EEF2F7', strokeDashArray: 4 },
  xaxis: { categories: noolCategories.value, labels: { style: { colors: '#94A3B8', fontSize: '10px', fontWeight: 600 } }, axisBorder: { show: false }, axisTicks: { show: false } },
  yaxis: { labels: { style: { colors: '#94A3B8', fontSize: '10px' }, formatter: v => fmtN(Math.round(v)) } },
  tooltip: { shared: true, intersect: false, y: { formatter: v => `${fmtN(v)} kg` } },
}))

const stalledOrders = computed(() =>
  (analyticsData.value?.orderDetails || [])
    .filter(o => o.status !== 'completed' && Number(o.ageDays || 0) >= 21 && Number(o.progressPct || 0) < 60 && Number(o.expected || 0) > 0)
    .sort((a, b) => Number(b.ageDays || 0) - Number(a.ageDays || 0))
    .slice(0, 8)
)

const paymentAging = computed(() =>
  (analyticsData.value?.paymentAging || [])
    .filter(a => Number(a.pendingAmount || 0) > 0)
    .slice(0, 8)
)

function agingClass(days) {
  const d = Number(days || 0)
  if (d > 30) return 'critical'
  if (d > 15) return 'follow'
  return 'healthy'
}

function orderTablePct(company) {
  const expected = Number(company?.expectedMeter || 0)
  if (expected <= 0) return 0
  return Math.max(0, Math.min(100, Math.round((Number(company?.periodProducedMeter || 0) / expected) * 100)))
}

function orderRowPct(row) {
  const expected = Number(row?.expectedMeter || 0)
  if (expected <= 0) return 0
  const produced = Number(row?.periodProducedMeter || 0) + Number(row?.periodRejectedMeter || 0)
  return Math.max(0, Math.min(100, Math.round((produced / expected) * 100)))
}

const stats = computed(() => [
  { icon: 'mdi-package-variant',   label: t('activeOrders'),     value: dashboardStats.value.activeOrders || 0,                  chipColor: '#00897B', chipBg: '#00897B' },
  { icon: 'mdi-check-circle',      label: t('dbCompletedOrders'),    value: dashboardStats.value.completedOrders || 0,               chipColor: '#2E7D32', chipBg: '#2E7D32' },
  { icon: 'mdi-factory',           label: t('todayProduction'),  value: fmtN(dashboardStats.value.todayProduction || 0) + ' m',  chipColor: '#1565C0', chipBg: '#1565C0' },
  { icon: 'mdi-percent',           label: t('dbProductionProgress'), value: globalProductionPct.value + '%',                         chipColor: '#5C6BC0', chipBg: '#5C6BC0' },
  { icon: 'mdi-close-octagon',     label: t('dbMeterLost'),          value: fmtN(dashboardStats.value.totalRejectedMeter || 0) + ' m', chipColor: '#BF360C', chipBg: '#BF360C' },
  { icon: 'mdi-cash-remove',       label: t('dbRejectionLoss'),      value: fmt(dashboardStats.value.totalRejectionGrossLoss || 0), chipColor: '#C62828', chipBg: '#C62828' },
  { icon: 'mdi-wallet-outline',    label: t('dbUnallocatedFunds'),   value: fmt(companyGlobal.value.totalUnallocated || 0),          chipColor: '#1565C0', chipBg: '#1565C0' },
  { icon: 'mdi-hand-coin',         label: t('dbDeductionToGet'),    value: fmt(dashboardStats.value.deductionHoldAmount || 0),      chipColor: '#6D4C41', chipBg: '#6D4C41' },
])

function orderSortTs(order) {
  return new Date(order?.startDate || order?.createdAt || 0).getTime() || 0
}

function objectIdToTs(id) {
  const raw = String(id || '')
  const hex = raw.slice(0, 8)
  return /^[0-9a-fA-F]{8}$/.test(hex) ? parseInt(hex, 16) * 1000 : 0
}

function orderChangedTs(order) {
  const updatedTs = new Date(order?.updatedAt || 0).getTime()
  if (Number.isFinite(updatedTs) && updatedTs > 0) return updatedTs
  const createdAtTs = new Date(order?.createdAt || 0).getTime()
  if (Number.isFinite(createdAtTs) && createdAtTs > 0) return createdAtTs
  return objectIdToTs(order?._id)
}

function orderStageRank(order) {
  if (order?.status === 'completed') return 2
  const acceptedMeter = Number(order?.acceptedMeter ?? Math.max(0, Number(order?.producedMeter || 0) - Number(order?.rejectedMeter || 0)))
  if (acceptedMeter <= 0) return 0
  return 1
}

function compareCompanyOrders(a, b) {
  // Recently changed orders (within last 10 minutes) always appear first
  const now = Date.now()
  const RECENT_MS = 10 * 60 * 1000
  const aRecent = (now - orderChangedTs(a)) < RECENT_MS
  const bRecent = (now - orderChangedTs(b)) < RECENT_MS
  if (aRecent !== bRecent) return aRecent ? -1 : 1
  if (aRecent && bRecent) return orderChangedTs(b) - orderChangedTs(a)

  // Then by stage rank
  const rankA = orderStageRank(a)
  const rankB = orderStageRank(b)
  if (rankA !== rankB) return rankA - rankB

  // Within same rank, most recently changed first
  return orderChangedTs(b) - orderChangedTs(a)
}

function latestCompanyOrderTs(orders = []) {
  if (!orders.length) return 0
  return Math.max(...orders.map(order => orderChangedTs(order)), 0)
}

const companyGroups = computed(() => {
  const summaryRows = dashboardStats.value.companyOrderSummary || []
  const orderMap = new Map()

  for (const order of orderStore.items) {
    const isClosed = order.orderStatus === 'closed' || (order.archived && order.financialClosed)
    if (isClosed) continue
    const companyId = order?.company?._id || 'unknown'
    if (!orderMap.has(companyId)) orderMap.set(companyId, [])
    const acceptedMeter = Number(order.acceptedMeter ?? Math.max(0, Number(order.producedMeter || 0) - Number(order.rejectedMeter || 0)))
    const rejectedMeter = Number(order.rejectedMeter || Math.max(0, Number(order.producedMeter || 0) - acceptedMeter))
    const ratePerMeter = Number(order.ratePerMeter || 0)
    const deductionPct = Number(order.deductionPct || 0)
    const totalValue = acceptedMeter * ratePerMeter
    const deductionAmt = totalValue * (deductionPct / 100)
    const rejectionGrossLoss = rejectedMeter * ratePerMeter
    const rejectionDeductionLoss = rejectionGrossLoss * (deductionPct / 100)
    const rejectionNetLoss = rejectionGrossLoss - rejectionDeductionLoss
    orderMap.get(companyId).push({
      ...order,
      executionState: orderExecutionState(order),
      periodProducedMeter: acceptedMeter,
      periodRejectedMeter: rejectedMeter,
      periodTotalValue:    totalValue,
      periodDeductionAmt:  deductionAmt,
      periodPayableAmt:    totalValue - deductionAmt,
      periodRejectionGrossLoss: rejectionGrossLoss,
      periodRejectionDeductionLoss: rejectionDeductionLoss,
      periodRejectionNetLoss: rejectionNetLoss,
    })
  }

  return summaryRows.map(row => ({
    ...row,
    periodProducedMeter: (orderMap.get(row.companyId) || []).reduce((sum, o) => sum + Number(o.periodProducedMeter || 0), 0),
    orders: [...(orderMap.get(row.companyId) || [])].sort(compareCompanyOrders),
    orderTotals: companyOrderTotals({ orders: orderMap.get(row.companyId) || [] }),
  })).sort((a, b) => {
    const latestA = Math.max(latestCompanyOrderTs(a.orders), new Date(a.lastActivityAt || 0).getTime())
    const latestB = Math.max(latestCompanyOrderTs(b.orders), new Date(b.lastActivityAt || 0).getTime())
    return latestB - latestA
  })
})

const companyGlobal = computed(() => companyGroups.value.reduce((acc, row) => {
  acc.totalCompanies += 1
  acc.totalPending += Number(row.totalPendingToPay || 0)
  acc.totalPaid += Number(row.totalPaidAmount || 0)
  acc.totalUnallocated += Number(row.totalUnallocatedAmount || 0)
  acc.totalDeduction += Number(row.totalDeductionNeedToGet || 0)
  acc.totalPayable += Number(row.totalPayableAmount || 0)
  return acc
}, { totalCompanies: 0, totalPending: 0, totalPaid: 0, totalUnallocated: 0, totalDeduction: 0, totalPayable: 0 }))

const filteredCompanyGroups = computed(() => {
  const term = String(dashboardSearch.value || '').trim().toLowerCase()
  if (!term) return companyGroups.value

  return companyGroups.value
    .map(company => {
      const companyNameMatch = (company.companyName || '').toLowerCase().includes(term)
      if (companyNameMatch) return company

      const matchedOrders = company.orders.filter(order =>
        (order.orderName || '').toLowerCase().includes(term)
      )
      if (matchedOrders.length) {
        return { ...company, orders: matchedOrders, orderTotals: companyOrderTotals({ orders: matchedOrders }) }
      }

      return null
    })
    .filter(Boolean)
})

watch(filteredCompanyGroups, (groups) => {
  if (!dashboardSearch.value) return
  const ids = groups.map(row => row.companyId)
  expandedCompanyIds.value = [...new Set([...expandedCompanyIds.value, ...ids])]
})

watch(companyGroups, (rows) => {
  const ids = rows.map(row => row.companyId)
  if (!expandedInitialized.value) {
    expandedCompanyIds.value = []
    expandedInitialized.value = true
  } else {
    expandedCompanyIds.value = expandedCompanyIds.value.filter(id => ids.includes(id))
  }
  applyPendingDashboardUiState()
}, { immediate: true })

watch([companyGroups, () => route.query.expandCompany], () => {
  const expandCompany = String(route.query.expandCompany || '').trim()
  if (!expandCompany) return
  if (!companyGroups.value.some(row => row.companyId === expandCompany)) return
  if (expandedCompanyIds.value.length === 1 && expandedCompanyIds.value[0] === expandCompany) return
  expandedCompanyIds.value = [expandCompany]
}, { immediate: true })

watch(() => route.query.drs, () => {
  readDashboardUiStateFromQuery()
  applyPendingDashboardUiState()
}, { immediate: true })

function isCompanyExpanded(companyId) {
  return expandedCompanyIds.value.includes(companyId)
}

function toggleCompany(companyId) {
  if (isCompanyExpanded(companyId)) {
    expandedCompanyIds.value = expandedCompanyIds.value.filter(id => id !== companyId)
  } else {
    expandedCompanyIds.value = [...expandedCompanyIds.value, companyId]
  }
}

function expandAllCompanies() {
  expandedCompanyIds.value = companyGroups.value.map(row => row.companyId)
}

function collapseAllCompanies() {
  expandedCompanyIds.value = []
}

function companySettlePct(company) {
  const payable = Number(company?.totalPayableAmount || 0)
  const paid = Number(company?.totalPaidAmount || 0)
  if (payable <= 0) return 0
  return Math.max(0, Math.min(100, Math.round((paid / payable) * 1000) / 10))
}

function settleClass(company) {
  const pct = companySettlePct(company)
  if (pct >= 80) return 'is-good'
  if (pct >= 40) return 'is-mid'
  return 'is-low'
}

function companyDeductionTotal(company) {
  return Number(company?.totalDeductionNeedToGet || 0) + Number(company?.totalDeductionCollected || 0)
}

function companyAvgRate(company) {
  const accepted = Number(company?.producedMeter || 0)
  if (accepted <= 0) return 0
  return Number(company?.totalProducedValue || 0) / accepted
}

function companyDeductionPct(company) {
  const total = companyDeductionTotal(company)
  const collected = Number(company?.totalDeductionCollected || 0)
  if (total <= 0) return 0
  return Math.max(0, Math.min(100, Math.round((collected / total) * 1000) / 10))
}

function deductionClass(company) {
  const pct = companyDeductionPct(company)
  if (pct >= 80) return 'is-good'
  if (pct >= 40) return 'is-mid'
  return 'is-low'
}

function orderExecutionState(row) {
  if (row?.status === 'completed') return { label: t('dbCompletedStatus'), tone: 'good' }
  const acceptedMeter = Number(row?.acceptedMeter ?? Math.max(0, Number(row?.producedMeter || 0) - Number(row?.rejectedMeter || 0)))
  if (acceptedMeter <= 0) return { label: t('dbYetToStart'), tone: 'neutral' }
  return { label: t('dbInProgress'), tone: 'info' }
}

function companyOrderTotals(company) {
  const rows = company?.orders || []
  const totals = rows.reduce((acc, row) => {
    const expectedMeter = Number(row?.expectedMeter || 0)
    const acceptedMeter = Number(row?.periodProducedMeter || 0)
    const rejectedMeter = Number(row?.periodRejectedMeter || 0)
    const producedMeter = acceptedMeter + rejectedMeter
    const totalAmount = Number(row?.periodTotalValue || 0)
    const deductionAmount = Number(row?.periodDeductionAmt || 0)
    const rejectionLoss = Number(row?.periodRejectionGrossLoss || 0)
    const payableAmount = Number(row?.periodPayableAmt || 0)

    acc.expectedMeter += expectedMeter
    acc.producedMeter += producedMeter
    acc.rejectedMeter += rejectedMeter
    acc.acceptedMeter += acceptedMeter
    acc.totalAmount += totalAmount
    acc.deductionAmount += deductionAmount
    acc.rejectionLoss += rejectionLoss
    acc.payableAmount += payableAmount
    return acc
  }, {
    expectedMeter: 0,
    producedMeter: 0,
    rejectedMeter: 0,
    acceptedMeter: 0,
    totalAmount: 0,
    deductionAmount: 0,
    rejectionLoss: 0,
    payableAmount: 0,
  })

  return totals
}

function fmtRounded(value) {
  return fmt(Math.round(Number(value || 0)))
}

const companyPaymentCols = [
  {
    field: 'transactionType',
    headerName: t('dbColType'),
    flex: 0.9,
    minWidth: 120,
    cellRenderer: p => {
      const type = p.value === 'deduction' ? t('dbTxnDeduction') : t('dbTxnPayment')
      const cls = p.value === 'deduction' ? 'chip-pending' : 'chip-active'
      return `<span class="${cls}" style="padding:2px 10px;border-radius:20px;font-size:11px">${type}</span>`
    },
  },
  { field: 'date', headerName: t('date'), flex: 1, minWidth: 130, valueFormatter: p => fmtDate(p.value) },
  {
    field: 'mode',
    headerName: t('paymentMode'),
    flex: 0.9,
    minWidth: 120,
    cellRenderer: p => {
      if (p.data?.transactionType === 'deduction') return '-'
      return `<span class="${p.value === 'cash' ? 'chip-done' : p.value === 'cheque' ? 'chip-pending' : 'chip-active'}" style="padding:2px 10px;border-radius:20px;font-size:11px">${t(p.value || 'cash')}</span>`
    },
  },
  {
    field: 'amount',
    headerName: t('amount'),
    flex: 1,
    minWidth: 150,
    valueFormatter: p => fmt(p.value || 0),
    cellStyle: p => ({ color: p.data?.transactionType === 'deduction' ? '#C62828' : '#2E7D32', fontWeight: 700 }),
  },
  { field: 'notes', headerName: t('notes'), flex: 1.8, minWidth: 220 },
  {
    field: '_actions',
    headerName: t('dbColAction'),
    width: 150,
    suppressSizeToFit: true,
    sortable: false,
    filter: false,
    cellRenderer: p => `<div class="cp-action-wrap"><button class="cp-edit-btn" type="button" data-action="edit" data-id="${p.data?._id || ''}">${t('dbEditBtn')}</button><button class="cp-delete-btn" type="button" data-action="delete" data-id="${p.data?._id || ''}">${t('dbDeleteBtn')}</button></div>`,
    onCellClicked: async e => {
      const action = e.event?.target?.dataset?.action
      const id = e.event?.target?.dataset?.id
      if (!action || !id) return
      if (action === 'edit') startEditCompanyPayment(e.data)
      if (action === 'delete') await deleteCompanyPayment(id)
    },
  },
]

async function loadCompanyPayments() {
  if (!selectedCompany.value?.companyId || selectedCompany.value.companyId === 'unknown') {
    companyPaymentRows.value = []
    companySettlements.value = []
    return
  }

  companyPaymentLoading.value = true
  try {
    const params = {}
    if (companyPaymentFilter.value.from) params.from = companyPaymentFilter.value.from
    if (companyPaymentFilter.value.to) params.to = companyPaymentFilter.value.to

    const { data } = await api.get(`/dashboard/company-payments/${selectedCompany.value.companyId}`, {
      params,
    })

    companyPaymentRows.value = data.rows || []
    companySettlements.value = data.settlements || []
    companyPaymentSummary.value = {
      companyBalance: data.summary?.companyBalance || 0,
      totalPaidAmount: data.summary?.totalPaidAmount || 0,
      totalReceiptAmount: data.summary?.totalReceiptAmount || 0,
      totalUnallocatedAmount: data.summary?.totalUnallocatedAmount || 0,
      totalArchivedAllocatedAmount: data.summary?.totalArchivedAllocatedAmount || 0,
      totalPendingToPay: data.summary?.totalPendingToPay || 0,
      totalDeductionNeedToGet: data.summary?.totalDeductionNeedToGet || 0,
      totalDeductionCollected: data.summary?.totalDeductionCollected || 0,
      totalPayableAmount: data.summary?.totalPayableAmount || 0,
    }
  } catch (error) {
    notify.apiError(error, t('paymentsLoadFailed'))
  } finally {
    companyPaymentLoading.value = false
  }
}

async function clearCompanyPaymentFilter() {
  companyPaymentFilter.value = { from: '', to: '' }
  await loadCompanyPayments()
}

async function addCompanyPayment() {
  if (!selectedCompany.value?.companyId || Number(companyPaymentForm.value.amount || 0) <= 0) {
    notify.warning(t('enterValidAmount'))
    return
  }

  companyPaymentSaving.value = true
  try {
    const payload = {
      transactionType: companyPaymentForm.value.transactionType || 'payment',
      amount: Number(companyPaymentForm.value.amount || 0),
      mode: companyPaymentForm.value.mode || 'cash',
      notes: companyPaymentForm.value.notes || '',
    }
    if (companyPaymentForm.value.date) payload.date = companyPaymentForm.value.date

    await api.post(`/dashboard/company-payments/${selectedCompany.value.companyId}`, payload)

    companyPaymentForm.value = defaultCompanyPaymentForm()
    await loadCompanyPayments()
    void Promise.all([dashboardStore.fetch(true), orderStore.fetch({}, { force: true })]).catch(() => {})
    notify.success(t(payload.transactionType === 'payment_surplus' ? 'dbPaymentSurplusRecorded' : payload.transactionType === 'payment_loss' ? 'dbPaymentLossRecorded' : payload.transactionType === 'deduction_loss' ? 'dbLossRecorded' : payload.transactionType === 'deduction' ? 'deductionRecorded' : 'paymentRecorded'))
  } catch (error) {
    notify.apiError(error, t('paymentSaveFailed'))
  } finally {
    companyPaymentSaving.value = false
  }
}

async function updateCompanyPayment() {
  if (!editingPaymentId.value || Number(companyPaymentForm.value.amount || 0) <= 0) {
    notify.warning(t('enterValidAmount'))
    return
  }

  companyPaymentSaving.value = true
  try {
    const payload = {
      company: selectedCompany.value.companyId,
      transactionType: companyPaymentForm.value.transactionType || 'payment',
      amount: Number(companyPaymentForm.value.amount || 0),
      mode: companyPaymentForm.value.mode || 'cash',
      notes: companyPaymentForm.value.notes || '',
    }
    if (companyPaymentForm.value.date) payload.date = companyPaymentForm.value.date

    await api.put(`/payments/${editingPaymentId.value}`, payload)

    resetCompanyPaymentForm()
    await loadCompanyPayments()
    void Promise.all([dashboardStore.fetch(true), orderStore.fetch({}, { force: true })]).catch(() => {})
    notify.success(t('paymentUpdated'))
  } catch (error) {
    notify.apiError(error, t('paymentSaveFailed'))
  } finally {
    companyPaymentSaving.value = false
  }
}

function saveCompanyPayment() {
  if (editingPaymentId.value) return updateCompanyPayment()
  return addCompanyPayment()
}

async function deleteCompanyPayment(id) {
  const row = companyPaymentRows.value.find(r => r._id === id)
  const amount = Number(row?.amount || 0)
  const currentBalance = Number(companyPaymentSummary.value?.companyBalance || 0)
  const balanceAfter = currentBalance - amount

  let message = t('dbConfirmDeletePayment')
  if (row?.transactionType !== 'deduction' && row?.transactionType !== 'loss' && balanceAfter < 0) {
    message = t('dbNegativeBalanceWarn', { a: fmt(amount), b: fmt(balanceAfter) })
  }

  const ok = await confirm({ title: t('dbDeletePayment'), message, confirmText: t('dbDeleteBtn'), confirmColor: 'error' })
  if (!ok) return

  companyPaymentSaving.value = true
  try {
    await api.delete(row?.transactionType === 'loss' ? `/dashboard/deduction-loss/${id}` : `/payments/${id}`)
    if (editingPaymentId.value === id) resetCompanyPaymentForm()
    await loadCompanyPayments()
    void Promise.all([dashboardStore.fetch(true), orderStore.fetch({}, { force: true })]).catch(() => {})
    notify.success(t('paymentDeleted'))
  } catch (error) {
    notify.apiError(error, t('paymentDeleteFailed'))
  } finally {
    companyPaymentSaving.value = false
  }
}

function startEditCompanyPayment(row) {
  if (!row?._id) return
  editingPaymentId.value = row._id
  companyPaymentForm.value = {
    transactionType: row.transactionType === 'deduction' ? 'deduction' : 'payment',
    date: row.date ? String(row.date).slice(0, 10) : today(),
    amount: Number(row.amount || 0),
    mode: row.mode || 'cash',
    notes: row.notes || '',
  }
  nextTick(() => pdFormRef.value?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' }))
}

function resetCompanyPaymentForm() {
  editingPaymentId.value = null
  companyPaymentForm.value = defaultCompanyPaymentForm()
}

async function openCompanyPayments(company) {
  selectedCompany.value = company
  resetCompanyPaymentForm()
  companyPaymentFilter.value = defaultCompanyPaymentFilter()
  companyPaymentSearch.value = ''
  companyPaymentTypeFilter.value = 'all'
  companyPaymentPage.value = 1
  companyPaymentsDialog.value = true
  await loadCompanyPayments()
}

function openAllocatePayments() {
  const companyId = selectedCompany.value?.companyId
  if (!companyId || companyId === 'unknown') return
  companyPaymentsDialog.value = false
  router.push(`/orders?companyId=${companyId}&oas=active`)
}

const settleDialog = ref(false)
const settleTarget = ref(null)
const settleLabel = ref('')
const settling = ref(false)
const settlePreview = ref(null)
// Deduction on the archived orders being settled that is not yet received
const settleDedDue = computed(() => Number(settlePreview.value?.deductionShortfall || 0))
const settleReady = computed(() => !!settlePreview.value && settleDedDue.value <= 0.01)

async function openSettleDialog(company) {
  settleTarget.value = company
  settleLabel.value = `Diwali ${new Date().getFullYear()}`
  settlePreview.value = null
  settleDialog.value = true
  try {
    const { data } = await api.get(`/orders/settle-preview/${company.companyId}`)
    settlePreview.value = data
  } catch (error) {
    settleDialog.value = false
    notify.apiError(error, t('settleFailed'))
  }
}

async function confirmSettle() {
  if (!settleReady.value || !settleTarget.value) return
  settling.value = true
  try {
    const { data } = await api.post(`/orders/settle/${settleTarget.value.companyId}`, {
      label: settleLabel.value,
    })
    settleDialog.value = false
    notify.success(t('settleDone', { count: data.orderCount }))
    celebrate('cannons')
    void Promise.all([dashboardStore.fetch(true), orderStore.fetch({}, { force: true })]).catch(() => {})
  } catch (error) {
    notify.apiError(error, t('settleFailed'))
  } finally {
    settling.value = false
  }
}

function openAddOrder(company) {
  const companyId = company?.companyId
  if (!companyId || companyId === 'unknown') {
    router.push('/orders?add=1')
    return
  }
  router.push(`/orders?add=1&company=${companyId}`)
}

function goToOrderDetail(row) {
  const location = getOrderDetailLocation(row)
  if (!location) return
  router.push(location)
}

function getOrderDetailLocation(row) {
  if (!row?._id) return null
  const query = { from: 'dashboard' }
  const expandCompany = String(row?.company?._id || row?.companyId || '').trim()
  if (expandCompany) query.expandCompany = expandCompany
  const uiStateKey = createDashboardUiSnapshot()
  if (uiStateKey) query.drs = uiStateKey
  return { path: `/orders/${row._id}`, query }
}

function getOrderDetailHref(row) {
  const location = getOrderDetailLocation(row)
  return location ? router.resolve(location).href : '#'
}

async function load(force = false) {
  let failed = null
  await Promise.all([
    orderStore.fetch({}, { force }).catch(e => { failed = e }),
    dashboardStore.fetch(force).catch(e => { failed = e }),
    loadAnalytics(),
    loadTargets(),
  ])
  if (failed) notify.apiError(failed, t('dashboardLoadFailed'))
}

onMounted(async () => {
  readDashboardUiStateFromQuery()
  await load(true)
  applyPendingDashboardUiState()
  scrollToHighlightedOrder()
})

// Cached by keep-alive: onMounted does not run again when returning from an order
onActivated(() => scrollToHighlightedOrder())

// Pointer FX: spotlight position on cards + parallax on the hero (CSS variables only)
let fxFrame = 0
function onFx(e) {
  if (fxFrame || e.pointerType === 'touch') return
  const { clientX, clientY, target } = e
  fxFrame = requestAnimationFrame(() => {
    fxFrame = 0
    const card = target?.closest?.('.stat-tile, .insight-card, .hero-kpi, .pulse-tile, .company-card')
    if (card) {
      const r = card.getBoundingClientRect()
      card.style.setProperty('--mx', `${clientX - r.left}px`)
      card.style.setProperty('--my', `${clientY - r.top}px`)
    }
    const hero = target?.closest?.('.hero')
    if (hero) {
      const r = hero.getBoundingClientRect()
      hero.style.setProperty('--px', ((clientX - r.left) / r.width - 0.5).toFixed(3))
      hero.style.setProperty('--py', ((clientY - r.top) / r.height - 0.5).toFixed(3))
    }
  })
}
onBeforeUnmount(() => { if (fxFrame) cancelAnimationFrame(fxFrame) })
</script>

<style scoped>
.dashboard-page {
  max-width: 1400px;
  margin: 0 auto;
  padding: 24px 20px;
  --ink: #0F172A;
  --muted: #64748B;
  --line: #E6EAF2;
  --card-shadow: 0 1px 2px rgba(15, 23, 42, 0.04), 0 8px 24px -12px rgba(15, 23, 42, 0.12);
}

/* Hero */
.hero {
  position: relative;
  overflow: hidden;
  border-radius: 24px;
  padding: 24px 26px 22px;
  margin-bottom: 20px;
  color: #fff;
  background: radial-gradient(1200px 400px at 0% 0%, #1E1B4B 0%, #0F172A 55%, #111827 100%);
  box-shadow: 0 20px 50px -20px rgba(15, 23, 42, 0.6);
}

.hero-glow {
  position: absolute;
  border-radius: 50%;
  filter: blur(40px);
  opacity: 0.55;
  pointer-events: none;
}

.hero-glow-a { width: 360px; height: 360px; right: -80px; top: -140px; background: radial-gradient(circle, #8B5CF6, transparent 65%); }
.hero-glow-b { width: 300px; height: 300px; left: 30%; bottom: -200px; background: radial-gradient(circle, #06B6D4, transparent 65%); }

.hero-top {
  position: relative;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
}

.hero-greeting {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.4px;
  text-transform: uppercase;
  color: #A5B4FC;
}

.hero-title {
  font-size: 28px;
  font-weight: 800;
  letter-spacing: -0.6px;
  line-height: 1.1;
  margin-top: 4px;
}

.hero-date {
  display: inline-flex;
  align-items: center;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.7);
  margin-top: 6px;
}

.hero-refresh {
  background: rgba(255, 255, 255, 0.12) !important;
  color: #fff !important;
  border: 1px solid rgba(255, 255, 255, 0.18);
  backdrop-filter: blur(8px);
}

.hero-kpis {
  position: relative;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.hero-kpi {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.07);
  border: 1px solid rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(10px);
  transition: background 0.2s, transform 0.2s;
}

.hero-kpi:hover {
  background: rgba(255, 255, 255, 0.11);
  transform: translateY(-2px);
}

.hero-kpi-icon {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  flex-shrink: 0;
}

.hero-kpi-icon.tone-indigo  { background: linear-gradient(135deg, #6366F1, #A78BFA); box-shadow: 0 8px 18px rgba(99, 102, 241, 0.45); }
.hero-kpi-icon.tone-sky     { background: linear-gradient(135deg, #0EA5E9, #67E8F9); box-shadow: 0 8px 18px rgba(14, 165, 233, 0.45); }
.hero-kpi-icon.tone-emerald { background: linear-gradient(135deg, #10B981, #6EE7B7); box-shadow: 0 8px 18px rgba(16, 185, 129, 0.45); }

.hero-kpi-label {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.4px;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.62);
}

.hero-kpi-value {
  font-size: 21px;
  font-weight: 800;
  letter-spacing: -0.3px;
  margin-top: 2px;
}

.hero-kpi-sub {
  font-size: 11px;
  color: #FCD34D;
  font-weight: 600;
  margin-top: 1px;
}

.hero-kpi-ring {
  padding-top: 6px;
  padding-bottom: 6px;
  gap: 6px;
}

.hero-kpi-ring :deep(.apexcharts-canvas) { margin: -6px; }

.hero-period-tag {
  margin-left: 10px;
  padding: 2px 9px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
  color: #C7D2FE;
  background: rgba(99, 102, 241, 0.25);
  border: 1px solid rgba(165, 180, 252, 0.35);
}

.hero-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: flex-end;
  position: relative;
  z-index: 2;
}

.period-picker {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 4px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.14);
  backdrop-filter: blur(8px);
}

.period-chip {
  appearance: none;
  border: none;
  background: transparent;
  color: rgba(255, 255, 255, 0.72);
  font: inherit;
  font-size: 12px;
  font-weight: 700;
  padding: 6px 12px;
  border-radius: 999px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  transition: background 0.18s, color 0.18s, transform 0.18s;
  white-space: nowrap;
}

.period-chip:hover { color: #fff; background: rgba(255, 255, 255, 0.1); }

.period-chip.active {
  color: #1E1B4B;
  background: linear-gradient(135deg, #FDE68A, #FBBF24);
  box-shadow: 0 6px 16px rgba(251, 191, 36, 0.35);
}

.period-custom { position: relative; display: inline-flex; }

.period-popover {
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  z-index: 30;
  background: #fff;
  border-radius: 14px;
  padding: 14px;
  width: 300px;
  box-shadow: 0 20px 50px -20px rgba(15, 23, 42, 0.45);
  border: 1px solid var(--line);
  animation: rise 0.2s ease both;
}

.period-popover-title { font-size: 12px; font-weight: 800; color: var(--ink); margin-bottom: 10px; }
.period-popover-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.period-popover-row label { display: flex; flex-direction: column; gap: 4px; font-size: 11px; font-weight: 700; color: var(--muted); }
.period-popover-row input {
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 6px 8px;
  font: inherit;
  font-size: 12px;
  color: var(--ink);
}
.period-popover-actions { display: flex; justify-content: flex-end; gap: 6px; margin-top: 12px; }

/* Targets */
.targets-card {
  background: #fff;
  border-radius: 18px;
  border: 1px solid var(--line);
  box-shadow: var(--card-shadow);
  padding: 16px 18px;
  margin-bottom: 20px;
  position: relative;
  overflow: hidden;
}

.targets-card::after {
  content: '';
  position: absolute;
  right: -80px;
  top: -80px;
  width: 240px;
  height: 240px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(99, 102, 241, 0.12), transparent 70%);
  pointer-events: none;
}

.targets-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
  position: relative;
  z-index: 1;
}

.targets-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  position: relative;
  z-index: 1;
}

.target-tile {
  --tg: #6366F1;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border-radius: 16px;
  border: 1px solid var(--line);
  background: linear-gradient(135deg, color-mix(in srgb, var(--tg) 7%, #fff), #fff 60%);
  min-width: 0;
  transition: transform 0.2s, box-shadow 0.2s;
}

.target-tile:hover {
  transform: translateY(-2px);
  box-shadow: 0 16px 34px -18px color-mix(in srgb, var(--tg) 55%, transparent);
}

.target-ring { flex-shrink: 0; width: 112px; height: 112px; }
.target-body { flex: 1; min-width: 0; }

.target-label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  color: var(--muted);
}

.target-value {
  font-size: 19px;
  font-weight: 800;
  letter-spacing: -0.3px;
  color: var(--ink);
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.target-of { font-size: 12px; font-weight: 600; color: #94A3B8; }

.target-status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 6px;
  padding: 2px 9px 2px 7px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 800;
  background: #F1F5F9;
  color: #475569;
}

.target-status i { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
.target-tile.achieved .target-status { background: #ECFDF5; color: #047857; }
.target-tile.ahead .target-status    { background: #EFF6FF; color: #1D4ED8; }
.target-tile.on-track .target-status { background: #F0FDFA; color: #0F766E; }
.target-tile.behind .target-status   { background: #FEF2F2; color: #B91C1C; }

.target-forecast {
  margin-top: 6px;
  font-size: 11px;
  color: var(--muted);
  line-height: 1.35;
}

.target-track {
  position: relative;
  margin-top: 8px;
  height: 6px;
  border-radius: 999px;
  background: #EEF2F7;
}

.target-track i {
  display: block;
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, var(--tg), color-mix(in srgb, var(--tg) 55%, #fff));
  transform-origin: left center;
  animation: bar-in 0.9s cubic-bezier(0.2, 0.8, 0.2, 1) both;
  animation-delay: 0.25s;
}

.target-track b {
  position: absolute;
  top: -4px;
  width: 2px;
  height: 14px;
  background: #0F172A;
  border-radius: 2px;
  transform: translateX(-1px);
}

.targets-empty {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  border-radius: 14px;
  background: #F5F3FF;
  border: 1px dashed #C7D2FE;
}

.target-dialog { overflow: hidden; }
.target-dialog-head { display: flex; align-items: center; gap: 12px; padding: 18px 20px 12px; border-bottom: 1px solid var(--line, #E6EAF2); }
.target-dialog-body { display: flex; flex-direction: column; gap: 14px; padding: 16px 20px; }
.target-dialog-actions { display: flex; justify-content: flex-end; gap: 8px; padding: 12px 20px 18px; border-top: 1px solid var(--line, #E6EAF2); }
.target-hint { font-size: 11.5px; color: #64748B; margin-top: 6px; }
.target-hint b { color: #0F172A; font-weight: 700; }
.target-error { font-size: 12px; color: #B91C1C; background: #FEF2F2; padding: 8px 10px; border-radius: 10px; }

/* Rejection reasons */
.reason-list { display: flex; flex-direction: column; gap: 6px; padding: 4px 2px 8px; }

.reason-row {
  display: grid;
  grid-template-columns: 9px minmax(90px, 1.3fr) 2fr auto auto;
  align-items: center;
  gap: 8px;
  font-size: 11.5px;
}

.reason-name { color: #334155; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.reason-bar { height: 6px; border-radius: 999px; background: #EEF2F7; overflow: hidden; }
.reason-bar i { display: block; height: 100%; border-radius: 999px; transform-origin: left center; animation: bar-in 0.9s cubic-bezier(0.2, 0.8, 0.2, 1) both; animation-delay: 0.25s; }
.reason-qty { font-weight: 800; color: var(--ink); font-variant-numeric: tabular-nums; white-space: nowrap; }
.reason-loss { font-weight: 700; color: #BE123C; font-variant-numeric: tabular-nums; white-space: nowrap; min-width: 52px; text-align: right; }
.reason-empty { flex-direction: column; gap: 8px; text-align: center; padding: 0 16px; line-height: 1.4; }

/* Insight Grid */
.insight-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
  margin-bottom: 20px;
}

.insight-card {
  --tone: #3B82F6;
  --tone-soft: #EFF6FF;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 14px 8px 14px 0;
  background: #fff;
  border-radius: 18px;
  border: 1px solid var(--line);
  box-shadow: var(--card-shadow);
  transition: transform 0.2s, box-shadow 0.2s;
  position: relative;
  overflow: hidden;
}

.insight-card.tone-blue   { --tone: #3B82F6; --tone-soft: #EFF6FF; }
.insight-card.tone-orange { --tone: #F97316; --tone-soft: #FFF7ED; }
.insight-card.tone-green  { --tone: #10B981; --tone-soft: #ECFDF5; }
.insight-card.tone-violet { --tone: #8B5CF6; --tone-soft: #F5F3FF; }

.insight-card::after {
  content: '';
  position: absolute;
  right: -40px;
  top: -40px;
  width: 140px;
  height: 140px;
  border-radius: 50%;
  background: var(--tone-soft);
  z-index: 0;
}

.insight-card:hover {
  box-shadow: 0 16px 36px -16px color-mix(in srgb, var(--tone) 45%, transparent);
  transform: translateY(-2px);
}

.insight-rail {
  width: 5px;
  align-self: stretch;
  border-radius: 0 6px 6px 0;
  background: linear-gradient(180deg, var(--tone), color-mix(in srgb, var(--tone) 40%, #fff));
  margin-right: 8px;
  flex-shrink: 0;
}

.insight-body {
  flex: 1;
  min-width: 0;
  position: relative;
  z-index: 1;
}

.insight-top {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.insight-icon-wrap {
  width: 30px;
  height: 30px;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 6px 14px color-mix(in srgb, var(--tone) 40%, transparent);
}

.icon-blue   { background: linear-gradient(135deg, #2563EB, #60A5FA); }
.icon-orange { background: linear-gradient(135deg, #EA580C, #FB923C); }
.icon-green  { background: linear-gradient(135deg, #059669, #34D399); }
.icon-violet { background: linear-gradient(135deg, #7C3AED, #A78BFA); }

.insight-label {
  font-size: 11px;
  font-weight: 700;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.insight-value {
  font-size: 22px;
  font-weight: 800;
  line-height: 1.1;
  color: var(--ink);
  letter-spacing: -0.3px;
}

.insight-sub {
  font-size: 11.5px;
  color: #94A3B8;
  margin: 4px 0 10px;
}

.insight-kpis {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.insight-kpis span {
  font-size: 11px;
  font-weight: 600;
  color: #475569;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.insight-kpis span::before {
  content: '';
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--tone);
  flex-shrink: 0;
}

.insight-ring {
  position: relative;
  z-index: 1;
  flex-shrink: 0;
  width: 104px;
  height: 104px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.insight-ring :deep(.apexcharts-canvas) { margin: 0; }

/* Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  margin-bottom: 20px;
}

.stat-tile {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  background: #fff;
  border-radius: 14px;
  border: 1px solid var(--line);
  box-shadow: var(--card-shadow);
  transition: all 0.15s;
  min-width: 0;
}

.stat-tile:hover {
  border-color: color-mix(in srgb, var(--tile-color) 45%, #fff);
  box-shadow: 0 10px 22px -12px color-mix(in srgb, var(--tile-color) 60%, transparent);
  transform: translateY(-1px);
}

.stat-icon-box {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: var(--tile-color);
  background: color-mix(in srgb, var(--tile-color) 12%, #fff);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--tile-color) 22%, #fff);
}

.stat-content {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.stat-label {
  font-size: 11px;
  font-weight: 700;
  color: #94A3B8;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.stat-value {
  font-size: 14px;
  font-weight: 800;
  color: var(--ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Charts */
.charts-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
  margin-bottom: 20px;
}

.chart-card {
  background: #fff;
  border-radius: 18px;
  border: 1px solid var(--line);
  box-shadow: var(--card-shadow);
  padding: 16px 18px 10px;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.chart-card-wide { grid-column: span 2; }

.chart-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 6px;
}

.chart-title {
  font-size: 14px;
  font-weight: 800;
  color: var(--ink);
  letter-spacing: -0.2px;
}

.chart-sub {
  font-size: 11.5px;
  color: var(--muted);
  margin-top: 2px;
}

.chart-legend {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.chart-legend span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 600;
  color: var(--muted);
}

.chart-legend i {
  width: 10px;
  height: 10px;
  border-radius: 3px;
}

.chart-empty {
  flex: 1;
  min-height: 180px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  color: #94A3B8;
}

.split-legend {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px 14px;
  padding: 4px 4px 8px;
}

.split-legend-row {
  display: flex;
  align-items: center;
  gap: 7px;
  min-width: 0;
}

.split-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  flex-shrink: 0;
}

.split-label {
  font-size: 11.5px;
  color: var(--muted);
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.split-value {
  font-size: 12px;
  font-weight: 800;
  color: var(--ink);
}

.attention-count {
  min-width: 28px;
  height: 28px;
  padding: 0 9px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 800;
  color: #fff;
  background: linear-gradient(135deg, #F43F5E, #FB923C);
  box-shadow: 0 6px 14px rgba(244, 63, 94, 0.3);
}

.attention-count.ok {
  background: linear-gradient(135deg, #10B981, #34D399);
  box-shadow: 0 6px 14px rgba(16, 185, 129, 0.3);
}

.attention-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 6px;
  max-height: 232px;
  overflow-y: auto;
  padding-right: 2px;
}

.attention-item {
  --a: #F97316;
  --a-soft: #FFF7ED;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 10px;
  border-radius: 12px;
  border: 1px solid transparent;
  background: var(--a-soft);
  text-align: left;
  cursor: pointer;
  transition: border-color 0.15s, transform 0.15s;
  width: 100%;
}

.attention-item:hover {
  border-color: color-mix(in srgb, var(--a) 40%, #fff);
  transform: translateX(2px);
}

.attention-item.red    { --a: #EF4444; --a-soft: #FEF2F2; }
.attention-item.orange { --a: #F97316; --a-soft: #FFF7ED; }
.attention-item.violet { --a: #8B5CF6; --a-soft: #F5F3FF; }
.attention-item.green  { --a: #10B981; --a-soft: #ECFDF5; }

.attention-icon {
  width: 28px;
  height: 28px;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  background: var(--a);
  flex-shrink: 0;
}

.attention-text { flex: 1; min-width: 0; }

.attention-title {
  font-size: 12px;
  font-weight: 700;
  color: var(--ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.attention-desc {
  font-size: 11px;
  color: var(--muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.attention-arrow { color: var(--a); flex-shrink: 0; }

.attention-empty {
  flex: 1;
  min-height: 180px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 13px;
  color: var(--muted);
}

/* Motion */
@keyframes rise {
  from { opacity: 0; transform: translateY(14px) scale(0.985); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}

@keyframes bar-in {
  from { transform: scaleX(0); }
  to   { transform: scaleX(1); }
}

@keyframes drift {
  0%   { transform: translate3d(0, 0, 0) scale(1); }
  50%  { transform: translate3d(-30px, 18px, 0) scale(1.08); }
  100% { transform: translate3d(0, 0, 0) scale(1); }
}

@keyframes shimmer {
  from { background-position: -200% 0; }
  to   { background-position: 200% 0; }
}

.reveal {
  animation: rise 0.55s cubic-bezier(0.22, 0.8, 0.26, 1) backwards;
  animation-delay: calc(var(--i, 0) * 45ms);
}

.hero-glow { animation: drift 14s ease-in-out infinite; }
.hero-glow-b { animation-duration: 18s; animation-direction: reverse; }

.hero-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px);
  background-size: 36px 36px;
  mask-image: radial-gradient(ellipse at 30% 0%, #000 20%, transparent 70%);
  pointer-events: none;
}

.progress-fill,
.insight-bar-fill,
.order-table-summary-bar i,
.order-mini-bar i,
.cell-bar-track i {
  transform-origin: left center;
  animation: bar-in 0.9s cubic-bezier(0.2, 0.8, 0.2, 1) both;
  animation-delay: 0.25s;
}

.order-table tbody tr,
.pretty-table tbody tr,
.receipt-row {
  animation: rise 0.4s ease both;
  animation-delay: calc(var(--i, 0) * 35ms);
}

.chart-card,
.table-card,
.pulse-tile,
.stat-tile,
.insight-card {
  position: relative;
}

.chart-card::before,
.table-card::before,
.pulse-tile::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  padding: 1px;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.35), transparent 40%, transparent 60%, rgba(236, 72, 153, 0.25));
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  opacity: 0;
  transition: opacity 0.25s;
  pointer-events: none;
}

.chart-card:hover::before,
.table-card:hover::before,
.pulse-tile:hover::before { opacity: 1; }

.chart-card,
.table-card { transition: transform 0.2s, box-shadow 0.2s; }

.chart-card:hover,
.table-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 18px 40px -20px rgba(15, 23, 42, 0.25);
}

@media (prefers-reduced-motion: reduce) {
  .reveal,
  .order-table tbody tr,
  .pretty-table tbody tr,
  .receipt-row,
  .progress-fill,
  .insight-bar-fill,
  .order-table-summary-bar i,
  .order-mini-bar i,
  .cell-bar-track i,
  .hero-glow { animation: none !important; }
}

/* Pulse strip */
.pulse-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 20px;
}

.pulse-tile {
  --p: #6366F1;
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 16px;
  padding: 14px 16px 12px;
  box-shadow: var(--card-shadow);
  overflow: hidden;
  transition: transform 0.2s, box-shadow 0.2s;
}

.pulse-tile:hover {
  transform: translateY(-2px);
  box-shadow: 0 14px 30px -16px color-mix(in srgb, var(--p) 55%, transparent);
}

.pulse-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.pulse-icon {
  width: 28px;
  height: 28px;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--p);
  background: color-mix(in srgb, var(--p) 12%, #fff);
}

.pulse-label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  color: var(--muted);
}

.pulse-value {
  font-size: 22px;
  font-weight: 800;
  letter-spacing: -0.4px;
  color: var(--ink);
  line-height: 1.1;
}

.pulse-delta {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-top: 8px;
  padding: 3px 8px 3px 6px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 800;
}

.pulse-delta span { font-weight: 600; opacity: 0.75; }
.pulse-delta.up   { background: #ECFDF5; color: #047857; }
.pulse-delta.down { background: #FEF2F2; color: #B91C1C; }
.pulse-delta.flat { background: #F1F5F9; color: #64748B; }

.pulse-sub {
  margin-top: 8px;
  font-size: 11.5px;
  color: var(--muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pulse-spark {
  position: absolute;
  right: -20px;
  bottom: -30px;
  width: 90px;
  height: 90px;
  border-radius: 50%;
  background: radial-gradient(circle, color-mix(in srgb, var(--p) 18%, transparent), transparent 70%);
  pointer-events: none;
}

.charts-grid-3 { grid-template-columns: repeat(2, 1fr); }

.chip-soft {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 800;
  white-space: nowrap;
}

.chip-soft.rose    { background: #FFF1F2; color: #BE123C; }
.chip-soft.emerald { background: #ECFDF5; color: #047857; }

/* Tables row */
.tables-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 14px;
  margin-bottom: 20px;
}

.table-card {
  background: #fff;
  border-radius: 18px;
  border: 1px solid var(--line);
  box-shadow: var(--card-shadow);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.table-head {
  padding: 16px 18px 12px;
  margin-bottom: 0;
  border-bottom: 1px solid var(--line);
}

.legend-dots {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.legend-dots span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 600;
  color: var(--muted);
}

.legend-dots i {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.legend-dots i.healthy  { background: #10B981; }
.legend-dots i.follow   { background: #F59E0B; }
.legend-dots i.critical { background: #EF4444; }

.pretty-table-scroll {
  overflow: auto;
  max-height: 440px;
}

.pretty-table {
  width: 100%;
  min-width: 860px;
  border-collapse: separate;
  border-spacing: 0;
}

.pretty-table th,
.pretty-table td {
  padding: 11px 14px;
  font-size: 12.5px;
  text-align: left;
  border-bottom: 1px solid #F1F5F9;
  vertical-align: middle;
  color: #334155;
  white-space: nowrap;
}

.pretty-table thead th {
  position: sticky;
  top: 0;
  z-index: 1;
  background: #F8FAFC;
  font-size: 11px;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  color: #64748B;
  font-weight: 700;
}

.pretty-table th.num,
.pretty-table td.num {
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.pretty-table th.rank,
.pretty-table td.rank { width: 44px; text-align: center; }

.pretty-table tbody tr {
  cursor: pointer;
  transition: background 0.15s;
}

.pretty-table tbody tr:hover { background: #F5F7FF; }
.pretty-table tbody tr:hover .cell-title { color: #4338CA; }
.pretty-table tbody tr:last-child td { border-bottom: none; }

.rank-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 800;
  color: #64748B;
  background: #F1F5F9;
}

.rank-badge.top {
  color: #fff;
  background: linear-gradient(135deg, #F59E0B, #F97316);
  box-shadow: 0 4px 10px rgba(245, 158, 11, 0.35);
}

.cell-company {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.cell-avatar {
  width: 32px;
  height: 32px;
  font-size: 11px;
  flex-shrink: 0;
}

.cell-company-text { min-width: 0; }

.cell-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 220px;
  transition: color 0.15s;
}

.cell-sub {
  font-size: 11px;
  color: #94A3B8;
  display: flex;
  align-items: center;
  gap: 4px;
}

.cell-dim { color: #94A3B8; font-weight: 500; }
.text-emerald { color: #047857; font-weight: 700; }

.cell-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 120px;
}

.cell-bar span {
  font-size: 11.5px;
  font-weight: 800;
  color: #475569;
  min-width: 34px;
  text-align: right;
}

.cell-bar-track {
  flex: 1;
  height: 7px;
  border-radius: 999px;
  background: #EEF2F7;
  overflow: hidden;
}

.cell-bar-track i {
  display: block;
  height: 100%;
  border-radius: 999px;
}

.cell-bar-track i.indigo  { background: linear-gradient(90deg, #6366F1, #22D3EE); }
.cell-bar-track i.emerald { background: linear-gradient(90deg, #10B981, #34D399); }
.cell-bar-track i.sky     { background: linear-gradient(90deg, #0EA5E9, #38BDF8); }
.cell-bar-track i.amber   { background: linear-gradient(90deg, #F59E0B, #FB923C); }

.amount-chip {
  display: inline-block;
  padding: 3px 9px;
  border-radius: 8px;
  font-weight: 800;
  font-size: 12px;
}

.amount-chip.amber   { background: #FFF7ED; color: #C2410C; }
.amount-chip.emerald { background: #ECFDF5; color: #047857; }

.status-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 10px 3px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
}

.status-pill i {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
  box-shadow: 0 0 0 3px color-mix(in srgb, currentColor 20%, transparent);
}

.status-pill.healthy  { background: #ECFDF5; color: #047857; }
.status-pill.follow   { background: #FFFBEB; color: #B45309; }
.status-pill.critical { background: #FEF2F2; color: #B91C1C; }

.receipt-list {
  display: flex;
  flex-direction: column;
  padding: 6px 10px 10px;
  max-height: 440px;
  overflow-y: auto;
}

.receipt-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 8px;
  border-radius: 12px;
  transition: background 0.15s;
}

.receipt-row:hover { background: #F8FAFC; }
.receipt-text { flex: 1; min-width: 0; }

.receipt-amount {
  font-size: 13px;
  font-weight: 800;
  color: #047857;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.mode-chip {
  display: inline-block;
  padding: 1px 7px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  text-transform: capitalize;
  background: #F1F5F9;
  color: #475569;
}

.mode-chip.cash   { background: #FFFBEB; color: #B45309; }
.mode-chip.bank   { background: #EFF6FF; color: #1D4ED8; }
.mode-chip.cheque { background: #F5F3FF; color: #6D28D9; }
.mode-chip.upi    { background: #ECFDF5; color: #047857; }

/* Smart insights strip */
.smart-strip {
  background: linear-gradient(135deg, #F5F3FF 0%, #EEF2FF 50%, #F0F9FF 100%);
  border: 1px solid #E0E7FF;
  border-radius: 18px;
  padding: 14px 16px;
  margin-bottom: 20px;
}

.smart-strip-head {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #4338CA;
  margin-bottom: 10px;
}

.smart-count {
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  border-radius: 999px;
  background: #4338CA;
  color: #fff;
  font-size: 11px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.smart-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 10px;
}

.smart-card {
  --s: #6366F1;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 11px 12px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.9);
  box-shadow: 0 6px 18px -12px rgba(67, 56, 202, 0.35);
  position: relative;
  min-width: 0;
}

.smart-card.warning  { --s: #F59E0B; }
.smart-card.critical { --s: #EF4444; }
.smart-card.success  { --s: #10B981; }
.smart-card.info     { --s: #0EA5E9; }

.smart-icon {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  background: var(--s);
  box-shadow: 0 6px 14px color-mix(in srgb, var(--s) 40%, transparent);
}

.smart-body { flex: 1; min-width: 0; }

.smart-text {
  font-size: 13px;
  font-weight: 700;
  color: var(--ink);
  line-height: 1.3;
}

.smart-details {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-top: 6px;
}

.smart-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11px;
  color: #475569;
  background: color-mix(in srgb, var(--s) 10%, #fff);
  border: 1px solid color-mix(in srgb, var(--s) 25%, #fff);
  max-width: 100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.smart-chip b { color: var(--ink); font-weight: 700; }
.smart-chip.more { background: #F1F5F9; border-color: #E2E8F0; }

.smart-cat {
  display: inline-block;
  vertical-align: middle;
  margin-left: 6px;
  padding: 1px 7px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  color: var(--s);
  background: color-mix(in srgb, var(--s) 12%, #fff);
}

/* Profit & cost */
.pl-kpis {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  margin: 6px 0 4px;
}

.pl-kpi {
  --k: #6366F1;
  padding: 10px 12px;
  border-radius: 12px;
  background: color-mix(in srgb, var(--k) 7%, #fff);
  border-left: 3px solid var(--k);
  min-width: 0;
}

.pl-kpi-label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  color: var(--muted);
}

.pl-kpi-value {
  font-size: 19px;
  font-weight: 800;
  letter-spacing: -0.3px;
  color: var(--k);
  margin-top: 2px;
}

.pl-kpi-value.negative { color: #DC2626; }

.pl-kpi-sub {
  font-size: 11px;
  color: #94A3B8;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pl-foot {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 18px;
  padding: 6px 4px 6px;
  border-top: 1px dashed var(--line);
  font-size: 11.5px;
  color: var(--muted);
}

.pl-foot b { color: var(--ink); font-weight: 700; margin-right: 4px; }

/* Production health */
.health-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 4px;
}

.health-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 8px;
  border-radius: 12px;
  transition: background 0.15s;
}

.health-row:hover { background: #F8FAFC; }

.health-icon {
  --h: #6366F1;
  width: 30px;
  height: 30px;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--h);
  background: color-mix(in srgb, var(--h) 12%, #fff);
  flex-shrink: 0;
}

.health-text { flex: 1; min-width: 0; }
.health-label { font-size: 12.5px; font-weight: 700; color: var(--ink); }
.health-sub { font-size: 11px; color: #94A3B8; }

.health-value {
  font-size: 14px;
  font-weight: 800;
  color: var(--ink);
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.shift-mix {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-top: 8px;
  padding: 10px 8px 4px;
  border-top: 1px dashed var(--line);
}

.shift-legend { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 5px; }
.shift-title { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.4px; color: var(--muted); margin-bottom: 2px; }

.chip-soft.teal  { background: #F0FDFA; color: #0F766E; }
.chip-soft.amber { background: #FFFBEB; color: #B45309; }

/* Stalled orders */
.pretty-table.compact { min-width: 640px; }
.pretty-table.compact th,
.pretty-table.compact td { padding: 9px 12px; }

.age-pill {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 800;
  background: #F1F5F9;
  color: #475569;
}

.age-pill.healthy  { background: #ECFDF5; color: #047857; }
.age-pill.follow   { background: #FFFBEB; color: #B45309; }
.age-pill.critical { background: #FEF2F2; color: #B91C1C; }

/* Receivables aging */
.aging-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  padding: 14px 16px 16px;
}

.aging-card {
  --a: #10B981;
  border-radius: 14px;
  border: 1px solid var(--line);
  border-top: 3px solid var(--a);
  padding: 12px 12px 10px;
  background: #fff;
  min-width: 0;
  animation: rise 0.4s ease both;
  animation-delay: calc(var(--i, 0) * 40ms);
  transition: transform 0.15s, box-shadow 0.15s;
}

.aging-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 26px -16px color-mix(in srgb, var(--a) 60%, transparent);
}

.aging-card.healthy  { --a: #10B981; }
.aging-card.follow   { --a: #F59E0B; }
.aging-card.critical { --a: #EF4444; background: linear-gradient(180deg, #FFF5F5, #fff 60%); }

.aging-top {
  display: flex;
  align-items: center;
  gap: 10px;
}

.aging-top .age-pill {
  background: color-mix(in srgb, var(--a) 12%, #fff);
  color: var(--a);
  flex-shrink: 0;
}

.aging-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px dashed var(--line);
}

.aging-pending {
  font-size: 12px;
  font-weight: 800;
  color: #C2410C;
  white-space: nowrap;
}

/* Section Card */
.section-card {
  background: #fff;
  border-radius: 22px;
  border: 1px solid var(--line);
  box-shadow: var(--card-shadow);
  margin-bottom: 24px;
  overflow: hidden;
}

.section-header {
  padding: 18px 22px;
  border-bottom: 1px solid var(--line);
  background: #fff;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.section-header.simple {
  align-items: center;
}

.section-header-left {
  display: flex;
  align-items: center;
  gap: 14px;
}

.section-icon {
  width: 42px;
  height: 42px;
  border-radius: 13px;
  background: linear-gradient(135deg, #0F172A, #4338CA);
  box-shadow: 0 8px 18px rgba(67, 56, 202, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.section-title {
  font-size: 17px;
  font-weight: 800;
  color: var(--ink);
  letter-spacing: -0.2px;
}

.section-sub {
  font-size: 12.5px;
  color: var(--muted);
  margin-top: 1px;
}

.section-header-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 10px;
}

.section-badges {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.s-badge {
  padding: 5px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.s-badge::before {
  content: '';
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: currentColor;
}

.s-badge.blue { background: #EEF2FF; color: #4338CA; }
.s-badge.green { background: #ECFDF5; color: #047857; }
.s-badge.orange { background: #FFF7ED; color: #C2410C; }

.section-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
  align-items: center;
}

.dashboard-search {
  min-width: 240px;
  max-width: 320px;
}

.dashboard-search :deep(.v-field) {
  border-radius: 12px;
  background: #F8FAFC;
  border-color: #E2E8F0;
  transition: all 0.2s;
  font-size: 0.8rem;
}

.dashboard-search :deep(input::placeholder) {
  font-size: 0.75rem;
}

.dashboard-search :deep(.v-field:hover) {
  background: #fff;
  border-color: #94A3B8;
}

.dashboard-search :deep(.v-field--focused) {
  background: #fff;
  border-color: #1565C0;
  box-shadow: 0 0 0 3px rgba(21, 101, 192, 0.1);
}

/* Company List */
.company-list {
  padding: 16px 18px 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  background: #F8FAFC;
}

.company-card {
  --cc: var(--company-color, #4338CA);
  border: 1px solid var(--line);
  border-radius: 18px;
  padding: 16px 18px;
  background: #fff;
  box-shadow: var(--card-shadow);
  transition: box-shadow 0.2s, border-color 0.2s;
  position: relative;
  overflow: hidden;
}

.company-card::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 6px;
  background: linear-gradient(180deg, var(--cc), color-mix(in srgb, var(--cc) 35%, #fff));
}

.company-card:hover {
  border-color: color-mix(in srgb, var(--cc) 35%, #fff);
  box-shadow: 0 18px 40px -22px color-mix(in srgb, var(--cc) 55%, transparent);
}

.company-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  cursor: pointer;
  user-select: none;
  padding-left: 6px;
}

.company-header:focus-visible {
  outline: 2px solid var(--cc);
  outline-offset: 3px;
  border-radius: 8px;
}

.company-header-left {
  display: flex;
  align-items: center;
  gap: 14px;
}

.company-name {
  font-size: 16.5px;
  font-weight: 800;
  color: var(--ink);
  letter-spacing: -0.2px;
}

.company-meta {
  font-size: 12.5px;
  color: var(--muted);
  margin-top: 1px;
}

.company-header-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

/* Company Metrics */
.company-metrics {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 12px;
  margin-top: 14px;
  padding-left: 6px;
}

.metric-group {
  min-width: 0;
  border-radius: 14px;
  padding: 10px 12px 12px;
  border: 1px solid var(--line);
  background: #FCFDFF;
}

.metric-group.finance { background: linear-gradient(180deg, #F5F7FF 0%, #fff 100%); }
.metric-group.production { background: linear-gradient(180deg, #FFF8F3 0%, #fff 100%); }

.metric-group-title {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  color: #6366F1;
  margin-bottom: 8px;
}

.metric-group.production .metric-group-title { color: #EA580C; }

.metric-row {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 0;
}

.metric-pill {
  --pill-color: #64748B;
  padding: 2px 10px;
  border-left: 1px solid var(--line);
  min-width: 0;
}

.metric-pill:first-child {
  border-left: none;
  padding-left: 0;
}

.metric-label {
  display: block;
  font-size: 11px;
  font-weight: 700;
  color: #94A3B8;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.metric-value {
  display: block;
  font-size: 14.5px;
  font-weight: 800;
  margin-top: 2px;
  color: var(--pill-color);
  letter-spacing: -0.2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.metric-pill.payable { --pill-color: #2563EB; }
.metric-pill.paid { --pill-color: #059669; }
.metric-pill.pending { --pill-color: #EA580C; }
.metric-pill.deduction { --pill-color: #DC2626; }
.metric-pill.unallocated { --pill-color: #0891B2; }
.metric-pill.meter-lost { --pill-color: #E11D48; }
.metric-pill.loss { --pill-color: #BE123C; }
.metric-pill.settle { --pill-color: #16A34A; }
.metric-pill.is-good { --pill-color: #16A34A; }
.metric-pill.is-mid { --pill-color: #2563EB; }
.metric-pill.is-low { --pill-color: #EA580C; }
.metric-pill.deduction-collected { --pill-color: #9333EA; }
.metric-pill.avg-rate { --pill-color: #2563EB; }

/* Expanded Section */
.company-expanded {
  margin-top: 14px;
  padding-top: 14px;
  padding-left: 6px;
  border-top: 1px dashed #E2E8F0;
}

.progress-section {
  margin-bottom: 14px;
}

.progress-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.progress-block {
  padding: 12px 16px;
  background: #F8FAFC;
  border-radius: 14px;
  border: 1px solid var(--line);
}

.progress-block.settle-block { background: linear-gradient(135deg, #ECFDF5, #fff 70%); border-color: #BBF7D0; }
.progress-block.deduct-block { background: linear-gradient(135deg, #FFF1F2, #fff 70%); border-color: #FECDD3; }

.progress-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.progress-title {
  font-size: 12.5px;
  font-weight: 700;
  color: #475569;
}

.progress-pct {
  font-size: 13px;
  font-weight: 800;
  color: var(--ink);
}

.progress-track {
  height: 8px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.08);
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: 999px;
  transition: width 0.5s ease;
}

.progress-fill.settlement.is-good { background: linear-gradient(90deg, #22C55E, #10B981); }
.progress-fill.settlement.is-mid { background: linear-gradient(90deg, #3B82F6, #14B8A6); }
.progress-fill.settlement.is-low { background: linear-gradient(90deg, #F59E0B, #F97316); }

.progress-fill.deduction.is-good { background: linear-gradient(90deg, #22C55E, #10B981); }
.progress-fill.deduction.is-mid { background: linear-gradient(90deg, #F97316, #EC4899); }
.progress-fill.deduction.is-low { background: linear-gradient(90deg, #F59E0B, #EF4444); }

.progress-detail {
  display: block;
  margin-top: 6px;
  font-size: 11px;
  color: var(--muted);
}

/* Order Table */
.order-table-wrap {
  border: 1px solid var(--line);
  border-radius: 16px;
  overflow: hidden;
  background: #fff;
}

.order-table-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 16px;
  background: #fff;
  border-bottom: 1px solid var(--line);
}

.order-table-title {
  display: inline-flex;
  align-items: center;
  font-size: 13px;
  font-weight: 800;
  color: var(--ink);
}

.order-count-chip {
  margin-left: 8px;
  padding: 1px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 800;
  color: #4338CA;
  background: #EEF2FF;
}

.order-table-summary {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
  font-weight: 700;
  color: #475569;
}

.order-table-summary-bar {
  width: 120px;
  height: 6px;
  border-radius: 999px;
  background: #EEF2F7;
  overflow: hidden;
}

.order-table-summary-bar i {
  display: block;
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #6366F1, #22D3EE);
  transition: width 0.5s ease;
}

.order-table-scroll {
  overflow-x: auto;
}

.order-table {
  width: 100%;
  min-width: 1080px;
  border-collapse: separate;
  border-spacing: 0;
}

.order-table th,
.order-table td {
  padding: 10px 12px;
  font-size: 12.5px;
  text-align: left;
  border-bottom: 1px solid #F1F5F9;
  vertical-align: middle;
  color: #334155;
}

.order-table th.num,
.order-table td.num {
  text-align: right;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.order-table td.muted { color: #94A3B8; }
.order-table td.is-bad { color: #E11D48; font-weight: 700; }
.order-table td.is-accepted { color: #0F766E; font-weight: 700; }

.order-table thead th {
  font-size: 11px;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  color: #64748B;
  font-weight: 700;
  white-space: nowrap;
  background: #F8FAFC;
  position: sticky;
  top: 0;
}

.order-table-groups th {
  padding: 6px 12px;
  font-size: 11px;
  letter-spacing: 0.8px;
  text-align: center;
  background: #fff;
  border-bottom: none;
}

.order-table-groups .group-meters {
  color: #0369A1;
  background: linear-gradient(180deg, #F0F9FF, #fff);
  border-radius: 8px 8px 0 0;
}

.order-table-groups .group-money {
  color: #6D28D9;
  background: linear-gradient(180deg, #F5F3FF, #fff);
  border-radius: 8px 8px 0 0;
}

.order-table tbody tr {
  cursor: pointer;
  transition: background 0.15s, box-shadow 0.15s;
}

.order-table tbody tr:hover {
  background: #F5F7FF;
}

.order-table tbody tr:hover td:first-child {
  box-shadow: inset 3px 0 0 #6366F1;
}

.order-table tbody tr.highlight-row {
  animation: row-highlight 3s ease-out;
}

@keyframes row-highlight {
  0%, 20% { background: #DBEAFE; }
  100% { background: transparent; }
}

.order-name-cell {
  min-width: 200px;
}

.order-link {
  color: var(--ink);
  font-weight: 700;
  text-decoration: none;
  white-space: normal;
  overflow-wrap: anywhere;
}

.order-link:hover {
  color: #4338CA;
  text-decoration: underline;
}

.order-mini-bar {
  margin-top: 5px;
  height: 4px;
  width: 120px;
  border-radius: 999px;
  background: #EEF2F7;
  overflow: hidden;
}

.order-mini-bar i {
  display: block;
  height: 100%;
  border-radius: 999px;
  background: #94A3B8;
}

.order-mini-bar i.info { background: linear-gradient(90deg, #3B82F6, #22D3EE); }
.order-mini-bar i.good { background: linear-gradient(90deg, #10B981, #34D399); }

.order-state {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 10px 3px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
}

.order-state i {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}

.order-state.neutral { background: #F1F5F9; color: #64748B; }
.order-state.info { background: #EFF6FF; color: #1D4ED8; }
.order-state.good { background: #ECFDF5; color: #047857; }

.payable-chip {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 8px;
  font-weight: 800;
  color: #065F46;
  background: #D1FAE5;
}

.order-table tfoot td {
  padding: 12px;
  font-size: 12px;
  font-weight: 800;
  color: var(--ink);
  background: #0F172A;
  color: #fff;
  border-top: none;
  border-bottom: none;
}

.order-table tfoot td:first-child { border-radius: 0 0 0 14px; }
.order-table tfoot td:last-child { border-radius: 0 0 14px 0; color: #6EE7B7; }

.no-orders {
  padding: 24px;
  text-align: center;
  font-size: 13px;
  color: #94A3B8;
}

.empty-state {
  padding: 60px 24px;
  text-align: center;
  color: #94A3B8;
}

.empty-state p {
  margin-top: 8px;
  font-size: 14px;
}

/* ── Payment Dialog (Receipt & Deduction Management) ───────────────────── */
.pd {
  border: none;
  overflow: hidden;
  box-shadow: var(--pay-shadow-lg);
  border-radius: 20px !important;
  background: var(--pay-bg) !important;
  display: flex;
  flex-direction: column;
  max-height: calc(100vh - 48px);
}

.v-dialog--fullscreen .pd {
  max-height: none;
  height: 100%;
  border-radius: 0 !important;
}

.pd-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  padding: 14px 22px 16px;
  background: #fff;
  border-bottom: 1px solid var(--pay-border);
  flex-shrink: 0;
}

.pd-header-left {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.pd-greeting {
  font-size: 12px;
  font-weight: 600;
  color: var(--pay-muted);
  margin-bottom: 4px;
}

.pd-title {
  font-size: 24px;
  font-weight: 800;
  color: #0D1B3E;
  letter-spacing: -0.5px;
  line-height: 1.15;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pd-subtitle {
  font-size: 13px;
  color: var(--pay-muted);
  margin-top: 3px;
}

.pd-header-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 10px;
  margin-left: auto;
}

.pd-header-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.pd-user {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 4px 6px 4px 4px;
  border-radius: 999px;
}

.pd-user-avatar {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: var(--pay-primary);
  color: #fff;
  font-size: 14px;
  font-weight: 800;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.pd-user-text { display: flex; flex-direction: column; line-height: 1.15; }
.pd-user-name { font-size: 13px; font-weight: 700; color: var(--pay-text); }
.pd-user-role { font-size: 11px; color: var(--pay-faint); }

.pd-range {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 36px;
  padding: 0 12px;
  border: 1px solid var(--pay-border);
  border-radius: 10px;
  background: #fff;
  color: var(--pay-neutral);
  transition: border-color 0.15s, box-shadow 0.15s;
}

.pd-range:focus-within {
  border-color: var(--pay-primary);
  box-shadow: 0 0 0 3px rgba(21, 101, 192, 0.12);
}

.pd-range-icon { color: var(--pay-muted); }
.pd-range-sep { color: var(--pay-faint); font-size: 12px; }

.pd-range-input {
  border: none;
  outline: none;
  background: transparent;
  font: inherit;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--pay-text);
  width: 128px;
  padding: 0;
}

.pd-range-input::-webkit-calendar-picker-indicator {
  opacity: 0.55;
  cursor: pointer;
  width: 14px;
  height: 14px;
}

.pd-filter-btn { padding: 0 14px !important; }
.pd-icon-only { min-width: 36px !important; padding: 0 !important; }

.pd-close-btn {
  color: var(--pay-muted) !important;
  border: 1px solid var(--pay-border);
  border-radius: 10px !important;
  margin-left: 4px;
}

.pd-close-btn:hover { color: var(--pay-text) !important; background: var(--pay-neutral-bg) !important; }

.pd-header {
  background: radial-gradient(circle at 92% 8%, rgba(59, 130, 246, 0.14), transparent 32%), linear-gradient(135deg, #ffffff 0%, #f6f9ff 48%, #eef5ff 100%);
  border-bottom-color: #d9e6ff;
}

.pd-header-left,
.pd-header-right {
  position: relative;
  z-index: 1;
}

.pd-summary .pay-stat,
.pd-grid .pay-card {
  border: 1px solid #d8e5ff;
  box-shadow: 0 18px 36px -28px rgba(30, 64, 175, 0.45);
  background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
}

.pd-summary .pay-stat {
  border-radius: 16px;
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}

.pd-summary .pay-stat:hover {
  transform: translateY(-2px);
  box-shadow: 0 22px 34px -24px rgba(30, 64, 175, 0.55);
}

.pd-grid .pay-card {
  border-radius: 18px;
}

.pd-form-card,
.pd-history {
  background: linear-gradient(180deg, #ffffff 0%, #f9fbff 100%);
}

.pd-history .pay-card__head {
  border-bottom: 1px solid #e5edff;
  background: linear-gradient(180deg, #fbfdff, #f4f8ff);
}

/* Body */
.pd-body {
  padding: 18px 22px 22px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow-y: auto;
  flex: 1 1 auto;
  min-height: 0;
}

/* Summary cards */
.pd-summary {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

/* Two-column layout */
.pd-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 340px;
  gap: 16px;
  align-items: stretch;
  flex-shrink: 0;
  /* keeps Overview + Meter Summary + 4 activity rows fully visible */
  min-height: 820px;
}

.pd-main,
.pd-side {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
}

/* Side column follows the main column's height; Recent Activity absorbs the difference */
.pd-side {
  contain: size;
}

.pd-side > .pay-card:last-child {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.pd-side > .pay-card:last-child .pay-card__body {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
}

/* Entry form */
.pd-form-card {
  transition: border-color 0.2s, box-shadow 0.2s;
}

.pd-form-card.is-editing {
  border-color: #FFCC80;
  box-shadow: 0 0 0 3px rgba(245, 124, 0, 0.10), var(--pay-shadow);
}

.pd-form-badge { text-transform: uppercase; letter-spacing: 0.3px; }

.pd-form-head-actions { display: flex; align-items: center; gap: 8px; }

.pd-form-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px 14px;
  align-items: end;
}

.pd-field { min-width: 0; }
.pd-field-notes { grid-column: 1 / span 3; }

.pd-form-btns {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: flex-end;
  grid-column: 4 / span 1;
}

.pd-form-btns .v-btn { flex: 0 1 auto; min-width: 0; padding: 0 14px !important; }
.pd-form-btns .pd-save-btn { flex: 1 1 auto; }

.pd-save-btn.is-editing {
  background: var(--pay-pending) !important;
  box-shadow: 0 4px 12px rgba(230, 81, 0, 0.24) !important;
}

.pd-words {
  display: inline-flex;
  align-items: center;
  margin-top: 12px;
  font-size: 12px;
  color: var(--pay-muted);
  padding: 6px 10px;
  background: var(--pay-neutral-bg);
  border-radius: 8px;
}

/* Payment History */
.pd-history {
  overflow: hidden;
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.pd-history .pay-card__head { flex-shrink: 0; }
.pd-history .pay-loading { flex: 1 1 auto; }
.pd-history .pay-empty { flex: 1 1 auto; }
.pd-history .pay-pager { flex-shrink: 0; }

.pd-history-tools {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1 1 220px;
  justify-content: flex-end;
}

.pd-search { max-width: 240px; min-width: 170px; width: 100%; }

.pd-tool-btn {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  border: 1px solid var(--pay-border);
  background: #fff;
  color: var(--pay-muted);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.15s;
}

.pd-tool-btn:hover { border-color: var(--pay-primary); color: var(--pay-primary); }
.pd-tool-btn.is-active { background: var(--pay-primary-bg); border-color: var(--pay-primary); color: var(--pay-primary); }
.pd-tool-btn:focus-visible { outline: 2px solid var(--pay-primary); outline-offset: 2px; }

.pd-menu { border-radius: 12px !important; min-width: 180px; }

.pd-history-scroll {
  flex: 1 1 auto;
  max-height: 520px;
  overflow-y: auto;
  overflow-x: hidden;
  border-radius: 0;
  display: flex;
  flex-direction: column;
}

.pd-history-table-wrap {
  overflow-x: hidden;
}

.pd-history-scroll .pd-table { flex-shrink: 0; }

.pd-table {
  min-width: 0;
  width: 100%;
  table-layout: fixed;
}

.pd-table thead th:nth-child(1),
.pd-table tbody td:nth-child(1) {
  width: 44px;
}

.pd-table thead th:nth-child(2),
.pd-table tbody td:nth-child(2) {
  width: 150px;
  white-space: nowrap;
}

.pd-table thead th:nth-child(3),
.pd-table tbody td:nth-child(3) {
  width: 108px;
}

.pd-table thead th:nth-child(4),
.pd-table tbody td:nth-child(4) {
  width: 116px;
}

.pd-table thead th:nth-child(5),
.pd-table tbody td:nth-child(5) {
  width: 120px;
}

.pd-table thead th:nth-child(7),
.pd-table tbody td:nth-child(7) {
  width: 92px;
}

.pd-table tbody tr:nth-child(even) td {
  background: #fbfdff;
}

.pd-table tbody tr:hover td {
  background: #f2f7ff;
}

.pd-row.is-editing-row td { background: #FFF8EE; }
.pd-row.is-editing-row:hover td { background: #FFF3E0; }

.pd-cell-date {
  font-size: 12.5px;
  color: var(--pay-neutral);
  font-weight: 500;
  white-space: nowrap;
}

.pd-mode-chip { text-transform: capitalize; }
.pd-mode-na { color: #CBD5E1; }

.pd-cell-notes {
  font-size: 12.5px;
  max-width: 220px;
  white-space: normal;
  overflow-wrap: anywhere;
  line-height: 1.35;
}

.pd-actions {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.pd-footer-row td { font-size: 12.5px; }

.pd-footer-label {
  text-align: right;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  color: var(--pay-neutral);
}

.pd-footer-amount {
  color: var(--pay-primary);
  font-size: 14px;
}

/* Side column */
.pd-overview {
  display: flex;
  align-items: center;
  gap: 12px;
}

.pd-overview .pay-donut { width: 104px; height: 104px; }
.pd-overview .pay-donut::after { inset: 13px; }
.pd-overview .pay-donut__value { font-size: 14px; }
.pd-overview .pay-donut__label { font-size: 11px; }
.pd-overview .pay-legend { gap: 9px; }
.pd-overview .pay-legend__item { font-size: 11.5px; gap: 6px; white-space: nowrap; }
.pd-overview .pay-legend__label { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; }
.pd-overview .pay-legend__value { font-size: 11.5px; }
.pd-overview .pay-legend__pct { font-size: 11px; min-width: 0; }

.pd-overview-scope { font-weight: 600; }

.pd-meter-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.pd-meter-grid .pay-mini {
  align-items: flex-start;
  gap: 10px;
  padding: 12px 10px 12px 12px;
}

.pd-mini-body { min-width: 0; flex: 1; }
.pd-mini-body .pay-mini__label { font-size: 11px; line-height: 1.25; }
.pd-mini-body .pay-mini__value { font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.pd-mini-body .pay-mini__sub { font-size: 11px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.pd-link-btn {
  border: none;
  background: transparent;
  color: var(--pay-primary);
  font: inherit;
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;
  padding: 4px 6px;
  border-radius: 6px;
}

.pd-link-btn:hover { background: var(--pay-primary-bg); }
.pd-link-btn:focus-visible { outline: 2px solid var(--pay-primary); outline-offset: 2px; }

.pd-activity-text { min-width: 0; }
.pd-activity-empty { padding: 18px 0; }
.pd-settle-history { flex-shrink: 0; }
.pd-settle-table { width: 100%; table-layout: auto; }
.pd-settle-table th, .pd-settle-table td { white-space: nowrap; }
.pd-settle-table td.pd-cell-notes { white-space: normal; min-width: 160px; }

/* Settlement snapshot dialog */
.snap-card { background: #F6F8FC; --tone: #1565C0; --tone-bg: #EBF3FF; }
.snap-tone-blue { --tone: #1565C0; --tone-bg: #EBF3FF; }
.snap-tone-teal { --tone: #00838F; --tone-bg: #E0F5F7; }
.snap-tone-green { --tone: #2E7D32; --tone-bg: #E8F5E9; }
.snap-tone-orange { --tone: #E65100; --tone-bg: #FFF3E0; }
.snap-tone-red { --tone: #C62828; --tone-bg: #FDECEC; }
.snap-tone-neutral { --tone: #475569; --tone-bg: #EEF2F7; }

.snap-hero {
  position: relative; display: flex; align-items: center; gap: 16px; flex-shrink: 0;
  padding: 22px 56px 22px 24px; color: #fff; overflow: hidden;
  background: linear-gradient(120deg, #0D47A1 0%, #1565C0 45%, #00897B 100%);
  background-size: 160% 160%; animation: snap-gradient 10s ease-in-out infinite alternate;
}
.snap-hero__glow {
  position: absolute; width: 220px; height: 220px; right: -40px; top: -90px; border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.28), transparent 70%);
  animation: snap-drift 7s ease-in-out infinite alternate; pointer-events: none;
}
.snap-hero__glow--b { width: 160px; height: 160px; right: auto; left: 30%; top: auto; bottom: -90px; animation-duration: 9s; animation-direction: alternate-reverse; }
.snap-hero__icon {
  position: relative; display: grid; place-items: center; width: 58px; height: 58px; flex-shrink: 0; border-radius: 18px;
  background: rgba(255, 255, 255, 0.18); border: 1px solid rgba(255, 255, 255, 0.35); backdrop-filter: blur(6px);
  animation: snap-pop 0.6s cubic-bezier(0.2, 1.4, 0.4, 1) both, snap-bob 3.2s ease-in-out 0.6s infinite;
}
.snap-hero__text { position: relative; min-width: 0; }
.snap-hero__eyebrow { font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; opacity: 0.8; }
.snap-hero__title { font-size: 24px; font-weight: 700; line-height: 1.2; overflow-wrap: anywhere; animation: snap-rise 0.5s 0.05s both; }
.snap-hero__chips { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
.snap-chip {
  display: inline-flex; align-items: center; gap: 5px; padding: 3px 10px; border-radius: 999px; font-size: 12px;
  background: rgba(255, 255, 255, 0.16); border: 1px solid rgba(255, 255, 255, 0.28);
  animation: snap-rise 0.5s both;
}
.snap-chip:nth-child(2) { animation-delay: 0.08s; }
.snap-chip:nth-child(3) { animation-delay: 0.16s; }
.snap-chip:nth-child(4) { animation-delay: 0.24s; }
.snap-hero__close { position: absolute; top: 10px; right: 10px; }

.snap-body { padding: 18px 22px 24px !important; }
.snap-body > * + * { margin-top: 16px; }

.snap-kpis { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 12px; }
.snap-kpi {
  position: relative; min-width: 0; padding: 14px 14px 12px; border-radius: 16px; background: #fff;
  border: 1px solid var(--pay-border); box-shadow: var(--pay-shadow); overflow: hidden;
  animation: snap-rise 0.5s calc(var(--i, 0) * 70ms + 120ms) both;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.snap-kpi::before { content: ''; position: absolute; left: 0; top: 0; right: 0; height: 3px; background: var(--tone); transform-origin: left; animation: snap-grow-x 0.7s calc(var(--i, 0) * 70ms + 300ms) both; }
.snap-kpi:hover { transform: translateY(-3px); box-shadow: 0 10px 26px rgba(13, 27, 62, 0.12); }
.snap-kpi__icon { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 10px; background: var(--tone-bg); color: var(--tone); margin-bottom: 8px; }
.snap-kpi__label { font-size: 11.5px; color: var(--pay-muted); font-weight: 600; }
.snap-kpi__value { font-size: 19px; font-weight: 800; color: var(--pay-text); line-height: 1.25; font-variant-numeric: tabular-nums; overflow-wrap: anywhere; }
.snap-tone-red .snap-kpi__value { color: var(--pay-danger); }
.snap-tone-green .snap-kpi__value { color: var(--pay-success); }
.snap-kpi__sub { margin-top: 2px; font-size: 11.5px; color: var(--pay-faint); }

.snap-section {
  padding: 16px; border-radius: 16px; background: #fff; border: 1px solid var(--pay-border); box-shadow: var(--pay-shadow);
  animation: snap-rise 0.5s calc(var(--i, 0) * 70ms + 150ms) both;
}
.snap-section__head { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-bottom: 12px; }
.snap-section__title { display: flex; align-items: center; gap: 8px; font-weight: 700; color: var(--pay-text); font-size: 14px; }
.snap-section__title .v-icon { color: var(--pay-primary); }
.snap-section > .snap-section__title { margin-bottom: 12px; }

.snap-search {
  display: flex; align-items: center; gap: 6px; padding: 0 10px; height: 34px; border-radius: 999px;
  background: var(--pay-neutral-bg); border: 1px solid transparent; color: var(--pay-muted);
  transition: border-color 0.2s, background 0.2s, box-shadow 0.2s;
}
.snap-search:focus-within { background: #fff; border-color: var(--pay-primary); box-shadow: 0 0 0 3px rgba(21, 101, 192, 0.12); }
.snap-search input { border: 0; outline: 0; background: transparent; font-size: 13px; width: 170px; color: var(--pay-text); }

.snap-flow { display: flex; align-items: stretch; gap: 8px; flex-wrap: wrap; }
.snap-flow__step {
  flex: 1 1 160px; min-width: 0; padding: 12px 14px; border-radius: 14px; background: var(--tone-bg);
  border: 1px solid color-mix(in srgb, var(--tone) 18%, transparent);
  animation: snap-pop 0.5s calc(var(--i, 0) * 120ms + 300ms) both;
}
.snap-flow__label { font-size: 12px; color: var(--tone); font-weight: 600; }
.snap-flow__value { font-size: 20px; font-weight: 800; color: var(--pay-text); font-variant-numeric: tabular-nums; }
.snap-flow__arrow { display: grid; place-items: center; color: var(--pay-faint); animation: snap-nudge 1.4s ease-in-out infinite; }

.snap-table-wrap { overflow-x: auto; border-radius: 12px; border: 1px solid var(--pay-border-soft); }
.snap-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.snap-table th, .snap-table td { padding: 9px 12px; text-align: left; white-space: nowrap; }
.snap-table th.is-num, .snap-table td.is-num { text-align: right; font-variant-numeric: tabular-nums; }
.snap-table thead th {
  background: var(--pay-neutral-bg); color: var(--pay-muted); font-size: 11px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase;
}
.snap-table th.is-sortable { cursor: pointer; user-select: none; transition: color 0.15s; }
.snap-table th.is-sortable:hover, .snap-table th.is-sorted { color: var(--pay-primary); }
.snap-col-idx { width: 36px; color: var(--pay-faint); }
.snap-row { border-top: 1px solid var(--pay-border-soft); animation: snap-row-in 0.4s calc(var(--i, 0) * 35ms + 350ms) both; transition: background 0.15s; }
.snap-row:hover { background: var(--pay-primary-bg); }
.snap-order-name { font-weight: 600; color: var(--pay-text); white-space: normal; min-width: 150px; }
.snap-order-link { display: inline-block; text-decoration: none; transition: color 0.15s; }
.snap-order-link .v-icon { margin-left: 4px; opacity: 0; vertical-align: -1px; transition: opacity 0.15s; }
.snap-order-link:hover { color: var(--pay-primary); text-decoration: underline; }
.snap-order-link:hover .v-icon { opacity: 1; }
.snap-order-sub { font-size: 11.5px; color: var(--pay-faint); font-weight: 400; }
.snap-ded { color: var(--pay-danger); font-weight: 600; }
.snap-pct { display: inline-block; margin-left: 6px; padding: 1px 7px; border-radius: 999px; font-size: 11px; font-weight: 700; color: var(--pay-danger); background: var(--pay-danger-bg); }
.snap-payable { min-width: 190px; }
.snap-payable strong { color: var(--pay-success); }
.snap-paid { display: flex; align-items: center; justify-content: flex-end; gap: 3px; margin-top: 2px; font-size: 11px; font-weight: 500; color: var(--pay-muted); }
.snap-paid .v-icon { color: var(--pay-success); }
.snap-bar { display: block; height: 4px; margin-top: 4px; border-radius: 4px; background: var(--pay-success-bg); overflow: hidden; }
.snap-bar__fill { display: block; height: 100%; width: var(--w); border-radius: 4px; background: linear-gradient(90deg, #66BB6A, #2E7D32); transform-origin: left; animation: snap-grow-x 0.8s 0.6s both; }
.snap-table tfoot td { border-top: 2px solid var(--pay-border); background: var(--pay-neutral-bg); font-weight: 800; color: var(--pay-text); }
.snap-empty { text-align: center !important; padding: 24px !important; color: var(--pay-muted); }

.snap-recover { margin-bottom: 14px; }
.snap-recover__head { display: flex; justify-content: space-between; font-size: 13px; color: var(--pay-muted); margin-bottom: 6px; }
.snap-recover__head strong { color: var(--pay-success); }
.snap-recover__track { height: 10px; border-radius: 10px; background: var(--pay-danger-bg); overflow: hidden; }
.snap-recover__fill { display: block; height: 100%; width: var(--w); border-radius: 10px; background: linear-gradient(90deg, #66BB6A, #2E7D32); transform-origin: left; animation: snap-grow-x 1s 0.7s both; }
.snap-ledger { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 10px; }
.snap-ledger__item {
  display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 12px; background: var(--tone-bg);
  border: 1px solid color-mix(in srgb, var(--tone) 15%, transparent);
  animation: snap-rise 0.4s calc(var(--i, 0) * 60ms + 450ms) both; transition: transform 0.2s;
}
.snap-ledger__item:hover { transform: translateX(3px); }
.snap-ledger__icon { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 9px; background: #fff; color: var(--tone); flex-shrink: 0; }
.snap-ledger__label { flex: 1; min-width: 0; font-size: 12.5px; color: var(--pay-text); }
.snap-ledger__value { color: var(--tone); font-variant-numeric: tabular-nums; white-space: nowrap; }

.snap-loss {
  display: flex; gap: 10px; align-items: flex-start; padding: 12px 14px; border-radius: 14px; font-size: 13px;
  background: var(--pay-danger-bg); color: var(--pay-danger); border: 1px solid rgba(198, 40, 40, 0.2);
  animation: snap-rise 0.5s 0.6s both;
}
.snap-none { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 40px 12px; color: var(--pay-muted); text-align: center; }

@keyframes snap-rise { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
@keyframes snap-row-in { from { opacity: 0; transform: translateX(-10px); } to { opacity: 1; transform: none; } }
@keyframes snap-pop { from { opacity: 0; transform: scale(0.85); } to { opacity: 1; transform: none; } }
@keyframes snap-grow-x { from { transform: scaleX(0); } to { transform: scaleX(1); } }
@keyframes snap-gradient { to { background-position: 100% 100%; } }
@keyframes snap-drift { to { transform: translate(-30px, 24px) scale(1.15); } }
@keyframes snap-bob { 50% { transform: translateY(-4px) rotate(-4deg); } }
@keyframes snap-nudge { 50% { transform: translateX(4px); } }

@media (max-width: 900px) {
  .snap-kpis { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .snap-kpi:last-child { grid-column: 1 / -1; }
  .snap-flow__arrow { display: none; }
}
@media (max-width: 600px) {
  .snap-hero { padding: 16px 48px 16px 16px; gap: 12px; }
  .snap-hero__icon { width: 46px; height: 46px; }
  .snap-hero__title { font-size: 19px; }
  .snap-body { padding: 12px 12px 18px !important; }
  .snap-search { width: 100%; }
  .snap-search input { width: 100%; }
}
@media (prefers-reduced-motion: reduce) {
  .snap-hero, .snap-hero__glow, .snap-hero__icon, .snap-flow__arrow { animation: none; }
  .snap-hero__title, .snap-chip, .snap-kpi, .snap-kpi::before, .snap-section, .snap-flow__step, .snap-row,
  .snap-bar__fill, .snap-recover__fill, .snap-ledger__item, .snap-loss { animation: none; }
}
.pd-side .pay-activity__item { padding: 8px 0; }

/* Responsive */
@media (max-width: 1200px) {
  .hero-kpis { grid-template-columns: repeat(2, 1fr); }
  .insight-grid { grid-template-columns: repeat(2, 1fr); }
  .stats-grid { grid-template-columns: repeat(2, 1fr); }
  .pulse-grid { grid-template-columns: repeat(2, 1fr); }
  .charts-grid { grid-template-columns: repeat(2, 1fr); }
  .charts-grid-3 { grid-template-columns: repeat(2, 1fr); }
  .tables-grid { grid-template-columns: 1fr; }
  .aging-grid { grid-template-columns: repeat(2, 1fr); }
  .pl-kpis { grid-template-columns: repeat(2, 1fr); }
  .targets-grid { grid-template-columns: 1fr; }
  .company-metrics { grid-template-columns: minmax(0, 1fr); }
  .metric-row { grid-template-columns: repeat(5, minmax(120px, 1fr)); overflow-x: auto; -webkit-overflow-scrolling: touch; }

  .pd-grid { grid-template-columns: 1fr; align-items: start; min-height: 0; }
  .pd-side { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; contain: none; }
  .pd-side > .pay-card:last-child { flex: 0 1 auto; display: block; }
  .pd-side > .pay-card:last-child .pay-card__body { overflow: visible; }
  .pd-history { flex: 0 1 auto; }
  .pd-history-scroll { flex: 0 1 auto; }
}

@media (max-width: 1024px) {
  .pd-side { grid-template-columns: 1fr 1fr; }
  .pd-summary { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .pd-form-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .pd-field-notes { grid-column: 1 / span 2; }
  .pd-form-btns { grid-column: 1 / span 2; justify-content: flex-end; }
  .pd-form-btns .v-btn,
  .pd-form-btns .pd-save-btn { flex: 0 1 auto; }
}

@media (max-width: 768px) {
  .dashboard-page { padding: 16px 12px; }
  .hero { padding: 18px 16px; border-radius: 18px; }
  .hero-top { flex-direction: column; align-items: stretch; }
  .hero-actions { justify-content: flex-start; }
  .period-picker { width: 100%; justify-content: center; }
  .hero-kpis { grid-template-columns: 1fr; }
  .insight-grid { grid-template-columns: 1fr; }
  .stats-grid { grid-template-columns: repeat(2, 1fr); }
  .pulse-grid { grid-template-columns: 1fr; }
  .charts-grid { grid-template-columns: 1fr; }
  .charts-grid-3 { grid-template-columns: 1fr; }
  .chart-card-wide { grid-column: span 1; }
  .aging-grid { grid-template-columns: 1fr; }
  .smart-list { grid-template-columns: 1fr; }
  .metric-row { grid-template-columns: repeat(5, minmax(130px, 1fr)); gap: 0; }
  .progress-row { grid-template-columns: 1fr; }

  .section-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .section-header-right {
    align-items: flex-start;
    width: 100%;
  }

  .section-badges,
  .section-actions {
    justify-content: flex-start;
  }

  .section-actions {
    flex-direction: column;
    align-items: stretch;
    width: 100%;
  }

  .section-actions .v-btn {
    width: 100%;
  }

  .dashboard-search {
    min-width: auto;
    max-width: none;
    width: 100%;
  }

  .company-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .company-header-right {
    justify-content: flex-start;
    width: 100%;
    flex-wrap: wrap;
  }

  .company-header-right .v-btn {
    font-size: 11px;
    padding: 0 10px;
    height: 32px;
  }

  .company-name { font-size: 15px; }
  .hero-kpi-value { font-size: 17px; }

  .pd-header { padding: 14px 16px; }
  .pd-header-right { width: 100%; margin-left: 0; align-items: stretch; }
  .pd-header-row { justify-content: space-between; }
  .pd-header-row--top { order: -1; }
  .pd-range { flex: 1 1 auto; min-width: 0; }
  .pd-range-input { width: 50%; min-width: 0; }
  .pd-title { white-space: normal; font-size: 20px; }
  .pd-body { padding: 14px 16px 18px; gap: 14px; }
  .pd-side { grid-template-columns: 1fr; }
  .pd-form-grid { grid-template-columns: 1fr; }
  .pd-field-notes,
  .pd-form-btns { grid-column: 1 / span 1; }
  .pd-form-btns .v-btn { flex: 1 1 auto; }
  .pd-history-tools { flex-basis: 100%; }
  .pd-search { max-width: none; }
  .pd-history-scroll { max-height: none; overflow-x: auto; -webkit-overflow-scrolling: touch; }
  .pd-overview { flex-direction: column; align-items: stretch; }
  .pd-overview .pay-donut { align-self: center; }
}

@media (max-width: 480px) {
  .dashboard-page { padding: 10px 8px; }
  .hero-title { font-size: 22px; }
  .hero-top { flex-direction: column; align-items: flex-start; gap: 8px; }
  .hero-kpi-value { font-size: 15px; }
  .hero-kpi-icon { width: 36px; height: 36px; }
  .hero-kpi { padding: 12px; gap: 10px; }
  .insight-value { font-size: 18px; }
  .insight-card { padding: 12px 8px 12px 0; }
  .insight-ring { width: 80px; }
  .stat-tile { padding: 10px 12px; }
  .stat-value { font-size: 13px; }
  .stats-grid { grid-template-columns: 1fr; }
  .section-header { padding: 14px 16px; }
  .section-actions { flex-direction: column; align-items: stretch; }
  .dashboard-search { min-width: auto; max-width: none; }
  .company-card { padding: 12px; }
  .company-name { font-size: 14px; }
  .metric-row { grid-template-columns: repeat(5, minmax(120px, 1fr)); }
  .metric-pill { padding: 2px 8px; }
  .metric-value { font-size: 12px; }
  .metric-label { font-size: 11px; }

  .pd-summary { grid-template-columns: 1fr; gap: 10px; }
  .pd-header-right { gap: 6px; }
  .pd-range { width: 100%; padding: 0 8px; gap: 4px; }
  .pd-range-icon { display: none; }
  .pd-range-input { font-size: 12px; }
  .pd-filter-btn { flex: 1 1 auto; }
  .pd-meter-grid { grid-template-columns: 1fr; }
  .pd-table {
    min-width: 560px;
    table-layout: auto;
  }
  .pd-title { font-size: 18px; }
  .pd-subtitle { font-size: 11px; }
  .pay-pager { justify-content: center; text-align: center; }
}

/* ── Dashboard polish layer: tables, motion ── */
/* Tables: gradient header, zebra rows, accent on hover */
.pretty-table thead th {
  background: linear-gradient(180deg, #F8FAFC 0%, #F1F5F9 100%);
  box-shadow: inset 0 -1px 0 #E2E8F0;
  padding-top: 12px;
  padding-bottom: 12px;
}

.pretty-table tbody tr:nth-child(even) td { background: #FBFCFF; }

.pretty-table tbody tr td {
  transition: background 0.15s;
}

.pretty-table tbody tr:hover td { background: #EEF2FF; }

.pretty-table tbody tr:hover td:first-child {
  box-shadow: inset 3px 0 0 #6366F1;
}

.pretty-table td.num strong { color: var(--ink); font-weight: 800; }

.pretty-table .cell-avatar,
.pretty-table .cell-company .tex-av-3d {
  box-shadow: 0 0 0 3px #fff, 0 0 0 4px #E2E8F0;
}

.pretty-table tbody tr:hover .cell-avatar {
  box-shadow: 0 0 0 3px #fff, 0 0 0 4px #A5B4FC;
}

/* Progress bars: subtle moving sheen */
.cell-bar-track i { position: relative; overflow: hidden; }

.cell-bar-track i::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.5), transparent);
  background-size: 200% 100%;
  animation: shimmer 2.6s linear infinite;
}

/* Aging cards and order rows: lift on hover */
.aging-card {
  transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
}

.aging-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 14px 28px -18px rgba(15, 23, 42, 0.35);
}

.order-table thead th {
  background: linear-gradient(180deg, #F8FAFC 0%, #F1F5F9 100%);
}

.order-table tbody tr:hover td { background: #F5F7FF; }

/* ── Layout v3: aligned grids with no orphan cells ── */
.chart-attention { order: 1; }
.chart-collection { order: 2; }
.chart-split { order: 3; }

@media (min-width: 1201px) {
  .charts-grid.insights-row { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

@media (min-width: 1201px) {
  .charts-grid,
  .charts-grid-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .charts-grid-3 > :first-child { grid-column: 1 / -1; }
  .charts-grid > .table-card { grid-column: 1 / -1; }
}

@media (max-width: 1200px) and (min-width: 769px) {
  .charts-grid-3 > *,
  .chart-split { grid-column: 1 / -1; }
  .charts-grid > .table-card { grid-column: 1 / -1; }
}

/* Card and row polish */
.charts-grid,
.charts-grid-3 { gap: 16px; }

.split-legend-row,
.health-row {
  transition: background 0.2s, transform 0.2s;
  border-radius: 12px;
}

.split-legend-row:hover,
.health-row:hover {
  background: #F8FAFC;
  transform: translateX(3px);
}

@media (prefers-reduced-motion: reduce) {
  .cell-bar-track i::after { animation: none !important; }
  .split-legend-row:hover,
  .health-row:hover { transform: none; }
  .aging-card:hover { transform: none; }
}

/* ── FX layer: aurora, weave, flecks, spotlight, sheen ── */
.hero-aurora {
  position: absolute;
  inset: -40%;
  background: conic-gradient(from 0deg at 50% 50%, rgba(99, 102, 241, 0), rgba(139, 92, 246, 0.38), rgba(6, 182, 212, 0), rgba(236, 72, 153, 0.3), rgba(99, 102, 241, 0));
  filter: blur(70px);
  opacity: 0.5;
  pointer-events: none;
}

.hero-weave {
  position: absolute;
  left: 0;
  bottom: 0;
  width: 100%;
  height: 90px;
  fill: none;
  stroke: rgba(165, 180, 252, 0.35);
  stroke-width: 1.5;
  stroke-dasharray: 10 14;
  pointer-events: none;
}

.hero-weave path:nth-child(2) { stroke: rgba(103, 232, 249, 0.3); }
.hero-weave path:nth-child(3) { stroke: rgba(249, 168, 212, 0.28); }

.hero-fleck {
  position: absolute;
  left: calc(var(--n) * 6.1%);
  bottom: -12px;
  width: calc(3px + (var(--n) % 4) * 1.5px);
  height: calc(3px + (var(--n) % 4) * 1.5px);
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.7);
  box-shadow: 0 0 10px rgba(165, 180, 252, 0.9);
  opacity: 0;
  pointer-events: none;
}

.live-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  margin-right: 8px;
  border-radius: 50%;
  background: #34D399;
  box-shadow: 0 0 0 0 rgba(52, 211, 153, 0.6);
  vertical-align: 1px;
}

.hero-top,
.hero-kpis { z-index: 1; }

.hero-title {
  background: linear-gradient(90deg, #fff 0%, #C7D2FE 35%, #67E8F9 50%, #C7D2FE 65%, #fff 100%);
  background-size: 200% 100%;
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.hero-kpi,
.stat-tile,
.insight-card { overflow: hidden; }

.hero-kpi { position: relative; }
.hero-kpi-ring { overflow: visible; }
.hero-kpi-ring::after { display: none; }

.hero-kpi::after {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  width: 45%;
  background: linear-gradient(100deg, transparent, rgba(255, 255, 255, 0.18), transparent);
  transform: translateX(-130%) skewX(-18deg);
  pointer-events: none;
}

.stat-tile::before,
.insight-card::before,
.pulse-tile .pulse-spark { pointer-events: none; }

.stat-tile::before,
.insight-card::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: radial-gradient(200px circle at var(--mx, 50%) var(--my, 50%), color-mix(in srgb, var(--tone, var(--tile-color, #6366F1)) 16%, transparent), transparent 70%);
  opacity: 0;
  transition: opacity 0.3s ease;
  z-index: 0;
}

.stat-tile:hover::before,
.insight-card:hover::before { opacity: 1; }

.insight-card > *,
.stat-tile > * { position: relative; z-index: 1; }

.insight-rail {
  background-size: 100% 200%;
}

.s-badge.blue::before,
.s-badge.green::before,
.s-badge.orange::before { animation: dot-blink 2.2s ease-in-out infinite; }

.progress-fill { position: relative; overflow: hidden; }

.progress-fill::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.55), transparent);
  transform: translateX(-100%);
}

.company-card::before { transition: width 0.25s ease; }
.company-card:hover::before { width: 10px; }

.company-header-left :deep(.tex-av-3d),
.company-header-left .tex-av-3d { transition: transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1); }
.company-card:hover .tex-av-3d { transform: scale(1.1) rotate(-4deg); }

.metric-pill { transition: transform 0.2s ease, box-shadow 0.2s ease; }
.metric-pill:hover { transform: translateY(-2px); }

@media (prefers-reduced-motion: no-preference) {
  .hero-aurora { animation: aurora-spin 28s linear infinite; }
  .hero-weave path { animation: weave-flow 7s linear infinite; }
  .hero-weave path:nth-child(2) { animation-duration: 9s; animation-direction: reverse; }
  .hero-weave path:nth-child(3) { animation-duration: 11s; }
  .hero-fleck { animation: fleck-rise calc(6s + var(--n) * 0.55s) linear infinite; animation-delay: calc(var(--n) * -1.3s); }
  .live-dot { animation: live-ping 1.8s ease-out infinite; }
  .hero-title { animation: shimmer 7s linear infinite; }
  .hero-glow-a { translate: calc(var(--px, 0) * -36px) calc(var(--py, 0) * -24px); transition: translate 0.4s ease-out; }
  .hero-glow-b { translate: calc(var(--px, 0) * 30px) calc(var(--py, 0) * 20px); transition: translate 0.4s ease-out; }
  .hero-grid { translate: calc(var(--px, 0) * 10px) calc(var(--py, 0) * 8px); transition: translate 0.4s ease-out; }
  .hero-kpi::after { animation: card-sweep 7s ease-in-out infinite; }
  .hero-kpi:nth-child(2)::after { animation-delay: 1.2s; }
  .hero-kpi:nth-child(3)::after { animation-delay: 2.4s; }
  .hero-kpi:nth-child(4)::after { animation-delay: 3.6s; }
  .hero-kpi-icon { animation: icon-bob 3.6s ease-in-out infinite; }
  .hero-kpi:nth-child(2) .hero-kpi-icon { animation-delay: -0.9s; }
  .hero-kpi:nth-child(3) .hero-kpi-icon { animation-delay: -1.8s; }
  .insight-rail { animation: rail-flow 4s ease-in-out infinite alternate; }
  .insight-icon-wrap { animation: icon-bob 4s ease-in-out infinite; }
  .insight-card:hover .insight-icon-wrap { animation: icon-wobble 0.7s ease; }
  .stat-icon-box { animation: ring-pulse 3.4s ease-out infinite; }
  .stat-tile:nth-child(even) .stat-icon-box { animation-delay: -1.7s; }
  .pulse-spark { animation: spark-breathe 4.5s ease-in-out infinite; }
  .section-icon { animation: icon-glow 3.6s ease-in-out infinite; }
  .progress-fill::after { animation: fill-sheen 3s ease-in-out 1.4s infinite; }
  .order-table tbody tr:hover td:first-child { transition: transform 0.2s ease; transform: translateX(3px); }
}

/* Scroll-driven entrance for below-the-fold cards where supported */
@supports (animation-timeline: view()) {
  @media (prefers-reduced-motion: no-preference) {
    .company-card.reveal,
    .section-card.reveal {
      animation: rise-scroll linear backwards;
      animation-delay: 0s;
      animation-timeline: view();
      animation-range: entry 0% entry 35%;
    }
  }
}

@keyframes rise-scroll {
  from { opacity: 0; transform: translateY(40px) scale(0.97); }
  to   { opacity: 1; transform: none; }
}

@keyframes aurora-spin { to { transform: rotate(360deg); } }
@keyframes weave-flow { to { stroke-dashoffset: -96; } }

@keyframes fleck-rise {
  0%   { transform: translateY(0) translateX(0); opacity: 0; }
  12%  { opacity: 0.9; }
  100% { transform: translateY(-260px) translateX(24px); opacity: 0; }
}

@keyframes live-ping {
  0%   { box-shadow: 0 0 0 0 rgba(52, 211, 153, 0.6); }
  100% { box-shadow: 0 0 0 10px rgba(52, 211, 153, 0); }
}

@keyframes card-sweep {
  0%, 70% { transform: translateX(-130%) skewX(-18deg); }
  100%    { transform: translateX(330%) skewX(-18deg); }
}

@keyframes icon-bob {
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(-3px); }
}

@keyframes icon-wobble {
  0%, 100% { transform: rotate(0) scale(1); }
  25%      { transform: rotate(-14deg) scale(1.12); }
  60%      { transform: rotate(10deg) scale(1.12); }
}

@keyframes rail-flow {
  from { background-position: 0 0; }
  to   { background-position: 0 100%; }
}

@keyframes ring-pulse {
  0%   { box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--tile-color) 22%, #fff), 0 0 0 0 color-mix(in srgb, var(--tile-color) 35%, transparent); }
  70%, 100% { box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--tile-color) 22%, #fff), 0 0 0 9px transparent; }
}

@keyframes spark-breathe {
  0%, 100% { transform: scale(1); opacity: 0.8; }
  50%      { transform: scale(1.35); opacity: 1; }
}

@keyframes icon-glow {
  0%, 100% { box-shadow: 0 8px 18px rgba(67, 56, 202, 0.35); }
  50%      { box-shadow: 0 8px 26px rgba(67, 56, 202, 0.65), 0 0 0 6px rgba(99, 102, 241, 0.12); }
}

@keyframes dot-blink {
  0%, 100% { opacity: 1; }
  50%      { opacity: 0.35; }
}

@keyframes fill-sheen {
  0%   { transform: translateX(-100%); }
  60%, 100% { transform: translateX(100%); }
}

@media (max-width: 767px) {
  .hero-fleck:nth-child(n + 10) { display: none; }
  .hero-weave { height: 60px; }
}
</style>
