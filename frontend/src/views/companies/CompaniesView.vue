<template>
  <div class="companies-page" @pointermove="onFx">
    <!-- Hero Section -->
    <div class="cp-hero">
      <div class="cp-hero-bg"></div>
      <span class="cp-sun" aria-hidden="true"></span>
      <span class="cp-cloud cp-cloud-a" aria-hidden="true"></span>
      <span class="cp-cloud cp-cloud-b" aria-hidden="true"></span>
      <span class="cp-cloud cp-cloud-c" aria-hidden="true"></span>
      <svg class="cp-hero-art" viewBox="0 0 300 120" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
        <rect x="60" y="52" width="26" height="68" fill="#8fb8f7" />
        <rect x="88" y="30" width="34" height="90" fill="#4d8ff0" />
        <rect x="124" y="18" width="30" height="102" fill="#2f6fe0" />
        <rect x="156" y="44" width="28" height="76" fill="#6ea6f4" />
        <rect x="186" y="64" width="22" height="56" fill="#a9cbf8" />
        <g fill="white" opacity="0.55">
          <rect x="96" y="42" width="5" height="5" /><rect x="106" y="42" width="5" height="5" /><rect x="96" y="56" width="5" height="5" /><rect x="106" y="56" width="5" height="5" />
          <rect x="132" y="30" width="5" height="5" /><rect x="141" y="30" width="5" height="5" /><rect x="132" y="46" width="5" height="5" /><rect x="141" y="46" width="5" height="5" />
          <rect x="164" y="56" width="5" height="5" /><rect x="174" y="56" width="5" height="5" />
        </g>
        <circle cx="48" cy="96" r="14" fill="#5bb36a" />
        <rect x="46" y="104" width="4" height="16" fill="#7a5c3a" />
        <circle cx="222" cy="92" r="16" fill="#4fa35e" />
        <rect x="220" y="102" width="4" height="18" fill="#7a5c3a" />
      </svg>
      <div class="cp-hero-content">
        <div class="cp-hero-left">
          <div class="cp-hero-icon">
            <v-icon size="28" color="#1565C0">mdi-domain</v-icon>
          </div>
          <div>
            <h1 class="cp-hero-title">{{ t('companies') }}</h1>
            <p class="cp-hero-sub">{{ t('millsRegistered', { count: totalCompanies }) }}</p>
          </div>
        </div>
        <div class="cp-hero-right">
          <div class="cp-search-wrap">
            <v-text-field
              v-model="search"
              :placeholder="t('searchCompany')"
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
          <v-btn color="primary" variant="flat" rounded="pill" prepend-icon="mdi-plus" class="cp-add-btn" @click="open()">
            {{ t('addCompany') }}
          </v-btn>
        </div>
      </div>
    </div>

    <!-- Company Panel -->
    <div class="cp-panel">
      <div class="cp-panel-header">
        <div class="cp-panel-title-wrap">
          <div class="cp-panel-icon">
            <v-icon size="20" color="#1565C0">mdi-domain</v-icon>
          </div>
          <div>
            <div class="cp-panel-title">{{ t('allCompanies') }}</div>
            <div class="cp-panel-sub">{{ t('manageMills') }}</div>
          </div>
        </div>
        <div class="cp-view-toggle">
          <button :class="['cp-view-btn', { active: viewMode === 'grid' }]" @click="viewMode = 'grid'">
            <v-icon size="16">mdi-view-grid</v-icon>
          </button>
          <button :class="['cp-view-btn', { active: viewMode === 'list' }]" @click="viewMode = 'list'">
            <v-icon size="16">mdi-view-list</v-icon>
          </button>
        </div>
      </div>

      <transition-group name="card" tag="div" :class="viewMode === 'grid' ? 'cp-grid' : 'cp-list'">
        <div
          v-for="(company, idx) in filteredCompanies"
          :key="company._id"
          class="cp-tile"
          :class="{ 'is-list': viewMode === 'list' }"
          :style="{ animationDelay: idx * 40 + 'ms', '--accent': nameColor(company.name) }"
        >
          <div class="cp-tile-watermark">
            <v-icon size="26">mdi-domain</v-icon>
          </div>
          <div class="cp-tile-main">
            <div class="cp-tile-avatar" :style="{ background: nameColor(company.name) }">
              {{ nameInitials(company.name) }}
            </div>
            <div class="cp-tile-name">{{ company.name }}</div>
          </div>
          <div class="cp-tile-actions">
            <button class="cp-tile-delete" :title="t('delete')" :disabled="!!checkingDeleteId" @click.stop="handleDelete(company._id)">
              <v-progress-circular v-if="checkingDeleteId === company._id" indeterminate size="14" width="2" />
              <v-icon v-else size="15">mdi-trash-can-outline</v-icon>
            </button>
            <button class="cp-tile-go" :title="t('edit')" @click="open(company)">
              <v-icon size="16">mdi-arrow-right</v-icon>
            </button>
          </div>
        </div>

        <div v-if="loadingCompanies && filteredCompanies.length === 0" key="loading" class="cp-empty cp-skeleton">
          <span v-for="n in 8" :key="n" class="cp-skel-tile at-skel" :style="{ '--n': n }"></span>
        </div>
        <div v-else-if="filteredCompanies.length === 0" key="empty" class="cp-empty">
          <EmptyState icon="mdi-domain-off" :title="t('noCompaniesFound')" :hint="t('tryDifferentSearch')" />
        </div>
      </transition-group>
    </div>

    <!-- Add/Edit Dialog -->
    <v-dialog v-model="dialog" max-width="440" persistent :fullscreen="$vuetify.display.xs">
      <v-card rounded="2xl" class="cp-form-card" elevation="24">
        <div class="cp-form-header">
          <div class="cp-form-header-icon">
            <v-icon size="20" color="white">{{ editId ? 'mdi-pencil' : 'mdi-plus' }}</v-icon>
          </div>
          <div>
            <div class="cp-form-title">{{ editId ? t('editCompany') : t('addCompany') }}</div>
            <div class="cp-form-sub">{{ editId ? t('updateCompanyDetails') : t('registerMill') }}</div>
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
              :rules="[rules.required(), rules.minLength(2), rules.maxLength(100)]"
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
          <div class="cp-delete-header-title">{{ t('permanentDeletion') }}</div>
          <div class="cp-delete-header-sub">{{ t('cannotUndo') }}</div>
        </div>

        <v-card-text class="px-6 pt-5 pb-5">
          <div class="cp-delete-body">
            <p class="cp-delete-label">{{ t('aboutToDelete') }}</p>
            <v-chip color="error" variant="tonal" size="large" class="cp-delete-chip" prepend-icon="mdi-domain">
              <span class="font-weight-bold">{{ deletingCompany?.company }}</span>
            </v-chip>

            <div v-if="deletingCompany" class="cp-delete-items mt-5">
              <div v-if="deletingCompany.ordersCount > 0" class="cp-delete-item">
                <v-icon size="18" color="#1976D2">mdi-clipboard-list</v-icon>
                <span>{{ t('ordersCount', { count: deletingCompany.ordersCount }) }}</span>
              </div>
              <div v-if="deletingCompany.paymentsCount > 0" class="cp-delete-item">
                <v-icon size="18" color="#7B1FA2">mdi-credit-card</v-icon>
                <span>{{ t('paymentsCount', { count: deletingCompany.paymentsCount }) }}</span>
              </div>
              <div v-if="deletingCompany.productionCount > 0" class="cp-delete-item">
                <v-icon size="18" color="#F57C00">mdi-factory</v-icon>
                <span>{{ t('productionRecordsCount', { count: deletingCompany.productionCount }) }}</span>
              </div>
              <div v-if="deletingCompany.noolCount > 0" class="cp-delete-item">
                <v-icon size="18" color="#C62828">mdi-yarn</v-icon>
                <span>{{ t('noolEntriesCount', { count: deletingCompany.noolCount }) }}</span>
              </div>
              <div v-if="!deletingCompany.ordersCount && !deletingCompany.paymentsCount && !deletingCompany.productionCount && !deletingCompany.noolCount" class="cp-delete-item cp-delete-item-safe">
                <v-icon size="18" color="#558B2F">mdi-check-circle</v-icon>
                <span>{{ t('noRelatedRecords') }}</span>
              </div>
            </div>

            <div class="cp-delete-warning mt-5">
              <v-icon size="20" color="#E65100">mdi-alert</v-icon>
              <span>{{ t('backupWarning') }}</span>
            </div>
          </div>
        </v-card-text>

        <v-card-actions class="px-6 pb-5">
          <v-spacer />
          <v-btn variant="outlined" rounded="lg" @click="deleteDialog = false" :disabled="deleting">{{ t('cancel') }}</v-btn>
          <v-btn color="error" variant="flat" rounded="lg" :loading="deleting" @click="confirmDelete" prepend-icon="mdi-trash-can">{{ t('delete') }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import EmptyState from '@/components/common/EmptyState.vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useCompanyStore } from '@/stores/index'
import { useNotify } from '@/composables/useNotify'
import { useValidation } from '@/composables/useValidation'
import api from '@/plugins/axios'

const { t } = useI18n()
const rules = useValidation()
const store = useCompanyStore()
const route = useRoute()
const notify = useNotify()

const search = ref('')
const viewMode = ref('grid')
const dialog = ref(false)
const saving = ref(false)
const loadingCompanies = ref(false)
const checkingDeleteId = ref(null)
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

function nameInitials(name) {
  const w = String(name || '').trim().split(/\s+/)
  return w.length >= 2 ? (w[0][0] + w[1][0]).toUpperCase() : String(name || '?').slice(0, 2).toUpperCase()
}

async function handleDelete(id) {
  checkingDeleteId.value = id
  try {
    const stats = await api.get(`/companies/${id}/deletion-stats`)
    deletingCompanyId.value = id
    deletingCompany.value = stats.data
    deleteDialog.value = true
  } catch (err) {
    notify.apiError(err, t('companyDeleteFailed'))
  } finally {
    checkingDeleteId.value = null
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
  } catch {
    // store already showed the error
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
  } catch {
    // store already showed the error; keep the dialog open
  } finally { saving.value = false }
}

onMounted(async () => {
  loadingCompanies.value = true
  try {
    await store.fetch()
  } catch (err) {
    notify.apiError(err, t('companiesLoadFailed'))
  } finally {
    loadingCompanies.value = false
  }
  if (route.query.add === '1') open()
})

// Spotlight position for the hovered tile (CSS variables only)
let fxFrame = 0
function onFx(e) {
  if (fxFrame || e.pointerType === 'touch') return
  const { clientX, clientY, target } = e
  fxFrame = requestAnimationFrame(() => {
    fxFrame = 0
    const tile = target?.closest?.('.cp-tile')
    if (!tile) return
    const r = tile.getBoundingClientRect()
    tile.style.setProperty('--mx', `${clientX - r.left}px`)
    tile.style.setProperty('--my', `${clientY - r.top}px`)
  })
}
onBeforeUnmount(() => { if (fxFrame) cancelAnimationFrame(fxFrame) })
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
  padding: 24px 32px;
  min-height: 120px;
  display: flex;
  align-items: center;
}

