<template>
  <div class="payments">
    <!-- Record Payment Form -->
    <v-card class="mb-4">
      <v-card-title>Record Payment</v-card-title>
      <v-card-text>
        <v-row>
          <v-col cols="12" md="6">
            <v-select 
              v-model="paymentForm.payrollId" 
              :items="paymentOptions" 
              label="Select Payroll (Month/Year)" 
              variant="outlined"
              item-title="label"
              item-value="value"
              @update:modelValue="onPayrollChange"
            />
          </v-col>
          <v-col cols="12" md="6">
            <v-select 
              v-model="paymentForm.employeeId" 
              :items="employeeOptions" 
              label="Select Employee" 
              variant="outlined"
              item-title="label"
              item-value="value"
              @update:modelValue="onEmployeeChange"
            />
          </v-col>
          
          <!-- Display Details -->
          <v-col cols="12" v-if="selectedPaymentData">
            <v-card elevation="1" class="mb-4">
              <v-card-text>
                <v-row>
                  <v-col cols="12" sm="6">
                    <div class="label">Net Salary</div>
                    <div class="value">₹{{ formatNumber(selectedPaymentData.netSalary) }}</div>
                  </v-col>
                  <v-col cols="12" sm="6">
                    <div class="label">Already Paid</div>
                    <div class="value">₹{{ formatNumber(selectedPaymentData.amountPaid) }}</div>
                  </v-col>
                  <v-col cols="12" sm="6">
                    <div class="label">Pending Amount</div>
                    <div class="value pending">₹{{ formatNumber(selectedPaymentData.amountPending) }}</div>
                  </v-col>
                  <v-col cols="12" sm="6">
                    <div class="label">Payment Status</div>
                    <v-chip 
                      :color="statusColor(selectedPaymentData.paymentStatus)"
                      :text="selectedPaymentData.paymentStatus"
                    />
                  </v-col>
                </v-row>
              </v-card-text>
            </v-card>
          </v-col>

          <v-col cols="12" md="6">
            <v-text-field 
              v-model.number="paymentForm.amountPaid" 
              label="Amount to Pay (₹)" 
              type="number" 
              variant="outlined"
              :max="selectedPaymentData?.amountPending || 0"
            />
          </v-col>
          <v-col cols="12" md="6">
            <v-select 
              v-model="paymentForm.paymentMethod" 
              :items="['cash', 'transfer', 'check', 'other']" 
              label="Payment Method" 
              variant="outlined"
            />
          </v-col>
          <v-col cols="12">
            <v-text-field 
              v-model="paymentForm.notes" 
              label="Notes (optional)" 
              variant="outlined"
            />
          </v-col>
          <v-col cols="12">
            <v-btn 
              color="success" 
              prepend-icon="mdi-cash-plus"
              :loading="store.loading"
              @click="recordPayment"
              :disabled="!paymentForm.payrollId || !paymentForm.employeeId || !paymentForm.amountPaid"
            >
              Record Payment
            </v-btn>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- Success Message -->
    <v-alert v-if="successMessage" type="success" class="mb-4" closable>
      ✅ {{ successMessage }}
    </v-alert>

    <!-- Error Message -->
    <v-alert v-if="store.error" type="error" class="mb-4" closable>
      {{ store.error }}
    </v-alert>

  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { usePayrollStore } from '@/stores/payroll'

const store = usePayrollStore()

const paymentForm = reactive({
  payrollId: '',
  employeeId: '',
  amountPaid: 0,
  paymentMethod: 'cash',
  notes: ''
})

const successMessage = ref('')
const selectedPaymentData = ref(null)

const formatNumber = (num) => {
  return new Intl.NumberFormat('en-IN').format(Math.round(num))
}

const statusColor = (status) => {
  const colors = {
    'pending': 'warning',
    'partial': 'info',
    'paid': 'success'
  }
  return colors[status] || 'default'
}

const paymentOptions = computed(() => {
  if (!store.payrolls || store.payrolls.length === 0) {
    return []
  }
  return store.payrolls.map(p => ({
    label: `${p.month}/${p.year}`,
    value: p._id
  }))
})

const employeeOptions = computed(() => {
  if (!paymentForm.payrollId) return []
  
  const payroll = store.payrolls.find(p => p._id === paymentForm.payrollId)
  if (!payroll) return []
  
  return payroll.employees.map(e => ({
    label: `${e.name} (Pending: ₹${formatNumber(e.amountPending)})`,
    value: e.employeeId
  }))
})

const onPayrollChange = () => {
  paymentForm.employeeId = ''
  selectedPaymentData.value = null
}

const onEmployeeChange = () => {
  if (!paymentForm.payrollId || !paymentForm.employeeId) return
  
  const payroll = store.payrolls.find(p => p._id === paymentForm.payrollId)
  const emp = payroll?.employees.find(e => e.employeeId === paymentForm.employeeId)
  
  if (emp) {
    selectedPaymentData.value = emp
    paymentForm.amountPaid = 0
  }
}

const recordPayment = async () => {
  const success = await store.recordPayment(
    paymentForm.payrollId,
    paymentForm.employeeId,
    paymentForm.amountPaid,
    paymentForm.paymentMethod,
    paymentForm.notes
  )

  if (success) {
    successMessage.value = `Payment of ₹${formatNumber(paymentForm.amountPaid)} recorded successfully!`
    
    // Reset form
    paymentForm.payrollId = ''
    paymentForm.employeeId = ''
    paymentForm.amountPaid = 0
    paymentForm.notes = ''
    selectedPaymentData.value = null
    
    // Refresh pending
    await store.fetchPending()

    // Clear message after 5 seconds
    setTimeout(() => {
      successMessage.value = ''
    }, 5000)
  }
}
</script>

<style scoped>
.label {
  font-size: 12px;
  color: #666;
  text-transform: uppercase;
  font-weight: 600;
  margin-bottom: 4px;
}

.value {
  font-size: 18px;
  font-weight: bold;
  color: #1976d2;
}

.value.pending {
  color: #d32f2f;
}

/* ══ Responsive ════════════════════════════════════════════════════════════════ */
@media (max-width: 768px) {
  .value { font-size: 16px; }
  .payments :deep(.v-card-text) { padding: 12px; }
}

@media (max-width: 480px) {
  .value { font-size: 14px; }
}
</style>
