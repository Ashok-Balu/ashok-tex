import { useI18n } from 'vue-i18n'

export function useUtils() {
  const { t } = useI18n()

  const fmt  = n => '₹' + Math.round(Number(n || 0)).toLocaleString('en-IN')
  const fmtN = n => Number(n || 0).toLocaleString('en-IN')
  const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'
  const fmtDateShort = d => {
    if (!d) return '-'
    const dt = new Date(d)
    return `${String(dt.getDate()).padStart(2,'0')}/${String(dt.getMonth()+1).padStart(2,'0')}/${dt.getFullYear()}`
  }
  const today = () => new Date().toISOString().split('T')[0]
  const pct   = (a, b) => (!b ? 0 : Math.min(100, Math.round((a / b) * 100)))
  const monthStart = () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0] }

  const expenseTypes = [
    { value: 'diesel_auto', title: t('diesel_auto') },
    { value: 'auto_repair', title: t('auto_repair') },
    { value: 'car_diesel',  title: t('car_diesel') },
    { value: 'car_repair',  title: t('car_repair') },
    { value: 'electricity', title: t('electricity') },
    { value: 'machine_spare', title: t('machine_spare') },
    { value: 'others',     title: t('others') },
  ]

  const paymentModes = [
    { value: 'cash',   title: t('cash') },
    { value: 'cheque', title: t('cheque') },
    { value: 'bank',   title: t('bank') },
  ]

  const shifts = [
    { value: 'morning', title: t('morning') },
    { value: 'night',   title: t('night') },
  ]

  const departments = ['Weaver', 'Cone winding', 'Odi edupakarnaga', 'Maintenance', 'Other']

  const numToWords = (num) => {
    if (!num || num <= 0) return ''
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine']
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']
    const scales = ['', 'Thousand', 'Lakh', 'Crore']
    
    const convertBelowThousand = (n) => {
      if (n === 0) return ''
      else if (n < 10) return ones[n]
      else if (n < 20) return teens[n - 10]
      else if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '')
      else return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + convertBelowThousand(n % 100) : '')
    }
    
    const n = Math.floor(num)
    if (n === 0) return 'Zero'
    
    const parts = []
    let scaleIndex = 0
    let remaining = n
    
    while (remaining > 0) {
      if (scaleIndex === 0) {
        const last3 = remaining % 1000
        if (last3 !== 0) parts.unshift(convertBelowThousand(last3))
        remaining = Math.floor(remaining / 1000)
      } else if (scaleIndex === 1) {
        const last2 = remaining % 100
        if (last2 !== 0) parts.unshift(convertBelowThousand(last2) + ' ' + scales[scaleIndex])
        remaining = Math.floor(remaining / 100)
      } else {
        const last2 = remaining % 100
        if (last2 !== 0) parts.unshift(convertBelowThousand(last2) + ' ' + scales[scaleIndex])
        remaining = Math.floor(remaining / 100)
      }
      scaleIndex++
    }
    
    return parts.join(' ') + ' Rupees'
  }

  return { fmt, fmtN, fmtDate, fmtDateShort, today, pct, monthStart, numToWords, expenseTypes, paymentModes, shifts, departments, t }
}
