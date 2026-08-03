<template>
  <div class="page-container alloc-page">

    <!-- Hero Header -->
    <div class="alloc-hero">
      <div class="alloc-hero-bg"></div>
      <div class="alloc-hero-content">
        <div class="hero-left">
          <div class="hero-icon-wrap">
            <v-icon size="28" color="white">mdi-cash-multiple</v-icon>
          </div>
          <div>
            <h1 class="hero-title">Payment Allocation</h1>
            <p class="hero-sub">Allocate company receipts to open orders</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Company Selector Card -->
    <v-card rounded="xl" class="selector-card mb-5" elevation="0">
      <div class="selector-card-inner">
        <div class="selector-label-row">
          <v-icon size="16" color="#1565C0" class="mr-1">mdi-office-building</v-icon>
          <span class="selector-label">Select Company</span>
        </div>
        <div class="selector-controls">
          <v-autocomplete
            v-model="companyId"
            :items="companyStore.items"
            item-title="name"
            item-value="_id"
            label="Company"
            density="comfortable"
            variant="outlined"
            hide-details="auto"
            rounded="lg"
            prepend-inner-icon="mdi-domain"
            class="selector-autocomplete"
          />
          <v-btn color="primary" variant="flat" :loading="loading" @click="loadAll"
            rounded="pill" size="large" prepend-icon="mdi-refresh" class="load-btn">
            Load
          </v-btn>
        </div>
      </div>

      <!-- Stats row -->
      <div v-if="companyId" class="stats-strip">
        <div class="strip-stat strip-blue">
          <div class="strip-icon"><v-icon size="18" color="white">mdi-receipt</v-icon></div>
          <div>
            <div class="strip-label">Receipts</div>
            <div class="strip-value">{{ receipts.length }}</div>
          </div>
        </div>
        <div class="strip-stat strip-indigo">
          <div class="strip-icon"><v-icon size="18" color="white">mdi-clipboard-list</v-icon></div>
          <div>
            <div class="strip-label">Open Orders</div>
            <div class="strip-value">{{ openOrders.length }}</div>
          </div>
        </div>
        <div class="strip-stat strip-green">
          <div class="strip-icon"><v-icon size="18" color="white">mdi-currency-inr</v-icon></div>
          <div>
            <div class="strip-label">Total Unallocated</div>
            <div class="strip-value">{{ fmt(totalUnallocated) }}</div>
          </div>
        </div>
        <div class="strip-stat strip-orange">
          <div class="strip-icon"><v-icon size="18" color="white">mdi-table-row</v-icon></div>
          <div>
            <div class="strip-label">Allocation Rows</div>
            <div class="strip-value">{{ allocationRows.length }}</div>
          </div>
        </div>
      </div>
    </v-card>

    <!-- Receipts Section -->
    <v-card rounded="xl" class="section-card mb-4" elevation="0">
      <div class="section-head">
        <div class="section-head-left">
          <div class="section-icon section-icon-blue"><v-icon size="16" color="white">mdi-receipt</v-icon></div>
          <span>Receipts</span>
        </div>
        <v-chip size="small" color="primary" variant="tonal">{{ receipts.length }} records</v-chip>
      </div>
      <AgTable :rowData="receipts" :columnDefs="receiptCols" height="300px" :pagination="false" />
    </v-card>

    <!-- Allocate Section -->
    <v-card rounded="xl" class="section-card mb-4" elevation="0">
      <div class="section-head">
        <div class="section-head-left">
          <div class="section-icon section-icon-green"><v-icon size="16" color="white">mdi-cash-plus</v-icon></div>
          <span>Allocate Amount</span>
        </div>
        <div class="unallocated-badge">
          <v-icon size="14" color="#1565C0" class="mr-1">mdi-currency-inr</v-icon>
          <span>Available: <strong>{{ fmt(totalUnallocated) }}</strong></span>
        </div>
      </div>

      <div class="pa-4">
        <div class="allocation-table-wrap">
          <table class="alloc-table">
            <thead>
              <tr>
                <th class="alloc-th">Order</th>
                <th class="alloc-th text-right">Pending</th>
                <th class="alloc-th text-right">Allocate</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in allocationRows" :key="row.orderId" class="alloc-row">
                <td class="alloc-td">
                  <div class="order-name-cell">
                    <div class="order-dot"></div>
                    {{ row.orderName }}
                  </div>
                </td>
                <td class="alloc-td text-right pending-amount">{{ fmt(row.pendingAmount) }}</td>
                <td class="alloc-td text-right" style="width:190px">
                  <v-text-field
                    v-model.number="row.amount"
                    type="number"
                    min="0"
                    density="compact"
                    variant="outlined"
                    hide-details="auto"
                    rounded="lg"
                    class="allocate-input"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="alloc-footer">
          <div class="alloc-total-info">
            <span class="total-label">Requested Total:</span>
            <strong :class="allocationOverLimit ? 'text-error' : 'text-primary'">{{ fmt(requestedTotal) }}</strong>
            <v-chip v-if="allocationOverLimit" size="x-small" color="error" variant="tonal" class="ml-2">Exceeds limit</v-chip>
          </div>
          <v-btn color="primary" variant="flat" :loading="saving" :disabled="allocationOverLimit"
            @click="saveAllocation" rounded="pill" prepend-icon="mdi-check-circle" size="large" class="save-btn">
            Save Allocation
          </v-btn>
        </div>
      </div>
    </v-card>

    <!-- History Section -->
    <v-card rounded="xl" class="section-card mb-4" elevation="0">
      <div class="section-head">
        <div class="section-head-left">
          <div class="section-icon section-icon-purple"><v-icon size="16" color="white">mdi-history</v-icon></div>
          <span>Allocation History</span>
        </div>
        <v-chip size="small" color="deep-purple" variant="tonal">{{ historyRows.length }} entries</v-chip>
      </div>
      <AgTable :rowData="historyRows" :columnDefs="historyCols" height="320px" :pagination="false" />
    </v-card>

    <!-- Edit Dialog -->
    <v-dialog v-model="editDialog" max-width="420">
      <v-card rounded="xl" class="edit-dialog-card" elevation="24">
        <div class="edit-dialog-header">
          <div class="edit-dialog-icon"><v-icon size="20" color="white">mdi-pencil</v-icon></div>
          <div class="edit-dialog-title">Edit Allocation</div>
          <v-spacer />
          <v-btn icon="mdi-close" variant="text" size="small" @click="editDialog = false" />
        </div>
        <div class="pa-5">
          <v-text-field
            v-model.number="editAmount"
            type="number"
            min="0"
            label="Amount"
            density="comfortable"
            variant="outlined"
            rounded="lg"
            prepend-inner-icon="mdi-currency-inr"
            hide-details="auto"
            class="mb-3"
          />
          <v-text-field
            v-model="editNotes"
            label="Notes"
            density="comfortable"
            variant="outlined"
            rounded="lg"
            prepend-inner-icon="mdi-note-text"
            hide-details="auto"
          />
          <div class="d-flex justify-end mt-4" style="gap:8px">
            <v-btn variant="tonal" rounded="pill" @click="editDialog = false">Cancel</v-btn>
            <v-btn color="primary" variant="flat" rounded="pill" :loading="saving" @click="saveHistoryEdit" prepend-icon="mdi-check">Save</v-btn>
          </div>
        </div>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useCompanyStore } from '@/stores/index'
