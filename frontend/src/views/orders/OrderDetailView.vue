<template>
  <div class="page-container" v-if="order">
    <v-card rounded="xl" class="at-card pa-4 mb-5 order-hero">
      <div class="d-flex align-center gap-2 order-hero-top">
        <v-btn icon="mdi-arrow-left" variant="text" @click="$router.push('/orders')" />
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
    </v-card>

    <v-row class="overview-row align-stretch mb-4">
      <v-col cols="12" md="8">
        <v-card rounded="lg" class="at-card pa-4 order-kpi-card h-100">
          <v-row class="mb-3">
            <v-col cols="4"><div style="font-size:11px;color:#5A6A85">{{ t('expectedMeter') }}</div><div class="font-weight-bold" style="font-size:22px">{{ fmtN(order.expectedMeter) }} m</div></v-col>
            <v-col cols="4"><div style="font-size:11px;color:#5A6A85">{{ t('producedMeter') }}</div><div class="font-weight-bold" style="font-size:22px;color:#1565C0">{{ fmtN(order.producedMeter) }} m</div></v-col>
            <v-col cols="4"><div style="font-size:11px;color:#5A6A85">Remaining</div><div class="font-weight-bold" style="font-size:22px;color:#E65100">{{ fmtN(Math.max(0, order.expectedMeter - order.producedMeter)) }} m</div></v-col>
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
      <v-col cols="12" md="4" class="summary-col">
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
              <v-col cols="6"><v-text-field v-model="noolForm.date" type="date" :label="t('date')" density="compact" hide-details="auto" :rules="[v=>!!v||t('required')]" /></v-col>
              <v-col cols="6"><v-text-field v-model="noolForm.dcNumber" :label="t('dcNumber')" density="compact" hide-details="auto" :rules="[v=>!!String(v||'').trim()||t('required')]" /></v-col>
              <v-col cols="12">
                <!-- Package type toggle -->
                <div class="nool-type-toggle mb-3">
                  <button
                    type="button"
                    class="nool-type-btn"
                    :class="{ active: noolForm.packageType === 'cone_bag' }"
                    @click="setNoolPackageType('cone_bag')"
                  >
                    <v-icon size="16" class="mr-1">mdi-package-variant</v-icon>
                    Cone Bags
                  </button>
                  <button
                    type="button"
                    class="nool-type-btn"
                    :class="{ active: noolForm.packageType === 'nool_bundle' }"
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
                    @click="setNoolEntryType('receipt')"
                  >
                    <v-icon size="14" class="mr-1">mdi-arrow-down-bold-circle-outline</v-icon>
                    Receipt
                  </button>
                  <button
                    type="button"
                    class="nool-entry-btn return"
                    :class="{ active: noolForm.entryType === 'return' }"
                    @click="setNoolEntryType('return')"
                  >
                    <v-icon size="14" class="mr-1">mdi-arrow-u-left-top-bold</v-icon>
                    Return
                  </button>
                </div>
              </v-col>
              <v-col cols="6">
                <v-autocomplete v-model="noolForm.yarnCount" :label="t('yarnCount')" :items="yarnCountOptions" density="compact" hide-details="auto" clearable :rules="[v=>!!v||t('required')]" @update:model-value="onYarnCountSelect">
                  <template #item="{ props, item }">
                    <v-list-item v-bind="props">
                      <template v-if="customYarnCounts.includes(item.raw)" #append>
                        <v-btn icon size="x-small" variant="text" color="error" @click.stop="deleteCustomYarnCount(item.raw)"><v-icon>mdi-delete</v-icon></v-btn>
                      </template>
                    </v-list-item>
                  </template>
                </v-autocomplete>
                <v-text-field v-if="noolForm.yarnCount === 'Others'" v-model="noolForm.yarnCountCustom" :label="t('customYarnCount')" density="compact" hide-details="auto" class="mt-2" :rules="[v=>!!String(v||'').trim()||t('required')]" @blur="saveCustomYarnCount" />
              </v-col>
              <v-col cols="6">
                <v-autocomplete v-model="noolForm.colour" :label="t('colour')" :items="colourOptions" density="compact" hide-details="auto" clearable :rules="[v=>!!v||t('required')]" @update:model-value="onColourSelect">
                  <template #item="{ props, item }">
                    <v-list-item v-bind="props">
                      <template v-if="customColours.includes(item.raw)" #append>
                        <v-btn icon size="x-small" variant="text" color="error" @click.stop="deleteCustomColour(item.raw)"><v-icon>mdi-delete</v-icon></v-btn>
                      </template>
                    </v-list-item>
                  </template>
                </v-autocomplete>
                <v-text-field v-if="noolForm.colour === 'Others'" v-model="noolForm.colourCustom" :label="t('customColour')" density="compact" hide-details="auto" class="mt-2" :rules="[v=>!!String(v||'').trim()||t('required')]" @blur="saveCustomColour" />
              </v-col>
              <v-col cols="4">
                <v-text-field
                  v-model.number="noolForm.noOfPackages"
                  :label="noolForm.packageType === 'cone_bag' ? 'No of Cone Bags' : 'No of Nool Kattu'"
                  type="number"
                  density="compact"
                  hide-details="auto"
                  placeholder="Optional"
                  @update:model-value="autoFillNoolQty"
                />
              </v-col>
              <v-col cols="4">
                <v-text-field
                  v-model.number="noolForm.unitWeight"
                  :label="noolForm.packageType === 'cone_bag' ? 'Weight per Bag' : 'Weight per Kattu'"
                  type="number"
                  suffix="kg"
                  density="compact"
                  hide-details="auto"
                  placeholder="Optional"
                  @update:model-value="autoFillNoolQty"
                />
              </v-col>
              <v-col cols="4">
                <v-text-field v-model.number="noolForm.qty" label="Total Weight" type="number" suffix="kg" density="compact" hide-details="auto" placeholder="Optional" />
              </v-col>
              <v-col cols="12">
                <v-text-field v-model="noolForm.notes" label="Notes" density="compact" hide-details="auto" placeholder="Optional remarks" />
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
                    @click="addNoolEntry"
                  >
                    {{ t('save') }}
                  </v-btn>
                  <v-btn v-if="noolEditId" variant="text" rounded="lg" class="nool-cancel-btn" @click="clearNoolForm">{{ t('cancel') }}</v-btn>
                </div>
              </v-col>
            </v-row>
          </v-form>

          <div v-if="!noolEditId && noolDraftLines.length" class="nool-draft-wrap mb-3">
            <div class="nool-draft-head">DC Batch Items ({{ noolDraftLines.length }})</div>
            <div class="nool-draft-list">
              <div v-for="(line, idx) in noolDraftLines" :key="`${line.packageType}-${line.yarnCount}-${line.colour}-${idx}`" class="nool-draft-row">
                <span>{{ line.packageType === 'nool_bundle' ? 'Bundle' : 'Cone' }}</span>
                <span>{{ line.yarnCount || '-' }}</span>
                <span>{{ line.colour || '-' }}</span>
                <span>{{ fmtN(line.noOfPackages || 0) }}</span>
                <span>{{ fmtN(line.qty || 0) }} kg</span>
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
                  <span>In: {{ fmtN(coneBagStats.receivedPackages) }} bags / {{ fmtN(coneBagStats.receivedQty) }} kg</span>
                  <span>Return: {{ fmtN(coneBagStats.returnPackages) }} bags / {{ fmtN(coneBagStats.returnQty) }} kg</span>
                  <span>Net: {{ fmtN(coneBagStats.netPackages) }} bags / {{ fmtN(coneBagStats.netQty) }} kg</span>
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
                  <span>In: {{ fmtN(noolBundleStats.receivedPackages) }} kattu / {{ fmtN(noolBundleStats.receivedQty) }} kg</span>
                  <span>Return: {{ fmtN(noolBundleStats.returnPackages) }} kattu / {{ fmtN(noolBundleStats.returnQty) }} kg</span>
                  <span>Net: {{ fmtN(noolBundleStats.netPackages) }} kattu / {{ fmtN(noolBundleStats.netQty) }} kg</span>
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
                <v-col cols="12" sm="6" lg="3">
                  <v-text-field v-model="prodForm.date" type="date" :label="t('date')" density="compact" hide-details="auto" :rules="[v=>!!v||t('required')]" />
                </v-col>
                <v-col cols="12" sm="6" lg="3">
                  <v-text-field v-model="prodForm.dcNumber" :label="t('dcNumber')" density="compact" hide-details="auto" :rules="[v=>!!String(v||'').trim()||t('required')]" />
                </v-col>
                <v-col cols="12" sm="6" lg="2">
                  <v-text-field v-model.number="prodForm.meter" :label="t('meter')" type="number" suffix="m" density="compact" hide-details="auto" :rules="[v=>Number(v)>0||t('required')]" />
                </v-col>
                <v-col cols="12" sm="6" lg="2">
                  <v-text-field v-model.number="prodForm.weightKg" label="Weight" type="number" suffix="kg" density="compact" hide-details="auto" />
                </v-col>
                <v-col cols="12" sm="6" lg="2" class="d-flex align-center prod-action-col">
                  <v-btn color="primary" variant="flat" rounded="lg" class="w-100 prod-action-btn" :prepend-icon="prodEditId ? undefined : 'mdi-plus-circle-outline'" :loading="prodSaving" type="submit" size="default">{{ prodEditId ? t('save') : t('add') }}</v-btn>
                </v-col>
                <v-col v-if="prodEditId" cols="12" sm="6" lg="2" class="d-flex align-center prod-action-col">
                  <v-btn variant="text" rounded="lg" class="w-100 prod-action-btn" @click="clearProductionForm" size="default">{{ t('cancel') }}</v-btn>
                </v-col>
              </v-row>
            </v-form>
          </div>
          <AgTable :rowData="productions" :columnDefs="prodCols" height="300px" />
        </v-card>
      </v-col>
    </v-row>
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
  </div>
  <div v-else class="d-flex align-center justify-center" style="height:400px"><v-progress-circular indeterminate color="primary" /></div>
