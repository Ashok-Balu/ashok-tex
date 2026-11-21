<template>
  <div>
    <PageHeader :title="t('expense')" :sub="t('expenseSub')">
      <v-btn color="primary" prepend-icon="mdi-plus" @click="openDialog()">{{ t('addExpense') }}</v-btn>
    </PageHeader>

    <v-card class="pa-4 mb-4 ex-filter" rounded="lg" variant="outlined">
      <v-row dense align="center">
        <v-col cols="12" sm="6" md="3">
          <v-select v-model="filters.type" :items="typeFilterItems" :label="t('type')" density="compact" variant="outlined" hide-details />
        </v-col>
        <v-col cols="12" sm="6" md="3">
          <v-text-field v-model="filters.from" type="date" :label="t('startDate')" density="compact" variant="outlined" hide-details />
        </v-col>
        <v-col cols="12" sm="6" md="3">
          <v-text-field v-model="filters.to" type="date" :label="t('endDate')" density="compact" variant="outlined" hide-details />
        </v-col>
        <v-col cols="12" md="3" class="text-md-right">
          <div class="ex-total">
            <v-icon size="22" color="white" class="ex-total-icon">mdi-cash-multiple</v-icon>
            <div>
              <div class="ex-total-label">{{ t('total') }}</div>
              <div class="ex-total-value" data-testid="expense-total">{{ fmt(total) }}</div>
            </div>
          </div>
        </v-col>
      </v-row>
    </v-card>

    <v-card rounded="lg" variant="outlined" class="ex-table-card">
      <v-progress-linear v-if="loading" indeterminate color="primary" />
      <v-table density="comfortable" class="ex-table">
        <thead>
          <tr>
            <th>{{ t('date') }}</th>
            <th>{{ t('expenseType') }}</th>
            <th>{{ t('notes') }}</th>
            <th class="text-right">{{ t('amount') }}</th>
            <th class="text-right">{{ t('actions') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row._id">
            <td>{{ fmtDate(row.date) }}</td>
            <td><v-chip size="small" variant="tonal" color="primary" label>{{ typeLabel(row) }}</v-chip></td>
            <td>{{ row.notes || '-' }}</td>
            <td class="text-right">{{ fmt(row.amount) }}</td>
            <td class="text-right">
              <v-btn icon="mdi-pencil" size="small" variant="text" :aria-label="t('edit')" @click="openDialog(row)" />
              <v-btn icon="mdi-delete" size="small" variant="text" color="error" :aria-label="t('delete')" @click="remove(row)" />
            </td>
          </tr>
          <tr v-if="!loading && !rows.length">
            <td colspan="5" class="text-center text-medium-emphasis py-6">{{ t('noData') }}</td>
          </tr>
        </tbody>
      </v-table>
    </v-card>

    <v-dialog v-model="dialog" max-width="480" persistent>
      <v-card rounded="lg">
        <v-card-title>{{ editId ? t('editExpense') : t('addExpense') }}</v-card-title>
        <v-card-text>
          <v-form ref="formRef" @submit.prevent="save">
            <v-select v-model="form.type" :items="typeItems" :label="t('expenseType')" variant="outlined" density="compact" :rules="[rules.required()]" />
            <v-text-field v-if="form.type === 'others'" v-model="form.customType" :label="t('expenseCustomType')" variant="outlined" density="compact" :rules="[rules.maxLength(60)]" />
            <IndianCurrencyField v-model="form.amount" :label="t('amount')" hide-details="auto" />
            <v-text-field v-model="form.date" type="date" :label="t('date')" variant="outlined" density="compact" class="mt-3" :rules="[rules.required()]" />
            <v-textarea v-model="form.notes" :label="t('notes')" variant="outlined" density="compact" rows="2" auto-grow :rules="[rules.maxLength(200)]" />
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" :disabled="saving" @click="dialog = false">{{ t('cancel') }}</v-btn>
          <v-btn color="primary" variant="flat" :loading="saving" @click="save">{{ t('save') }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import api from '@/plugins/axios'
import PageHeader from '@/components/common/PageHeader.vue'
import IndianCurrencyField from '@/components/common/IndianCurrencyField.vue'
import { useNotify } from '@/composables/useNotify'
import { useConfirm } from '@/composables/useConfirm'
import { useUtils } from '@/composables/useUtils'
import { useValidation } from '@/composables/useValidation'

const { t } = useI18n()
const notify = useNotify()
const { confirm } = useConfirm()
const { fmt, fmtDate, today } = useUtils()
const rules = useValidation()

const TYPES = ['diesel_auto', 'auto_repair', 'car_diesel', 'car_repair', 'electricity', 'machine_spare', 'others']
const typeItems = computed(() => TYPES.map(value => ({ value, title: t(value) })))
const typeFilterItems = computed(() => [{ value: '', title: t('allTypes') }, ...typeItems.value])

const rows = ref([])
const loading = ref(false)
const filters = ref({ type: '', from: '', to: '' })
const total = computed(() => rows.value.reduce((s, r) => s + Number(r.amount || 0), 0))

const dialog = ref(false)
const saving = ref(false)
const editId = ref(null)
const formRef = ref()
const blankForm = () => ({ type: 'electricity', customType: '', amount: 0, date: today(), notes: '' })
const form = ref(blankForm())

const typeLabel = row => (row.type === 'others' && row.customType ? row.customType : t(row.type))

async function load() {
  loading.value = true
  try {
    const params = {}
    if (filters.value.type) params.type = filters.value.type
    if (filters.value.from) params.from = filters.value.from
    if (filters.value.to) params.to = filters.value.to
    rows.value = (await api.get('/expenses', { params })).data
  } catch (e) {
    notify.apiError(e, t('expenseLoadFailed'))
  } finally {
    loading.value = false
  }
}

function openDialog(row = null) {
  editId.value = row?._id || null
  form.value = row
    ? { type: row.type, customType: row.customType || '', amount: Number(row.amount || 0), date: String(row.date).slice(0, 10), notes: row.notes || '' }
    : blankForm()
  dialog.value = true
}

async function save() {
  const { valid } = await formRef.value.validate()
  if (!valid) return
  if (!(Number(form.value.amount) > 0)) return notify.warning(t('expenseEnterAmount'))
  saving.value = true
  try {
    const payload = { ...form.value, amount: Number(form.value.amount), customType: form.value.type === 'others' ? form.value.customType : '' }
    editId.value ? await api.put(`/expenses/${editId.value}`, payload) : await api.post('/expenses', payload)
    dialog.value = false
    notify.success(t('expenseSaved'))
    await load()
  } catch (e) {
    notify.apiError(e, t('expenseSaveFailed'))
  } finally {
    saving.value = false
  }
}

async function remove(row) {
  if (!(await confirm(t('expenseDeleteMsg')))) return
  try {
    await api.delete(`/expenses/${row._id}`)
    notify.success(t('expenseDeleted'))
    await load()
  } catch (e) {
    notify.apiError(e, t('expenseDeleteFailed'))
  }
}

watch(filters, load, { deep: true })
onMounted(load)
</script>

<style scoped>
.ex-filter {
  background: linear-gradient(120deg, #ffffff, #f4f8ff) !important;
  border-radius: 18px !important;
}

.ex-total {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  padding: 8px 16px 8px 12px;
  border-radius: 14px;
  text-align: left;
  background: linear-gradient(135deg, #1565c0, #3b82f6);
  box-shadow: 0 12px 24px -12px rgba(21, 101, 192, 0.7);
}

.ex-total-icon {
  width: 38px;
  height: 38px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.18);
}

.ex-total-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.78);
}

.ex-total-value {
  font-size: 20px;
  font-weight: 800;
  color: #fff;
  line-height: 1.1;
}

.ex-table-card {
  border-radius: 18px !important;
  overflow: hidden;
}

.ex-table :deep(thead th) {
  background: linear-gradient(180deg, #f8fafc, #f1f5f9);
  font-weight: 700;
  letter-spacing: 0.3px;
}

@media (prefers-reduced-motion: no-preference) {
  .ex-table :deep(tbody tr) { animation: ex-row-in 0.4s ease backwards; }
  .ex-table :deep(tbody tr:nth-child(2)) { animation-delay: 0.04s; }
  .ex-table :deep(tbody tr:nth-child(3)) { animation-delay: 0.08s; }
  .ex-table :deep(tbody tr:nth-child(4)) { animation-delay: 0.12s; }
  .ex-table :deep(tbody tr:nth-child(5)) { animation-delay: 0.16s; }
  .ex-table :deep(tbody tr:nth-child(n + 6)) { animation-delay: 0.2s; }
}

@keyframes ex-row-in {
  from { opacity: 0; transform: translateX(-12px); }
  to { opacity: 1; transform: none; }
}

@media (max-width: 767px) {
  .ex-total { width: 100%; }
}
</style>
