<template>
  <div class="payroll-container">
    <PageHeader title="Payroll Management" description="Simple 1-minute employee salary generation" />

      <!-- Tabs -->
      <v-tabs v-model="activeTab" class="mb-4">
        <v-tab value="dashboard" text="Dashboard" />
        <v-tab value="employees" text="Employees" />
        <v-tab value="generate" text="Generate Salary" />
        <v-tab value="history" text="Salary Run" />
      </v-tabs>

    <!-- Tab Content -->
    <v-tabs-window v-model="activeTab">
      <!-- Dashboard Tab -->
      <v-tabs-window-item value="dashboard">
        <PayrollDashboard />
      </v-tabs-window-item>

      <!-- Employees Tab -->
      <v-tabs-window-item value="employees">
        <PayrollEmployees />
      </v-tabs-window-item>

      <!-- Generate Payroll Tab -->
      <v-tabs-window-item value="generate">
        <PayrollGenerator />
      </v-tabs-window-item>

      <!-- History Tab -->
      <v-tabs-window-item value="history">
        <PayrollHistory />
      </v-tabs-window-item>
    </v-tabs-window>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import PageHeader from '@/components/common/PageHeader.vue'
import PayrollDashboard from './PayrollDashboard.vue'
import PayrollEmployees from './PayrollEmployees.vue'
import PayrollGenerator from './PayrollGenerator.vue'
import PayrollHistory from './PayrollHistory.vue'
import { usePayrollStore } from '@/stores/payroll'

const activeTab = ref('dashboard')
const store = usePayrollStore()

// When the Salary Run tab becomes active, tell PayrollHistory to refresh
watch(activeTab, (tab) => {
  if (tab === 'history') {
    window.dispatchEvent(new CustomEvent('payroll-refresh-history'))
  }
})

function handleTabChange(event) {
  const tab = event?.detail
  if (!tab) return

  // Keep backward compatibility with any older event values.
  if (tab === 'summary') {
    activeTab.value = 'history'
    return
  }

  const allowedTabs = ['dashboard', 'employees', 'generate', 'history']
  if (allowedTabs.includes(tab)) {
    activeTab.value = tab
  }
}

onMounted(async () => {
  window.addEventListener('tab-change', handleTabChange)
  await store.fetchEmployees()
  await store.fetchPending()
})

onBeforeUnmount(() => {
  window.removeEventListener('tab-change', handleTabChange)
})
</script>

<style scoped>
.payroll-container {
  padding: 20px;
}
</style>
