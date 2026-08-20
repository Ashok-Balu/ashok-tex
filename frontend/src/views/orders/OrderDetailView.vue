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
        <h1 class="not-found-title">Order Not Found</h1>
        <p class="not-found-desc">The order you're looking for may have been deleted, archived, or never existed.</p>
        <div class="not-found-hints">
          <div class="not-found-hint">
            <v-icon size="14" color="#64748B">mdi-information-outline</v-icon>
            <span>Check if the order was recently deleted or archived</span>
          </div>
          <div class="not-found-hint">
            <v-icon size="14" color="#64748B">mdi-link-variant-off</v-icon>
            <span>The link may be outdated or incorrect</span>
          </div>
        </div>
      </div>
      <div class="not-found-actions">
        <v-btn color="primary" variant="flat" rounded="lg" size="large" prepend-icon="mdi-arrow-left" @click="router.push('/orders')">
          Back to Orders
        </v-btn>
        <v-btn variant="tonal" color="primary" rounded="lg" size="large" prepend-icon="mdi-view-dashboard" @click="router.push('/dashboard')">
          Dashboard
        </v-btn>
      </div>
    </div>
  </div>
  <div v-else-if="orderLoading" class="page-container d-flex justify-center align-center" style="min-height:400px">
    <div class="loading-state">
      <v-progress-circular indeterminate color="primary" size="44" width="3" />
      <span class="loading-text">Loading order...</span>
    </div>
  </div>
  <div class="page-container" v-else-if="order">
    <v-overlay :model-value="avgWeightSaving" persistent class="d-flex flex-column align-center justify-center" z-index="9999">
      <v-progress-circular indeterminate color="primary" size="64" />
      <div class="mt-3" style="color:#1A2744;font-weight:700">Saving Average Weight per Meter...</div>
    </v-overlay>
    <v-card rounded="xl" class="at-card pa-4 mb-5 order-hero">
      <div class="d-flex align-center gap-2 order-hero-top">
        <v-btn icon="mdi-arrow-left" variant="text" @click="goBack" />
        <div class="flex-1">
          <div class="order-hero-title">
            <v-icon size="16" color="#1f5ea8" class="mr-1">mdi-package-variant</v-icon>
            {{ t('orderName') }}:
            <span class="order-hero-value">{{ order.orderName }}</span>
          </div>
          <div class="order-hero-sub">
            <v-icon size="14" color="#5a6a85" class="mr-1">mdi-domain</v-icon>
            {{ t('company') }}:
            <span class="order-hero-company">{{ order.company?.name }}</span>
          </div>
        </div>
        <span :class="order.status === 'completed' ? 'status-badge done' : 'status-badge active'">
          <v-icon size="14" class="mr-1">{{ order.status === 'completed' ? 'mdi-check-decagram' : 'mdi-progress-clock' }}</v-icon>
          {{ order.status === 'completed' ? t('completed') : t('active') }}
        </span>
      </div>

      <div class="order-hero-metrics mt-3">
        <div class="hero-metric">
          <div class="hero-label">Progress</div>
          <div class="hero-value">{{ orderPct }}%</div>
        </div>
        <div class="hero-metric">
          <div class="hero-label">Payment</div>
          <div class="hero-value" :style="{ color: paymentStateColor }">{{ paymentStateLabel }}</div>
        </div>
        <div class="hero-metric">
          <div class="hero-label">Pending Payment</div>
          <div class="hero-value">{{ fmt(orderFinance.remaining || 0) }}</div>
        </div>
      </div>

      <div class="close-flow-wrap order-hero-close mt-3">
        <div class="close-flow-copy">
          <div class="close-flow-title">Order Lifecycle</div>
          <div class="close-flow-sub">Open → Production Complete → Close (paid & archived)</div>
        </div>
        <div class="close-flow-actions">
          <v-chip size="small" :color="order.orderStatus === 'open' ? 'info' : 'success'" variant="tonal">
            {{ order.orderStatus === 'open' ? 'Open' : order.orderStatus === 'production_complete' ? 'Production Done' : 'Closed' }}
          </v-chip>
          <v-chip v-if="order.orderStatus === 'closed'" size="small" color="success" variant="tonal">Paid & Archived</v-chip>

          <v-btn v-if="!order.productionClosed && order.orderStatus !== 'closed'" size="small" color="primary" variant="flat" rounded="lg" :loading="completingOrder" :disabled="!hasProductionHistory" @click="openCompleteOrderDialog">Mark Production Complete</v-btn>
          <v-btn v-if="order.productionClosed && order.orderStatus !== 'closed'" size="small" color="success" variant="flat" rounded="lg" :loading="closingOrder" @click="openCloseOrderDialog">Close Order</v-btn>
          <v-btn v-if="order.orderStatus === 'closed' && isAdmin" size="small" color="warning" variant="flat" rounded="lg" :loading="reopeningOrder" @click="reopenOrder" prepend-icon="mdi-lock-open-variant">Reopen</v-btn>
        </div>
      </div>
        <div class="repeat-order-footer mt-3">
          <div class="repeat-order-footer-copy">
            <div class="repeat-order-footer-title">Need to repeat this order?</div>
            <div class="repeat-order-footer-sub">Create a fresh copy with the same details and a new start date.</div>
          </div>
          <v-btn
            color="primary"
            variant="flat"
            rounded="lg"
            size="default"
            prepend-icon="mdi-content-copy"
            @click="openRepeatOrderDialog"
          >
            Repeat Order
          </v-btn>
        </div>
    </v-card>

    <v-row class="overview-row align-stretch mb-4">
      <v-col cols="12" lg="8">
        <v-card rounded="lg" class="at-card pa-4 order-kpi-card h-100">
          <v-row class="mb-3 order-kpi-meters-row">
            <v-col cols="6" sm="4" md="4" lg="2"><div class="order-kpi-label">{{ t('expectedMeter') }}</div><div class="order-kpi-value">{{ fmtN(order.expectedMeter) }} m</div></v-col>
            <v-col cols="6" sm="4" md="4" lg="2"><div class="order-kpi-label">{{ t('producedMeter') }}</div><div class="order-kpi-value c-produced">{{ fmtN(order.producedMeter) }} m</div></v-col>
            <v-col cols="6" sm="4" md="4" lg="2"><div class="order-kpi-label">Rejected Meters</div><div class="order-kpi-value c-rejected">{{ fmtN(rejectionLostMeter) }} m</div></v-col>
            <v-col cols="6" sm="4" md="4" lg="2"><div class="order-kpi-label">Accepted Meters</div><div class="order-kpi-value c-accepted">{{ fmtN(acceptedMeters) }} m</div></v-col>
            <v-col cols="6" sm="4" md="4" lg="2"><div class="order-kpi-label">Remaining</div><div class="order-kpi-value c-remaining">{{ fmtN(Math.max(0, order.expectedMeter - order.producedMeter)) }} m</div></v-col>
            <v-col cols="6" sm="4" md="4" lg="2"><div class="order-kpi-label">Over Produced</div><div class="order-kpi-value c-over">{{ fmtN(overProducedMeter) }} m</div></v-col>
          </v-row>
          <v-row class="mb-2">
            <v-col cols="6"><div style="font-size:11px;color:#5A6A85">{{ t('startDate') }}</div><div class="font-weight-bold">{{ order.startDate ? fmtDate(order.startDate) : '-' }}</div></v-col>
            <v-col cols="6"><div style="font-size:11px;color:#5A6A85">{{ t('endDate') }}</div><div class="font-weight-bold">{{ order.endDate ? fmtDate(order.endDate) : '-' }}</div></v-col>
          </v-row>
          <v-row class="mb-2">
            <v-col cols="6"><div style="font-size:11px;color:#5A6A85">{{ t('reedPick') }}</div><div class="font-weight-bold">{{ order.reedPick || '-' }}</div></v-col>
            <v-col cols="6"><div style="font-size:11px;color:#5A6A85">{{ t('size') }}</div><div class="font-weight-bold">{{ order.size || '-' }}</div></v-col>
          </v-row>
          <div class="at-progress" style="height:10px"><div class="at-progress-fill" :style="{ width: orderPct + '%', background: '#1565C0' }" /></div>
          <div style="font-size:12px;color:#5A6A85;margin-top:4px">{{ orderPct }}% {{ t('completed') }}</div>

          <div class="order-insights mt-3">
            <div v-for="insight in orderInsights" :key="insight.label" class="order-insight-item">
              <div class="order-insight-label">{{ insight.label }}</div>
              <div class="order-insight-value">{{ insight.value }}</div>
            </div>
          </div>
        </v-card>
      </v-col>
      <v-col cols="12" lg="4" class="summary-col">
        <v-card rounded="lg" class="at-card pa-4 financial-summary-card h-100">
          <div class="financial-summary-layout" :class="{ 'no-image': !order.sampleImage }">
            <div class="financial-sample-wrap" v-if="order.sampleImage">
              <img :src="order.sampleImage" alt="sample" class="financial-sample-image" @click="openImagePreview(order.sampleImage)" />
            </div>
            <div class="financial-summary-content">
              <div class="financial-summary-head">
                <div class="financial-summary-title">Financial Summary</div>
                <div class="financial-summary-sub">Live order value snapshot</div>
              </div>
              <v-row dense class="financial-summary-grid">
                <v-col v-for="f in financials" :key="f.label" cols="6" sm="6" md="12">
                  <div class="financial-summary-item" :style="{ '--tone': f.color }">
                    <div class="financial-summary-label">{{ f.label }}</div>
                    <div class="financial-summary-value" :style="{ color: f.color }">{{ fmt(f.value) }}</div>
                  </div>
                </v-col>
              </v-row>
            </div>
          </div>
        </v-card>
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12">
        <v-card rounded="lg" class="at-card pa-4 mb-4">
          <div class="font-weight-bold" style="font-size:14px">🧶 {{ t('nool') }}</div>
          <div style="font-size:12px;color:#5A6A85" class="mb-3">All fields below are mandatory for accurate stock trace.</div>
          <v-form :key="noolFormKey" ref="noolFormRef" class="nool-form mb-3" validate-on="input" @submit.prevent="addNoolEntry">
            <div v-if="noolEditId" class="mb-2" style="font-size:12px;color:#7B1FA2">{{ t('edit') }} {{ t('nool') }}</div>
            <v-row>
              <v-col cols="6"><v-text-field v-model="noolForm.date" type="date" :label="t('date')" density="compact" hide-details="auto" :rules="[v=>!!v||t('required')]" :disabled="isOperationalLocked" /></v-col>
              <v-col cols="6"><v-text-field v-model="noolForm.dcNumber" :label="t('dcNumber')" density="compact" hide-details="auto" :rules="[v=>!!String(v||'').trim()||t('required')]" :disabled="isOperationalLocked" /></v-col>
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
                    Cone Bags
                  </button>
                  <button
                    type="button"
                    class="nool-type-btn"
                    :class="{ active: noolForm.packageType === 'nool_bundle' }"
                    :disabled="isOperationalLocked"
                    @click="setNoolPackageType('nool_bundle')"
                  >
                    <span class="nool-yarn-emoji mr-1" aria-hidden="true">🧶</span>
                    Nool Bundles
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
                    Receipt
                  </button>
                  <button
                    type="button"
                    class="nool-entry-btn return"
                    :class="{ active: noolForm.entryType === 'return' }"
                    :disabled="isOperationalLocked"
                    @click="setNoolEntryType('return')"
                  >
                    <v-icon size="14" class="mr-1">mdi-arrow-u-left-top-bold</v-icon>
                    Return
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
                  :label="noolForm.packageType === 'cone_bag' ? 'No of Cone Bags' : 'No of Nool Kattu'"
                  type="number"
                  density="compact"
                  hide-details="auto"
                  placeholder="Optional"
                  :disabled="isOperationalLocked"
                  @update:model-value="autoFillNoolQty"
                />
              </v-col>
              <v-col cols="4">
                <v-text-field
                  v-model="noolForm.unitWeight"
                  :label="noolForm.packageType === 'cone_bag' ? 'Weight per Bag' : 'Weight per Kattu'"
                  type="number"
                  suffix="kg"
                  density="compact"
                  hide-details="auto"
                  placeholder="Optional"
                  :disabled="isOperationalLocked"
                  @update:model-value="autoFillNoolQty"
                />
              </v-col>
              <v-col cols="4">
                <v-text-field v-model.number="noolForm.qty" label="Total Weight" type="number" suffix="kg" density="compact" hide-details="auto" placeholder="Optional" :disabled="isOperationalLocked" />
              </v-col>
              <v-col cols="12">
                <v-text-field v-model="noolForm.notes" label="Notes" density="compact" hide-details="auto" placeholder="Optional remarks" :disabled="isOperationalLocked" />
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
                    Add Item
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
                    Save All ({{ noolDraftLines.length }})
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
          <div v-if="isOperationalLocked" class="text-caption mb-3" style="color:#E65100">Production is closed for this order. Nool entries are locked and remain visible as read-only reference.</div>

          <div v-if="!noolEditId && noolDraftLines.length" class="nool-draft-wrap mb-3">
            <div class="nool-draft-head">DC Batch Items ({{ noolDraftLines.length }})</div>
            <div class="nool-draft-list">
              <div v-for="(line, idx) in noolDraftLines" :key="`${line.packageType}-${line.yarnCount}-${line.colour}-${idx}`" class="nool-draft-row">
                <span>{{ line.packageType === 'nool_bundle' ? 'Bundle' : 'Cone' }}</span>
                <span>{{ line.yarnCount || '-' }}</span>
                <span>{{ line.colour || '-' }}</span>
                <span>{{ formatFixed2(line.noOfPackages || 0) }}</span>
                <span>{{ formatFixed2(line.qty || 0) }} kg</span>
                <button type="button" class="nool-draft-remove" @click="removeNoolDraftLine(idx)">Remove</button>
              </div>
            </div>
          </div>

          <!-- Cone Bags collapsible section -->
          <div class="nool-section-header cone-section" @click="coneBagsExpanded = !coneBagsExpanded">
            <div class="nool-section-main">
              <div class="nool-section-copy">
                <div class="nool-section-title-row">
                  <span class="nool-section-title">Cone Bags</span>
                  <v-chip size="x-small" color="primary" variant="tonal">{{ coneBagRows.length }} entries</v-chip>
                </div>
                <div class="nool-section-meta">
                  <span>In: {{ formatFixed2(coneBagStats.receivedPackages) }} bags / {{ formatFixed2(coneBagStats.receivedQty) }} kg</span>
                  <span>Return: {{ formatFixed2(coneBagStats.returnPackages) }} bags / {{ formatFixed2(coneBagStats.returnQty) }} kg</span>
                  <span>Net: {{ formatFixed2(coneBagStats.netPackages) }} bags / {{ formatFixed2(coneBagStats.netQty) }} kg</span>
                </div>
              </div>
            </div>
            <v-icon class="nool-section-chevron">{{ coneBagsExpanded ? 'mdi-chevron-up' : 'mdi-chevron-down' }}</v-icon>
          </div>
          <div v-show="coneBagsExpanded" class="nool-section-body">
            <!-- Cone Bag Receipts -->
            <div v-if="coneBagReceipts.length > 0">
              <div class="nool-sub-header">📥 Receipts</div>
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
                  <span class="nool-section-title bundle-title">Nool Bundles</span>
                  <v-chip size="x-small" color="purple" variant="tonal">{{ noolBundleRows.length }} entries</v-chip>
                </div>
                <div class="nool-section-meta">
                  <span>In: {{ formatFixed2(noolBundleStats.receivedPackages) }} kattu / {{ formatFixed2(noolBundleStats.receivedQty) }} kg</span>
                  <span>Return: {{ formatFixed2(noolBundleStats.returnPackages) }} kattu / {{ formatFixed2(noolBundleStats.returnQty) }} kg</span>
                  <span>Net: {{ formatFixed2(noolBundleStats.netPackages) }} kattu / {{ formatFixed2(noolBundleStats.netQty) }} kg</span>
                </div>
              </div>
            </div>
            <v-icon class="nool-section-chevron">{{ noolBundlesExpanded ? 'mdi-chevron-up' : 'mdi-chevron-down' }}</v-icon>
          </div>
          <div v-show="noolBundlesExpanded" class="nool-section-body">
            <!-- Nool Bundle Receipts -->
            <div v-if="noolBundleReceipts.length > 0">
              <div class="nool-sub-header">📥 Receipts</div>
              <AgTable :rowData="noolBundleReceipts" :columnDefs="noolBundleCols" height="auto" :pagination="false" />
            </div>
            <!-- Nool Bundle Returns -->
            <div v-if="noolBundleReturns.length > 0" class="mt-3">
              <div class="nool-sub-header return-header">↩️ Returns</div>
              <AgTable :rowData="noolBundleReturns" :columnDefs="noolBundleCols" height="auto" :pagination="false" />
            </div>
          </div>

          <div class="pa-4 mt-3 mb-2" style="border-top:1px solid #E0E7EF;background:#FAFCFF;border-radius:12px">
            <div class="font-weight-bold mb-4" style="font-size:13px;color:#1A2744">Yarn Weight Shortage</div>
            <v-row class="yarn-shortage-row">
              <v-col cols="12" sm="6" lg="2">
                <v-text-field
                  :model-value="formatFixed2(totalYarnWeight)"
                  label="Total Yarn Weight"
                  suffix="kg"
                  density="compact"
                  hide-details="auto"
                  readonly
                />
              </v-col>
              <v-col cols="12" sm="6" lg="2">
                <v-text-field
                  :model-value="formatFixed2(totalProductionWeightForShortage)"
                  label="Total Production Weight"
                  suffix="kg"
                  density="compact"
                  hide-details="auto"
                  readonly
                />
              </v-col>
              <v-col cols="12" sm="6" lg="2">
                <v-text-field
                  :model-value="formatFixed2(totalReturnWeight)"
                  label="Total Wa-pass Weight"
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
                  label="Enter Weight"
                  suffix="kg"
                  density="compact"
                  hide-details="auto"
                  :disabled="yarnShortageSaving"
                />
              </v-col>
              <v-col cols="12" sm="6" lg="4">
                <v-text-field
                  :model-value="formatFixed2(totalWeightShortage)"
                  label="Total Weight Shortage"
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
    <v-row class="mt-0">
      <v-col cols="12">
        <v-card rounded="lg" class="at-card" style="overflow:hidden">
          <div class="px-4 py-3 font-weight-bold" style="border-bottom:1px solid #E0E7EF;font-size:14px">{{ t('production') }} History</div>
          <div class="pa-4" style="border-bottom:1px solid #E0E7EF">
            <div style="font-size:12px;color:#5A6A85" class="mb-3">Date, DC Number and Meter are mandatory. Weight (kg) is optional.</div>
            <div v-if="prodEditId" class="mb-2" style="font-size:12px;color:#7B1FA2">{{ t('edit') }} {{ t('production') }}</div>
            <v-form :key="prodFormKey" ref="prodFormRef" class="prod-form" validate-on="input" @submit.prevent="addProductionEntry">
              <v-row dense class="align-start">
                <v-col cols="12" sm="6" lg="2">
                  <v-text-field v-model="prodForm.date" type="date" :label="t('date')" density="compact" hide-details="auto" :rules="[v=>!!v||t('required')]" :disabled="isOperationalLocked" />
                </v-col>
                <v-col cols="12" sm="6" lg="2">
                  <v-text-field v-model="prodForm.dcNumber" :label="t('dcNumber')" density="compact" hide-details="auto" :rules="[v=>!!String(v||'').trim()||t('required')]" :disabled="isOperationalLocked" />
                </v-col>
                <v-col cols="12" sm="6" lg="2">
                  <v-text-field v-model.number="prodForm.meter" :label="t('meter')" type="number" suffix="m" density="compact" hide-details="auto" :rules="[v=>Number(v)>0||t('required')]" :disabled="isOperationalLocked" />
                </v-col>
                <v-col cols="12" sm="6" lg="2">
                  <v-text-field v-model.number="prodForm.weightKg" label="Weight" type="number" suffix="kg" density="compact" hide-details="auto" :disabled="isOperationalLocked" />
                </v-col>
                <v-col cols="12" sm="6" lg="2">
                  <v-text-field v-model="prodForm.notes" label="Notes" density="compact" hide-details="auto" :disabled="isOperationalLocked" />
                </v-col>
                <v-col cols="12" sm="6" lg="2" class="d-flex align-center prod-action-col">
                  <v-btn color="primary" variant="flat" rounded="lg" class="w-100 prod-action-btn" :prepend-icon="prodEditId ? undefined : 'mdi-plus-circle-outline'" :loading="prodSaving" :disabled="isOperationalLocked" type="submit" size="default">{{ prodEditId ? t('save') : t('add') }}</v-btn>
                </v-col>
                <v-col v-if="prodEditId" cols="12" sm="6" lg="2" class="d-flex align-center prod-action-col">
                  <v-btn variant="text" rounded="lg" class="w-100 prod-action-btn" :disabled="isOperationalLocked" @click="clearProductionForm" size="default">{{ t('cancel') }}</v-btn>
                </v-col>
              </v-row>
            </v-form>
            <div v-if="isOperationalLocked" class="text-caption mt-2" style="color:#E65100">Production is closed for this order. Production entries are locked and remain visible as read-only reference.</div>
          </div>
          <AgTable :rowData="productions" :columnDefs="prodCols" :footerRows="productionFooterRows" height="300px" />
          <div class="pa-4" style="border-top:1px solid #E0E7EF">
            <v-row dense justify="end">
              <v-col cols="12" sm="6" lg="3">
                <v-text-field
                  v-model.number="avgWeightPerMeter"
                  @update:model-value="onAvgWeightChanged"
                  @blur="saveAvgWeightIfDirty"
                  @keydown.enter="saveAvgWeightIfDirty"
                  label="Average Weight per Meter"
                  type="number"
                  suffix="kg/m"
                  density="compact"
                  hide-details="auto"
                  placeholder="Optional"
                  :disabled="isOperationalLocked || avgWeightSaving"
                />
              </v-col>
              <v-col cols="12" sm="6" lg="3">
                <v-text-field
                  :model-value="productionTotalWeightFromAverage"
                  label="Total Weight"
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

    <v-row class="mt-0">
      <v-col cols="12">
        <v-card rounded="lg" class="at-card" style="overflow:hidden">
          <div class="px-4 py-3 font-weight-bold" style="border-bottom:1px solid #E0E7EF;font-size:14px">Rejections</div>
          <div class="pa-4" style="border-bottom:1px solid #E0E7EF">
            <v-form :key="rejectionFormKey" ref="rejectionFormRef" validate-on="input" @submit.prevent="saveRejectionEntry">
              <v-row dense class="align-start">
                <v-col cols="12" sm="4" lg="2">
                  <v-text-field v-model="rejectionForm.date" type="date" label="Date" density="compact" hide-details="auto" :rules="[v => !!v || t('required')]" :disabled="isOperationalLocked" />
                </v-col>
                <v-col cols="12" sm="4" lg="2">
                  <v-text-field v-model.number="rejectionForm.rejectedQty" type="number" label="Rejected (m)" density="compact" hide-details="auto" :rules="[v => Number(v) > 0 || t('required')]" :disabled="isOperationalLocked" />
                </v-col>
                <v-col cols="12" sm="4" lg="3">
                  <v-text-field v-model="rejectionForm.reason" label="Reason" density="compact" hide-details="auto" :disabled="isOperationalLocked" />
                </v-col>
                <v-col cols="12" sm="8" lg="3">
                  <v-text-field v-model="rejectionForm.notes" label="Notes" density="compact" hide-details="auto" :disabled="isOperationalLocked" />
                </v-col>
                <v-col cols="12" sm="4" lg="2" class="d-flex align-center">
                  <v-btn color="primary" variant="flat" rounded="lg" class="w-100" type="submit" :loading="rejectionSaving" :disabled="isOperationalLocked">{{ rejectionEditId ? t('save') : t('add') }}</v-btn>
                </v-col>
                <v-col cols="12" sm="4" lg="2" class="d-flex align-center" v-if="rejectionEditId">
                  <v-btn variant="text" rounded="lg" class="w-100" @click="clearRejectionForm">{{ t('cancel') }}</v-btn>
                </v-col>
              </v-row>
            </v-form>
            <div v-if="isOperationalLocked" class="text-caption mt-2" style="color:#E65100">Production is closed for this order. Rejections are locked.</div>
          </div>
          <AgTable :rowData="rejections" :columnDefs="rejectionCols" :footerRows="rejectionFooterRows" height="260px" :pagination="false" />
        </v-card>
      </v-col>
    </v-row>

    <!-- Order Activity History -->
    <v-card v-if="orderHistory.length" rounded="lg" class="at-card pa-4 mt-4 mb-5">
      <div class="d-flex align-center justify-space-between mb-3">
        <div class="d-flex align-center gap-2">
          <v-icon size="18" color="primary">mdi-history</v-icon>
          <span style="font-size:14px;font-weight:700;color:#1E293B">Activity Log</span>
        </div>
        <v-chip size="x-small" color="primary" variant="tonal">{{ orderHistory.length }}</v-chip>
      </div>
      <div class="order-history-list">
        <div v-for="h in orderHistory" :key="h._id" class="order-history-item">
          <div class="order-history-dot" :class="historyActionColor(h.action)"></div>
          <div class="order-history-content">
            <div class="order-history-action">{{ historyActionLabel(h.action) }}</div>
            <div class="order-history-meta">
              <span v-if="h.by">by {{ h.by }}</span>
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
              Add at least one production history entry before completing this order.
            </div>
          </div>

          <!-- Short gap warning -->
          <div v-if="producedGapMeter > 0" class="complete-dialog-warn-box mb-4">
            <div class="complete-dialog-warn-row">
              <div class="complete-dialog-warn-stat">
                <div class="complete-dialog-warn-num">{{ fmtN(order.producedMeter) }} m</div>
                <div class="complete-dialog-warn-label">Produced</div>
              </div>
              <v-icon color="#D97706" size="20">mdi-arrow-right</v-icon>
              <div class="complete-dialog-warn-stat">
                <div class="complete-dialog-warn-num" style="color:#DC2626">{{ fmtN(producedGapMeter) }} m</div>
                <div class="complete-dialog-warn-label">Short</div>
              </div>
              <v-icon color="#D97706" size="20">mdi-arrow-right</v-icon>
              <div class="complete-dialog-warn-stat">
                <div class="complete-dialog-warn-num">{{ fmtN(order.expectedMeter) }} m</div>
                <div class="complete-dialog-warn-label">Expected</div>
              </div>
            </div>
            <div class="complete-dialog-warn-msg">
              <v-icon size="16" color="#92400E" class="mr-1" style="vertical-align:middle">mdi-alert</v-icon>
              You are closing this order <strong>{{ fmtN(producedGapMeter) }} m short</strong> of the expected production.
            </div>
          </div>

          <p style="font-size:14px;color:#1F2937;line-height:1.6">
            {{ producedGapMeter > 0
              ? 'The company has agreed to accept the current production. Proceeding will permanently mark this order as Completed.'
              : 'Production target has been met. Proceeding will permanently mark this order as Completed.' }}
          </p>
          <p style="font-size:12px;color:#9CA3AF;margin-top:8px">This action cannot be undone. Further production entries will not revert the status.</p>
        </v-card-text>

        <v-divider />
        <v-card-actions class="px-5 py-4">
          <v-btn variant="outlined" rounded="lg" @click="completeOrderDialog = false" :disabled="completingOrder" style="min-width:100px">Cancel</v-btn>
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
            Yes, Complete Order
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Close Order Dialog (allocate from company balance) -->
    <v-dialog v-model="closeOrderDialog" max-width="520" persistent>
      <v-card rounded="xl" style="overflow:hidden">
        <div style="background:linear-gradient(135deg,#2E7D32,#66BB6A);padding:20px 24px;display:flex;align-items:center;gap:14px">
          <v-icon size="36" color="white">mdi-cash-check</v-icon>
          <div>
            <div style="font-size:18px;font-weight:800;color:white">Close Order</div>
            <div style="font-size:12px;color:rgba(255,255,255,0.8)">{{ order.orderName }}</div>
          </div>
        </div>

        <v-card-text class="px-5 pt-5 pb-3">
          <div style="background:#F0FFF4;border:1px solid #C6F6D5;border-radius:12px;padding:16px;margin-bottom:16px">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
              <div>
                <div style="font-size:11px;color:#5A6A85;text-transform:uppercase;font-weight:700">Accepted Meters</div>
                <div style="font-size:16px;font-weight:800;color:#1A2744">{{ fmtN(acceptedMeters) }} m</div>
              </div>
              <div>
                <div style="font-size:11px;color:#5A6A85;text-transform:uppercase;font-weight:700">Rate</div>
                <div style="font-size:16px;font-weight:800;color:#1A2744">{{ fmt(order.ratePerMeter || 0) }}/m</div>
              </div>
              <div>
                <div style="font-size:11px;color:#5A6A85;text-transform:uppercase;font-weight:700">Gross Value</div>
                <div style="font-size:16px;font-weight:800;color:#1565C0">{{ fmt(closeInfo.grossValue || orderFinance.total || 0) }}</div>
              </div>
              <div>
                <div style="font-size:11px;color:#5A6A85;text-transform:uppercase;font-weight:700">Deduction ({{ order.deductionPct }}%)</div>
                <div style="font-size:16px;font-weight:800;color:#E65100">-{{ fmt(closeInfo.deduction || orderFinance.deduction || 0) }}</div>
              </div>
            </div>
            <div style="border-top:2px solid #A7F3D0;margin-top:12px;padding-top:12px;display:flex;justify-content:space-between;align-items:center">
              <div style="font-size:13px;font-weight:700;color:#2E7D32">PAYABLE AMOUNT</div>
              <div style="font-size:22px;font-weight:900;color:#2E7D32">{{ fmt(closeInfo.payable || orderFinance.payable || 0) }}</div>
            </div>
          </div>

          <div style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:12px;padding:16px;margin-bottom:16px">
            <div style="display:flex;justify-content:space-between;align-items:center">
              <div>
                <div style="font-size:11px;color:#5A6A85;text-transform:uppercase;font-weight:700">Company Balance</div>
                <div style="font-size:20px;font-weight:800" :style="{ color: (closeInfo.companyBalance || 0) >= (closeInfo.payable || 0) ? '#2E7D32' : '#DC2626' }">
                  {{ fmt(closeInfo.companyBalance || 0) }}
                </div>
              </div>
              <v-chip :color="closeInfo.canClose ? 'success' : 'error'" variant="tonal" size="small">
                {{ closeInfo.canClose ? 'Sufficient' : 'Insufficient' }}
              </v-chip>
            </div>
            <div v-if="!closeInfo.canClose" style="margin-top:8px;font-size:12px;color:#DC2626;font-weight:600">
              Need {{ fmt((closeInfo.payable || 0) - (closeInfo.companyBalance || 0)) }} more to close this order
            </div>
          </div>

          <div v-if="closeInfo.canClose" style="margin-top:10px;padding:10px 14px;background:#F0FDF4;border-radius:10px;border:1px solid #BBF7D0">
            <div style="font-size:12px;color:#166534;font-weight:600">Balance after close: {{ fmt(closeInfo.balanceAfter || 0) }}</div>
          </div>
          <div v-if="closeInfo.pendingOrders > 0" style="margin-top:8px;padding:10px 14px;background:#FFF7ED;border-radius:10px;border:1px solid #FED7AA">
            <div style="font-size:12px;color:#9A3412;font-weight:600">{{ closeInfo.pendingOrders }} other order{{ closeInfo.pendingOrders > 1 ? 's' : '' }} ({{ fmt(closeInfo.pendingCloseTotal || 0) }}) waiting to close</div>
          </div>

          <p style="font-size:13px;color:#4B5563;line-height:1.6;margin-top:12px">
            Closing will deduct <strong>{{ fmt(closeInfo.payable || orderFinance.payable || 0) }}</strong> from company balance and mark this order as paid & archived.
          </p>
          <p style="font-size:11px;color:#9CA3AF;margin-top:6px">Admin can reopen if needed.</p>
        </v-card-text>

        <v-divider />
        <v-card-actions class="px-5 py-4">
          <v-btn variant="outlined" rounded="lg" @click="closeOrderDialog = false" :disabled="closingOrder" style="min-width:100px">Cancel</v-btn>
          <v-spacer />
          <v-btn color="success" variant="flat" rounded="lg" :loading="closingOrder" :disabled="!closeInfo.canClose" @click="confirmCloseOrder" style="min-width:160px">
            <v-icon start size="16">mdi-check-circle</v-icon>
            Close & Pay
          </v-btn>
        </v-card-actions>
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
            <div class="repeat-dialog-title">Repeat Order</div>
            <div class="repeat-dialog-subtitle">{{ order.orderName }}</div>
          </div>
        </div>
        <v-card-text class="px-5 pt-5 pb-2">
          <v-form ref="repeatOrderFormRef" validate-on="input">
            <v-text-field
              v-model="repeatOrderForm.startDate"
              type="date"
              label="Start Date *"
              density="compact"
              variant="outlined"
              rounded="lg"
              hide-details="auto"
              :rules="[v => !!v || t('required')]"
            />
            <div class="text-caption text-medium-emphasis mt-2">
              New name will be created automatically using the current month and year.
            </div>
          </v-form>
        </v-card-text>
        <v-card-actions class="px-5 pb-5 pt-2">
          <v-spacer />
          <v-btn variant="text" rounded="lg" @click="repeatOrderDialog = false" :disabled="repeatingOrder">Cancel</v-btn>
          <v-btn color="primary" rounded="lg" elevation="0" :loading="repeatingOrder" @click="confirmRepeatOrder">Create Copy</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
  <div v-else class="d-flex align-center justify-center" style="height:400px"><v-progress-circular indeterminate color="primary" /></div>
