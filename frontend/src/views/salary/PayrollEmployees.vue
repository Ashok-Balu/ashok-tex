<template>
  <div class="employees">
    <v-card class="mb-4">
      <v-card-title>Add New Employee</v-card-title>
      <v-card-text>
        <v-form @submit.prevent="addNewEmployee">
          <v-row>
            <v-col cols="12" md="4">
              <v-text-field 
                v-model="form.name" 
                label="Employee Name" 
                required 
                variant="outlined"
              />
            </v-col>
            <v-col cols="12" md="4">
              <v-text-field 
                v-model="form.phone" 
                label="WhatsApp Phone No."
                placeholder="919876543210"
                variant="outlined"
              />
            </v-col>
            <v-col cols="12" md="4">
              <v-text-field 
                v-model.number="form.deductionPercentage" 
                label="Deduction %" 
                type="number" 
                required 
                suffix="%"
                variant="outlined"
              />
            </v-col>
            <v-col cols="12">
              <v-btn 
                type="submit" 
                color="success" 
                prepend-icon="mdi-plus"
                :loading="store.loading"
                text="Add Employee"
              />
            </v-col>
          </v-row>
        </v-form>
      </v-card-text>
    </v-card>

    <!-- Error Message -->
    <v-alert v-if="store.error" type="error" class="mb-4">
      {{ store.error }}
    </v-alert>

    <!-- Employees List -->
    <v-card>
      <v-card-title>Employees List ({{ store.employees.length }})</v-card-title>
      <v-data-table
        :headers="headers"
        :items="safeEmployees"
        item-value="_rowKey"
        :items-per-page="10"
      >
        <template v-slot:item.name="{ item }">
          <div class="d-flex align-center" style="gap:12px;padding:4px 0">
            <div class="tex-av-3d" :style="{ width:'42px', height:'42px', backgroundColor: nameColor(item.name), fontSize:'14px' }">
              {{ nameInitials(item.name) }}
            </div>
            <span style="font-weight:600">{{ item.name }}</span>
          </div>
        </template>
        <template v-slot:item.deductionPercentage="{ item }">
          {{ item.deductionPercentage }}%
        </template>
        <template v-slot:item.status="{ item }">
          <v-chip 
            :color="item.status === 'active' ? 'green' : 'red'" 
            :text="item.status"
          />
        </template>
        <template v-slot:item.actions="{ item }">
          <div class="d-flex">
            <v-btn 
              size="small" 
              variant="text" 
              icon="mdi-pencil"
              @click="editEmployee(item)"
            />
            <v-btn 
              size="small" 
              variant="text" 
              icon="mdi-delete"
              color="error"
              @click="deleteEmployee(item)"
            />
          </div>
        </template>
      </v-data-table>
    </v-card>

    <!-- Edit Dialog -->
    <v-dialog v-model="editDialog" max-width="500">
      <v-card>
        <v-card-title>Edit Employee</v-card-title>
        <v-card-text>
          <v-form @submit.prevent="saveEmployee">
            <v-text-field 
              v-model="editForm.name" 
              label="Employee Name" 
              variant="outlined"
              class="mb-3"
            />
            <v-text-field 
              v-model="editForm.phone"
              label="WhatsApp Phone No."
              placeholder="919876543210"
              variant="outlined"
              class="mb-3"
            />
            <v-text-field 
              v-model.number="editForm.deductionPercentage" 
              label="Deduction %" 
              type="number" 
              suffix="%"
              variant="outlined"
            />
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-btn text="Cancel" @click="editDialog = false" />
          <v-btn 
            color="primary" 
            @click="saveEmployee"
            :loading="store.loading"
            text="Save"
          />
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { usePayrollStore } from '@/stores/payroll'
import { useConfirm } from '@/composables/useConfirm'

const store = usePayrollStore()
const { confirm } = useConfirm()

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

const headers = [
  { title: 'Name', key: 'name' },
  { title: 'Phone', key: 'phone' },
  { title: 'Deduction', key: 'deductionPercentage' },
  { title: 'Status', key: 'status' },
  { title: 'Actions', key: 'actions', sortable: false }
]

const safeEmployees = computed(() =>
  (store.employees || []).map((employee, index) => ({
    ...employee,
    _rowKey: employee?._id || employee?.employeeId || `${employee?.name || 'employee'}-${index}`
  }))
)

const form = reactive({
  name: '',
  phone: '',
  deductionPercentage: 20
})

const editDialog = ref(false)
const editForm = reactive({
  id: '',
  name: '',
  phone: '',
  deductionPercentage: 0
})

const formatNumber = (num) => {
  return new Intl.NumberFormat('en-IN').format(num)
}

const addNewEmployee = async () => {
  if (form.name && form.deductionPercentage >= 0) {
    const success = await store.addEmployee(
      form.name,
      form.deductionPercentage,
      form.phone
    )
    if (success) {
      form.name = ''
      form.phone = ''
      form.deductionPercentage = 20
    }
  }
}

const editEmployee = (employee) => {
  editForm.id = employee._id
  editForm.name = employee.name
  editForm.phone = employee.phone || ''
  editForm.deductionPercentage = employee.deductionPercentage
  editDialog.value = true
}

const saveEmployee = async () => {
  await store.updateEmployee(
    editForm.id,
    editForm.name,
    editForm.deductionPercentage,
    editForm.phone
  )
  editDialog.value = false
}

const deleteEmployee = async (employee) => {
  const ok = await confirm(`Delete ${employee.name}? This will permanently remove all their salary records and payment history.`)
  if (!ok) return
  await store.removeEmployee(employee._id)
}
</script>

<style scoped>
@media (max-width: 768px) {
  .employees :deep(.v-data-table) {
    font-size: 13px;
  }
  .employees :deep(.v-data-table__wrapper) {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }
  .employees :deep(.v-card-title) {
    font-size: 16px;
    padding: 12px 16px;
  }
  .employees :deep(.v-card-actions) {
    flex-wrap: wrap;
    gap: 8px;
  }
}

@media (max-width: 480px) {
  .employees :deep(.v-data-table) {
    font-size: 12px;
  }
  .employees :deep(.v-data-table th),
  .employees :deep(.v-data-table td) {
    padding: 8px 10px !important;
  }
  .employees :deep(.v-btn) {
    font-size: 12px;
  }
}
</style>