.cp-hero-art {
  position: absolute;
  bottom: 0;
  left: 33%;
  width: 320px;
  height: 130px;
  z-index: 1;
  pointer-events: none;
}

.cp-hero-bg {
  position: absolute;
  inset: 0;
  background: linear-gradient(100deg, #cfe3fb 0%, #e6f1fd 45%, #d4e7fb 100%);
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
  width: 100%;
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
  background: white;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #dbe6f5;
  box-shadow: 0 4px 16px rgba(21,101,192,0.12);
}

.cp-hero-title {
  font-size: 24px;
  font-weight: 800;
  color: #0d1b3e;
  margin: 0;
  letter-spacing: -0.4px;
}

.cp-hero-sub {
  font-size: 13px;
  color: #5b6b85;
  margin: 3px 0 0;
  font-weight: 500;
}

.cp-hero-right {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-left: auto;
}

.cp-search-wrap {
  width: 300px;
}

.cp-search {
  background: #eef3fa !important;
  border-radius: 40px !important;
  box-shadow: 0 2px 10px rgba(15,35,70,0.08);
}

.cp-search :deep(.v-field) {
  background: #eef3fa !important;
  border: 1px solid #e2e9f4 !important;
  border-radius: 40px !important;
  min-height: 46px;
  color: #1a2b49 !important;
}

.cp-search :deep(.v-field__input) {
  min-height: 46px;
  padding-top: 0;
  padding-bottom: 0;
  font-size: 14px;
}

.cp-search :deep(.v-field input) {
  color: #1a2b49 !important;
}

.cp-search :deep(.v-field input::placeholder) {
  color: #8a97ab !important;
  opacity: 1;
}

.cp-search :deep(.v-icon) {
  color: #8a97ab !important;
}

.cp-add-btn {
  background: #1565C0 !important;
  color: white !important;
  font-weight: 700;
  font-size: 13px;
  padding: 0 20px !important;
  height: 40px !important;
  box-shadow: 0 4px 14px rgba(21,101,192,0.3) !important;
  transition: all 0.25s cubic-bezier(0.4,0,0.2,1);
}

.cp-add-btn:hover {
  transform: translateY(-2px) scale(1.02);
  box-shadow: 0 8px 30px rgba(0,0,0,0.2) !important;
}

/* ===== PANEL ===== */
.cp-panel {
  background: #f5f8fc;
  border: 1px solid #e3eaf5;
  border-radius: 18px;
  padding: 22px;
}

.cp-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 18px;
}