</template>
<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useOrderStore } from '@/stores/index'
import { useUtils } from '@/composables/useUtils'
import { useConfirm } from '@/composables/useConfirm'
import AgTable from '@/components/common/AgTable.vue'
import api from '@/plugins/axios'
const route = useRoute(); const { t } = useI18n()
const { fmt, fmtN, fmtDate, pct, today } = useUtils()
const { confirm } = useConfirm()
const orderStore = useOrderStore()
const order = ref(null); const productions = ref([]); const noolRows = ref([])
const imagePreviewDialog = ref(false)
const imagePreviewSrc = ref('')
const noolFormRef = ref(); const prodFormRef = ref()
const noolFormKey = ref(0); const prodFormKey = ref(0)
const noolSaving = ref(false); const prodSaving = ref(false)
const noolEditId = ref(null); const prodEditId = ref(null)
const noolForm = ref({ date: today(), dcNumber: '', yarnCount: '', yarnCountCustom: '', colour: '', colourCustom: '', entryType: 'receipt', packageType: 'cone_bag', noOfPackages: null, unitWeight: null, qty: null, notes: '' })
const noolDraftLines = ref([])

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
const prodForm = ref({ date: today(), dcNumber: '', meter: null, weightKg: null })
const orderPct = computed(() => pct(order.value?.producedMeter, order.value?.expectedMeter))
const orderFinance = computed(() => (order.value ? orderStore.financials(order.value) : { remaining: 0 }))
const paymentStateLabel = computed(() => {
  const f = orderFinance.value || {}
  const totalValue = Number(f.totalValue || 0)
  const received = Number(f.receivedAmt || 0)
  const remaining = Number(f.remaining || 0)
  if (totalValue <= 0 && received <= 0) return 'Not Started'
  if (remaining > 0) return 'Pending'
  return 'Settled'
})
const paymentStateColor = computed(() => {
  if (paymentStateLabel.value === 'Settled') return '#2E7D32'
  if (paymentStateLabel.value === 'Pending') return '#E65100'
  return '#5A6A85'
})
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
const receivedPct = computed(() => {
  const payable = Number(orderFinance.value?.payableAmt || 0)
  const received = Number(orderFinance.value?.receivedAmt || 0)
  if (payable <= 0) return 0
  return Math.max(0, Math.min(100, Math.round((received / payable) * 100)))
})
const orderInsights = computed(() => [
  { label: 'Order Age', value: `${orderAgeDays.value} days` },
  { label: 'Plan Window', value: plannedDays.value > 0 ? `${plannedDays.value} days` : '-' },
  { label: 'Completion', value: `${orderPct.value}%` },
  { label: 'Remaining Meter', value: `${fmtN(producedGapMeter.value)} m` },
  { label: 'Over Produced', value: `${fmtN(overProducedMeter.value)} m` },
  { label: 'Target / Day', value: avgDailyTarget.value > 0 ? `${fmtN(avgDailyTarget.value)} m` : '-' },
  { label: 'Produced / Day', value: avgDailyProduced.value > 0 ? `${fmtN(avgDailyProduced.value)} m` : '-' },
  { label: 'Payment Received', value: `${receivedPct.value}% (${fmt(orderFinance.value?.receivedAmt || 0)})` },
])
const financials = computed(() => {
  if (!order.value) return []
  const f = orderStore.financials(order.value)
  return [
    { label: 'Total Value', value: f.totalValue, color: '#1A2744' },
    { label: 'Deduction', value: f.deductionAmt, color: '#C62828' },
    { label: 'Payable', value: f.payableAmt, color: '#1565C0' },
    { label: 'Rate/m', value: order.value.ratePerMeter, color: '#1A2744' },
  ]
})
const prodCols = [
  { field:'date', headerName:t('date'), flex:1, valueFormatter: p=>fmtDate(p.value) },
  { field:'dcNumber', headerName:t('dcNumber'), flex:1 },
  { field:'meter', headerName:t('meter'), flex:1, valueFormatter: p=>fmtN(p.value)+' m' },
  { field:'weightKg', headerName:'Weight', flex:1, valueFormatter: p => p.value == null ? '-' : fmtN(p.value)+' kg' },
  { headerName:t('actions'), flex:1.1, sortable:false, filter:false,
    cellRenderer: p => `<div style="display:flex;gap:4px;padding-top:4px">
      <button data-id="${p.data._id}" data-action="edit" style="background:#F3E5F5;border:none;border-radius:6px;padding:4px 8px;cursor:pointer;color:#7B1FA2;font-size:11px;font-weight:600">Edit</button>
      <button data-id="${p.data._id}" data-action="delete" style="background:#FFEBEE;border:none;border-radius:6px;padding:4px 8px;cursor:pointer;color:#C62828;font-size:11px;font-weight:600">Delete</button>
    </div>`,
    onCellClicked: async e => {
      const action = e.event.target?.dataset?.action
      const id = e.event.target?.dataset?.id
      if (!action || !id) return
      if (action === 'edit') startEditProduction(e.data)
      if (action === 'delete') await removeProduction(id)
    },
  },
]
const noolCols = [
  { field:'date', headerName:t('date'), flex:1, valueFormatter: p=>fmtDate(p.value) },
  { field:'entryType', headerName:'Type', flex:0.9, valueFormatter: p=> (p.value === 'return' ? 'Return' : 'Receipt') },
  { field:'dcNumber', headerName:t('dcNumber'), flex:1 },
  { field:'yarnCount', headerName:t('yarnCount'), flex:1 },
  { field:'colour', headerName:t('colour'), flex:1 },
  { field:'noOfPackages', headerName:'Cone Bags', flex:0.8, valueFormatter: p=>fmtN(p.value||0) },
  { field:'qty', headerName:'Total Weight', flex:1, valueFormatter: p=>fmtN(p.value)+' kg' },
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

const noolBundleCols = [
  { field:'date', headerName:t('date'), flex:1, valueFormatter: p=>fmtDate(p.value) },
  { field:'entryType', headerName:'Type', flex:0.9, valueFormatter: p=> (p.value === 'return' ? 'Return' : 'Receipt') },
  { field:'dcNumber', headerName:t('dcNumber'), flex:1 },
  { field:'yarnCount', headerName:t('yarnCount'), flex:1 },
  { field:'colour', headerName:t('colour'), flex:1 },
  { field:'noOfPackages', headerName:'Nool Kattu', flex:0.8, valueFormatter: p=>fmtN(p.value||0) },
  { field:'qty', headerName:'Total Weight', flex:1, valueFormatter: p=>fmtN(p.value)+' kg' },
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

function toInputDate(value) {
  if (!value) return today()
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return today()
  return date.toISOString().slice(0, 10)
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
    noolForm.value.qty = Number((packages * unitWeight).toFixed(3))
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
    for (const line of noolDraftLines.value) {
      await api.post('/nool', {
        ...common,
        packageType: line.packageType || 'cone_bag',
        yarnCount: line.yarnCount,
        colour: line.colour,
        noOfPackages: Number(line.noOfPackages || 0),
        qty: Number(line.qty || 0),
        notes: line.notes || '',
      })
    }
    clearNoolForm()
    await loadOrderData()
  } finally {
    noolSaving.value = false
  }
}

function clearProductionForm() {
  prodEditId.value = null
  prodForm.value = { date: today(), dcNumber: '', meter: null, weightKg: null }
  prodFormRef.value?.resetValidation()
  prodFormKey.value += 1
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
  }
}

