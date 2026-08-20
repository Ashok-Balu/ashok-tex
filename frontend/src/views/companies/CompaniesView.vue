<template>
  <div class="companies-page">
    <!-- Hero Section -->
    <div class="cp-hero">
      <div class="cp-hero-bg"></div>
      <div class="cp-hero-content">
        <div class="cp-hero-left">
          <div class="cp-hero-icon">
            <v-icon size="28" color="white">mdi-domain</v-icon>
          </div>
          <div>
            <h1 class="cp-hero-title">{{ t('companies') }}</h1>
            <p class="cp-hero-sub">{{ totalCompanies }} mills registered</p>
          </div>
        </div>
        <div class="cp-hero-right">
          <div class="cp-search-wrap">
            <v-text-field
              v-model="search"
              :placeholder="t('search') + '...'"
              prepend-inner-icon="mdi-magnify"
              density="compact"
              variant="solo"
              hide-details
              rounded="pill"
              class="cp-search"
              flat
              clearable
            />
          </div>
          <v-btn color="white" variant="flat" rounded="pill" prepend-icon="mdi-plus" class="cp-add-btn" @click="open()">
            {{ t('addCompany') }}
          </v-btn>
        </div>
      </div>
    </div>

    <!-- Company Grid -->
    <transition-group name="card" tag="div" class="cp-grid">
      <div v-for="(company, idx) in filteredCompanies" :key="company._id" class="cp-card" :style="{ animationDelay: idx * 40 + 'ms' }">
        <div class="cp-card-accent" :style="{ background: nameColor(company.name) }"></div>
        <div class="cp-card-body">
          <div class="cp-card-avatar" :style="{ background: `linear-gradient(135deg, ${nameColor(company.name)}, ${nameColorLight(company.name)})` }">
            {{ nameInitials(company.name) }}
          </div>
          <div class="cp-card-name">{{ company.name }}</div>
          <div class="cp-card-actions">
            <button class="cp-action-btn cp-action-edit" @click="open(company)">
              <v-icon size="14">mdi-pencil</v-icon>
              Edit
            </button>
            <button class="cp-action-btn cp-action-delete" @click="handleDelete(company._id)">
              <v-icon size="14">mdi-trash-can-outline</v-icon>
            </button>
          </div>
        </div>
      </div>

      <div v-if="filteredCompanies.length === 0" key="empty" class="cp-empty">
        <div class="cp-empty-icon">
          <v-icon size="48" color="#b0bec5">mdi-domain-off</v-icon>
        </div>
        <p class="cp-empty-text">No companies found</p>
        <p class="cp-empty-hint">Try a different search term</p>
      </div>
    </transition-group>

    <!-- Add/Edit Dialog -->
    <v-dialog v-model="dialog" max-width="440" persistent :fullscreen="$vuetify.display.xs">
      <v-card rounded="2xl" class="cp-form-card" elevation="24">
        <div class="cp-form-header">
          <div class="cp-form-header-icon">
            <v-icon size="20" color="white">{{ editId ? 'mdi-pencil' : 'mdi-plus' }}</v-icon>
          </div>
          <div>
            <div class="cp-form-title">{{ editId ? t('editCompany') : t('addCompany') }}</div>
            <div class="cp-form-sub">{{ editId ? 'Update company details' : 'Register a new mill' }}</div>
          </div>
          <v-spacer />
          <v-btn icon="mdi-close" variant="text" size="small" @click="dialog = false" />
        </div>
        <v-card-text class="px-6 pt-6 pb-4">
          <v-form ref="formRef" validate-on="blur" @submit.prevent="save">
            <v-text-field
              v-model="form.name"
              :label="t('companyName')"
              variant="outlined"
              density="comfortable"
              rounded="lg"
              :rules="[v => !!String(v || '').trim() || t('required')]"
              prepend-inner-icon="mdi-domain"
              autofocus
            />
          </v-form>
        </v-card-text>
        <v-card-actions class="px-6 pb-5" style="gap:8px">
          <v-spacer />
          <v-btn variant="tonal" rounded="pill" @click="dialog = false">{{ t('cancel') }}</v-btn>
          <v-btn color="primary" variant="flat" rounded="pill" :loading="saving" @click="save" prepend-icon="mdi-check">
            {{ t('save') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Delete Confirmation Dialog -->
    <v-dialog v-model="deleteDialog" max-width="480" persistent transition="dialog-transition" :fullscreen="$vuetify.display.xs">
      <v-card rounded="xl" class="cp-delete-card" elevation="16">
        <div class="cp-delete-header">
          <v-icon size="36" color="white">mdi-alert-circle</v-icon>
          <div class="cp-delete-header-title">Permanent Deletion</div>
          <div class="cp-delete-header-sub">This action cannot be undone</div>
        </div>

        <v-card-text class="px-6 pt-5 pb-5">
          <div class="cp-delete-body">
            <p class="cp-delete-label">You are about to permanently delete:</p>
            <v-chip color="error" variant="tonal" size="large" class="cp-delete-chip" prepend-icon="mdi-domain">
              <span class="font-weight-bold">{{ deletingCompany?.company }}</span>
            </v-chip>

            <div v-if="deletingCompany" class="cp-delete-items mt-5">
              <div v-if="deletingCompany.ordersCount > 0" class="cp-delete-item">
                <v-icon size="18" color="#1976D2">mdi-clipboard-list</v-icon>
                <span><strong>{{ deletingCompany.ordersCount }}</strong> order(s)</span>
              </div>
              <div v-if="deletingCompany.paymentsCount > 0" class="cp-delete-item">
                <v-icon size="18" color="#7B1FA2">mdi-credit-card</v-icon>
                <span><strong>{{ deletingCompany.paymentsCount }}</strong> payment(s)</span>
              </div>
              <div v-if="deletingCompany.productionCount > 0" class="cp-delete-item">
                <v-icon size="18" color="#F57C00">mdi-factory</v-icon>
                <span><strong>{{ deletingCompany.productionCount }}</strong> production record(s)</span>
              </div>
              <div v-if="deletingCompany.noolCount > 0" class="cp-delete-item">
                <v-icon size="18" color="#C62828">mdi-yarn</v-icon>
                <span><strong>{{ deletingCompany.noolCount }}</strong> nool entry(ies)</span>
              </div>
              <div v-if="!deletingCompany.ordersCount && !deletingCompany.paymentsCount && !deletingCompany.productionCount && !deletingCompany.noolCount" class="cp-delete-item cp-delete-item-safe">
                <v-icon size="18" color="#558B2F">mdi-check-circle</v-icon>
                <span>No related records found</span>
              </div>
            </div>

            <div class="cp-delete-warning mt-5">
              <v-icon size="20" color="#E65100">mdi-alert</v-icon>
              <span>Make sure you have backups before proceeding.</span>
            </div>
          </div>
        </v-card-text>

        <v-card-actions class="px-6 pb-5">
          <v-spacer />
          <v-btn variant="outlined" rounded="lg" @click="deleteDialog = false" :disabled="deleting">Cancel</v-btn>
          <v-btn color="error" variant="flat" rounded="lg" :loading="deleting" @click="confirmDelete" prepend-icon="mdi-trash-can">Delete</v-btn>
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
import { useNotify } from '@/composables/useNotify'
import api from '@/plugins/axios'

const { t } = useI18n()
const store = useCompanyStore()
const route = useRoute()
const { notify } = useNotify()

const search = ref('')
const dialog = ref(false)
const saving = ref(false)
const editId = ref(null)
const formRef = ref()
const form = ref({ name: '' })

const deleteDialog = ref(false)
const deletingCompany = ref(null)
const deletingCompanyId = ref(null)
const deleting = ref(false)

const totalCompanies = computed(() => store.items.length)

const filteredCompanies = computed(() => {
  if (!search.value) return store.items
  const q = search.value.toLowerCase()
  return store.items.filter(c => c.name?.toLowerCase().includes(q))
})

function nameColor(str) {
  const palette = ['#1565C0','#2E7D32','#6A1B9A','#C62828','#F57C00','#00838F','#AD1457','#37474F','#4527A0','#558B2F']
  let h = 0
  for (let i = 0; i < (str || '').length; i++) { h = (h << 5) - h + str.charCodeAt(i); h |= 0 }
  return palette[Math.abs(h) % palette.length]
}

function nameColorLight(str) {
  const palette = ['#42a5f5','#66bb6a','#ab47bc','#ef5350','#ffa726','#26c6da','#ec407a','#78909c','#7e57c2','#9ccc65']
  let h = 0
  for (let i = 0; i < (str || '').length; i++) { h = (h << 5) - h + str.charCodeAt(i); h |= 0 }
  return palette[Math.abs(h) % palette.length]
}

function nameInitials(name) {
  const w = String(name || '').trim().split(/\s+/)
  return w.length >= 2 ? (w[0][0] + w[1][0]).toUpperCase() : String(name || '?').slice(0, 2).toUpperCase()
}

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
.companies-page {
  animation: fadeIn 0.5s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}

/* ===== HERO ===== */
.cp-hero {
  position: relative;
  border-radius: 22px;
  overflow: hidden;
  margin-bottom: 28px;
  padding: 34px 32px;
}

.cp-hero-bg {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, #0d47a1 0%, #1565C0 25%, #1976d2 50%, #1e88e5 75%, #42a5f5 100%);
  z-index: 0;
}

.cp-hero-bg::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse at 10% 90%, rgba(255,255,255,0.08) 0%, transparent 50%),
    radial-gradient(ellipse at 90% 10%, rgba(255,255,255,0.12) 0%, transparent 40%);
}

