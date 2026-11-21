<template>
  <div v-if="orderNotFound" class="page-container not-found-page">
    <div class="not-found-card">
      <div class="not-found-illustration">
        <div class="not-found-circle">
          <div class="not-found-icon-wrap">
            <v-icon size="48" color="#94A3B8">mdi-package-variant-remove</v-icon>
          </div>
        </div>
        <div class="not-found-dots">
          <span></span><span></span><span></span>
        </div>
      </div>
      <div class="not-found-content">
        <h1 class="not-found-title">{{ t('odNotFoundTitle') }}</h1>
        <p class="not-found-desc">{{ t('odNotFoundDesc') }}</p>
        <div class="not-found-hints">
          <div class="not-found-hint">
            <v-icon size="14" color="#64748B">mdi-information-outline</v-icon>
            <span>{{ t('odHintRecent') }}</span>
          </div>
          <div class="not-found-hint">
            <v-icon size="14" color="#64748B">mdi-link-variant-off</v-icon>
            <span>{{ t('odHintLink') }}</span>
          </div>
        </div>
      </div>
      <div class="not-found-actions">
        <v-btn color="primary" variant="flat" rounded="lg" size="large" prepend-icon="mdi-arrow-left" @click="router.push('/orders')">
          {{ t('odBackToOrders') }}
        </v-btn>
        <v-btn variant="tonal" color="primary" rounded="lg" size="large" prepend-icon="mdi-view-dashboard" @click="router.push('/dashboard')">
          {{ t('odDashboard') }}
        </v-btn>
      </div>
    </div>
  </div>
  <div v-else-if="orderLoading" class="page-container d-flex justify-center align-center" style="min-height:400px">
    <div class="loading-state">
      <v-progress-circular indeterminate color="primary" size="44" width="3" />
      <span class="loading-text">{{ t('odLoadingOrder') }}</span>
    </div>
  </div>
  <div class="page-container od-page" v-else-if="order" :style="topThemeVars" @pointermove="onFx">
    <v-overlay :model-value="avgWeightSaving" persistent class="d-flex flex-column align-center justify-center" z-index="9999">
      <v-progress-circular indeterminate color="primary" size="64" />
      <div class="mt-3" style="color:#1A2744;font-weight:700">{{ t('odSavingAvgWeight') }}</div>
    </v-overlay>
    <div class="od-header mb-4">
      <span class="od-aurora" aria-hidden="true"></span>
      <span v-for="n in 10" :key="n" class="od-fleck" :style="{ '--n': n }" aria-hidden="true"></span>
      <img class="od-header-art" src="/art/orders-art.svg" alt="" aria-hidden="true" />
      <div class="od-header-left">
        <v-btn icon="mdi-arrow-left" variant="text" @click="goBack" />
        <button v-if="canShowSampleImage" type="button" class="od-swatch" v-tilt :aria-label="order.orderName" @click="openImagePreview(sampleImageSrc)">
          <img :src="sampleImageSrc" alt="" @error="onSampleImageError" />
        </button>
        <div v-else class="od-title-icon">
          <v-icon size="26">mdi-package-variant</v-icon>
        </div>
        <div class="od-title-wrap">
          <div class="od-title-row">
            <h1 class="od-title">{{ order.orderName }}</h1>
            <span :class="order.status === 'completed' ? 'status-badge done' : 'status-badge active'">
              <v-icon size="14" class="mr-1">{{ order.status === 'completed' ? 'mdi-check-decagram' : 'mdi-progress-clock' }}</v-icon>
              {{ order.status === 'completed' ? t('completed') : t('active') }}
            </span>
          </div>
          <div class="od-company">
            <v-icon size="14" color="#64748B">mdi-domain</v-icon>
            {{ t('company') }}: <strong>{{ order.company?.name }}</strong>
          </div>
        </div>
      </div>
      <div class="od-header-actions">
        <div class="od-palette" role="radiogroup" aria-label="Header colour">
          <button v-for="(th, key) in topThemes" :key="key" type="button" role="radio" class="od-palette-dot" :class="{ active: topTheme === key }" :aria-checked="topTheme === key" :aria-label="th.name" :title="th.name" :style="{ background: `linear-gradient(135deg, ${th.c1} 0 50%, ${th.c2} 50% 100%)` }" @click="topTheme = key" />
        </div>
        <v-btn v-magnetic variant="tonal" color="primary" rounded="lg" prepend-icon="mdi-content-copy" @click="openRepeatOrderDialog">{{ t('odRepeatOrder') }}</v-btn>
        <v-btn v-magnetic v-if="!order.productionClosed && order.orderStatus !== 'closed'" color="primary" variant="flat" rounded="lg" :loading="completingOrder" :disabled="!hasProductionHistory" @click="openCompleteOrderDialog">{{ t('odMarkProdComplete') }}</v-btn>
        <v-btn v-magnetic v-if="order.productionClosed && order.orderStatus !== 'closed'" color="success" variant="flat" rounded="lg" :loading="closingOrder" @click="openCloseOrderDialog">{{ t('odCloseOrder') }}</v-btn>
        <v-btn v-magnetic v-if="order.orderStatus === 'closed' && !order.archived" color="info" variant="flat" rounded="lg" :loading="archivingOrder" @click="openArchiveDialog" prepend-icon="mdi-archive-arrow-down-outline">{{ t('archBtn') }}</v-btn>
        <v-btn v-magnetic v-if="order.orderStatus === 'closed' && !order.archived && isAdmin" color="warning" variant="flat" rounded="lg" :loading="reopeningOrder" @click="reopenOrder" prepend-icon="mdi-lock-open-variant">{{ t('odReopen') }}</v-btn>
      </div>
    </div>

    <div class="od-ticker mb-4" aria-hidden="true">
      <div class="od-ticker-track">
        <span v-for="(item, i) in tickerLoop" :key="i" class="od-ticker-item"><v-icon size="14">{{ item.icon }}</v-icon>{{ item.text }}</span>
      </div>
    </div>

    <div class="od-info-strip mb-4">
      <div class="od-info-cell">
        <span class="od-info-icon tone-blue"><v-icon size="18">mdi-calendar-blank-outline</v-icon></span>
        <div class="min-w-0">
          <div class="od-info-label">{{ t('startDate') }}</div>
          <div class="od-info-value">{{ order.startDate ? fmtDate(order.startDate) : '-' }}</div>
        </div>
      </div>
      <div class="od-info-cell">
        <span class="od-info-icon tone-purple"><v-icon size="18">mdi-grid</v-icon></span>
        <div class="min-w-0">
          <div class="od-info-label">{{ t('odSpecification') }}</div>
          <div class="od-info-value">{{ order.reedPick || '-' }}</div>
        </div>
      </div>
      <div class="od-info-cell">
        <span class="od-info-icon tone-green"><v-icon size="18">mdi-resize</v-icon></span>
        <div class="min-w-0">
          <div class="od-info-label">{{ t('size') }}</div>
          <div class="od-info-value">{{ order.size || '-' }}</div>
        </div>
      </div>
      <div class="od-info-cell">
        <span class="od-info-icon tone-blue"><v-icon size="18">mdi-domain</v-icon></span>
        <div class="min-w-0">
          <div class="od-info-label">{{ t('company') }}</div>
          <div class="od-info-value">{{ order.company?.name || '-' }}</div>
        </div>
      </div>
      <div class="od-info-cell">
        <span class="od-info-icon tone-orange"><v-icon size="18">mdi-currency-inr</v-icon></span>
        <div class="min-w-0">
          <div class="od-info-label">{{ t('odRatePerM') }}</div>
          <div class="od-info-value">{{ fmt(order.ratePerMeter) }}</div>
        </div>
      </div>
      <div class="od-info-cell">
        <span class="od-info-icon tone-red"><v-icon size="18">mdi-percent-outline</v-icon></span>
        <div class="min-w-0">
          <div class="od-info-label">{{ t('odDeduction') }}</div>
          <div class="od-info-value">{{ Number(order.deductionPct || 0) }}%</div>
        </div>
      </div>
      <div class="od-info-cell">
        <span class="od-info-icon tone-purple"><v-icon size="18">mdi-clock-outline</v-icon></span>
        <div class="min-w-0">
          <div class="od-info-label">{{ t('odOrderAge') }}</div>
          <div class="od-info-value">{{ t('odDaysN', { n: orderAgeDays }) }}</div>
        </div>
      </div>
      <div class="od-info-cell od-lifecycle">
        <div class="od-info-label">{{ t('odLifecycle') }}</div>
        <div class="od-lifecycle-row">
          <v-chip size="small" :color="order.orderStatus === 'open' ? 'info' : 'success'" variant="tonal">
            {{ order.orderStatus === 'open' ? t('odOpen') : order.orderStatus === 'production_complete' ? t('odProductionDone') : t('odClosed') }}
          </v-chip>
          <v-chip v-if="order.orderStatus === 'closed'" size="small" :color="order.archived ? 'info' : 'success'" variant="tonal">{{ order.archived ? t('archChipArchived') : t('archChipClosed') }}</v-chip>
        </div>
      </div>
    </div>

    <div class="od-insights mb-4">
      <div v-for="(ins, i) in keyInsights" :key="ins.title" class="od-insight" :class="`is-${ins.tone}`" :style="{ '--d': i }">
        <span class="od-insight-icon"><v-icon size="20">{{ ins.icon }}</v-icon></span>
        <div class="min-w-0">
          <div class="od-insight-title">{{ ins.title }}</div>
          <div class="od-insight-value">{{ ins.value }}</div>
          <div class="od-insight-text">{{ ins.text }}</div>
        </div>
      </div>
    </div>

    <v-row class="od-status-row mb-4">
      <v-col cols="12" md="4">
        <v-card rounded="lg" class="at-card pa-4 h-100">
          <div class="od-panel-head">
            <span class="od-panel-icon tone-red"><v-icon size="18">mdi-currency-inr</v-icon></span>
            {{ t('odPaymentStatus') }}
          </div>
          <div class="od-payment-box" :style="{ background: paymentStateColor + '14', borderColor: paymentStateColor + '55', color: paymentStateColor }">
            <v-icon size="22">mdi-currency-inr</v-icon>
            {{ paymentStateLabel }}
          </div>
          <div class="od-gauge">
            <apexchart :key="`${paymentPct}-${paymentStateColor}`" type="radialBar" height="170" :options="paymentGaugeOptions" :series="[paymentPct]" />
          </div>
          <div class="od-payment-sub">
            <span>{{ t('odPayable') }} <strong>{{ fmt(paymentView.payable) }}</strong></span>
            <span>{{ t('odReceivedLbl') }} <strong>{{ fmt(paymentView.received) }}</strong></span>
            <span>{{ t('pending') }} <strong>{{ fmt(paymentView.pending) }}</strong></span>
          </div>
        </v-card>
      </v-col>
      <v-col cols="12" md="8">
        <v-card rounded="lg" class="at-card pa-4 h-100">
          <div class="od-panel-head">
            <span class="od-panel-icon tone-green"><v-icon size="18">mdi-progress-check</v-icon></span>
            {{ t('odLifecycle') }}<span class="od-pct">{{ orderPct }}%</span>
          </div>
          <div class="at-progress od-progress-bar">
            <div class="at-progress-fill od-progress-fill" :style="{ width: orderPct + '%' }" />
          </div>
          <div class="lc-timeline">
            <div v-for="(s, i) in lifecycleStages" :key="s.label" class="lc-step" :class="{ done: s.done, current: s.current }" :style="{ '--d': i }">
              <span class="lc-node"><v-icon size="16">{{ s.done ? 'mdi-check-bold' : s.current ? 'mdi-progress-clock' : 'mdi-circle-outline' }}</v-icon></span>
              <div class="lc-label">{{ s.label }}</div>
              <div class="lc-date">{{ s.date ? fmtDateShort(s.date) : (s.current ? t('dbInProgress') : t('pending')) }}</div>
            </div>
          </div>
          <div class="lc-summary">
            <div v-for="item in lifecycleSummary" :key="item.label" class="lc-summary-item">
              <v-icon size="18">{{ item.icon }}</v-icon>
              <div class="min-w-0">
                <div class="lc-summary-label">{{ item.label }}</div>
                <div class="lc-summary-value">{{ item.value }}</div>
              </div>
            </div>
          </div>
        </v-card>
      </v-col>
    </v-row>

    <v-row class="overview-row mb-4" data-aos="fade-up">
      <v-col cols="12" lg="8" class="overview-left-col">
        <v-card rounded="lg" class="at-card pa-4 order-kpi-card">
          <div class="od-panel-head">
            <span class="od-panel-icon tone-blue"><v-icon size="18">mdi-chart-bar</v-icon></span>
            {{ t('odProductionOverview') }}
          </div>
          <v-row dense class="order-kpi-meters-row mb-3">
            <v-col cols="6" sm="4" lg="2"><div class="od-kpi-tile" v-tilt style="--tile-bg:#EAF2FF;--tile-color:#1565C0"><div class="order-kpi-label">{{ t('expectedMeter') }}</div><div class="order-kpi-value"><AnimatedNumber :value="Number(order.expectedMeter) || 0" :format="fmtM" /></div></div></v-col>
            <v-col cols="6" sm="4" lg="2"><div class="od-kpi-tile" v-tilt style="--tile-bg:#EAF2FF;--tile-color:#1565C0"><div class="order-kpi-label">{{ t('producedMeter') }}</div><div class="order-kpi-value"><AnimatedNumber :value="Number(order.producedMeter) || 0" :format="fmtM" /></div></div></v-col>
            <v-col cols="6" sm="4" lg="2"><div class="od-kpi-tile" v-tilt style="--tile-bg:#FDECEC;--tile-color:#C62828"><div class="order-kpi-label">{{ t('odRejectedMeters') }}</div><div class="order-kpi-value"><AnimatedNumber :value="Number(rejectionLostMeter) || 0" :format="fmtM" /></div></div></v-col>
            <v-col cols="6" sm="4" lg="2"><div class="od-kpi-tile" v-tilt style="--tile-bg:#E8F7EE;--tile-color:#2E7D32"><div class="order-kpi-label">{{ t('odAcceptedMeters') }}</div><div class="order-kpi-value"><AnimatedNumber :value="Number(acceptedMeters) || 0" :format="fmtM" /></div></div></v-col>
            <v-col cols="6" sm="4" lg="2"><div class="od-kpi-tile" v-tilt style="--tile-bg:#FFF3E0;--tile-color:#E65100"><div class="order-kpi-label">{{ t('odRemaining') }}</div><div class="order-kpi-value"><AnimatedNumber :value="Math.max(0, order.expectedMeter - order.producedMeter) || 0" :format="fmtM" /></div></div></v-col>
            <v-col cols="6" sm="4" lg="2"><div class="od-kpi-tile" v-tilt style="--tile-bg:#F3E8FF;--tile-color:#7B1FA2"><div class="order-kpi-label">{{ t('odOverProduced') }}</div><div class="order-kpi-value"><AnimatedNumber :value="Number(overProducedMeter) || 0" :format="fmtM" /></div></div></v-col>
          </v-row>
          <div class="od-dates mb-3">
            <span>{{ t('startDate') }}: <strong>{{ order.startDate ? fmtDate(order.startDate) : '-' }}</strong></span>
            <span>{{ t('endDate') }}: <strong>{{ order.endDate ? fmtDate(order.endDate) : '-' }}</strong></span>
          </div>
          <div class="od-trend">
            <div class="od-trend-head">
              <div class="od-trend-title"><v-icon size="14">mdi-chart-areaspline</v-icon>{{ t('production') }}</div>
              <div class="od-chart-tabs" role="tablist">
                <button v-for="m in chartModes" :key="m.key" type="button" role="tab" class="od-chart-tab" :class="{ active: activeChart === m.key }" :aria-selected="activeChart === m.key" :aria-label="m.label" :title="m.label" :disabled="!hasTrend && (m.key === 'trend' || m.key === 'daily')" @click="chartMode = m.key">
                  <v-icon size="16">{{ m.icon }}</v-icon>
                </button>
              </div>
            </div>
            <div class="od-chart-stage">
              <apexchart :key="prodChartKey" :type="chartTypeMap[activeChart]" height="100%" :options="prodChartOptions" :series="prodChartSeries" />
            </div>
          </div>
          <div class="od-alerts">
            <div v-for="a in orderAlerts" :key="a.text" class="od-alert" :class="`is-${a.tone}`">
              <v-icon size="16">{{ a.icon }}</v-icon>
              <span>{{ a.text }}</span>
            </div>
          </div>
        </v-card>
        <v-card rounded="lg" class="at-card pa-4 mt-4 colour-prod-card">
          <div class="od-panel-head">
            <span class="od-panel-icon tone-green"><v-icon size="18">mdi-palette-outline</v-icon></span>
            {{ t('odDesignWise') }}
            <span class="od-pct">{{ fmtN(colourTotalMeter) }} m</span>
          </div>
          <div class="colour-form mb-3">
            <v-row dense class="align-start">
              <v-col cols="12" sm="6" md="5">
                <v-text-field v-model="colourForm.colour" prepend-inner-icon="mdi-palette-outline" :label="t('odDesign')" density="compact" hide-details="auto" clearable :disabled="isOperationalLocked" />
              </v-col>
              <v-col cols="12" sm="6" md="5">
                <v-text-field v-model.number="colourForm.meter" type="number" prepend-inner-icon="mdi-ruler" :label="t('odMeter')" suffix="m" density="compact" hide-details="auto" :disabled="isOperationalLocked" />
              </v-col>
              <v-col cols="12" md="2" class="d-flex align-center colour-actions">
                <v-btn color="primary" variant="flat" rounded="lg" block :prepend-icon="colourEditId ? undefined : 'mdi-plus-circle-outline'" :loading="colourSaving" :disabled="isOperationalLocked" @click="saveColourEntry">{{ colourEditId ? t('odUpdate') : t('odAdd') }}</v-btn>
                <v-btn v-if="colourEditId" variant="text" rounded="lg" block :disabled="colourSaving" @click="clearColourForm">{{ t('cancel') }}</v-btn>
              </v-col>
            </v-row>
          </div>
          <div v-if="isOperationalLocked" class="text-caption mb-2" style="color:#E65100">{{ t('odProdLocked') }}</div>
          <div class="colour-chips mb-3">
            <span v-for="c in colourSummary" :key="c.colour" class="colour-chip"><strong>{{ c.colour }}</strong> {{ fmtN(c.meter) }} m</span>
          </div>
          <div class="colour-table-wrap">
            <table class="colour-table">
              <thead>
                <tr><th>{{ t('odDesign') }}</th><th class="num">{{ t('odMeter') }}</th><th class="actions">{{ t('actions') }}</th></tr>
              </thead>
              <tbody v-for="g in designGroups" :key="g.design">
                <tr class="design-group-row" @click="toggleDesign(g.design)">
                  <td><v-icon size="16" class="mr-1">{{ expandedDesigns[g.design] ? 'mdi-chevron-down' : 'mdi-chevron-right' }}</v-icon><strong>{{ g.design }}</strong></td>
                  <td class="num"><strong>{{ fmtN(g.total) }} m</strong></td>
                  <td></td>
                </tr>
                <tr v-for="(r, i) in g.rows" v-show="expandedDesigns[g.design]" :key="r._id" class="entry-row" :class="{ 'is-editing': colourEditId === r._id }">
                  <td class="entry-label">{{ t('odEntryN', { n: i + 1 }) }}</td>
                  <td class="num">{{ fmtN(r.meter) }} m</td>
                  <td class="actions">
                    <v-btn icon="mdi-pencil-outline" size="small" variant="text" color="primary" :disabled="isOperationalLocked" @click="startEditColour(r)" />
                    <v-btn icon="mdi-delete-outline" size="small" variant="text" color="error" :disabled="isOperationalLocked" @click="removeColourEntry(r._id)" />
                  </td>
                </tr>
              </tbody>
              <tbody v-if="!colourProductions.length">
                <tr><td colspan="3" class="colour-empty">{{ t('odNoDesignEntries') }}</td></tr>
              </tbody>
              <tfoot v-if="colourProductions.length">
                <tr><td>{{ t('total') }}</td><td class="num">{{ fmtN(colourTotalMeter) }} m</td><td></td></tr>
              </tfoot>
            </table>
          </div>
          <div v-if="colourProductions.length && colourGapMeter !== 0" class="od-alert mt-3" :class="colourGapMeter > 0 ? 'is-info' : 'is-warn'">
            <v-icon size="16">{{ colourGapMeter > 0 ? 'mdi-information-outline' : 'mdi-alert-outline' }}</v-icon>
            <span>{{ colourGapMeter > 0 ? t('odGapAbove', { v: fmtN(Math.abs(colourGapMeter)) }) : t('odGapBelow', { v: fmtN(Math.abs(colourGapMeter)) }) }}</span>
          </div>
        </v-card>
      </v-col>
      <v-col cols="12" lg="4" class="summary-col">
        <v-card rounded="lg" class="at-card pa-4 financial-summary-card">
          <div class="financial-summary-layout">
            <div class="financial-sample-wrap">
              <v-menu open-on-hover :open-on-click="false" open-delay="120" close-delay="80" location="start" offset="8" max-width="520">
                <template #activator="{ props }">
                  <img v-bind="props" :src="sampleImageSrc" alt="sample" class="financial-sample-image" :class="{ 'is-placeholder': !canShowSampleImage }" @error="onSampleImageError" @click="openImagePreview(sampleImageSrc)" />
                </template>
                <div class="financial-sample-hover">
                  <img :src="sampleImageSrc" alt="sample expanded" />
                </div>
              </v-menu>
            </div>
            <div class="financial-summary-content">
              <div class="od-panel-head">
                <span class="od-panel-icon tone-blue"><v-icon size="18">mdi-cash-multiple</v-icon></span>
                {{ t('odFinancialSummary') }}
              </div>
              <div class="od-fin-list">
                <div v-for="f in financials" :key="f.label" class="od-fin-item">
                  <span class="od-fin-icon" :style="{ background: f.color + '1A', color: f.color }"><v-icon size="18">{{ f.icon }}</v-icon></span>
                  <span class="financial-summary-label">{{ f.label }}</span>
                  <span class="financial-summary-value" :style="{ color: f.color }"><AnimatedNumber :value="Number(f.value) || 0" :format="fmt" /></span>
                </div>
              </div>
            </div>
          </div>
        </v-card>
      </v-col>
    </v-row>


    <v-row data-aos="zoom-in-up">
      <v-col cols="12">
        <v-card rounded="lg" class="at-card mb-4 od-table-card" style="overflow:hidden">
          <div class="od-section-head">
            <span class="od-panel-icon tone-purple"><v-icon size="18">mdi-thread</v-icon></span>
            {{ t('nool') }}
            <div class="od-hero-stats">
              <div class="od-hero-stat" style="--d:0; --sc:#1565C0"><span>{{ t('odReceivedLbl') }}</span><strong>{{ formatFixed2(noolSummary.received) }} kg</strong></div>
              <div class="od-hero-stat" style="--d:1; --sc:#E65100"><span>{{ t('odReturned') }}</span><strong>{{ formatFixed2(noolSummary.returned) }} kg</strong></div>
              <div class="od-hero-stat" style="--d:2; --sc:#2E7D32"><span>{{ t('odNet') }}</span><strong>{{ formatFixed2(Math.max(0, noolSummary.received - noolSummary.returned)) }} kg</strong></div>
            </div>
          </div>
          <div class="pa-4">
          <div style="font-size:12px;color:#5A6A85" class="mb-3">{{ t('odFieldsMandatory') }}</div>
          <v-form :key="noolFormKey" ref="noolFormRef" class="nool-form mb-3" validate-on="input" @submit.prevent="addNoolEntry">
            <div v-if="noolEditId" class="mb-2" style="font-size:12px;color:#7B1FA2">{{ t('edit') }} {{ t('nool') }}</div>
            <v-row>
              <v-col cols="6"><v-text-field v-model="noolForm.date" type="date" :label="t('date')" density="compact" hide-details="auto" :rules="[rules.required(), rules.validDate()]" :disabled="isOperationalLocked" /></v-col>
              <v-col cols="6"><v-text-field v-model="noolForm.dcNumber" :label="t('dcNumber')" density="compact" hide-details="auto" :rules="[rules.required(), rules.maxLength(50)]" :disabled="isOperationalLocked" /></v-col>
              <v-col cols="12">
                <!-- Package type toggle -->
                <div class="nool-type-toggle mb-3">
                  <button
                    type="button"
                    class="nool-type-btn"
                    :class="{ active: noolForm.packageType === 'cone_bag' }"
                    :disabled="isOperationalLocked"
                    @click="setNoolPackageType('cone_bag')"
                  >
                    <v-icon size="16" class="mr-1">mdi-package-variant</v-icon>
                    {{ t('odConeBags') }}
                  </button>
                  <button
                    type="button"
                    class="nool-type-btn"
                    :class="{ active: noolForm.packageType === 'nool_bundle' }"
                    :disabled="isOperationalLocked"
                    @click="setNoolPackageType('nool_bundle')"
                  >
                    <span class="nool-yarn-emoji mr-1" aria-hidden="true">🧶</span>
                    {{ t('odNoolBundles') }}
                  </button>
                </div>
              </v-col>
              <v-col cols="12">
                <!-- Entry type toggle -->
                <div class="nool-entry-toggle mb-2">
                  <button
                    type="button"
                    class="nool-entry-btn"
                    :class="{ active: noolForm.entryType === 'receipt' }"
                    :disabled="isOperationalLocked"
                    @click="setNoolEntryType('receipt')"
                  >
                    <v-icon size="14" class="mr-1">mdi-arrow-down-bold-circle-outline</v-icon>
                    {{ t('odReceipt') }}
                  </button>
                  <button
                    type="button"
                    class="nool-entry-btn return"
                    :class="{ active: noolForm.entryType === 'return' }"
                    :disabled="isOperationalLocked"
                    @click="setNoolEntryType('return')"
                  >
                    <v-icon size="14" class="mr-1">mdi-arrow-u-left-top-bold</v-icon>
                    {{ t('odReturnBtn') }}
                  </button>
                </div>
              </v-col>
              <v-col cols="6">
                <v-autocomplete v-model="noolForm.yarnCount" :label="t('yarnCount')" :items="yarnCountOptions" density="compact" hide-details="auto" clearable :rules="[v=>!!v||t('required')]" :disabled="isOperationalLocked" @update:model-value="onYarnCountSelect">
                  <template #item="{ props, item }">
                    <v-list-item v-bind="props">
                      <template v-if="customYarnCounts.includes(item.raw)" #append>
                        <v-btn icon size="x-small" variant="text" color="error" @click.stop="deleteCustomYarnCount(item.raw)"><v-icon>mdi-delete</v-icon></v-btn>
                      </template>
                    </v-list-item>
                  </template>
                </v-autocomplete>
                <v-text-field v-if="noolForm.yarnCount === 'Others'" v-model="noolForm.yarnCountCustom" :label="t('customYarnCount')" density="compact" hide-details="auto" class="mt-2" :rules="[v=>!!String(v||'').trim()||t('required')]" :disabled="isOperationalLocked" @blur="saveCustomYarnCount" />
              </v-col>
              <v-col cols="6">
                <v-autocomplete v-model="noolForm.colour" :label="t('colour')" :items="colourOptions" density="compact" hide-details="auto" clearable :rules="[v=>!!v||t('required')]" :disabled="isOperationalLocked" @update:model-value="onColourSelect">
                  <template #item="{ props, item }">
                    <v-list-item v-bind="props">
                      <template v-if="customColours.includes(item.raw)" #append>
                        <v-btn icon size="x-small" variant="text" color="error" @click.stop="deleteCustomColour(item.raw)"><v-icon>mdi-delete</v-icon></v-btn>
                      </template>
                    </v-list-item>
                  </template>
                </v-autocomplete>
                <v-text-field v-if="noolForm.colour === 'Others'" v-model="noolForm.colourCustom" :label="t('customColour')" density="compact" hide-details="auto" class="mt-2" :rules="[v=>!!String(v||'').trim()||t('required')]" :disabled="isOperationalLocked" @blur="saveCustomColour" />
              </v-col>
              <v-col cols="4">
                <v-text-field
                  v-model="noolForm.noOfPackages"
                  :label="noolForm.packageType === 'cone_bag' ? t('odNoOfCone') : t('odNoOfKattu')"
                  type="number"
                  density="compact"
                  hide-details="auto"
                  :placeholder="t('odOptional')"
                  :disabled="isOperationalLocked"
                  @update:model-value="autoFillNoolQty"
                />
              </v-col>
              <v-col cols="4">
                <v-text-field
                  v-model="noolForm.unitWeight"
                  :label="noolForm.packageType === 'cone_bag' ? t('odWeightPerBag') : t('odWeightPerKattu')"
                  type="number"
                  suffix="kg"
                  density="compact"
                  hide-details="auto"
                  :placeholder="t('odOptional')"
                  :disabled="isOperationalLocked"
                  @update:model-value="autoFillNoolQty"
                />
              </v-col>
              <v-col cols="4">
                <v-text-field v-model.number="noolForm.qty" :label="t('odTotalWeight')" type="number" suffix="kg" density="compact" hide-details="auto" :placeholder="t('odOptional')" :disabled="isOperationalLocked" />
              </v-col>
              <v-col cols="12">
                <v-text-field v-model="noolForm.notes" :label="t('odNotes')" density="compact" hide-details="auto" :placeholder="t('odOptionalRemarks')" :disabled="isOperationalLocked" />
              </v-col>
              <v-col cols="12" class="d-flex align-center nool-action-col">
                <div class="nool-form-actions" :class="{ 'is-editing': !!noolEditId }">
                  <v-btn
                    v-if="!noolEditId"
                    color="primary"
                    variant="tonal"
                    rounded="lg"
                    prepend-icon="mdi-playlist-plus"
                    class="nool-add-btn"
                    :loading="noolSaving"
                    :disabled="isOperationalLocked"
                    @click="addNoolDraftLine"
                  >
                    {{ t('odAddItem') }}
                  </v-btn>
                  <v-btn
                    v-if="!noolEditId"
                    color="primary"
                    variant="flat"
                    rounded="lg"
                    prepend-icon="mdi-content-save-all"
                    class="nool-add-btn"
                    :loading="noolSaving"
                    :disabled="isOperationalLocked"
                    @click="saveNoolBatch"
                  >
                    {{ t('odSaveAllN', { n: noolDraftLines.length }) }}
                  </v-btn>
                  <v-btn
                    v-if="noolEditId"
                    color="primary"
                    variant="flat"
                    rounded="lg"
                    prepend-icon="mdi-content-save"
                    class="nool-add-btn"
                    :loading="noolSaving"
                    :disabled="isOperationalLocked"
                    @click="addNoolEntry"
                  >
                    {{ t('save') }}
                  </v-btn>
                  <v-btn v-if="noolEditId" variant="text" rounded="lg" class="nool-cancel-btn" :disabled="isOperationalLocked" @click="clearNoolForm">{{ t('cancel') }}</v-btn>
                </div>
              </v-col>
            </v-row>
          </v-form>
          <div v-if="isOperationalLocked" class="text-caption mb-3" style="color:#E65100">{{ t('odNoolLocked') }}</div>

          <div v-if="!noolEditId && noolDraftLines.length" class="nool-draft-wrap mb-3">
            <div class="nool-draft-head">{{ t('odDcBatchItems', { n: noolDraftLines.length }) }}</div>
            <div class="nool-draft-list">
              <div v-for="(line, idx) in noolDraftLines" :key="`${line.packageType}-${line.yarnCount}-${line.colour}-${idx}`" class="nool-draft-row">
                <span>{{ line.packageType === 'nool_bundle' ? t('odBundle') : t('odConeLbl') }}</span>
                <span>{{ line.yarnCount || '-' }}</span>
                <span>{{ line.colour || '-' }}</span>
                <span>{{ formatFixed2(line.noOfPackages || 0) }}</span>
                <span>{{ formatFixed2(line.qty || 0) }} kg</span>
                <button type="button" class="nool-draft-remove" @click="removeNoolDraftLine(idx)">{{ t('odRemove') }}</button>
              </div>
            </div>
          </div>

          <!-- Cone Bags collapsible section -->
          <div class="nool-section-header cone-section" @click="coneBagsExpanded = !coneBagsExpanded">
            <div class="nool-section-main">
              <div class="nool-section-copy">
                <div class="nool-section-title-row">
                  <span class="nool-section-title">{{ t('odConeBags') }}</span>
                  <v-chip size="x-small" color="primary" variant="tonal">{{ t('odEntriesN', { n: coneBagRows.length }) }}</v-chip>
                </div>
                <div class="nool-section-meta">
                  <span>{{ t('odMetaIn', { b: formatFixed2(coneBagStats.receivedPackages), q: formatFixed2(coneBagStats.receivedQty) }) }}</span>
                  <span>{{ t('odMetaReturn', { b: formatFixed2(coneBagStats.returnPackages), q: formatFixed2(coneBagStats.returnQty) }) }}</span>
                  <span>{{ t('odMetaNet', { b: formatFixed2(coneBagStats.netPackages), q: formatFixed2(coneBagStats.netQty) }) }}</span>
                </div>
              </div>
            </div>
            <v-icon class="nool-section-chevron">{{ coneBagsExpanded ? 'mdi-chevron-up' : 'mdi-chevron-down' }}</v-icon>
          </div>
          <div v-show="coneBagsExpanded" class="nool-section-body">
            <!-- Cone Bag Receipts -->
            <div v-if="coneBagReceipts.length > 0">
              <div class="nool-sub-header">{{ t('odReceiptsHdr') }}</div>
              <AgTable :rowData="coneBagReceipts" :columnDefs="noolCols" height="auto" :pagination="false" />
            </div>
            <!-- Cone Bag Returns -->
            <div v-if="coneBagReturns.length > 0" class="mt-3">
              <div class="nool-sub-header return-header">↩️ Returns</div>
              <AgTable :rowData="coneBagReturns" :columnDefs="noolCols" height="auto" :pagination="false" />
            </div>
          </div>

          <!-- Nool Bundles collapsible section -->
          <div class="nool-section-header bundle-section mt-2" @click="noolBundlesExpanded = !noolBundlesExpanded">
            <div class="nool-section-main">
              <div class="nool-section-copy">
                <div class="nool-section-title-row">
                  <span class="nool-section-title bundle-title">{{ t('odNoolBundles') }}</span>
                  <v-chip size="x-small" color="purple" variant="tonal">{{ t('odEntriesN', { n: noolBundleRows.length }) }}</v-chip>
                </div>
                <div class="nool-section-meta">
                  <span>{{ t('odMetaInKattu', { b: formatFixed2(noolBundleStats.receivedPackages), q: formatFixed2(noolBundleStats.receivedQty) }) }}</span>
                  <span>{{ t('odMetaReturnKattu', { b: formatFixed2(noolBundleStats.returnPackages), q: formatFixed2(noolBundleStats.returnQty) }) }}</span>
                  <span>{{ t('odMetaNetKattu', { b: formatFixed2(noolBundleStats.netPackages), q: formatFixed2(noolBundleStats.netQty) }) }}</span>
                </div>
              </div>
            </div>
            <v-icon class="nool-section-chevron">{{ noolBundlesExpanded ? 'mdi-chevron-up' : 'mdi-chevron-down' }}</v-icon>
          </div>
          <div v-show="noolBundlesExpanded" class="nool-section-body">
            <!-- Nool Bundle Receipts -->
            <div v-if="noolBundleReceipts.length > 0">
              <div class="nool-sub-header">{{ t('odReceiptsHdr') }}</div>
              <AgTable :rowData="noolBundleReceipts" :columnDefs="noolBundleCols" height="auto" :pagination="false" />
            </div>
            <!-- Nool Bundle Returns -->
            <div v-if="noolBundleReturns.length > 0" class="mt-3">
              <div class="nool-sub-header return-header">↩️ Returns</div>
              <AgTable :rowData="noolBundleReturns" :columnDefs="noolBundleCols" height="auto" :pagination="false" />
            </div>
          </div>

          <div class="pa-4 mt-3 mb-2" style="border-top:1px solid #E0E7EF;background:#FAFCFF;border-radius:12px">
            <div class="od-panel-head mb-4">
              <span class="od-panel-icon tone-red"><v-icon size="18">mdi-scale-balance</v-icon></span>
              {{ t('odYarnShortage') }}
              <v-btn-toggle
                v-model="productionWeightSource"
                mandatory
                density="compact"
                variant="outlined"
                color="primary"
                divided
                class="ml-auto"
              >
                <v-btn value="average" size="small">{{ t('odAvgXMeter') }}</v-btn>
                <v-btn value="history" size="small">{{ t('odProdHistory') }}</v-btn>
              </v-btn-toggle>
            </div>
            <v-row class="yarn-shortage-row">
              <v-col cols="12" sm="6" lg="2">
                <v-text-field
                  :model-value="formatFixed2(totalYarnWeight)"
                  :label="t('odTotalYarnW')"
                  suffix="kg"
                  density="compact"
                  hide-details="auto"
                  readonly
                />
              </v-col>
              <v-col cols="12" sm="6" lg="2">
                <v-text-field
                  :model-value="formatFixed2(totalProductionWeightForShortage)"
                  :label="t('odTotalProdW')"
                  suffix="kg"
                  density="compact"
                  hide-details="auto"
                  readonly
                />
              </v-col>
              <v-col cols="12" sm="6" lg="2">
                <v-text-field
                  :model-value="formatFixed2(totalReturnWeight)"
                  :label="t('odTotalWashW')"
                  suffix="kg"
                  density="compact"
                  hide-details="auto"
                  readonly
                />
              </v-col>
              <v-col cols="12" sm="6" lg="2">
                <v-text-field
                  v-model.number="yarnShortageEnteredAmount"
                  @update:model-value="onYarnShortageAmountChanged"
                  @blur="saveYarnShortageAmountIfDirty"
                  @keydown.enter="saveYarnShortageAmountIfDirty"
                  :label="t('odEnterWeight')"
                  suffix="kg"
                  density="compact"
                  hide-details="auto"
                  :disabled="yarnShortageSaving"
                />
              </v-col>
              <v-col cols="12" sm="6" lg="4">
                <v-text-field
                  :model-value="formatFixed2(totalWeightShortage)"
                  :label="t('odTotalWeightShortage')"
                  suffix="kg"
                  density="compact"
                  hide-details="auto"
                  readonly
                />
              </v-col>
            </v-row>
          </div>
          </div>
        </v-card>
      </v-col>
    </v-row>
    <v-row class="mt-0" data-aos="flip-up">
      <v-col cols="12">
        <v-card rounded="lg" class="at-card od-table-card" style="overflow:hidden">
          <div class="od-section-head">
            <span class="od-panel-icon tone-green"><v-icon size="18">mdi-factory</v-icon></span>
            {{ t('production') }} History
            <div class="od-hero-stats">
              <div class="od-hero-stat" style="--d:0; --sc:#2E7D32"><span>{{ t('odEntries') }}</span><strong>{{ prodSummary.entries }}</strong></div>
              <div class="od-hero-stat" style="--d:1; --sc:#1565C0"><span>{{ t('odTotalMeters') }}</span><strong>{{ fmtN(prodSummary.meters) }} m</strong></div>
              <div class="od-hero-stat" style="--d:2; --sc:#E65100"><span>{{ t('odTotalWeight') }}</span><strong>{{ formatExactKg(prodSummary.weight) }} kg</strong></div>
            </div>
          </div>
          <div class="pa-4" style="border-bottom:1px solid #E0E7EF">
            <div style="font-size:12px;color:#5A6A85" class="mb-3">{{ t('odProdMandatory') }}</div>
            <div v-if="prodEditId" class="mb-2" style="font-size:12px;color:#7B1FA2">{{ t('edit') }} {{ t('production') }}</div>
            <v-form :key="prodFormKey" ref="prodFormRef" class="prod-form" validate-on="input" @submit.prevent="addProductionEntry">
              <v-row dense class="align-start">
                <v-col cols="12" sm="6" lg="2">
                  <v-text-field v-model="prodForm.date" type="date" prepend-inner-icon="mdi-calendar" :label="t('date')" density="compact" hide-details="auto" :rules="[v=>!!v||t('required')]" :disabled="isOperationalLocked" />
                </v-col>
                <v-col cols="12" sm="6" lg="2">
                  <v-text-field v-model="prodForm.dcNumber" prepend-inner-icon="mdi-barcode" :label="t('dcNumber')" density="compact" hide-details="auto" :rules="[v=>!!String(v||'').trim()||t('required')]" :disabled="isOperationalLocked" />
                </v-col>
                <v-col cols="12" sm="6" lg="2">
                  <v-text-field v-model.number="prodForm.meter" prepend-inner-icon="mdi-ruler" :label="t('meter')" type="number" suffix="m" density="compact" hide-details="auto" :rules="[v=>Number(v)>0||t('required')]" :disabled="isOperationalLocked" />
                </v-col>
                <v-col cols="12" sm="6" lg="2">
                  <v-text-field v-model.number="prodForm.weightKg" prepend-inner-icon="mdi-weight-kilogram" :label="t('odWeightLbl')" type="number" suffix="kg" density="compact" hide-details="auto" :disabled="isOperationalLocked" />
                </v-col>
                <v-col cols="12" sm="6" lg="2">
                  <v-text-field v-model="prodForm.notes" :label="t('odNotes')" density="compact" hide-details="auto" :disabled="isOperationalLocked" />
                </v-col>
                <v-col cols="12" sm="6" lg="2" class="d-flex align-center prod-action-col">
                  <v-btn color="primary" variant="flat" rounded="lg" class="w-100 prod-action-btn" :prepend-icon="prodEditId ? undefined : 'mdi-plus-circle-outline'" :loading="prodSaving" :disabled="isOperationalLocked" type="submit" size="default">{{ prodEditId ? t('save') : t('add') }}</v-btn>
                </v-col>
                <v-col v-if="prodEditId" cols="12" sm="6" lg="2" class="d-flex align-center prod-action-col">
                  <v-btn variant="text" rounded="lg" class="w-100 prod-action-btn" :disabled="isOperationalLocked" @click="clearProductionForm" size="default">{{ t('cancel') }}</v-btn>
                </v-col>
              </v-row>
            </v-form>
            <div v-if="prodPreview" class="prod-preview mt-3">
              <span class="prod-preview-dot" />
              <span>{{ t('odAfterEntry') }} <strong>{{ fmtN(prodPreview.total) }} m</strong> {{ t('odProducedLbl') }}</span>
              <span>· <strong>{{ fmtN(prodPreview.remaining) }} m</strong> {{ t('odLeftLbl') }}</span>
              <span v-if="prodPreview.perM !== null">· <strong>{{ prodPreview.perM.toFixed(3) }} kg/m</strong></span>
            </div>
            <div v-if="isOperationalLocked" class="text-caption mt-2" style="color:#E65100">{{ t('odProdLockedRead') }}</div>
          </div>
          <AgTable :rowData="productionRows" :columnDefs="prodCols" :footerRows="productionFooterRows" height="300px" />
          <div class="pa-4" style="border-top:1px solid #E0E7EF">
            <v-row dense justify="end">
              <v-col cols="12" sm="6" lg="3">
                <v-text-field
                  v-model.number="avgWeightPerMeter"
                  @update:model-value="onAvgWeightChanged"
                  @blur="saveAvgWeightIfDirty"
                  @keydown.enter="saveAvgWeightIfDirty"
                  :label="t('odAvgWeightPerM')"
                  type="number"
                  suffix="kg/m"
                  density="compact"
                  hide-details="auto"
                  :placeholder="t('odOptional')"
                  :disabled="isOperationalLocked || avgWeightSaving"
                />
              </v-col>
              <v-col cols="12" sm="6" lg="3">
                <v-text-field
                  :model-value="productionTotalWeightFromAverage"
                  :label="t('odTotalWeight')"
                  suffix="kg"
                  density="compact"
                  hide-details="auto"
                  readonly
                />
              </v-col>
            </v-row>
          </div>
        </v-card>
      </v-col>
    </v-row>

    <v-row class="mt-0" data-aos="zoom-in-up">
      <v-col cols="12">
        <v-card rounded="lg" class="at-card od-table-card" style="overflow:hidden">
          <div class="od-section-head">
            <span class="od-panel-icon tone-red"><v-icon size="18">mdi-close-circle-outline</v-icon></span>
            {{ t('odRejections') }}
            <div class="od-hero-stats">
              <div class="od-hero-stat" style="--d:0; --sc:#C62828"><span>{{ t('odEntries') }}</span><strong>{{ rejSummary.entries }}</strong></div>
              <div class="od-hero-stat" style="--d:1; --sc:#C62828"><span>{{ t('odRejected') }}</span><strong>{{ fmtN(rejSummary.meters) }} m</strong></div>
              <div class="od-hero-stat" style="--d:2; --sc:#7B1FA2"><span>{{ t('odLoss') }}</span><strong>{{ fmt(rejectionAmountLoss) }}</strong></div>
            </div>
          </div>
          <div class="pa-4" style="border-bottom:1px solid #E0E7EF">
            <v-form :key="rejectionFormKey" ref="rejectionFormRef" validate-on="input" @submit.prevent="saveRejectionEntry">
              <v-row dense class="align-start">
                <v-col cols="12" sm="4" lg="2">
                  <v-text-field v-model="rejectionForm.date" type="date" prepend-inner-icon="mdi-calendar" :label="t('date')" density="compact" hide-details="auto" :rules="[rules.required(), rules.validDate()]" :disabled="isOperationalLocked" />
                </v-col>
                <v-col cols="12" sm="4" lg="2">
                  <v-text-field v-model.number="rejectionForm.rejectedQty" type="number" prepend-inner-icon="mdi-close-octagon-outline" :label="t('rejectedM')" density="compact" hide-details="auto" :rules="[rules.required(), rules.positive()]" :disabled="isOperationalLocked" />
                </v-col>
                <v-col cols="12" sm="4" lg="3">
                  <v-combobox
                    v-model="rejectionForm.reason"
                    :items="rejectionReasons"
                    prepend-inner-icon="mdi-alert-circle-outline"
                    :label="t('odReason')"
                    :placeholder="t('odReasonPh')"
                    density="compact"
                    hide-details="auto"
                    clearable
                    :disabled="isOperationalLocked"
                  />
                </v-col>
                <v-col cols="12" sm="8" lg="3">
                  <v-text-field v-model="rejectionForm.notes" prepend-inner-icon="mdi-note-text-outline" :label="t('odNotes')" density="compact" hide-details="auto" :disabled="isOperationalLocked" />
                </v-col>
                <v-col cols="12" sm="4" lg="2" class="d-flex align-center">
                  <v-btn color="primary" variant="flat" rounded="lg" class="w-100" type="submit" :loading="rejectionSaving" :disabled="isOperationalLocked">{{ rejectionEditId ? t('save') : t('add') }}</v-btn>
                </v-col>
                <v-col cols="12" sm="4" lg="2" class="d-flex align-center" v-if="rejectionEditId">
                  <v-btn variant="text" rounded="lg" class="w-100" @click="clearRejectionForm">{{ t('cancel') }}</v-btn>
                </v-col>
              </v-row>
            </v-form>
            <div v-if="isOperationalLocked" class="text-caption mt-2" style="color:#E65100">{{ t('odRejLocked') }}</div>
          </div>
          <AgTable :rowData="rejectionRows" :columnDefs="rejectionCols" :footerRows="rejectionFooterRows" height="260px" :pagination="false" />
        </v-card>
      </v-col>
    </v-row>

    <!-- Order Activity History -->
    <v-card v-if="orderHistory.length" rounded="lg" class="at-card mt-4 mb-5" style="overflow:hidden">
      <div class="od-section-head">
        <span class="od-panel-icon tone-blue"><v-icon size="18">mdi-history</v-icon></span>
        {{ t('odActivityLog') }}        <v-chip size="x-small" color="primary" variant="tonal" class="ml-auto">{{ orderHistory.length }}</v-chip>
      </div>
      <div class="order-history-list pa-4">
        <div v-for="h in orderHistory" :key="h._id" class="order-history-item">
          <div class="order-history-dot" :class="historyActionColor(h.action)"></div>
          <div class="order-history-content">
            <div class="order-history-action">{{ historyActionLabel(h.action) }}</div>
            <div class="order-history-meta">
              <span v-if="h.by">{{ t('odByName', { n: h.by }) }}</span>
              <span>{{ fmtDate(h.createdAt) }}</span>
              <span v-if="h.reason" class="order-history-reason">— {{ h.reason }}</span>
            </div>
          </div>
        </div>
      </div>
    </v-card>

    <!-- Complete Order Dialog -->
    <v-dialog v-model="completeOrderDialog" max-width="500" persistent>
      <v-card rounded="xl" style="overflow:hidden">
        <!-- Dialog header -->
        <div class="complete-dialog-header" :class="producedGapMeter > 0 ? 'warn' : 'ok'">
          <div class="complete-dialog-icon-wrap">
            <v-icon size="36" color="white">{{ producedGapMeter > 0 ? 'mdi-alert-circle' : 'mdi-check-circle' }}</v-icon>
          </div>
          <div class="complete-dialog-header-text">
            <div class="complete-dialog-title">Complete Order</div>
            <div class="complete-dialog-subtitle">{{ order.orderName }}</div>
          </div>
        </div>

        <v-card-text class="px-5 pt-5 pb-3">
          <div v-if="!hasProductionHistory" class="complete-dialog-warn-box mb-4">
            <div class="complete-dialog-warn-msg" style="border-top:none;padding-top:0">
              <v-icon size="16" color="#92400E" class="mr-1" style="vertical-align:middle">mdi-alert</v-icon>
              {{ t('odAddAtLeastOne') }}
            </div>
          </div>

          <!-- Short gap warning -->
          <div v-if="producedGapMeter > 0" class="complete-dialog-warn-box mb-4">
            <div class="complete-dialog-warn-row">
              <div class="complete-dialog-warn-stat">
                <div class="complete-dialog-warn-num">{{ fmtN(order.producedMeter) }} m</div>
                <div class="complete-dialog-warn-label">{{ t('odProducedCap') }}</div>
              </div>
              <v-icon color="#D97706" size="20">mdi-arrow-right</v-icon>
              <div class="complete-dialog-warn-stat">
                <div class="complete-dialog-warn-num" style="color:#DC2626">{{ fmtN(producedGapMeter) }} m</div>
                <div class="complete-dialog-warn-label">{{ t('odShort') }}</div>
              </div>
              <v-icon color="#D97706" size="20">mdi-arrow-right</v-icon>
              <div class="complete-dialog-warn-stat">
                <div class="complete-dialog-warn-num">{{ fmtN(order.expectedMeter) }} m</div>
                <div class="complete-dialog-warn-label">{{ t('odExpected') }}</div>
              </div>
            </div>
            <div class="complete-dialog-warn-msg">
              <v-icon size="16" color="#92400E" class="mr-1" style="vertical-align:middle">mdi-alert</v-icon>
              {{ t('odClosingShortMsg', { v: fmtN(producedGapMeter) + ' m' }) }}
            </div>
          </div>

          <p style="font-size:14px;color:#1F2937;line-height:1.6">
            {{ producedGapMeter > 0
              ? t('odCompleteCopyShort')
              : t('odCompleteCopyMet') }}
          </p>
          <p style="font-size:12px;color:#9CA3AF;margin-top:8px">{{ t('odCompleteIrrev') }}</p>
        </v-card-text>

        <v-divider />
        <v-card-actions class="px-5 py-4">
          <v-btn variant="outlined" rounded="lg" @click="completeOrderDialog = false" :disabled="completingOrder" style="min-width:100px">{{ t('cancel') }}</v-btn>
          <v-spacer />
          <v-btn
            :color="producedGapMeter > 0 ? 'warning' : 'success'"
            variant="flat"
            rounded="lg"
            :loading="completingOrder"
            :disabled="!hasProductionHistory"
            @click="confirmCompleteOrder"
            style="min-width:160px"
          >
            <v-icon start size="16">mdi-check-circle</v-icon>
            {{ t('odYesComplete') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Close Order Dialog (allocate from company balance) -->
    <v-dialog v-model="closeOrderDialog" max-width="560" persistent :fullscreen="$vuetify.display.xs">
      <v-card rounded="xl" class="co-dialog" elevation="0">
        <div class="co-head">
          <div class="co-head-left">
            <div class="pay-icon-box is-lg pay-tone-green">
              <v-icon size="24">mdi-cash-check</v-icon>
            </div>
            <div class="co-head-text">
              <div class="co-title">{{ t('odCloseOrderPay') }}</div>
              <div class="co-sub">{{ order.orderName }}<template v-if="order.company?.name"> · {{ order.company.name }}</template></div>
            </div>
          </div>
          <v-btn icon variant="text" size="small" class="co-close-btn" aria-label="Close" :disabled="closingOrder" @click="closeOrderDialog = false">
            <v-icon size="20">mdi-close</v-icon>
          </v-btn>
        </div>

        <v-card-text class="co-body">
          <section class="pay-card co-section" aria-label="Payable breakdown">
            <div class="co-grid">
              <div class="co-cell">
                <div class="co-cell-label">{{ t('odAcceptedMeters') }}</div>
                <div class="co-cell-value">{{ fmtN(acceptedMeters) }} m</div>
              </div>
              <div class="co-cell">
                <div class="co-cell-label">{{ t('odRate') }}</div>
                <div class="co-cell-value">{{ fmt(order.ratePerMeter || 0) }}/m</div>
              </div>
              <div class="co-cell">
                <div class="co-cell-label">{{ t('odGrossValue') }}</div>
                <div class="co-cell-value c-blue">{{ fmt(closeInfo.grossValue || orderFinance.total || 0) }}</div>
              </div>
              <div class="co-cell">
                <div class="co-cell-label">{{ t('odDeductionPct', { n: order.deductionPct }) }}</div>
                <div class="co-cell-value c-red">-{{ fmt(closeInfo.deduction || orderFinance.deduction || 0) }}</div>
              </div>
            </div>
            <div class="co-payable">
              <span class="co-payable-label">{{ t('odPayableAmt') }}</span>
              <span class="co-payable-value">{{ fmt(closeInfo.payable || orderFinance.payable || 0) }}</span>
            </div>
          </section>

          <section class="pay-card co-section co-balance" :class="closeInfo.canClose ? 'is-ok' : 'is-short'" aria-label="Company balance">
            <div class="co-balance-row">
              <div class="co-balance-left">
                <div class="pay-icon-box" :class="closeInfo.canClose ? 'pay-tone-green' : 'pay-tone-red'">
                  <v-icon size="20">mdi-wallet-outline</v-icon>
                </div>
                <div>
                  <div class="co-cell-label">{{ t('odCompanyBalance') }}</div>
                  <div class="co-balance-value" :class="closeInfo.canClose ? 'c-green' : 'c-red'">{{ fmt(closeInfo.companyBalance || 0) }}</div>
                </div>
              </div>
              <span class="pay-badge" :class="closeInfo.canClose ? 'pay-tone-green' : 'pay-tone-red'">
                <v-icon size="12">{{ closeInfo.canClose ? 'mdi-check' : 'mdi-alert' }}</v-icon>
                {{ closeInfo.canClose ? t('odSufficient') : t('odInsufficient') }}
              </span>
            </div>
            <div v-if="!closeInfo.canClose" class="co-note co-note--danger">
              {{ t('odNeedMore', { v: fmt((closeInfo.payable || 0) - (closeInfo.companyBalance || 0)) }) }}
            </div>
            <div v-if="closeInfo.canClose" class="co-note co-note--ok">
              {{ t('odBalanceAfter') }} <strong>{{ fmt(closeInfo.balanceAfter || 0) }}</strong>
            </div>
            <div v-if="closeInfo.pendingOrders > 0" class="co-note co-note--warn">
              {{ t('odPendingOthers', { n: closeInfo.pendingOrders, v: fmt(closeInfo.pendingCloseTotal || 0) }) }}
            </div>
          </section>

          <p class="co-copy">
            {{ t('archCloseNote', { amount: fmt(closeInfo.payable || orderFinance.payable || 0) }) }}
          </p>
          <p class="co-copy co-copy--muted">{{ t('archReopenNote') }}</p>
        </v-card-text>

        <div class="co-actions">
          <v-btn class="pay-btn-secondary" height="42" :disabled="closingOrder" @click="closeOrderDialog = false">{{ t('cancel') }}</v-btn>
          <v-btn class="pay-btn-primary co-confirm" height="42" :loading="closingOrder" :disabled="!closeInfo.canClose" @click="confirmCloseOrder">
            <v-icon start size="16">mdi-check-circle</v-icon>
            {{ t('odCloseAndPay') }}
          </v-btn>
        </div>
      </v-card>
    </v-dialog>

    <!-- Archive Order Dialog (settles deduction, optional surplus to deduction) -->
    <v-dialog v-model="archiveDialog" max-width="480" persistent>
      <v-card rounded="xl" class="pa-4">
        <div class="text-h6 mb-1">{{ t('archTitle') }}</div>
        <div class="text-body-2 text-medium-emphasis mb-4">{{ order.orderName }}<template v-if="archiveInfo.companyName"> · {{ archiveInfo.companyName }}</template></div>

        <div class="d-flex justify-space-between mb-1"><span>{{ t('archOrderPayable') }}</span><strong>{{ fmt(archiveInfo.closedAmount || 0) }}</strong></div>
        <div class="d-flex justify-space-between mb-1"><span>{{ t('archDeductionForOrder') }}</span><strong>{{ fmt(archiveInfo.closedDeduction || 0) }}</strong></div>
        <div class="d-flex justify-space-between mb-1"><span>{{ t('archDeductionOutstanding') }}</span><strong>{{ fmt(archiveInfo.deductionOutstanding || 0) }}</strong></div>
        <div class="d-flex justify-space-between mb-3"><span>{{ t('archBalance') }}</span><strong>{{ fmt(archiveInfo.surplusAvailable || 0) }}</strong></div>

        <v-text-field
          v-model.number="archiveSurplus"
          type="number"
          min="0"
          :max="archiveInfo.surplusAvailable || 0"
          step="0.01"
          :label="t('settleSurplusInput')"
          :hint="t('archSurplusHint')"
          persistent-hint
          variant="outlined"
          density="comfortable"
          :error-messages="archiveSurplusError"
        >
          <template #append-inner>
            <v-btn size="x-small" variant="tonal" @click="archiveSurplus = archiveInfo.surplusAvailable || 0">{{ t('archMax') }}</v-btn>
          </template>
        </v-text-field>

        <div class="d-flex justify-end ga-2 mt-4">
          <v-btn variant="text" :disabled="archivingOrder" @click="archiveDialog = false">{{ t('cancel') }}</v-btn>
          <v-btn color="info" variant="flat" :loading="archivingOrder" :disabled="!!archiveSurplusError" @click="confirmArchiveOrder">{{ t('archBtn') }}</v-btn>
        </div>
      </v-card>
    </v-dialog>

    <v-dialog v-model="imagePreviewDialog" max-width="980">
      <v-card rounded="lg" class="image-preview-card">
        <div class="d-flex justify-end pa-2">
          <v-btn icon variant="text" @click="imagePreviewDialog = false"><v-icon>mdi-close</v-icon></v-btn>
        </div>
        <div class="image-preview-wrap">
          <img :src="imagePreviewSrc" alt="sample large preview" class="image-preview-img" />
        </div>
      </v-card>
    </v-dialog>

    <v-dialog v-model="repeatOrderDialog" max-width="460" persistent>
      <v-card rounded="xl">
        <div class="repeat-dialog-header">
          <v-icon size="20" color="#1565C0" class="mr-2">mdi-content-copy</v-icon>
          <div>
            <div class="repeat-dialog-title">{{ t('odRepeatOrder') }}</div>
            <div class="repeat-dialog-subtitle">{{ order.orderName }}</div>
          </div>
        </div>
        <v-card-text class="px-5 pt-5 pb-2">
          <v-form ref="repeatOrderFormRef" validate-on="input">
            <v-text-field
              v-model="repeatOrderForm.startDate"
              type="date"
              :label="t('odStartDateReq')"
              density="compact"
              variant="outlined"
              rounded="lg"
              hide-details="auto"
              :rules="[rules.required(), rules.validDate()]"
            />
            <div class="text-caption text-medium-emphasis mt-2">
              {{ t('odRepeatHint') }}
            </div>
          </v-form>
        </v-card-text>
        <v-card-actions class="px-5 pb-5 pt-2">
          <v-spacer />
          <v-btn variant="text" rounded="lg" @click="repeatOrderDialog = false" :disabled="repeatingOrder">{{ t('cancel') }}</v-btn>
          <v-btn color="primary" rounded="lg" elevation="0" :loading="repeatingOrder" @click="confirmRepeatOrder">{{ t('odCreateCopy') }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
  <div v-else class="d-flex align-center justify-center" style="height:400px"><v-progress-circular indeterminate color="primary" /></div>
</template>
<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useOrderStore } from '@/stores/index'
import { useAuthStore } from '@/stores/auth'
import { useUtils } from '@/composables/useUtils'
import { useConfirm } from '@/composables/useConfirm'
import { useNotify } from '@/composables/useNotify'
import { useLoader } from '@/composables/useLoader'
import { celebrate } from '@/composables/useCelebrate'
import { useValidation } from '@/composables/useValidation'
import AgTable from '@/components/common/AgTable.vue'
import AnimatedNumber from '@/components/common/AnimatedNumber.vue'
import AOS from 'aos'
import 'aos/dist/aos.css'
import VanillaTilt from 'vanilla-tilt'
import VueApexCharts from 'vue3-apexcharts'
import api from '@/plugins/axios'

const route = useRoute(); const { t } = useI18n()
const rules = useValidation()
const router = useRouter()
const { fmt, fmtN, fmtDate, fmtDateShort, pct, today } = useUtils()
const { confirm } = useConfirm()
const notify = useNotify()
const loader = useLoader()
const orderStore = useOrderStore()
const authStore = useAuthStore()
const isAdmin = computed(() => authStore.user?.role === 'admin')
const order = ref(null); const productions = ref([]); const noolRows = ref([])
const orderNotFound = ref(false); const orderLoading = ref(true)
const reopeningOrder = ref(false)
const orderHistory = ref([])
const imagePreviewDialog = ref(false)
const imagePreviewSrc = ref('')
const sampleImageLoadFailed = ref(false)
const PLACEHOLDER_ORDER_IMAGE = '/order-placeholder.svg'
const repeatOrderDialog = ref(false)
const repeatOrderFormRef = ref()
const repeatOrderForm = ref({ startDate: '' })
const repeatingOrder = ref(false)
const completeOrderDialog = ref(false)
const completingOrder = ref(false)
const archivingOrder = ref(false)
const archiveDialog = ref(false)
const archiveInfo = ref({ companyName: '', closedAmount: 0, closedDeduction: 0, deductionOutstanding: 0, surplusAvailable: 0 })
const archiveSurplus = ref(0)
const archiveSurplusError = computed(() => {
  const v = Number(archiveSurplus.value || 0)
  if (v < 0) return t('settleSurplusNegative')
  if (v > Number(archiveInfo.value.surplusAvailable || 0) + 0.001) return t('archExceedsBalance')
  return ''
})
const closeOrderDialog = ref(false)
const closingOrder = ref(false)
const closeInfo = ref({ payable: 0, deduction: 0, grossValue: 0, companyBalance: 0, canClose: false })
const rejections = ref([])
const rejectionFormRef = ref()
const rejectionFormKey = ref(0)
const rejectionSaving = ref(false)
const rejectionEditId = ref(null)
const rejectionForm = ref({ date: today(), rejectedQty: null, reason: '', notes: '' })
// Standard reasons keep analytics grouping consistent; free text is still allowed
const rejectionReasons = ['Yarn defect', 'Weaving fault', 'Dyeing / colour variation', 'Design mismatch', 'Machine fault', 'Handling damage', 'Measurement short', 'Other']
const noolFormRef = ref(); const prodFormRef = ref()
const noolFormKey = ref(0); const prodFormKey = ref(0)
const noolSaving = ref(false); const prodSaving = ref(false)
const noolEditId = ref(null); const prodEditId = ref(null)
const avgWeightPerMeter = ref(0)
const avgWeightSaving = ref(false)
const avgWeightHydrating = ref(false)
const avgWeightDirty = ref(false)
const yarnShortageEnteredAmount = ref(0)
const PRODUCTION_WEIGHT_SOURCE_KEY = 'orderDetail.productionWeightSource'
const productionWeightSource = ref(localStorage.getItem(PRODUCTION_WEIGHT_SOURCE_KEY) === 'history' ? 'history' : 'average')
watch(productionWeightSource, (value) => localStorage.setItem(PRODUCTION_WEIGHT_SOURCE_KEY, value))
const yarnShortageSaving = ref(false)
const yarnShortageHydrating = ref(false)
const yarnShortageDirty = ref(false)
let yarnShortageSaveTimer = null
const noolForm = ref({ date: today(), dcNumber: '', yarnCount: '', yarnCountCustom: '', colour: '', colourCustom: '', entryType: 'receipt', packageType: 'cone_bag', noOfPackages: null, unitWeight: null, qty: null, notes: '' })
const colourProductions = ref([])
const colourEditId = ref(null)
const colourSaving = ref(false)
const expandedDesigns = ref({})
const toggleDesign = (design) => { expandedDesigns.value = { ...expandedDesigns.value, [design]: !expandedDesigns.value[design] } }
const colourForm = ref({ date: today(), colour: '', meter: null, notes: '' })
const noolDraftLines = ref([])

function goBack() {
  const query = {}
  const companyId = String(order.value?.company?._id || order.value?.company || route.query.expandCompany || '').trim()
  if (companyId) query.expandCompany = companyId

  const orderId = String(route.params.id || '').trim()
  if (orderId) query.highlightOrder = orderId

  router.push({ path: '/dashboard', query })
}

// Collapse state — collapsed by default
const coneBagsExpanded = ref(false)
const noolBundlesExpanded = ref(false)

const YARN_BASE = ['2/10s', '2/20s', '2/30s', '2/40s', '10s', '20s', 'Twisted', 'Others']
const COLOUR_BASE = ['Full White', 'Half White', 'Blue', 'Little Blue', 'Dark Blue', 'Green', 'Red', 'Black', 'Grey', 'Beige', 'Milange', 'Yellow', 'Purple', 'Others']

const YARN_KEY = 'at-yarn-count-custom'
const COLOUR_KEY = 'at-colour-custom'

function loadCustom(key) {
  try { return JSON.parse(localStorage.getItem(key) || '[]') } catch { return [] }
}
function saveCustom(key, arr) {
  localStorage.setItem(key, JSON.stringify(arr))
}


function sanitizeAvgWeight(value) {
  const n = Number(value)
  if (!Number.isFinite(n) || n < 0) return 0
  return n
}

function sanitizeNonNegative(value) {
  const n = Number(value)
  if (!Number.isFinite(n) || n < 0) return 0
  return n
}

function formatFixed2(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return '0.00'
  return n.toFixed(2)
}

function formatExactKg(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return '0'
  return n.toLocaleString('en-IN', { maximumFractionDigits: 20 })
}

async function updateAvgWeightPerMeter(value, orderIdOverride = null) {
  const orderId = String(orderIdOverride || route.params.id || '')
  if (!orderId || orderId === 'undefined') {
    avgWeightSaving.value = false
    return
  }

  try {
    const safeValue = sanitizeAvgWeight(value)
    const { data } = await api.patch(`/orders/${orderId}/average-weight`, {
      averageWeightPerMeter: safeValue,
    })
    const saved = sanitizeAvgWeight(data?.averageWeightPerMeter)

    avgWeightHydrating.value = true
    avgWeightPerMeter.value = saved
    if (order.value) order.value.averageWeightPerMeter = saved
    notify.success(t('odAvgSaved'))
  } catch (e) {
    notify.apiError(e, t('odAvgSaveFail'))
  } finally {
    avgWeightHydrating.value = false
    avgWeightSaving.value = false
  }
}

function onAvgWeightChanged(nextValue) {
  if (avgWeightHydrating.value) return
  const safe = sanitizeAvgWeight(nextValue)
  avgWeightPerMeter.value = safe
  const currentSaved = sanitizeAvgWeight(order.value?.averageWeightPerMeter)
  avgWeightDirty.value = safe !== currentSaved
}

async function saveAvgWeightIfDirty() {
  if (avgWeightHydrating.value || avgWeightSaving.value || !avgWeightDirty.value) return
  avgWeightSaving.value = true
  await updateAvgWeightPerMeter(avgWeightPerMeter.value)
  avgWeightDirty.value = false
}

async function updateYarnShortageEnteredAmount(value, orderIdOverride = null) {
  const orderId = String(orderIdOverride || route.params.id || '')
  if (!orderId || orderId === 'undefined') {
    yarnShortageSaving.value = false
    return
  }

  try {
    const safeValue = sanitizeNonNegative(value)
    const { data } = await api.patch(`/orders/${orderId}/yarn-shortage-entered-amount`, {
      yarnShortageEnteredAmount: safeValue,
    })
    const saved = sanitizeNonNegative(data?.yarnShortageEnteredAmount)

    yarnShortageHydrating.value = true
    yarnShortageEnteredAmount.value = saved
    if (order.value) order.value.yarnShortageEnteredAmount = saved
    notify.success(t('odEnteredSaved'))
  } catch (e) {
    notify.apiError(e, 'Failed to save entered weight')
  } finally {
    yarnShortageHydrating.value = false
    yarnShortageSaving.value = false
  }
}

function onYarnShortageAmountChanged(nextValue) {
  if (yarnShortageHydrating.value) return
  const safe = sanitizeNonNegative(nextValue)
  yarnShortageEnteredAmount.value = safe
  const currentSaved = sanitizeNonNegative(order.value?.yarnShortageEnteredAmount)
  yarnShortageDirty.value = safe !== currentSaved
  if (yarnShortageSaveTimer) clearTimeout(yarnShortageSaveTimer)
  if (yarnShortageDirty.value) {
    yarnShortageSaveTimer = setTimeout(() => {
      saveYarnShortageAmountIfDirty()
    }, 1200)
  }
}

async function saveYarnShortageAmountIfDirty() {
  if (yarnShortageHydrating.value || yarnShortageSaving.value || !yarnShortageDirty.value) return
  if (yarnShortageSaveTimer) {
    clearTimeout(yarnShortageSaveTimer)
    yarnShortageSaveTimer = null
  }
  yarnShortageSaving.value = true
  await updateYarnShortageEnteredAmount(yarnShortageEnteredAmount.value)
  yarnShortageDirty.value = false
}

const customYarnCounts = ref(loadCustom(YARN_KEY))
const customColours = ref(loadCustom(COLOUR_KEY))

const yarnCountOptions = computed(() => [
  ...YARN_BASE.filter(v => v !== 'Others'),
  ...customYarnCounts.value,
  'Others',
])

const colourOptions = computed(() => [
  ...COLOUR_BASE.filter(v => v !== 'Others'),
  ...customColours.value,
  'Others',
])

function onSampleImageError() {
  sampleImageLoadFailed.value = true
}

function openImagePreview(src) {
  if (!src) return
  imagePreviewSrc.value = src
  imagePreviewDialog.value = true
}

function openRepeatOrderDialog() {
  repeatOrderForm.value = { startDate: '' }
  repeatOrderDialog.value = true
}

function onYarnCountSelect(val) {
  if (val !== 'Others') noolForm.value.yarnCountCustom = ''
}
function onColourSelect(val) {
  if (val !== 'Others') noolForm.value.colourCustom = ''
}
function saveCustomYarnCount() {
  const val = (noolForm.value.yarnCountCustom || '').trim()
  if (!val) return
  if (!customYarnCounts.value.includes(val)) {
    customYarnCounts.value.push(val)
    saveCustom(YARN_KEY, customYarnCounts.value)
  }
  noolForm.value.yarnCount = val
}
function saveCustomColour() {
  const val = (noolForm.value.colourCustom || '').trim()
  if (!val) return
  if (!customColours.value.includes(val)) {
    customColours.value.push(val)
    saveCustom(COLOUR_KEY, customColours.value)
  }
  noolForm.value.colour = val
}
function deleteCustomYarnCount(val) {
  customYarnCounts.value = customYarnCounts.value.filter(v => v !== val)
  saveCustom(YARN_KEY, customYarnCounts.value)
  if (noolForm.value.yarnCount === val) noolForm.value.yarnCount = null
}
function deleteCustomColour(val) {
  customColours.value = customColours.value.filter(v => v !== val)
  saveCustom(COLOUR_KEY, customColours.value)
  if (noolForm.value.colour === val) noolForm.value.colour = null
}
const prodForm = ref({ date: today(), dcNumber: '', meter: null, weightKg: null, notes: '' })
const orderPct = computed(() => pct(order.value?.producedMeter, order.value?.expectedMeter))
const orderFinance = computed(() => (order.value ? orderStore.financials(order.value) : { remaining: 0 }))
const paymentView = computed(() => {
  const o = order.value || {}
  const payable = Math.max(0, Number(orderFinance.value?.payableAmt || 0))
  // Backend rules (routes/orders.js withComputedOrderFields): closed orders use closedAmount, others use totalReceived.
  const isClosed = o.orderStatus === 'closed' || o.status === 'closed'
  const received = Math.max(0, Number(isClosed ? (o.closedAmount || 0) : (o.totalReceived || 0)))
  const pending = o.paymentRemaining != null ? Number(o.paymentRemaining) : Math.max(0, payable - received)
  const label = o.paymentStatusLabel || (received > 0.001 ? 'Partially Paid' : 'Unpaid')
  return { payable, received, pending, label }
})
const paymentStateLabel = computed(() => paymentView.value.label)
const paymentStateColor = computed(() => {
  if (paymentStateLabel.value === 'Fully Paid') return '#2E7D32'
  if (paymentStateLabel.value === 'Partially Paid') return '#1565C0'
  return '#E65100'
})

const apexchart = VueApexCharts
const fmtM = v => `${fmtN(v)} m`

const topThemes = {
  peach: { name: 'Peach + Blue', c1: '#FFEBD2', c2: '#D9E8FF' },
  mint: { name: 'Mint + Sky', c1: '#D8F5E6', c2: '#D6ECFF' },
  rose: { name: 'Rose + Lavender', c1: '#FFE0E6', c2: '#E4DCFF' },
  lemon: { name: 'Lemon + Mint', c1: '#FFF6C9', c2: '#D3F3DF' },
  aqua: { name: 'Aqua + Violet', c1: '#CFF3F6', c2: '#E6DAFF' },
  sand: { name: 'Sand + Teal', c1: '#F7E8D3', c2: '#CDEFE9' },
  slate: { name: 'Grey + Blue', c1: '#EDF0F4', c2: '#D5E3F7' },
}
const THEME_KEY = 'at-order-top-theme-v2'
const savedTheme = localStorage.getItem(THEME_KEY)
const topTheme = ref(savedTheme in topThemes ? savedTheme : 'peach')
watch(topTheme, v => localStorage.setItem(THEME_KEY, v))
const topThemeVars = computed(() => {
  const th = topThemes[topTheme.value] || topThemes.peach
  return { '--od-c1': th.c1, '--od-c2': th.c2 }
})

const vMagnetic = {
  mounted(el) {
    if (window.matchMedia('(prefers-reduced-motion: reduce), (pointer: coarse)').matches) return
    el._magMove = e => {
      const r = el.getBoundingClientRect()
      el.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.22}px, ${(e.clientY - r.top - r.height / 2) * 0.32}px)`
    }
    el._magLeave = () => { el.style.transform = '' }
    el.addEventListener('mousemove', el._magMove)
    el.addEventListener('mouseleave', el._magLeave)
  },
  unmounted(el) {
    el.removeEventListener('mousemove', el._magMove)
    el.removeEventListener('mouseleave', el._magLeave)
  },
}

const prodTrendPoints = computed(() => {
  const byDate = new Map()
  for (const r of productions.value || []) {
    const d = String(r.date || '').slice(0, 10)
    if (d) byDate.set(d, (byDate.get(d) || 0) + Number(r.meter || 0))
  }
  let total = 0
  return [...byDate.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([d, m]) => ({ x: d, y: Math.round((total += m) * 100) / 100 }))
})
const dailyPoints = computed(() => {
  const byDate = new Map()
  for (const r of productions.value || []) {
    const d = String(r.date || '').slice(0, 10)
    if (d) byDate.set(d, (byDate.get(d) || 0) + Number(r.meter || 0))
  }
  return [...byDate.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([d, m]) => ({ x: d, y: Math.round(m * 100) / 100 }))
})
const chartModes = [
  { key: 'trend', icon: 'mdi-chart-areaspline', label: 'Trend' },
  { key: 'daily', icon: 'mdi-chart-bar', label: 'Daily' },
  { key: 'mix', icon: 'mdi-chart-donut', label: 'Mix' },
  { key: 'compare', icon: 'mdi-poll', label: 'Compare' },
  { key: 'rings', icon: 'mdi-gauge', label: 'Rings' },
]
const chartMode = ref('')
const chartTypeMap = { trend: 'area', daily: 'bar', mix: 'donut', compare: 'bar', rings: 'radialBar' }
const hasTrend = computed(() => prodTrendPoints.value.length > 1)
const activeChart = computed(() => {
  const m = chartMode.value || 'compare'
  if (hasTrend.value || (m !== 'trend' && m !== 'daily')) return m
  return 'compare'
})
const meterBreakdown = computed(() => {
  const expected = Number(order.value?.expectedMeter || 0)
  const produced = Number(order.value?.producedMeter || 0)
  const accepted = Number(acceptedMeters.value || 0)
  const rejected = Number(rejectionLostMeter.value || 0)
  const over = Number(overProducedMeter.value || 0)
  return [
    { label: t('odAcceptedMeters'), value: Math.max(0, Math.min(accepted, expected)), color: '#2E7D32' },
    { label: t('odOverProduced'), value: over, color: '#7B1FA2' },
    { label: t('odRejectedMeters'), value: rejected, color: '#C62828' },
    { label: t('odRemaining'), value: Math.max(0, expected - produced), color: '#F59E0B' },
  ]
})
const compareBars = computed(() => [
  { label: t('expectedMeter'), value: Number(order.value?.expectedMeter || 0), color: '#1565C0' },
  { label: t('producedMeter'), value: Number(order.value?.producedMeter || 0), color: '#42A5F5' },
  { label: t('odAcceptedMeters'), value: Number(acceptedMeters.value || 0), color: '#2E7D32' },
  { label: t('odRejectedMeters'), value: Number(rejectionLostMeter.value || 0), color: '#C62828' },
  { label: t('odRemaining'), value: Math.max(0, Number(order.value?.expectedMeter || 0) - Number(order.value?.producedMeter || 0)), color: '#F59E0B' },
])
const ringValues = computed(() => {
  const produced = Number(order.value?.producedMeter || 0)
  const rej = produced > 0 ? (Number(rejectionLostMeter.value || 0) / produced) * 100 : 0
  return [
    { label: t('odCompletion'), value: Math.min(100, Math.round(orderPct.value || 0)), color: '#1565C0' },
    { label: t('odAcceptance'), value: Math.min(100, Math.round(Number(acceptancePct.value) || 0)), color: '#2E7D32' },
    { label: t('odRejRate'), value: Math.min(100, Math.round(rej * 10) / 10), color: '#C62828' },
  ]
})
const prodChartSeries = computed(() => {
  switch (activeChart.value) {
    case 'trend': return [{ name: t('production'), data: prodTrendPoints.value }]
    case 'daily': return [{ name: t('production'), data: dailyPoints.value }]
    case 'mix': return meterBreakdown.value.map(d => d.value)
    case 'compare': return [{ name: 'm', data: compareBars.value.map(d => ({ x: d.label, y: d.value, fillColor: d.color })) }]
    default: return ringValues.value.map(d => d.value)
  }
})
const prodChartKey = computed(() => `${activeChart.value}-${JSON.stringify(prodChartSeries.value).length}-${prodTrendPoints.value.at(-1)?.y || 0}`)
const prodChartOptions = computed(() => {
  const base = { chart: { toolbar: { show: false }, animations: { enabled: true, easing: 'easeinout', speed: 900 }, fontFamily: 'inherit', parentHeightOffset: 0 }, tooltip: { theme: 'light' } }
  const mFmt = v => `${fmtN(v)} m`
  switch (activeChart.value) {
    case 'trend':
      return { ...base, chart: { ...base.chart, type: 'area', sparkline: { enabled: true } }, stroke: { curve: 'smooth', width: 3 }, colors: ['#1565C0'], fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.45, opacityTo: 0.02, stops: [0, 100] } }, xaxis: { type: 'category' }, tooltip: { fixed: { enabled: false }, x: { show: true }, y: { formatter: mFmt, title: { formatter: () => '' } }, marker: { show: false } }, markers: { size: 0, hover: { size: 5 } } }
    case 'daily':
      return { ...base, chart: { ...base.chart, type: 'bar', sparkline: { enabled: true } }, colors: ['#42A5F5'], plotOptions: { bar: { borderRadius: 5, columnWidth: '62%' } }, fill: { type: 'gradient', gradient: { type: 'vertical', shade: 'light', gradientToColors: ['#1565C0'], stops: [0, 100] } }, tooltip: { fixed: { enabled: false }, y: { formatter: mFmt, title: { formatter: () => '' } } } }
    case 'mix':
      return { ...base, chart: { ...base.chart, type: 'donut' }, labels: meterBreakdown.value.map(d => d.label), colors: meterBreakdown.value.map(d => d.color), stroke: { width: 3, colors: ['#fff'] }, dataLabels: { enabled: false }, legend: { position: 'right', fontSize: '12px', markers: { radius: 4 }, itemMargin: { vertical: 3 }, formatter: (name, o) => `${name}  ${fmtN(o.w.globals.series[o.seriesIndex])} m` }, plotOptions: { pie: { donut: { size: '66%', labels: { show: true, total: { show: true, label: t('producedMeter'), fontSize: '11px', color: '#64748B', formatter: () => mFmt(order.value?.producedMeter || 0) }, value: { fontSize: '18px', fontWeight: 800, formatter: v => mFmt(v) } } } } }, tooltip: { y: { formatter: mFmt } }, responsive: [{ breakpoint: 520, options: { legend: { position: 'bottom' } } }] }
    case 'compare':
      return { ...base, chart: { ...base.chart, type: 'bar' }, plotOptions: { bar: { horizontal: true, distributed: true, borderRadius: 6, barHeight: '62%' } }, colors: compareBars.value.map(d => d.color), legend: { show: false }, dataLabels: { enabled: true, formatter: mFmt, style: { fontSize: '11px', fontWeight: 700 }, offsetX: 4 }, xaxis: { labels: { show: false }, axisBorder: { show: false }, axisTicks: { show: false } }, yaxis: { labels: { style: { fontSize: '11px', colors: '#475569' }, maxWidth: 140, offsetX: 6 } }, grid: { show: false, padding: { left: 26, right: 24 } }, tooltip: { y: { formatter: mFmt, title: { formatter: () => '' } } } }
    default:
      return { ...base, chart: { ...base.chart, type: 'radialBar' }, labels: ringValues.value.map(d => d.label), colors: ringValues.value.map(d => d.color), plotOptions: { radialBar: { hollow: { size: '32%' }, track: { background: '#EEF2F7' }, dataLabels: { name: { fontSize: '11px' }, value: { fontSize: '16px', fontWeight: 800, formatter: v => `${v}%` }, total: { show: true, label: t('odCompletion'), fontSize: '11px', formatter: () => `${Math.round(orderPct.value || 0)}%` } } } }, stroke: { lineCap: 'round' }, legend: { show: true, position: 'right', fontSize: '12px', markers: { radius: 4 } } }
  }
})
const tickerLoop = computed(() => {
  const o = order.value || {}
  const items = [
    { icon: 'mdi-package-variant', text: o.orderName },
    { icon: 'mdi-domain', text: o.company?.name },
    { icon: 'mdi-grid', text: o.reedPick },
    { icon: 'mdi-resize', text: o.size },
    { icon: 'mdi-currency-inr', text: o.ratePerMeter != null ? `${fmt(o.ratePerMeter)} / m` : '' },
    { icon: 'mdi-progress-check', text: `${orderPct.value}%` },
  ].filter(i => i.text)
  return [...items, ...items, ...items, ...items]
})
const paymentPct = computed(() => {
  const { payable, received } = paymentView.value
  return payable > 0 ? Math.min(100, Math.round((received / payable) * 100)) : 0
})
const paymentGaugeOptions = computed(() => ({
  chart: { type: 'radialBar', sparkline: { enabled: true }, animations: { enabled: true, speed: 900 } },
  plotOptions: {
    radialBar: {
      hollow: { size: '58%' },
      track: { background: '#EEF2F7' },
      dataLabels: {
        name: { show: true, fontSize: '11px', color: '#64748B', offsetY: 20 },
        value: { fontSize: '24px', fontWeight: 800, color: '#0F172A', offsetY: -14, formatter: v => `${v}%` },
      },
    },
  },
  fill: { type: 'gradient', gradient: { shade: 'dark', type: 'horizontal', gradientToColors: ['#34D399'], stops: [0, 100] } },
  colors: [paymentStateColor.value],
  stroke: { lineCap: 'round' },
  labels: [t('odReceivedLbl')],
}))

const vTilt = {
  mounted(el) {
    if (window.matchMedia('(prefers-reduced-motion: reduce), (pointer: coarse)').matches) return
    VanillaTilt.init(el, { max: 10, speed: 400, glare: true, 'max-glare': 0.22, scale: 1.04 })
  },
  unmounted(el) { el.vanillaTilt?.destroy() },
}

// Re-scan scroll-reveal targets once the order content has rendered
const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
onMounted(() => AOS.init({ duration: 650, easing: 'ease-out-cubic', once: true, offset: 40, disable: reduceMotion }))
watch(() => order.value?._id, id => { if (id) nextTick(() => AOS.refreshHard()) })
const productionMeterTotal = computed(() => {
  return (productions.value || []).reduce((sum, row) => sum + Number(row?.meter || 0), 0)
})
const productionWeightTotal = computed(() => {
  const total = (productions.value || []).reduce((sum, row) => sum + Number(row?.weightKg || 0), 0)
  return Number(total.toFixed(10))
})
const rejectionMeterTotal = computed(() => {
  return (rejections.value || []).reduce((sum, row) => sum + Number(row?.rejectedQty || 0), 0)
})
const productionFooterRows = computed(() => [
  {
    __isFooter: true,
    date: 'Total',
    dcNumber: '',
    meter: `${fmtN(productionMeterTotal.value)} m`,
    weightKg: `${formatExactKg(productionWeightTotal.value)} kg`,
    notes: '',
  },
])
const rejectionFooterRows = computed(() => [
  {
    __isFooter: true,
    date: 'Total',
    rejectedQty: `${fmtN(rejectionMeterTotal.value)} m`,
    reason: '',
    notes: '',
  },
])
const productionTotalWeightFromAverage = computed(() => {
  const avg = sanitizeAvgWeight(avgWeightPerMeter.value)
  const meter = Number(productionMeterTotal.value || 0)
  if (meter <= 0) return 0
  return Number((avg * meter).toFixed(3))
})
const hasProductionHistory = computed(() => Array.isArray(productions.value) && productions.value.length > 0)
const producedGapMeter = computed(() => Math.max(0, Number(order.value?.expectedMeter || 0) - Number(order.value?.producedMeter || 0)))
const overProducedMeter = computed(() => Math.max(0, Number(order.value?.producedMeter || 0) - Number(order.value?.expectedMeter || 0)))
const orderAgeDays = computed(() => {
  const start = order.value?.startDate || order.value?.createdAt
  if (!start) return 0
  const startTs = new Date(start).getTime()
  if (!Number.isFinite(startTs) || startTs <= 0) return 0
  const diff = Date.now() - startTs
  return Math.max(0, Math.ceil(diff / 86400000))
})
const plannedDays = computed(() => {
  const s = order.value?.startDate
  const e = order.value?.endDate
  if (!s || !e) return 0
  const sTs = new Date(s).getTime()
  const eTs = new Date(e).getTime()
  if (!Number.isFinite(sTs) || !Number.isFinite(eTs) || eTs < sTs) return 0
  return Math.ceil((eTs - sTs) / 86400000) + 1
})
const avgDailyTarget = computed(() => {
  if (plannedDays.value <= 0) return 0
  return Number(order.value?.expectedMeter || 0) / plannedDays.value
})
const avgDailyProduced = computed(() => {
  if (orderAgeDays.value <= 0) return 0
  return Number(order.value?.producedMeter || 0) / orderAgeDays.value
})
const isOperationalLocked = computed(() => !!order.value?.productionClosed)
const rejectionLostMeter = computed(() => Number(order.value?.rejectedMeter || order.value?.lossMeter || 0))
const acceptedMeters = computed(() => {
  const produced = Number(order.value?.producedMeter || 0)
  return Math.max(0, Number(order.value?.acceptedMeter ?? (produced - rejectionLostMeter.value)))
})
const rejectionGrossLoss = computed(() => rejectionLostMeter.value * Number(order.value?.ratePerMeter || 0))
const rejectionDeductionLoss = computed(() => rejectionGrossLoss.value * (Number(order.value?.deductionPct || 0) / 100))
const rejectionAmountLoss = computed(() => rejectionGrossLoss.value - rejectionDeductionLoss.value)
const receivedPct = computed(() => {
  const { payable, received } = paymentView.value
  if (payable <= 0) return 0
  return Math.max(0, Math.min(100, Math.round((received / payable) * 100)))
})
const acceptancePct = computed(() => {
  const produced = Number(order.value?.producedMeter || 0)
  if (produced <= 0) return 0
  return Math.max(0, Math.min(100, Math.round((Number(acceptedMeters.value || 0) / produced) * 100)))
})
const etaToCompleteDays = computed(() => {
  const remaining = Math.max(0, Number(order.value?.expectedMeter || 0) - Number(order.value?.producedMeter || 0))
  const dailyProduced = Number(avgDailyProduced.value || 0)
  if (remaining <= 0) return 'Completed'
  if (dailyProduced <= 0) return '-'
  return `${Math.ceil(remaining / dailyProduced)} days`
})
const noolSummary = computed(() => ({
  received: Number((coneBagStats.value.receivedQty || 0) + (noolBundleStats.value.receivedQty || 0)),
  returned: Number((coneBagStats.value.returnQty || 0) + (noolBundleStats.value.returnQty || 0)),
  entries: noolRows.value?.length || 0,
}))
const colourTotalMeter = computed(() => colourProductions.value.reduce((sum, r) => sum + Number(r.meter || 0), 0))
const colourSummary = computed(() => {
  const totals = new Map()
  for (const r of colourProductions.value) totals.set(r.colour, (totals.get(r.colour) || 0) + Number(r.meter || 0))
  const total = colourTotalMeter.value
  return [...totals.entries()]
    .map(([colour, meter]) => ({ colour, meter, pct: total > 0 ? (meter / total) * 100 : 0 }))
    .sort((a, b) => b.meter - a.meter)
})
const colourGapMeter = computed(() => colourTotalMeter.value - Number(order.value?.producedMeter || 0))
const designGroups = computed(() => colourSummary.value.map(s => ({
  design: s.colour,
  total: s.meter,
  rows: colourProductions.value.filter(r => r.colour === s.colour),
})))
const prodSummary = computed(() => ({ entries: productions.value?.length || 0, meters: productionMeterTotal.value, weight: productionWeightTotal.value }))
const rejSummary = computed(() => ({ entries: rejections.value?.length || 0, meters: rejectionMeterTotal.value }))
const remainingMeter = computed(() => Math.max(0, Number(order.value?.expectedMeter || 0) - Number(order.value?.producedMeter || 0)))
const orderAlerts = computed(() => {
  const list = []
  if (!hasProductionHistory.value) list.push({ icon: 'mdi-information-outline', tone: 'info', text: t('odNoEntriesYet') })
  if (producedGapMeter.value > 0) list.push({ icon: 'mdi-alert-outline', tone: 'warn', text: `${fmtN(producedGapMeter.value)} m short of expected production` })
  if (overProducedMeter.value > 0) list.push({ icon: 'mdi-trending-up', tone: 'info', text: `${fmtN(overProducedMeter.value)} m over expected production` })
  if (rejectionLostMeter.value > 0) list.push({ icon: 'mdi-close-circle-outline', tone: 'danger', text: `${fmtN(rejectionLostMeter.value)} m rejected, loss ${fmt(rejectionAmountLoss.value)}` })
  if (!list.length) list.push({ icon: 'mdi-check-decagram-outline', tone: 'ok', text: t('odOnTrack') })
  return list
})
const lifecycleStages = computed(() => {
  const o = order.value || {}
  const history = orderHistory.value || []
  const historyAt = action => {
    const ts = history.filter(h => h.action === action).map(h => new Date(h.createdAt).getTime()).filter(Number.isFinite)
    return ts.length ? new Date(Math.max(...ts)).toISOString() : null
  }
  const earliest = rows => {
    const ts = rows.map(r => new Date(r.date).getTime()).filter(Number.isFinite)
    return ts.length ? new Date(Math.min(...ts)).toISOString() : null
  }
  const receipts = (noolRows.value || []).filter(r => (r.entryType || 'receipt') !== 'return')
  const stages = [
    { label: t('odStOrderCreated'), date: historyAt('created') || (o.createdAt ? new Date(o.createdAt).toISOString() : null), done: !!o.createdAt },
    { label: t('odStYarnRecv'), date: earliest(receipts), done: receipts.length > 0 },
    { label: t('odStProdStarted'), date: earliest(productions.value || []), done: (productions.value || []).length > 0 },
    { label: t('odStProdDone'), date: historyAt('production_complete'), done: !!o.productionClosed || ['production_complete', 'closed'].includes(o.orderStatus) },
    { label: t('odStClosed'), date: historyAt('closed') || (o.closedAt ? new Date(o.closedAt).toISOString() : null), done: o.orderStatus === 'closed' },
  ]
  const currentIdx = stages.findIndex(s => !s.done)
  return stages.map((s, i) => ({ ...s, current: i === currentIdx }))
})
const lifecycleSummary = computed(() => {
  const o = order.value || {}
  const stages = lifecycleStages.value
  const dayMs = 86400000
  const toTs = v => new Date(v).getTime()
  const items = []
  const current = stages.find(s => s.current)
  items.push({ icon: 'mdi-flag-variant-outline', label: t('odCurStage'), value: current ? current.label : t('odStAllDone') })
  if (o.createdAt) {
    const end = o.orderStatus === 'closed' && o.closedAt ? toTs(o.closedAt) : Date.now()
    items.push({ icon: 'mdi-calendar-start', label: t('odOrderAge'), value: t('odDaysCount', { n: Math.max(0, Math.round((end - toTs(o.createdAt)) / dayMs)) }) })
  }
  const prodStart = stages[2]?.date
  const prodEnd = stages[3]?.date
  if (prodStart) {
    const end = prodEnd ? toTs(prodEnd) : Date.now()
    items.push({ icon: 'mdi-timer-outline', label: prodEnd ? 'Production Duration' : 'Producing For', value: `${Math.max(0, Math.round((end - toTs(prodStart)) / dayMs))} days` })
  }
  if (o.endDate && o.orderStatus !== 'closed') {
    const left = Math.ceil((toTs(o.endDate) - Date.now()) / dayMs)
    items.push({ icon: 'mdi-calendar-clock', label: 'Planned End', value: left < 0 ? `${Math.abs(left)} days overdue` : `${left} days left` })
  }
  return items
})
const prodPreview = computed(() => {
  if (prodEditId.value) return null
  const meter = Number(prodForm.value.meter || 0)
  if (!(meter > 0)) return null
  const weight = Number(prodForm.value.weightKg || 0)
  const total = productionMeterTotal.value + meter
  const expected = Number(order.value?.expectedMeter || 0)
  return {
    total,
    remaining: Math.max(0, expected - total),
    perM: weight > 0 ? weight / meter : null,
  }
})
const productionRows = computed(() => {
  const list = productions.value || []
  const running = new Map()
  let total = 0
  for (const r of [...list].sort((a, b) => String(a.date).localeCompare(String(b.date)))) {
    total += Number(r.meter || 0)
    running.set(r._id, total)
  }
  return list.map(r => ({
    ...r,
    runningTotal: running.get(r._id) ?? 0,
    weightPerM: r.weightKg && r.meter ? Number(r.weightKg) / Number(r.meter) : null,
  }))
})
const rejectionRows = computed(() => {
  const produced = Number(order.value?.producedMeter || 0)
  return (rejections.value || []).map(r => ({
    ...r,
    sharePct: produced > 0 ? (Number(r.rejectedQty || 0) / produced) * 100 : null,
  }))
})
const canShowSampleImage = computed(() => {
  const src = String(order.value?.sampleImage || '').trim()
  if (!src || sampleImageLoadFailed.value) return false
  if (src.startsWith('data:image/')) return true
  if (/^https?:\/\//i.test(src)) return true
  if (src.startsWith('/')) return true
  return /\.(png|jpe?g|webp|gif|bmp|svg)(\?.*)?$/i.test(src)
})
const sampleImageSrc = computed(() => (canShowSampleImage.value ? order.value.sampleImage : PLACEHOLDER_ORDER_IMAGE))

const financials = computed(() => {
  if (!order.value) return []
  const f = orderStore.financials(order.value)
  return [
    { label: 'Total Value', value: f.totalValue, color: '#1565C0', icon: 'mdi-currency-inr' },
    { label: 'Deduction', value: f.deductionAmt, color: '#C62828', icon: 'mdi-minus-circle-outline' },
    { label: 'Payable', value: f.payableAmt, color: '#2E7D32', icon: 'mdi-wallet-outline' },
    { label: 'Rejection Loss', value: rejectionGrossLoss.value, color: '#7B1FA2', icon: 'mdi-close-octagon-outline' },
    { label: 'Rate/m', value: order.value.ratePerMeter, color: '#E65100', icon: 'mdi-calendar-month-outline' },
  ]
})
const keyInsights = computed(() => {
  const o = order.value || {}
  const produced = Number(o.producedMeter || 0)
  const expected = Number(o.expectedMeter || 0)
  const remaining = Math.max(0, expected - produced)
  const paceRatio = avgDailyTarget.value > 0 ? (avgDailyProduced.value / avgDailyTarget.value) * 100 : 0
  const rejRate = produced > 0 ? (rejectionLostMeter.value / produced) * 100 : 0
  const endTs = o.endDate ? new Date(o.endDate).getTime() : NaN
  const daysLeft = Number.isFinite(endTs) ? Math.ceil((endTs - Date.now()) / 86400000) : null
  const completion = expected > 0 ? Math.min(100, (produced / expected) * 100) : 0
  const entries = noolRows.value?.length || 0
  const returns = (noolRows.value || []).filter(r => r.entryType === 'return').length
  const list = [
    { icon: 'mdi-progress-check', tone: completion >= 100 ? 'ok' : 'info', title: t('odCompletion'), value: `${Math.round(completion)}%`, text: t('odRemainingOf', { r: fmtN(remaining), e: fmtN(expected) }), show: expected > 0 },
    { icon: 'mdi-speedometer', tone: paceRatio >= 100 ? 'ok' : 'warn', title: t('odDailyPace'), value: `${Math.round(paceRatio)}%`, text: t('odPaceVsPlan', { a: fmtN(avgDailyProduced.value), p: fmtN(avgDailyTarget.value) }), show: paceRatio > 0 },
    { icon: 'mdi-check-decagram-outline', tone: acceptancePct.value >= 95 ? 'ok' : 'warn', title: t('odAcceptance'), value: `${acceptancePct.value}%`, text: t('odAcceptedOf', { a: fmtN(acceptedMeters.value), p: fmtN(produced) }), show: produced > 0 },
    { icon: 'mdi-close-circle-outline', tone: rejRate > 5 ? 'danger' : 'ok', title: t('odRejRate'), value: `${rejRate.toFixed(1)}%`, text: t('odRejLoss', { r: fmtN(rejectionLostMeter.value), l: fmt(rejectionAmountLoss.value) }), show: produced > 0 },
    { icon: 'mdi-calendar-clock', tone: daysLeft !== null && daysLeft < 0 ? 'danger' : daysLeft !== null && daysLeft <= 7 ? 'warn' : 'ok', title: t('odTimeline'), value: daysLeft !== null && daysLeft < 0 ? t('odDaysOverdue', { n: Math.abs(daysLeft) }) : t('odDaysLeft', { n: daysLeft }), text: t('odPlannedEnd', { d: fmtDate(o.endDate) }), show: daysLeft !== null },
    { icon: 'mdi-timer-sand', tone: 'info', title: t('odEtaComplete'), value: etaToCompleteDays.value, text: t('odEtaText', { r: fmtN(remaining), a: fmtN(avgDailyProduced.value) }), show: remaining > 0 && avgDailyProduced.value > 0 },
    { icon: 'mdi-wallet-outline', tone: receivedPct.value >= 100 ? 'ok' : receivedPct.value > 0 ? 'warn' : 'danger', title: t('odCollections'), value: t('odReceivedPct', { p: receivedPct.value }), text: t('odPendingFrom', { a: fmt(paymentView.value.pending), b: fmt(paymentView.value.payable) }), show: paymentView.value.payable > 0 },
    { icon: 'mdi-swap-vertical', tone: 'info', title: t('odYarnMovements'), value: t('odEntriesN', { n: entries }), text: t('odReturnsN', { n: returns }), show: entries > 0 },
  ]
  return list.filter(i => i.show)
})
const prodCols = computed(() => [
  { field:'date', headerName:t('date'), flex:1, valueFormatter: p => p?.data?.__isFooter ? (p.value || '') : fmtDateShort(p.value) },
  { field:'dcNumber', headerName:t('dcNumber'), flex:1 },
  { field:'meter', headerName:t('meter'), flex:1, valueFormatter: p => p?.data?.__isFooter ? (p.value || '') : fmtN(p.value)+' m' },
  { field:'runningTotal', headerName:t('odRunningTotal'), flex:1, valueFormatter: p => p?.data?.__isFooter ? '' : fmtN(p.value)+' m' },
  { field:'weightKg', headerName:t('odWeightLbl'), flex:0.8, valueFormatter: p => p?.data?.__isFooter ? (p.value || '') : (p.value == null ? '-' : formatExactKg(p.value)+' kg') },
  { field:'weightPerM', headerName:t('odKgPerM'), flex:0.7, valueFormatter: p => p?.data?.__isFooter ? '' : (p.value == null ? '-' : formatFixed2(p.value)) },
  { field:'notes', headerName:t('notes'), flex:1.2, valueFormatter: p => p.value || '-' },
  { headerName:t('actions'), flex:1.1, sortable:false, filter:false,
    cellRenderer: p => `<div style="display:flex;gap:4px;padding-top:4px">
      <button data-id="${p.data._id}" data-action="edit" style="background:#F3E5F5;border:none;border-radius:6px;padding:4px 8px;cursor:pointer;color:#7B1FA2;font-size:11px;font-weight:600">${t('edit')}</button>
      <button data-id="${p.data._id}" data-action="delete" style="background:#FFEBEE;border:none;border-radius:6px;padding:4px 8px;cursor:pointer;color:#C62828;font-size:11px;font-weight:600">${t('delete')}</button>
    </div>`,
    onCellClicked: async e => {
      const action = e.event.target?.dataset?.action
      const id = e.event.target?.dataset?.id
      if (!action || !id || isOperationalLocked.value) return
      if (action === 'edit') startEditProduction(e.data)
      if (action === 'delete') await removeProduction(id)
    },
  },
])

const rejectionCols = computed(() => [
  { field: 'date', headerName: t('date'), flex: 1, valueFormatter: p => p?.data?.__isFooter ? (p.value || '') : fmtDateShort(p.value) },
  { field: 'rejectedQty', headerName: t('rejectedM'), flex: 1, valueFormatter: p => p?.data?.__isFooter ? (p.value || '') : fmtN(p.value || 0) + ' m' },
  { field: 'sharePct', headerName: t('odShareOutput'), flex: 0.9, valueFormatter: p => p?.data?.__isFooter ? '' : (p.value == null ? '-' : p.value.toFixed(1) + '%') },
  { field: 'reason', headerName: t('odReason'), flex: 1.2, valueFormatter: p => p.value || '-' },
  { field: 'notes', headerName: t('notes'), flex: 1.5, valueFormatter: p => p.value || '-' },
  {
    headerName: t('actions'),
    flex: 1.1,
    sortable: false,
    filter: false,
    cellRenderer: p => `<div style="display:flex;gap:4px;padding-top:4px">
      <button data-id="${p.data._id}" data-action="edit" style="background:#F3E5F5;border:none;border-radius:6px;padding:4px 8px;cursor:pointer;color:#7B1FA2;font-size:11px;font-weight:600">${t('edit')}</button>
      <button data-id="${p.data._id}" data-action="delete" style="background:#FFEBEE;border:none;border-radius:6px;padding:4px 8px;cursor:pointer;color:#C62828;font-size:11px;font-weight:600">${t('delete')}</button>
    </div>`,
    onCellClicked: async e => {
      const action = e.event.target?.dataset?.action
      const id = e.event.target?.dataset?.id
      if (!action || !id || isOperationalLocked.value) return
      if (action === 'edit') startEditRejection(e.data)
      if (action === 'delete') await removeRejection(id)
    },
  },
])
const noolCols = computed(() => [
  { field:'date', headerName:t('date'), flex:1, valueFormatter: p=>fmtDate(p.value) },
  { field:'entryType', headerName:t('odType'), flex:0.9, valueFormatter: p=> (p.value === 'return' ? t('odReturnT') : t('odReceiptT')) },
  { field:'dcNumber', headerName:t('dcNumber'), flex:1 },
  { field:'yarnCount', headerName:t('yarnCount'), flex:1 },
  { field:'colour', headerName:t('colour'), flex:1 },
  { field:'noOfPackages', headerName:t('odConeBags'), flex:0.8, valueFormatter: p=>formatFixed2(p.value) },
  { field:'qty', headerName:t('odTotalWeight'), flex:1, valueFormatter: p=>formatFixed2(p.value)+' kg' },
  { field:'notes', headerName:t('notes'), flex:1.2, valueFormatter: p=>p.value||'-' },
  { headerName:t('actions'), flex:1.1, sortable:false, filter:false,
    cellRenderer: p => `<div style="display:flex;gap:4px;padding-top:4px">
      <button data-id="${p.data._id}" data-action="edit" style="background:#F3E5F5;border:none;border-radius:6px;padding:4px 8px;cursor:pointer;color:#7B1FA2;font-size:11px;font-weight:600">${t('edit')}</button>
      <button data-id="${p.data._id}" data-action="delete" style="background:#FFEBEE;border:none;border-radius:6px;padding:4px 8px;cursor:pointer;color:#C62828;font-size:11px;font-weight:600">${t('delete')}</button>
    </div>`,
    onCellClicked: async e => {
      const action = e.event.target?.dataset?.action
      const id = e.event.target?.dataset?.id
      if (!action || !id || isOperationalLocked.value) return
      if (action === 'edit') startEditNool(e.data)
      if (action === 'delete') await removeNool(id)
    },
  },
])

const noolBundleCols = computed(() => [
  { field:'date', headerName:t('date'), flex:1, valueFormatter: p=>fmtDate(p.value) },
  { field:'entryType', headerName:t('odType'), flex:0.9, valueFormatter: p=> (p.value === 'return' ? t('odReturnT') : t('odReceiptT')) },
  { field:'dcNumber', headerName:t('dcNumber'), flex:1 },
  { field:'yarnCount', headerName:t('yarnCount'), flex:1 },
  { field:'colour', headerName:t('colour'), flex:1 },
  { field:'noOfPackages', headerName:t('odNoolKattu'), flex:0.8, valueFormatter: p=>formatFixed2(p.value) },
  { field:'qty', headerName:t('odTotalWeight'), flex:1, valueFormatter: p=>formatFixed2(p.value)+' kg' },
  { field:'notes', headerName:t('notes'), flex:1.2, valueFormatter: p=>p.value||'-' },
  { headerName:t('actions'), flex:1.1, sortable:false, filter:false,
    cellRenderer: p => `<div style="display:flex;gap:4px;padding-top:4px">
      <button data-id="${p.data._id}" data-action="edit" style="background:#F3E5F5;border:none;border-radius:6px;padding:4px 8px;cursor:pointer;color:#7B1FA2;font-size:11px;font-weight:600">${t('edit')}</button>
      <button data-id="${p.data._id}" data-action="delete" style="background:#FFEBEE;border:none;border-radius:6px;padding:4px 8px;cursor:pointer;color:#C62828;font-size:11px;font-weight:600">${t('delete')}</button>
    </div>`,
    onCellClicked: async e => {
      const action = e.event.target?.dataset?.action
      const id = e.event.target?.dataset?.id
      if (!action || !id) return
      if (action === 'edit') startEditNool(e.data)
      if (action === 'delete') await removeNool(id)
    },
  },
])

const coneBagRows = computed(() => (noolRows.value || []).filter(r => r.packageType === 'cone_bag' || !r.packageType))
const noolBundleRows = computed(() => (noolRows.value || []).filter(r => r.packageType === 'nool_bundle'))

const coneBagReceipts = computed(() => coneBagRows.value.filter(r => (r.entryType || 'receipt') === 'receipt'))
const coneBagReturns = computed(() => coneBagRows.value.filter(r => r.entryType === 'return'))
const noolBundleReceipts = computed(() => noolBundleRows.value.filter(r => (r.entryType || 'receipt') === 'receipt'))
const noolBundleReturns = computed(() => noolBundleRows.value.filter(r => r.entryType === 'return'))

function setNoolEntryType(type) {
  noolForm.value.entryType = type
}

function setNoolPackageType(type) {
  noolForm.value.packageType = type
}

function entryStats(rows = []) {
  const received = rows.filter(r => (r.entryType || 'receipt') === 'receipt')
  const returned = rows.filter(r => ['return', 'used'].includes(r.entryType))
  const sumQty = arr => arr.reduce((s, r) => s + Number(r.qty || 0), 0)
  const sumPackages = arr => arr.reduce((s, r) => s + Number(r.noOfPackages || 0), 0)
  const receivedQty = sumQty(received)
  const returnQty = sumQty(returned)
  const receivedPackages = sumPackages(received)
  const returnPackages = sumPackages(returned)
  return {
    receivedQty,
    returnQty,
    netQty: Math.max(0, receivedQty - returnQty),
    receivedPackages,
    returnPackages,
    netPackages: Math.max(0, receivedPackages - returnPackages),
  }
}

const coneBagStats = computed(() => entryStats(coneBagRows.value))
const noolBundleStats = computed(() => entryStats(noolBundleRows.value))
const totalYarnWeight = computed(() => Number((Number(coneBagStats.value.receivedQty || 0) + Number(noolBundleStats.value.receivedQty || 0)).toFixed(2)))
const totalReturnWeight = computed(() => Number((Number(coneBagStats.value.returnQty || 0) + Number(noolBundleStats.value.returnQty || 0)).toFixed(2)))
const totalProductionWeightForShortage = computed(() => {
  const source = productionWeightSource.value === 'history' ? productionWeightTotal.value : productionTotalWeightFromAverage.value
  return Number((Number(source || 0)).toFixed(2))
})
const totalWeightShortage = computed(() => {
  const shortage = Number(totalYarnWeight.value || 0)
    - Number(totalProductionWeightForShortage.value || 0)
    - Number(totalReturnWeight.value || 0)
    - Number(yarnShortageEnteredAmount.value || 0)
  return Number(shortage.toFixed(2))
})

function toInputDate(value) {
  if (!value) return today()
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return today()
  return date.toISOString().slice(0, 10)
}

function sortRowsByDateDesc(rows = []) {
  return [...rows].sort((a, b) => {
    const aTs = new Date(a?.date || 0).getTime()
    const bTs = new Date(b?.date || 0).getTime()
    return bTs - aTs
  })
}

function upsertRowById(rows = [], row) {
  if (!row?._id) return rows
  const idx = rows.findIndex(item => item?._id === row._id)
  if (idx >= 0) {
    const next = [...rows]
    next[idx] = row
    return next
  }
  return [row, ...rows]
}

function clearNoolForm() {
  noolEditId.value = null
  noolForm.value = { date: today(), dcNumber: '', yarnCount: '', yarnCountCustom: '', colour: '', colourCustom: '', entryType: 'receipt', packageType: 'cone_bag', noOfPackages: null, unitWeight: null, qty: null, notes: '' }
  noolDraftLines.value = []
  noolFormRef.value?.resetValidation()
  noolFormKey.value += 1
}

function clearNoolItemFields() {
  noolForm.value.packageType = 'cone_bag'
  noolForm.value.yarnCount = ''
  noolForm.value.yarnCountCustom = ''
  noolForm.value.colour = ''
  noolForm.value.colourCustom = ''
  noolForm.value.noOfPackages = null
  noolForm.value.unitWeight = null
  noolForm.value.qty = null
  noolForm.value.notes = ''
  // Clear field error state after moving one valid line into batch.
  noolFormRef.value?.resetValidation()
}

function autoFillNoolQty() {
  const packages = Number(noolForm.value.noOfPackages || 0)
  const unitWeight = Number(noolForm.value.unitWeight || 0)
  if (packages > 0 && unitWeight > 0) {
    noolForm.value.qty = (packages * unitWeight).toFixed(2)
  }
}

function resolveNoolLineFromForm() {
  const yarnCount = noolForm.value.yarnCount === 'Others'
    ? String(noolForm.value.yarnCountCustom || '').trim()
    : String(noolForm.value.yarnCount || '').trim()
  const colour = noolForm.value.colour === 'Others'
    ? String(noolForm.value.colourCustom || '').trim()
    : String(noolForm.value.colour || '').trim()
  const noOfPackages = Number(noolForm.value.noOfPackages || 0)
  const unitWeight = Number(noolForm.value.unitWeight || 0)
  const manualQty = Number(noolForm.value.qty || 0)
  const qty = manualQty > 0 ? manualQty : (noOfPackages > 0 && unitWeight > 0 ? Number((noOfPackages * unitWeight).toFixed(3)) : 0)
  return {
    packageType: noolForm.value.packageType || 'cone_bag',
    yarnCount,
    colour,
    noOfPackages,
    unitWeight,
    qty,
    notes: String(noolForm.value.notes || '').trim(),
  }
}

async function addNoolDraftLine() {
  if (isOperationalLocked.value) return
  const { valid } = await noolFormRef.value.validate()
  if (!valid) return
  const line = resolveNoolLineFromForm()
  if (!line.yarnCount || !line.colour) return
  noolDraftLines.value.push(line)
  clearNoolItemFields()
}

function removeNoolDraftLine(index) {
  noolDraftLines.value.splice(index, 1)
}

async function saveNoolBatch() {
  if (isOperationalLocked.value) return
  const dateOk = !!noolForm.value.date
  const dcOk = !!String(noolForm.value.dcNumber || '').trim()
  if (!dateOk || !dcOk || !noolDraftLines.value.length) {
    notify.warning(t('odDateDcReq'))
    return
  }
  noolSaving.value = true
  try {
    const common = {
      order: route.params.id,
      date: noolForm.value.date,
      dcNumber: noolForm.value.dcNumber,
      entryType: noolForm.value.entryType || 'receipt',
    }
    const responses = await Promise.all(noolDraftLines.value.map(line => api.post('/nool', {
        ...common,
        packageType: line.packageType || 'cone_bag',
        yarnCount: line.yarnCount,
        colour: line.colour,
        noOfPackages: Number(line.noOfPackages || 0),
        qty: Number(line.qty || 0),
        notes: line.notes || '',
      })))
    const createdRows = responses.map(r => r.data).filter(Boolean)
    if (createdRows.length) {
      noolRows.value = sortRowsByDateDesc([...createdRows, ...noolRows.value])
    }
    clearNoolForm()
    notify.success(`${createdRows.length} nool entr${createdRows.length === 1 ? 'y' : 'ies'} saved`)
  } catch (e) {
    notify.apiError(e, 'Failed to save nool entries')
    loadOrderData('nool')
  } finally {
    noolSaving.value = false
  }
}

function clearProductionForm() {
  prodEditId.value = null
  prodForm.value = { date: today(), dcNumber: '', meter: null, weightKg: null, notes: '' }
  prodFormRef.value?.resetValidation()
  prodFormKey.value += 1
}

function clearRejectionForm() {
  rejectionEditId.value = null
  rejectionForm.value = { date: today(), rejectedQty: null, reason: '', notes: '' }
  rejectionFormRef.value?.resetValidation()
  rejectionFormKey.value += 1
}

function startEditNool(row) {
  const packages = Number(row.noOfPackages || 0)
  const qty = Number(row.qty || 0)
  noolEditId.value = row._id
  noolForm.value = {
    date: toInputDate(row.date),
    dcNumber: row.dcNumber || '',
    yarnCount: row.yarnCount || '',
    yarnCountCustom: '',
    colour: row.colour || '',
    colourCustom: '',
    entryType: row.entryType || 'receipt',
    packageType: row.packageType || 'cone_bag',
    noOfPackages: packages,
    unitWeight: packages > 0 ? Number((qty / packages).toFixed(3)) : null,
    qty,
    notes: row.notes || '',
  }
}

function startEditProduction(row) {
  prodEditId.value = row._id
  prodForm.value = {
    date: toInputDate(row.date),
    dcNumber: row.dcNumber || '',
    meter: Number(row.meter || 0),
    weightKg: row.weightKg == null ? null : Number(row.weightKg),
    notes: row.notes || '',
  }
}

function startEditRejection(row) {
  rejectionEditId.value = row._id
  rejectionForm.value = {
    date: toInputDate(row.date),
    rejectedQty: Number(row.rejectedQty || 0),
    reason: row.reason || '',
    notes: row.notes || '',
  }
}

async function loadOrderData(scope = 'all') {
  const id = route.params.id
  if (!id || id === 'undefined' || id === 'null') {
    orderLoading.value = false
    orderNotFound.value = true
    await router.replace({ name: 'orders' })
    return
  }
  const shouldLoadOrder = scope === 'all' || scope === 'production' || scope === 'rejection'
  const shouldLoadProduction = scope === 'all' || scope === 'production'
  const shouldLoadNool = scope === 'all' || scope === 'nool'
  const shouldLoadRejections = scope === 'all' || scope === 'rejection'

  try {
    const [ord, prod, nool, rej, colour] = await Promise.all([
      shouldLoadOrder ? api.get(`/orders/${id}`).then(r => r.data) : Promise.resolve(null),
      shouldLoadProduction ? api.get('/production', { params: { orderId: id } }).then(r => r.data).catch(() => []) : Promise.resolve(null),
      shouldLoadNool ? api.get('/nool', { params: { orderId: id } }).then(r => r.data).catch(() => []) : Promise.resolve(null),
      shouldLoadRejections ? api.get('/rejections', { params: { orderId: id } }).then(r => r.data).catch(() => []) : Promise.resolve(null),
      shouldLoadProduction ? api.get('/colour-production', { params: { orderId: id } }).then(r => r.data).catch(() => []) : Promise.resolve(null),
    ])
    if (ord) order.value = ord
    if (prod) productions.value = prod
    if (nool) noolRows.value = nool
    if (rej) rejections.value = rej
    if (colour) colourProductions.value = colour
    orderNotFound.value = false
  } catch (e) {
    if (e?.response?.status === 404) {
      orderNotFound.value = true
    } else {
      notify.apiError(e, 'Failed to load order')
    }
  } finally {
    orderLoading.value = false
  }
  loadOrderHistory()
}

async function loadOrderHistory() {
  try {
    const { data } = await api.get(`/orders/${route.params.id}/history`)
    orderHistory.value = data || []
  } catch { orderHistory.value = [] }
}

function historyActionLabel(action) {
  const labels = { created: t('odStOrderCreated'), production_complete: t('odStProdDone'), closed: t('odStClosed'), reopened: t('odStReopened'), deleted: t('odStDeleted') }
  return labels[action] || action
}

function historyActionColor(action) {
  const colors = { created: 'blue', production_complete: 'green', closed: 'purple', reopened: 'orange', deleted: 'red' }
  return colors[action] || 'grey'
}

async function addNoolEntry() {
  if (isOperationalLocked.value) return
  if (!noolEditId.value) {
    await addNoolDraftLine()
    return
  }
  const { valid } = await noolFormRef.value.validate()
  if (!valid) return
  noolSaving.value = true
  try {
    const line = resolveNoolLineFromForm()
    const payload = {
      order: route.params.id,
      date: noolForm.value.date,
      dcNumber: noolForm.value.dcNumber,
      yarnCount: line.yarnCount,
      colour: line.colour,
      qty: Number(line.qty || 0),
      entryType: noolForm.value.entryType || 'receipt',
      packageType: line.packageType || 'cone_bag',
      noOfPackages: Number(line.noOfPackages || 0),
      notes: line.notes || '',
    }
    const { data } = noolEditId.value
      ? await api.put(`/nool/${noolEditId.value}`, payload)
      : await api.post('/nool', payload)
    const wasEdit = !!noolEditId.value
    noolRows.value = sortRowsByDateDesc(upsertRowById(noolRows.value, data))
    clearNoolForm()
    noolFormRef.value?.resetValidation()
    notify.success(wasEdit ? 'Nool entry updated' : 'Nool entry added')
  } catch (e) {
    notify.apiError(e, 'Failed to save nool entry')
  } finally {
    noolSaving.value = false
  }
}

async function addProductionEntry() {
  if (isOperationalLocked.value) return
  const { valid } = await prodFormRef.value.validate()
  if (!valid) return
  prodSaving.value = true
  try {
    const payload = {
      order: route.params.id,
      date: prodForm.value.date,
      dcNumber: prodForm.value.dcNumber,
      meter: Number(prodForm.value.meter || 0),
      weightKg: prodForm.value.weightKg == null || prodForm.value.weightKg === '' ? null : Number(prodForm.value.weightKg),
      notes: prodForm.value.notes || '',
      shift: 'day',
      machineNo: 1,
    }
    const { data } = prodEditId.value
      ? await api.put(`/production/${prodEditId.value}`, payload)
      : await api.post('/production', payload)
    const wasEdit = !!prodEditId.value
    if (data?.entry) {
      productions.value = sortRowsByDateDesc(upsertRowById(productions.value, data.entry))
    }
    if (data?.order) {
      order.value = data.order
      orderStore.upsertLocal(data.order)
    }
    clearProductionForm()
    prodFormRef.value?.resetValidation()
    notify.success(wasEdit ? 'Production entry updated' : 'Production entry added')
  } catch (e) {
    notify.apiError(e, 'Failed to save production entry')
  } finally {
    prodSaving.value = false
  }
}

async function removeNool(id) {
  if (isOperationalLocked.value) return
  const ok = await confirm()
  if (!ok) return
  try {
    await loader.run(api.delete(`/nool/${id}`), t('deletingMsg'))
    noolRows.value = noolRows.value.filter(row => row?._id !== id)
    if (noolEditId.value === id) clearNoolForm()
    notify.success(t('odNoolDeleted'))
  } catch (e) {
    notify.apiError(e, 'Failed to delete nool entry')
  }
}

function clearColourForm() {
  colourEditId.value = null
  colourForm.value = { date: today(), colour: '', meter: null, notes: '' }
}

function startEditColour(row) {
  colourEditId.value = row._id
  colourForm.value = {
    date: toInputDate(row.date),
    colour: row.colour || '',
    meter: Number(row.meter || 0),
    notes: row.notes || '',
  }
}

async function saveColourEntry() {
  if (isOperationalLocked.value || colourSaving.value) return
  const f = colourForm.value
  const colour = String(f.colour || '').trim()
  const meter = Number(f.meter || 0)
  if (!f.date || !colour || !(meter > 0)) {
    notify.warning(t('odDesignMeterReq'))
    return
  }
  colourSaving.value = true
  try {
    const payload = { order: route.params.id, date: f.date, colour, meter, notes: String(f.notes || '').trim() }
    const isEdit = !!colourEditId.value
    const { data } = isEdit
      ? await api.put(`/colour-production/${colourEditId.value}`, payload)
      : await api.post('/colour-production', payload)
    colourProductions.value = sortRowsByDateDesc(upsertRowById(colourProductions.value, data))
    notify.success(isEdit ? 'Design entry updated' : 'Design entry added')
    clearColourForm()
  } catch (e) {
    notify.apiError(e, 'Failed to save design entry')
  } finally {
    colourSaving.value = false
  }
}

async function removeColourEntry(id) {
  if (isOperationalLocked.value) return
  const ok = await confirm()
  if (!ok) return
  try {
    await loader.run(api.delete(`/colour-production/${id}`), t('deletingMsg'))
    colourProductions.value = colourProductions.value.filter(row => row?._id !== id)
    if (colourEditId.value === id) clearColourForm()
    notify.success(t('odDesignDeleted'))
  } catch (e) {
    notify.apiError(e, 'Failed to delete design entry')
  }
}

async function removeProduction(id) {
  if (isOperationalLocked.value) return
  const ok = await confirm()
  if (!ok) return
  try {
    const { data } = await loader.run(api.delete(`/production/${id}`), t('deletingMsg'))
    productions.value = productions.value.filter(row => row?._id !== id)
    if (data?.order) {
      order.value = data.order
      orderStore.upsertLocal(data.order)
    }
    if (prodEditId.value === id) clearProductionForm()
    notify.success(t('odProdDeleted'))
  } catch (e) {
    notify.apiError(e, 'Failed to delete production entry')
  }
}

async function saveRejectionEntry() {
  if (isOperationalLocked.value) return
  const { valid } = await rejectionFormRef.value.validate()
  if (!valid) return
  rejectionSaving.value = true
  try {
    const payload = {
      order: route.params.id,
      date: rejectionForm.value.date,
      rejectedQty: Number(rejectionForm.value.rejectedQty || 0),
      reason: rejectionForm.value.reason || '',
      notes: rejectionForm.value.notes || '',
    }

    const { data } = rejectionEditId.value
      ? await api.put(`/rejections/${rejectionEditId.value}`, payload)
      : await api.post('/rejections', payload)
    const wasEdit = !!rejectionEditId.value
    if (data?.entry) {
      rejections.value = sortRowsByDateDesc(upsertRowById(rejections.value, data.entry))
    }
    if (data?.order) {
      order.value = data.order
      orderStore.upsertLocal(data.order)
    }

    clearRejectionForm()
    notify.success(wasEdit ? 'Rejection updated' : 'Rejection added')
  } catch (error) {
    notify.apiError(error, 'Failed to save rejection')
  } finally {
    rejectionSaving.value = false
  }
}

async function removeRejection(id) {
  if (isOperationalLocked.value) return
  const ok = await confirm()
  if (!ok) return
  try {
    const { data } = await loader.run(api.delete(`/rejections/${id}`), t('deletingMsg'))
    rejections.value = rejections.value.filter(row => row?._id !== id)
    if (data?.order) {
      order.value = data.order
      orderStore.upsertLocal(data.order)
    }
    if (rejectionEditId.value === id) clearRejectionForm()
    notify.success(t('odRejDeleted'))
  } catch (error) {
    notify.apiError(error, 'Failed to delete rejection')
  }
}

function openCompleteOrderDialog() {
  if (!hasProductionHistory.value) {
    notify.warning(t('odAddAtLeastOne'))
    return
  }
  completeOrderDialog.value = true
}

async function confirmCompleteOrder() {
  completingOrder.value = true
  try {
    const res = await api.patch(`/orders/${route.params.id}/production-complete`)
    order.value = res.data
    orderStore.upsertLocal(res.data)
    completeOrderDialog.value = false
    notify.success(t('odProdCompleteOk'))
    celebrate()
    loadOrderHistory()
  } catch (error) {
    notify.apiError(error, 'Failed to complete production')
  } finally {
    completingOrder.value = false
  }
}

async function openArchiveDialog() {
  try {
    const { data } = await loader.run(api.get(`/orders/${route.params.id}/archive-info`))
    if (!data.canArchive) return notify.warning(t('archOnlyClosed'))
    archiveInfo.value = data
    archiveSurplus.value = 0
    archiveDialog.value = true
  } catch (error) {
    notify.apiError(error, t('archInfoFailed'))
  }
}

async function confirmArchiveOrder() {
  if (archiveSurplusError.value) return
  archivingOrder.value = true
  try {
    const surplusToDeduction = Number(archiveSurplus.value || 0)
    const { data } = await api.patch(`/orders/${route.params.id}/archive`, { surplusToDeduction })
    order.value = data
    orderStore.upsertLocal(data)
    archiveDialog.value = false
    notify.success(t('archDone'))
    celebrate()
    loadOrderHistory()
  } catch (error) {
    notify.apiError(error, t('archFailed'))
  } finally {
    archivingOrder.value = false
  }
}

async function reopenOrder() {
  let info
  try {
    const r = await loader.run(api.get(`/orders/${route.params.id}/reopen-info`))
    info = r.data
  } catch (e) {
    notify.apiError(e, 'Failed to load reopen info')
    return
  }

  const ok = await confirm({
    title: t('odReopenTitle'),
    message: `This will revert the order to "Open" status and free ${fmt(info.freedAmount)} back to company balance.\n\nCurrent balance: ${fmt(info.currentBalance)}\nBalance after reopen: ${fmt(info.currentBalance + info.freedAmount)}`,
    confirmText: t('odReopenBtn'),
    confirmColor: 'warning',
  })
  if (!ok) return
  reopeningOrder.value = true
  try {
    const { data } = await api.patch(`/orders/${route.params.id}/reopen`, { reason: '' })
    order.value = data
    orderStore.upsertLocal(data)
    notify.success(t('odReopenedOk'))
    loadOrderHistory()
  } catch (error) {
    notify.apiError(error, 'Failed to reopen order')
  } finally {
    reopeningOrder.value = false
  }
}

async function openCloseOrderDialog() {
  try {
    const { data } = await loader.run(api.get(`/orders/${route.params.id}/close-info`))
    closeInfo.value = data
    closeOrderDialog.value = true
  } catch (error) {
    notify.apiError(error, 'Failed to load close info')
  }
}

async function confirmCloseOrder() {
  closingOrder.value = true
  try {
    const { data } = await api.patch(`/orders/${route.params.id}/close`)
    order.value = data
    orderStore.upsertLocal(data)
    closeOrderDialog.value = false
    notify.success(t('odClosedAllocOk'))
    celebrate('cannons')
    loadOrderHistory()
  } catch (error) {
    notify.apiError(error, 'Failed to close order')
  } finally {
    closingOrder.value = false
  }
}

async function repeatOrder() {
  return confirmRepeatOrder()
}

async function confirmRepeatOrder() {
  const { valid } = await repeatOrderFormRef.value.validate()
  if (!valid) return

  repeatingOrder.value = true
  try {
    const { data } = await api.post(`/orders/${route.params.id}/repeat`, {
      startDate: repeatOrderForm.value.startDate,
    })
    orderStore.upsertLocal(data)
    repeatOrderDialog.value = false
    notify.success(`Order repeated as ${data.orderName}`)
    await router.push(`/orders/${data._id}`)
  } catch (error) {
    notify.apiError(error, 'Failed to repeat order')
  } finally {
    repeatingOrder.value = false
  }
}

onMounted(async () => {
  await loadOrderData()
  avgWeightHydrating.value = true
  avgWeightPerMeter.value = sanitizeAvgWeight(order.value?.averageWeightPerMeter)
  avgWeightDirty.value = false
  avgWeightHydrating.value = false
  yarnShortageHydrating.value = true
  yarnShortageEnteredAmount.value = sanitizeNonNegative(order.value?.yarnShortageEnteredAmount)
  yarnShortageDirty.value = false
  yarnShortageHydrating.value = false
})

watch(() => route.params.id, async (newId, oldId) => {
  // Leaving this page clears the param; do not reload or redirect in that case
  if (!newId) return
  if (yarnShortageSaveTimer) {
    clearTimeout(yarnShortageSaveTimer)
    yarnShortageSaveTimer = null
  }
  if (avgWeightDirty.value && oldId) {
    await updateAvgWeightPerMeter(avgWeightPerMeter.value, oldId)
  }
  if (yarnShortageDirty.value && oldId) {
    await updateYarnShortageEnteredAmount(yarnShortageEnteredAmount.value, oldId)
  }
  avgWeightDirty.value = false
  yarnShortageDirty.value = false
  clearNoolForm()
  clearProductionForm()
  clearRejectionForm()
  await loadOrderData()
  avgWeightHydrating.value = true
  avgWeightPerMeter.value = sanitizeAvgWeight(order.value?.averageWeightPerMeter)
  avgWeightDirty.value = false
  avgWeightHydrating.value = false
  yarnShortageHydrating.value = true
  yarnShortageEnteredAmount.value = sanitizeNonNegative(order.value?.yarnShortageEnteredAmount)
  yarnShortageDirty.value = false
  yarnShortageHydrating.value = false
})

watch(() => order.value?.sampleImage, () => {
  sampleImageLoadFailed.value = false
})

onBeforeUnmount(() => {
  if (yarnShortageSaveTimer) {
    clearTimeout(yarnShortageSaveTimer)
    yarnShortageSaveTimer = null
  }
})

// Spotlight position for the hovered card (CSS variables only)
let fxFrame = 0
function onFx(e) {
  if (fxFrame || e.pointerType === 'touch') return
  const { clientX, clientY, target } = e
  fxFrame = requestAnimationFrame(() => {
    fxFrame = 0
    const card = target?.closest?.('.od-kpi-tile, .od-insight, .od-info-cell, .od-page .at-card')
    if (!card) return
    const r = card.getBoundingClientRect()
    card.style.setProperty('--mx', `${clientX - r.left}px`)
    card.style.setProperty('--my', `${clientY - r.top}px`)
  })
}
onBeforeUnmount(() => { if (fxFrame) cancelAnimationFrame(fxFrame) })

</script>

<style scoped>
/* ═══════════════════════════════════════════════════════════════
   ORDER DETAIL VIEW — Modern Clean Design
   ═══════════════════════════════════════════════════════════════ */

/* ── Not Found Page ────────────────────────────────────────── */
.not-found-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 70vh;
}

.not-found-card {
  text-align: center;
  max-width: 440px;
  width: 100%;
  box-sizing: border-box;
  padding: clamp(28px, 8vw, 48px) clamp(18px, 6vw, 40px);
  background: #fff;
  border-radius: 24px;
  border: 1px solid #EEF2F6;
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.04), 0 2px 8px rgba(0, 0, 0, 0.02);
}

.not-found-illustration {
  margin-bottom: 28px;
}

.not-found-circle {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  background: linear-gradient(135deg, #F1F5F9 0%, #E2E8F0 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16px;
  position: relative;
}

.not-found-circle::before {
  content: '';
  position: absolute;
  inset: -6px;
  border-radius: 50%;
  border: 2px dashed #CBD5E1;
  animation: spin 20s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.not-found-icon-wrap {
  width: 64px;
  height: 64px;
  border-radius: 16px;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.not-found-dots {
  display: flex;
  justify-content: center;
  gap: 6px;
}

.not-found-dots span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #CBD5E1;
  animation: pulse 1.5s ease-in-out infinite;
}

.not-found-dots span:nth-child(2) { animation-delay: 0.2s; }
.not-found-dots span:nth-child(3) { animation-delay: 0.4s; }

@keyframes pulse {
  0%, 100% { opacity: 0.3; transform: scale(0.8); }
  50% { opacity: 1; transform: scale(1.2); }
}

.not-found-content {
  margin-bottom: 28px;
}

.not-found-title {
  font-size: 22px;
  font-weight: 800;
  color: #1E293B;
  margin-bottom: 8px;
  letter-spacing: -0.3px;
}

.not-found-desc {
  font-size: 14px;
  color: #64748B;
  line-height: 1.5;
  margin-bottom: 20px;
}

.not-found-hints {
  display: flex;
  flex-direction: column;
  gap: 8px;
  text-align: left;
  background: #F8FAFC;
  border-radius: 12px;
  padding: 14px 16px;
  border: 1px solid #EEF2F6;
}

.not-found-hint {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #64748B;
}

.not-found-actions {
  display: flex;
  justify-content: center;
  gap: 10px;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
}

.loading-text {
  font-size: 13px;
  color: #64748B;
  font-weight: 500;
}

/* ── Order History ─────────────────────────────────────────── */
.order-history-list {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.order-history-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid #F1F5F9;
  position: relative;
}

.order-history-item:last-child {
  border-bottom: none;
}

.order-history-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  margin-top: 4px;
  flex-shrink: 0;
}

.order-history-dot.blue { background: #1565C0; }
.order-history-dot.green { background: #2E7D32; }
.order-history-dot.purple { background: #6A1B9A; }
.order-history-dot.orange { background: #E65100; }
.order-history-dot.red { background: #C62828; }
.order-history-dot.grey { background: #94A3B8; }

.order-history-content {
  flex: 1;
  min-width: 0;
}

.order-history-action {
  font-size: 13px;
  font-weight: 700;
  color: #1E293B;
}

.order-history-meta {
  font-size: 11px;
  color: #64748B;
  display: flex;
  gap: 8px;
  margin-top: 2px;
}

.order-history-reason {
  font-style: italic;
  color: #94A3B8;
}

/* ── Hero Card ─────────────────────────────────────────────── */
.order-hero {
  position: relative;
  background: #fff;
  border: 1px solid #E2E8F0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  overflow: hidden;
}

.order-hero::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, #1565C0 0%, #42A5F5 50%, #2E7D32 100%);
}

.order-hero-top {
  position: relative;
}

.order-hero-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 22px;
  font-weight: 800;
  color: #1E293B;
  letter-spacing: -0.3px;
}

.order-hero-value {
  color: #0F172A;
}

.order-hero-sub {
  display: flex;
  align-items: center;
  margin-top: 4px;
  font-size: 14px;
  color: #64748B;
}

.order-hero-company {
  margin-left: 4px;
  font-weight: 700;
  color: #334155;
}

/* ── Status Badge ──────────────────────────────────────────── */
.status-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 7px 14px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  border: 1px solid transparent;
  flex-shrink: 0;
  white-space: nowrap;
  margin-left: 16px;
  letter-spacing: 0.2px;
}

.status-badge.active {
  background: #EFF6FF;
  color: #1565C0;
  border-color: #BFDBFE;
}

.status-badge.done {
  background: #ECFDF5;
  color: #2E7D32;
  border-color: #A7F3D0;
}

/* ── Hero Metrics ──────────────────────────────────────────── */
.order-hero-metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.hero-metric {
  background: #F8FAFC;
  border: 1px solid #E2E8F0;
  border-radius: 12px;
  padding: 14px 16px;
  transition: all 0.15s;
}

.hero-metric:hover {
  background: #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.hero-label {
  font-size: 11px;
  font-weight: 600;
  color: #64748B;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.hero-value {
  margin-top: 4px;
  font-size: 20px;
  font-weight: 800;
  color: #1565C0;
}

/* ── Close Flow ────────────────────────────────────────────── */
.close-flow-wrap {
  border: 1px solid #E2E8F0;
  background: #F8FAFC;
  border-radius: 12px;
  padding: 14px 18px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.close-flow-title {
  font-size: 14px;
  font-weight: 700;
  color: #1E293B;
}

.close-flow-sub {
  font-size: 12px;
  color: #64748B;
  margin-top: 1px;
}

.close-flow-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

/* ── Complete Order Banner ─────────────────────────────────── */
.complete-order-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  background: #ECFDF5;
  border: 1px solid #A7F3D0;
  border-radius: 12px;
  padding: 16px 20px;
}

.complete-order-banner-left {
  display: flex;
  align-items: center;
  gap: 4px;
  flex: 1;
  min-width: 0;
}

.complete-order-banner-title {
  font-size: 14px;
  font-weight: 700;
  color: #065F46;
}

.complete-order-banner-sub {
  font-size: 12px;
  color: #047857;
  margin-top: 2px;
}

.complete-order-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: #059669;
  color: #fff;
  border: none;
  border-radius: 10px;
  padding: 10px 20px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
  letter-spacing: 0.3px;
  box-shadow: 0 2px 8px rgba(5, 150, 105, 0.2);
  transition: all 0.15s;
}

.complete-order-btn:hover {
  background: #047857;
  box-shadow: 0 4px 14px rgba(5, 150, 105, 0.3);
  transform: translateY(-1px);
}

/* ── Complete Order Dialog ─────────────────────────────────── */
.complete-dialog-header {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 20px 24px;
}

.complete-dialog-header.warn {
  background: #FFFBEB;
  border-bottom: 2px solid #FCD34D;
}

.complete-dialog-header.ok {
  background: #ECFDF5;
  border-bottom: 2px solid #6EE7B7;
}

.complete-dialog-icon-wrap {
  width: 52px;
  height: 52px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.complete-dialog-header.warn .complete-dialog-icon-wrap {
  background: #D97706;
}

.complete-dialog-header.ok .complete-dialog-icon-wrap {
  background: #059669;
}

.complete-dialog-title {
  font-size: 17px;
  font-weight: 800;
  color: #1E293B;
}

.complete-dialog-subtitle {
  font-size: 13px;
  color: #64748B;
  margin-top: 2px;
}

.complete-dialog-warn-box {
  background: #FFFBEB;
  border: 1px solid #FDE68A;
  border-radius: 12px;
  padding: 16px 18px;
}

.complete-dialog-warn-row {
  display: flex;
  align-items: center;
  justify-content: space-around;
  gap: 8px;
  margin-bottom: 10px;
}

.complete-dialog-warn-stat {
  text-align: center;
}

.complete-dialog-warn-num {
  font-size: 18px;
  font-weight: 800;
  color: #B45309;
}

.complete-dialog-warn-label {
  font-size: 11px;
  color: #92400E;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-top: 2px;
}

.complete-dialog-warn-msg {
  font-size: 12.5px;
  color: #92400E;
  border-top: 1px solid #FDE68A;
  padding-top: 10px;
  line-height: 1.5;
}

/* ── Repeat Order ──────────────────────────────────────────── */
.repeat-order-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  background: #F8FAFC;
  border: 1px solid #E2E8F0;
  border-radius: 12px;
  padding: 16px 18px;
  transition: all 0.15s;
}

.repeat-order-footer:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.repeat-order-footer-copy {
  min-width: 0;
}

.repeat-order-footer-title {
  font-size: 14px;
  font-weight: 700;
  color: #1E293B;
}

.repeat-order-footer-sub {
  font-size: 12px;
  color: #64748B;
  margin-top: 2px;
}

.repeat-dialog-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 18px 20px;
  background: #F0F7FF;
  border-bottom: 1px solid #BFDBFE;
}

.repeat-dialog-title {
  font-size: 16px;
  font-weight: 800;
  color: #1E293B;
}

.repeat-dialog-subtitle {
  font-size: 12px;
  color: #64748B;
  margin-top: 1px;
}

/* ── KPI Card & Metrics ────────────────────────────────────── */
.overview-row {
  margin-bottom: 2px;
}

.order-kpi-card {
  background: #fff;
  border: 1px solid #E2E8F0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.order-kpi-meters-row {
  row-gap: 10px;
}

.order-kpi-label {
  font-size: 11px;
  font-weight: 600;
  color: #64748B;
  text-transform: uppercase;
  letter-spacing: 0.2px;
  line-height: 1.25;
}

.order-kpi-value {
  font-weight: 800;
  font-size: clamp(22px, 3vw, 32px);
  line-height: 1.1;
  color: #1E293B;
  white-space: nowrap;
}

.order-kpi-value.c-produced { color: #1565C0; }
.order-kpi-value.c-rejected { color: #C62828; }
.order-kpi-value.c-accepted { color: #2E7D32; }
.order-kpi-value.c-remaining { color: #E65100; }
.order-kpi-value.c-over { color: #7B1FA2; }

.od-section-head {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  border-bottom: 1px solid #E0E7EF;
  font-size: 15px;
  font-weight: 700;
  color: #1E293B;
}

.od-flex-col { display: flex; flex-direction: column; }
.od-flex-col > .od-dates { margin-top: auto; }
.od-flex-col > .od-alerts { margin-top: 12px; }
.od-flex-col > .order-kpi-meters-row { flex: 1; align-content: stretch; }
.order-kpi-meters-row > .v-col { display: flex; }
.od-empty {
  padding: 56px 16px;
  text-align: center;
  color: #64748B;
  font-size: 13px;
}

.od-alerts {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 12px;
}

.od-alert {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 500;
}

.od-alert.is-info { background: #EAF2FF; color: #1565C0; }
.od-alert.is-warn { background: #FFF7E6; color: #B45309; }
.od-alert.is-danger { background: #FDECEC; color: #C62828; }
.od-alert.is-ok { background: #E8F7EE; color: #2E7D32; }

/* ── Order Insights Grid ───────────────────────────────────── */
.order-insights {
  margin-top: 14px;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.order-insight-item {
  border: 1px solid #E2E8F0;
  border-radius: 12px;
  padding: 14px 16px;
  background: #FAFCFF;
  min-height: 72px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  transition: all 0.15s;
}

.order-insight-item:hover {
  background: #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  transform: translateY(-1px);
}

.order-insight-label {
  font-size: 11px;
  font-weight: 600;
  color: #64748B;
  text-transform: uppercase;
  letter-spacing: 0.2px;
}

.order-insight-value {
  margin-top: 6px;
  font-size: 15px;
  font-weight: 700;
  color: #1E293B;
  line-height: 1.35;
}

/* ── Financial Summary ─────────────────────────────────────── */
.summary-col {
  display: flex;
}

.overview-left-col {
  display: flex;
  flex-direction: column;
}

.colour-prod-card {
  flex: 1;
}

.financial-summary-card {
  width: 100%;
  height: 100%;
  background: #fff;
  border: 1px solid #E2E8F0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.financial-summary-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 12px;
}

.financial-summary-content {
  min-width: 038
}


.financial-summary-head {
  margin-bottom: 12px;
}

.financial-sample-wrap {
  width: 100%;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid #E2E8F0;
  background: #F8FAFC;
}

.financial-sample-image {
  width: 100%;
  height: auto;
  aspect-ratio: 4 / 3;
  object-fit: cover;
  display: block;
  background: #F8FAFC;
  cursor: pointer;
  transition: transform 0.2s;
}

.financial-sample-image:hover {
  transform: scale(1.02);
}


.colour-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.colour-chip {
  padding: 4px 10px;
  border-radius: 999px;
  background: #EAF2FF;
  color: #1565C0;
  font-size: 12px;
}

.colour-actions {
  gap: 8px;
}

.colour-table-wrap {
  max-height: 300px;
  overflow: auto;
  border: 1px solid #E0E7EF;
  border-radius: 12px;
}

.colour-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.colour-table th,
.colour-table td {
  padding: 10px 12px;
  text-align: left;
  border-bottom: 1px solid #EEF2F7;
}

.colour-table thead th {
  position: sticky;
  top: 0;
  background: #F8FAFC;
  color: #64748B;
  font-size: 11.5px;
  text-transform: uppercase;
  letter-spacing: 0.4px;
}

.colour-table .design-group-row td {
  background: #F1F5F9;
  cursor: pointer;
  font-size: 14px;
  color: #1E293B;
  padding-top: 12px;
  padding-bottom: 12px;
}

.colour-table .entry-row td {
  color: #334155;
}

.colour-table .entry-row .num {
  font-weight: 500;
}

.colour-table .entry-label {
  padding-left: 24px;
  color: #94A3B8;
  font-size: 12px;
}

.colour-table tr.is-editing td {
  background: #F3E5F5;
}

.colour-table .num {
  text-align: right;
  font-variant-numeric: tabular-nums;
  font-weight: 700;
}

.colour-table .actions {
  text-align: right;
  white-space: nowrap;
  width: 1%;
}

.colour-table tbody + tbody .design-group-row td {
  border-top: 10px solid #FFFFFF;
}

.colour-table tfoot td {
  font-weight: 800;
  font-size: 14px;
  color: #1E293B;
  background: #E8EEF6;
  border-top: 2px solid #94A3B8;
  border-bottom: none;
  padding: 12px;
  position: sticky;
  bottom: 0;
}

.colour-empty {
  text-align: center;
  color: #94A3B8;
  padding: 40px 12px !important;
}

.financial-sample-image.is-placeholder {
  opacity: 0.85;
}

.financial-sample-hover {
  padding: 8px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 12px 32px rgba(15, 23, 42, 0.25);
}

.financial-sample-hover img {
  display: block;
  width: 480px;
  max-width: 100%;
  height: auto;
  aspect-ratio: 4 / 3;
  object-fit: cover;
  border-radius: 8px;
}

/* ── Close Order & Pay dialog ─────────────────────────────────────────── */
.co-dialog {
  background: var(--pay-bg) !important;
  overflow: hidden;
  box-shadow: var(--pay-shadow-lg);
  display: flex;
  flex-direction: column;
  max-height: calc(100vh - 48px);
}

.v-dialog--fullscreen .co-dialog { max-height: none; height: 100%; border-radius: 0 !important; }

.co-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 20px;
  background: #fff;
  border-bottom: 1px solid var(--pay-border);
}

.co-head-left { display: flex; align-items: center; gap: 14px; min-width: 0; }
.co-head-text { min-width: 0; }
.co-title { font-size: 18px; font-weight: 800; color: #0D1B3E; letter-spacing: -0.3px; line-height: 1.2; }
.co-sub { font-size: 12.5px; color: var(--pay-muted); margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.co-close-btn { color: var(--pay-muted) !important; border: 1px solid var(--pay-border); border-radius: 10px !important; }

.co-body {
  padding: 16px 20px 8px !important;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow-y: auto;
}

.co-section { padding: 14px 16px; }

.co-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.co-cell { min-width: 0; }
.co-cell-label { font-size: 11.5px; font-weight: 600; color: var(--pay-muted); }
.co-cell-value { font-size: 16px; font-weight: 800; color: var(--pay-text); margin-top: 2px; font-variant-numeric: tabular-nums; }
.co-cell-value.c-blue { color: var(--pay-primary); }
.co-cell-value.c-red { color: var(--pay-danger); }

.co-payable {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 14px;
  padding: 12px 14px;
  border-radius: var(--pay-radius-sm);
  background: var(--pay-success-bg);
}

.co-payable-label { font-size: 12px; font-weight: 700; color: var(--pay-success); text-transform: uppercase; letter-spacing: 0.4px; }
.co-payable-value { font-size: 22px; font-weight: 900; color: var(--pay-success); font-variant-numeric: tabular-nums; }

.co-balance.is-ok { border-color: #C8E6C9; }
.co-balance.is-short { border-color: #F5C6C6; }

.co-balance-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.co-balance-left { display: flex; align-items: center; gap: 12px; }
.co-balance-value { font-size: 20px; font-weight: 800; margin-top: 2px; font-variant-numeric: tabular-nums; }
.co-balance-value.c-green { color: var(--pay-success); }
.co-balance-value.c-red { color: var(--pay-danger); }

.co-note {
  margin-top: 10px;
  padding: 9px 12px;
  border-radius: var(--pay-radius-sm);
  font-size: 12.5px;
  font-weight: 600;
}

.co-note--ok { background: var(--pay-success-bg); color: var(--pay-success); }
.co-note--danger { background: var(--pay-danger-bg); color: var(--pay-danger); }
.co-note--warn { background: var(--pay-pending-bg); color: var(--pay-pending); }

.co-copy { font-size: 13px; color: var(--pay-neutral); line-height: 1.6; margin: 0; }
.co-copy--muted { font-size: 11.5px; color: var(--pay-faint); }

.co-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  padding: 14px 20px 18px;
}

.co-confirm { min-width: 160px; }

@media (max-width: 599px) {
  .co-grid { grid-template-columns: 1fr 1fr; gap: 10px; }
  .co-actions { flex-direction: column-reverse; align-items: stretch; }
  .co-confirm { min-width: 0; }
}

.image-preview-card {
  background: #0F172A;
}

.image-preview-wrap {
  padding: 0 16px 18px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.image-preview-img {
  width: 100%;
  max-height: 80vh;
  object-fit: contain;
  border-radius: 10px;
}

.financial-summary-title {
  font-size: 13px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: #1565C0;
}

.financial-summary-sub {
  margin-top: 2px;
  font-size: 11px;
  color: #64748B;
}

.financial-summary-grid {
  margin-top: 4px;
}

.financial-summary-item {
  position: relative;
  overflow: hidden;
  background: #FAFCFF;
  border: 1px solid #E2E8F0;
  border-radius: 12px;
  padding: 14px 14px 14px 18px;
  transition: all 0.15s;
}

.financial-summary-item:hover {
  background: #fff;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04);
}

.financial-summary-item::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  width: 4px;
  height: 100%;
  border-radius: 4px 0 0 4px;
  background: var(--tone, #1565C0);
}

.financial-summary-label {
  font-size: 11px;
  font-weight: 600;
  color: #64748B;
}

.financial-summary-value {
  margin-top: 4px;
  font-size: 26px;
  font-weight: 800;
  line-height: 1.05;
}

/* ── Nool Package Type Toggle ──────────────────────────────── */
.nool-type-toggle {
  display: flex;
  gap: 4px;
  background: #F1F5F9;
  border-radius: 10px;
  padding: 4px;
  width: fit-content;
}

.nool-type-btn {
  display: flex;
  align-items: center;
  padding: 8px 18px;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  color: #64748B;
  background: transparent;
  cursor: pointer;
  transition: all 0.2s;
}

.nool-type-btn.active {
  background: #fff;
  color: #1565C0;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
  font-weight: 700;
}

.nool-type-btn:hover:not(.active) {
  background: rgba(255, 255, 255, 0.6);
  color: #334155;
}

.nool-yarn-emoji {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  line-height: 1;
}

.nool-yarn-emoji-lg {
  font-size: 28px;
}

/* ── Nool Entry Toggle ─────────────────────────────────────── */
.nool-entry-toggle {
  display: flex;
  gap: 8px;
}

.nool-entry-btn {
  display: inline-flex;
  align-items: center;
  border: 1px solid #E2E8F0;
  background: #F8FAFC;
  color: #475569;
  border-radius: 999px;
  padding: 7px 14px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
}

.nool-entry-btn:hover {
  border-color: #CBD5E1;
  background: #fff;
}

.nool-entry-btn.active {
  border-color: #1565C0;
  background: #EFF6FF;
  color: #1565C0;
}

.nool-entry-btn.return.active {
  border-color: #E65100;
  background: #FFF7ED;
  color: #E65100;
}

/* ── Nool Collapsible Sections ─────────────────────────────── */
.nool-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-radius: 12px;
  border: 1px solid #E2E8F0;
  background: #FAFCFF;
  cursor: pointer;
  user-select: none;
  transition: all 0.15s;
}

.nool-section-header:hover {
  background: #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  transform: translateY(-1px);
}

.nool-section-copy {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.nool-section-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.nool-section-title {
  font-size: 14px;
  font-weight: 700;
  color: #1565C0;
}

.bundle-title {
  color: #7B1FA2;
  display: inline-flex;
  align-items: center;
}

.nool-section-meta {
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
  font-size: 12px;
  color: #64748B;
}

.nool-section-weight {
  font-size: 12px;
  color: #64748B;
  margin-left: 4px;
}

.nool-section-chevron {
  color: #94A3B8;
  transition: transform 0.2s;
}

.nool-section-body {
  margin-top: 8px;
  border: 1px solid #E2E8F0;
  border-radius: 12px;
  overflow: hidden;
  background: #fff;
}

/* ── Nool Sub-headers ──────────────────────────────────────── */
.nool-sub-header {
  font-size: 12px;
  font-weight: 700;
  color: #1565C0;
  background: #EFF6FF;
  padding: 10px 16px;
  border-left: 3px solid #1565C0;
  margin-bottom: 0;
  border-radius: 0;
}

.nool-sub-header.return-header {
  color: #E65100;
  background: #FFF7ED;
  border-left-color: #E65100;
}

/* ── Nool Form Actions ─────────────────────────────────────── */
.nool-form-actions {
  display: flex;
  align-items: stretch;
  gap: 8px;
  margin-top: 0;
  width: 100%;
}

.nool-action-col {
  min-height: 40px;
  margin-bottom: 10px;
}

.nool-add-btn {
  min-width: 0;
  width: auto;
  flex: 1;
  min-height: 42px;
  font-weight: 700;
  letter-spacing: 0.2px;
}

.nool-form-actions.is-editing .nool-add-btn {
  width: auto;
  flex: 1;
}

.nool-cancel-btn {
  min-height: 42px;
}

/* ── Nool Draft ────────────────────────────────────────────── */
.nool-draft-wrap {
  border: 1px solid #E2E8F0;
  border-radius: 12px;
  background: #FAFCFF;
  overflow: hidden;
}

.nool-draft-head {
  padding: 12px 16px;
  font-size: 13px;
  font-weight: 700;
  color: #1565C0;
  border-bottom: 1px solid #E2E8F0;
  background: #F8FAFC;
}

.nool-draft-list {
  display: flex;
  flex-direction: column;
}

.nool-draft-row {
  display: grid;
  grid-template-columns: 80px 1fr 1fr 90px 110px 90px;
  gap: 8px;
  align-items: center;
  padding: 10px 16px;
  border-top: 1px solid #F1F5F9;
  font-size: 12px;
  color: #475569;
  transition: background 0.1s;
}

.nool-draft-row:hover {
  background: #fff;
}

.nool-draft-remove {
  border: none;
  border-radius: 6px;
  background: #FEF2F2;
  color: #C62828;
  padding: 5px 12px;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s;
}

.nool-draft-remove:hover {
  background: #FEE2E2;
}

/* ── Production Form ───────────────────────────────────────── */
.prod-form-actions {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
}

.prod-submit-btn {
  min-width: 110px;
  min-height: 42px;
}

.prod-action-col {
  min-height: 40px;
}

.prod-action-btn {
  min-height: 42px;
}

.prod-form-actions.is-editing .prod-submit-btn {
  flex: 1;
}

/* ── Yarn Shortage ─────────────────────────────────────────── */
.yarn-shortage-row {
  row-gap: 2px;
}

.yarn-shortage-row :deep(.v-col) {
  padding-top: 2px;
  padding-bottom: 2px;
}

/* ── Order Detail Layout ───────────────────────────────────── */
.min-w-0 { min-width: 0; }

.od-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  padding: 16px 20px;
  border: 1px solid #E2E8F0;
  border-radius: 16px;
  background: linear-gradient(120deg, #FFFFFF 0%, #F1F6FF 55%, #E6EFFF 100%);
  box-shadow: 0 10px 30px -18px rgba(30, 64, 175, 0.35);
  position: relative;
  overflow: hidden;
}

.od-header::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  background: linear-gradient(180deg, #1565C0, #42A5F5);
}

.od-header::after {
  content: '';
  position: absolute;
  right: -50px;
  top: -80px;
  width: 200px;
  height: 200px;
  border-radius: 50%;
  pointer-events: none;
  background: radial-gradient(circle, rgba(59, 130, 246, 0.2), transparent 70%);
}

.od-header > * { position: relative; z-index: 1; }

.od-header-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1 1 280px;
  min-width: 0;
}

.od-title-icon {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  background: linear-gradient(135deg, #1565C0, #3B82F6);
  color: #fff;
  box-shadow: 0 10px 22px -8px rgba(21, 101, 192, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.od-info-cell {
  transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
}

@media (hover: hover) {
  .od-info-cell:hover {
    transform: translateY(-3px);
    border-color: rgba(21, 101, 192, 0.3);
    box-shadow: 0 14px 28px -16px rgba(21, 101, 192, 0.4);
  }
}

@media (prefers-reduced-motion: no-preference) {
  .od-title-icon { animation: od-icon-pulse 3.4s ease-in-out infinite; }
  .od-info-cell { animation: od-cell-in 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) backwards; }
  .od-info-cell:nth-child(2) { animation-delay: 0.05s; }
  .od-info-cell:nth-child(3) { animation-delay: 0.1s; }
  .od-info-cell:nth-child(4) { animation-delay: 0.15s; }
}

@keyframes od-icon-pulse {
  0%, 100% { box-shadow: 0 10px 22px -8px rgba(21, 101, 192, 0.6), 0 0 0 0 rgba(59, 130, 246, 0.35); }
  50% { box-shadow: 0 10px 22px -8px rgba(21, 101, 192, 0.6), 0 0 0 12px rgba(59, 130, 246, 0); }
}

@keyframes od-cell-in {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: none; }
}

.od-title-wrap { min-width: 0; }

.od-title-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.od-title {
  font-size: 22px;
  font-weight: 800;
  color: #0F172A;
  letter-spacing: -0.3px;
  line-height: 1.2;
  margin: 0;
  overflow-wrap: anywhere;
}

.od-title-row .status-badge { margin-left: 0; }

.od-company {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 2px;
  font-size: 13px;
  color: #64748B;
}

.od-company strong { color: #334155; }

.od-header-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  flex-wrap: wrap;
  flex: 0 0 auto;
  margin-left: auto;
}

.od-info-strip {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.od-info-cell {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  background: #fff;
  border: 1px solid #E2E8F0;
  border-radius: 12px;
  padding: 12px 14px;
}

.od-info-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.od-info-label {
  font-size: 12px;
  color: #64748B;
}

.od-info-value {
  margin-top: 1px;
  font-size: 14px;
  font-weight: 700;
  color: #1E293B;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.od-lifecycle {
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  background: #F8FAFC;
}

.od-lifecycle-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 4px;
}

.tone-blue { background: #EAF2FF; color: #1565C0; }
.tone-green { background: #E8F7EE; color: #2E7D32; }
.tone-red { background: #FDECEC; color: #C62828; }
.tone-orange { background: #FFF3E0; color: #E65100; }
.tone-purple { background: #F3E8FF; color: #7B1FA2; }

.od-panel-head {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 14px;
  font-size: 15px;
  font-weight: 700;
  color: #1E293B;
}

@media (max-width: 600px) {
  .od-panel-head > .v-btn-group {
    margin-left: 0 !important;
    width: 100%;
  }
  .od-panel-head > .v-btn-group {
    height: auto !important;
  }
  .od-panel-head > .v-btn-group > .v-btn {
    flex: 1 1 0;
    min-width: 0;
    height: auto !important;
    min-height: 36px;
    padding-block: 6px;
    white-space: normal;
  }
  .od-panel-head > .v-btn-group :deep(.v-btn__content) {
    white-space: normal;
    line-height: 1.2;
    min-width: 0;
    overflow-wrap: anywhere;
  }
}

.od-panel-icon {
  width: 32px;
  height: 32px;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.od-panel-head .od-pct {
  margin-left: auto;
  font-size: 20px;
  font-weight: 800;
  color: #2E7D32;
}

.od-payment-box {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  border: 1px solid;
  border-radius: 12px;
  padding: 18px;
  font-size: 22px;
  font-weight: 800;
}

.od-payment-sub {
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 12px;
  font-size: 12px;
  color: #64748B;
}

.od-payment-sub strong {
  font-size: 14px;
  color: #1E293B;
}

.od-progress-bar { height: 10px; }

.od-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #2E7D32, #43A047);
}

.od-steps {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  margin-top: 16px;
}

.od-step {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  min-width: 0;
}

.od-step-dot {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: #F1F5F9;
  color: #94A3B8;
  display: flex;
  align-items: center;
  justify-content: center;
}

.od-step.done .od-step-dot {
  background: #2E7D32;
  color: #fff;
}

.od-step-label {
  font-size: 13px;
  font-weight: 700;
  color: #1E293B;
}

.od-step-date {
  font-size: 11px;
  color: #64748B;
}

.od-dates {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  font-size: 12px;
  color: #64748B;
}

.od-dates strong { color: #1E293B; }

.od-kpi-tile {
  height: 100%;
  background: var(--tile-bg);
  border-radius: 12px;
  padding: 14px 16px;
}

.od-kpi-tile .order-kpi-value { color: var(--tile-color); }

.od-fin-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.od-fin-item {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  background: #fff;
  border: 1px solid #E2E8F0;
  border-radius: 12px;
  padding: 10px 12px;
}

.od-fin-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.od-fin-item .financial-summary-label { flex: 1; min-width: 0; }

.od-fin-item .financial-summary-value {
  margin-top: 0;
  font-size: 17px;
  white-space: nowrap;
}

@media (max-width: 1200px) {
  .od-info-strip { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

@media (max-width: 600px) {
  .od-info-strip { grid-template-columns: 1fr; }
  .od-steps { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .od-header-actions { width: 100%; }
  .od-header-actions .v-btn { flex: 1 1 auto; }
  .od-payment-box { font-size: 18px; }
}

/* ── Progress Bar ──────────────────────────────────────────── */
.at-progress {
  border-radius: 999px;
  overflow: hidden;
  background: #F1F5F9;
}

.at-progress-fill {
  border-radius: 999px;
  transition: width 0.5s ease;
}

/* ═══════════════════════════════════════════════════════════════
   RESPONSIVE
   ═══════════════════════════════════════════════════════════════ */

@media (max-width: 1024px) {
  .status-badge {
    font-size: 11px;
    padding: 6px 12px;
    margin-left: 12px;
  }

  .order-insights {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .financial-summary-layout {
    grid-template-columns: 1fr;
  }

}

@media (max-width: 768px) {
  .order-hero-metrics {
    grid-template-columns: 1fr 1fr;
  }

  .close-flow-wrap {
    flex-direction: column;
    align-items: flex-start;
  }

  .close-flow-actions {
    width: 100%;
    justify-content: flex-start;
    flex-wrap: wrap;
  }

  .close-flow-actions .v-btn {
    flex: 1 1 auto;
    min-width: 0;
  }

  .order-hero-title {
    font-size: 18px;
  }

  .hero-value {
    font-size: 17px;
  }

  .hero-metric {
    padding: 12px 14px;
  }

  .nool-type-toggle {
    width: 100%;
  }

  .nool-type-btn {
    flex: 1;
    justify-content: center;
    padding: 8px 12px;
    font-size: 12px;
  }

  .nool-entry-toggle {
    width: 100%;
  }

  .nool-entry-btn {
    flex: 1;
    justify-content: center;
  }

  .nool-section-header {
    padding: 12px 14px;
  }

  .nool-section-body {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  .yarn-shortage-row :deep(.v-col) {
    flex: 0 0 50%;
    max-width: 50%;
  }
}

@media (max-width: 600px) {
  .order-hero-top {
    flex-wrap: wrap;
    align-items: flex-start;
  }

  .order-hero-title {
    font-size: 16px;
    flex-wrap: wrap;
  }

  .order-hero-sub {
    font-size: 13px;
  }

  .status-badge {
    margin-left: 0;
    margin-top: 8px;
    width: 100%;
    justify-content: center;
  }

  .repeat-order-footer {
    flex-direction: column;
    align-items: stretch;
  }

  .repeat-order-footer .v-btn {
    width: 100%;
  }

  .order-hero-metrics {
    grid-template-columns: 1fr;
  }

  .order-insights {
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }

  .order-insight-item {
    padding: 10px 12px;
    min-height: 60px;
  }

  .order-insight-value {
    font-size: 13px;
  }

  .nool-form-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .nool-add-btn {
    width: 100%;
  }

  .nool-cancel-btn {
    width: 100%;
  }

  .prod-form-actions {
    width: 100%;
    flex-direction: column;
  }

  .prod-submit-btn {
    width: 100%;
  }

  .prod-action-btn {
    width: 100%;
  }

  .financial-summary-value {
    font-size: 22px;
  }

  .order-kpi-value {
    font-size: clamp(20px, 7vw, 28px);
  }

  .financial-summary-layout {
    grid-template-columns: 1fr;
  }


  .nool-draft-row {
    grid-template-columns: 1fr 1fr;
    gap: 6px;
    padding: 8px 12px;
    font-size: 11px;
  }

  .nool-section-meta {
    flex-direction: column;
    gap: 4px;
  }

  .close-flow-actions {
    flex-direction: column;
    width: 100%;
  }

  .close-flow-actions .v-btn,
  .close-flow-actions .v-chip {
    width: 100%;
    justify-content: center;
  }

  .complete-order-banner {
    flex-direction: column;
    align-items: stretch;
  }

  .complete-order-btn {
    width: 100%;
    justify-content: center;
  }

  .complete-dialog-warn-row {
    flex-direction: column;
    gap: 12px;
  }

  .complete-dialog-warn-num {
    font-size: 16px;
  }

  .yarn-shortage-row :deep(.v-col) {
    flex: 0 0 100%;
    max-width: 100%;
  }

  .hero-label {
    font-size: 11px;
  }

  .hero-value {
    font-size: 16px;
  }
}

@media (max-width: 400px) {
  .order-insights {
    grid-template-columns: 1fr;
  }

  .order-hero-title {
    font-size: 14px;
  }

  .order-kpi-value {
    font-size: 18px;
  }

  .financial-summary-value {
    font-size: 18px;
  }

  .nool-draft-row {
    grid-template-columns: 1fr;
  }
}
/* ── Page polish: motion, insights, tables ───────────────── */
@keyframes odRise {
  from { opacity: 0; transform: translateY(14px); }
  to { opacity: 1; transform: none; }
}
@keyframes odGrow {
  from { transform: scaleX(0); }
  to { transform: scaleX(1); }
}

.od-page .at-card {
  animation: odRise .55s cubic-bezier(.2, .7, .2, 1) both;
  transition: box-shadow .25s ease;
}
.od-page .at-card:hover { box-shadow: 0 10px 28px rgba(15, 23, 42, 0.07); }

.od-progress-fill {
  transform-origin: left center;
  animation: odGrow 1.1s cubic-bezier(.2, .7, .2, 1) both;
}

.od-kpi-tile { transition: transform .2s ease, box-shadow .2s ease; }
.od-kpi-tile:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(15, 23, 42, 0.08); }

.od-insights {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}
.od-insight {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  padding: 14px 16px;
  border-radius: 14px;
  background: #fff;
  border: 1px solid #E2E8F0;
  border-left: 4px solid var(--ins, #1565C0);
  animation: odRise .5s cubic-bezier(.2, .7, .2, 1) backwards;
  animation-delay: calc(var(--d, 0) * 70ms);
  transition: transform .2s ease, box-shadow .2s ease;
}
.od-insight:hover { transform: translateY(-2px); box-shadow: 0 8px 22px rgba(15, 23, 42, 0.08); }
.od-insight.is-ok { --ins: #2E7D32; }
.od-insight.is-info { --ins: #1565C0; }
.od-insight.is-warn { --ins: #E65100; }
.od-insight.is-danger { --ins: #C62828; }
.od-insight-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: color-mix(in srgb, var(--ins) 12%, white);
  color: var(--ins);
}
.od-insight-title {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .06em;
  color: #64748B;
}
.od-insight-value {
  font-size: 19px;
  font-weight: 800;
  color: #0F172A;
  font-variant-numeric: tabular-nums;
  margin-top: 2px;
}
.od-insight-text {
  font-size: 12px;
  color: #64748B;
  margin-top: 2px;
}

.od-table-card :deep(.at-grid-table thead th) {
  background: #F1F5FB;
  color: #475569;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .06em;
}
.od-table-card :deep(.at-grid-table tbody td) {
  font-variant-numeric: tabular-nums;
  border-bottom: 1px solid #EEF2F7;
  transition: background .25s ease, box-shadow .25s ease, color .25s ease;
}
.od-table-card :deep(.at-grid-table tbody tr:nth-child(even) td) { background: #FBFCFE; }
.od-table-card :deep(.at-grid-table tbody tr:hover td) {
  background: linear-gradient(90deg, #EAF2FF 0%, #F3EEFF 100%);
  box-shadow: inset 0 -1px 0 rgba(21, 101, 192, .12), inset 0 1px 0 rgba(21, 101, 192, .08);
}
.od-table-card :deep(.at-grid-table tbody tr:hover td:first-child) {
  box-shadow: inset 4px 0 0 #1565C0, inset 0 -1px 0 rgba(21, 101, 192, .12), inset 0 1px 0 rgba(21, 101, 192, .08);
}
.od-table-card :deep(.at-grid-table .at-grid-footer-row td) {
  background: linear-gradient(90deg, #F1F5FB, #F8FAFC, #F1F5FB);
  background-size: 200% 100%;
  animation: odShimmer 4s linear infinite;
  font-weight: 700;
  color: #0F172A;
}
.od-table-card :deep(.at-grid-empty) { padding: 32px; color: #94A3B8; }

/* ── Production Overview KPI alignment ─────────────────────── */
.od-kpi-tile {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 8px;
  height: auto;
  min-height: 84px;
}
.od-kpi-tile .order-kpi-label { min-height: 28px; display: flex; align-items: flex-start; }
.od-kpi-tile .order-kpi-value {
  font-size: 24px;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.order-kpi-meters-row > .v-col > .od-kpi-tile { flex: 1; }
.order-kpi-meters-row > .v-col { flex-direction: column; }

/* ── Section headers with stat chips ───────────────────────── */
.od-section-head { flex-wrap: wrap; row-gap: 10px; }
.od-hero-stats {
  margin-left: auto;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.od-hero-stat {
  display: flex;
  flex-direction: column;
  min-width: 96px;
  padding: 6px 12px;
  border-radius: 10px;
  background: color-mix(in srgb, var(--sc) 8%, #fff);
  border: 1px solid color-mix(in srgb, var(--sc) 22%, #fff);
  animation: odRise .5s ease backwards;
  animation-delay: calc(var(--d, 0) * 70ms + 120ms);
  transition: transform .2s ease, box-shadow .2s ease;
}
.od-hero-stat:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(15, 23, 42, .08);
}
.od-hero-stat span {
  font-size: 11px;
  font-weight: 600;
  color: #64748B;
  text-transform: uppercase;
  letter-spacing: .3px;
}
.od-hero-stat strong {
  font-size: 15px;
  font-weight: 800;
  color: var(--sc);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

/* ── Form panel and collapsible animation ──────────────────── */
.od-table-card .od-section-head + .pa-4 {
  background: linear-gradient(180deg, #F8FBFF, #fff);
}
.nool-section-body { animation: odSlide .35s ease both; }

/* ── Table row stagger ─────────────────────────────────────── */
.od-table-card :deep(.at-grid-table tbody tr) {
  animation: odRowIn .4s ease both;
}
.od-table-card :deep(.at-grid-table tbody tr:nth-child(2)) { animation-delay: .04s; }
.od-table-card :deep(.at-grid-table tbody tr:nth-child(3)) { animation-delay: .08s; }
.od-table-card :deep(.at-grid-table tbody tr:nth-child(4)) { animation-delay: .12s; }
.od-table-card :deep(.at-grid-table tbody tr:nth-child(5)) { animation-delay: .16s; }
.od-table-card :deep(.at-grid-table tbody tr:nth-child(6)) { animation-delay: .2s; }
.od-table-card :deep(.at-grid-table tbody tr:nth-child(n+7)) { animation-delay: .24s; }

@keyframes odSlide {
  from { opacity: 0; transform: translateY(-6px); }
  to { opacity: 1; transform: none; }
}
@keyframes odRowIn {
  from { opacity: 0; transform: translateX(-8px); }
  to { opacity: 1; transform: none; }
}
@keyframes odShimmer {
  from { background-position: 100% 0; }
  to { background-position: -100% 0; }
}
@keyframes odPulse {
  0%, 100% { opacity: 1; }
  50% { opacity: .75; }
}

/* ── Order lifecycle timeline ──────────────────────────────── */
.lc-timeline {
  position: relative;
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 8px;
  margin-top: 16px;
}
.lc-timeline::before {
  content: '';
  position: absolute;
  top: 14px;
  left: 10%;
  right: 10%;
  height: 3px;
  border-radius: 3px;
  background: #E2E8F0;
  transform-origin: left center;
  animation: lcLine 1s ease .2s both;
}
.lc-step {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 4px;
  min-width: 0;
  animation: odRise .5s ease both;
  animation-delay: calc(var(--d, 0) * 110ms + 150ms);
}
.lc-node {
  z-index: 1;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  color: #94A3B8;
  border: 2px solid #CBD5E1;
  transition: background .3s ease, border-color .3s ease;
}
.lc-step.done .lc-node {
  background: linear-gradient(135deg, #2E7D32, #43A047);
  border-color: #2E7D32;
  color: #fff;
  box-shadow: 0 4px 12px rgba(46, 125, 50, .3);
}
.lc-step.current .lc-node {
  border-color: #1565C0;
  color: #1565C0;
  animation: lcPulse 1.8s ease-in-out infinite;
}
.lc-label {
  font-size: 12px;
  font-weight: 700;
  color: #1A2744;
  line-height: 1.25;
}
.lc-date {
  font-size: 11px;
  color: #64748B;
}
.lc-step:not(.done):not(.current) .lc-label { color: #94A3B8; }

@keyframes lcLine {
  from { transform: scaleX(0); }
  to { transform: scaleX(1); }
}
@keyframes lcPulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(21, 101, 192, .35); }
  50% { box-shadow: 0 0 0 8px rgba(21, 101, 192, 0); }
}
@media (max-width: 600px) {
  .lc-timeline {
    grid-template-columns: 1fr;
    gap: 6px;
  }
  .lc-timeline::before {
    top: 0;
    bottom: 0;
    left: 15px;
    right: auto;
    width: 3px;
    height: auto;
    transform-origin: top center;
    animation-name: lcLineV;
  }
  .lc-step {
    display: grid;
    grid-template-columns: 32px minmax(0, 1fr);
    column-gap: 12px;
    align-items: center;
    text-align: left;
  }
  .lc-step .lc-node { grid-row: span 2; }
  .lc-date { margin-top: -2px; }
}
@keyframes lcLineV {
  from { transform: scaleY(0); }
  to { transform: scaleY(1); }
}

.lc-summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
  gap: 10px;
  margin-top: 14px;
}
.lc-summary-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 12px;
  background: #F5F8FC;
  border: 1px solid #E3EAF3;
  color: #1565C0;
  animation: odRise .45s ease both;
}
.lc-summary-label { font-size: 11px; color: #64748B; text-transform: uppercase; letter-spacing: .04em; }
.lc-summary-value { font-size: 14px; font-weight: 700; color: #0F172A; }

.prod-preview {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 12px;
  padding: 10px 14px;
  border-radius: 12px;
  background: linear-gradient(90deg, #EAF2FF, #F3E8FF);
  border: 1px solid #C9D9F5;
  font-size: 13px;
  color: #334155;
  animation: odRise .35s ease both;
}
.prod-preview strong { color: #1565C0; }
.prod-preview-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #2E7D32;
  box-shadow: 0 0 0 0 rgba(46, 125, 50, .5);
  animation: prodPulse 1.6s infinite;
}
@keyframes prodPulse {
  0% { box-shadow: 0 0 0 0 rgba(46, 125, 50, .5); }
  70% { box-shadow: 0 0 0 8px rgba(46, 125, 50, 0); }
  100% { box-shadow: 0 0 0 0 rgba(46, 125, 50, 0); }
}

.prod-form :deep(.v-field--focused) {
  box-shadow: 0 0 0 3px rgba(21, 101, 192, .18);
  transition: box-shadow .25s ease;
}
.prod-form :deep(.v-field) {
  transition: box-shadow .25s ease;
}
.prod-action-btn {
  transition: transform .2s ease, box-shadow .2s ease;
}
.prod-action-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(21, 101, 192, .3);
}

@media (prefers-reduced-motion: reduce) {
  .od-page *, .od-page *::before, .od-page *::after {
    animation: none !important;
    transition: none !important;
  }
}

/* ── FX layer: spotlight, sheen, glow ── */
.od-kpi-tile,
.od-insight,
.od-info-cell,
.od-page .at-card { position: relative; }

.od-kpi-tile::before,
.od-insight::before,
.od-info-cell::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: radial-gradient(200px circle at var(--mx, 50%) var(--my, 50%), color-mix(in srgb, var(--tile-color, var(--ins, #1565C0)) 14%, transparent), transparent 70%);
  opacity: 0;
  transition: opacity 0.3s ease;
  pointer-events: none;
}

.od-kpi-tile:hover::before,
.od-insight:hover::before,
.od-info-cell:hover::before { opacity: 1; }

.od-progress-fill { position: relative; overflow: hidden; }

.od-progress-fill::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.55), transparent);
  transform: translateX(-100%);
}

.od-insight-icon,
.od-info-icon,
.od-panel-icon { transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1); }

.od-insight:hover .od-insight-icon,
.od-info-cell:hover .od-info-icon { transform: scale(1.12) rotate(-6deg); }

.lc-summary-item { transition: transform 0.2s ease, box-shadow 0.2s ease; }
.lc-summary-item:hover { transform: translateY(-2px); box-shadow: 0 8px 18px -10px rgba(21, 101, 192, 0.45); }

@media (prefers-reduced-motion: no-preference) {
  .od-insight-icon { animation: od-bob 4.5s ease-in-out infinite; }
  .od-insight:nth-child(even) .od-insight-icon { animation-delay: -2.2s; }
  .od-progress-fill::after { animation: od-fill-sheen 3s ease-in-out 1.2s infinite; }
  .lc-step.done .lc-node { animation: od-done-glow 3.2s ease-out infinite; }
  .od-kpi-tile .order-kpi-value { animation: od-count-in 0.7s cubic-bezier(0.2, 0.8, 0.2, 1) backwards; }
}

@keyframes od-bob {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-3px); }
}

@keyframes od-fill-sheen {
  0% { transform: translateX(-100%); }
  60%, 100% { transform: translateX(100%); }
}

@keyframes od-done-glow {
  0% { box-shadow: 0 4px 12px rgba(46, 125, 50, 0.3), 0 0 0 0 rgba(46, 125, 50, 0.35); }
  70%, 100% { box-shadow: 0 4px 12px rgba(46, 125, 50, 0.3), 0 0 0 9px rgba(46, 125, 50, 0); }
}

@keyframes od-count-in {
  from { opacity: 0; transform: translateY(10px) scale(0.92); }
  to { opacity: 1; transform: none; }
}

/* ── Beautiful layer: swatch image, header art, gauge ── */
.od-header > .od-header-art {
  position: absolute;
  right: 12px;
  bottom: 0;
  height: 92%;
  width: auto;
  opacity: 0.22;
  z-index: 0;
  pointer-events: none;
}

.od-swatch {
  position: relative;
  flex-shrink: 0;
  width: 56px;
  height: 56px;
  padding: 0;
  border: 3px solid #fff;
  border-radius: 16px;
  overflow: hidden;
  cursor: zoom-in;
  background: #E8EEF7;
  box-shadow: 0 12px 24px -10px rgba(21, 101, 192, 0.65), 0 0 0 1px rgba(21, 101, 192, 0.18);
  transform-style: preserve-3d;
}

.od-swatch img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.5s ease;
}

.od-swatch:hover img { transform: scale(1.15); }

.od-gauge {
  display: flex;
  justify-content: center;
  margin: 4px 0 0;
}

.od-gauge :deep(.apexcharts-canvas) { margin: 0 auto; }

.financial-sample-image {
  transition: transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.3s ease;
}

.financial-sample-image:hover {
  transform: scale(1.03) rotate(-0.5deg);
  box-shadow: 0 18px 36px -16px rgba(21, 101, 192, 0.5);
}

@media (prefers-reduced-motion: no-preference) {
  .od-swatch { animation: od-icon-pulse 3.4s ease-in-out infinite; }
  .od-header > .od-header-art { animation: od-art-float 6s ease-in-out infinite; }
}

@keyframes od-art-float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-5px); }
}

@media (max-width: 1280px) {
  .od-header > .od-header-art { display: none; }
}

/* ── More motion: aurora, particles, ticker, traveling dot, scroll bar ── */
.od-aurora {
  position: absolute;
  inset: -60%;
  z-index: 0;
  pointer-events: none;
  background: conic-gradient(from 0deg, rgba(59, 130, 246, 0), rgba(99, 102, 241, 0.22), rgba(59, 130, 246, 0), rgba(245, 158, 11, 0.2), rgba(59, 130, 246, 0));
  filter: blur(40px);
}

.od-fleck {
  position: absolute;
  z-index: 0;
  left: calc(var(--n) * 9.4%);
  bottom: -8px;
  width: calc(3px + (var(--n) % 3) * 1.5px);
  height: calc(3px + (var(--n) % 3) * 1.5px);
  border-radius: 50%;
  background: rgba(59, 130, 246, 0.6);
  box-shadow: 0 0 8px rgba(59, 130, 246, 0.7);
  opacity: 0;
  pointer-events: none;
}

.od-fleck:nth-of-type(3n) { background: rgba(245, 158, 11, 0.8); box-shadow: 0 0 8px rgba(245, 158, 11, 0.8); }

.od-title {
  background: linear-gradient(90deg, #0F172A 0%, #1E40AF 45%, #0F172A 90%);
  background-size: 200% 100%;
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.od-ticker {
  position: relative;
  overflow: hidden;
  border-radius: 999px;
  border: 1px solid #DBE6F7;
  background: linear-gradient(90deg, #F1F6FF, #FFFFFF 50%, #F1F6FF);
  mask-image: linear-gradient(90deg, transparent, #000 6%, #000 94%, transparent);
  -webkit-mask-image: linear-gradient(90deg, transparent, #000 6%, #000 94%, transparent);
}

.od-ticker-track {
  display: flex;
  width: max-content;
  gap: 28px;
  padding: 8px 0;
}

.od-ticker-item {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
  font-size: 12px;
  font-weight: 700;
  color: #334155;
}

.od-ticker-item .v-icon { color: #1565C0; }

.od-ticker-item::after {
  content: '';
  width: 6px;
  height: 6px;
  margin-left: 20px;
  border-radius: 50%;
  background: #F59E0B;
}

.od-progress-fill::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image: linear-gradient(45deg, rgba(255, 255, 255, 0.28) 25%, transparent 25%, transparent 50%, rgba(255, 255, 255, 0.28) 50%, rgba(255, 255, 255, 0.28) 75%, transparent 75%);
  background-size: 22px 22px;
}

.lc-timeline::after {
  content: '';
  position: absolute;
  top: 9px;
  left: 10%;
  width: 12px;
  height: 12px;
  margin-left: -6px;
  border-radius: 50%;
  background: #F59E0B;
  box-shadow: 0 0 12px 3px rgba(245, 158, 11, 0.7);
  pointer-events: none;
}

.od-page .at-card:hover .od-panel-icon { transform: rotate(-10deg) scale(1.12); }

.od-payment-box { position: relative; overflow: hidden; }

.od-payment-box::after {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  width: 40%;
  background: linear-gradient(100deg, transparent, rgba(255, 255, 255, 0.55), transparent);
  transform: translateX(-150%) skewX(-18deg);
}

.od-page::before {
  content: '';
  position: fixed;
  z-index: 1300;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, #1565C0, #42A5F5, #F59E0B);
  transform: scaleX(0);
  transform-origin: left center;
  pointer-events: none;
}

@media (prefers-reduced-motion: no-preference) {
  .od-aurora { animation: od-spin 26s linear infinite; }
  .od-fleck { animation: od-rise calc(5s + var(--n) * 0.5s) linear infinite; animation-delay: calc(var(--n) * -1.1s); }
  .od-title { animation: od-shine 7s linear infinite; }
  .od-ticker-track { animation: od-marquee 38s linear infinite; }
  .od-ticker:hover .od-ticker-track { animation-play-state: paused; }
  .od-progress-fill::before { animation: od-stripes 1s linear infinite; }
  .lc-timeline::after { animation: od-travel 5s ease-in-out infinite; }
  .od-payment-box::after { animation: od-sheen 4.2s ease-in-out infinite 1s; }
  .od-info-cell { animation: od-flip 0.65s cubic-bezier(0.2, 0.8, 0.2, 1) backwards; }
  .od-info-cell:nth-child(2) { animation-delay: 0.06s; }
  .od-info-cell:nth-child(3) { animation-delay: 0.12s; }
  .od-info-cell:nth-child(4) { animation-delay: 0.18s; }
  .od-info-cell:nth-child(5) { animation-delay: 0.24s; }
  .od-info-cell:nth-child(6) { animation-delay: 0.3s; }
  .od-info-cell:nth-child(7) { animation-delay: 0.36s; }
  .od-info-cell:nth-child(8) { animation-delay: 0.42s; }
  .od-info-cell:hover .od-info-icon { animation: od-spin-once 0.7s ease; }
  .od-alert { animation: od-slide-in 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) backwards; }
  .od-payment-box { animation: od-box-pulse 3s ease-in-out infinite; }
}

@supports (animation-timeline: scroll()) {
  @media (prefers-reduced-motion: no-preference) {
    .od-page::before { animation: od-scroll-bar linear both; animation-timeline: scroll(root); }
  }
}

@keyframes od-spin { to { transform: rotate(360deg); } }
@keyframes od-shine { to { background-position: -200% 0; } }
@keyframes od-marquee { to { transform: translateX(-50%); } }
@keyframes od-stripes { to { background-position: 22px 0; } }
@keyframes od-scroll-bar { to { transform: scaleX(1); } }

@keyframes od-rise {
  0% { transform: translateY(0); opacity: 0; }
  15% { opacity: 0.9; }
  100% { transform: translateY(-90px) translateX(14px); opacity: 0; }
}

@keyframes od-travel {
  0% { left: 10%; opacity: 0; }
  10%, 90% { opacity: 1; }
  100% { left: 90%; opacity: 0; }
}

@keyframes od-sheen {
  0%, 55% { transform: translateX(-150%) skewX(-18deg); }
  100% { transform: translateX(380%) skewX(-18deg); }
}

@keyframes od-flip {
  from { opacity: 0; transform: perspective(600px) rotateX(-70deg) translateY(10px); }
  to { opacity: 1; transform: none; }
}

@keyframes od-spin-once {
  from { transform: rotate(0) scale(1); }
  50% { transform: rotate(180deg) scale(1.2); }
  to { transform: rotate(360deg) scale(1); }
}

@keyframes od-slide-in {
  from { opacity: 0; transform: translateX(-20px); }
  to { opacity: 1; transform: none; }
}

@keyframes od-box-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(230, 81, 0, 0); }
  50% { box-shadow: 0 0 0 7px rgba(230, 81, 0, 0.08); }
}

@media (max-width: 600px) {
  .lc-timeline::after { display: none; }
}

/* ── Colourful top cards ── */
.od-header {
  background: linear-gradient(110deg, var(--od-c1, #FFEBD2) 0%, var(--od-c2, #D9E8FF) 100%);
  border-color: color-mix(in srgb, var(--od-c2, #D9E8FF) 65%, #fff);
  box-shadow: 0 12px 30px -20px color-mix(in srgb, var(--od-c2, #D9E8FF) 60%, #1E3A8A);
}

.od-header .od-title {
  background: linear-gradient(90deg, #0F172A 0%, #1E40AF 50%, #0F172A 100%);
  background-size: 200% 100%;
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.od-header .od-aurora { opacity: 0.45; }
.od-header > .od-header-art { opacity: 0.25; }

/* ── Header colour picker ── */
.od-palette {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 8px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.7);
  box-shadow: inset 0 0 0 1px rgba(15, 23, 42, 0.06);
}

.od-palette-dot {
  width: 20px;
  height: 20px;
  padding: 0;
  border: 2px solid #fff;
  border-radius: 50%;
  cursor: pointer;
  box-shadow: 0 0 0 1px rgba(15, 23, 42, 0.15);
  transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s ease;
}

.od-palette-dot:hover { transform: scale(1.25); }

.od-palette-dot.active {
  transform: scale(1.2);
  box-shadow: 0 0 0 2px #1565C0;
}

/* ── Lifecycle circle colours: done green, current blue, pending soft indigo ── */
.lc-step .lc-node {
  background: #EEF2FF;
  border-color: #A5B4FC;
  color: #6366F1;
}

.lc-step.current .lc-node {
  background: linear-gradient(135deg, #E0F2FE, #BFDBFE);
  border-color: #1565C0;
  color: #1565C0;
}

.lc-step.done .lc-node {
  background: linear-gradient(135deg, #2E7D32, #43A047);
  border-color: #2E7D32;
  color: #fff;
}

.lc-step:not(.done):not(.current) .lc-label { color: #64748B; }

/* ── Even more motion: trend chart, parallax, bounce, glow ── */
.od-trend {
  margin: 4px 0 14px;
  padding: 10px 12px 0;
  border-radius: 14px;
  border: 1px solid #DBE6F7;
  background: linear-gradient(180deg, #F6FAFF, #FFFFFF);
  overflow: hidden;
}

.od-trend-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  color: #1565C0;
}

.od-trend :deep(.apexcharts-canvas) { margin: 0 auto; }

.od-trend { padding: 10px 14px 12px; }

.od-trend-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 6px;
}

.od-chart-tabs {
  display: inline-flex;
  gap: 4px;
  padding: 3px;
  border-radius: 12px;
  background: #E8F0FC;
}

.od-chart-tab {
  display: grid;
  place-items: center;
  width: 32px;
  height: 28px;
  border: 0;
  border-radius: 9px;
  background: transparent;
  color: #64748B;
  cursor: pointer;
  transition: background 0.2s ease, color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
}

.od-chart-tab:hover:not(:disabled) { color: #1565C0; transform: translateY(-1px); }
.od-chart-tab:disabled { opacity: 0.35; cursor: not-allowed; }

.od-chart-tab.active {
  color: #fff;
  background: linear-gradient(135deg, #1565C0, #3B82F6);
  box-shadow: 0 6px 14px -6px rgba(21, 101, 192, 0.8);
}

.od-chart-stage {
  position: relative;
  height: 210px;
  min-width: 0;
  overflow: hidden;
}

.od-chart-stage :deep(.apexcharts-canvas),
.od-chart-stage :deep(.apexcharts-canvas svg) { max-width: 100%; }

.od-fin-item { transition: transform 0.25s ease, background-color 0.25s ease; border-radius: 12px; }
.od-fin-item:hover { transform: translateX(6px); background: #F4F8FF; }
.od-fin-item:hover .od-fin-icon { transform: scale(1.15) rotate(-8deg); }
.od-fin-icon { transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1); }

.status-badge { position: relative; }

.status-badge.active::after {
  content: '';
  position: absolute;
  inset: -3px;
  border-radius: inherit;
  border: 2px solid rgba(21, 101, 192, 0.35);
  pointer-events: none;
}

.od-header-actions .v-btn { transition: transform 0.2s ease-out, box-shadow 0.25s ease; }

@media (prefers-reduced-motion: no-preference) {
  .status-badge.active::after { animation: od-badge-ping 2s ease-out infinite; }
  .lc-step .lc-node { animation: od-node-pop 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) backwards; animation-delay: calc(var(--d, 0) * 130ms + 250ms); }
  .lc-step.current .lc-node { animation: od-node-pop 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) backwards, lcPulse 1.8s ease-in-out 1.2s infinite; animation-delay: calc(var(--d, 0) * 130ms + 250ms), 1.2s; }
  .lc-step.done .lc-node { animation: od-node-pop 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) backwards, od-done-glow 3.2s ease-out 1.2s infinite; animation-delay: calc(var(--d, 0) * 130ms + 250ms), 1.2s; }
  .od-fin-item { animation: od-slide-in 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) backwards; }
  .od-fin-item:nth-child(2) { animation-delay: 0.07s; }
  .od-fin-item:nth-child(3) { animation-delay: 0.14s; }
  .od-fin-item:nth-child(4) { animation-delay: 0.21s; }
  .od-fin-item:nth-child(5) { animation-delay: 0.28s; }
  .od-fin-item:nth-child(n + 6) { animation-delay: 0.35s; }
  .od-section-head .od-hero-stat strong { animation: od-num-glow 3.6s ease-in-out infinite; }
  .od-trend { animation: od-slide-in 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) 0.2s backwards; }
  .od-pct { animation: od-pct-pop 2.8s ease-in-out infinite; }
}

@supports (animation-timeline: scroll()) {
  @media (prefers-reduced-motion: no-preference) {
    .od-header > .od-header-art { animation: od-art-float 6s ease-in-out infinite, od-parallax linear both; animation-timeline: auto, scroll(root); animation-range: normal, 0px 600px; }
    .od-aurora { animation: od-spin linear both; animation-timeline: scroll(root); animation-range: 0px 1400px; }
  }
}

@keyframes od-badge-ping {
  0% { transform: scale(0.9); opacity: 0.9; }
  100% { transform: scale(1.35); opacity: 0; }
}

@keyframes od-node-pop {
  from { opacity: 0; transform: scale(0.2) rotate(-90deg); }
  to { opacity: 1; transform: none; }
}

@keyframes od-num-glow {
  0%, 100% { text-shadow: 0 0 0 rgba(21, 101, 192, 0); }
  50% { text-shadow: 0 0 12px rgba(21, 101, 192, 0.35); }
}

@keyframes od-pct-pop {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.12); }
}

@keyframes od-parallax {
  to { transform: translateY(40px) scale(1.08); }
}
</style>

