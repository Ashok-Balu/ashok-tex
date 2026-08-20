<template>
  <div class="dashboard">
    <v-row class="mb-4">
      <v-col cols="12" sm="6" md="3">
        <StatCard 
          title="Total Employees" 
          :value="store.employeeCount" 
          icon="mdi-account-multiple"
          color="primary"
        />
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <StatCard 
          title="Pending Payments" 
          :value="`₹${formatNumber(store.totalPending)}`" 
          icon="mdi-clock-outline"
          color="warning"
        />
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <StatCard 
          title="Paid This Month" 
          :value="`₹${currentMonthPaid}`" 
          icon="mdi-check-circle"
          color="success"
        />
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <StatCard 
          title="Total Payroll" 
          :value="`₹${totalPayroll}`" 
          icon="mdi-currency-inr"
          color="info"
        />
      </v-col>
    </v-row>

    <!-- Quick Actions -->
    <v-card class="mb-4">
      <v-card-title>Quick Actions</v-card-title>
      <v-card-text>
        <div class="actions-grid">
          <v-btn 
            prepend-icon="mdi-plus" 
            variant="outlined" 
            color="primary"
            text="Add Employee"
            @click="goToEmployees"
          />
          <v-btn 
            prepend-icon="mdi-play" 
            variant="outlined" 
            color="success"
            text="Generate Salary (1 min!)"
            @click="goToGenerate"
          />
          <v-btn 
            prepend-icon="mdi-history" 
            variant="outlined" 
            color="info"
            text="View History"
            @click="goToHistory"
          />
        </div>
      </v-card-text>
    </v-card>

    <!-- Pending Payments Summary -->
    <v-card v-if="store.pending.length > 0">
      <v-card-title>Pending Payments Summary</v-card-title>
      <v-data-table
        :headers="pendingHeaders"
        :items="safePendingItems"
        item-value="_rowKey"
        :items-per-page="5"
        class="elevation-0"
      >
        <template v-slot:item.amountPending="{ item }">
          <strong>₹{{ formatNumber(item.amountPending) }}</strong>
        </template>
      </v-data-table>
    </v-card>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import StatCard from '@/components/common/StatCard.vue'
import { usePayrollStore } from '@/stores/payroll'

const store = usePayrollStore()

const monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December']

const pendingHeaders = [
  { title: 'Employee', key: 'name' },
  { title: 'Month/Year', key: 'monthYear' },
  { title: 'Pending Amount', key: 'amountPending' }
]

const safePendingItems = computed(() => {
  return store.pending
    .map((item, index) => ({
      ...item,
      _rowKey: item?._id || `${item?.employeeId || item?.name || 'pending'}-${item?.month || 'm'}-${item?.year || 'y'}-${index}`,
      name: item?.name || 'Unknown',
      monthYear: `${monthNames[item.month] || item.month} ${item.year}`,
      amountPending: Number.isFinite(Number(item?.amountPending)) ? Number(item.amountPending) : 0
    }))
    .filter(item => item.amountPending > 0)
})

const currentMonthPaid = computed(() => {
  const now = new Date()
  const currentMonth = now.getMonth() + 1
  const currentYear = now.getFullYear()
  
  const monthPayrolls = store.payrolls.filter(p => 
    p.month === currentMonth && p.year === currentYear
  )
  
  return monthPayrolls.reduce((sum, p) => 
    sum + p.employees.reduce((empSum, e) => empSum + e.amountPaid, 0), 0
  )
})

const totalPayroll = computed(() => {
  return store.payrolls.reduce((sum, p) => 
    sum + p.employees.reduce((empSum, e) => empSum + e.netSalary, 0), 0
  )
})

const formatNumber = (num) => {
  const n = Number(num)
  return new Intl.NumberFormat('en-IN').format(Number.isFinite(n) ? Math.round(n) : 0)
}

const goToEmployees = () => {
  // Emit event to parent to change tab
  const event = new CustomEvent('tab-change', { detail: 'employees' })
  window.dispatchEvent(event)
}

const goToGenerate = () => {
  const event = new CustomEvent('tab-change', { detail: 'generate' })
  window.dispatchEvent(event)
}

const goToHistory = () => {
  const event = new CustomEvent('tab-change', { detail: 'history' })
  window.dispatchEvent(event)
}
</script>

<style scoped>
.actions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px;
}

@media (max-width: 768px) {
  .actions-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .dashboard :deep(.v-data-table__wrapper) {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }
  .dashboard :deep(.v-card-title) {
    font-size: 16px;
    padding: 12px 16px;
  }
}

@media (max-width: 480px) {
  .actions-grid {
    grid-template-columns: 1fr;
    gap: 8px;
  }
  .dashboard :deep(.v-data-table) {
    font-size: 12px;
  }
}
</style>