</template>
<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useOrderStore } from '@/stores/index'
import { useAuthStore } from '@/stores/auth'
import { useUtils } from '@/composables/useUtils'
import { useConfirm } from '@/composables/useConfirm'
import { useNotify } from '@/composables/useNotify'
import AgTable from '@/components/common/AgTable.vue'
import api from '@/plugins/axios'
const route = useRoute(); const { t } = useI18n()
const router = useRouter()
const { fmt, fmtN, fmtDate, fmtDateShort, pct, today } = useUtils()
const { confirm } = useConfirm()
const notify = useNotify()
const orderStore = useOrderStore()
const authStore = useAuthStore()
const isAdmin = computed(() => authStore.user?.role === 'admin')
const order = ref(null); const productions = ref([]); const noolRows = ref([])
const orderNotFound = ref(false); const orderLoading = ref(true)
const reopeningOrder = ref(false)
const orderHistory = ref([])
const imagePreviewDialog = ref(false)
const imagePreviewSrc = ref('')
const repeatOrderDialog = ref(false)
const repeatOrderFormRef = ref()
const repeatOrderForm = ref({ startDate: '' })
const repeatingOrder = ref(false)
const completeOrderDialog = ref(false)
const completingOrder = ref(false)
const archivingOrder = ref(false)
const closeOrderDialog = ref(false)
const closingOrder = ref(false)
const closeInfo = ref({ payable: 0, deduction: 0, grossValue: 0, companyBalance: 0, canClose: false })
const rejections = ref([])
const rejectionFormRef = ref()
const rejectionFormKey = ref(0)
const rejectionSaving = ref(false)
const rejectionEditId = ref(null)
const rejectionForm = ref({ date: today(), rejectedQty: null, reason: '', notes: '' })
const noolFormRef = ref(); const prodFormRef = ref()
const noolFormKey = ref(0); const prodFormKey = ref(0)
const noolSaving = ref(false); const prodSaving = ref(false)
const noolEditId = ref(null); const prodEditId = ref(null)
const avgWeightPerMeter = ref(0)
const avgWeightSaving = ref(false)
const avgWeightHydrating = ref(false)
const avgWeightDirty = ref(false)
const yarnShortageEnteredAmount = ref(0)
const yarnShortageSaving = ref(false)
const yarnShortageHydrating = ref(false)
const yarnShortageDirty = ref(false)
let yarnShortageSaveTimer = null
const noolForm = ref({ date: today(), dcNumber: '', yarnCount: '', yarnCountCustom: '', colour: '', colourCustom: '', entryType: 'receipt', packageType: 'cone_bag', noOfPackages: null, unitWeight: null, qty: null, notes: '' })
const noolDraftLines = ref([])