.cp-hero-bg::after {
  content: '';
  position: absolute;
  top: -80px;
  right: -50px;
  width: 260px;
  height: 260px;
  border-radius: 50%;
  background: rgba(255,255,255,0.04);
  border: 2px solid rgba(255,255,255,0.06);
}

.cp-hero-content {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 16px;
}

.cp-hero-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.cp-hero-icon {
  width: 54px;
  height: 54px;
  background: rgba(255,255,255,0.14);
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255,255,255,0.18);
  box-shadow: 0 4px 20px rgba(0,0,0,0.1);
}

.cp-hero-title {
  font-size: 24px;
  font-weight: 800;
  color: white;
  margin: 0;
  letter-spacing: -0.4px;
}

.cp-hero-sub {
  font-size: 13px;
  color: rgba(255,255,255,0.7);
  margin: 3px 0 0;
  font-weight: 500;
}

.cp-hero-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.cp-search-wrap {
  width: 220px;
}

.cp-search {
  background: rgba(255,255,255,0.15) !important;
  backdrop-filter: blur(8px);
  border-radius: 40px !important;
}

.cp-search :deep(.v-field) {
  background: rgba(255,255,255,0.12) !important;
  border: 1px solid rgba(255,255,255,0.2) !important;
  color: white !important;
}

