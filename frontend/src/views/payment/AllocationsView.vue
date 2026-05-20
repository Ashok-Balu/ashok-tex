<template>
  <div class="page-container">
    <PageHeader title="Payment Allocation" sub="Allocate company receipts to open orders" />

    <v-card rounded="xl" class="at-card pa-4 mb-4">
      <v-row dense>
        <v-col cols="12" md="5">
          <v-autocomplete
            v-model="companyId"
            :items="companyStore.items"
            item-title="name"
            item-value="_id"
            label="Company"
            density="compact"
            variant="outlined"
            hide-details="auto"
          />
        </v-col>
        <v-col cols="12" md="3">
          <v-btn color="primary" variant="flat" block :loading="loading" @click="loadAll">Load</v-btn>
        </v-col>
      </v-row>

      <v-row class="mt-2" v-if="companyId">
        <v-col cols="6" md="3"><div class="sum-box"><div>Receipts</div><strong>{{ receipts.length }}</strong></div></v-col>
        <v-col cols="6" md="3"><div class="sum-box"><div>Open Orders</div><strong>{{ openOrders.length }}</strong></div></v-col>
        <v-col cols="6" md="3"><div class="sum-box"><div>Total Unallocated</div><strong>{{ fmt(totalUnallocated) }}</strong></div></v-col>
        <v-col cols="6" md="3"><div class="sum-box"><div>Allocations Rows</div><strong>{{ allocationRows.length }}</strong></div></v-col>
      </v-row>
    </v-card>

    <v-card rounded="xl" class="at-card section-card" style="overflow:hidden">
      <div class="section-head">Receipts</div>
      <AgTable :rowData="receipts" :columnDefs="receiptCols" height="300px" :pagination="false" />
    </v-card>

    <v-card rounded="xl" class="at-card section-card" style="overflow:hidden">
      <div class="section-head">Allocate Amount</div>
      <div class="pa-4">
        <v-row dense>
          <v-col cols="12" md="6" class="d-flex align-center">
            <div style="font-size:12px;color:#5A6A85">
              Available Total Unallocated: <strong>{{ fmt(totalUnallocated) }}</strong>
            </div>
          </v-col>
        </v-row>

        <v-table density="compact" class="mt-3 allocation-table">
          <thead>
            <tr>
              <th>Order</th>
              <th class="text-right">Pending</th>
              <th class="text-right">Allocate</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in allocationRows" :key="row.orderId">
              <td>{{ row.orderName }}</td>
              <td class="text-right">{{ fmt(row.pendingAmount) }}</td>
              <td class="text-right allocation-input-col" style="width:190px">
                <v-text-field
                  v-model.number="row.amount"
                  type="number"
                  min="0"
                  density="compact"
                  variant="outlined"
                  hide-details="auto"
                  class="allocate-input"
                />
              </td>
            </tr>
          </tbody>
        </v-table>

        <div class="d-flex align-center justify-space-between mt-3">
          <div style="font-size:12px;color:#5A6A85">
            Requested Total: <strong>{{ fmt(requestedTotal) }}</strong>
            <span v-if="allocationOverLimit" style="color:#C62828">(Exceeds available)</span>
          </div>
          <v-btn color="primary" variant="flat" :loading="saving" :disabled="allocationOverLimit" @click="saveAllocation">Save Allocation</v-btn>
        </div>
      </div>
    </v-card>

    <v-card rounded="xl" class="at-card section-card" style="overflow:hidden">
      <div class="section-head">Allocation History</div>
      <AgTable :rowData="historyRows" :columnDefs="historyCols" height="320px" :pagination="false" />
    </v-card>

    <v-dialog v-model="editDialog" max-width="420">
      <v-card rounded="lg" class="pa-4">
        <div class="font-weight-bold mb-3" style="font-size:15px">Edit Allocation</div>
        <v-text-field
          v-model.number="editAmount"
          type="number"
          min="0"
          label="Amount"
          density="compact"
          variant="outlined"
          hide-details="auto"
          class="mb-2"
        />
        <v-text-field
          v-model="editNotes"
          label="Notes"
          density="compact"
          variant="outlined"
          hide-details="auto"
        />
        <div class="d-flex justify-end mt-4" style="gap:8px">
          <v-btn variant="text" @click="editDialog = false">Cancel</v-btn>
          <v-btn color="primary" variant="flat" :loading="saving" @click="saveHistoryEdit">Save</v-btn>
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
import PageHeader from '@/components/common/PageHeader.vue'
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
.sum-box {
  border: 1px solid #E0E7EF;
  border-radius: 10px;
  background: #F9FCFF;
  padding: 10px 12px;
}
.sum-box div { font-size: 11px; color: #5A6A85; }
.sum-box strong { font-size: 16px; color: #1A2744; }

.section-card {
  margin-bottom: 16px;
  border: 1px solid #d8e6f5;
  box-shadow: 0 12px 26px rgba(17, 52, 92, 0.06);
}

.section-head {
  border-bottom: 1px solid #E0E7EF;
  padding: 12px 16px;
  font-size: 15px;
  font-weight: 800;
  color: #1a2b49;
  background: linear-gradient(100deg, #f8fbff 0%, #f2f7ff 100%);
}

.allocation-table tbody td {
  padding-top: 8px;
  padding-bottom: 8px;
}

.allocation-input-col {
  padding-top: 10px !important;
  padding-bottom: 10px !important;
}

.allocate-input {
  margin-top: 4px;
  margin-bottom: 4px;
}
</style>
