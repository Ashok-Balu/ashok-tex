// ── payroll.js ────────────────────────────────────────────────────────────────
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/plugins/axios'

export const usePayrollStore = defineStore('payroll', () => {
  const employees = ref([])
  const payrolls = ref([])
  const payments = ref([])
  const pending = ref([])
  const loading = ref(false)
  const error = ref(null)

  // Get all employees
  async function fetchEmployees() {
    loading.value = true; error.value = null
    try {
      const res = await api.get('/payroll/employees')
      employees.value = res.data.data || []
      return true
    } catch (e) { 
      error.value = e.response?.data?.error || 'Failed to fetch employees'
      return false 
    } finally { 
      loading.value = false 
    }
  }

  // Add new employee
  async function addEmployee(name, deductionPercentage, phone) {
    loading.value = true; error.value = null
    try {
      const res = await api.post('/payroll/employees', { 
        name, deductionPercentage, phone 
      })
      employees.value.push(res.data.data)
      return true
    } catch (e) { 
      error.value = e.response?.data?.error || 'Failed to add employee'
      return false 
    } finally { 
      loading.value = false 
    }
  }

  // Update employee
  async function updateEmployee(id, name, deductionPercentage, phone) {
    loading.value = true; error.value = null
    try {
      const res = await api.put(`/payroll/employees/${id}`, { 
        name, deductionPercentage, phone 
      })
      const idx = employees.value.findIndex(e => e._id === id)
      if (idx !== -1) employees.value[idx] = res.data.data
      return true
    } catch (e) { 
      error.value = e.response?.data?.error || 'Failed to update employee'
      return false 
    } finally { 
      loading.value = false 
    }
  }

  // Delete employee + all related data
  async function removeEmployee(id) {
    loading.value = true; error.value = null
    try {
      await api.delete(`/payroll/employees/${id}`)
      employees.value = employees.value.filter(e => e._id !== id)
      // Refresh pending so dashboard clears stale entries
      const res = await api.get('/payroll/pending')
      pending.value = res.data.data || []
      return true
    } catch (e) {
      error.value = e.response?.data?.error || 'Failed to delete employee'
      return false
    } finally {
      loading.value = false
    }
  }

  // Generate payroll for all employees
  async function generatePayroll(month, year, periodStart, periodEnd, employeeEntries, runTitle = '') {
    loading.value = true; error.value = null
    try {
      const res = await api.post('/payroll/generate', { 
        month, 
        year, 
        periodStart,
        periodEnd,
        employeeEntries,
        runTitle
      })
      payrolls.value.push(res.data.data)
      return res.data.data
    } catch (e) { 
      error.value = e.response?.data?.error || 'Failed to generate payroll'
      return null
    } finally { 
      loading.value = false 
    }
  }

  // Get payroll history for specific month
  async function fetchPayrollHistory(month, year) {
    loading.value = true; error.value = null
    try {
      const res = await api.get(`/payroll/history/${month}/${year}`)
      return res.data.data
    } catch (e) { 
      error.value = e.response?.data?.error || 'Failed to fetch payroll history'
      return null
    } finally { 
      loading.value = false 
    }
  }

  // Get all pending payments
  async function fetchPending() {
    loading.value = true; error.value = null
    try {
      const res = await api.get('/payroll/pending')
      pending.value = res.data.data || []
      return true
    } catch (e) { 
      error.value = e.response?.data?.error || 'Failed to fetch pending payments'
      return false 
    } finally { 
      loading.value = false 
    }
  }

  // Record payment
  async function recordPayment(payrollId, employeeId, amountPaid, paymentMethod, notes) {
    loading.value = true; error.value = null
    try {
      const res = await api.post('/payroll/payment', { 
        payrollId, 
        employeeId, 
        amountPaid, 
        paymentMethod, 
        notes 
      })
      if (res.data?.data?.payment) payments.value.push(res.data.data.payment)
      return true
    } catch (e) { 
      error.value = e.response?.data?.error || 'Failed to record payment'
      return false 
    } finally { 
      loading.value = false 
    }
  }

  async function settleEmployeePayment(employeeId, amountPaid, paymentMethod, notes, upToMonth, upToYear) {
    loading.value = true; error.value = null
    try {
      const res = await api.post('/payroll/payment/settle-total', {
        employeeId,
        amountPaid,
        paymentMethod,
        notes,
        upToMonth,
        upToYear,
      })
      return res.data.data
    } catch (e) {
      error.value = e.response?.data?.error || 'Failed to settle employee payment'
      return null
    } finally {
      loading.value = false
    }
  }

  async function recordDeductionReturn(payrollId, employeeId, amountPaid, paymentMethod, notes) {
    loading.value = true; error.value = null
    try {
      const res = await api.post('/payroll/payment/deduction-return', {
        payrollId,
        employeeId,
        amountPaid,
        paymentMethod,
        notes,
      })
      if (res.data?.data?.payment) payments.value.push(res.data.data.payment)
      return res.data.data
    } catch (e) {
      error.value = e.response?.data?.error || 'Failed to record deduction return'
      return null
    } finally {
      loading.value = false
    }
  }

  // Get payment history for employee
  async function fetchPaymentHistory(employeeId) {
    loading.value = true; error.value = null
    try {
      const res = await api.get(`/payroll/payment-history/${employeeId}`)
      return res.data.data || []
    } catch (e) { 
      error.value = e.response?.data?.error || 'Failed to fetch payment history'
      return [] 
    } finally { 
      loading.value = false 
    }
  }

  // Edit employee row inside generated payroll history
  async function updatePayrollHistoryEntry(payrollId, employeeId, payload) {
    loading.value = true; error.value = null
    try {
      const res = await api.put(`/payroll/history/${payrollId}/employee/${employeeId}`, payload)
      return res.data.data
    } catch (e) {
      error.value = e.response?.data?.error || 'Failed to update payroll history entry'
      return null
    } finally {
      loading.value = false
    }
  }

  // Remove employee row from generated payroll history
  async function removePayrollHistoryEntry(payrollId, employeeId) {
    loading.value = true; error.value = null
    try {
      const res = await api.delete(`/payroll/history/${payrollId}/employee/${employeeId}`)
      return res.data.data
    } catch (e) {
      error.value = e.response?.data?.error || 'Failed to remove payroll history entry'
      return null
    } finally {
      loading.value = false
    }
  }

  async function sendWhatsAppPayslip(employeeId, pdfBase64, fileName, caption) {
    loading.value = true; error.value = null
    try {
      const res = await api.post('/payroll/whatsapp-payslip', {
        employeeId,
        pdfBase64,
        fileName,
        caption,
      })
      return res.data.data
    } catch (e) {
      error.value = e.response?.data?.error || 'Failed to send payslip on WhatsApp'
      return null
    } finally {
      loading.value = false
    }
  }

  // Computed properties
  const employeeCount = computed(() => employees.value.length)
  const totalPending = computed(() => 
    pending.value.reduce((sum, p) => {
      const amount = Number(p.amountPending)
      return sum + (Number.isFinite(amount) ? amount : 0)
    }, 0)
  )

  return {
    // State
    employees, payrolls, payments, pending, loading, error,
    // Computed
    employeeCount, totalPending,
    // Methods
    fetchEmployees, addEmployee, updateEmployee, generatePayroll, 
    fetchPayrollHistory, fetchPending, recordPayment, fetchPaymentHistory,
    removeEmployee, updatePayrollHistoryEntry, removePayrollHistoryEntry,
    sendWhatsAppPayslip, settleEmployeePayment, recordDeductionReturn
  }
})
