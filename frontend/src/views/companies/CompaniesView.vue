<template>
  <div class="page-container">
    <PageHeader :title="t('companies')" sub="Manage mills and keep deduction defaults aligned per company.">
      <v-btn color="primary" prepend-icon="mdi-plus" variant="flat" rounded="lg" @click="open()">{{ t('addCompany') }}</v-btn>
    </PageHeader>

    <v-row class="mb-4">
      <v-col cols="12" sm="6" md="4">
        <v-card rounded="xl" class="at-card stat-mini stat-mini-info">
          <div class="stat-mini-label">Total Companies</div>
          <div class="stat-mini-value">{{ totalCompanies }}</div>
        </v-card>
      </v-col>
    </v-row>

    <v-card rounded="xl" class="at-card company-table-shell" style="overflow:hidden">
      <div class="company-toolbar">
        <div class="company-toolbar-left">
          <v-icon size="18" color="primary">mdi-domain</v-icon>
          <span class="company-toolbar-title">Company Registry</span>
        </div>
        <v-text-field v-model="search" :placeholder="t('search')" prepend-inner-icon="mdi-magnify"
          density="compact" variant="outlined" hide-details class="company-search" />
      </div>
      <AgTable :rowData="store.items" :columnDefs="cols" :quickFilter="search" height="520px" />
    </v-card>

    <!-- Form dialog -->
    <v-dialog v-model="dialog" max-width="520" persistent>
      <v-card rounded="xl">
        <v-card-title class="pt-5 px-6 font-weight-bold d-flex align-center justify-space-between">
          <span>{{ editId ? t('editCompany') : t('addCompany') }}</span>
          <v-chip size="small" color="primary" variant="tonal">Company Master</v-chip>
        </v-card-title>
        <v-card-text class="px-6">
          <v-form ref="formRef" validate-on="blur" @submit.prevent="save">
            <v-text-field v-model="form.name" :label="t('companyName')" class="mb-3" :rules="[v => !!String(v || '').trim() || t('required')]" />
          </v-form>
        </v-card-text>
        <v-card-actions class="px-6 pb-5">
          <v-spacer />
          <v-btn variant="text" @click="dialog=false">{{ t('cancel') }}</v-btn>
          <v-btn color="primary" variant="flat" rounded="lg" :loading="saving" @click="save">{{ t('save') }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Delete warning dialog -->
    <v-dialog v-model="deleteDialog" max-width="500" persistent transition="dialog-transition">
      <v-card rounded="xl" class="delete-warning-card" elevation="16">
        <!-- Header with gradient background -->
        <div class="delete-warning-header">
          <v-icon size="40" color="white" class="mb-2">mdi-alert-circle</v-icon>
          <div class="delete-warning-header-text">
            <div class="delete-title">PERMANENT DELETION</div>
            <div class="delete-subtitle">This action cannot be undone</div>
          </div>
        </div>
        
        <v-card-text class="px-6 pt-6 pb-6">
          <div class="delete-warning-content">
            <!-- Company to be deleted -->
            <div class="delete-section">
              <p class="delete-label">You are about to permanently delete:</p>
              <v-chip 
                color="error" 
                variant="tonal" 
                size="x-large" 
                class="delete-company-chip"
                prepend-icon="mdi-domain"
              >
                <span class="font-weight-bold">{{ deletingCompany?.company }}</span>
              </v-chip>
            </div>

            <!-- Items to be deleted -->
            <div class="delete-section mt-6">
              <p class="delete-label mb-3">This will also permanently delete:</p>
              <div class="delete-items">
                <div v-if="deletingCompany?.ordersCount > 0" class="delete-item">
                  <v-icon size="20" color="#1976D2" class="mr-2">mdi-clipboard-list</v-icon>
                  <span><strong>{{ deletingCompany?.ordersCount }}</strong> order(s)</span>
                </div>
                <div v-if="deletingCompany?.paymentsCount > 0" class="delete-item">
                  <v-icon size="20" color="#7B1FA2" class="mr-2">mdi-credit-card</v-icon>
                  <span><strong>{{ deletingCompany?.paymentsCount }}</strong> payment(s)</span>
                </div>
                <div v-if="deletingCompany?.productionCount > 0" class="delete-item">
                  <v-icon size="20" color="#F57C00" class="mr-2">mdi-factory</v-icon>
                  <span><strong>{{ deletingCompany?.productionCount }}</strong> production record(s)</span>
                </div>
                <div v-if="deletingCompany?.noolCount > 0" class="delete-item">
                  <v-icon size="20" color="#C62828" class="mr-2">mdi-yarn</v-icon>
                  <span><strong>{{ deletingCompany?.noolCount }}</strong> nool entry(ies)</span>
                </div>
                <div v-if="!deletingCompany?.ordersCount && !deletingCompany?.paymentsCount && !deletingCompany?.productionCount && !deletingCompany?.noolCount" class="delete-item">
                  <v-icon size="20" color="#558B2F" class="mr-2">mdi-check-circle</v-icon>
                  <span>No related records found</span>
                </div>
              </div>
            </div>

            <!-- Warning box -->
            <div class="delete-warning-box mt-6">
              <v-icon size="24" color="#E65100" class="mr-2">mdi-alert</v-icon>
              <div>
                <div class="warning-title">⚠️ No Backups?</div>
                <div class="warning-text">Make sure you have backups before proceeding. This action is permanent and cannot be reversed.</div>
              </div>
            </div>
          </div>
        </v-card-text>

        <!-- Actions -->
        <v-card-actions class="px-6 pb-6">
          <v-spacer />
          <v-btn 
            variant="outlined" 
            color="default"
            rounded="lg"
            size="large"
            @click="deleteDialog = false" 
            :loading="deleting"
            class="cancel-btn"
          >
            Cancel
          </v-btn>
          <v-btn 
            color="error" 
            variant="flat" 
            rounded="lg"
            size="large"
            :loading="deleting" 
            @click="confirmDelete"
            prepend-icon="mdi-trash-can"
            class="delete-btn"
          >
            Delete Permanently
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useCompanyStore } from '@/stores/index'
import { useConfirm } from '@/composables/useConfirm'
import { useNotify } from '@/composables/useNotify'
import PageHeader from '@/components/common/PageHeader.vue'
import AgTable from '@/components/common/AgTable.vue'
import api from '@/plugins/axios'