async function loadOrderData() {
  const id = route.params.id
  const [ord, prod, nool] = await Promise.all([
    api.get(`/orders/${id}`).then(r => r.data),
    api.get('/production', { params: { orderId: id } }).then(r => r.data),
    api.get('/nool', { params: { orderId: id } }).then(r => r.data),
  ])
  order.value = ord
  productions.value = prod
  noolRows.value = nool
}

async function addNoolEntry() {
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
    if (noolEditId.value) await api.put(`/nool/${noolEditId.value}`, payload)
    else await api.post('/nool', payload)
    clearNoolForm()
    noolFormRef.value?.resetValidation()
    await loadOrderData()
  } finally {
    noolSaving.value = false
  }
}

async function addProductionEntry() {
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
      shift: 'day',
      machineNo: 1,
    }
    if (prodEditId.value) await api.put(`/production/${prodEditId.value}`, payload)
    else await api.post('/production', payload)
    clearProductionForm()
    prodFormRef.value?.resetValidation()
    await loadOrderData()
  } finally {
    prodSaving.value = false
  }
}

async function removeNool(id) {
  const ok = await confirm()
  if (!ok) return
  await api.delete(`/nool/${id}`)
  if (noolEditId.value === id) clearNoolForm()
  await loadOrderData()
}

