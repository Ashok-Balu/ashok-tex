<template>
  <div class="page-container">
    <PageHeader :title="t('orders')" :sub="pageSubtitle">
      <v-btn-toggle v-model="statusFilter" density="compact" rounded="lg" color="primary" variant="outlined" divided class="mr-2">
        <v-btn value="" size="small">All</v-btn>
        <v-btn value="active" size="small">{{ t('active') }}</v-btn>
        <v-btn value="completed" size="small">{{ t('completed') }}</v-btn>
      </v-btn-toggle>
      <v-btn color="primary" prepend-icon="mdi-plus" variant="flat" rounded="lg" @click="open()">{{ t('addOrder') }}</v-btn>
    </PageHeader>

    <v-row class="mb-4">
      <v-col cols="12" sm="6" md="3">
        <v-card rounded="xl" class="at-card order-stat order-stat-primary">
          <div class="order-stat-label">Total Orders</div>
          <div class="order-stat-value">{{ orderStore.items.length }}</div>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-card rounded="xl" class="at-card order-stat order-stat-info">
          <div class="order-stat-label">Active</div>
          <div class="order-stat-value">{{ orderStore.active.length }}</div>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-card rounded="xl" class="at-card order-stat order-stat-good">
          <div class="order-stat-label">Completed</div>
          <div class="order-stat-value">{{ orderStore.completed.length }}</div>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-card rounded="xl" class="at-card order-stat order-stat-warn">
          <div class="order-stat-label">Avg Progress</div>
          <div class="order-stat-value">{{ avgProgress }}%</div>
        </v-card>
      </v-col>
    </v-row>

    <!-- Table -->
    <v-card rounded="xl" class="at-card order-table-shell" style="overflow:hidden">
      <div class="order-toolbar">
        <div class="order-toolbar-title">
          <v-icon size="18" color="primary" class="mr-1">mdi-table-large</v-icon>
          Order Register
        </div>
        <v-text-field v-model="search" :placeholder="t('search')" prepend-inner-icon="mdi-magnify"
          density="compact" variant="outlined" hide-details class="order-search" />
      </div>
      <div class="register-groups" v-if="registerGroups.length">
        <div v-for="group in registerGroups" :key="group.name" class="register-group">
          <div
            class="register-group-head register-group-toggle"
            role="button"
            tabindex="0"
            :aria-expanded="isRegisterExpanded(group.name)"
            @click="toggleRegisterGroup(group.name)"
            @keydown.enter.prevent="toggleRegisterGroup(group.name)"
            @keydown.space.prevent="toggleRegisterGroup(group.name)"
          >
            <div>
              <div class="company-order-title">{{ group.name }}</div>
              <div class="company-order-sub">{{ group.orders.length }} {{ t('orders') }}</div>
            </div>
            <div class="company-order-metrics">
              <span class="company-order-chip">{{ fmtN(group.producedMeter) }} / {{ fmtN(group.expectedMeter) }} m</span>
              <v-btn
                size="small"
                variant="tonal"
                color="primary"
                :prepend-icon="isRegisterExpanded(group.name) ? 'mdi-chevron-up' : 'mdi-chevron-down'"
                @click.stop="toggleRegisterGroup(group.name)"
              >
                {{ isRegisterExpanded(group.name) ? 'Collapse' : 'Expand' }}
              </v-btn>
            </div>
          </div>
          <v-expand-transition>
            <div v-show="isRegisterExpanded(group.name)">
              <AgTable :rowData="group.orders" :columnDefs="registerCols" :quickFilter="search" height="280px" :pagination="false" />
            </div>
          </v-expand-transition>
        </div>
      </div>
      <div v-else class="text-center py-8" style="color:#5A6A85">{{ t('noData') }}</div>
    </v-card>

    <!-- Form Dialog -->
    <v-dialog v-model="dialog" max-width="520" persistent>
      <v-card rounded="xl" class="order-dialog-card">
        <v-card-title class="pt-5 px-6 font-weight-bold d-flex align-center justify-space-between">
          <span>{{ editId ? t('editOrder') : t('addOrder') }}</span>
          <v-chip size="small" color="primary" variant="tonal">Order Form</v-chip>
        </v-card-title>
        <v-card-text class="px-6">
          <v-form ref="formRef" validate-on="blur">
            <div class="form-section-title">Basic Information</div>
            <v-text-field v-model="form.orderName" :label="t('orderName')" class="mb-3" :rules="[v => !!v || t('required')]" />
            <v-autocomplete v-model="form.company" :label="t('company')" :items="companyStore.items"
              item-value="_id" item-title="name" class="mb-3" :rules="[v => !!v || t('required')]" />

            <div class="form-section-title">Production & Value</div>
            <v-row class="mb-1">
              <v-col cols="6"><v-text-field v-model.number="form.expectedMeter" :label="t('expectedMeter')" type="number" suffix="m" hide-details="auto" :rules="[v => Number(v) > 0 || t('required')]" /></v-col>
              <v-col cols="6"><v-text-field v-model.number="form.ratePerMeter" :label="t('ratePerMeter')" type="number" prefix="₹" persistent-hint :hint="rateInWords" :rules="[v => Number(v) > 0 || t('required')]" /></v-col>
            </v-row>
            <v-row class="mb-1">
              <v-col cols="6"><v-text-field v-model="form.reedPick" :label="t('reedPick')" hide-details="auto" :rules="[v => !!String(v || '').trim() || t('required')]" /></v-col>
              <v-col cols="6"><v-text-field v-model="form.size" :label="t('size')" hide-details="auto" :rules="[v => !!String(v || '').trim() || t('required')]" /></v-col>
            </v-row>
            <v-text-field
              v-model.number="form.deductionPct"
              :label="t('deductionPct')"
              type="number"
              suffix="%"
              class="mb-3"
              hide-details="auto"
              :rules="[
                v => !(v === '' || v === null || typeof v === 'undefined') || t('required'),
                v => Number(v) >= 0 || 'Deduction must be 0 or more',
                v => Number(v) <= 100 || 'Deduction cannot exceed 100%'
              ]"
            />
            <v-row class="mb-2 mt-1">
              <v-col cols="12" sm="6"><v-text-field v-model="form.startDate" :label="t('startDate')" type="date" hide-details="auto" /></v-col>
              <v-col cols="12" sm="6"><v-text-field v-model="form.endDate" :label="t('endDate')" type="date" hide-details="auto" /></v-col>
            </v-row>
            <div class="form-section-title">Sample & Reference</div>
            <div class="mb-2" style="font-size:12px;color:#5A6A85">{{ t('sampleImage') }}</div>
            <v-file-input
              accept="image/*"
              :label="t('uploadImage')"
              prepend-inner-icon="mdi-image-plus"
              density="compact"
              variant="outlined"
              hide-details="auto"
              show-size
              @update:model-value="onImageSelect"
            />
            <div v-if="form.sampleImage" class="mt-2">
              <img :src="form.sampleImage" alt="sample" style="max-width:100%;max-height:120px;border-radius:10px;border:1px solid #E0E7EF" />
            </div>
          </v-form>
        </v-card-text>
        <v-card-actions class="px-6 pb-5">
          <v-spacer />
          <v-btn variant="text" @click="dialog=false">{{ t('cancel') }}</v-btn>
          <v-btn color="primary" variant="flat" rounded="lg" :loading="saving" @click="save">{{ t('save') }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useOrderStore, useCompanyStore } from '@/stores/index'
