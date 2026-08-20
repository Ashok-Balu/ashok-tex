<template>
  <div class="ap">
    <!-- Hero -->
    <div class="hero">
      <div class="hero-bg"></div>
      <div class="hero-content">
        <div class="hero-left">
          <div class="hero-icon"><v-icon size="30" color="white">mdi-chart-areaspline</v-icon></div>
          <div>
            <h1 class="hero-title">Business Analytics</h1>
            <p class="hero-sub">Executive overview · Production · Finance · Workforce</p>
          </div>
        </div>
        <div class="hero-right" v-if="data">
          <div class="hero-stat"><span class="hs-val">{{ data.overview.totalCompanies }}</span><span class="hs-lbl">Companies</span></div>
          <div class="hero-stat"><span class="hs-val">{{ data.overview.totalOrders }}</span><span class="hs-lbl">Orders</span></div>
          <div class="hero-stat"><span class="hs-val">{{ data.overview.activeEmployees }}</span><span class="hs-lbl">Employees</span></div>
          <v-btn variant="outlined" color="white" prepend-icon="mdi-refresh" size="small" rounded="lg" :loading="loading" @click="fetchData()">Refresh</v-btn>
        </div>
      </div>
    </div>

    <div v-if="loading && !data" class="loading-box"><v-progress-circular indeterminate color="primary" size="44" /><p>Loading analytics...</p></div>

    <template v-if="data">
      <!-- ━━━━━━━━━━━ TODAY'S ACTIVITY ━━━━━━━━━━━ -->
      <div class="today-strip" v-if="data.todayActivity">
        <div class="today-item">
          <div class="today-icon blue"><v-icon size="16" color="white">mdi-factory</v-icon></div>
          <div><span class="today-val">{{ fmtN(data.todayActivity.production) }} m</span><span class="today-lbl">Today's Production</span></div>
          <span class="today-count">{{ data.todayActivity.productionEntries }} entries</span>
        </div>
        <div class="today-item">
          <div class="today-icon green"><v-icon size="16" color="white">mdi-cash</v-icon></div>
          <div><span class="today-val">{{ fmt(data.todayActivity.receipts) }}</span><span class="today-lbl">Today's Receipts</span></div>
          <span class="today-count">{{ data.todayActivity.receiptCount }} payments</span>
        </div>
        <div class="today-item">
          <div class="today-icon purple"><v-icon size="16" color="white">mdi-clipboard-check</v-icon></div>
          <div><span class="today-val">{{ data.overview.activeOrders }}</span><span class="today-lbl">Active Orders</span></div>
          <span class="today-count">{{ data.overview.totalCompanies }} companies</span>
        </div>
        <div class="today-item">
          <div class="today-icon teal"><v-icon size="16" color="white">mdi-account-group</v-icon></div>
          <div><span class="today-val">{{ data.overview.activeEmployees }}</span><span class="today-lbl">Active Workforce</span></div>
          <span class="today-count">of {{ data.overview.totalEmployees }}</span>
        </div>
      </div>

      <!-- ━━━━━━━━━━━ PRIMARY KPIs ━━━━━━━━━━━ -->
      <div class="kpi-grid">
        <div v-for="k in kpis" :key="k.label" class="kpi" :class="k.tone">
          <div class="kpi-top">
            <div class="kpi-icon" :class="k.tone"><v-icon size="18">{{ k.icon }}</v-icon></div>
            <span v-if="k.badge" class="kpi-badge" :class="k.badgeTone"><v-icon size="10">{{ k.badgeIcon }}</v-icon>{{ k.badge }}</span>
          </div>
          <div class="kpi-val">{{ k.value }}</div>
          <div class="kpi-lbl">{{ k.label }}</div>
          <div class="kpi-sub" v-if="k.sub">{{ k.sub }}</div>
          <div class="kpi-bar" v-if="k.pct != null"><div class="kpi-bar-fill" :class="k.tone" :style="{ width: Math.min(100, k.pct) + '%' }"></div></div>
        </div>
      </div>

      <!-- ━━━━━━━━━━━ KEY INSIGHTS & ALERTS ━━━━━━━━━━━ -->
      <div class="panel insights-panel" v-if="data.insights?.length">
        <div class="ph"><div class="ph-l"><div class="pi gold"><v-icon size="18" color="white">mdi-lightbulb-on</v-icon></div><div><h2 class="pt">Key Business Insights</h2><p class="ps">Auto-generated alerts & recommendations</p></div></div><span class="pb blue">{{ data.insights.length }} insights</span></div>
        <div class="insights-grid">
          <div v-for="(insight, i) in data.insights" :key="i" class="insight-card" :class="'insight-' + insight.type">
            <div class="insight-main" @click="insight.details?.length ? toggleInsight(i) : null" :class="{ clickable: insight.details?.length }">
              <div class="insight-icon-wrap" :class="insight.type"><v-icon size="18" color="white">{{ insight.icon }}</v-icon></div>
              <div class="insight-body">
                <span class="insight-text">{{ insight.text }}</span>
                <span class="insight-cat">{{ insight.category }}</span>
              </div>
              <v-icon v-if="insight.details?.length" size="18" color="#94A3B8" :class="{ 'rotate-icon': expandedInsights.includes(i) }">mdi-chevron-down</v-icon>
            </div>
            <transition name="slide">
              <div v-if="insight.details?.length && expandedInsights.includes(i)" class="insight-details">
                <div v-for="(d, di) in insight.details" :key="di" class="insight-detail-row">
                  <span class="idr-name">{{ d.name }}</span>
                  <span class="idr-val">{{ d.value }}</span>
                  <span class="idr-sub" v-if="d.subtext">{{ d.subtext }}</span>
                </div>
              </div>
            </transition>
          </div>
        </div>
      </div>

      <!-- ━━━━━━━━━━━ BUSINESS HEALTH SCORECARD ━━━━━━━━━━━ -->
      <div class="panel health-p">
        <div class="ph"><div class="ph-l"><div class="pi green"><v-icon size="18" color="white">mdi-heart-pulse</v-icon></div><div><h2 class="pt">Business Health</h2><p class="ps">At-a-glance performance indicators</p></div></div></div>
        <div class="hc-grid">
          <div v-for="h in health" :key="h.label" class="hc" :class="h.status">
            <div class="hc-ico" :class="h.status"><v-icon size="20" color="white">{{ h.icon }}</v-icon></div>
            <span class="hc-val">{{ h.value }}</span>
            <span class="hc-lbl">{{ h.label }}</span>
            <div class="hc-bar-t"><div class="hc-bar-f" :class="h.status" :style="{ width: h.pct + '%' }"></div></div>
            <span class="hc-hint">{{ h.hint }}</span>
          </div>
        </div>
      </div>

      <!-- ━━━━━━━━━━━ FINANCIAL OVERVIEW ━━━━━━━━━━━ -->
      <div class="panel">
        <div class="ph"><div class="ph-l"><div class="pi green"><v-icon size="18" color="white">mdi-currency-inr</v-icon></div><div><h2 class="pt">Financial Overview</h2><p class="ps">Revenue pipeline & collection status</p></div></div><div class="pb green">{{ data.financial.collectionPct }}% collected</div></div>

        <div class="pl-flow">
          <div class="pl-item"><div class="pl-dot blue"></div><span class="pl-l">Produced Value</span><span class="pl-v">{{ fmt(data.financial.totalProducedValue) }}</span></div>
          <div class="pl-arr">−</div>
          <div class="pl-item"><div class="pl-dot red"></div><span class="pl-l">Deduction</span><span class="pl-v red-t">{{ fmt(data.financial.totalDeductionAmount) }}</span></div>
          <div class="pl-arr">=</div>
          <div class="pl-item hl"><div class="pl-dot green"></div><span class="pl-l">Net Payable</span><span class="pl-v green-t">{{ fmt(data.financial.totalPayableAmount) }}</span></div>
        </div>

        <div class="gauge-row">
          <div class="gauge">
            <div class="gauge-head"><span>Total Collected</span><span class="gauge-val green-t">{{ fmt(data.financial.totalPaidAmount) }}</span></div>
            <div class="gauge-track"><div class="gauge-fill green" :style="{ width: Math.min(100, data.financial.collectionPct) + '%' }"></div></div>
            <div class="gauge-foot"><span>{{ data.financial.collectionPct }}% of payable</span><span>Pending: {{ fmt(data.financial.totalPendingAmount) }}</span></div>
          </div>
          <div class="gauge">
            <div class="gauge-head"><span>Allocated to Orders</span><span class="gauge-val blue-t">{{ fmt(data.financial.totalAllocated) }}</span></div>
            <div class="gauge-track"><div class="gauge-fill blue" :style="{ width: allocPct + '%' }"></div></div>
            <div class="gauge-foot"><span>{{ allocPct }}% of receipts</span><span>Unallocated: {{ fmt(data.financial.totalUnallocated) }}</span></div>
          </div>
        </div>

        <div class="fc-grid">
          <div class="fc"><v-icon size="16" color="#C62828">mdi-close-circle</v-icon><div><span class="fc-l">Rejection Loss</span><span class="fc-v" style="color:#C62828">{{ fmt(data.financial.totalRejectionLoss) }}</span></div></div>
          <div class="fc"><v-icon size="16" color="#E65100">mdi-clock-alert</v-icon><div><span class="fc-l">Pending from Companies</span><span class="fc-v" style="color:#E65100">{{ fmt(data.financial.totalPendingAmount) }}</span></div></div>
          <div class="fc"><v-icon size="16" color="#7B1FA2">mdi-hand-coin</v-icon><div><span class="fc-l">Deduction Outstanding</span><span class="fc-v" style="color:#7B1FA2">{{ fmt(data.financial.deductionOutstanding || 0) }}</span></div></div>
          <div class="fc"><v-icon size="16" color="#1565C0">mdi-bank-transfer</v-icon><div><span class="fc-l">Unallocated Funds</span><span class="fc-v" style="color:#1565C0">{{ fmt(data.financial.totalUnallocated) }}</span></div></div>
          <div class="fc"><v-icon size="16" color="#2E7D32">mdi-check-decagram</v-icon><div><span class="fc-l">Deduction Collected</span><span class="fc-v" style="color:#2E7D32">{{ fmt(data.financial.totalDeductionCollected || 0) }}</span></div></div>
          <div class="fc"><v-icon size="16" color="#00838F">mdi-tag</v-icon><div><span class="fc-l">Avg Rate/Meter</span><span class="fc-v" style="color:#00838F">₹{{ data.financial.avgRatePerMeter }}</span></div></div>
        </div>
      </div>

      <!-- ━━━━━━━━━━━ PROFITABILITY SUMMARY ━━━━━━━━━━━ -->
      <div class="panel" v-if="data.profitability">
        <div class="ph"><div class="ph-l"><div class="pi emerald"><v-icon size="18" color="white">mdi-chart-line</v-icon></div><div><h2 class="pt">Profitability Summary</h2><p class="ps">Revenue vs costs & profit margins</p></div></div>
          <div class="pb" :class="data.profitability.grossMarginPct >= 20 ? 'green' : 'red'"><v-icon size="12">{{ data.profitability.grossMarginPct >= 20 ? 'mdi-trending-up' : 'mdi-trending-down' }}</v-icon>{{ data.profitability.grossMarginPct }}% margin</div>
        </div>

        <div class="profit-flow">
          <div class="pf-item pf-revenue"><div class="pf-icon green"><v-icon size="18" color="white">mdi-cash-plus</v-icon></div><span class="pf-label">Total Revenue</span><span class="pf-val green-t">{{ fmt(data.profitability.totalRevenue) }}</span></div>
          <div class="pf-arrow">−</div>
          <div class="pf-item pf-cost"><div class="pf-icon orange"><v-icon size="18" color="white">mdi-account-cash</v-icon></div><span class="pf-label">Payroll Cost</span><span class="pf-val orange-t">{{ fmt(data.profitability.totalPayrollCost) }}</span></div>
          <div class="pf-arrow">=</div>
          <div class="pf-item pf-profit" :class="data.profitability.grossProfit >= 0 ? 'positive' : 'negative'"><div class="pf-icon" :class="data.profitability.grossProfit >= 0 ? 'blue' : 'red'"><v-icon size="18" color="white">{{ data.profitability.grossProfit >= 0 ? 'mdi-trophy' : 'mdi-alert' }}</v-icon></div><span class="pf-label">Gross Profit</span><span class="pf-val" :class="data.profitability.grossProfit >= 0 ? 'blue-t' : 'red-t'">{{ fmt(data.profitability.grossProfit) }}</span></div>
        </div>

        <div class="profit-kpis">
          <div class="pk-card"><span class="pk-card-val green-t">{{ fmt(data.profitability.monthReceipt) }}</span><span class="pk-card-lbl">Month Revenue</span></div>
          <div class="pk-card"><span class="pk-card-val orange-t">{{ fmt(data.profitability.monthPayroll) }}</span><span class="pk-card-lbl">Month Payroll</span></div>
          <div class="pk-card"><span class="pk-card-val" :class="data.profitability.monthProfit >= 0 ? 'blue-t' : 'red-t'">{{ fmt(data.profitability.monthProfit) }}</span><span class="pk-card-lbl">Month Profit</span></div>
          <div class="pk-card"><span class="pk-card-val">{{ data.profitability.payrollToRevenueRatio }}%</span><span class="pk-card-lbl">Payroll/Revenue</span></div>
          <div class="pk-card"><span class="pk-card-val blue-t">{{ fmt(data.profitability.revenuePerEmployee) }}</span><span class="pk-card-lbl">Revenue/Employee</span></div>
          <div class="pk-card"><span class="pk-card-val" :class="data.profitability.profitGrowth >= 0 ? 'green-t' : 'red-t'">{{ data.profitability.profitGrowth >= 0 ? '+' : '' }}{{ data.profitability.profitGrowth }}%</span><span class="pk-card-lbl">Profit Growth</span></div>
        </div>

        <div class="profit-gauge">
          <div class="pg-head"><span>Payroll to Revenue Ratio</span><span :class="data.profitability.payrollToRevenueRatio <= 60 ? 'green-t' : 'orange-t'">{{ data.profitability.payrollToRevenueRatio }}%</span></div>
          <div class="pg-track">
            <div class="pg-fill" :class="data.profitability.payrollToRevenueRatio <= 60 ? 'good' : data.profitability.payrollToRevenueRatio <= 80 ? 'mid' : 'high'" :style="{ width: Math.min(100, data.profitability.payrollToRevenueRatio) + '%' }"></div>
          </div>
          <div class="pg-markers"><span>0%</span><span class="pg-ideal">Ideal &lt; 60%</span><span>100%</span></div>
        </div>
      </div>

      <!-- ━━━━━━━━━━━ PRODUCTION INTELLIGENCE ━━━━━━━━━━━ -->
      <div class="panel">
        <div class="ph"><div class="ph-l"><div class="pi blue"><v-icon size="18" color="white">mdi-factory</v-icon></div><div><h2 class="pt">Production Intelligence</h2><p class="ps">Output, efficiency, targets & trends</p></div></div>
          <div class="pb" :class="data.production.growth >= 0 ? 'green' : 'red'"><v-icon size="12">{{ data.production.growth >= 0 ? 'mdi-trending-up' : 'mdi-trending-down' }}</v-icon>{{ Math.abs(data.production.growth) }}% vs last month</div>
        </div>

        <!-- Production KPI Cards -->
        <div class="prod-kpis">
          <div class="pk"><span class="pk-val blue-t">{{ fmtN(data.production.thisMonth) }} m</span><span class="pk-lbl">This Month</span><span class="pk-sub">{{ data.production.thisMonthEntries }} entries</span></div>
          <div class="pk"><span class="pk-val green-t">{{ fmtN(data.production.thisYear) }} m</span><span class="pk-lbl">This Year</span></div>
          <div class="pk"><span class="pk-val">{{ fmtN(data.production.totalExpected) }} m</span><span class="pk-lbl">Target</span></div>
          <div class="pk"><span class="pk-val indigo-t">{{ fmtN(data.production.totalAccepted) }} m</span><span class="pk-lbl">Accepted</span></div>
          <div class="pk"><span class="pk-val">{{ fmtN(data.production.avgDaily || avgDaily) }} m</span><span class="pk-lbl">Avg/Day</span></div>
          <div class="pk"><span class="pk-val" :class="(data.production.efficiency || efficiencyPct) >= 95 ? 'green-t' : 'orange-t'">{{ (data.production.efficiency || efficiencyPct).toFixed(1) }}%</span><span class="pk-lbl">Efficiency</span><span class="pk-sub">Accept Rate</span></div>
          <div class="pk hl-pk" v-if="data.production.highDay"><span class="pk-val green-t">{{ fmtN(data.production.highDay.value) }} m</span><span class="pk-lbl">Best Day</span><span class="pk-sub">{{ data.production.highDay.date?.slice(5) }}</span></div>
          <div class="pk" v-if="data.production.lowDay"><span class="pk-val orange-t">{{ fmtN(data.production.lowDay.value) }} m</span><span class="pk-lbl">Low Day</span><span class="pk-sub">{{ data.production.lowDay.date?.slice(5) }}</span></div>
          <div class="pk" v-if="!data.production.highDay"><span class="pk-val">{{ fmtN(data.production.lastMonth) }} m</span><span class="pk-lbl">Last Month</span></div>
          <div class="pk" v-if="!data.production.lowDay"><span class="pk-val red-t">{{ data.production.rejectionRate }}%</span><span class="pk-lbl">Rejection Rate</span></div>
        </div>

        <!-- Progress Arc + Target -->
        <div class="arc-section">
          <div class="arc-wrap">
            <svg viewBox="0 0 120 120" class="arc-svg">
              <circle cx="60" cy="60" r="52" fill="none" stroke="#E2E8F0" stroke-width="10" />
              <circle cx="60" cy="60" r="52" fill="none" stroke="url(#pg)" stroke-width="10"
                :stroke-dasharray="326.7" :stroke-dashoffset="326.7 - (326.7 * Math.min(100, data.production.progressPct) / 100)"
                stroke-linecap="round" transform="rotate(-90 60 60)" />
              <defs><linearGradient id="pg" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#1565C0"/><stop offset="100%" stop-color="#42A5F5"/></linearGradient></defs>
            </svg>
            <div class="arc-center"><span class="arc-pct">{{ data.production.progressPct }}%</span><span class="arc-sub">of Target</span></div>
          </div>
          <div class="arc-cards">
            <div class="arc-card"><span class="ac-lbl">Produced</span><span class="ac-val">{{ fmtN(data.production.totalProduced) }} m</span></div>
            <div class="arc-card"><span class="ac-lbl">Remaining</span><span class="ac-val">{{ fmtN(Math.max(0, data.production.totalExpected - data.production.totalProduced)) }} m</span></div>
            <div class="arc-card"><span class="ac-lbl">Rejected</span><span class="ac-val red-t">{{ fmtN(data.production.totalRejected) }} m</span></div>
            <div class="arc-card"><span class="ac-lbl">Loss Amount</span><span class="ac-val red-t">{{ fmt(data.rejections.lossAmount) }}</span></div>
          </div>
        </div>

        <!-- Monthly Production Chart -->
        <div class="chart-box">
          <h4 class="ch">Monthly Production ({{ new Date().getFullYear() }})</h4>
          <div class="bar-chart">
            <div v-for="item in data.trends.production" :key="item.month" class="bc">
              <div class="bc-tip">{{ fmtN(item.value) }}</div>
              <div class="bc-track"><div class="bc-fill grad-blue" :style="{ height: barH(item.value, maxProd) + '%' }"></div></div>
              <div class="bc-lbl">{{ item.month }}</div>
            </div>
          </div>
        </div>


        <!-- Company Production Progress -->
        <h4 class="ch" style="margin-top:20px">Company Production Progress</h4>
        <div class="cp-list" v-if="data.companyPerformance.length">
          <div v-for="c in data.companyPerformance.slice(0, 8)" :key="c.companyId" class="cp-row">
            <div class="cp-top"><span class="cp-name">{{ c.companyName }}</span><span class="cp-pct" :class="c.progressPct >= 60 ? 'good' : c.progressPct >= 30 ? 'mid' : 'low'">{{ c.progressPct }}%</span></div>
            <div class="cp-bar-t"><div class="cp-bar-f" :class="c.progressPct >= 60 ? 'good' : c.progressPct >= 30 ? 'mid' : 'low'" :style="{ width: Math.min(100, c.progressPct) + '%' }"></div></div>
            <div class="cp-meta"><span>{{ c.orders }} orders</span><span>{{ fmtN(c.totalProduced) }} / {{ fmtN(c.totalExpected) }} m</span></div>
          </div>
        </div>
      </div>

      <!-- ━━━━━━━━━━━ RECEIPTS & PAYMENTS ━━━━━━━━━━━ -->
      <div class="panel">
        <div class="ph"><div class="ph-l"><div class="pi emerald"><v-icon size="18" color="white">mdi-cash-multiple</v-icon></div><div><h2 class="pt">Receipts & Payments</h2><p class="ps">Cash inflow, modes & company-wise collection</p></div></div>
          <div class="pb" :class="data.receipts.growth >= 0 ? 'green' : 'red'"><v-icon size="12">{{ data.receipts.growth >= 0 ? 'mdi-trending-up' : 'mdi-trending-down' }}</v-icon>{{ Math.abs(data.receipts.growth) }}% vs last month</div>
        </div>

        <div class="metrics-row">
          <div class="metric"><span class="m-val green-t">{{ fmt(data.receipts.thisMonth) }}</span><span class="m-lbl">Month Receipt</span><span class="m-sub">{{ data.receipts.thisMonthCount }} payments</span></div>
          <div class="metric"><span class="m-val blue-t">{{ fmt(data.receipts.thisYear) }}</span><span class="m-lbl">Year Total</span></div>
          <div class="metric"><span class="m-val">{{ fmt(data.receipts.lastMonth) }}</span><span class="m-lbl">Last Month</span></div>
          <div class="metric"><span class="m-val red-t">{{ fmt(data.receipts.deductionThisMonth) }}</span><span class="m-lbl">Deduction (Month)</span></div>
          <div class="metric"><span class="m-val orange-t">{{ fmt(data.financial.totalPendingAmount) }}</span><span class="m-lbl">Total Pending</span></div>
          <div class="metric"><span class="m-val blue-t">{{ fmt(data.financial.totalUnallocated) }}</span><span class="m-lbl">Unallocated</span></div>
        </div>

        <!-- Payment Modes -->
        <div class="mode-section" v-if="data.paymentModes.length">
          <h4 class="ch">Payment Modes (Year)</h4>
          <div class="mode-list">
            <div v-for="m in data.paymentModes" :key="m.mode" class="mode-item">
              <div class="mode-ico" :class="'m-' + m.mode"><v-icon size="18" color="white">{{ modeIcon(m.mode) }}</v-icon></div>
              <div class="mode-body">
                <div class="mode-top"><span class="mode-name">{{ m.mode }}</span><span class="mode-amt">{{ fmt(m.total) }}</span></div>
                <div class="mode-bar-t"><div class="mode-bar-f" :class="'m-' + m.mode" :style="{ width: pct(m.total, totalModes) + '%' }"></div></div>
                <div class="mode-bot"><span>{{ m.count }} transactions</span><span>{{ pct(m.total, totalModes) }}%</span></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Monthly Receipt Chart -->
        <div class="chart-box">
          <h4 class="ch">Monthly Receipt Trend ({{ new Date().getFullYear() }})</h4>
          <div class="bar-chart">
            <div v-for="item in data.trends.payments" :key="item.month" class="bc">
              <div class="bc-tip">{{ shortCur(item.value) }}</div>
              <div class="bc-track"><div class="bc-fill grad-green" :style="{ height: barH(item.value, maxPay) + '%' }"></div></div>
              <div class="bc-lbl">{{ item.month }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- ━━━━━━━━━━━ COMPANY FINANCIALS TABLE ━━━━━━━━━━━ -->
      <div class="panel" v-if="data.companyFinancials?.length">
        <div class="ph"><div class="ph-l"><div class="pi purple"><v-icon size="18" color="white">mdi-domain</v-icon></div><div><h2 class="pt">Company-Wise Financials</h2><p class="ps">Payable, paid, pending & collection per company</p></div></div><span class="pb blue">{{ data.companyFinancials.length }} companies</span></div>
        <div class="table-wrap">
          <table class="data-table">
            <thead><tr><th>Company</th><th class="r">Payable</th><th class="r">Receipt</th><th class="r">Allocated</th><th class="r">Pending</th><th class="r">Unallocated</th><th class="r">Collection %</th></tr></thead>
            <tbody>
              <tr v-for="c in data.companyFinancials" :key="c.companyId">
                <td class="fw">{{ c.companyName }}</td>
                <td class="r">{{ fmt(c.payable) }}</td>
                <td class="r green-t">{{ fmt(c.receipt) }}</td>
                <td class="r blue-t">{{ fmt(c.allocated) }}</td>
                <td class="r" :class="c.pending > 0 ? 'orange-t' : 'green-t'">{{ fmt(c.pending) }}</td>
                <td class="r blue-t">{{ fmt(c.unallocated) }}</td>
                <td class="r"><span class="pct-badge" :class="c.collectionPct >= 80 ? 'good' : c.collectionPct >= 50 ? 'mid' : 'low'">{{ c.collectionPct }}%</span></td>
              </tr>
            </tbody>
            <tfoot><tr><td class="fw">Total</td><td class="r fw">{{ fmt(cfTotals.payable) }}</td><td class="r fw green-t">{{ fmt(cfTotals.receipt) }}</td><td class="r fw blue-t">{{ fmt(cfTotals.allocated) }}</td><td class="r fw orange-t">{{ fmt(cfTotals.pending) }}</td><td class="r fw blue-t">{{ fmt(cfTotals.unallocated) }}</td><td class="r fw">{{ cfTotals.collPct }}%</td></tr></tfoot>
          </table>
        </div>
      </div>

      <!-- ━━━━━━━━━━━ QUALITY & YARN (SIDE BY SIDE) ━━━━━━━━━━━ -->
      <div class="dual">
        <!-- Quality & Rejections -->
        <div class="panel">
          <div class="ph"><div class="ph-l"><div class="pi red"><v-icon size="18" color="white">mdi-alert-octagon</v-icon></div><div><h2 class="pt">Quality & Rejections</h2><p class="ps">Production quality metrics</p></div></div></div>

          <div class="quality-kpis">
            <div class="qk"><span class="qk-val">{{ fmtN(data.production.totalProduced) }} m</span><span class="qk-lbl">Total Produced</span></div>
            <div class="qk"><span class="qk-val green-t">{{ fmtN(data.production.totalAccepted) }} m</span><span class="qk-lbl">Accepted</span></div>
            <div class="qk"><span class="qk-val red-t">{{ fmtN(data.production.totalRejected) }} m</span><span class="qk-lbl">Rejected</span></div>
            <div class="qk"><span class="qk-val" :class="data.production.rejectionRate <= 2 ? 'green-t' : data.production.rejectionRate <= 5 ? 'orange-t' : 'red-t'">{{ data.production.rejectionRate }}%</span><span class="qk-lbl">Rejection Rate</span></div>
          </div>

          <div class="quality-gauge">
            <div class="qg-head"><span>Quality Score (First Pass Yield)</span><span class="qg-pct" :class="(100 - data.production.rejectionRate) >= 98 ? 'green-t' : 'orange-t'">{{ (100 - data.production.rejectionRate).toFixed(1) }}%</span></div>
            <div class="qg-track"><div class="qg-fill" :class="(100 - data.production.rejectionRate) >= 98 ? 'good' : 'mid'" :style="{ width: Math.min(100, 100 - data.production.rejectionRate) + '%' }"></div></div>
          </div>

          <div class="rej-stats">
            <div class="rs"><v-icon size="14" color="#1565C0">mdi-calendar-month</v-icon><span class="rs-l">Month Rejected</span><span class="rs-v">{{ fmtN(data.rejections.monthTotal) }} m <small>({{ data.rejections.monthCount }} entries)</small></span></div>
            <div class="rs"><v-icon size="14" color="#E65100">mdi-calendar</v-icon><span class="rs-l">Year Rejected</span><span class="rs-v">{{ fmtN(data.rejections.yearTotal) }} m <small>({{ data.rejections.yearCount }} entries)</small></span></div>
            <div class="rs"><v-icon size="14" color="#C62828">mdi-currency-inr</v-icon><span class="rs-l">Financial Loss</span><span class="rs-v red-t">{{ fmt(data.rejections.lossAmount) }}</span></div>
          </div>

          <!-- Accepted vs Rejected Visual -->
          <div class="avr-section" v-if="data.production.totalProduced > 0">
            <h4 class="ch">Production Breakdown</h4>
            <div class="avr-bar">
              <div class="avr-accepted" :style="{ width: (100 - data.production.rejectionRate) + '%' }"></div>
              <div class="avr-rejected" :style="{ width: data.production.rejectionRate + '%' }"></div>
            </div>
            <div class="avr-legend">
              <span class="avr-leg"><span class="avr-dot good"></span>Accepted {{ (100 - data.production.rejectionRate).toFixed(1) }}%</span>
              <span class="avr-leg"><span class="avr-dot bad"></span>Rejected {{ data.production.rejectionRate }}%</span>
            </div>
          </div>

          <!-- Rejection by Company -->
          <div v-if="data.rejectionsByCompany?.length" style="margin-top:16px">
            <h4 class="ch">Rejection by Company</h4>
            <div class="rej-company-list">
              <div v-for="rc in data.rejectionsByCompany" :key="rc.companyName" class="rc-row">
                <span class="rc-name">{{ rc.companyName }}</span>
                <div class="rc-bar-t"><div class="rc-bar-f" :style="{ width: pct(rc.rejected, data.rejectionsByCompany[0]?.rejected || 1) + '%' }"></div></div>
                <span class="rc-val">{{ fmtN(rc.rejected) }} m</span>
              </div>
            </div>
          </div>

          <!-- Quality Recommendations -->
          <div class="quality-reco" style="margin-top:16px">
            <h4 class="ch">Quality Assessment</h4>
            <div class="qr-item" :class="data.production.rejectionRate <= 1 ? 'qr-good' : data.production.rejectionRate <= 3 ? 'qr-ok' : 'qr-bad'">
              <v-icon size="16" :color="data.production.rejectionRate <= 1 ? '#2E7D32' : data.production.rejectionRate <= 3 ? '#E65100' : '#C62828'">{{ data.production.rejectionRate <= 1 ? 'mdi-check-circle' : data.production.rejectionRate <= 3 ? 'mdi-alert' : 'mdi-alert-octagon' }}</v-icon>
              <span>{{ data.production.rejectionRate <= 1 ? 'Excellent quality — rejection rate is well under control' : data.production.rejectionRate <= 3 ? 'Good quality — minor attention needed on rejection trends' : 'Quality needs attention — rejection rate exceeds acceptable threshold' }}</span>
            </div>
          </div>
        </div>

        <!-- Yarn (Nool) Analytics -->
        <div class="panel">
          <div class="ph"><div class="ph-l"><div class="pi teal"><v-icon size="18" color="white">mdi-palette-swatch</v-icon></div><div><h2 class="pt">Yarn (Nool) Analytics</h2><p class="ps">Stock, consumption & utilization</p></div></div></div>

          <div class="yarn-grid" v-if="data.noolBalance">
            <div class="yarn-card green-b"><v-icon size="20" color="#2E7D32">mdi-arrow-down-bold-circle</v-icon><span class="yc-val green-t">{{ fmtN(data.noolBalance.received) }} kg</span><span class="yc-lbl">Total Received</span></div>
            <div class="yarn-card orange-b"><v-icon size="20" color="#E65100">mdi-arrow-up-bold-circle</v-icon><span class="yc-val orange-t">{{ fmtN(data.noolBalance.used) }} kg</span><span class="yc-lbl">Used</span></div>
            <div class="yarn-card blue-b"><v-icon size="20" color="#1565C0">mdi-arrow-left-bold-circle</v-icon><span class="yc-val blue-t">{{ fmtN(data.noolBalance.returned) }} kg</span><span class="yc-lbl">Returned</span></div>
            <div class="yarn-card purple-b"><v-icon size="20" color="#7B1FA2">mdi-scale-balance</v-icon><span class="yc-val">{{ fmtN(data.noolBalance.balance) }} kg</span><span class="yc-lbl">Current Stock</span></div>
          </div>

          <!-- Utilization -->
          <div class="yarn-util" v-if="data.noolBalance && data.noolBalance.received > 0">
            <div class="yu-head"><span>Yarn Utilization</span><span class="yu-pct">{{ yarnUtilPct }}%</span></div>
            <div class="yu-track"><div class="yu-fill" :style="{ width: yarnUtilPct + '%' }"></div></div>
          </div>

          <!-- Stock Estimates -->
          <div class="yarn-estimates" v-if="data.noolBalance">
            <div class="ye-item" v-if="data.noolBalance.consumptionRate > 0">
              <v-icon size="16" color="#E65100">mdi-speedometer</v-icon>
              <div><span class="ye-lbl">Daily Consumption</span><span class="ye-val">{{ fmtN(Math.round(data.noolBalance.consumptionRate)) }} kg/day</span></div>
            </div>
            <div class="ye-item" v-if="data.noolBalance.daysRemaining > 0">
              <v-icon size="16" color="#2E7D32">mdi-calendar-clock</v-icon>
              <div><span class="ye-lbl">Est. Stock Days</span><span class="ye-val">{{ data.noolBalance.daysRemaining }} days</span></div>
            </div>
            <div class="ye-item" v-if="data.noolBalance.balance <= 0">
              <v-icon size="16" color="#C62828">mdi-alert</v-icon>
              <div><span class="ye-lbl">Stock Status</span><span class="ye-val red-t">Out of Stock</span></div>
            </div>
          </div>

          <!-- Stock Health -->
          <div class="yarn-health" v-if="data.noolBalance">
            <h4 class="ch">Stock Health</h4>
            <div class="yh-item" :class="data.noolBalance.balance > 5000 ? 'yh-good' : data.noolBalance.balance > 1000 ? 'yh-warn' : 'yh-critical'">
              <v-icon size="16" :color="data.noolBalance.balance > 5000 ? '#2E7D32' : data.noolBalance.balance > 1000 ? '#E65100' : '#C62828'">{{ data.noolBalance.balance > 5000 ? 'mdi-check-circle' : data.noolBalance.balance > 1000 ? 'mdi-alert' : 'mdi-alert-octagon' }}</v-icon>
              <span>{{ data.noolBalance.balance > 5000 ? 'Healthy stock levels — sufficient for continued production' : data.noolBalance.balance > 1000 ? 'Stock running low — consider reordering soon' : 'Critical stock level — immediate replenishment needed' }}</span>
            </div>
          </div>

          <!-- Yarn Breakdown Donut -->
          <div class="yarn-breakdown" v-if="data.noolBalance && data.noolBalance.received > 0">
            <h4 class="ch">Yarn Distribution</h4>
            <div class="yb-items">
              <div class="yb-row"><span class="yb-label">In Production</span><div class="yb-bar-t"><div class="yb-bar-f yb-used" :style="{ width: pct(data.noolBalance.used, data.noolBalance.received) + '%' }"></div></div><span class="yb-pct">{{ pct(data.noolBalance.used, data.noolBalance.received) }}%</span></div>
              <div class="yb-row"><span class="yb-label">Returned</span><div class="yb-bar-t"><div class="yb-bar-f yb-ret" :style="{ width: pct(data.noolBalance.returned, data.noolBalance.received) + '%' }"></div></div><span class="yb-pct">{{ pct(data.noolBalance.returned, data.noolBalance.received) }}%</span></div>
              <div class="yb-row"><span class="yb-label">In Stock</span><div class="yb-bar-t"><div class="yb-bar-f yb-stock" :style="{ width: pct(data.noolBalance.balance, data.noolBalance.received) + '%' }"></div></div><span class="yb-pct">{{ pct(data.noolBalance.balance, data.noolBalance.received) }}%</span></div>
            </div>
          </div>

          <!-- Nool Monthly Trend -->
          <div class="chart-box" v-if="data.noolMonthly?.length" style="margin-top:16px">
            <h4 class="ch">Monthly Yarn Movement</h4>
            <div class="nool-chart">
              <div v-for="n in data.noolMonthly" :key="n.month" class="nc-col">
                <div class="nc-bars">
                  <div class="nc-bar nc-recv" :style="{ height: barH(n.received, maxNool) + '%' }" :title="'Received: ' + fmtN(n.received) + ' kg'"></div>
                  <div class="nc-bar nc-used" :style="{ height: barH(n.used, maxNool) + '%' }" :title="'Used: ' + fmtN(n.used) + ' kg'"></div>
                </div>
                <span class="nc-lbl">{{ n.month }}</span>
              </div>
            </div>
            <div class="nc-legend"><span class="nc-leg-item"><span class="nc-dot nc-recv"></span>Received</span><span class="nc-leg-item"><span class="nc-dot nc-used"></span>Used</span></div>
          </div>
        </div>
      </div>

      <!-- ━━━━━━━━━━━ ORDER OVERVIEW + TOP ORDERS ━━━━━━━━━━━ -->
      <div class="dual">
        <!-- Order Overview -->
        <div class="panel">
          <div class="ph"><div class="ph-l"><div class="pi purple"><v-icon size="18" color="white">mdi-clipboard-check</v-icon></div><h2 class="pt">Order Overview</h2></div></div>
          <div class="os-grid" v-if="data.orderStatus">
            <div class="os-card blue-b"><span class="os-val blue-t">{{ data.orderStatus.active?.count || 0 }}</span><span class="os-lbl">Active</span></div>
            <div class="os-card green-b"><span class="os-val green-t">{{ data.orderStatus.completed?.count || 0 }}</span><span class="os-lbl">Completed</span></div>
            <div class="os-card purple-b"><span class="os-val" style="color:#7B1FA2">{{ data.orderStatus.completionRate }}%</span><span class="os-lbl">Done Rate</span></div>
            <div class="os-card"><span class="os-val">{{ data.overview.totalCompanies }}</span><span class="os-lbl">Companies</span></div>
          </div>
          <div class="os-progress" v-if="data.orderStatus">
            <div class="osp-head"><span>Completion</span><span>{{ data.orderStatus.completed?.count || 0 }} / {{ data.overview.totalOrders }}</span></div>
            <div class="osp-track"><div class="osp-fill" :style="{ width: data.orderStatus.completionRate + '%' }"></div></div>
          </div>

          <!-- Revenue Analysis -->
          <h4 class="ch" style="margin-top:20px">Revenue Analysis</h4>
          <div class="rev-grid">
            <div class="rev-item"><span class="rev-lbl">Revenue/Order (avg)</span><span class="rev-val">{{ fmt(Math.round(data.financial.totalPayableAmount / Math.max(1, data.overview.totalOrders))) }}</span></div>
            <div class="rev-item"><span class="rev-lbl">Revenue/Company (avg)</span><span class="rev-val">{{ fmt(Math.round(data.financial.totalPayableAmount / Math.max(1, data.overview.totalCompanies))) }}</span></div>
            <div class="rev-item"><span class="rev-lbl">Production Value/Day</span><span class="rev-val">{{ fmt(Math.round(data.financial.totalProducedValue / Math.max(1, daysSinceYearStart))) }}</span></div>
            <div class="rev-item"><span class="rev-lbl">Pending/Company (avg)</span><span class="rev-val orange-t">{{ fmt(Math.round(data.financial.totalPendingAmount / Math.max(1, data.overview.totalCompanies))) }}</span></div>
          </div>

          <!-- Cash Flow Summary -->
          <h4 class="ch" style="margin-top:16px">Cash Flow Indicators</h4>
          <div class="cf-bars">
            <div class="cf-row"><span class="cf-l">Collection Efficiency</span><div class="cf-track"><div class="cf-fill good" :style="{ width: Math.min(100, data.financial.collectionPct) + '%' }"></div></div><span class="cf-v">{{ data.financial.collectionPct }}%</span></div>
            <div class="cf-row"><span class="cf-l">Allocation Rate</span><div class="cf-track"><div class="cf-fill blue" :style="{ width: Math.min(100, allocPct) + '%' }"></div></div><span class="cf-v">{{ allocPct }}%</span></div>
            <div class="cf-row"><span class="cf-l">Order Fulfillment</span><div class="cf-track"><div class="cf-fill purple" :style="{ width: Math.min(100, data.orderStatus?.completionRate || 0) + '%' }"></div></div><span class="cf-v">{{ data.orderStatus?.completionRate || 0 }}%</span></div>
            <div class="cf-row"><span class="cf-l">Production Target</span><div class="cf-track"><div class="cf-fill indigo" :style="{ width: Math.min(100, data.production.progressPct) + '%' }"></div></div><span class="cf-v">{{ data.production.progressPct }}%</span></div>
          </div>
        </div>

        <!-- Top Producing Orders -->
        <div class="panel">
          <div class="ph"><div class="ph-l"><div class="pi gold"><v-icon size="18" color="white">mdi-trophy</v-icon></div><h2 class="pt">Top Producing Orders</h2></div><span class="pb blue">This Year</span></div>
          <div class="top-list" v-if="data.topOrders.length">
            <div v-for="(o, i) in data.topOrders.slice(0, 10)" :key="o.orderId" class="top-row">
              <div class="top-medal" :class="i < 3 ? 'gold' : ''">{{ i + 1 }}</div>
              <div class="top-body">
                <span class="top-name">{{ o.orderName }}</span>
                <div class="top-bar-t"><div class="top-bar-f" :style="{ width: pct(o.totalProduced, data.topOrders[0]?.totalProduced || 1) + '%' }"></div></div>
              </div>
              <span class="top-val">{{ fmtN(o.totalProduced) }} m</span>
            </div>
          </div>
        </div>
      </div>

      <!-- ━━━━━━━━━━━ RECENT PAYMENTS ━━━━━━━━━━━ -->
      <div class="panel" v-if="data.recentPayments?.length">
        <div class="ph"><div class="ph-l"><div class="pi emerald"><v-icon size="18" color="white">mdi-history</v-icon></div><h2 class="pt">Recent Payments</h2></div><span class="pb green">Last {{ data.recentPayments.length }} transactions</span></div>
        <div class="recent-grid">
          <div v-for="(p, i) in data.recentPayments.slice(0, 10)" :key="i" class="recent-row">
            <div class="rr-left">
              <div class="rr-icon" :class="'m-' + p.mode"><v-icon size="14" color="white">{{ modeIcon(p.mode) }}</v-icon></div>
              <div><span class="rr-company">{{ p.company }}</span><span class="rr-date">{{ fmtDate(p.date) }}</span></div>
            </div>
            <div class="rr-right">
              <span class="rr-amount green-t">{{ fmt(p.amount) }}</span>
              <span class="rr-mode">{{ p.mode }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- ━━━━━━━━━━━ PAYMENT AGING & MONTH COMPARISON ━━━━━━━━━━━ -->
      <div class="dual">
        <!-- Payment Aging Analysis -->
        <div class="panel" v-if="data.paymentAging?.length">
          <div class="ph"><div class="ph-l"><div class="pi orange"><v-icon size="18" color="white">mdi-clock-alert</v-icon></div><div><h2 class="pt">Payment Aging</h2><p class="ps">Days since last payment per company</p></div></div><span class="pb" :class="overdueCount > 0 ? 'red' : 'green'">{{ overdueCount }} overdue</span></div>
          <div class="aging-list">
            <div v-for="a in data.paymentAging.slice(0, 10)" :key="a.companyName" class="aging-row" :class="agingClass(a.daysSinceLastPayment)">
              <div class="aging-left">
                <div class="aging-badge" :class="agingClass(a.daysSinceLastPayment)">{{ a.daysSinceLastPayment }}d</div>
                <div>
                  <span class="aging-name">{{ a.companyName }}</span>
                  <span class="aging-date">Last: {{ fmtDate(a.lastPaymentDate) }} · {{ fmt(a.lastAmount) }}</span>
                </div>
              </div>
              <div class="aging-right">
                <span class="aging-pending" :class="a.pendingAmount > 0 ? 'orange-t' : 'green-t'">{{ fmt(a.pendingAmount) }}</span>
                <span class="aging-sub">pending</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Month-over-Month Comparison -->
        <div class="panel" v-if="data.monthComparison">
          <div class="ph"><div class="ph-l"><div class="pi blue"><v-icon size="18" color="white">mdi-compare-horizontal</v-icon></div><div><h2 class="pt">Month-over-Month</h2><p class="ps">This month vs last month — full comparison</p></div></div></div>
          <div class="mom-table">
            <div class="mom-header"><span class="mom-metric-h">Metric</span><span class="mom-val-h">This Month</span><span class="mom-val-h">Last Month</span><span class="mom-val-h">Change</span></div>
            <div class="mom-row">
              <span class="mom-metric"><v-icon size="14" color="#1565C0">mdi-factory</v-icon> Production</span>
              <span class="mom-val">{{ fmtN(data.monthComparison.production.current) }} m</span>
              <span class="mom-val">{{ fmtN(data.monthComparison.production.previous) }} m</span>
              <span class="mom-change" :class="momClass(data.monthComparison.production.change)"><v-icon size="12">{{ data.monthComparison.production.change >= 0 ? 'mdi-arrow-up' : 'mdi-arrow-down' }}</v-icon>{{ Math.abs(data.monthComparison.production.change) }}%</span>
            </div>
            <div class="mom-row">
              <span class="mom-metric"><v-icon size="14" color="#5C6BC0">mdi-speedometer</v-icon> Avg Daily Prod</span>
              <span class="mom-val">{{ fmtN(data.monthComparison.avgDailyProd.current) }} m/day</span>
              <span class="mom-val">{{ fmtN(data.monthComparison.avgDailyProd.previous) }} m/day</span>
              <span class="mom-change" :class="momClass(data.monthComparison.avgDailyProd.change)"><v-icon size="12">{{ data.monthComparison.avgDailyProd.change >= 0 ? 'mdi-arrow-up' : 'mdi-arrow-down' }}</v-icon>{{ Math.abs(data.monthComparison.avgDailyProd.change) }}%</span>
            </div>
            <div class="mom-row">
              <span class="mom-metric"><v-icon size="14" color="#2E7D32">mdi-cash-multiple</v-icon> Receipts</span>
              <span class="mom-val">{{ fmt(data.monthComparison.receipts.current) }}</span>
              <span class="mom-val">{{ fmt(data.monthComparison.receipts.previous) }}</span>
              <span class="mom-change" :class="momClass(data.monthComparison.receipts.change)"><v-icon size="12">{{ data.monthComparison.receipts.change >= 0 ? 'mdi-arrow-up' : 'mdi-arrow-down' }}</v-icon>{{ Math.abs(data.monthComparison.receipts.change) }}%</span>
            </div>
            <div class="mom-row">
              <span class="mom-metric"><v-icon size="14" color="#C62828">mdi-alert-octagon</v-icon> Rejections</span>
              <span class="mom-val">{{ fmtN(data.monthComparison.rejections.current) }} m</span>
              <span class="mom-val">—</span>
              <span class="mom-change neutral">—</span>
            </div>
            <div class="mom-row">
              <span class="mom-metric"><v-icon size="14" color="#00838F">mdi-palette-swatch</v-icon> Yarn Used</span>
              <span class="mom-val">{{ fmtN(data.monthComparison.yarnUsed.current) }} kg</span>
              <span class="mom-val">{{ fmtN(data.monthComparison.yarnUsed.previous) }} kg</span>
              <span class="mom-change" :class="momClassInverse(data.monthComparison.yarnUsed.change)"><v-icon size="12">{{ data.monthComparison.yarnUsed.change >= 0 ? 'mdi-arrow-up' : 'mdi-arrow-down' }}</v-icon>{{ Math.abs(data.monthComparison.yarnUsed.change) }}%</span>
            </div>
            <div class="mom-row">
              <span class="mom-metric"><v-icon size="14" color="#7B1FA2">mdi-account-cash</v-icon> Payroll</span>
              <span class="mom-val">{{ fmt(data.monthComparison.payroll.current) }}</span>
              <span class="mom-val">{{ fmt(data.monthComparison.payroll.previous) }}</span>
              <span class="mom-change" :class="momClassInverse(data.monthComparison.payroll.change)"><v-icon size="12">{{ data.monthComparison.payroll.change <= 0 ? 'mdi-arrow-down' : 'mdi-arrow-up' }}</v-icon>{{ Math.abs(data.monthComparison.payroll.change) }}%</span>
            </div>
            <div class="mom-row mom-highlight">
              <span class="mom-metric"><v-icon size="14" color="#059669">mdi-chart-line</v-icon> <strong>Net Profit</strong></span>
              <span class="mom-val fw">{{ fmt(data.monthComparison.profit.current) }}</span>
              <span class="mom-val fw">{{ fmt(data.monthComparison.profit.previous) }}</span>
              <span class="mom-change" :class="momClass(data.monthComparison.profit.change)"><v-icon size="12">{{ data.monthComparison.profit.change >= 0 ? 'mdi-arrow-up' : 'mdi-arrow-down' }}</v-icon>{{ Math.abs(data.monthComparison.profit.change) }}%</span>
            </div>
          </div>

          <!-- Summary Insight -->
          <div class="mom-summary" v-if="data.monthComparison">
            <div class="mom-sum-item" :class="data.monthComparison.production.change >= 0 ? 'good' : 'bad'">
              <v-icon size="14">{{ data.monthComparison.production.change >= 0 ? 'mdi-check-circle' : 'mdi-alert' }}</v-icon>
              <span>Production is {{ data.monthComparison.production.change >= 0 ? 'up' : 'down' }} {{ Math.abs(data.monthComparison.production.change) }}% — Avg {{ fmtN(data.monthComparison.avgDailyProd.current) }} m/day this month</span>
            </div>
            <div class="mom-sum-item" :class="data.monthComparison.receipts.change >= 0 ? 'good' : 'bad'">
              <v-icon size="14">{{ data.monthComparison.receipts.change >= 0 ? 'mdi-check-circle' : 'mdi-alert' }}</v-icon>
              <span>Collections {{ data.monthComparison.receipts.change >= 0 ? 'improved' : 'declined' }} by {{ Math.abs(data.monthComparison.receipts.change) }}% vs last month</span>
            </div>
            <div class="mom-sum-item" :class="data.monthComparison.profit.current >= 0 ? 'good' : 'bad'" v-if="data.monthComparison.profit.current !== 0 || data.monthComparison.profit.previous !== 0">
              <v-icon size="14">{{ data.monthComparison.profit.current >= 0 ? 'mdi-trending-up' : 'mdi-trending-down' }}</v-icon>
              <span>Net profit this month: {{ fmt(data.monthComparison.profit.current) }} ({{ data.monthComparison.profit.change >= 0 ? '+' : '' }}{{ data.monthComparison.profit.change }}% vs last)</span>
            </div>
          </div>
        </div>
      </div>

      <!-- ━━━━━━━━━━━ PAYROLL & WORKFORCE ━━━━━━━━━━━ -->
      <div class="panel">
        <div class="ph"><div class="ph-l"><div class="pi teal"><v-icon size="18" color="white">mdi-account-group</v-icon></div><div><h2 class="pt">Payroll & Workforce</h2><p class="ps">Salary analysis & employee insights</p></div></div><span class="pb blue">{{ data.workforce?.active || 0 }} active employees</span></div>

        <!-- Workforce KPIs -->
        <div class="wf-kpis">
          <div class="wfk"><v-icon size="18" color="#1565C0">mdi-account-multiple</v-icon><span class="wfk-val">{{ data.workforce?.total || 0 }}</span><span class="wfk-lbl">Total</span></div>
          <div class="wfk"><v-icon size="18" color="#2E7D32">mdi-account-check</v-icon><span class="wfk-val green-t">{{ data.workforce?.active || 0 }}</span><span class="wfk-lbl">Active</span></div>
          <div class="wfk"><v-icon size="18" color="#2E7D32">mdi-wallet-plus</v-icon><span class="wfk-val green-t">{{ fmt(data.payroll?.totalNetAllTime || 0) }}</span><span class="wfk-lbl">Total Net Paid</span></div>
          <div class="wfk"><v-icon size="18" color="#1565C0">mdi-cash-check</v-icon><span class="wfk-val blue-t">{{ fmt(data.payroll?.totalGrossAllTime || 0) }}</span><span class="wfk-lbl">Total Gross</span></div>
          <div class="wfk"><v-icon size="18" color="#C62828">mdi-cash-minus</v-icon><span class="wfk-val red-t">{{ fmt(data.payroll?.totalDeductionsAllTime || 0) }}</span><span class="wfk-lbl">Deductions</span></div>
          <div class="wfk"><v-icon size="18" color="#00838F">mdi-cash-clock</v-icon><span class="wfk-val">{{ fmt(data.payroll?.avgSalaryPerRun || 0) }}</span><span class="wfk-lbl">Avg Net/Run</span></div>
        </div>

        <!-- Monthly Salary Trend Chart -->
        <div class="chart-box" v-if="payrollMonthly.length">
          <h4 class="ch">Monthly Salary Summary (Combined)</h4>
          <div class="payroll-chart">
            <div v-for="pm in payrollMonthly" :key="pm.period" class="pc-col">
              <div class="pc-tooltip">
                <div class="pct-period">{{ pm.period }}</div>
                <div class="pct-row"><span class="pct-dot gross"></span>Gross: {{ fmt(pm.gross) }}</div>
                <div class="pct-row"><span class="pct-dot net"></span>Net Paid: {{ fmt(pm.net) }}</div>
                <div class="pct-row" v-if="pm.market > 0"><span class="pct-dot market"></span>Market: {{ fmt(pm.market) }}</div>
                <div class="pct-row" v-if="pm.advance > 0"><span class="pct-dot advance"></span>Advance: {{ fmt(pm.advance) }}</div>
                <div class="pct-row" v-if="pm.deductions > 0"><span class="pct-dot ded"></span>Deductions: {{ fmt(pm.deductions) }}</div>
                <div class="pct-row pct-emp">{{ pm.employees }} employees · {{ pm.runs }} run{{ pm.runs > 1 ? 's' : '' }}</div>
              </div>
              <div class="pc-bars">
                <div class="pc-bar pc-gross" :style="{ height: barH(pm.gross, maxPayroll) + '%' }"></div>
                <div class="pc-bar pc-net" :style="{ height: barH(pm.net, maxPayroll) + '%' }"></div>
              </div>
              <span class="pc-lbl">{{ pm.shortPeriod }}</span>
              <span class="pc-val">{{ shortCur(pm.net) }}</span>
            </div>
          </div>
          <div class="pc-legend">
            <span class="pc-leg"><span class="pc-leg-dot gross"></span>Gross</span>
            <span class="pc-leg"><span class="pc-leg-dot net"></span>Net Paid</span>
          </div>
        </div>

        <!-- Combined Monthly Salary Cards -->
        <div class="salary-runs" v-if="payrollMonthly.length">
          <h4 class="ch">Monthly Breakdown</h4>
          <div class="sr-grid">
            <div v-for="pm in payrollMonthly" :key="pm.period" class="sr-card">
              <div class="sr-header">
                <span class="sr-period">{{ pm.period }}</span>
                <span class="sr-emp">{{ pm.employees }} emp · {{ pm.runs }} run{{ pm.runs > 1 ? 's' : '' }}</span>
              </div>
              <div class="sr-amount">{{ fmt(pm.net) }}</div>
              <div class="sr-breakdown">
                <div class="sr-row"><span>Gross Salary</span><span>{{ fmt(pm.gross) }}</span></div>
                <div class="sr-row" v-if="pm.market > 0"><span>Market Allowance</span><span class="blue-t">{{ fmt(pm.market) }}</span></div>
                <div class="sr-row" v-if="pm.advance > 0"><span>Advance Paid</span><span class="orange-t">{{ fmt(pm.advance) }}</span></div>
                <div class="sr-row" v-if="pm.deductions > 0"><span>Deductions</span><span class="red-t">{{ fmt(pm.deductions) }}</span></div>
              </div>
              <div class="sr-avg">Avg/Employee: <strong>{{ fmt(Math.round(pm.net / Math.max(1, pm.employees))) }}</strong></div>
            </div>
          </div>
        </div>

        <!-- Employee Wages -->
        <h4 class="ch" style="margin-top:20px" v-if="data.workforce?.employees?.length">Employee Daily Wages</h4>
        <div class="emp-grid" v-if="data.workforce?.employees?.length">
          <div v-for="emp in data.workforce.employees.slice(0, showAllEmp ? 999 : 10)" :key="emp.name" class="emp-row">
            <span class="emp-name">{{ emp.name }}</span>
            <div class="emp-bar-t"><div class="emp-bar-f" :style="{ width: pct(emp.dailyWage, data.workforce.employees[0]?.dailyWage || 1) + '%' }"></div></div>
            <span class="emp-wage">₹{{ emp.dailyWage || 0 }}/day</span>
          </div>
        </div>
        <div class="show-more" v-if="(data.workforce?.employees?.length || 0) > 10">
          <v-btn variant="text" color="primary" size="small" @click="showAllEmp = !showAllEmp">{{ showAllEmp ? 'Show Less' : `Show All (${data.workforce.employees.length})` }}</v-btn>
        </div>
      </div>

      <!-- ━━━━━━━━━━━ ORDER DETAILS TABLE ━━━━━━━━━━━ -->
      <div class="panel" v-if="data.orderDetails?.length">
        <div class="ph"><div class="ph-l"><div class="pi blue"><v-icon size="18" color="white">mdi-clipboard-list</v-icon></div><div><h2 class="pt">Order Details</h2><p class="ps">All active orders with production & value</p></div></div><span class="pb blue">{{ data.orderDetails.length }} orders</span></div>
        <div class="table-wrap">
          <table class="data-table">
            <thead><tr><th>Order</th><th>Company</th><th>Status</th><th class="r">Expected</th><th class="r">Produced</th><th class="r">Rejected</th><th class="r">Rate/m</th><th class="r">Payable</th><th class="r">Progress</th><th class="r">Age</th></tr></thead>
            <tbody>
              <tr v-for="o in data.orderDetails.slice(0, showAllOrders ? 999 : 15)" :key="o.orderName + o.company">
                <td class="fw">{{ o.orderName }}</td>
                <td>{{ o.company }}</td>
                <td><span class="status-chip" :class="o.status">{{ o.status }}</span></td>
                <td class="r">{{ fmtN(o.expected) }} m</td>
                <td class="r">{{ fmtN(o.produced) }} m</td>
                <td class="r red-t">{{ fmtN(o.rejected) }} m</td>
                <td class="r">₹{{ o.rate }}</td>
                <td class="r fw">{{ fmt(o.payable) }}</td>
                <td class="r"><span class="pct-badge" :class="o.progressPct >= 80 ? 'good' : o.progressPct >= 40 ? 'mid' : 'low'">{{ o.progressPct }}%</span></td>
                <td class="r">{{ o.ageDays }}d</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="show-more" v-if="data.orderDetails.length > 15">
          <v-btn variant="text" color="primary" size="small" @click="showAllOrders = !showAllOrders">{{ showAllOrders ? 'Show Less' : `Show All (${data.orderDetails.length})` }}</v-btn>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '@/plugins/axios'
import { useUtils } from '@/composables/useUtils'

const { fmt, fmtN, fmtDate, pct } = useUtils()
const loading = ref(false)
const data = ref(null)
const showAllOrders = ref(false)
const showAllEmp = ref(false)
const expandedInsights = ref([])

function toggleInsight(i) {
  const idx = expandedInsights.value.indexOf(i)
  if (idx >= 0) expandedInsights.value.splice(idx, 1)
  else expandedInsights.value.push(i)
}

async function fetchData() {
  loading.value = true
  try { data.value = (await api.get('/analytics')).data } catch (e) { console.error(e) }
  finally { loading.value = false }
}
onMounted(fetchData)

const kpis = computed(() => {
  if (!data.value) return []
  const d = data.value
  return [
    { label: 'Total Payable', value: fmt(d.financial.totalPayableAmount), icon: 'mdi-cash-register', tone: 'blue', sub: `${d.overview.totalOrders} orders · ${d.overview.totalCompanies} companies` },
    { label: 'Total Collected', value: fmt(d.financial.totalPaidAmount), icon: 'mdi-check-decagram', tone: 'green', pct: d.financial.collectionPct, sub: `${d.financial.collectionPct}% collected`, badge: d.receipts.growth >= 0 ? `+${d.receipts.growth}%` : `${d.receipts.growth}%`, badgeTone: d.receipts.growth >= 0 ? 'green' : 'red', badgeIcon: d.receipts.growth >= 0 ? 'mdi-arrow-up' : 'mdi-arrow-down' },
    { label: 'Pending Amount', value: fmt(d.financial.totalPendingAmount), icon: 'mdi-clock-alert-outline', tone: 'orange', sub: 'Awaiting from companies' },
    { label: 'Production', value: fmtN(d.production.totalProduced) + ' m', icon: 'mdi-factory', tone: 'indigo', pct: d.production.progressPct, sub: `${d.production.progressPct}% of target`, badge: d.production.growth >= 0 ? `+${d.production.growth}%` : `${d.production.growth}%`, badgeTone: d.production.growth >= 0 ? 'green' : 'red', badgeIcon: d.production.growth >= 0 ? 'mdi-arrow-up' : 'mdi-arrow-down' },
    { label: 'Rejection Loss', value: fmt(d.financial.totalRejectionLoss), icon: 'mdi-alert-circle', tone: 'red', sub: `${d.production.rejectionRate}% rate` },
    { label: 'Yarn Balance', value: fmtN(d.noolBalance?.balance || 0) + ' kg', icon: 'mdi-palette-swatch', tone: 'teal', sub: `${fmtN(d.noolBalance?.received || 0)} kg received` },
  ]
})

const allocPct = computed(() => { const d = data.value?.financial; return d && d.totalPaidAmount > 0 ? Math.round((d.totalAllocated / d.totalPaidAmount) * 100) : 0 })
const daysSinceYearStart = computed(() => Math.max(1, Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 1)) / 86400000)))
const avgDaily = computed(() => { const days = new Date().getDate(); return days > 0 ? Math.round((data.value?.production.thisMonth || 0) / days) : 0 })
const efficiencyPct = computed(() => { const p = data.value?.production; return p && p.totalProduced > 0 ? (p.totalAccepted / p.totalProduced) * 100 : 100 })
const cfTotals = computed(() => {
  const list = data.value?.companyFinancials || []
  const payable = list.reduce((s, c) => s + c.payable, 0)
  return {
    payable,
    receipt: list.reduce((s, c) => s + c.receipt, 0),
    allocated: list.reduce((s, c) => s + c.allocated, 0),
    pending: list.reduce((s, c) => s + c.pending, 0),
    unallocated: list.reduce((s, c) => s + c.unallocated, 0),
    collPct: payable > 0 ? Math.round((list.reduce((s, c) => s + c.receipt, 0) / payable) * 100) : 0,
  }
})

