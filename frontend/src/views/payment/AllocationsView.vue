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
          <v-btn color="primary" variant="flat" :loading="loading" @click="loadAll(true)"
            rounded="pill" size="large" prepend-icon="mdi-refresh" class="load-btn">
            Load
          </v-btn>
        </div>
      </div>

      <!-- Stats row -->
      <div v-if="companyId && !loading" class="stats-strip">
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
            <div class="strip-value">{{ allocationRows.length }}</div>
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
          <div class="strip-icon"><v-icon size="18" color="white">mdi-cash-clock</v-icon></div>
          <div>
            <div class="strip-label">Remaining</div>
            <div class="strip-value">{{ fmt(remainingAfterAllocation) }}</div>
          </div>
        </div>
      </div>
    </v-card>

    <!-- Receipts Section -->
    <v-card v-if="companyId && receipts.length" rounded="xl" class="section-card mb-5" elevation="0">
      <div class="section-head" @click="showReceipts = !showReceipts" style="cursor:pointer">
        <div class="section-head-left">
          <div class="section-icon section-icon-blue"><v-icon size="16" color="white">mdi-receipt</v-icon></div>
          <span>Receipts</span>
        </div>
        <div class="d-flex align-center" style="gap:8px">
          <v-chip size="small" color="primary" variant="tonal">{{ receipts.length }} records</v-chip>
          <v-icon size="20">{{ showReceipts ? 'mdi-chevron-up' : 'mdi-chevron-down' }}</v-icon>
        </div>
      </div>
      <div v-if="showReceipts" class="pa-3">
        <div class="receipt-grid">
          <div v-for="r in receipts" :key="r._id" class="receipt-card" :class="{ 'receipt-exhausted': r.unallocated <= 0 }">
            <div class="receipt-date">{{ fmtDate(r.date) }}</div>
            <div class="receipt-amount">{{ fmt(r.amount) }}</div>
            <div class="receipt-meta">
              <span class="receipt-allocated">Allocated: <strong>{{ fmt(r.allocated) }}</strong></span>
              <span class="receipt-unallocated">Available: <strong>{{ fmt(r.unallocated) }}</strong></span>
            </div>
            <div class="receipt-bar">
              <div class="receipt-bar-fill" :style="{ width: receiptPercent(r) + '%' }"></div>
            </div>
          </div>
        </div>
      </div>
    </v-card>

    <!-- Allocate Section -->
    <v-card v-if="companyId && allocationRows.length" rounded="xl" class="section-card mb-5" elevation="0">
      <div class="section-head">
        <div class="section-head-left">
          <div class="section-icon section-icon-green"><v-icon size="16" color="white">mdi-cash-plus</v-icon></div>
          <span>Allocate Amount</span>
        </div>
        <div class="d-flex align-center" style="gap:10px">
          <div class="unallocated-badge">
            <v-icon size="14" color="#2E7D32" class="mr-1">mdi-currency-inr</v-icon>
            <span>Available: <strong>{{ fmt(totalUnallocated) }}</strong></span>
          </div>
        </div>
      </div>

      <div class="pa-4">
        <!-- Action Buttons -->
        <div class="alloc-actions mb-4">
          <v-btn
            color="success"
            variant="flat"
            rounded="pill"
            size="small"
            prepend-icon="mdi-flash"
            @click="autoFillAllocations"
            :disabled="totalUnallocated <= 0"
          >
            Auto Fill
          </v-btn>
          <v-btn
            variant="tonal"
            color="grey"
            rounded="pill"
            size="small"
            prepend-icon="mdi-eraser"
            @click="clearAllocations"
          >
            Clear All
          </v-btn>
          <v-spacer />
          <div class="alloc-summary-inline">
            <span class="text-medium-emphasis">Remaining:</span>
            <strong :class="remainingAfterAllocation < 0 ? 'text-error' : 'text-success'">{{ fmt(Math.max(0, remainingAfterAllocation)) }}</strong>
            <span class="text-medium-emphasis mx-2">|</span>
            <span class="text-medium-emphasis">Allocating:</span>
            <strong :class="allocationOverLimit ? 'text-error' : 'text-primary'">{{ fmt(requestedTotal) }}</strong>
            <span class="text-medium-emphasis">of</span>
            <strong class="text-primary">{{ fmt(totalUnallocated) }}</strong>
          </div>
        </div>

        <!-- Allocation Table -->
        <div class="allocation-table-wrap">
          <table class="alloc-table">
            <thead>
              <tr>
                <th class="alloc-th" style="width:40px">#</th>
                <th class="alloc-th">Order</th>
                <th class="alloc-th text-center" style="width:90px">Status</th>
                <th class="alloc-th text-right" style="width:130px">Payable</th>
                <th class="alloc-th text-right" style="width:130px">Already Paid</th>
                <th class="alloc-th text-right" style="width:130px">Pending</th>
                <th class="alloc-th text-center" style="width:200px">Allocate</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, idx) in allocationRows" :key="row.orderId" class="alloc-row"
                :class="{ 'row-completed': row.status === 'completed', 'row-has-amount': row.amount > 0 }">
                <td class="alloc-td text-center">
                  <span class="row-number">{{ idx + 1 }}</span>
                </td>
                <td class="alloc-td">
                  <div class="order-name-cell">
                    <div class="order-dot" :class="row.status === 'completed' ? 'dot-completed' : 'dot-active'"></div>
                    <span class="order-name-text">{{ row.orderName }}</span>
                  </div>
                </td>
                <td class="alloc-td text-center">
                  <v-chip size="x-small" :color="row.status === 'completed' ? 'success' : 'info'" variant="tonal">
                    {{ row.status === 'completed' ? 'Done' : row.progress + '%' }}
                  </v-chip>
                </td>
                <td class="alloc-td text-right">
                  <span class="amount-dim">{{ fmt(row.payableAmount) }}</span>
                </td>
                <td class="alloc-td text-right">
                  <span class="amount-paid">{{ fmt(row.paidAmount) }}</span>
                </td>
                <td class="alloc-td text-right">
                  <span class="amount-pending">{{ fmt(row.pendingAmount) }}</span>
                </td>
                <td class="alloc-td text-center">
                  <div class="allocate-input-wrap">
                    <v-text-field
                      v-model.number="row.amount"
                      type="number"
                      :min="0"
                      :max="row.pendingAmount"
                      density="compact"
                      variant="outlined"
                      hide-details="auto"
                      rounded="lg"
                      class="allocate-input"
                      :class="{ 'input-filled': row.amount > 0, 'input-error': row.amount > row.pendingAmount }"
                      @update:model-value="validateRowAmount(row)"
                    />
                    <v-btn
                      v-if="row.pendingAmount > 0"
                      icon
                      size="x-small"
                      variant="text"
                      color="primary"
                      class="fill-max-btn"
                      @click="fillMaxForRow(row)"
                      title="Fill max possible"
                    >
                      <v-icon size="14">mdi-arrow-up-bold</v-icon>
                    </v-btn>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Validation Messages -->
        <v-alert v-if="allocationOverLimit" type="error" variant="tonal" density="compact" class="mt-3" rounded="lg">
          Total allocation ({{ fmt(requestedTotal) }}) exceeds available amount ({{ fmt(totalUnallocated) }})
        </v-alert>
        <v-alert v-if="hasRowOverLimit" type="warning" variant="tonal" density="compact" class="mt-3" rounded="lg">
          One or more allocations exceed the order's pending amount
        </v-alert>

        <!-- Footer Actions -->
        <div class="alloc-footer">
          <div class="alloc-remaining-info">
            <span>After allocation:</span>
            <strong :class="remainingAfterAllocation < 0 ? 'text-error' : 'text-success'">
              {{ fmt(Math.max(0, remainingAfterAllocation)) }} remaining
            </strong>
          </div>
          <v-btn color="primary" variant="flat" :loading="saving"
            :disabled="allocationOverLimit || hasRowOverLimit || requestedTotal <= 0"
            @click="saveAllocation" rounded="pill" prepend-icon="mdi-check-circle" size="large" class="save-btn">
            Save Allocation
          </v-btn>
        </div>
      </div>
    </v-card>

    <!-- Saved Allocations (Table per Order, Collapsible) -->
    <v-card v-if="companyId && groupedAllocations.length" rounded="xl" class="section-card mb-5" elevation="0">
      <div class="section-head" @click="showSavedAllocations = !showSavedAllocations" style="cursor:pointer">
        <div class="section-head-left">
          <div class="section-icon section-icon-purple"><v-icon size="16" color="white">mdi-check-decagram</v-icon></div>
          <span>Allocated Orders</span>
        </div>
        <div class="d-flex align-center" style="gap:8px">
          <v-chip size="small" color="deep-purple" variant="tonal">{{ groupedAllocations.length }} orders</v-chip>
          <v-icon size="20">{{ showSavedAllocations ? 'mdi-chevron-up' : 'mdi-chevron-down' }}</v-icon>
        </div>
      </div>
      <div v-if="showSavedAllocations" class="pa-4">
        <!-- Bulk Actions -->
        <div v-if="selectedOrders.length" class="bulk-actions mb-3">
          <v-chip size="small" color="error" variant="tonal">{{ selectedOrders.length }} selected</v-chip>
          <v-btn size="small" color="error" variant="flat" rounded="pill" prepend-icon="mdi-delete"
            @click="removeSelected" :loading="saving">
            Delete Selected
          </v-btn>
          <v-btn size="small" variant="tonal" rounded="pill" @click="selectedOrders = []">
            Clear Selection
          </v-btn>
        </div>
        <div class="allocation-table-wrap">
          <table class="alloc-table">
            <thead>
              <tr>
                <th class="alloc-th text-center" style="width:40px">
                  <v-checkbox-btn
                    :model-value="selectedOrders.length === groupedAllocations.length && groupedAllocations.length > 0"
                    :indeterminate="selectedOrders.length > 0 && selectedOrders.length < groupedAllocations.length"
                    @update:model-value="toggleSelectAll"
                    density="compact"
                    hide-details
                  />
                </th>
                <th class="alloc-th">Order</th>
                <th class="alloc-th text-right" style="width:140px">Allocated</th>
                <th class="alloc-th text-right" style="width:140px">Pending</th>
                <th class="alloc-th text-center" style="width:120px">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="group in groupedAllocations" :key="group.orderId" class="alloc-row row-has-amount">
                <td class="alloc-td text-center">
                  <v-checkbox-btn
                    :model-value="selectedOrders.includes(group.orderId)"
                    @update:model-value="toggleSelectOrder(group.orderId)"
                    density="compact"
                    hide-details
                  />
                </td>
                <td class="alloc-td">
                  <div class="order-name-cell">
                    <div class="order-dot dot-completed"></div>
                    <span class="order-name-text">{{ group.orderName }}</span>
                  </div>
                </td>
                <td class="alloc-td text-right">
                  <span class="amount-paid">{{ fmt(group.total) }}</span>
                </td>
                <td class="alloc-td text-right">
                  <span class="amount-pending">{{ fmt(group.pending) }}</span>
                </td>
                <td class="alloc-td text-center">
                  <div class="d-flex justify-center" style="gap:4px">
                    <v-btn size="x-small" icon variant="tonal" color="primary" @click="startEditGroup(group)">
                      <v-icon size="16">mdi-pencil</v-icon>
                    </v-btn>
                    <v-btn size="x-small" icon variant="tonal" color="error" @click="removeGroup(group)">
                      <v-icon size="16">mdi-delete</v-icon>
                    </v-btn>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </v-card>

    <!-- Empty State -->
    <v-card v-if="companyId && !loading && !allocationRows.length && !receipts.length" rounded="xl" class="section-card" elevation="0">
      <div class="empty-state">
        <v-icon size="48" color="grey-lighten-1">mdi-cash-off</v-icon>
        <p class="text-medium-emphasis mt-3">No receipts or open orders for this company</p>
      </div>
    </v-card>

    <!-- Edit Dialog -->
    <v-dialog v-model="editDialog" max-width="420" :fullscreen="$vuetify.display.xs">
      <v-card rounded="xl" class="edit-dialog-card" elevation="24">
        <div class="edit-dialog-header">
          <div class="edit-dialog-icon"><v-icon size="20" color="white">mdi-pencil</v-icon></div>
          <div class="edit-dialog-title">Edit Allocation</div>
          <v-spacer />
          <v-btn icon="mdi-close" variant="text" size="small" color="white" @click="editDialog = false" />
        </div>
        <div class="pa-5">
          <div class="edit-order-label mb-3">
            <v-icon size="14" class="mr-1">mdi-package-variant</v-icon>
            {{ editOrderName }}
            <v-spacer />
            <span v-if="editMaxAmount > 0" class="text-caption text-medium-emphasis">Max: {{ fmt(editMaxAmount) }}</span>
          </div>
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
          <v-alert v-if="editMaxAmount > 0 && editAmount > editMaxAmount" type="error" variant="tonal" density="compact" class="mb-3" rounded="lg">
            Amount exceeds order's payable limit ({{ fmt(editMaxAmount) }}). Cannot save.
          </v-alert>
          <v-text-field
            v-model="editNotes"
            label="Notes (optional)"
            density="comfortable"
            variant="outlined"
            rounded="lg"
            prepend-inner-icon="mdi-note-text"
            hide-details="auto"
          />
          <div class="d-flex justify-end mt-4" style="gap:8px">
            <v-btn variant="tonal" rounded="pill" @click="editDialog = false">Cancel</v-btn>
            <v-btn color="primary" variant="flat" rounded="pill" :loading="saving" :disabled="editMaxAmount > 0 && editAmount > editMaxAmount" @click="saveHistoryEdit" prepend-icon="mdi-check">Save</v-btn>
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