import { useUtils } from '@/composables/useUtils'
import { useNotify } from '@/composables/useNotify'
import { useConfirm } from '@/composables/useConfirm'
import api from '@/plugins/axios'
import AgTable from '@/components/common/AgTable.vue'

const { fmt, fmtDate } = useUtils()
const notify = useNotify()
const { confirm } = useConfirm()
const companyStore = useCompanyStore()
const route = useRoute()

const companyId = ref(null)
const loading = ref(false)
const saving = ref(false)

const receipts = ref([])
const openOrders = ref([])
const historyRows = ref([])

const allocationRows = ref([])
const editDialog = ref(false)
const editAmount = ref(0)
const editNotes = ref('')
const editAllocationId = ref(null)

const totalUnallocated = computed(() => receipts.value.reduce((s, r) => s + Number(r.unallocated || 0), 0))
const requestedTotal = computed(() => allocationRows.value.reduce((s, r) => s + Number(r.amount || 0), 0))
const allocationOverLimit = computed(() => requestedTotal.value > totalUnallocated.value + 1e-9)

const receiptCols = [
  { field: 'date', headerName: 'Date', flex: 1, valueFormatter: p => fmtDate(p.value) },
  { field: 'amount', headerName: 'Amount', flex: 1, valueFormatter: p => fmt(p.value || 0) },
  { field: 'allocated', headerName: 'Allocated', flex: 1, valueFormatter: p => fmt(p.value || 0) },
  { field: 'unallocated', headerName: 'Unallocated', flex: 1, valueFormatter: p => fmt(p.value || 0) },
]

