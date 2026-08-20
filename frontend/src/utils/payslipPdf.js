import { jsPDF } from 'jspdf'

const MONTH_NAMES = ['', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December']

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

/**
 * Generate payslip PDF from the /salary/payslip API response object.
 * @param {Object} data  - full payslipData object from API
 * @param {string} companyName
 */
export function generatePayslipPdf(data, companyName = 'ASHOK TEX') {
  // Support legacy call: generatePayslipPdf(emp, month, year) where emp has month/year props
  // or new call: generatePayslipPdf(data) where data already has month/year
  if (arguments.length >= 2 && typeof arguments[1] === 'number') {
    // Legacy signature: generatePayslipPdf(emp, month, year)
    const emp = arguments[0]
    const month = arguments[1]
    const year = arguments[2]
    data = { ...emp, month: emp.month || month, year: emp.year || year }
  }
  const emp = data
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
  const W = doc.internal.pageSize.getWidth()
  const H = doc.internal.pageSize.getHeight()
  const ml = 14
  const mr = W - 14
  const CW = mr - ml

  const {
    name = 'Employee',
    month,
    year,
    entries = [],
    totalGross = 0,
    totalDeduction = 0,
    totalFinal = 0,
    totalWages = 0,
    netSalary = 0,
    deductionAmount = 0,
    amountPaid = 0,
    totalPaid = amountPaid,
    totalPending = 0,
    carryForwardPending = 0,
    totalOutstanding = totalPending + carryForwardPending,
    paymentStatus = 'pending',
    deductionFund = {},
  } = emp

  const gross  = totalGross    || totalWages      || 0
  const deduct = totalDeduction || deductionAmount || 0
  const net    = totalFinal    || netSalary        || 0
  const paid   = totalPaid     || amountPaid       || 0
  const balanceThisMonth = Math.max(0, net - paid)

  const sortedEntries = [...entries].sort((a, b) => new Date(a.periodStart) - new Date(b.periodStart))
  const totalDays = sortedEntries.reduce((s, e) => s + (Number(e.daysWorked) || 0), 0)

  // ── Color palette ────────────────────────────────────────────────────────────
  const C = {
    headerBg:  [55,  48, 163],   // indigo-800
    headerText:[255, 255, 255],
    accentLine:[99,  102, 241],  // indigo-400
    darkText:  [15,  23,  42],
    mutedText: [100, 116, 139],
    sectionBg: [51,  65,  85],   // slate-700
    rowAlt:    [248, 250, 252],
    rowBorder: [226, 232, 240],
    green:     [5,   150, 105],
    greenBg:   [240, 253, 244],
    greenBord: [187, 247, 208],
    red:       [220, 38,  38],
    redBg:     [254, 242, 242],
    redBord:   [252, 165, 165],
    amber:     [180, 83,  9],
    amberBg:   [255, 251, 235],
    amberBord: [253, 230, 138],
    blue:      [37,  99,  235],
    blueBg:    [239, 246, 255],
  }

  let y = 0

  // ═══════════════════════════════════════════════════════════════════════
  // HEADER BAND
  // ═══════════════════════════════════════════════════════════════════════
  doc.setFillColor(...C.headerBg)
  doc.rect(0, 0, W, 32, 'F')

  // Subtle accent stripe
  doc.setFillColor(...C.accentLine)
  doc.rect(0, 30, W, 2, 'F')

  // Company name
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(22)
  doc.setTextColor(...C.headerText)
  doc.text(companyName, ml, 14)

  // Sub-label
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(199, 210, 254)  // indigo-200
  doc.text('A U T O L O O M', ml, 21)

  // PAYSLIP badge (right side)
  doc.setFillColor(255, 255, 255)
  doc.roundedRect(mr - 36, 5, 36, 12, 3, 3, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...C.headerBg)
  doc.text('PAYSLIP', mr - 18, 13.2, { align: 'center' })

  // Month label below badge
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(199, 210, 254)
  doc.text(`${MONTH_NAMES[month] || month} ${year}`, mr, 25, { align: 'right' })

  y = 36

  // ═══════════════════════════════════════════════════════════════════════
  // EMPLOYEE INFO STRIP
  // ═══════════════════════════════════════════════════════════════════════
  doc.setFillColor(248, 250, 252)
  doc.rect(0, y, W, 14, 'F')
  doc.setDrawColor(...C.rowBorder)
  doc.line(0, y + 14, W, y + 14)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...C.mutedText)
  doc.text('EMPLOYEE', ml, y + 5.5)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...C.darkText)
  doc.text(String(name), ml, y + 11.5)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...C.mutedText)
  doc.text('PAY PERIOD', W / 2 - 10, y + 5.5)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...C.darkText)
  doc.text(`${MONTH_NAMES[month] || month} ${year}`, W / 2 - 10, y + 11.5)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...C.mutedText)
  doc.text(`Generated: ${fmtDate(new Date())}`, mr, y + 11, { align: 'right' })

  y += 18

  // ═══════════════════════════════════════════════════════════════════════
  // QUICK STAT BOXES  (4 equal boxes)
  // ═══════════════════════════════════════════════════════════════════════
  const boxW = CW / 4
  const boxH = 20
  const stats = [
    { label: 'WEEKS',       val: String(sortedEntries.length),  color: C.darkText, bg: [255,255,255] },
    { label: 'DAYS WORKED', val: String(totalDays),             color: C.darkText, bg: [255,255,255] },
    { label: 'NET SALARY',  val: `Rs.${fmt(net)}`,              color: C.green,    bg: C.greenBg    },
    { label: 'PAID',        val: paid > 0 ? `Rs.${fmt(paid)}` : 'Rs. 0', color: paid > 0 ? C.green : C.mutedText, bg: paid > 0 ? C.greenBg : [255,255,255] },
  ]
  stats.forEach((s, i) => {
    const bx = ml + i * boxW
    doc.setFillColor(...s.bg)
    doc.rect(bx, y, boxW, boxH, 'F')
    doc.setDrawColor(...C.rowBorder)
    doc.rect(bx, y, boxW, boxH)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(13)
    doc.setTextColor(...s.color)
    doc.text(s.val, bx + boxW / 2, y + 10.5, { align: 'center' })
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(...C.mutedText)
    doc.text(s.label, bx + boxW / 2, y + 16.5, { align: 'center' })
  })
  y += boxH

  // ── Outstanding bar (only if pending) ─────────────────────────────────────
  if (totalOutstanding > 0) {
    doc.setFillColor(...C.redBg)
    doc.rect(ml, y, CW, 12, 'F')
    doc.setDrawColor(...C.redBord)
    doc.rect(ml, y, CW, 12)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...C.red)
    const outLabel = carryForwardPending > 0
      ? `This Month: Rs.${fmt(balanceThisMonth)}  +  Carry-forward: Rs.${fmt(carryForwardPending)}  =`
      : 'Balance Pending'
    doc.text(outLabel, ml + 4, y + 7.5)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.text(`Total Outstanding: Rs.${fmt(totalOutstanding)}`, mr - 4, y + 7.5, { align: 'right' })
    y += 12
  }

  y += 4

  // ═══════════════════════════════════════════════════════════════════════
  // SECTION HEADER helper
  // ═══════════════════════════════════════════════════════════════════════
  const sectionHead = (title, iconChar = '') => {
    if (y > H - 55) { doc.addPage(); y = 14 }
    doc.setFillColor(...C.sectionBg)
    doc.rect(ml, y, CW, 7, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.5)
    doc.setTextColor(...C.headerText)
    doc.text((iconChar ? iconChar + '  ' : '') + title, ml + 4, y + 5)
    y += 7
  }

  // ═══════════════════════════════════════════════════════════════════════
  // PERIOD-WISE TABLE
  // ═══════════════════════════════════════════════════════════════════════
  sectionHead('PERIOD-WISE SALARY DETAILS')

  const cols = [
    { label: '#',         x: ml + 4,    w: 8,   align: 'center' },
    { label: 'From',      x: ml + 16,   w: 24,  align: 'left'   },
    { label: 'To',        x: ml + 42,   w: 24,  align: 'left'   },
    { label: 'Days',      x: ml + 68,   w: 14,  align: 'right'  },
    { label: 'Gross',     x: ml + 96,   w: 22,  align: 'right'  },
    { label: 'Deduction', x: ml + 128,  w: 24,  align: 'right'  },
    { label: 'Market',    x: ml + 153,  w: 18,  align: 'right'  },
    { label: 'Final',     x: mr - 3,    w: 20,  align: 'right'  },
  ]

  const drawTableHeader = () => {
    doc.setFillColor(241, 245, 249)
    doc.rect(ml, y, CW, 6, 'F')
    doc.setDrawColor(...C.rowBorder)
    doc.rect(ml, y, CW, 6)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7)
    doc.setTextColor(71, 85, 105)
    cols.forEach(c => doc.text(c.label, c.x, y + 4.1, { align: c.align }))
    y += 6
  }

  drawTableHeader()
  sortedEntries.forEach((entry, idx) => {
    if (y > H - 50) { doc.addPage(); y = 14; drawTableHeader() }
    if (idx % 2 === 1) {
      doc.setFillColor(...C.rowAlt)
      doc.rect(ml, y, CW, 6, 'F')
    }
    doc.setDrawColor(236, 240, 244)
    doc.line(ml, y + 6, ml + CW, y + 6)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...C.darkText)
    doc.text(String(idx + 1),                     cols[0].x, y + 4.2, { align: 'center' })
    doc.text(fmtDate(entry.periodStart),           cols[1].x, y + 4.2)
    doc.text(fmtDate(entry.periodEnd),             cols[2].x, y + 4.2)
    doc.text(String(entry.daysWorked || 0),        cols[3].x, y + 4.2, { align: 'right' })
    doc.text(fmt(entry.grossWages ?? entry.totalWages ?? 0), cols[4].x, y + 4.2, { align: 'right' })
    doc.setTextColor(...C.red)
    doc.text(fmt(entry.deductionAmount ?? 0),      cols[5].x, y + 4.2, { align: 'right' })
    doc.setTextColor(...C.mutedText)
    doc.text(fmt(entry.market ?? 0),               cols[6].x, y + 4.2, { align: 'right' })
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...C.green)
    doc.text(fmt(entry.finalSalary ?? entry.netSalary ?? 0), cols[7].x, y + 4.2, { align: 'right' })
    y += 6
  })

  // Totals row
  doc.setFillColor(219, 234, 254)   // blue-100
  doc.rect(ml, y, CW, 7, 'F')
  doc.setDrawColor(147, 197, 253)
  doc.rect(ml, y, CW, 7)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...C.darkText)
  doc.text('TOTAL', ml + 4, y + 4.8)
  doc.text(String(totalDays), cols[3].x, y + 4.8, { align: 'right' })
  doc.text(fmt(gross),        cols[4].x, y + 4.8, { align: 'right' })
  doc.setTextColor(...C.red)
  doc.text(fmt(deduct),       cols[5].x, y + 4.8, { align: 'right' })
  doc.setTextColor(...C.green)
  doc.text(fmt(net),          cols[7].x, y + 4.8, { align: 'right' })
  y += 7

  y += 5

  // ═══════════════════════════════════════════════════════════════════════
  // PAYMENT SUMMARY  (two-column layout)
  // ═══════════════════════════════════════════════════════════════════════
  sectionHead('PAYMENT SUMMARY')

  const drawRow = (label, value, opts = {}) => {
    const { bold = false, labelColor = C.darkText, valColor = C.darkText, bg = null, rowH = 7 } = opts
    if (bg) { doc.setFillColor(...bg); doc.rect(ml, y, CW, rowH, 'F') }
    doc.setDrawColor(...C.rowBorder)
    doc.line(ml, y + rowH, ml + CW, y + rowH)
    doc.setFont('helvetica', bold ? 'bold' : 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(...labelColor)
    doc.text(label, ml + 4, y + rowH - 2)
    doc.setTextColor(...valColor)
    doc.text(value, mr - 4, y + rowH - 2, { align: 'right' })
    y += rowH
  }

  drawRow('Gross Salary (This Month)',          `Rs. ${fmt(gross)}`)
  drawRow('(-) Deduction  —  Fund Contribution', `Rs. ${fmt(deduct)}`, { labelColor: C.red, valColor: C.red })
  drawRow('= Net Salary This Month',            `Rs. ${fmt(net)}`, { bold: true, valColor: C.green, bg: C.greenBg, rowH: 8 })
  drawRow('Amount Paid (This Month)',           paid > 0 ? `Rs. ${fmt(paid)}` : 'Rs. 0', { valColor: paid > 0 ? C.green : C.mutedText })
  if (balanceThisMonth > 0) {
    drawRow('Balance This Month',               `Rs. ${fmt(balanceThisMonth)}`, { valColor: C.red })
  } else {
    drawRow('Balance This Month',               'Rs. 0  —  Fully Paid', { valColor: C.green })
  }
  if (carryForwardPending > 0) {
    drawRow('(+) Carry-forward (Previous Months)', `Rs. ${fmt(carryForwardPending)}`, { valColor: C.amber, labelColor: C.amber, bg: C.amberBg })
    drawRow('Total Outstanding',                   `Rs. ${fmt(totalOutstanding)}`, { bold: true, valColor: C.red, labelColor: C.red, bg: C.redBg, rowH: 8 })
  }

  y += 5

  // ═══════════════════════════════════════════════════════════════════════
  // DEDUCTION FUND
  // ═══════════════════════════════════════════════════════════════════════
  if (y > H - 55) { doc.addPage(); y = 14 }
  sectionHead('DEDUCTION FUND  (HOLD)')

  const df = deductionFund || {}
  drawRow('Contributed This Month',          `Rs. ${fmt(df.deductedThisMonth ?? deduct)}`, { labelColor: C.amber, valColor: C.amber })
  drawRow('Withdrawn This Month',            `Rs. ${fmt(df.returnedThisMonth ?? 0)}`,      { labelColor: C.blue,  valColor: C.blue  })
  drawRow('Total Accumulated (All-time)',    `Rs. ${fmt(df.totalAccumulated ?? 0)}`)
  drawRow('Total Withdrawn (All-time)',      `Rs. ${fmt(df.totalReturned ?? 0)}`,           { valColor: C.blue })
  drawRow('Available Fund Balance',         `Rs. ${fmt(df.balance ?? 0)}`,                 { bold: true, valColor: C.amber, labelColor: C.amber, bg: C.amberBg, rowH: 8 })

  y += 6

  // ═══════════════════════════════════════════════════════════════════════
  // STATUS BADGE
  // ═══════════════════════════════════════════════════════════════════════
  if (y > H - 22) { doc.addPage(); y = 14 }

  const stColor = paymentStatus === 'paid' ? C.green : paymentStatus === 'partial' ? C.amber : C.red
  const stBg    = paymentStatus === 'paid' ? C.greenBg : paymentStatus === 'partial' ? C.amberBg : C.redBg
  const stLabel = paymentStatus === 'paid' ? '✓  SALARY FULLY PAID' : paymentStatus === 'partial' ? '!  PARTIAL PAYMENT' : '✗  PAYMENT PENDING'

  doc.setFillColor(...stBg)
  doc.roundedRect(ml, y, CW, 10, 3, 3, 'F')
  doc.setDrawColor(...stColor)
  doc.roundedRect(ml, y, CW, 10, 3, 3)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(...stColor)
  doc.text(stLabel, W / 2, y + 6.8, { align: 'center' })

  // ═══════════════════════════════════════════════════════════════════════
  // FOOTER
  // ═══════════════════════════════════════════════════════════════════════
  const footY = H - 12
  doc.setFillColor(...C.headerBg)
  doc.rect(0, footY - 2, W, H - footY + 2, 'F')
  doc.setFillColor(...C.accentLine)
  doc.rect(0, footY - 2, W, 1, 'F')
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(199, 210, 254)
  doc.text(`Generated: ${fmtDate(new Date())}`, ml, footY + 5)
  doc.text('ASHOK TEX AUTOLOOM  —  Computer generated payslip', mr, footY + 5, { align: 'right' })

  return doc
}

/**
 * Download payslip as PDF.
 * Supports:
 *   downloadPayslip(data)               — new API shape (data.month / data.year)
 *   downloadPayslip(emp, month, year)   — legacy shape
 */
export function downloadPayslip(data, legacyMonth, legacyYear) {
  const doc = generatePayslipPdf(data, legacyMonth, legacyYear)
  const month = data.month || legacyMonth
  const year  = data.year  || legacyYear
  const monthLabel = MONTH_NAMES[month] || month
  const empName    = (data.name || 'Employee').replace(/\s+/g, '_')
  doc.save(`Payslip_${empName}_${monthLabel}_${year}.pdf`)
}

export function payslipBlob(data, legacyMonth, legacyYear) {
  return generatePayslipPdf(data, legacyMonth, legacyYear).output('blob')
}

export function payslipDataUri(data, legacyMonth, legacyYear) {
  return generatePayslipPdf(data, legacyMonth, legacyYear).output('datauristring')
}