const { t } = useI18n()
const store  = useCompanyStore()
const route  = useRoute()
const { confirm } = useConfirm()
const { notify } = useNotify()
const search = ref(''); const dialog = ref(false); const saving = ref(false); const editId = ref(null)
const formRef = ref()
const form = ref({ name: '' })

const deleteDialog = ref(false)
const deletingCompany = ref(null)
const deletingCompanyId = ref(null)
const deleting = ref(false)

const totalCompanies = computed(() => store.items.length)

const cols = [
  { field: 'name',             headerName: t('companyName'),      flex: 1.8 },
  { headerName: t('actions'), flex: 1, sortable: false, filter: false,
    cellRenderer: p => `<div style="display:flex;gap:4px;padding-top:8px">
      <button data-id="${p.data._id}" data-action="edit" style="background:#E3F2FD;border:none;border-radius:6px;padding:4px 10px;cursor:pointer;color:#1565C0;font-size:12px;font-weight:600">Edit</button>
      <button data-id="${p.data._id}" data-action="delete" style="background:#FFEBEE;border:none;border-radius:6px;padding:4px 10px;cursor:pointer;color:#C62828;font-size:12px;font-weight:600">Delete</button>
    </div>`,
    onCellClicked: async e => {
      const action = e.event.target?.dataset?.action
      const id     = e.event.target?.dataset?.id
      if (!action || !id) return
      if (action === 'edit') open(store.items.find(x => x._id === id))
      if (action === 'delete') await handleDelete(id)
    }
  },
]

async function handleDelete(id) {
  deleting.value = true
  try {
    const stats = await api.get(`/companies/${id}/deletion-stats`)
    deletingCompanyId.value = id
    deletingCompany.value = stats.data
    deleteDialog.value = true
  } catch (err) {
    notify(`Error: ${err.response?.data?.message || err.message}`, 'error')
  } finally {
    deleting.value = false
  }
}

async function confirmDelete() {
  if (!deletingCompanyId.value) return
  deleting.value = true
  try {
    await store.remove(deletingCompanyId.value)
    deleteDialog.value = false
    deletingCompany.value = null
    deletingCompanyId.value = null
    notify('Company deleted successfully', 'success')
  } catch (err) {
    notify(`Error: ${err.response?.data?.message || err.message}`, 'error')
  } finally {
    deleting.value = false
  }
}

function open(row = null) {
  editId.value = row?._id || null
  form.value = { name: row?.name || '' }
  dialog.value = true
}

async function save() {
  const { valid } = await formRef.value.validate()
  if (!valid) return
  saving.value = true
  try {
    editId.value ? await store.update(editId.value, form.value) : await store.create(form.value)
    dialog.value = false
  } finally { saving.value = false }
}

onMounted(async () => {
  await store.fetch()
  if (route.query.add === '1') open()
})
</script>

<style scoped>
.company-table-shell {
  border-radius: 18px !important;
}