.cp-panel-title-wrap {
  display: flex;
  align-items: center;
  gap: 12px;
}

.cp-panel-icon {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: #e3edfb;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cp-panel-title {
  font-size: 16px;
  font-weight: 800;
  color: #0d1b3e;
}

.cp-panel-sub {
  font-size: 12px;
  color: #6b7a90;
}

.cp-view-toggle {
  display: flex;
  gap: 2px;
  padding: 3px;
  background: white;
  border: 1px solid #dbe6f5;
  border-radius: 10px;
}

.cp-view-btn {
  width: 34px;
  height: 30px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: #6b7a90;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}

.cp-view-btn.active {
  background: #1565C0;
  color: white;
}

/* ===== GRID ===== */
.cp-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

@media (max-width: 1000px) {
  .cp-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  .cp-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 480px) {
  .cp-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}

.cp-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* ===== TILE ===== */
.cp-tile {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 18px;
  min-height: 112px;
  padding: 20px 18px 14px;
  background: white;
  border: 1px solid #e6ecf5;
  border-top: 4px solid var(--accent);
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(15,35,70,0.04);
  transition: all 0.3s cubic-bezier(0.4,0,0.2,1);
  animation: cardIn 0.5s ease-out backwards;
}

@keyframes cardIn {
  from { opacity: 0; transform: translateY(20px) scale(0.95); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

.cp-tile:hover {
  transform: translateY(-4px);
  box-shadow: 0 14px 30px rgba(21,101,192,0.12);
}

.cp-tile::before {
  content: '';
  position: absolute;
  right: 0;
  bottom: 0;
  width: 120px;
  height: 100px;
  background: linear-gradient(135deg, transparent 55%, color-mix(in srgb, var(--accent) 9%, white) 55%);
  pointer-events: none;
}

.cp-tile-watermark {
  position: absolute;
  top: 14px;
  right: 14px;
  color: var(--accent);
  opacity: 0.25;
  pointer-events: none;
}

.cp-tile-main {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.cp-tile-avatar {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 800;
  font-size: 15px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.12);
}

.cp-tile-name {
  font-size: 12.5px;
  font-weight: 700;
  color: #1a2b49;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  line-height: 1.3;
  word-break: break-word;
}

.cp-tile-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
}

.cp-tile-go,
.cp-tile-delete {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}

.cp-tile-go {
  background: #eef4fc !important;
  border: 1px solid #c9d8ee !important;
  color: #1565C0;
  box-shadow: 0 3px 8px rgba(15,35,70,0.12);
}

.cp-tile-go:hover {
  background: #1565C0;
  border-color: #1565C0;
  color: white;
}

.cp-tile-delete {
  background: #fce4ec;
  border: none;
  color: #c62828;
  opacity: 0;
}

.cp-tile:hover .cp-tile-delete {
  opacity: 1;
}

.cp-tile-delete:hover {
  background: #ffcdd2;
}

/* List view */
.cp-tile.is-list {
  flex-direction: row;
  align-items: center;
  min-height: 0;
  padding: 12px 18px;
  border-top: 1px solid #e6ecf5;
  border-left: 4px solid var(--accent);
}

.cp-tile.is-list .cp-tile-main {
  flex-direction: row;
  align-items: center;
}

.cp-tile.is-list .cp-tile-watermark {
  display: none;
}

.cp-tile.is-list .cp-tile-delete {
  opacity: 1;
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

/* ── FX layer: sky, spotlight, sheen ── */
.cp-empty.cp-skeleton {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
  gap: 16px;
  padding: 0;
  width: 100%;
}

.cp-skel-tile {
  height: 112px;
  border-radius: 14px;
  border-top: 4px solid #dbe6f5;
}
.cp-sun {
  position: absolute;
  top: -50px;
  left: 18%;
  width: 150px;
  height: 150px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 236, 170, 0.85), rgba(255, 214, 120, 0) 68%);
  z-index: 0;
  pointer-events: none;
}

.cp-cloud {
  position: absolute;
  z-index: 0;
  height: 22px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.85);
  box-shadow: 0 6px 14px rgba(21, 101, 192, 0.08);
  pointer-events: none;
}