// Payroll chart computeds
const payrollMonthly = computed(() => {
  const runs = data.value?.payroll?.monthlyCombined || data.value?.payroll?.recentRuns || []
  if (!runs.length) return []
  const grouped = {}
  runs.forEach(r => {
    const key = `${r.year}-${String(r.month).padStart(2, '0')}`
    if (!grouped[key]) grouped[key] = { period: `${monthName(r.month)} ${r.year}`, shortPeriod: monthName(r.month), gross: 0, net: 0, deductions: 0, market: 0, advance: 0, employees: 0, runs: 0 }
    grouped[key].gross += r.totalGross || 0
    grouped[key].net += r.totalNet || 0
    grouped[key].deductions += r.totalDeductions || 0
    grouped[key].market += r.totalMarket || 0
    grouped[key].advance += r.totalAdvance || 0
    grouped[key].employees = Math.max(grouped[key].employees, r.employeeCount || 0)
    grouped[key].runs += 1
  })
  return Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([, v]) => v)
})

const maxPayroll = computed(() => Math.max(1, ...payrollMonthly.value.map(p => p.gross)))

const maxProd = computed(() => Math.max(1, ...(data.value?.trends.production.map(p => p.value) || [1])))
const maxPay = computed(() => Math.max(1, ...(data.value?.trends.payments.map(p => p.value) || [1])))
const maxNool = computed(() => Math.max(1, ...(data.value?.noolMonthly?.flatMap(n => [n.received, n.used]) || [1])))
const totalModes = computed(() => (data.value?.paymentModes || []).reduce((s, m) => s + m.total, 0) || 1)
const yarnUtilPct = computed(() => { const b = data.value?.noolBalance; return b && b.received > 0 ? Math.round(((b.used + b.returned) / b.received) * 100) : 0 })