const { fmt, fmtDate } = useUtils()
const notify = useNotify()
const { confirm } = useConfirm()
const companyStore = useCompanyStore()
const route = useRoute()

const companyId = ref(null)
const loading = ref(false)
const saving = ref(false)
const showReceipts = ref(false)
const showSavedAllocations = ref(false)

const receipts = ref([])
const openOrders = ref([])
const historyRows = ref([])

const allocationRows = ref([])
const editDialog = ref(false)
const editAmount = ref(0)
const editNotes = ref('')
const editOrderName = ref('')
const editAllocationId = ref(null)
const editMaxAmount = ref(0)
const selectedOrders = ref([])

const totalUnallocated = computed(() => receipts.value.reduce((s, r) => s + Number(r.unallocated || 0), 0))

const groupedAllocations = computed(() => {
  const map = {}
  for (const row of historyRows.value) {
    const name = row.order?.orderName || 'Unknown'
    const orderId = row.order?._id || ''
    if (!map[orderId]) map[orderId] = { orderName: name, orderId, total: 0, entries: [] }
    map[orderId].total += Number(row.amount || 0)
    map[orderId].entries.push(row)
  }
  const allRows = allocationRows.value
  return Object.values(map).map(g => {
    const orderRow = allRows.find(r => r.orderId === g.orderId)
    const pending = orderRow ? orderRow.pendingAmount : 0
    return { ...g, pending: Math.max(0, pending) }
  })
})
const requestedTotal = computed(() => allocationRows.value.reduce((s, r) => s + Number(r.amount || 0), 0))
const allocationOverLimit = computed(() => requestedTotal.value > totalUnallocated.value + 0.01)
const hasRowOverLimit = computed(() => allocationRows.value.some(r => Number(r.amount || 0) > r.pendingAmount + 0.01))
const remainingAfterAllocation = computed(() => totalUnallocated.value - requestedTotal.value)