const historyCols = [
  { field: 'date', headerName: 'Date', flex: 1, valueFormatter: p => fmtDate(p.value) },
  { field: 'order.orderName', headerName: 'Order', flex: 1.5 },
  { field: 'amount', headerName: 'Amount', flex: 1, valueFormatter: p => fmt(p.value || 0) },
  { field: 'receipt.amount', headerName: 'Receipt', flex: 1, valueFormatter: p => fmt(p.value || 0) },
  { field: 'notes', headerName: 'Notes', flex: 1.4, valueFormatter: p => p.value || '-' },
  {
    headerName: 'Actions',
    flex: 1.1,
    sortable: false,
    cellRenderer: p => `<div style="display:flex;gap:6px;padding-top:4px">
      <button data-action="edit" data-id="${p.data._id}" style="background:#E3F2FD;border:none;border-radius:6px;padding:4px 8px;cursor:pointer;color:#1565C0;font-size:11px;font-weight:600">Edit</button>
      <button data-action="delete" data-id="${p.data._id}" style="background:#FFEBEE;border:none;border-radius:6px;padding:4px 8px;cursor:pointer;color:#C62828;font-size:11px;font-weight:600">Delete</button>
    </div>`,
    onCellClicked: async e => {
      const action = e.event.target?.dataset?.action
      if (!action) return
      if (action === 'edit') startEditHistory(e.data)
      if (action === 'delete') await removeHistory(e.data)
    },
  },
]

async function loadSummary(force = false) {
  const params = force ? { _t: Date.now() } : {}
  const { data } = await api.get(`/allocations/company/${companyId.value}/summary`, { params })
  receipts.value = data.receipts || []
  openOrders.value = data.openOrders || []

  allocationRows.value = openOrders.value.map(o => ({
    orderId: o._id,
    orderName: o.orderName,
    pendingAmount: Number(o.pendingAmount || 0),
    amount: 0,
  }))
}

async function loadHistory(force = false) {
  const params = force ? { _t: Date.now() } : {}
  const { data } = await api.get(`/allocations/company/${companyId.value}`, { params })
  historyRows.value = data || []
}

async function loadAll(force = false) {
  if (!companyId.value) return
  loading.value = true
  try {
    await Promise.all([loadSummary(force), loadHistory(force)])
  } catch (error) {
    notify.error(error?.response?.data?.message || 'Failed to load allocation data')
  } finally {
    loading.value = false
  }
}

async function saveAllocation() {
  if (!companyId.value) return

  const allocations = allocationRows.value
    .map(r => ({ orderId: r.orderId, amount: Number(r.amount || 0) }))
    .filter(r => r.amount > 0)

  if (!allocations.length) {
    notify.error('Enter allocation amount for at least one order')
    return
  }

  if (allocations.some(a => a.amount > (allocationRows.value.find(r => r.orderId === a.orderId)?.pendingAmount || 0) + 1e-9)) {
    notify.error('One or more allocation amounts exceed order pending amount')
    return
  }

  if (requestedTotal.value > totalUnallocated.value + 1e-9) {
    notify.error('Requested total exceeds company total unallocated amount')
    return
  }

  saving.value = true
  try {
    await api.post(`/allocations/company/${companyId.value}`, {
      allocations,
      notes: 'UI allocation',
    })

    notify.success('Allocation saved')
    await loadAll(true)
  } catch (error) {
    notify.error(error?.response?.data?.message || 'Failed to save allocation')
  } finally {
    saving.value = false
  }
}

function startEditHistory(row) {
  if (!row?._id) return
  editAllocationId.value = row._id
  editAmount.value = Number(row.amount || 0)
  editNotes.value = row.notes || ''
  editDialog.value = true
}