const health = computed(() => {
  if (!data.value) return []
  const d = data.value
  const coll = d.financial.collectionPct, prod = d.production.progressPct, rej = d.production.rejectionRate, alloc = allocPct.value
  return [
    { label: 'Collection', value: coll + '%', pct: Math.min(100, coll), icon: 'mdi-cash-check', status: coll >= 70 ? 'good' : coll >= 40 ? 'mid' : 'low', hint: coll >= 70 ? 'Healthy' : 'Needs follow-up' },
    { label: 'Production', value: prod + '%', pct: Math.min(100, prod), icon: 'mdi-factory', status: prod >= 60 ? 'good' : prod >= 30 ? 'mid' : 'low', hint: prod >= 60 ? 'On track' : 'Behind schedule' },
    { label: 'Quality', value: (100 - rej).toFixed(1) + '%', pct: Math.min(100, 100 - rej * 5), icon: 'mdi-shield-check', status: rej <= 2 ? 'good' : rej <= 5 ? 'mid' : 'low', hint: rej <= 2 ? 'Excellent' : 'Monitor quality' },
    { label: 'Allocation', value: alloc + '%', pct: Math.min(100, alloc), icon: 'mdi-call-split', status: alloc >= 80 ? 'good' : alloc >= 50 ? 'mid' : 'low', hint: alloc >= 80 ? 'Well allocated' : 'Unallocated funds' },
  ]
})