function receiptPercent(r) {
  if (!r.amount || r.amount <= 0) return 0
  return Math.min(100, (r.allocated / r.amount) * 100)
}

function validateRowAmount(row) {
  if (row.amount === null || row.amount === '' || row.amount === undefined) {
    row.amount = 0
  }
  if (row.amount < 0) row.amount = 0
}

function autoFillAllocations() {
  let available = Math.round(totalUnallocated.value)
  for (const row of allocationRows.value) {
    row.amount = 0
  }
  for (const row of allocationRows.value) {
    if (available <= 0) break
    row.amount = Math.min(row.pendingAmount, available)
    available -= row.amount
  }
  notify.success('Auto-filled allocations based on available amount')
}

function fillMaxForRow(row) {
  const currentOthers = allocationRows.value
    .filter(r => r.orderId !== row.orderId)
    .reduce((s, r) => s + Number(r.amount || 0), 0)
  const available = Math.round(totalUnallocated.value) - currentOthers
  row.amount = Math.min(row.pendingAmount, Math.max(0, available))
}

function clearAllocations() {
  for (const row of allocationRows.value) {
    row.amount = 0
  }
}

async function loadSummary(force = false) {
  const params = force ? { _t: Date.now() } : {}
  const { data } = await api.get(`/allocations/company/${companyId.value}/summary`, { params })
  receipts.value = data.receipts || []
  openOrders.value = data.openOrders || []

  allocationRows.value = openOrders.value
    .map(o => ({
      orderId: o._id,
      orderName: o.orderName,
      payableAmount: Math.round(Number(o.payableAmount || 0)),
      paidAmount: Math.round(Number(o.paidAmount || 0)),
      pendingAmount: Math.floor(Number(o.pendingAmount || 0)),
      progress: Number(o.progress || 0),
      status: o.status || 'active',
      amount: 0,
    }))
    .filter(o => o.pendingAmount >= 1)
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

  if (allocations.some(a => a.amount > (allocationRows.value.find(r => r.orderId === a.orderId)?.pendingAmount || 0) + 0.01)) {
    notify.error('One or more allocation amounts exceed order pending amount')
    return
  }

  if (requestedTotal.value > totalUnallocated.value + 0.01) {
    notify.error('Requested total exceeds company total unallocated amount')
    return
  }

  saving.value = true
  try {
    await api.post(`/allocations/company/${companyId.value}`, {
      allocations,
      notes: 'UI allocation',
    })

    notify.success('Allocation saved successfully')
    showSavedAllocations.value = true
    await loadAll(true)
  } catch (error) {
    notify.error(error?.response?.data?.message || 'Failed to save allocation')
  } finally {
    saving.value = false
  }
}