async function saveHistoryEdit() {
  if (!editAllocationId.value) return
  if (Number(editAmount.value || 0) <= 0) {
    notify.error('Amount must be greater than zero')
    return
  }

  saving.value = true
  try {
    await api.put(`/allocations/${editAllocationId.value}`, {
      amount: Number(editAmount.value || 0),
      notes: editNotes.value,
    })
    notify.success('Allocation updated')
    editDialog.value = false
    await loadAll(true)
  } catch (error) {
    notify.error(error?.response?.data?.message || 'Failed to update allocation')
  } finally {
    saving.value = false
  }
}

async function removeHistory(row) {
  if (!row?._id) return
  const ok = await confirm('Delete this allocation?')
  if (!ok) return

  saving.value = true
  try {
    await api.delete(`/allocations/${row._id}`)
    notify.success('Allocation deleted')
    await loadAll(true)
  } catch (error) {
    notify.error(error?.response?.data?.message || 'Failed to delete allocation')
  } finally {
    saving.value = false
  }
}

watch(companyId, async () => {
  if (!companyId.value) return
  await loadAll()
})

onMounted(async () => {
  await companyStore.fetch()
  const requestedCompanyId = String(route.query.company || '')
  if (requestedCompanyId && companyStore.items.some(company => company._id === requestedCompanyId)) {
    companyId.value = requestedCompanyId
    return
  }
  if (companyStore.items.length) companyId.value = companyStore.items[0]._id
})
</script>

<style scoped>
/* ===== HERO ===== */
.alloc-hero {
  position: relative;
  border-radius: 20px;
  overflow: hidden;
  margin-bottom: 24px;
  padding: 28px 28px;
}
.alloc-hero-bg {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, #00695C 0%, #00897B 40%, #4DB6AC 100%);
  z-index: 0;
}
.alloc-hero-bg::after {
  content: '';
  position: absolute;
  top: -60px; right: -60px;
  width: 220px; height: 220px;
  background: rgba(255,255,255,0.08);
  border-radius: 50%;
}
.alloc-hero-bg::before {
  content: '';
  position: absolute;
  bottom: -80px; left: -30px;
  width: 180px; height: 180px;
  background: rgba(255,255,255,0.06);
  border-radius: 50%;
}
.alloc-hero-content {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
}
.hero-left { display: flex; align-items: center; gap: 16px; }
.hero-icon-wrap {
  width: 52px; height: 52px;
  background: rgba(255,255,255,0.18);
  border-radius: 14px;
  display: flex; align-items: center; justify-content: center;
  backdrop-filter: blur(4px);
  border: 1px solid rgba(255,255,255,0.25);
  flex-shrink: 0;
}
.hero-title { font-size: 24px; font-weight: 800; color: white; letter-spacing: -0.3px; margin: 0; }
.hero-sub { font-size: 13px; color: rgba(255,255,255,0.8); margin: 2px 0 0; }