const overdueCount = computed(() => (data.value?.paymentAging || []).filter(a => a.daysSinceLastPayment > 30 && a.pendingAmount > 0).length)
function agingClass(days) { return days > 30 ? 'overdue' : days > 14 ? 'warning' : 'ok' }
function momClass(change) { return change >= 0 ? 'pos' : 'neg' }
function momClassInverse(change) { return change <= 0 ? 'pos' : 'neg' }

function barH(v, max) { return max ? Math.max(3, Math.round((v / max) * 100)) : 3 }
function shortCur(n) { if (n >= 10000000) return '₹' + (n/10000000).toFixed(1) + 'Cr'; if (n >= 100000) return '₹' + (n/100000).toFixed(1) + 'L'; if (n >= 1000) return '₹' + (n/1000).toFixed(0) + 'K'; return '₹' + n }
function modeIcon(m) { return m === 'cash' ? 'mdi-cash' : m === 'cheque' ? 'mdi-checkbook' : 'mdi-bank' }
function monthName(m) { return ['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][m] || '' }
</script>

<style scoped>
.ap { max-width: 1440px; margin: 0 auto; padding: 20px; }
.loading-box { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 80px 20px; color: #64748B; }

/* Hero */
.hero { position: relative; border-radius: 20px; overflow: hidden; margin-bottom: 24px; padding: 28px 32px; }
.hero-bg { position: absolute; inset: 0; background: linear-gradient(135deg, #0D47A1, #1565C0 40%, #1E88E5 80%, #0D47A1); }
.hero-bg::after { content:''; position: absolute; inset: 0; background: radial-gradient(circle at 80% 20%, rgba(255,255,255,0.08), transparent 50%); }
.hero-content { position: relative; display: flex; align-items: center; justify-content: space-between; gap: 20px; flex-wrap: wrap; }
.hero-left { display: flex; align-items: center; gap: 16px; }
.hero-icon { width: 56px; height: 56px; border-radius: 16px; background: rgba(255,255,255,0.12); backdrop-filter: blur(8px); border: 1px solid rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; }
.hero-title { font-size: 26px; font-weight: 800; color: #fff; }
.hero-sub { font-size: 13px; color: rgba(255,255,255,0.7); }
.hero-right { display: flex; align-items: center; gap: 20px; flex-wrap: wrap; }
.hero-stat { text-align: center; padding: 0 16px; border-right: 1px solid rgba(255,255,255,0.15); }
.hero-stat:last-of-type { border: none; }
.hs-val { display: block; font-size: 24px; font-weight: 800; color: #fff; }
.hs-lbl { font-size: 10px; color: rgba(255,255,255,0.6); text-transform: uppercase; letter-spacing: 0.5px; }

/* KPI Grid */
.kpi-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 14px; margin-bottom: 24px; }
.kpi { background: #fff; border-radius: 16px; padding: 18px; border: 1px solid #E2E8F0; position: relative; overflow: hidden; transition: all 0.2s; display: flex; flex-direction: column; }
.kpi::before { content:''; position: absolute; top: 0; left: 0; right: 0; height: 3px; }
.kpi.blue::before { background: linear-gradient(90deg, #1565C0, #42A5F5); }
.kpi.green::before { background: linear-gradient(90deg, #2E7D32, #66BB6A); }
.kpi.orange::before { background: linear-gradient(90deg, #E65100, #FFA726); }
.kpi.indigo::before { background: linear-gradient(90deg, #283593, #5C6BC0); }
.kpi.red::before { background: linear-gradient(90deg, #C62828, #EF5350); }
.kpi.teal::before { background: linear-gradient(90deg, #00838F, #4DD0E1); }
.kpi:hover { box-shadow: 0 8px 24px rgba(0,0,0,0.08); transform: translateY(-2px); }
.kpi-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
.kpi-icon { width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; }
.kpi-icon.blue { background: #EBF5FF; color: #1565C0; } .kpi-icon.green { background: #E8F5E9; color: #2E7D32; }
.kpi-icon.orange { background: #FFF3E0; color: #E65100; } .kpi-icon.indigo { background: #E8EAF6; color: #283593; }
.kpi-icon.red { background: #FFEBEE; color: #C62828; } .kpi-icon.teal { background: #E0F7FA; color: #00838F; }
.kpi-badge { font-size: 10px; font-weight: 800; padding: 2px 7px; border-radius: 8px; display: flex; align-items: center; gap: 2px; }
.kpi-badge.green { background: #E8F5E9; color: #2E7D32; } .kpi-badge.red { background: #FFEBEE; color: #C62828; }
.kpi-val { font-size: 19px; font-weight: 800; color: #1E293B; }
.kpi-lbl { font-size: 11px; font-weight: 600; color: #64748B; }
.kpi-sub { font-size: 10px; color: #94A3B8; margin-top: 3px; }
.kpi-bar { height: 4px; border-radius: 2px; background: #F1F5F9; margin-top: auto; overflow: hidden; }
.kpi-bar-fill { height: 100%; border-radius: 2px; transition: width 0.6s; }
.kpi-bar-fill.blue { background: linear-gradient(90deg, #1565C0, #42A5F5); } .kpi-bar-fill.green { background: linear-gradient(90deg, #2E7D32, #66BB6A); }
.kpi-bar-fill.orange { background: linear-gradient(90deg, #E65100, #FFA726); } .kpi-bar-fill.indigo { background: linear-gradient(90deg, #283593, #5C6BC0); }

/* Panel */
.panel { background: #fff; border-radius: 20px; border: 1px solid #E2E8F0; padding: 24px; margin-bottom: 20px; box-shadow: 0 1px 4px rgba(0,0,0,0.03); }
.dual > .panel { margin-bottom: 0; }
.ph { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; flex-wrap: wrap; gap: 10px; }
.ph-l { display: flex; align-items: center; gap: 12px; }
.pi { width: 38px; height: 38px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.pi.blue { background: linear-gradient(135deg, #1565C0, #42A5F5); } .pi.green { background: linear-gradient(135deg, #2E7D32, #66BB6A); }
.pi.emerald { background: linear-gradient(135deg, #059669, #34D399); } .pi.orange { background: linear-gradient(135deg, #E65100, #FFA726); }
.pi.purple { background: linear-gradient(135deg, #7B1FA2, #AB47BC); } .pi.red { background: linear-gradient(135deg, #C62828, #EF5350); }
.pi.teal { background: linear-gradient(135deg, #00838F, #4DD0E1); } .pi.gold { background: linear-gradient(135deg, #F57C00, #FFD54F); }
.pt { font-size: 17px; font-weight: 800; color: #1E293B; margin: 0; }
.ps { font-size: 12px; color: #94A3B8; margin: 0; }
.pb { font-size: 11px; font-weight: 700; padding: 4px 12px; border-radius: 20px; display: flex; align-items: center; gap: 4px; }
.pb.green { background: #E8F5E9; color: #2E7D32; } .pb.red { background: #FFEBEE; color: #C62828; } .pb.blue { background: #EBF5FF; color: #1565C0; }
.dual { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }

/* P&L Flow */
.pl-flow { display: flex; align-items: center; justify-content: center; gap: 12px; padding: 16px; background: #F8FAFC; border-radius: 14px; margin-bottom: 20px; flex-wrap: wrap; }
.pl-item { display: flex; align-items: center; gap: 8px; padding: 10px 16px; background: #fff; border-radius: 10px; border: 1px solid #E2E8F0; }
.pl-item.hl { border-color: #A5D6A7; background: #F1F8E9; }
.pl-dot { width: 10px; height: 10px; border-radius: 50%; }
.pl-dot.blue { background: #1565C0; } .pl-dot.red { background: #C62828; } .pl-dot.green { background: #2E7D32; }
.pl-l { font-size: 12px; color: #64748B; font-weight: 600; }
.pl-v { font-size: 15px; font-weight: 800; color: #1E293B; }
.pl-arr { color: #94A3B8; font-weight: 700; }

/* Gauge */
.gauge-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; }
.gauge { padding: 16px; background: #F8FAFC; border-radius: 14px; border: 1px solid #E2E8F0; }
.gauge-head { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 13px; font-weight: 600; color: #475569; }
.gauge-val { font-size: 18px; font-weight: 800; }
.gauge-track { height: 10px; background: #E2E8F0; border-radius: 5px; overflow: hidden; }
.gauge-fill { height: 100%; border-radius: 5px; transition: width 0.6s; }
.gauge-fill.green { background: linear-gradient(90deg, #2E7D32, #66BB6A); } .gauge-fill.blue { background: linear-gradient(90deg, #1565C0, #42A5F5); }
.gauge-foot { display: flex; justify-content: space-between; margin-top: 8px; font-size: 11px; color: #94A3B8; font-weight: 600; }

/* Fin Cards */
.fc-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.fc { display: flex; align-items: center; gap: 10px; padding: 14px; border-radius: 12px; border: 1px solid #E2E8F0; background: #FAFCFF; }
.fc-l { display: block; font-size: 11px; color: #94A3B8; font-weight: 600; }
.fc-v { display: block; font-size: 15px; font-weight: 800; }

/* Production KPIs */
.prod-kpis { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 10px; margin-bottom: 20px; }
.pk { padding: 14px; background: #F8FAFC; border-radius: 10px; border: 1px solid #E2E8F0; text-align: center; }
.pk.hl-pk { border-color: #A5D6A7; background: #F1F8E9; }
.pk-val { display: block; font-size: 17px; font-weight: 800; color: #1E293B; }
.pk-lbl { display: block; font-size: 10px; font-weight: 600; color: #64748B; margin-top: 2px; }
.pk-sub { display: block; font-size: 9px; color: #94A3B8; }

/* Metrics Row */
.metrics-row { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 10px; margin-bottom: 20px; }
.metric { padding: 12px; background: #F8FAFC; border-radius: 10px; border: 1px solid #E2E8F0; text-align: center; }
.m-val { display: block; font-size: 17px; font-weight: 800; color: #1E293B; }
.m-lbl { display: block; font-size: 10px; font-weight: 600; color: #64748B; margin-top: 2px; }
.m-sub { display: block; font-size: 9px; color: #94A3B8; }

/* Arc */
.arc-section { display: flex; align-items: center; gap: 32px; padding: 20px; background: #F8FAFC; border-radius: 14px; margin-bottom: 20px; }
.arc-wrap { position: relative; width: 130px; height: 130px; flex-shrink: 0; }
.arc-svg { width: 100%; height: 100%; }
.arc-center { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.arc-pct { font-size: 26px; font-weight: 900; color: #1565C0; }
.arc-sub { font-size: 10px; color: #94A3B8; font-weight: 600; }
.arc-cards { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; flex: 1; }
.arc-card { padding: 12px; background: #fff; border-radius: 10px; border: 1px solid #E2E8F0; }
.ac-lbl { display: block; font-size: 10px; color: #94A3B8; font-weight: 600; text-transform: uppercase; }
.ac-val { display: block; font-size: 15px; font-weight: 800; color: #1E293B; margin-top: 2px; }

/* Charts */
.chart-box { margin-top: 20px; }
.ch { font-size: 13px; font-weight: 700; color: #475569; margin-bottom: 12px; }
.bar-chart { display: flex; align-items: flex-end; gap: 6px; height: 170px; }
.bc { flex: 1; display: flex; flex-direction: column; align-items: center; height: 100%; }
.bc-tip { font-size: 9px; font-weight: 700; color: #64748B; margin-bottom: 3px; opacity: 0; transition: opacity 0.2s; white-space: nowrap; }
.bc:hover .bc-tip { opacity: 1; }
.bc-track { flex: 1; width: 100%; max-width: 34px; background: #F1F5F9; border-radius: 6px 6px 0 0; display: flex; align-items: flex-end; overflow: hidden; }
.bc-fill { width: 100%; border-radius: 6px 6px 0 0; transition: height 0.5s; min-height: 3px; }
.grad-blue { background: linear-gradient(180deg, #1565C0, #90CAF9); }
.grad-green { background: linear-gradient(180deg, #2E7D32, #A5D6A7); }
.bc-lbl { font-size: 10px; font-weight: 600; color: #94A3B8; margin-top: 5px; }

/* Payment Modes */
.mode-section { margin-bottom: 20px; }
.mode-list { display: flex; flex-direction: column; gap: 14px; }
.mode-item { display: flex; align-items: center; gap: 14px; }
.mode-ico { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.mode-ico.m-cash { background: linear-gradient(135deg, #2E7D32, #66BB6A); }
.mode-ico.m-cheque { background: linear-gradient(135deg, #1565C0, #42A5F5); }
.mode-ico.m-bank { background: linear-gradient(135deg, #F57C00, #FFB74D); }
.mode-body { flex: 1; }
.mode-top { display: flex; justify-content: space-between; margin-bottom: 6px; }
.mode-name { font-size: 14px; font-weight: 700; color: #1E293B; text-transform: capitalize; }
.mode-amt { font-size: 14px; font-weight: 800; color: #1E293B; }
.mode-bar-t { height: 8px; background: #F1F5F9; border-radius: 4px; overflow: hidden; margin-bottom: 4px; }
.mode-bar-f { height: 100%; border-radius: 4px; transition: width 0.5s; }
.mode-bar-f.m-cash { background: linear-gradient(90deg, #2E7D32, #66BB6A); }
.mode-bar-f.m-cheque { background: linear-gradient(90deg, #1565C0, #42A5F5); }
.mode-bar-f.m-bank { background: linear-gradient(90deg, #F57C00, #FFB74D); }
.mode-bot { display: flex; justify-content: space-between; font-size: 11px; color: #94A3B8; font-weight: 600; }

/* Quality */
.quality-kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 16px; }
.qk { padding: 14px; border-radius: 10px; border: 1px solid #E2E8F0; background: #F8FAFC; text-align: center; }
.qk-val { display: block; font-size: 16px; font-weight: 800; color: #1E293B; }
.qk-lbl { display: block; font-size: 10px; font-weight: 600; color: #64748B; margin-top: 2px; }
.quality-gauge { padding: 14px; background: #F8FAFC; border-radius: 12px; margin-bottom: 16px; }
.qg-head { display: flex; justify-content: space-between; font-size: 12px; font-weight: 700; color: #475569; margin-bottom: 8px; }
.qg-pct { font-size: 16px; font-weight: 800; }
.qg-track { height: 10px; background: #E2E8F0; border-radius: 5px; overflow: hidden; }
.qg-fill { height: 100%; border-radius: 5px; transition: width 0.5s; }
.qg-fill.good { background: linear-gradient(90deg, #2E7D32, #66BB6A); }
.qg-fill.mid { background: linear-gradient(90deg, #E65100, #FFA726); }
.rej-stats { display: flex; flex-direction: column; gap: 10px; }
.rs { display: flex; align-items: center; gap: 10px; padding: 10px 14px; border-radius: 10px; border: 1px solid #E2E8F0; }
.rs-l { flex: 1; font-size: 12px; font-weight: 600; color: #64748B; }
.rs-v { font-size: 13px; font-weight: 800; color: #1E293B; }
.rs-v small { font-weight: 600; color: #94A3B8; }
.rej-company-list { display: flex; flex-direction: column; gap: 8px; }
.rc-row { display: flex; align-items: center; gap: 10px; }
.rc-name { font-size: 11px; font-weight: 700; color: #1E293B; min-width: 100px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.rc-bar-t { flex: 1; height: 6px; background: #FFEBEE; border-radius: 3px; overflow: hidden; }
.rc-bar-f { height: 100%; border-radius: 3px; background: linear-gradient(90deg, #C62828, #EF5350); }
.rc-val { font-size: 11px; font-weight: 800; color: #C62828; white-space: nowrap; }

/* Yarn */
.yarn-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 16px; }
.yarn-card { padding: 16px; border-radius: 12px; border: 1px solid #E2E8F0; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 6px; }
.yarn-card.green-b { background: #F1F8E9; border-color: #C5E1A5; } .yarn-card.orange-b { background: #FFF3E0; border-color: #FFCC80; }
.yarn-card.blue-b { background: #E3F2FD; border-color: #90CAF9; } .yarn-card.purple-b { background: #F3E5F5; border-color: #CE93D8; }
.yc-val { font-size: 18px; font-weight: 800; color: #1E293B; }
.yc-lbl { font-size: 10px; color: #64748B; font-weight: 600; }
.yarn-util { padding: 14px; background: #F8FAFC; border-radius: 12px; margin-bottom: 12px; }
.yu-head { display: flex; justify-content: space-between; font-size: 12px; font-weight: 700; color: #475569; margin-bottom: 8px; }
.yu-pct { color: #1565C0; }
.yu-track { height: 8px; background: #E2E8F0; border-radius: 4px; overflow: hidden; }
.yu-fill { height: 100%; border-radius: 4px; background: linear-gradient(90deg, #00838F, #4DD0E1); transition: width 0.5s; }
.yarn-estimates { display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px; }
.ye-item { display: flex; align-items: center; gap: 10px; padding: 10px 14px; border-radius: 10px; border: 1px solid #E2E8F0; }
.ye-lbl { display: block; font-size: 11px; color: #64748B; font-weight: 600; }
.ye-val { display: block; font-size: 14px; font-weight: 800; color: #1E293B; }

/* Yarn Health */
.yarn-health { margin-bottom: 12px; }
.yh-item { display: flex; align-items: center; gap: 10px; padding: 12px 16px; border-radius: 10px; font-size: 12px; font-weight: 600; }
.yh-item.yh-good { background: #E8F5E9; color: #2E7D32; border: 1px solid #A5D6A7; }
.yh-item.yh-warn { background: #FFF3E0; color: #E65100; border: 1px solid #FFCC80; }
.yh-item.yh-critical { background: #FFEBEE; color: #C62828; border: 1px solid #EF9A9A; }

/* Yarn Breakdown */
.yarn-breakdown { margin-bottom: 12px; }
.yb-items { display: flex; flex-direction: column; gap: 8px; }
.yb-row { display: flex; align-items: center; gap: 10px; }
.yb-label { font-size: 11px; font-weight: 600; color: #64748B; min-width: 90px; }
.yb-bar-t { flex: 1; height: 8px; background: #E2E8F0; border-radius: 4px; overflow: hidden; }
.yb-bar-f { height: 100%; border-radius: 4px; transition: width 0.5s; }
.yb-bar-f.yb-used { background: linear-gradient(90deg, #E65100, #FFCC80); }
.yb-bar-f.yb-ret { background: linear-gradient(90deg, #1565C0, #90CAF9); }
.yb-bar-f.yb-stock { background: linear-gradient(90deg, #7B1FA2, #CE93D8); }
.yb-pct { font-size: 11px; font-weight: 800; color: #1E293B; min-width: 30px; text-align: right; }

/* Nool Chart */
.nool-chart { display: flex; align-items: flex-end; gap: 8px; height: 100px; }
.nc-col { flex: 1; display: flex; flex-direction: column; align-items: center; height: 100%; }
.nc-bars { flex: 1; display: flex; align-items: flex-end; gap: 2px; width: 100%; }
.nc-bar { flex: 1; border-radius: 3px 3px 0 0; min-height: 2px; transition: height 0.4s; }
.nc-bar.nc-recv { background: linear-gradient(180deg, #2E7D32, #A5D6A7); }
.nc-bar.nc-used { background: linear-gradient(180deg, #E65100, #FFCC80); }
.nc-lbl { font-size: 9px; font-weight: 600; color: #94A3B8; margin-top: 4px; }
.nc-legend { display: flex; gap: 16px; justify-content: center; margin-top: 8px; }
.nc-leg-item { display: flex; align-items: center; gap: 4px; font-size: 10px; font-weight: 600; color: #64748B; }
.nc-dot { width: 8px; height: 8px; border-radius: 2px; }
.nc-dot.nc-recv { background: #2E7D32; }
.nc-dot.nc-used { background: #E65100; }

/* Order Status */
.os-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 16px; }
.os-card { padding: 14px; border-radius: 12px; border: 1px solid #E2E8F0; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.os-card.blue-b { background: #EBF5FF; border-color: #BBDEFB; } .os-card.green-b { background: #E8F5E9; border-color: #A5D6A7; }
.os-card.purple-b { background: #F3E5F5; border-color: #CE93D8; }
.os-val { display: block; font-size: 22px; font-weight: 900; color: #1E293B; }
.os-lbl { display: block; font-size: 10px; color: #64748B; font-weight: 600; margin-top: 2px; }
.os-progress { padding: 14px; background: #F8FAFC; border-radius: 12px; }
.osp-head { display: flex; justify-content: space-between; font-size: 12px; font-weight: 700; color: #475569; }
.osp-track { height: 8px; background: #E2E8F0; border-radius: 4px; overflow: hidden; margin-top: 8px; }
.osp-fill { height: 100%; border-radius: 4px; background: linear-gradient(90deg, #7B1FA2, #CE93D8); transition: width 0.5s; }

/* Company Progress */
.cp-list { display: flex; flex-direction: column; gap: 10px; }
.cp-row { padding: 12px; border-radius: 10px; border: 1px solid #E2E8F0; background: #FAFCFF; }
.cp-top { display: flex; justify-content: space-between; margin-bottom: 6px; }
.cp-name { font-size: 13px; font-weight: 700; color: #1E293B; }
.cp-pct { font-size: 12px; font-weight: 800; }
.cp-pct.good { color: #2E7D32; } .cp-pct.mid { color: #E65100; } .cp-pct.low { color: #C62828; }
.cp-bar-t { height: 6px; background: #E2E8F0; border-radius: 3px; overflow: hidden; margin-bottom: 4px; }
.cp-bar-f { height: 100%; border-radius: 3px; transition: width 0.5s; }
.cp-bar-f.good { background: linear-gradient(90deg, #2E7D32, #66BB6A); } .cp-bar-f.mid { background: linear-gradient(90deg, #E65100, #FFA726); } .cp-bar-f.low { background: linear-gradient(90deg, #C62828, #EF5350); }
.cp-meta { display: flex; justify-content: space-between; font-size: 10px; color: #94A3B8; font-weight: 600; }

/* Top Orders */
.top-list { display: flex; flex-direction: column; gap: 8px; }
.top-row { display: flex; align-items: center; gap: 12px; padding: 10px 12px; border-radius: 10px; border: 1px solid #E2E8F0; }
.top-row:hover { background: #F8FAFC; }
.top-medal { width: 26px; height: 26px; border-radius: 50%; background: #F1F5F9; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 800; color: #64748B; flex-shrink: 0; }
.top-medal.gold { background: linear-gradient(135deg, #F57C00, #FFD54F); color: #fff; }
.top-body { flex: 1; min-width: 0; }
.top-name { display: block; font-size: 12px; font-weight: 700; color: #1E293B; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.top-bar-t { height: 5px; background: #F1F5F9; border-radius: 3px; overflow: hidden; }
.top-bar-f { height: 100%; border-radius: 3px; background: linear-gradient(90deg, #1565C0, #90CAF9); transition: width 0.4s; }
.top-val { font-size: 12px; font-weight: 800; color: #2E7D32; white-space: nowrap; }

/* Recent Payments */
.recent-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
.recent-row { display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; border-radius: 10px; border: 1px solid #E2E8F0; }
.recent-row:hover { background: #F8FAFC; }
.rr-left { display: flex; align-items: center; gap: 10px; }
.rr-icon { width: 30px; height: 30px; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.rr-icon.m-cash { background: linear-gradient(135deg, #2E7D32, #66BB6A); }
.rr-icon.m-cheque { background: linear-gradient(135deg, #1565C0, #42A5F5); }
.rr-icon.m-bank { background: linear-gradient(135deg, #F57C00, #FFB74D); }
.rr-company { display: block; font-size: 12px; font-weight: 700; color: #1E293B; }
.rr-date { display: block; font-size: 10px; color: #94A3B8; }
.rr-right { text-align: right; }
.rr-amount { display: block; font-size: 14px; font-weight: 800; }
.rr-mode { display: block; font-size: 10px; color: #94A3B8; text-transform: capitalize; }

/* Workforce */
.wf-kpis { display: grid; grid-template-columns: repeat(6, 1fr); gap: 10px; margin-bottom: 20px; }
.wfk { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 14px 10px; background: #F8FAFC; border-radius: 12px; border: 1px solid #E2E8F0; text-align: center; }
.wfk-val { font-size: 16px; font-weight: 800; color: #1E293B; }
.wfk-lbl { font-size: 10px; font-weight: 600; color: #64748B; }

/* Payroll Chart */
.payroll-chart { display: flex; align-items: flex-end; gap: 12px; height: 180px; padding: 10px 0; }
.pc-col { flex: 1; display: flex; flex-direction: column; align-items: center; height: 100%; position: relative; }
.pc-bars { flex: 1; display: flex; align-items: flex-end; gap: 4px; width: 100%; }
.pc-bar { flex: 1; border-radius: 6px 6px 0 0; min-height: 3px; transition: height 0.5s, opacity 0.2s; }
.pc-bar.pc-gross { background: linear-gradient(180deg, #E3F2FD, #BBDEFB); border: 1px solid #90CAF9; border-bottom: none; }
.pc-bar.pc-net { background: linear-gradient(180deg, #1565C0, #42A5F5); }
.pc-col:hover .pc-bar.pc-gross { background: linear-gradient(180deg, #BBDEFB, #90CAF9); }
.pc-lbl { font-size: 10px; font-weight: 700; color: #64748B; margin-top: 6px; }
.pc-val { font-size: 9px; font-weight: 800; color: #1565C0; }
.pc-tooltip { display: none; position: absolute; bottom: calc(100% + 8px); left: 50%; transform: translateX(-50%); background: #1E293B; color: #fff; padding: 10px 14px; border-radius: 10px; font-size: 11px; white-space: nowrap; z-index: 10; }
.pc-tooltip::after { content: ''; position: absolute; bottom: -5px; left: 50%; transform: translateX(-50%); border-left: 5px solid transparent; border-right: 5px solid transparent; border-top: 5px solid #1E293B; }
.pc-col:hover .pc-tooltip { display: block; }
.pct-period { font-weight: 800; margin-bottom: 4px; font-size: 12px; }
.pct-row { display: flex; align-items: center; gap: 6px; margin-top: 3px; }
.pct-dot { width: 8px; height: 8px; border-radius: 3px; }
.pct-dot.gross { background: #BBDEFB; border: 1px solid #90CAF9; }
.pct-dot.net { background: #1565C0; }
.pct-dot.ded { background: #EF5350; }
.pc-legend { display: flex; gap: 20px; justify-content: center; margin-top: 12px; }
.pc-leg { display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 600; color: #64748B; }
.pc-leg-dot { width: 10px; height: 10px; border-radius: 3px; }
.pc-leg-dot.gross { background: #BBDEFB; border: 1px solid #90CAF9; }
.pc-leg-dot.net { background: #1565C0; }
.pc-leg-dot.ded { background: #EF5350; }

/* Salary Run Cards */
.salary-runs { margin-top: 20px; }
.sr-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.sr-card { padding: 16px; border-radius: 14px; border: 1px solid #E2E8F0; background: #FAFCFF; transition: all 0.2s; }
.sr-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.06); transform: translateY(-2px); }
.sr-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.sr-period { font-size: 13px; font-weight: 800; color: #1E293B; }
.sr-emp { font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 8px; background: #EBF5FF; color: #1565C0; }
.sr-amount { font-size: 20px; font-weight: 900; color: #2E7D32; margin-bottom: 10px; }
.sr-breakdown { display: flex; flex-direction: column; gap: 4px; padding: 10px; background: #F8FAFC; border-radius: 8px; margin-bottom: 8px; }
.sr-row { display: flex; justify-content: space-between; font-size: 11px; font-weight: 600; color: #475569; }
.sr-avg { font-size: 10px; font-weight: 700; color: #64748B; text-align: right; }

/* Employee Grid */
.emp-grid { display: flex; flex-direction: column; gap: 8px; }
.emp-row { display: flex; align-items: center; gap: 12px; padding: 8px 12px; border-radius: 8px; border: 1px solid #F1F5F9; }
.emp-name { font-size: 12px; font-weight: 700; color: #1E293B; min-width: 120px; }
.emp-bar-t { flex: 1; height: 6px; background: #F1F5F9; border-radius: 3px; overflow: hidden; }
.emp-bar-f { height: 100%; border-radius: 3px; background: linear-gradient(90deg, #00838F, #4DD0E1); transition: width 0.4s; }
.emp-wage { font-size: 12px; font-weight: 800; color: #00838F; white-space: nowrap; }

/* Health */
.health-p { background: linear-gradient(180deg, #fff, #F8FAFC); margin-bottom: 24px; }
.hc-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
.hc { padding: 20px; border-radius: 14px; border: 1px solid #E2E8F0; background: #fff; text-align: center; transition: all 0.2s; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.hc:hover { box-shadow: 0 8px 20px rgba(0,0,0,0.06); transform: translateY(-2px); }
.hc-ico { width: 42px; height: 42px; border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 10px; }
.hc-ico.good { background: linear-gradient(135deg, #2E7D32, #66BB6A); }
.hc-ico.mid { background: linear-gradient(135deg, #E65100, #FFA726); }
.hc-ico.low { background: linear-gradient(135deg, #C62828, #EF5350); }
.hc-val { display: block; font-size: 24px; font-weight: 900; color: #1E293B; margin-bottom: 2px; }
.hc-lbl { display: block; font-size: 12px; font-weight: 600; color: #64748B; margin-bottom: 10px; }
.hc-bar-t { width: 100%; height: 6px; background: #E2E8F0; border-radius: 3px; overflow: hidden; margin-bottom: 8px; }
.hc-bar-f { height: 100%; border-radius: 3px; transition: width 0.6s; }
.hc-bar-f.good { background: linear-gradient(90deg, #2E7D32, #66BB6A); } .hc-bar-f.mid { background: linear-gradient(90deg, #E65100, #FFA726); } .hc-bar-f.low { background: linear-gradient(90deg, #C62828, #EF5350); }
.hc-hint { font-size: 10px; color: #94A3B8; font-weight: 600; }

/* Data Table */
.table-wrap { overflow-x: auto; border: 1px solid #E2E8F0; border-radius: 12px; }
.data-table { width: 100%; min-width: 700px; border-collapse: collapse; font-size: 12px; }
.data-table th { padding: 10px 12px; font-size: 10px; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 0.4px; background: #F8FAFC; border-bottom: 2px solid #E2E8F0; text-align: left; white-space: nowrap; }
.data-table td { padding: 10px 12px; border-bottom: 1px solid #F1F5F9; color: #1E293B; }
.data-table tbody tr:hover { background: #F8FAFC; }
.data-table tfoot td { background: #F8FAFC; border-top: 2px solid #E2E8F0; font-weight: 700; }
.data-table .r { text-align: right; }
.data-table .fw { font-weight: 700; }
.pct-badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: 800; }
.pct-badge.good { background: #E8F5E9; color: #2E7D32; } .pct-badge.mid { background: #FFF3E0; color: #E65100; } .pct-badge.low { background: #FFEBEE; color: #C62828; }
.status-chip { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: 700; }
.status-chip.active { background: #EBF5FF; color: #1565C0; } .status-chip.completed { background: #E8F5E9; color: #2E7D32; }
.show-more { text-align: center; padding: 8px 0; }

/* Accepted vs Rejected Bar */
.avr-section { margin-top: 16px; }
.avr-bar { display: flex; height: 14px; border-radius: 7px; overflow: hidden; margin-bottom: 8px; }
.avr-accepted { background: linear-gradient(90deg, #2E7D32, #66BB6A); transition: width 0.5s; }
.avr-rejected { background: linear-gradient(90deg, #C62828, #EF5350); transition: width 0.5s; min-width: 2px; }
.avr-legend { display: flex; gap: 16px; }
.avr-leg { display: flex; align-items: center; gap: 4px; font-size: 10px; font-weight: 700; color: #64748B; }
.avr-dot { width: 8px; height: 8px; border-radius: 50%; }
.avr-dot.good { background: #2E7D32; }
.avr-dot.bad { background: #C62828; }

.qr-item { display: flex; align-items: center; gap: 10px; padding: 12px 16px; border-radius: 10px; font-size: 12px; font-weight: 600; }
.qr-item.qr-good { background: #E8F5E9; color: #2E7D32; border: 1px solid #A5D6A7; }
.qr-item.qr-ok { background: #FFF3E0; color: #E65100; border: 1px solid #FFCC80; }
.qr-item.qr-bad { background: #FFEBEE; color: #C62828; border: 1px solid #EF9A9A; }

/* Revenue Grid */
.rev-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.rev-item { padding: 12px; border-radius: 10px; border: 1px solid #E2E8F0; background: #F8FAFC; }
.rev-lbl { display: block; font-size: 10px; font-weight: 600; color: #64748B; }
.rev-val { display: block; font-size: 15px; font-weight: 800; color: #1E293B; margin-top: 2px; }

/* Cash Flow Bars */
.cf-bars { display: flex; flex-direction: column; gap: 10px; }
.cf-row { display: flex; align-items: center; gap: 10px; }
.cf-l { font-size: 11px; font-weight: 600; color: #64748B; min-width: 130px; }
.cf-track { flex: 1; height: 8px; background: #E2E8F0; border-radius: 4px; overflow: hidden; }
.cf-fill { height: 100%; border-radius: 4px; transition: width 0.5s; }
.cf-fill.good { background: linear-gradient(90deg, #2E7D32, #66BB6A); }
.cf-fill.blue { background: linear-gradient(90deg, #1565C0, #42A5F5); }
.cf-fill.purple { background: linear-gradient(90deg, #7B1FA2, #CE93D8); }
.cf-fill.indigo { background: linear-gradient(90deg, #283593, #5C6BC0); }
.cf-v { font-size: 11px; font-weight: 800; color: #1E293B; min-width: 36px; text-align: right; }

/* Utilities */
.blue-t { color: #1565C0; } .green-t { color: #2E7D32; } .red-t { color: #C62828; }
.orange-t { color: #E65100; } .indigo-t { color: #283593; }

/* Today Strip */
.today-strip { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 24px; }
.today-item { display: flex; align-items: center; gap: 12px; padding: 16px; background: #fff; border-radius: 14px; border: 1px solid #E2E8F0; position: relative; overflow: hidden; }
.today-item::before { content:''; position: absolute; top: 0; left: 0; width: 4px; height: 100%; }
.today-item:nth-child(1)::before { background: #1565C0; }
.today-item:nth-child(2)::before { background: #2E7D32; }
.today-item:nth-child(3)::before { background: #7B1FA2; }
.today-item:nth-child(4)::before { background: #00838F; }
.today-icon { width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.today-icon.blue { background: linear-gradient(135deg, #1565C0, #42A5F5); }
.today-icon.green { background: linear-gradient(135deg, #2E7D32, #66BB6A); }
.today-icon.purple { background: linear-gradient(135deg, #7B1FA2, #AB47BC); }
.today-icon.teal { background: linear-gradient(135deg, #00838F, #4DD0E1); }
.today-val { display: block; font-size: 17px; font-weight: 800; color: #1E293B; }
.today-lbl { display: block; font-size: 10px; font-weight: 600; color: #64748B; }
.today-count { font-size: 10px; font-weight: 700; color: #94A3B8; margin-left: auto; background: #F1F5F9; padding: 3px 8px; border-radius: 8px; }

/* Insights */
.insights-panel { background: linear-gradient(180deg, #FFFBEB, #fff); border-color: #FDE68A; }
.insights-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
.insight-card { border-radius: 12px; border: 1px solid #E2E8F0; overflow: hidden; transition: all 0.2s; }
.insight-card.insight-critical { background: #FEF2F2; border-color: #FECACA; }
.insight-card.insight-warning { background: #FFFBEB; border-color: #FDE68A; }
.insight-card.insight-success { background: #F0FDF4; border-color: #BBF7D0; }
.insight-main { display: flex; align-items: center; gap: 12px; padding: 14px 16px; }
.insight-main.clickable { cursor: pointer; }
.insight-main.clickable:hover { opacity: 0.85; }
.insight-icon-wrap { width: 34px; height: 34px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.insight-icon-wrap.critical { background: linear-gradient(135deg, #DC2626, #EF4444); }
.insight-icon-wrap.warning { background: linear-gradient(135deg, #D97706, #F59E0B); }
.insight-icon-wrap.success { background: linear-gradient(135deg, #059669, #34D399); }
.insight-body { flex: 1; min-width: 0; }
.insight-text { display: block; font-size: 12px; font-weight: 700; color: #1E293B; }
.insight-cat { display: inline-block; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #94A3B8; margin-top: 2px; padding: 1px 6px; background: rgba(0,0,0,0.04); border-radius: 4px; }
.rotate-icon { transform: rotate(180deg); transition: transform 0.2s; }
.insight-details { padding: 0 16px 14px; border-top: 1px solid rgba(0,0,0,0.06); margin-top: 0; }
.insight-detail-row { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border-radius: 8px; margin-top: 6px; background: rgba(255,255,255,0.7); border: 1px solid rgba(0,0,0,0.04); }
.idr-name { font-size: 11px; font-weight: 700; color: #1E293B; min-width: 90px; }
.idr-val { font-size: 11px; font-weight: 800; color: #475569; }
.idr-sub { font-size: 10px; color: #94A3B8; margin-left: auto; font-weight: 600; }
.slide-enter-active, .slide-leave-active { transition: all 0.25s ease; overflow: hidden; }
.slide-enter-from, .slide-leave-to { max-height: 0; opacity: 0; padding-top: 0; padding-bottom: 0; }
.slide-enter-to, .slide-leave-from { max-height: 400px; opacity: 1; }

/* Profitability */
.profit-flow { display: flex; align-items: center; justify-content: center; gap: 14px; padding: 20px; background: #F8FAFC; border-radius: 16px; margin-bottom: 20px; flex-wrap: wrap; }
.pf-item { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 16px 24px; background: #fff; border-radius: 14px; border: 1px solid #E2E8F0; min-width: 140px; text-align: center; }
.pf-item.positive { border-color: #93C5FD; background: #EFF6FF; }
.pf-item.negative { border-color: #FCA5A5; background: #FEF2F2; }
.pf-icon { width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; }
.pf-icon.green { background: linear-gradient(135deg, #2E7D32, #66BB6A); }
.pf-icon.orange { background: linear-gradient(135deg, #E65100, #FFA726); }
.pf-icon.blue { background: linear-gradient(135deg, #1565C0, #42A5F5); }
.pf-icon.red { background: linear-gradient(135deg, #C62828, #EF5350); }
.pf-label { font-size: 10px; font-weight: 700; color: #64748B; text-transform: uppercase; }
.pf-val { font-size: 18px; font-weight: 900; }
.pf-arrow { font-size: 22px; font-weight: 800; color: #94A3B8; }
.profit-kpis { display: grid; grid-template-columns: repeat(6, 1fr); gap: 10px; margin-bottom: 20px; }
.pk-card { padding: 14px; background: #F8FAFC; border-radius: 10px; border: 1px solid #E2E8F0; text-align: center; }
.pk-card-val { display: block; font-size: 16px; font-weight: 800; color: #1E293B; }
.pk-card-lbl { display: block; font-size: 10px; font-weight: 600; color: #64748B; margin-top: 2px; }
.profit-gauge { padding: 14px; background: #F8FAFC; border-radius: 12px; }
.pg-head { display: flex; justify-content: space-between; font-size: 12px; font-weight: 700; color: #475569; margin-bottom: 8px; }
.pg-track { height: 10px; background: #E2E8F0; border-radius: 5px; overflow: hidden; position: relative; }
.pg-fill { height: 100%; border-radius: 5px; transition: width 0.5s; }
.pg-fill.good { background: linear-gradient(90deg, #2E7D32, #66BB6A); }
.pg-fill.mid { background: linear-gradient(90deg, #E65100, #FFA726); }
.pg-fill.high { background: linear-gradient(90deg, #C62828, #EF5350); }
.pg-markers { display: flex; justify-content: space-between; margin-top: 6px; font-size: 10px; color: #94A3B8; font-weight: 600; }
.pg-ideal { color: #2E7D32; font-weight: 700; }

/* Payment Aging */
.aging-list { display: flex; flex-direction: column; gap: 8px; }
.aging-row { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-radius: 10px; border: 1px solid #E2E8F0; transition: all 0.2s; }
.aging-row:hover { transform: translateX(2px); }
.aging-row.overdue { border-left: 3px solid #EF4444; background: #FEF2F2; }
.aging-row.warning { border-left: 3px solid #F59E0B; background: #FFFBEB; }
.aging-row.ok { border-left: 3px solid #10B981; }
.aging-left { display: flex; align-items: center; gap: 10px; }
.aging-badge { font-size: 11px; font-weight: 900; padding: 4px 8px; border-radius: 8px; min-width: 38px; text-align: center; }
.aging-badge.overdue { background: #FEE2E2; color: #DC2626; }
.aging-badge.warning { background: #FEF3C7; color: #D97706; }
.aging-badge.ok { background: #D1FAE5; color: #059669; }
.aging-name { display: block; font-size: 12px; font-weight: 700; color: #1E293B; }
.aging-date { display: block; font-size: 10px; color: #94A3B8; }
.aging-right { text-align: right; }
.aging-pending { display: block; font-size: 14px; font-weight: 800; }
.aging-sub { font-size: 9px; color: #94A3B8; font-weight: 600; }

/* Month-over-Month */
.mom-table { border: 1px solid #E2E8F0; border-radius: 12px; overflow: hidden; }
.mom-header { display: grid; grid-template-columns: 1.5fr 1fr 1fr 0.8fr; padding: 10px 16px; background: #F8FAFC; border-bottom: 2px solid #E2E8F0; }
.mom-metric-h, .mom-val-h { font-size: 10px; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 0.4px; }
.mom-row { display: grid; grid-template-columns: 1.5fr 1fr 1fr 0.8fr; padding: 12px 16px; border-bottom: 1px solid #F1F5F9; align-items: center; }
.mom-row:last-child { border-bottom: none; }
.mom-row.mom-highlight { background: #F0FDF4; border-top: 2px solid #BBF7D0; }
.mom-metric { font-size: 12px; font-weight: 700; color: #1E293B; display: flex; align-items: center; gap: 6px; }
.mom-val { font-size: 12px; font-weight: 700; color: #475569; }
.mom-val.fw { font-weight: 800; color: #1E293B; }
.mom-change { font-size: 11px; font-weight: 800; display: flex; align-items: center; gap: 2px; padding: 2px 8px; border-radius: 8px; width: fit-content; }
.mom-change.pos { background: #D1FAE5; color: #059669; }
.mom-change.neg { background: #FEE2E2; color: #DC2626; }
.mom-change.neutral { background: #F1F5F9; color: #94A3B8; }
.mom-summary { display: flex; flex-direction: column; gap: 8px; margin-top: 16px; }
.mom-sum-item { display: flex; align-items: center; gap: 8px; padding: 10px 14px; border-radius: 10px; font-size: 11px; font-weight: 600; }
.mom-sum-item.good { background: #F0FDF4; color: #166534; border: 1px solid #BBF7D0; }
.mom-sum-item.bad { background: #FEF2F2; color: #991B1B; border: 1px solid #FECACA; }

/* Responsive */
@media (max-width: 1280px) {
  .kpi-grid { grid-template-columns: repeat(3, 1fr); }
  .hc-grid { grid-template-columns: repeat(2, 1fr); }
  .wf-kpis { grid-template-columns: repeat(3, 1fr); }
  .sr-grid { grid-template-columns: repeat(3, 1fr); }
  .today-strip { grid-template-columns: repeat(2, 1fr); }
  .profit-kpis { grid-template-columns: repeat(3, 1fr); }
  .insights-grid { grid-template-columns: 1fr; }
}

@media (max-width: 1024px) {
  .dual { grid-template-columns: 1fr; }
  .gauge-row { grid-template-columns: 1fr; }
  .fc-grid { grid-template-columns: repeat(2, 1fr); }
  .arc-section { flex-direction: column; align-items: center; }
  .os-grid { grid-template-columns: repeat(2, 1fr); }
  .yarn-grid { grid-template-columns: repeat(2, 1fr); }
  .quality-kpis { grid-template-columns: repeat(2, 1fr); }
  .recent-grid { grid-template-columns: 1fr; }
  .wf-kpis { grid-template-columns: repeat(2, 1fr); }
  .sr-grid { grid-template-columns: repeat(2, 1fr); }
  .payroll-chart { gap: 8px; }
}

@media (max-width: 768px) {
  .ap { padding: 12px; }
  .today-strip { grid-template-columns: 1fr 1fr; gap: 10px; }
  .today-item { padding: 12px; gap: 8px; }
  .today-val { font-size: 14px; }
  .profit-flow { flex-direction: column; gap: 8px; }
  .pf-item { min-width: unset; width: 100%; flex-direction: row; padding: 12px 16px; }
  .pf-arrow { transform: rotate(90deg); }
  .profit-kpis { grid-template-columns: repeat(2, 1fr); }
  .mom-header, .mom-row { grid-template-columns: 1.2fr 1fr 1fr 0.7fr; padding: 8px 10px; }
  .mom-metric { font-size: 11px; }
  .mom-val { font-size: 11px; }
  .aging-row { flex-direction: column; align-items: stretch; gap: 8px; }
  .aging-right { text-align: left; display: flex; align-items: center; gap: 6px; }
  .kpi-grid { grid-template-columns: 1fr 1fr; gap: 10px; }
  .hc-grid { grid-template-columns: 1fr; }
  .fc-grid { grid-template-columns: 1fr; }
  .metrics-row { grid-template-columns: 1fr 1fr; }
  .hero { padding: 20px; border-radius: 14px; }
  .hero-content { flex-direction: column; align-items: flex-start; }
  .hero-title { font-size: 20px; }
  .hero-sub { font-size: 12px; }
  .hero-right { width: 100%; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
  .hero-stat { padding: 0 10px; border-right: none; }
  .hero-stat:not(:last-of-type) { border-right: 1px solid rgba(255,255,255,0.15); }
  .hs-val { font-size: 20px; }
  .pl-flow { flex-direction: column; align-items: stretch; gap: 8px; }
  .pl-arr { text-align: center; font-size: 18px; }
  .pl-item { justify-content: space-between; }
  .yarn-grid { grid-template-columns: 1fr 1fr; }
  .os-grid { grid-template-columns: 1fr 1fr; }
  .wf-kpis { grid-template-columns: repeat(2, 1fr); }
  .sr-grid { grid-template-columns: 1fr; }
  .dc-summary { flex-wrap: wrap; gap: 10px; }
  .dc-stat { flex: unset; width: calc(50% - 5px); }
  .panel { padding: 16px; border-radius: 14px; }
  .pt { font-size: 15px; }
  .bar-chart { height: 130px; gap: 4px; }
  .bc-tip { font-size: 8px; }
  .payroll-chart { height: 140px; gap: 6px; overflow-x: auto; min-width: 0; }
  .pc-col { min-width: 40px; }
  .pc-tooltip { display: none !important; }
  .arc-section { gap: 16px; padding: 14px; }
  .arc-wrap { width: 100px; height: 100px; }
  .arc-pct { font-size: 20px; }
  .gauge-row { grid-template-columns: 1fr; }
  .recent-grid { grid-template-columns: 1fr; }
  .quality-kpis { grid-template-columns: 1fr 1fr; }
  .rev-grid { grid-template-columns: 1fr; }
  .cf-l { min-width: 100px; font-size: 10px; }
  .cf-row { gap: 6px; }
  .emp-name { min-width: 80px; font-size: 11px; }
  .emp-wage { font-size: 11px; }
  .mode-item { gap: 10px; }
  .mode-ico { width: 34px; height: 34px; }
  .mode-name { font-size: 12px; }
  .mode-amt { font-size: 13px; }
  .top-row { padding: 8px 10px; gap: 8px; }
  .top-name { font-size: 11px; }
  .top-val { font-size: 11px; }
  .cp-row { padding: 10px; }
  .data-table { min-width: 600px; }
  .table-wrap { margin: 0 -16px; border-radius: 0; border-left: none; border-right: none; }
  .nool-chart { gap: 4px; height: 80px; }
}

@media (max-width: 480px) {
  .ap { padding: 6px; }
  .today-strip { grid-template-columns: 1fr; }
  .insights-grid { grid-template-columns: 1fr; }
  .profit-kpis { grid-template-columns: 1fr 1fr; }
  .mom-header, .mom-row { grid-template-columns: 1fr 0.8fr 0.8fr 0.6fr; padding: 6px 8px; }
  .mom-metric { font-size: 10px; gap: 4px; }
  .mom-val { font-size: 10px; }
  .mom-change { font-size: 9px; padding: 2px 5px; }
  .kpi-grid { grid-template-columns: 1fr; gap: 10px; }
  .kpi { padding: 14px; }
  .kpi-val { font-size: 16px; }
  .kpi-icon { width: 32px; height: 32px; }
  .hero { padding: 14px; border-radius: 12px; margin-bottom: 16px; }
  .hero-left { gap: 10px; }
  .hero-title { font-size: 17px; }
  .hero-sub { font-size: 11px; }
  .hero-icon { width: 40px; height: 40px; }
  .hero-right { gap: 8px; }
  .hero-stat { padding: 0 8px; }
  .hs-val { font-size: 16px; }
  .hs-lbl { font-size: 9px; }
  .prod-kpis { grid-template-columns: 1fr 1fr; gap: 8px; }
  .pk { padding: 10px; }
  .pk-val { font-size: 14px; }
  .metrics-row { grid-template-columns: 1fr; }
  .yarn-grid { grid-template-columns: 1fr; }
  .os-grid { grid-template-columns: 1fr 1fr; }
  .wf-kpis { grid-template-columns: 1fr; }
  .wfk { padding: 12px 8px; }
  .wfk-val { font-size: 14px; }
  .panel { padding: 12px; border-radius: 12px; margin-bottom: 14px; }
  .ph { margin-bottom: 14px; gap: 8px; }
  .pi { width: 32px; height: 32px; }
  .pt { font-size: 14px; }
  .ps { font-size: 11px; }
  .pb { font-size: 10px; padding: 3px 8px; }
  .fc { padding: 10px; gap: 8px; }
  .fc-v { font-size: 13px; }
  .fc-l { font-size: 10px; }
  .gauge { padding: 12px; }
  .gauge-head { font-size: 11px; }
  .gauge-val { font-size: 15px; }
  .gauge-foot { font-size: 10px; }
  .hc { padding: 14px; }
  .hc-val { font-size: 20px; }
  .hc-ico { width: 36px; height: 36px; }
  .bar-chart { height: 110px; }
  .bc-lbl { font-size: 8px; }
  .payroll-chart { height: 120px; }
  .pc-lbl { font-size: 8px; }
  .pc-val { font-size: 8px; }
  .sr-card { padding: 12px; }
  .sr-amount { font-size: 16px; }
  .sr-period { font-size: 12px; }
  .arc-cards { gap: 8px; }
  .arc-card { padding: 8px; }
  .ac-val { font-size: 13px; }
  .cf-l { min-width: 80px; font-size: 9px; }
  .cf-v { font-size: 10px; }
  .recent-row { padding: 8px 10px; }
  .rr-company { font-size: 11px; }
  .rr-amount { font-size: 12px; }
  .quality-kpis { grid-template-columns: 1fr 1fr; gap: 8px; }
  .qk { padding: 10px; }
  .qk-val { font-size: 14px; }
  .emp-row { padding: 6px 8px; gap: 8px; }
  .emp-name { min-width: 60px; }
  .rc-name { min-width: 70px; font-size: 10px; }
  .rc-val { font-size: 10px; }
  .nool-chart { height: 60px; }
}
</style>