function startEditGroup(group) {
  if (!group?.entries?.length) return
  editAllocationId.value = group.entries.map(e => e._id)
  editAmount.value = Math.round(group.total)
  editNotes.value = ''
  editOrderName.value = group.orderName
  editMaxAmount.value = Math.round(group.total) + group.pending
  editDialog.value = true
}

function startEditHistory(row) {
  if (!row?._id) return
  editAllocationId.value = [row._id]
  editAmount.value = Number(row.amount || 0)
  editNotes.value = row.notes || ''
  editOrderName.value = row.order?.orderName || 'Unknown Order'
  editMaxAmount.value = 0
  editDialog.value = true
}

async function saveHistoryEdit() {
  if (!editAllocationId.value || !editAllocationId.value.length) return
  const newTotal = Number(editAmount.value || 0)
  if (newTotal <= 0) {
    notify.error('Amount must be greater than zero')
    return
  }

  saving.value = true
  try {
    const ids = editAllocationId.value
    const entries = historyRows.value.filter(r => ids.includes(r._id))

    if (ids.length === 1) {
      await api.put(`/allocations/${ids[0]}`, {
        amount: newTotal,
        notes: editNotes.value,
      })
    } else {
      let remaining = newTotal
      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i]
        const entryAmt = Number(entry.amount || 0)
        if (remaining <= 0) {
          await api.delete(`/allocations/${entry._id}`)
        } else if (remaining >= entryAmt && i < entries.length - 1) {
          remaining -= entryAmt
        } else {
          await api.put(`/allocations/${entry._id}`, {
            amount: remaining,
            notes: editNotes.value || entry.notes || '',
          })
          remaining = 0
        }
      }
    }
    notify.success('Allocation updated')
    editDialog.value = false
    await loadAll(true)
  } catch (error) {
    notify.error(error?.response?.data?.message || 'Failed to update allocation')
  } finally {
    saving.value = false
  }
}