function goBack() {
  const from = String(route.query.from || 'orders')
  const query = {}
  const passthroughKeys = ['expandCompany', 'osf', 'orf', 'oas', 'oq', 'ors', 'drs']
  for (const key of passthroughKeys) {
    const value = String(route.query[key] || '').trim()
    if (value) query[key] = value
  }

  const orderId = String(route.params.id || '').trim()
  if (orderId) query.highlightOrder = orderId

  if (from === 'dashboard') {
    router.push({ path: '/dashboard', query })
    return
  }

  router.push({ path: '/orders', query })
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
  } catch (e) {
    notify.error(e?.response?.data?.message || 'Failed to save Average Weight per Meter')
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
  } catch (e) {
    notify.error(e?.response?.data?.message || 'Failed to save entered weight')
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
const paymentStateLabel = computed(() => {
  if (order.value?.paymentStatusLabel) return order.value.paymentStatusLabel
  const f = orderFinance.value || {}
  const totalValue = Number(f.totalValue || 0)
  const received = Number(f.receivedAmt || 0)
  const remaining = Number(f.remaining || 0)
  if (totalValue <= 0 && received <= 0) return 'Unpaid'
  if (remaining > 0 && received > 0) return 'Partially Paid'
  if (remaining > 0) return 'Unpaid'
  return 'Fully Paid'
})
const paymentStateColor = computed(() => {
  if (paymentStateLabel.value === 'Fully Paid') return '#2E7D32'
  if (paymentStateLabel.value === 'Partially Paid') return '#E65100'
  return '#C62828'
})
const productionMeterTotal = computed(() => {
  return (productions.value || []).reduce((sum, row) => sum + Number(row?.meter || 0), 0)
})
const productionWeightTotal = computed(() => {
  return (productions.value || []).reduce((sum, row) => sum + Number(row?.weightKg || 0), 0)
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
    weightKg: `${fmtN(productionWeightTotal.value)} kg`,
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
  const payable = Number(orderFinance.value?.payableAmt || 0)
  const received = Number(orderFinance.value?.receivedAmt || 0)
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
const orderInsights = computed(() => [
  { label: 'Payment Received', value: `${receivedPct.value}% (${fmt(orderFinance.value?.receivedAmt || 0)})` },
  { label: 'Target / Day', value: avgDailyTarget.value > 0 ? `${fmtN(avgDailyTarget.value)} m` : '-' },
  { label: 'Produced / Day', value: avgDailyProduced.value > 0 ? `${fmtN(avgDailyProduced.value)} m` : '-' },
  { label: 'Acceptance %', value: `${acceptancePct.value}%` },
  { label: 'ETA to Complete', value: etaToCompleteDays.value },
  { label: 'Deduction %', value: `${fmtN(order.value?.deductionPct || 0)}%` },
  { label: 'Order Age', value: `${orderAgeDays.value} days` },
  { label: 'Plan Window', value: plannedDays.value > 0 ? `${plannedDays.value} days` : '-' },
])
const financials = computed(() => {
  if (!order.value) return []
  const f = orderStore.financials(order.value)
  return [
    { label: 'Total Value', value: f.totalValue, color: '#1A2744' },
    { label: 'Deduction', value: f.deductionAmt, color: '#C62828' },
    { label: 'Payable', value: f.payableAmt, color: '#1565C0' },
    { label: 'Rejection Loss', value: rejectionGrossLoss.value, color: '#6A1B9A' },
    { label: 'Rate/m', value: order.value.ratePerMeter, color: '#1A2744' },
  ]
})
const prodCols = [
  { field:'date', headerName:t('date'), flex:1, valueFormatter: p => p?.data?.__isFooter ? (p.value || '') : fmtDateShort(p.value) },
  { field:'dcNumber', headerName:t('dcNumber'), flex:1 },
  { field:'meter', headerName:t('meter'), flex:1, valueFormatter: p => p?.data?.__isFooter ? (p.value || '') : fmtN(p.value)+' m' },
  { field:'weightKg', headerName:'Weight', flex:0.8, valueFormatter: p => p?.data?.__isFooter ? (p.value || '') : (p.value == null ? '-' : fmtN(p.value)+' kg') },
  { field:'notes', headerName:'Notes', flex:1.2, valueFormatter: p => p.value || '-' },
  { headerName:t('actions'), flex:1.1, sortable:false, filter:false,
    cellRenderer: p => `<div style="display:flex;gap:4px;padding-top:4px">
      <button data-id="${p.data._id}" data-action="edit" style="background:#F3E5F5;border:none;border-radius:6px;padding:4px 8px;cursor:pointer;color:#7B1FA2;font-size:11px;font-weight:600">Edit</button>
      <button data-id="${p.data._id}" data-action="delete" style="background:#FFEBEE;border:none;border-radius:6px;padding:4px 8px;cursor:pointer;color:#C62828;font-size:11px;font-weight:600">Delete</button>
    </div>`,
    onCellClicked: async e => {
      const action = e.event.target?.dataset?.action
      const id = e.event.target?.dataset?.id
      if (!action || !id || isOperationalLocked.value) return
      if (action === 'edit') startEditProduction(e.data)
      if (action === 'delete') await removeProduction(id)
    },
  },
]

const rejectionCols = [
  { field: 'date', headerName: 'Date', flex: 1, valueFormatter: p => p?.data?.__isFooter ? (p.value || '') : fmtDateShort(p.value) },
  { field: 'rejectedQty', headerName: 'Rejected (m)', flex: 1, valueFormatter: p => p?.data?.__isFooter ? (p.value || '') : fmtN(p.value || 0) + ' m' },
  { field: 'reason', headerName: 'Reason', flex: 1.2, valueFormatter: p => p.value || '-' },
  { field: 'notes', headerName: 'Notes', flex: 1.5, valueFormatter: p => p.value || '-' },
  {
    headerName: t('actions'),
    flex: 1.1,
    sortable: false,
    filter: false,
    cellRenderer: p => `<div style="display:flex;gap:4px;padding-top:4px">
      <button data-id="${p.data._id}" data-action="edit" style="background:#F3E5F5;border:none;border-radius:6px;padding:4px 8px;cursor:pointer;color:#7B1FA2;font-size:11px;font-weight:600">Edit</button>
      <button data-id="${p.data._id}" data-action="delete" style="background:#FFEBEE;border:none;border-radius:6px;padding:4px 8px;cursor:pointer;color:#C62828;font-size:11px;font-weight:600">Delete</button>
    </div>`,
    onCellClicked: async e => {
      const action = e.event.target?.dataset?.action
      const id = e.event.target?.dataset?.id
      if (!action || !id || isOperationalLocked.value) return
      if (action === 'edit') startEditRejection(e.data)
      if (action === 'delete') await removeRejection(id)
    },
  },
]
const noolCols = [
  { field:'date', headerName:t('date'), flex:1, valueFormatter: p=>fmtDate(p.value) },
  { field:'entryType', headerName:'Type', flex:0.9, valueFormatter: p=> (p.value === 'return' ? 'Return' : 'Receipt') },
  { field:'dcNumber', headerName:t('dcNumber'), flex:1 },
  { field:'yarnCount', headerName:t('yarnCount'), flex:1 },
  { field:'colour', headerName:t('colour'), flex:1 },
  { field:'noOfPackages', headerName:'Cone Bags', flex:0.8, valueFormatter: p=>formatFixed2(p.value) },
  { field:'qty', headerName:'Total Weight', flex:1, valueFormatter: p=>formatFixed2(p.value)+' kg' },
  { field:'notes', headerName:'Notes', flex:1.2, valueFormatter: p=>p.value||'-' },
  { headerName:t('actions'), flex:1.1, sortable:false, filter:false,
    cellRenderer: p => `<div style="display:flex;gap:4px;padding-top:4px">
      <button data-id="${p.data._id}" data-action="edit" style="background:#F3E5F5;border:none;border-radius:6px;padding:4px 8px;cursor:pointer;color:#7B1FA2;font-size:11px;font-weight:600">Edit</button>
      <button data-id="${p.data._id}" data-action="delete" style="background:#FFEBEE;border:none;border-radius:6px;padding:4px 8px;cursor:pointer;color:#C62828;font-size:11px;font-weight:600">Delete</button>
    </div>`,
    onCellClicked: async e => {
      const action = e.event.target?.dataset?.action
      const id = e.event.target?.dataset?.id
      if (!action || !id || isOperationalLocked.value) return
      if (action === 'edit') startEditNool(e.data)
      if (action === 'delete') await removeNool(id)
    },
  },
]

const noolBundleCols = [
  { field:'date', headerName:t('date'), flex:1, valueFormatter: p=>fmtDate(p.value) },
  { field:'entryType', headerName:'Type', flex:0.9, valueFormatter: p=> (p.value === 'return' ? 'Return' : 'Receipt') },
  { field:'dcNumber', headerName:t('dcNumber'), flex:1 },
  { field:'yarnCount', headerName:t('yarnCount'), flex:1 },
  { field:'colour', headerName:t('colour'), flex:1 },
  { field:'noOfPackages', headerName:'Nool Kattu', flex:0.8, valueFormatter: p=>formatFixed2(p.value) },
  { field:'qty', headerName:'Total Weight', flex:1, valueFormatter: p=>formatFixed2(p.value)+' kg' },
  { field:'notes', headerName:'Notes', flex:1.2, valueFormatter: p=>p.value||'-' },
  { headerName:t('actions'), flex:1.1, sortable:false, filter:false,
    cellRenderer: p => `<div style="display:flex;gap:4px;padding-top:4px">
      <button data-id="${p.data._id}" data-action="edit" style="background:#F3E5F5;border:none;border-radius:6px;padding:4px 8px;cursor:pointer;color:#7B1FA2;font-size:11px;font-weight:600">Edit</button>
      <button data-id="${p.data._id}" data-action="delete" style="background:#FFEBEE;border:none;border-radius:6px;padding:4px 8px;cursor:pointer;color:#C62828;font-size:11px;font-weight:600">Delete</button>
    </div>`,
    onCellClicked: async e => {
      const action = e.event.target?.dataset?.action
      const id = e.event.target?.dataset?.id
      if (!action || !id) return
      if (action === 'edit') startEditNool(e.data)
      if (action === 'delete') await removeNool(id)
    },
  },
]

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
  return Number((Number(productionTotalWeightFromAverage.value || 0)).toFixed(2))
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
    window.alert('Date, DC Number and at least one batch item are required')
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
    const [ord, prod, nool, rej] = await Promise.all([
      shouldLoadOrder ? api.get(`/orders/${id}`).then(r => r.data) : Promise.resolve(null),
      shouldLoadProduction ? api.get('/production', { params: { orderId: id } }).then(r => r.data).catch(() => []) : Promise.resolve(null),
      shouldLoadNool ? api.get('/nool', { params: { orderId: id } }).then(r => r.data).catch(() => []) : Promise.resolve(null),
      shouldLoadRejections ? api.get('/rejections', { params: { orderId: id } }).then(r => r.data).catch(() => []) : Promise.resolve(null),
    ])
    if (ord) order.value = ord
    if (prod) productions.value = prod
    if (nool) noolRows.value = nool
    if (rej) rejections.value = rej
    orderNotFound.value = false
  } catch (e) {
    if (e?.response?.status === 404) {
      orderNotFound.value = true
    } else {
      notify.error(e?.response?.data?.message || 'Failed to load order')
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
  const labels = { created: 'Order Created', production_complete: 'Production Completed', closed: 'Order Closed', reopened: 'Order Reopened', deleted: 'Order Deleted' }
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
    noolRows.value = sortRowsByDateDesc(upsertRowById(noolRows.value, data))
    clearNoolForm()
    noolFormRef.value?.resetValidation()
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
    if (data?.entry) {
      productions.value = sortRowsByDateDesc(upsertRowById(productions.value, data.entry))
    }
    if (data?.order) {
      order.value = data.order
      orderStore.upsertLocal(data.order)
    }
    clearProductionForm()
    prodFormRef.value?.resetValidation()
  } finally {
    prodSaving.value = false
  }
}

async function removeNool(id) {
  if (isOperationalLocked.value) return
  const ok = await confirm()
  if (!ok) return
  await api.delete(`/nool/${id}`)
  noolRows.value = noolRows.value.filter(row => row?._id !== id)
  if (noolEditId.value === id) clearNoolForm()
}

async function removeProduction(id) {
  if (isOperationalLocked.value) return
  const ok = await confirm()
  if (!ok) return
  const { data } = await api.delete(`/production/${id}`)
  productions.value = productions.value.filter(row => row?._id !== id)
  if (data?.order) {
    order.value = data.order
    orderStore.upsertLocal(data.order)
  }
  if (prodEditId.value === id) clearProductionForm()
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
    if (data?.entry) {
      rejections.value = sortRowsByDateDesc(upsertRowById(rejections.value, data.entry))
    }
    if (data?.order) {
      order.value = data.order
      orderStore.upsertLocal(data.order)
    }

    clearRejectionForm()
  } catch (error) {
    notify.error(error?.response?.data?.message || 'Failed to save rejection')
  } finally {
    rejectionSaving.value = false
  }
}

async function removeRejection(id) {
  if (isOperationalLocked.value) return
  const ok = await confirm()
  if (!ok) return
  try {
    const { data } = await api.delete(`/rejections/${id}`)
    rejections.value = rejections.value.filter(row => row?._id !== id)
    if (data?.order) {
      order.value = data.order
      orderStore.upsertLocal(data.order)
    }
    if (rejectionEditId.value === id) clearRejectionForm()
  } catch (error) {
    notify.error(error?.response?.data?.message || 'Failed to delete rejection')
  }
}

function openCompleteOrderDialog() {
  if (!hasProductionHistory.value) {
    notify.error('Add at least one production history entry before completing this order')
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
    loadOrderHistory()
  } finally {
    completingOrder.value = false
  }
}

async function archiveOrder() {
  const ok = await confirm({
    title: 'Archive Confirmation',
    message: 'Are you sure you want to archive this order?',
    confirmText: 'Archive',
    confirmColor: 'success',
  })
  if (!ok) return
  archivingOrder.value = true
  try {
    const { data } = await api.patch(`/orders/${route.params.id}/archive`)
    order.value = data
    orderStore.upsertLocal(data)
    notify.success('Order archived')
  } catch (error) {
    notify.error(error?.response?.data?.message || 'Failed to archive order')
  } finally {
    archivingOrder.value = false
  }
}

async function reopenOrder() {
  let info
  try {
    const r = await api.get(`/orders/${route.params.id}/reopen-info`)
    info = r.data
  } catch (e) {
    notify.error(e?.response?.data?.message || 'Failed to load reopen info')
    return
  }

  const ok = await confirm({
    title: 'Reopen Order',
    message: `This will revert the order to "Open" status and free ${fmt(info.freedAmount)} back to company balance.\n\nCurrent balance: ${fmt(info.currentBalance)}\nBalance after reopen: ${fmt(info.currentBalance + info.freedAmount)}`,
    confirmText: 'Reopen',
    confirmColor: 'warning',
  })
  if (!ok) return
  reopeningOrder.value = true
  try {
    const { data } = await api.patch(`/orders/${route.params.id}/reopen`, { reason: '' })
    order.value = data
    orderStore.upsertLocal(data)
    notify.success('Order reopened successfully')
    loadOrderHistory()
  } catch (error) {
    notify.error(error?.response?.data?.message || 'Failed to reopen order')
  } finally {
    reopeningOrder.value = false
  }
}

async function openCloseOrderDialog() {
  try {
    const { data } = await api.get(`/orders/${route.params.id}/close-info`)
    closeInfo.value = data
    closeOrderDialog.value = true
  } catch (error) {
    notify.error(error?.response?.data?.message || 'Failed to load close info')
  }
}

async function confirmCloseOrder() {
  closingOrder.value = true
  try {
    const { data } = await api.patch(`/orders/${route.params.id}/close`)
    order.value = data
    orderStore.upsertLocal(data)
    closeOrderDialog.value = false
    notify.success('Order closed and payment allocated')
    loadOrderHistory()
  } catch (error) {
    notify.error(error?.response?.data?.message || 'Failed to close order')
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
    notify.success(`Repeated as ${data.orderName}`)
    await router.push(`/orders/${data._id}`)
  } catch (error) {
    notify.error(error?.response?.data?.message || 'Failed to repeat order')
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

onBeforeUnmount(() => {
  if (yarnShortageSaveTimer) {
    clearTimeout(yarnShortageSaveTimer)
    yarnShortageSaveTimer = null
  }
})

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
  padding: 48px 40px;
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

.financial-summary-card {
  width: 100%;
  height: 100%;
  background: #fff;
  border: 1px solid #E2E8F0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.financial-summary-layout {
  display: grid;
  grid-template-columns: 140px minmax(0, 1fr);
  gap: 14px;
  align-items: start;
}

.financial-summary-content {
  min-width: 0;
}

.financial-summary-layout.no-image {
  grid-template-columns: minmax(0, 1fr);
}

.financial-summary-head {
  margin-bottom: 12px;
}

.financial-sample-wrap {
  width: 100%;
  height: 140px;
  align-self: start;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid #E2E8F0;
  background: #F8FAFC;
}

.financial-sample-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  background: #F8FAFC;
  cursor: pointer;
  transition: transform 0.2s;
}

.financial-sample-image:hover {
  transform: scale(1.02);
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

  .financial-sample-wrap {
    width: 100%;
    height: 160px;
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

  .financial-sample-wrap {
    width: 100%;
    min-height: 130px;
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
    font-size: 10px;
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
</style>