async function removeProduction(id) {
  const ok = await confirm()
  if (!ok) return
  await api.delete(`/production/${id}`)
  if (prodEditId.value === id) clearProductionForm()
  await loadOrderData()
}

onMounted(loadOrderData)
</script>

<style scoped>
.order-hero {
  background: linear-gradient(100deg, #f7fbff 0%, #eef6ff 55%, #f5f9ff 100%);
  border: 1px solid #dce8f5;
}

/* Nool package type toggle */
.nool-type-toggle {
  display: flex;
  gap: 8px;
  background: #F0F4FF;
  border-radius: 10px;
  padding: 4px;
  width: fit-content;
}

.nool-type-btn {
  display: flex;
  align-items: center;
  padding: 6px 16px;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  color: #5A6A85;
  background: transparent;
  cursor: pointer;
  transition: all 0.2s ease;
}

.nool-type-btn.active {
  background: white;
  color: #1565C0;
  box-shadow: 0 2px 8px rgba(21, 101, 192, 0.18);
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

.nool-type-btn:hover:not(.active) {
  background: rgba(255,255,255,0.5);
  color: #1A2744;
}

.nool-entry-toggle {
  display: flex;
  gap: 8px;
}

.nool-entry-btn {
  display: inline-flex;
  align-items: center;
  border: 1px solid #D6E3F5;
  background: #F7FAFF;
  color: #456189;
  border-radius: 999px;
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
}

.nool-entry-btn.active {
  border-color: #1565C0;
  background: #E7F1FF;
  color: #0F4D93;
}

.nool-entry-btn.return.active {
  border-color: #E65100;
  background: #FFF3E0;
  color: #BF360C;
}

/* Nool collapsible sections */
.nool-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  border-radius: 14px;
  border: 1px solid #D0DEFF;
  cursor: pointer;
  user-select: none;
  transition: background 0.2s, box-shadow 0.2s, transform 0.2s;
  box-shadow: 0 8px 18px rgba(32, 74, 135, 0.06);
}

.nool-section-header:hover {
  transform: translateY(-1px);
  box-shadow: 0 12px 24px rgba(32, 74, 135, 0.1);
}


.nool-section-copy {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.nool-section-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.nool-section-title {
  font-size: 13px;
  font-weight: 800;
  color: #1565C0;
}

.bundle-title {
  color: #7B1FA2;
  display: inline-flex;
  align-items: center;
}

.nool-section-meta {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  font-size: 11px;
  color: #62738e;
}

.nool-section-weight {
  font-size: 12px;
  color: #5A6A85;
  margin-left: 4px;
}

.nool-section-chevron {
  color: #5A6A85;
}

.nool-section-body {
  margin-top: 8px;
  border: 1px solid #E6EDF6;
  border-radius: 14px;
  overflow: hidden;
  background: white;
}

.order-hero-title {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 20px;
  font-weight: 800;
  color: #1a3a63;
}

.order-hero-value {
  color: #0f2e56;
}

.order-hero-sub {
  display: flex;
  align-items: center;
  margin-top: 3px;
  font-size: 13px;
  color: #5a6a85;
}

.order-hero-company {
  margin-left: 4px;
  font-weight: 700;
  color: #35507a;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  border: 1px solid transparent;
  flex-shrink: 0;
  white-space: nowrap;
  margin-left: 20px;
}

.status-badge.active {
  background: #e8f1ff;
  color: #1e63b6;
  border-color: #cfe0fb;
}

.status-badge.done {
  background: #e8f6ec;
  color: #1f7a34;
  border-color: #ccead5;
}

.order-hero-metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.hero-metric {
  background: #fff;
  border: 1px solid #deebf6;
  border-radius: 12px;
  padding: 10px 12px;
}

.hero-label {
  font-size: 11px;
  color: #5f7390;
}

.hero-value {
  margin-top: 2px;
  font-size: 18px;
  font-weight: 800;
  color: #1f65b8;
}

.overview-row {
  margin-bottom: 2px;
}

.order-kpi-card {
  background: linear-gradient(165deg, #ffffff 0%, #f8fbff 100%);
  border: 1px solid #dbe8f5;
}

.order-insights {
  margin-top: 12px;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}

.order-insight-item {
  border: 1px solid #dfe8f4;
  border-radius: 10px;
  padding: 8px 10px;
  background: #fff;
}

.order-insight-label {
  font-size: 10px;
  color: #5a6a85;
}

.order-insight-value {
  margin-top: 2px;
  font-size: 13px;
  font-weight: 700;
  color: #1f3f66;
}

.summary-col {
  display: flex;
}

.financial-summary-card {
  width: 100%;
  height: 100%;
  background: linear-gradient(160deg, #f4f9ff 0%, #eef5ff 48%, #ffffff 100%);
  border: 1px solid #d5e4f7;
  box-shadow: 0 14px 34px rgba(17, 52, 92, 0.08);
}

.financial-summary-layout {
  display: grid;
  grid-template-columns: 140px minmax(0, 1fr);
  gap: 12px;
  align-items: start;
}

.financial-summary-content {
  min-width: 0;
}

.financial-summary-layout.no-image {
  grid-template-columns: minmax(0, 1fr);
}

.financial-summary-head {
  margin-bottom: 10px;
}

.financial-sample-wrap {
  width: 100%;
  height: 140px;
  align-self: start;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid #d5e3f3;
  background: #fff;
}

.financial-sample-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  background: #f9fbff;
  cursor: pointer;
}

.image-preview-card {
  background: #0f1726;
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
  letter-spacing: 1px;
  color: #1457a8;
}

.financial-summary-sub {
  margin-top: 2px;
  font-size: 11px;
  color: #627998;
}

.financial-summary-grid {
  margin-top: 2px;
}

.financial-summary-item {
  position: relative;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid #d9e6f6;
  border-radius: 12px;
  padding: 13px 14px;
}

.financial-summary-item::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  width: 4px;
  height: 100%;
  background: var(--tone, #1565c0);
}

.financial-summary-label {
  font-size: 11px;
  color: #5d7392;
}

.financial-summary-value {
  margin-top: 3px;
  font-size: 27px;
  font-weight: 800;
  line-height: 1.05;
}

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
  min-height: 40px;
  font-weight: 700;
  letter-spacing: 0.2px;
  box-shadow: 0 8px 16px rgba(21, 101, 192, 0.14);
}

.nool-form-actions.is-editing .nool-add-btn {
  width: auto;
  flex: 1;
}

.nool-cancel-btn {
  min-height: 40px;
}

.prod-form-actions {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
}

.prod-submit-btn {
  min-width: 110px;
}

.prod-action-col {
  min-height: 40px;
}

.prod-action-btn {
  min-height: 40px;
}

.prod-form-actions.is-editing .prod-submit-btn {
  flex: 1;
}

@media (max-width: 600px) {
  .order-hero-top {
    flex-wrap: wrap;
    align-items: flex-start;
  }

  .status-badge {
    margin-left: 36px;
  }

  .order-hero-metrics {
    grid-template-columns: 1fr;
  }

  .order-insights {
    grid-template-columns: 1fr 1fr;
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
  }

  .prod-submit-btn {
    width: 100%;
  }

  .financial-summary-value {
    font-size: 22px;
  }

  .financial-summary-layout {
    grid-template-columns: 1fr;
  }

  .financial-sample-wrap {
    width: 100%;
    min-height: 130px;
  }
}

/* Nool section sub-headers for receipts/returns */
.nool-sub-header {
  font-size: 12px;
  font-weight: 700;
  color: #1565c0;
  background: #f0f7ff;
  padding: 10px 14px;
  border-left: 4px solid #1565c0;
  margin-bottom: 12px;
  border-radius: 4px;
}

.nool-sub-header.return-header {
  color: #e65100;
  background: #fff3e0;
  border-left-color: #e65100;
}

.nool-draft-wrap {
  border: 1px solid #d7e6f6;
  border-radius: 12px;
  background: #f8fbff;
}

.nool-draft-head {
  padding: 10px 12px;
  font-size: 12px;
  font-weight: 700;
  color: #1f5ea8;
  border-bottom: 1px solid #e2edf8;
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
  padding: 8px 12px;
  border-top: 1px solid #eef4fb;
  font-size: 12px;
  color: #3b4b60;
}

.nool-draft-remove {
  border: none;
  border-radius: 999px;
  background: #ffebee;
  color: #c62828;
  padding: 4px 10px;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
}
</style>