import { useUtils } from '@/composables/useUtils'
import { useConfirm } from '@/composables/useConfirm'
import { useRouter, useRoute } from 'vue-router'
import PageHeader from '@/components/common/PageHeader.vue'
import AgTable from '@/components/common/AgTable.vue'

const { t } = useI18n()
const { fmt, fmtN, pct, fmtDate, numToWords } = useUtils()
const { confirm } = useConfirm()
const router = useRouter()
const route = useRoute()
const orderStore   = useOrderStore()
const companyStore = useCompanyStore()

const search = ref(''); const dialog = ref(false); const saving = ref(false)
const editId = ref(null); const statusFilter = ref('active'); const formRef = ref()
const expandedRegisterGroups = ref([])
const form = ref({ orderName: '', company: null, expectedMeter: 0, ratePerMeter: 0, reedPick: '', size: '', deductionPct: 20, startDate: '', endDate: '', sampleImage: '' })

const filtered = computed(() => statusFilter.value ? orderStore.items.filter(o => o.status === statusFilter.value) : orderStore.items)
function objectIdToTs(id) {
  const raw = String(id || '')
  const hex = raw.slice(0, 8)
  return /^[0-9a-fA-F]{8}$/.test(hex) ? parseInt(hex, 16) * 1000 : 0
}
function orderAddedTs(order) {
  const createdAtTs = new Date(order?.createdAt || 0).getTime()
  if (Number.isFinite(createdAtTs) && createdAtTs > 0) return createdAtTs
  return objectIdToTs(order?._id)
}
const rateInWords = computed(() => numToWords(form.value.ratePerMeter))
const avgProgress = computed(() => {
  if (!orderStore.items.length) return 0
  const total = orderStore.items.reduce((sum, o) => sum + pct(o.producedMeter, o.expectedMeter), 0)
  return Math.round(total / orderStore.items.length)
})
const companyGroups = computed(() => {
  const map = new Map()
  for (const order of filtered.value) {
    const name = order?.company?.name || 'Unknown Company'
    if (!map.has(name)) {
      map.set(name, {
        name,
        orders: [],
        activeCount: 0,
        expectedMeter: 0,
        producedMeter: 0,
      })
    }
    const group = map.get(name)
    group.orders.push(order)
    group.activeCount += order.status === 'active' ? 1 : 0
    group.expectedMeter += Number(order.expectedMeter || 0)
    group.producedMeter += Number(order.producedMeter || 0)
  }
  return Array.from(map.values())
    .map(group => ({
      ...group,
      orders: [...group.orders].sort((a, b) => orderAddedTs(b) - orderAddedTs(a)),
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
})
const registerGroups = computed(() => {
  const term = String(search.value || '').trim().toLowerCase()
  if (!term) return companyGroups.value
  return companyGroups.value
    .map(group => ({
      ...group,
      orders: group.orders.filter(order => {
        const haystack = [
          order.orderName,
          order.company?.name,
          order.reedPick,
          order.size,
          order.status,
        ].join(' ').toLowerCase()
        return haystack.includes(term)
      }),
    }))
    .filter(group => group.orders.length)
})
const pageSubtitle = computed(() => {
  if (statusFilter.value === 'completed') return `${orderStore.completed.length} ${t('completedOrders')}`
  if (statusFilter.value === 'active') return `${orderStore.active.length} ${t('activeOrders')}`
  return `${orderStore.items.length} ${t('orders')}`
})

function goToOrderDetail(row) {
  if (!row?._id) return
  router.push('/orders/' + row._id)
}

watch(companyGroups, (groups) => {
  const names = groups.map(group => group.name)
  expandedRegisterGroups.value = expandedRegisterGroups.value.filter(name => names.includes(name))
}, { immediate: true })

function isRegisterExpanded(name) {
  return expandedRegisterGroups.value.includes(name)
}

function toggleRegisterGroup(name) {
  expandedRegisterGroups.value = isRegisterExpanded(name)
    ? expandedRegisterGroups.value.filter(item => item !== name)
    : [...expandedRegisterGroups.value, name]
}

const cols = [
  { field: 'orderName',    headerName: t('orderName'),   flex: 1.5 },
  { field: 'company.name', headerName: t('company'),     flex: 1.2 },
  { field: 'expectedMeter',headerName: t('expectedMeter'), flex: 1, valueFormatter: p => fmtN(p.value) + ' m' },
  { field: 'producedMeter',headerName: t('producedMeter'), flex: 1, valueFormatter: p => fmtN(p.value) + ' m' },
  { field: 'startDate', headerName: t('startDate'), flex: 1, valueFormatter: p => p.value ? fmtDate(p.value) : '-' },
  { field: 'endDate', headerName: t('endDate'), flex: 1, valueFormatter: p => p.value ? fmtDate(p.value) : '-' },
  { field: 'ratePerMeter', headerName: t('ratePerMeter'), flex: 0.8, valueFormatter: p => '₹' + p.value },
  { field: 'deductionPct', headerName: t('deductionPct'), flex: 0.7, valueFormatter: p => p.value + '%' },
  { field: 'status', headerName: t('status'), flex: 0.8,
    cellRenderer: p => `<span class="${p.value === 'completed' ? 'chip-done' : 'chip-active'}" style="padding:2px 10px;border-radius:20px;font-size:11px">${p.value === 'completed' ? t('completed') : t('active')}</span>` },
  { headerName: t('actions'), flex: 1.35, sortable: false, filter: false, disableRowNavigation: true,
    cellRenderer: p => `<div style="display:flex;gap:4px;padding-top:8px">
      <button data-id="${p.data._id}" data-action="view"   style="background:#E3F2FD;border:none;border-radius:6px;padding:4px 8px;cursor:pointer;color:#1565C0;font-size:11px;font-weight:600">View</button>
      <button data-id="${p.data._id}" data-action="edit"   style="background:#F3E5F5;border:none;border-radius:6px;padding:4px 8px;cursor:pointer;color:#7B1FA2;font-size:11px;font-weight:600">Edit</button>
      <button data-id="${p.data._id}" data-action="delete" style="background:#FFEBEE;border:none;border-radius:6px;padding:4px 8px;cursor:pointer;color:#C62828;font-size:11px;font-weight:600">Delete</button>
    </div>`,
    onCellClicked: async e => {
      const action = e.event.target?.dataset?.action; const id = e.event.target?.dataset?.id
      if (!action || !id) return
      if (action === 'view') router.push('/orders/' + id)
      if (action === 'edit') open(orderStore.items.find(x => x._id === id))
      if (action === 'delete') { const ok = await confirm(); if (ok) await orderStore.remove(id) }
    }
  },
].map(col => (
  col.disableRowNavigation
    ? col
    : { ...col, onCellClicked: ({ data }) => goToOrderDetail(data) }
))

const registerCols = cols.filter(col => col.field !== 'company.name')

function open(row = null) {
  editId.value = row?._id || null
  form.value = {
    orderName: row?.orderName || '',
    company: row?.company?._id || row?.company || null,
    expectedMeter: row?.expectedMeter || 0,
    ratePerMeter: row?.ratePerMeter || 0,
    reedPick: row?.reedPick || '',
    size: row?.size || '',
    deductionPct: row?.deductionPct ?? 20,
    startDate: row?.startDate?.split('T')[0] || '',
    endDate: row?.endDate?.split('T')[0] || '',
    sampleImage: row?.sampleImage || '',
  }
  dialog.value = true
}

function onImageSelect(fileOrFiles) {
  const file = Array.isArray(fileOrFiles) ? fileOrFiles[0] : fileOrFiles
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => { form.value.sampleImage = reader.result }
  reader.readAsDataURL(file)
}

async function save() {
  const { valid } = await formRef.value.validate(); if (!valid) return
  saving.value = true
  try {
    const payload = {
      ...form.value,
      reedPick: String(form.value.reedPick || '').trim(),
      size: String(form.value.size || '').trim(),
    }
    editId.value ? await orderStore.update(editId.value, payload) : await orderStore.create(payload)
    dialog.value = false
  }
  finally { saving.value = false }
}

async function del(id) { const ok = await confirm(); if (ok) await orderStore.remove(id) }

function openFromQuery() {
  if (String(route.query.add || '') !== '1') return
  open()
  const companyId = String(route.query.company || '')
  if (companyId) form.value.company = companyId
  router.replace({ path: '/orders', query: {} })
}

onMounted(async () => {
  await Promise.all([orderStore.fetch(), companyStore.fetch()])
  openFromQuery()
})

watch(() => route.query, () => {
  openFromQuery()
})
</script>

<style scoped>
.order-stat {
  padding: 14px;
  border-radius: 14px !important;
}

.order-stat-label {
  font-size: 12px;
  color: #5a6a85;
}

.order-stat-value {
  margin-top: 4px;
  font-size: 26px;
  font-weight: 800;
}

.order-stat-primary .order-stat-value { color: #1e63b6; }
.order-stat-info .order-stat-value { color: #0c7a8e; }
.order-stat-good .order-stat-value { color: #2e7d32; }
.order-stat-warn .order-stat-value { color: #e65100; }

.order-table-shell {
  border-radius: 18px !important;
}

.order-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  border-bottom: 1px solid #e0e7ef;
  background: linear-gradient(90deg, #f7fbff 0%, #f7fff9 100%);
}

.order-toolbar-title {
  display: flex;
  align-items: center;
  font-size: 13px;
  font-weight: 700;
  color: #2a4a70;
}

.order-search {
  max-width: 320px;
}

.order-dialog-card {
  background: linear-gradient(180deg, #ffffff 0%, #fbfdff 100%);
}

.register-groups {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 14px;
}

.register-group {
  border: 1px solid #dfe9f2;
  border-radius: 16px;
  overflow: hidden;
  background: #fff;
}

.register-group-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  background: linear-gradient(90deg, #f7fbff 0%, #f9fcff 100%);
  border-bottom: 1px solid #e7eef5;
}

.register-group-toggle {
  cursor: pointer;
  user-select: none;
}

.register-group-toggle:focus-visible {
  outline: 2px solid #2b6cb0;
  outline-offset: -2px;
}

.company-order-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.company-order-title {
  font-size: 16px;
  font-weight: 800;
  color: #183861;
}

.company-order-sub {
  font-size: 12px;
  color: #5a6a85;
}

.company-order-metrics {
  display: flex;
  align-items: center;
  gap: 8px;
}

.company-order-chip {
  display: inline-flex;
  align-items: center;
  padding: 8px 12px;
  border-radius: 999px;
  background: #eef5ff;
  color: #1f5ea8;
  font-size: 12px;
  font-weight: 700;
}

.form-section-title {
  margin: 6px 0 10px;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.6px;
  text-transform: uppercase;
  color: #1f5ea8;
}

@media (max-width: 680px) {
  .order-toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .order-search {
    max-width: none;
  }

  .company-order-head {
    flex-direction: column;
    align-items: flex-start;
  }

  .register-group-head {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