/* ===== SELECTOR CARD ===== */
.selector-card {
  border: 1px solid #e0ebf7;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0,105,92,0.07) !important;
}
.selector-card-inner {
  padding: 20px 20px 16px;
  background: linear-gradient(100deg, #f8fbff 0%, #f0fbf8 100%);
}
.selector-label-row {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
}
.selector-label {
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #1565C0;
}
.selector-controls {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.selector-autocomplete { flex: 1; min-width: 200px; }
.load-btn {
  flex-shrink: 0;
  font-weight: 700;
  letter-spacing: 0.3px;
}

/* ===== STATS STRIP ===== */
.stats-strip {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  border-top: 1px solid #e0ebf7;
}
.strip-stat {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 18px;
  position: relative;
  transition: filter 0.2s;
}
.strip-stat:not(:last-child) { border-right: 1px solid rgba(255,255,255,0.2); }
.strip-stat:hover { filter: brightness(1.05); }
.strip-icon {
  width: 36px; height: 36px;
  border-radius: 10px;
  background: rgba(255,255,255,0.25);
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.strip-label { font-size: 11px; color: rgba(255,255,255,0.85); font-weight: 600; text-transform: uppercase; letter-spacing: 0.3px; }
.strip-value { font-size: 20px; font-weight: 800; color: white; line-height: 1.1; margin-top: 1px; }
.strip-blue   { background: linear-gradient(135deg, #1565C0, #42A5F5); }
.strip-indigo { background: linear-gradient(135deg, #283593, #5C6BC0); }
.strip-green  { background: linear-gradient(135deg, #2E7D32, #66BB6A); }
.strip-orange { background: linear-gradient(135deg, #E65100, #FF8A65); }

/* ===== SECTION CARD ===== */
.section-card {
  border: 1px solid #e0ebf7;
  overflow: hidden;
  box-shadow: 0 6px 24px rgba(21,101,192,0.06) !important;
}
.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 13px 18px;
  border-bottom: 1px solid #e8f0fb;
  background: linear-gradient(100deg, #f8fbff 0%, #f2f7ff 100%);
  font-size: 14px;
  font-weight: 800;
  color: #1a2b49;
}
.section-head-left { display: flex; align-items: center; gap: 10px; }
.section-icon {
  width: 28px; height: 28px;
  border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
}
.section-icon-blue   { background: linear-gradient(135deg, #1565C0, #42A5F5); }
.section-icon-green  { background: linear-gradient(135deg, #2E7D32, #66BB6A); }
.section-icon-purple { background: linear-gradient(135deg, #6A1B9A, #AB47BC); }

.unallocated-badge {
  display: flex;
  align-items: center;
  font-size: 12px;
  color: #1565C0;
  background: #E3F2FD;
  border-radius: 20px;
  padding: 4px 12px;
  border: 1px solid #BBDEFB;
}

/* ===== ALLOCATION TABLE ===== */
.allocation-table-wrap { overflow-x: auto; }
.alloc-table {
  width: 100%;
  min-width: 500px;
  border-collapse: collapse;
}
.alloc-th {
  padding: 10px 14px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #5a6a85;
  background: #f8fbff;
  border-bottom: 2px solid #e0ebf7;
}
.alloc-row { transition: background 0.15s; }
.alloc-row:hover { background: #f5faff; }
.alloc-td {
  padding: 10px 14px;
  font-size: 13px;
  color: #1a2b49;
  border-bottom: 1px solid #eef4fb;
  vertical-align: middle;
}
.order-name-cell { display: flex; align-items: center; gap: 8px; }
.order-dot {
  width: 8px; height: 8px;
  background: linear-gradient(135deg, #1565C0, #42A5F5);
  border-radius: 50%;
  flex-shrink: 0;
}
.pending-amount { font-weight: 700; color: #1565C0; }
.allocate-input { margin: 2px 0; }

.alloc-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 16px;
  flex-wrap: wrap;
  gap: 12px;
  padding: 12px 14px;
  background: #f8fbff;
  border-radius: 12px;
  border: 1px solid #e0ebf7;
}
.alloc-total-info { display: flex; align-items: center; gap: 6px; font-size: 13px; color: #5a6a85; }
.total-label { font-weight: 600; }
.save-btn { font-weight: 700; }

/* ===== EDIT DIALOG ===== */
.edit-dialog-card { overflow: hidden; }
.edit-dialog-header {
  background: linear-gradient(135deg, #1565C0, #42A5F5);
  padding: 16px 20px;
  display: flex;
  align-items: center;
  gap: 12px;
}
.edit-dialog-icon {
  width: 36px; height: 36px;
  background: rgba(255,255,255,0.2);
  border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
}
.edit-dialog-title { font-size: 15px; font-weight: 800; color: white; }

/* ===== RESPONSIVE ===== */
@media (max-width: 700px) {
  .alloc-hero { padding: 20px 16px; border-radius: 14px; }
  .hero-title { font-size: 20px; }
  .stats-strip { grid-template-columns: repeat(2, 1fr); }
  .strip-stat:nth-child(2) { border-right: none; }
  .strip-stat:nth-child(1), .strip-stat:nth-child(2) { border-bottom: 1px solid rgba(255,255,255,0.15); }
  .selector-controls { flex-direction: column; align-items: stretch; }
  .load-btn { width: 100%; }
}
@media (max-width: 440px) {
  .stats-strip { grid-template-columns: 1fr 1fr; }
  .alloc-footer { flex-direction: column; align-items: stretch; }
  .save-btn { width: 100%; }
}
</style>