.cp-cloud::before,
.cp-cloud::after {
  content: '';
  position: absolute;
  bottom: 6px;
  border-radius: 50%;
  background: inherit;
}

.cp-cloud::before { left: 18%; width: 40%; height: 150%; }
.cp-cloud::after { right: 14%; width: 30%; height: 110%; }

.cp-cloud-a { top: 22px; left: -90px; width: 90px; }
.cp-cloud-b { top: 58px; left: -140px; width: 130px; opacity: 0.7; }
.cp-cloud-c { top: 12px; left: -70px; width: 70px; opacity: 0.6; }

.cp-hero-title {
  background: linear-gradient(90deg, #0d1b3e 0%, #1565C0 45%, #0d1b3e 90%);
  background-size: 200% 100%;
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.cp-hero-icon,
.cp-panel-icon { position: relative; }

.cp-add-btn { position: relative; overflow: hidden; }

.cp-add-btn::after {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  width: 40%;
  background: linear-gradient(100deg, transparent, rgba(255, 255, 255, 0.45), transparent);
  transform: translateX(-150%) skewX(-18deg);
  pointer-events: none;
}

.cp-search :deep(.v-field--focused) {
  box-shadow: 0 0 0 4px rgba(21, 101, 192, 0.14), 0 8px 24px -8px rgba(21, 101, 192, 0.35) !important;
}

.cp-tile::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: radial-gradient(220px circle at var(--mx, 50%) var(--my, 50%), color-mix(in srgb, var(--accent) 16%, transparent), transparent 70%);
  opacity: 0;
  transition: opacity 0.3s ease;
  pointer-events: none;
}

.cp-tile:hover::after { opacity: 1; }

.cp-tile-avatar { transition: transform 0.35s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.3s ease; }

.cp-tile:hover .cp-tile-avatar {
  transform: scale(1.12) rotate(-5deg);
  box-shadow: 0 10px 22px -6px color-mix(in srgb, var(--accent) 65%, transparent);
}

.cp-tile:hover .cp-tile-watermark { opacity: 0.5; transform: scale(1.2) rotate(8deg); }
.cp-tile-watermark { transition: opacity 0.3s ease, transform 0.4s ease; }

.cp-tile-go:hover { transform: translateX(3px); }

@media (prefers-reduced-motion: no-preference) {
  .cp-sun { animation: cp-sun-pulse 6s ease-in-out infinite; }
  .cp-cloud-a { animation: cp-cloud 38s linear infinite; }
  .cp-cloud-b { animation: cp-cloud 56s linear infinite -20s; }
  .cp-cloud-c { animation: cp-cloud 44s linear infinite -8s; }
  .cp-hero-title { animation: cp-shine 8s linear infinite; }
  .cp-hero-icon { animation: cp-float 4s ease-in-out infinite; }
  .cp-panel-icon { animation: cp-float 5s ease-in-out infinite -1s; }
  .cp-hero-art rect[fill='white'],
  .cp-hero-art g rect { animation: cp-twinkle 3.2s ease-in-out infinite; }
  .cp-hero-art g rect:nth-child(3n) { animation-delay: -1s; }
  .cp-hero-art g rect:nth-child(3n + 1) { animation-delay: -2s; }
  .cp-hero-art circle { transform-box: fill-box; transform-origin: 50% 100%; animation: cp-sway 5s ease-in-out infinite; }
  .cp-hero-art circle:nth-of-type(2) { animation-delay: -2.2s; }
  .cp-add-btn::after { animation: cp-btn-sheen 4.5s ease-in-out infinite 1.5s; }
  .cp-tile-go { animation: cp-nudge 3.5s ease-in-out infinite; }
  .cp-tile:nth-child(odd) .cp-tile-go { animation-delay: -1.7s; }
}

@keyframes cp-sun-pulse {
  0%, 100% { transform: scale(1); opacity: 0.8; }
  50% { transform: scale(1.18); opacity: 1; }
}

@keyframes cp-cloud {
  from { transform: translateX(0); }
  to { transform: translateX(1500px); }
}

@keyframes cp-shine {
  to { background-position: -200% 0; }
}

@keyframes cp-float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
}

@keyframes cp-twinkle {
  0%, 100% { opacity: 0.55; }
  50% { opacity: 1; }
}

@keyframes cp-sway {
  0%, 100% { transform: rotate(-2deg); }
  50% { transform: rotate(2deg); }
}

@keyframes cp-btn-sheen {
  0%, 60% { transform: translateX(-150%) skewX(-18deg); }
  100% { transform: translateX(380%) skewX(-18deg); }
}

@keyframes cp-nudge {
  0%, 100% { transform: translateX(0); }
  50% { transform: translateX(2px); }
}
</style>
