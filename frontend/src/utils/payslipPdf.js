import { jsPDF } from 'jspdf'

const MONTH_NAMES = ['', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December']

const RS = 'Rs.'

function fmt(num) {
  const n = Math.round(Number(num) || 0)
  return new Intl.NumberFormat('en-IN').format(n)
}

function fmtDate(date) {
  if (!date) return '-'
  const d = new Date(date)
  const day = String(d.getDate()).padStart(2, '0')
  const mon = MONTH_NAMES[d.getMonth() + 1].slice(0, 3).toUpperCase()
  return `${day}-${mon}-${d.getFullYear()}`
}

export function generatePayslipPdf(emp, month, year, companyName = 'ASHOK TEX') {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
  const W = doc.internal.pageSize.getWidth()
  const H = doc.internal.pageSize.getHeight()
  const ml = 12
  const mr = W - 12
  const CW = mr - ml

  const entries = Array.isArray(emp.entries) ? [...emp.entries] : []
  entries.sort((a, b) => new Date(a.periodStart) - new Date(b.periodStart))

  const totalGross = Number(emp.totalWages) || 0
  const totalDeduction = Number(emp.deductionAmount) || 0
  const totalNet = Number(emp.netSalary) || 0
  const totalPaid = Number(emp.amountPaid) || 0
  const carryForwardPending = Number(emp.carryForwardPending) || 0
  const deductionReturned = Number(emp.deductionReturned) || 0
  const totalOutstanding = Number(emp.amountPending) || 0

  doc.setFillColor(255, 255, 255)
  doc.rect(0, 0, W, H, 'F')
  doc.setDrawColor(30, 30, 30)
  doc.setLineWidth(0.4)
  doc.rect(6, 6, W - 12, H - 12)

  let y = 16
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.setTextColor(20, 20, 20)
  doc.text(companyName, ml, y)
  doc.setFontSize(16)
  doc.text('PAYSLIP', mr, y, { align: 'right' })

  y += 6
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(80, 80, 80)
  doc.text('AUTOLOOM', ml, y)
  doc.text(`${MONTH_NAMES[month] || month} ${year}`, mr, y, { align: 'right' })

  y += 6
  doc.setDrawColor(40, 40, 40)
  doc.line(ml, y, mr, y)

  y += 8
  const labelX = ml
  const valueX = ml + 42
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(70, 70, 70)
  doc.text('Employee Name', labelX, y)
  doc.text(':', valueX - 3, y)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(20, 20, 20)
  doc.text(emp.name || '-', valueX, y)

  y += 6
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(70, 70, 70)
  doc.text('Month', labelX, y)
  doc.text(':', valueX - 3, y)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(20, 20, 20)
  doc.text(`${MONTH_NAMES[month] || month} ${year}`, valueX, y)

  y += 10
  doc.setFillColor(238, 238, 238)
  doc.rect(ml, y, CW, 8, 'F')
  doc.setDrawColor(150, 150, 150)
  doc.rect(ml, y, CW, 8)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text('PERIOD-WISE SALARY DETAILS', ml + 3, y + 5.3)
  y += 8

  const columns = [
    { label: 'From', x: ml + 2, align: 'left' },
    { label: 'To', x: ml + 24, align: 'left' },
    { label: 'Days', x: ml + 52, align: 'right' },
    { label: 'Wage/Day', x: ml + 80, align: 'right' },
    { label: 'Gross', x: ml + 112, align: 'right' },
    { label: 'Deduction', x: ml + 145, align: 'right' },
    { label: 'Net', x: mr - 3, align: 'right' }
  ]

  const drawTableHeader = () => {
    doc.setFillColor(245, 245, 245)
    doc.rect(ml, y, CW, 7, 'F')
    doc.setDrawColor(190, 190, 190)
    doc.rect(ml, y, CW, 7)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(50, 50, 50)
    columns.forEach(col => doc.text(col.label, col.x, y + 4.7, { align: col.align }))
    y += 7
  }

  const drawRow = (entry, alternate) => {
    if (alternate) {
      doc.setFillColor(250, 250, 250)
      doc.rect(ml, y, CW, 7, 'F')
    }
    doc.setDrawColor(220, 220, 220)
    doc.rect(ml, y, CW, 7)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(30, 30, 30)
    doc.text(fmtDate(entry.periodStart), columns[0].x, y + 4.8)
    doc.text(fmtDate(entry.periodEnd), columns[1].x, y + 4.8)
    doc.text(String(Number(entry.daysWorked) || 0), columns[2].x, y + 4.8, { align: 'right' })
    doc.text(`${RS} ${fmt(entry.dailyWage)}`, columns[3].x, y + 4.8, { align: 'right' })
    doc.text(`${RS} ${fmt(entry.totalWages)}`, columns[4].x, y + 4.8, { align: 'right' })
    doc.text(`${RS} ${fmt(entry.deductionAmount)}`, columns[5].x, y + 4.8, { align: 'right' })
    doc.text(`${RS} ${fmt(entry.netSalary)}`, columns[6].x, y + 4.8, { align: 'right' })
    y += 7
  }

  drawTableHeader()
  entries.forEach((entry, index) => {
    if (y > H - 45) {
      doc.addPage()
      y = 16
      drawTableHeader()
    }
    drawRow(entry, index % 2 === 1)
  })

  y += 6
  doc.setFillColor(238, 238, 238)
  doc.rect(ml, y, CW, 8, 'F')
  doc.setDrawColor(150, 150, 150)
  doc.rect(ml, y, CW, 8)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text('SUMMARY', ml + 3, y + 5.3)
  y += 8

  const summaryRows = [
    ['Carry Forward Pending', `${RS} ${fmt(carryForwardPending)}`],
    ['Gross Salary', `${RS} ${fmt(totalGross)}`],
    ['Deduction Amount', `${RS} ${fmt(totalDeduction)}`],
    ['Net Salary', `${RS} ${fmt(totalNet)}`],
    ['Salary Paid', `${RS} ${fmt(totalPaid)}`],
    ['Deduction Returned', `${RS} ${fmt(deductionReturned)}`],
    ['Closing Pending', `${RS} ${fmt(totalOutstanding)}`]
  ]

  summaryRows.forEach((row, index) => {
    if (index % 2 === 1) {
      doc.setFillColor(250, 250, 250)
      doc.rect(ml, y, CW, 7, 'F')
    }
    doc.setDrawColor(220, 220, 220)
    doc.rect(ml, y, CW, 7)
    doc.setFont('helvetica', index === summaryRows.length - 1 ? 'bold' : 'normal')
    doc.setFontSize(9)
    doc.setTextColor(30, 30, 30)
    doc.text(row[0], ml + 3, y + 4.8)
    doc.text(row[1], mr - 3, y + 4.8, { align: 'right' })
    y += 7
  })

  y += 6
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text(
    emp.paymentStatus === 'paid' ? 'STATUS : FULLY PAID' :
      emp.paymentStatus === 'partial' ? 'STATUS : PARTIAL PAYMENT' :
        'STATUS : PAYMENT PENDING',
    ml,
    y
  )

  const footY = H - 14
  doc.setDrawColor(35, 35, 35)
  doc.line(ml, footY, mr, footY)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(85, 85, 85)
  doc.text(`Generated on: ${fmtDate(new Date())}`, ml, footY + 4.5)
  doc.text('Computer generated payslip.', mr, footY + 4.5, { align: 'right' })

  return doc
}

export function downloadPayslip(emp, month, year) {
  const doc = generatePayslipPdf(emp, month, year)
  const monthName = MONTH_NAMES[month] || month
  doc.save(`Payslip_${(emp.name || 'Employee').replace(/\s+/g, '_')}_${monthName}_${year}.pdf`)
}

export function payslipBlob(emp, month, year) {
  return generatePayslipPdf(emp, month, year).output('blob')
}