function toggleSelectAll(val) {
  if (val) {
    selectedOrders.value = groupedAllocations.value.map(g => g.orderId)
  } else {
    selectedOrders.value = []
  }
}

function toggleSelectOrder(orderId) {
  const idx = selectedOrders.value.indexOf(orderId)
  if (idx >= 0) {
    selectedOrders.value.splice(idx, 1)
  } else {
    selectedOrders.value.push(orderId)
  }
}

async function removeGroup(group) {
  if (!group?.entries?.length) return
  const ok = await confirm(`Delete all allocations for ${group.orderName}?`)
  if (!ok) return

  saving.value = true
  try {
    for (const entry of group.entries) {
      await api.delete(`/allocations/${entry._id}`)
    }
    notify.success('All allocations deleted for ' + group.orderName)
    selectedOrders.value = selectedOrders.value.filter(id => id !== group.orderId)
    await loadAll(true)
  } catch (error) {
    notify.error(error?.response?.data?.message || 'Failed to delete allocations')
  } finally {
    saving.value = false
  }
}

async function removeSelected() {
  if (!selectedOrders.value.length) return
  const ok = await confirm(`Delete allocations for ${selectedOrders.value.length} order(s)?`)
  if (!ok) return

  saving.value = true
  try {
    const groups = groupedAllocations.value.filter(g => selectedOrders.value.includes(g.orderId))
    for (const group of groups) {
      for (const entry of group.entries) {
        await api.delete(`/allocations/${entry._id}`)
      }
    }
    notify.success(`Deleted allocations for ${groups.length} order(s)`)
    selectedOrders.value = []
    await loadAll(true)
  } catch (error) {
    notify.error(error?.response?.data?.message || 'Failed to delete allocations')
  } finally {
    saving.value = false
  }
}