.company-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  border-bottom: 1px solid #e0e7ef;
  background: linear-gradient(90deg, #f8fcff 0%, #f4fbf7 100%);
}

.company-toolbar-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.company-toolbar-title {
  font-size: 13px;
  font-weight: 700;
  color: #27476e;
}

.company-search {
  max-width: 320px;
}

.stat-mini {
  padding: 14px;
  border-radius: 14px !important;
}

.stat-mini-label {
  font-size: 12px;
  color: #5a6a85;
}

.stat-mini-value {
  margin-top: 4px;
  font-size: 26px;
  font-weight: 800;
  color: #1a237e;
}

.stat-mini-info {
  background: linear-gradient(135deg, #E3F2FD 0%, #F3E5F5 100%);
}

.delete-warning-card {
  border: none !important;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15) !important;
  overflow: hidden;
}

.delete-warning-header {
  background: linear-gradient(135deg, #D32F2F 0%, #B71C1C 100%);
  color: white;
  padding: 32px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  position: relative;
  overflow: hidden;
}

.delete-warning-header::before {
  content: '';
  position: absolute;
  top: -50%;
  right: -10%;
  width: 200px;
  height: 200px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 50%;
}

.delete-warning-header::after {
  content: '';
  position: absolute;
  bottom: -60%;
  left: -5%;
  width: 150px;
  height: 150px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 50%;
}

.delete-warning-header-text {
  position: relative;
  z-index: 1;
}

.delete-title {
  font-size: 20px;
  font-weight: 900;
  letter-spacing: 0.5px;
  margin-top: 8px;
}

.delete-subtitle {
  font-size: 12px;
  opacity: 0.9;
  margin-top: 4px;
  font-weight: 500;
}

.delete-warning-content {
  animation: slideIn 0.3s ease-out;
}

.delete-section {
  margin-bottom: 16px;
}

.delete-label {
  font-size: 13px;
  font-weight: 600;
  color: #424242;
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.delete-company-chip {
  width: 100%;
  height: 48px;
  font-size: 15px;
  margin-top: 12px !important;
  background: linear-gradient(135deg, #FFEBEE 0%, #FCE4EC 100%) !important;
  border: 2px solid #EF5350 !important;
}

.delete-items {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.delete-item {
  display: flex;
  align-items: center;
  padding: 12px;
  background: linear-gradient(90deg, #F5F5F5 0%, #FAFAFA 100%);
  border-radius: 8px;
  border-left: 4px solid #2196F3;
  font-size: 13px;
  color: #424242;
  transition: all 0.2s ease;
  animation: slideInLeft 0.3s ease-out backwards;
}

.delete-item:nth-child(1) { animation-delay: 0.1s; border-left-color: #1976D2; }
.delete-item:nth-child(2) { animation-delay: 0.15s; border-left-color: #7B1FA2; }
.delete-item:nth-child(3) { animation-delay: 0.2s; border-left-color: #F57C00; }
.delete-item:nth-child(4) { animation-delay: 0.25s; border-left-color: #C62828; }
.delete-item:nth-child(5) { animation-delay: 0.3s; border-left-color: #558B2F; }

.delete-item:hover {
  background: #F0F0F0;
  transform: translateX(4px);
}

.delete-warning-box {
  display: flex;
  gap: 12px;
  padding: 14px 16px;
  background: linear-gradient(135deg, #FFF3E0 0%, #FFE0B2 100%);
  border-radius: 8px;
  border: 1px solid #FFCC80;
  animation: slideIn 0.4s ease-out;
}

.warning-title {
  font-size: 13px;
  font-weight: 700;
  color: #E65100;
  margin-bottom: 2px;
}

.warning-text {
  font-size: 12px;
  color: #BF360C;
  line-height: 1.4;
}

.cancel-btn {
  text-transform: uppercase;
  font-weight: 600;
  font-size: 12px;
  letter-spacing: 0.5px;
  transition: all 0.2s ease;
}

.cancel-btn:hover {
  background: #F5F5F5 !important;
}

.delete-btn {
  text-transform: uppercase;
  font-weight: 700;
  font-size: 12px;
  letter-spacing: 0.5px;
  transition: all 0.3s ease;
  position: relative;
}

.delete-btn:hover {
  box-shadow: 0 8px 24px rgba(211, 47, 47, 0.4) !important;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes slideInLeft {
  from {
    opacity: 0;
    transform: translateX(-16px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.stat-mini-info .stat-mini-value { color: #1f5ea8; }
.stat-mini-good .stat-mini-value { color: #2e7d32; }
@media (max-width: 680px) {
  .company-toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .company-search {
    max-width: none;
  }
}
</style>