.cp-search :deep(.v-field input) {
  color: white !important;
}

.cp-search :deep(.v-field input::placeholder) {
  color: rgba(255,255,255,0.6) !important;
}

.cp-search :deep(.v-icon) {
  color: rgba(255,255,255,0.7) !important;
}

.cp-add-btn {
  background: white !important;
  color: #1565C0 !important;
  font-weight: 700;
  font-size: 13px;
  padding: 0 20px !important;
  height: 40px !important;
  box-shadow: 0 4px 20px rgba(0,0,0,0.15) !important;
  transition: all 0.25s cubic-bezier(0.4,0,0.2,1);
}

.cp-add-btn:hover {
  transform: translateY(-2px) scale(1.02);
  box-shadow: 0 8px 30px rgba(0,0,0,0.2) !important;
}

/* ===== GRID ===== */
.cp-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 20px;
}

/* ===== CARD ===== */
.cp-card {
  position: relative;
  background: white;
  border-radius: 18px;
  overflow: hidden;
  border: 1px solid #eaeef5;
  transition: all 0.3s cubic-bezier(0.4,0,0.2,1);
  animation: cardIn 0.5s ease-out both;
}

@keyframes cardIn {
  from { opacity: 0; transform: translateY(20px) scale(0.95); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

.cp-card:hover {
  transform: translateY(-6px);
  box-shadow: 0 20px 50px rgba(21,101,192,0.12), 0 8px 20px rgba(0,0,0,0.06);
  border-color: transparent;
}

.cp-card-accent {
  height: 4px;
  width: 100%;
}

.cp-card-body {
  padding: 24px 20px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.cp-card-avatar {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 18px;
  color: white;
  box-shadow: 0 6px 20px rgba(0,0,0,0.15);
  margin-bottom: 14px;
  transition: transform 0.3s cubic-bezier(0.4,0,0.2,1), box-shadow 0.3s;
}

.cp-card:hover .cp-card-avatar {
  transform: scale(1.08);
  box-shadow: 0 8px 28px rgba(0,0,0,0.2);
}

.cp-card-name {
  font-size: 14px;
  font-weight: 700;
  color: #1a2b49;
  line-height: 1.3;
  margin-bottom: 16px;
  max-width: 100%;
  word-break: break-word;
}

.cp-card-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  opacity: 0;
  transform: translateY(4px);
  transition: all 0.25s ease;
}

.cp-card:hover .cp-card-actions {
  opacity: 1;
  transform: translateY(0);
}

.cp-action-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border-radius: 8px;
  border: none;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.cp-action-edit {
  background: #e3f2fd;
  color: #1565C0;
}

.cp-action-edit:hover {
  background: #bbdefb;
  box-shadow: 0 2px 8px rgba(21,101,192,0.2);
}

.cp-action-delete {
  background: #fce4ec;
  color: #c62828;
  padding: 6px 8px;
}

.cp-action-delete:hover {
  background: #ffcdd2;
  box-shadow: 0 2px 8px rgba(198,40,40,0.2);
}

/* Card transitions */
.card-enter-active,
.card-leave-active {
  transition: all 0.35s cubic-bezier(0.4,0,0.2,1);
}
.card-enter-from {
  opacity: 0;
  transform: translateY(20px) scale(0.94);
}
.card-leave-to {
  opacity: 0;
  transform: scale(0.9);
}

/* ===== EMPTY STATE ===== */
.cp-empty {
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
}

.cp-empty-icon {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: #f5f7fa;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
}

.cp-empty-text {
  font-size: 16px;
  font-weight: 700;
  color: #546e7a;
  margin: 0;
}

.cp-empty-hint {
  font-size: 13px;
  color: #90a4ae;
  margin: 4px 0 0;
}

/* ===== FORM DIALOG ===== */
.cp-form-card {
  overflow: hidden;
}

.cp-form-header {
  background: linear-gradient(135deg, #0d47a1 0%, #1976d2 50%, #42a5f5 100%);
  padding: 22px 22px 20px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.cp-form-header-icon {
  width: 42px;
  height: 42px;
  background: rgba(255,255,255,0.16);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.cp-form-title {
  font-size: 16px;
  font-weight: 800;
  color: white;
}

.cp-form-sub {
  font-size: 11px;
  color: rgba(255,255,255,0.7);
}

/* ===== DELETE DIALOG ===== */
.cp-delete-card {
  overflow: hidden;
  border: none !important;
}

.cp-delete-header {
  background: linear-gradient(135deg, #c62828 0%, #b71c1c 50%, #880e4f 100%);
  color: white;
  padding: 30px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  position: relative;
  overflow: hidden;
}

.cp-delete-header::before {
  content: '';
  position: absolute;
  top: -40%;
  right: -15%;
  width: 180px;
  height: 180px;
  background: rgba(255,255,255,0.06);
  border-radius: 50%;
}

.cp-delete-header-title {
  font-size: 18px;
  font-weight: 800;
  margin-top: 6px;
}

.cp-delete-header-sub {
  font-size: 12px;
  opacity: 0.8;
  margin-top: 2px;
}

.cp-delete-label {
  font-size: 13px;
  font-weight: 600;
  color: #424242;
  margin: 0 0 10px;
}

.cp-delete-chip {
  width: 100%;
  height: 44px;
  font-size: 14px;
  background: linear-gradient(135deg, #FFEBEE 0%, #FCE4EC 100%) !important;
  border: 1.5px solid #EF5350 !important;
}

.cp-delete-items {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.cp-delete-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  background: #f5f7fa;
  border-radius: 8px;
  border-left: 3px solid #1976D2;
  font-size: 13px;
  color: #424242;
}

.cp-delete-item:nth-child(2) { border-left-color: #7B1FA2; }
.cp-delete-item:nth-child(3) { border-left-color: #F57C00; }
.cp-delete-item:nth-child(4) { border-left-color: #C62828; }
.cp-delete-item-safe { border-left-color: #558B2F; }

.cp-delete-warning {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  background: #fff8e1;
  border: 1px solid #ffe082;
  border-radius: 8px;
  font-size: 12px;
  color: #bf360c;
  font-weight: 500;
}

/* ===== RESPONSIVE ===== */

/* Tablet landscape */
@media (max-width: 1024px) {
  .cp-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
  }
}

/* Tablet portrait */
@media (max-width: 768px) {
  .cp-hero {
    padding: 24px 20px;
    border-radius: 16px;
  }

  .cp-hero-title {
    font-size: 20px;
  }

  .cp-hero-icon {
    width: 44px;
    height: 44px;
  }

  .cp-hero-content {
    flex-direction: column;
    align-items: stretch;
    gap: 14px;
  }

  .cp-hero-right {
    width: 100%;
    flex-wrap: wrap;
  }

  .cp-search-wrap {
    flex: 1;
    width: auto;
    min-width: 160px;
  }

  .cp-add-btn {
    flex-shrink: 0;
  }

  .cp-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 14px;
  }

  .cp-card-body {
    padding: 18px 14px 16px;
  }

  .cp-card-avatar {
    width: 48px;
    height: 48px;
    font-size: 16px;
  }

  /* Always show actions on touch devices */
  .cp-card-actions {
    opacity: 1;
    transform: none;
  }

  /* Larger touch targets */
  .cp-action-btn {
    padding: 8px 14px;
    font-size: 13px;
    min-height: 36px;
  }

  .cp-action-delete {
    padding: 8px 10px;
    min-height: 36px;
  }

  /* Disable hover lift on touch */
  .cp-card:hover {
    transform: none;
    box-shadow: 0 2px 12px rgba(21,101,192,0.08);
  }

  .cp-card:hover .cp-card-avatar {
    transform: none;
  }

  .cp-empty {
    padding: 50px 16px;
  }
}

/* Mobile */
@media (max-width: 480px) {
  .cp-hero {
    padding: 20px 16px;
    border-radius: 14px;
    margin-bottom: 20px;
  }

  .cp-hero-left {
    justify-content: flex-start;
  }

  .cp-hero-right {
    flex-direction: column;
    gap: 10px;
  }

  .cp-search-wrap {
    width: 100%;
  }

  .cp-add-btn {
    width: 100%;
    justify-content: center;
  }

  .cp-grid {
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }

  .cp-card {
    border-radius: 14px;
  }

  .cp-card-name {
    font-size: 13px;
  }

  .cp-card-avatar {
    width: 42px;
    height: 42px;
    font-size: 14px;
    border-radius: 12px;
    margin-bottom: 10px;
  }

  .cp-card-body {
    padding: 14px 10px 12px;
  }

  .cp-card-actions {
    gap: 4px;
    width: 100%;
    justify-content: center;
  }

  .cp-action-btn {
    padding: 7px 10px;
    font-size: 11px;
    border-radius: 6px;
    min-height: 32px;
  }

  .cp-action-delete {
    padding: 7px 8px;
    min-height: 32px;
  }

  .cp-form-header {
    padding: 18px 16px;
  }

  .cp-form-title {
    font-size: 15px;
  }

  .cp-delete-header {
    padding: 24px 16px;
  }

  .cp-delete-header-title {
    font-size: 16px;
  }
}

/* Very small phones */
@media (max-width: 360px) {
  .cp-grid {
    grid-template-columns: 1fr;
    gap: 10px;
  }

  .cp-card-body {
    flex-direction: row;
    align-items: center;
    text-align: left;
    gap: 12px;
    padding: 14px;
  }

  .cp-card-avatar {
    margin-bottom: 0;
    flex-shrink: 0;
  }

  .cp-card-name {
    flex: 1;
    margin-bottom: 0;
  }

  .cp-card-actions {
    flex-direction: column;
    gap: 4px;
  }
}
</style>