async function removeHistory(row) {
  if (!row?._id) return
  const ok = await confirm('Delete this allocation entry?')
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
  background: linear-gradient(135deg, #1a237e 0%, #283593 40%, #3f51b5 100%);
  z-index: 0;
}
.alloc-hero-bg::after {
  content: '';
  position: absolute;
  top: -60px; right: -60px;
  width: 220px; height: 220px;
  background: rgba(255,255,255,0.06);
  border-radius: 50%;
}
.alloc-hero-bg::before {
  content: '';
  position: absolute;
  bottom: -80px; left: -30px;
  width: 180px; height: 180px;
  background: rgba(255,255,255,0.04);
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
  background: rgba(255,255,255,0.15);
  border-radius: 14px;
  display: flex; align-items: center; justify-content: center;
  backdrop-filter: blur(4px);
  border: 1px solid rgba(255,255,255,0.2);
  flex-shrink: 0;
}
.hero-title { font-size: 24px; font-weight: 800; color: white; letter-spacing: -0.3px; margin: 0; }
.hero-sub { font-size: 13px; color: rgba(255,255,255,0.75); margin: 2px 0 0; }

/* ===== SELECTOR CARD ===== */
.selector-card {
  border: 1px solid #e0e8f0;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(26,35,126,0.06) !important;
}
.selector-card-inner {
  padding: 20px 20px 16px;
  background: linear-gradient(100deg, #fafbff 0%, #f5f7ff 100%);
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
  border-top: 1px solid #e0e8f0;
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
  background: rgba(255,255,255,0.22);
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
  border: 1px solid #e0e8f0;
  overflow: hidden;
  box-shadow: 0 4px 16px rgba(26,35,126,0.05) !important;
}
.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 13px 18px;
  border-bottom: 1px solid #e8f0fb;
  background: linear-gradient(100deg, #f8fbff 0%, #f2f6ff 100%);
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
  color: #2E7D32;
  background: #E8F5E9;
  border-radius: 20px;
  padding: 4px 12px;
  border: 1px solid #C8E6C9;
}

/* ===== RECEIPT GRID ===== */
.receipt-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
}
.receipt-card {
  border: 1px solid #e8f0fb;
  border-radius: 12px;
  padding: 14px;
  background: #fafcff;
  transition: all 0.2s;
}
.receipt-card:hover { border-color: #bbdefb; background: #f0f7ff; }
.receipt-exhausted { opacity: 0.5; }
.receipt-date { font-size: 11px; color: #7b8a9e; font-weight: 600; }
.receipt-amount { font-size: 18px; font-weight: 800; color: #1a2b49; margin: 4px 0; }
.receipt-meta { display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 8px; }
.receipt-allocated { color: #2E7D32; }
.receipt-unallocated { color: #1565C0; }
.receipt-bar { height: 4px; background: #e8f0fb; border-radius: 2px; overflow: hidden; }
.receipt-bar-fill { height: 100%; background: linear-gradient(90deg, #66BB6A, #2E7D32); border-radius: 2px; transition: width 0.3s; }

/* ===== ALLOCATION ACTIONS ===== */
.alloc-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.alloc-summary-inline {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
}

/* ===== ALLOCATION TABLE ===== */
.allocation-table-wrap { overflow-x: auto; }
.alloc-table {
  width: 100%;
  min-width: 700px;
  border-collapse: collapse;
}
.alloc-th {
  padding: 10px 12px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  color: #5a6a85;
  background: #f5f8fc;
  border-bottom: 2px solid #e0e8f0;
}
.alloc-row { transition: background 0.15s; }
.alloc-row:hover { background: #f5faff; }
.row-completed { background: #f9fdf9; }
.row-has-amount { background: #f0f9ff; }
.row-has-amount:hover { background: #e3f2fd; }
.alloc-td {
  padding: 8px 12px;
  font-size: 13px;
  color: #1a2b49;
  border-bottom: 1px solid #eef3fa;
  vertical-align: middle;
}
.row-number { color: #90a4ae; font-size: 11px; font-weight: 600; }
.order-name-cell { display: flex; align-items: center; gap: 8px; }
.order-dot {
  width: 8px; height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.dot-completed { background: linear-gradient(135deg, #2E7D32, #66BB6A); }
.dot-active { background: linear-gradient(135deg, #1565C0, #42A5F5); }
.order-name-text { font-weight: 600; }
.amount-dim { color: #78909c; }
.amount-paid { color: #2E7D32; font-weight: 600; }
.amount-pending { color: #E65100; font-weight: 700; }

.allocate-input-wrap {
  display: flex;
  align-items: center;
  gap: 4px;
}
.allocate-input { max-width: 160px; }
.input-filled :deep(.v-field) { border-color: #1565C0 !important; background: #E3F2FD; }
.input-error :deep(.v-field) { border-color: #C62828 !important; background: #FFEBEE; }
.fill-max-btn { opacity: 0.6; }
.fill-max-btn:hover { opacity: 1; }

.alloc-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 16px;
  flex-wrap: wrap;
  gap: 12px;
  padding: 14px 16px;
  background: #f5f8fc;
  border-radius: 12px;
  border: 1px solid #e0e8f0;
}
.alloc-remaining-info {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #5a6a85;
}
.save-btn { font-weight: 700; }

/* ===== BULK ACTIONS ===== */
.bulk-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  background: #FFF3E0;
  border: 1px solid #FFE0B2;
  border-radius: 10px;
}

/* ===== EMPTY STATE ===== */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px;
}

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
.edit-order-label {
  display: flex;
  align-items: center;
  font-size: 12px;
  font-weight: 600;
  color: #5a6a85;
  background: #f5f8fc;
  padding: 8px 12px;
  border-radius: 8px;
}

/* ===== RESPONSIVE ===== */
@media (max-width: 900px) {
  .stats-strip { grid-template-columns: repeat(2, 1fr); }
  .strip-stat:nth-child(2) { border-right: none; }
  .strip-stat:nth-child(1), .strip-stat:nth-child(2) { border-bottom: 1px solid rgba(255,255,255,0.15); }
  .receipt-grid { grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); }
  .saved-alloc-grid { grid-template-columns: 1fr; }
}
@media (max-width: 700px) {
  .alloc-hero { padding: 20px 16px; border-radius: 14px; }
  .alloc-hero-content { flex-direction: column; align-items: flex-start; gap: 12px; }
  .hero-title { font-size: 20px; }
  .hero-sub { font-size: 12px; }
  .selector-card-inner { padding: 14px; }
  .selector-controls { flex-direction: column; align-items: stretch; }
  .selector-autocomplete { max-width: none; }
  .load-btn { width: 100%; }
  .alloc-actions { flex-direction: column; align-items: stretch; }
  .alloc-actions .v-btn { width: 100%; }
  .alloc-summary-inline { justify-content: center; flex-wrap: wrap; }
  .receipt-grid { grid-template-columns: 1fr; }
}
@media (max-width: 440px) {
  .alloc-page { padding: 10px 8px; }
  .stats-strip { grid-template-columns: 1fr 1fr; gap: 0; }
  .strip-stat { padding: 10px 12px; }
  .strip-stat .strip-val { font-size: 14px; }
  .strip-stat .strip-lbl { font-size: 9px; }
  .alloc-hero { padding: 16px 12px; border-radius: 12px; }
  .hero-title { font-size: 18px; }
  .alloc-footer { flex-direction: column; align-items: stretch; gap: 10px; }
  .save-btn { width: 100%; }
}
</style>
