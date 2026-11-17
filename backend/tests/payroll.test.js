const { test, before, after, describe } = require('node:test')
const assert = require('node:assert/strict')
const { startServer, OID } = require('./helpers')

describe('salary runs, employees, payments (routes used by the Payroll screen)', () => {
  let s, admin
  const A = (m, p, body) => s.request(m, '/salary' + p, { token: admin, body })
  const P = (m, p, body) => s.request(m, '/payroll' + p, { token: admin, body })

  before(async () => {
    s = await startServer()
    admin = await s.login('qa_admin')
  })
  after(() => s.stop())

  const mkEmp = async (extra = {}) => (await A('POST', '/employees', { name: 'Emp ' + OID().slice(-5), currentDefaultDailyWage: 500, deductionType: 'percentage', deductionValue: 10, ...extra })).data.data
  const week = (startDay, wage = 500, days = 5) => Array.from({ length: days }, (_, i) => ({ date: `2026-01-${String(startDay + i).padStart(2, '0')}`, worked: true, wage }))
  const mkRun = (employees, extra = {}) => A('POST', '/salary-runs', { type: 'by_period', month: 1, year: 2026, startDate: '2026-01-05', employees, ...extra })

  describe('employees', () => {
    test('create / list / update / delete + validation', async () => {
      assert.equal((await A('POST', '/employees', {})).status, 400)
      assert.equal((await A('POST', '/employees', { name: '   ' })).status, 400)
      assert.equal((await A('POST', '/employees', { name: 'X', currentDefaultDailyWage: -5 })).status, 400)
      assert.equal((await A('POST', '/employees', { name: 'X', deductionType: 'weird' })).status, 400)
      assert.equal((await A('POST', '/employees', { name: 'X', deductionType: 'percentage', deductionValue: 150 })).status, 400, 'percentage >100')
      const e = await A('POST', '/employees', { name: 'Murugan', phone: '9876543210', currentDefaultDailyWage: 650, deductionValue: 5 })
      assert.equal(e.status, 201)
      assert.ok((await A('GET', '/employees')).data.data.some(x => x._id === e.data.data._id))
      const up = await A('PUT', `/employees/${e.data.data._id}`, { name: 'Murugan K', currentDefaultDailyWage: 700 })
      assert.equal(up.status, 200); assert.equal(up.data.data.currentDefaultDailyWage, 700)
      assert.equal((await A('PUT', `/employees/${e.data.data._id}`, { name: '' })).status, 400)
      assert.equal((await A('PUT', `/employees/${OID()}`, { name: 'x' })).status, 404)
      assert.equal((await A('PUT', '/employees/bad', { name: 'x' })).status, 400)
      assert.equal((await A('DELETE', `/employees/${e.data.data._id}`)).status, 200)
      assert.equal((await A('DELETE', `/employees/${e.data.data._id}`)).status, 404)
    })
    test('PUT with only a name keeps wage/deduction settings (no silent reset)', async () => {
      const e = await mkEmp({ currentDefaultDailyWage: 800, deductionValue: 7 })
      const up = await A('PUT', `/employees/${e._id}`, { name: 'Renamed' })
      assert.equal(up.data.data.currentDefaultDailyWage, 800)
      assert.equal(up.data.data.deductionValue, 7)
    })
    test('delete employee leaves no orphaned payment history / run entries', async () => {
      const e = await mkEmp()
      await mkRun([{ employeeId: e._id, dailyEntries: week(5) }])
      await A('POST', '/payment/settle-total', { employeeId: e._id, amountPaid: 100 })
      await A('DELETE', `/employees/${e._id}`)
      assert.equal(await s.models.PaymentHistory.countDocuments({ employeeId: e._id }), 0, 'payment history orphaned')
      assert.equal(await s.models.SalaryRunEmployee.countDocuments({ employeeId: e._id }), 0)
    })
  })

  describe('salary runs', () => {
    test('calculation: percentage deduction, market & advance', async () => {
      const e = await mkEmp()
      const r = await mkRun([{ employeeId: e._id, market: 100, advance: 50, dailyEntries: week(5) }])
      assert.equal(r.status, 201, JSON.stringify(r.data))
      const row = r.data.data.employees[0]
      assert.deepEqual([row.daysWorked, row.grossWages, row.deductionAmount, row.finalSalary], [5, 2500, 250, 2100])
      assert.equal(r.data.data.salaryRun.periodStartDate.slice(0, 10) <= '2026-01-05', true)
    })
    test('calculation: fixed deduction is per worked day; salary never negative; unworked days ignored', async () => {
      const e = await mkEmp({ deductionType: 'fixed', deductionValue: 20 })
      const entries = [...week(12, 500, 3), { date: '2026-01-15', worked: false, wage: 999 }]
      const r = await mkRun([{ employeeId: e._id, advance: 99999, dailyEntries: entries }], { startDate: '2026-01-12' })
      const row = r.data.data.employees[0]
      assert.deepEqual([row.daysWorked, row.grossWages, row.deductionAmount, row.finalSalary], [3, 1500, 60, 0])
    })
    test('validation: type, month/year, start date, empty entries, unknown employee, other-month day', async () => {
      const e = await mkEmp()
      const good = [{ employeeId: e._id, dailyEntries: week(19) }]
      assert.equal((await mkRun(good, { type: 'bogus' })).status, 400)
      assert.equal((await mkRun(good, { month: undefined })).status, 400)
      assert.equal((await mkRun(good, { startDate: undefined })).status, 400)
      assert.equal((await mkRun(good, { startDate: 'garbage' })).status, 400)
      assert.equal((await mkRun([])).status, 400)
      assert.equal((await mkRun(good, { month: 13 })).status, 400)
      assert.equal((await mkRun([{ employeeId: OID(), dailyEntries: week(19) }], { startDate: '2026-01-19' })).status, 400, 'unknown employee')
      assert.equal((await mkRun([{ employeeId: e._id, dailyEntries: [{ date: '2026-02-02', worked: true, wage: 500 }] }], { startDate: '2026-01-19' })).status, 400, 'day in other month')
      assert.equal((await mkRun([{ employeeId: e._id, dailyEntries: [{ date: '2026-01-19', worked: true, wage: -5 }] }], { startDate: '2026-01-19' })).status, 400, 'negative wage')
      assert.equal((await mkRun([{ employeeId: e._id, market: -5, dailyEntries: week(19) }], { startDate: '2026-01-19' })).status, 400, 'negative market')
      assert.equal((await mkRun([{ employeeId: e._id, dailyEntries: week(19) }, { employeeId: e._id, dailyEntries: week(19) }], { startDate: '2026-01-19' })).status, 400, 'same employee twice')
      assert.equal(await s.models.SalaryRun.countDocuments({ periodStartDate: new Date(2026, 0, 19) }), 0, 'failed requests must not leave empty salary runs')
    })
    test('duplicate week for same employee is rejected; other employee allowed', async () => {
      const e1 = await mkEmp(); const e2 = await mkEmp()
      assert.equal((await mkRun([{ employeeId: e1._id, dailyEntries: week(26, 500, 1) }], { startDate: '2026-01-26' })).status, 201)
      assert.equal((await mkRun([{ employeeId: e1._id, dailyEntries: week(27, 500, 1) }], { startDate: '2026-01-27' })).status, 400)
      assert.equal((await mkRun([{ employeeId: e2._id, dailyEntries: week(26, 500, 1) }], { startDate: '2026-01-26' })).status, 201)
    })
    test('list / get / update / lock / delete', async () => {
      const e = await mkEmp()
      const run = (await mkRun([{ employeeId: e._id, dailyEntries: week(5) }], { month: 1, year: 2026 })).data.data.salaryRun
      assert.ok((await A('GET', '/salary-runs?month=1&year=2026')).data.data.some(r => r._id === run._id))
      assert.equal((await A('GET', '/salary-runs?month=7&year=2030')).data.data.length, 0)
      assert.equal((await A('GET', `/salary-runs/${run._id}`)).data.data.employees.length, 1)
      assert.equal((await A('GET', `/salary-runs/${OID()}`)).status, 404)
      assert.equal((await A('GET', '/salary-runs/bad')).status, 400)
      const up = await A('PUT', `/salary-runs/${run._id}`, { employees: [{ employeeId: e._id, advance: 100, dailyEntries: week(5, 600, 4) }] })
      const row = up.data.data.employees[0]
      assert.deepEqual([row.grossWages, row.deductionAmount, row.finalSalary], [2400, 240, 2060])
      assert.equal((await A('PUT', `/salary-runs/${run._id}`, { employees: [{ employeeId: e._id, market: -1 }] })).status, 400)
      assert.equal((await A('PUT', `/salary-runs/${run._id}`, { status: 'locked' })).status, 200)
      assert.equal((await A('PUT', `/salary-runs/${run._id}`, { employees: [{ employeeId: e._id, advance: 0 }] })).status, 400, 'locked')
      assert.equal((await A('DELETE', `/salary-runs/${run._id}`)).status, 400, 'locked')
      assert.equal((await A('PUT', `/salary-runs/${OID()}`, {})).status, 404)
    })
    test('delete run removes its employee rows', async () => {
      const e = await mkEmp()
      const run = (await mkRun([{ employeeId: e._id, dailyEntries: week(5) }], { month: 1 })).data.data.salaryRun
      assert.equal((await A('DELETE', `/salary-runs/${run._id}`)).status, 200)
      assert.equal(await s.models.SalaryRunEmployee.countDocuments({ salaryRunId: run._id }), 0)
      assert.equal((await A('DELETE', `/salary-runs/${run._id}`)).status, 404)
    })
  })

  describe('salary payments (waterfall) and deduction fund', () => {
    test('settle-total pays oldest first, tracks pending, validates', async () => {
      const e = await mkEmp({ deductionValue: 0 })
      await mkRun([{ employeeId: e._id, dailyEntries: week(5, 500, 2) }], { startDate: '2026-01-05' }) // 1000
      await mkRun([{ employeeId: e._id, dailyEntries: week(12, 500, 2) }], { startDate: '2026-01-12' }) // 1000
      assert.equal((await A('POST', '/payment/settle-total', { employeeId: e._id, amountPaid: 0 })).status, 400)
      assert.equal((await A('POST', '/payment/settle-total', { employeeId: e._id, amountPaid: -5 })).status, 400)
      assert.equal((await A('POST', '/payment/settle-total', { amountPaid: 5 })).status, 400)
      assert.equal((await A('POST', '/payment/settle-total', { employeeId: OID(), amountPaid: 5 })).status, 404, 'unknown employee')
      const p = await A('POST', '/payment/settle-total', { employeeId: e._id, amountPaid: 1500 })
      assert.equal(p.status, 200); assert.equal(p.data.data.settledAmount, 1500); assert.equal(p.data.data.allocations.length, 2)
      const sum = (await A('GET', '/employees/summary')).data.data.find(x => x._id === e._id)
      assert.deepEqual([sum.totalNet, sum.totalPaid, sum.totalPending], [2000, 1500, 500])
      const over = await A('POST', '/payment/settle-total', { employeeId: e._id, amountPaid: 800 })
      assert.equal(over.status, 400, 'paying more than pending must be rejected, not silently dropped')
      const hist = (await A('GET', `/payment-history/${e._id}`)).data.data
      assert.equal(hist.reduce((t, h) => t + h.amountPaid, 0), 1500)
      const mb = (await A('GET', `/monthly-breakdown/${e._id}`)).data.data
      assert.deepEqual([mb[0].due, mb[0].paid, mb[0].pending, mb[0].status], [2000, 1500, 500, 'partial'])
    })
    test('concurrent settlements cannot pay more than is pending', async () => {
      const e = await mkEmp({ deductionValue: 0 })
      await mkRun([{ employeeId: e._id, dailyEntries: week(5, 500, 2) }], { startDate: '2026-01-05' })
      const res = await Promise.all([1, 2, 3].map(() => A('POST', '/payment/settle-total', { employeeId: e._id, amountPaid: 1000 })))
      assert.equal(res.filter(r => r.status === 200).length, 1, res.map(r => r.status).join())
      const sum = (await A('GET', '/employees/summary')).data.data.find(x => x._id === e._id)
      assert.equal(sum.totalPaid, 1000)
    })
    test('settle-total with nothing pending is rejected', async () => {
      const e = await mkEmp()
      assert.equal((await A('POST', '/payment/settle-total', { employeeId: e._id, amountPaid: 10 })).status, 400)
    })
    test('deduction return cannot exceed accumulated deduction', async () => {
      const e = await mkEmp({ deductionValue: 10 })
      await mkRun([{ employeeId: e._id, dailyEntries: week(5, 500, 2) }], { startDate: '2026-01-05' }) // deduction 100
      assert.equal((await A('POST', '/payment/deduction-return', { employeeId: e._id, amountPaid: 0 })).status, 400)
      assert.equal((await A('POST', '/payment/deduction-return', { employeeId: e._id, amountPaid: 60 })).status, 200)
      assert.equal((await A('POST', '/payment/deduction-return', { employeeId: e._id, amountPaid: 60 })).status, 400, 'only 40 left')
      assert.equal((await A('POST', '/payment/deduction-return', { employeeId: OID(), amountPaid: 1 })).status, 404)
      const sum = (await A('GET', '/employees/summary')).data.data.find(x => x._id === e._id)
      assert.deepEqual([sum.totalDeductionAmount, sum.totalDeductionReturned, sum.deductionBalance], [100, 60, 40])
    })
    test('payslip + employee-summary agree with ledger', async () => {
      const e = await mkEmp({ deductionValue: 10 })
      await mkRun([{ employeeId: e._id, market: 100, dailyEntries: week(5) }], { startDate: '2026-01-05' }) // 2500-250-100=2150
      await A('POST', '/payment/settle-total', { employeeId: e._id, amountPaid: 1000 })
      assert.equal((await A('GET', `/payslip?employeeId=${e._id}`)).status, 400)
      assert.equal((await A('GET', `/payslip?employeeId=${e._id}&month=abc&year=2026`)).status, 400)
      const ps = (await A('GET', `/payslip?employeeId=${e._id}&month=1&year=2026`)).data.data
      assert.deepEqual([ps.totalGross, ps.totalDeduction, ps.totalFinal, ps.totalPaid, ps.totalPending, ps.paymentStatus], [2500, 250, 2150, 1000, 1150, 'partial'])
      const es = (await A('GET', `/employee-summary?employeeId=${e._id}&month=1&year=2026`)).data.data
      assert.deepEqual([es.summary.totalFinalSalary, es.summary.totalPaid, es.summary.totalBalance], [2150, 1000, 1150])
      assert.equal((await A('GET', '/employee-summary?fromDate=garbage')).status, 400)
      assert.equal((await A('GET', '/employee-summary?employeeId=bad')).status, 400)
    })
  })

  describe('machine wage master & legacy payroll API', () => {
    test('machine wage master: create, validation, duplicate date, resolve, update, delete', async () => {
      const e = await mkEmp()
      const base = { employeeId: e._id, fromDate: '2026-01-01', machineRanges: [{ minMachineCount: 3, maxMachineCount: 5, wageAmount: 400 }, { minMachineCount: 6, maxMachineCount: 8, wageAmount: 550 }] }
      assert.equal((await P('POST', '/machine-wage-master', { ...base, employeeId: undefined })).status, 400)
      assert.equal((await P('POST', '/machine-wage-master', { ...base, employeeId: OID() })).status, 400)
      assert.equal((await P('POST', '/machine-wage-master', { ...base, fromDate: 'garbage' })).status, 400)
      assert.equal((await P('POST', '/machine-wage-master', { ...base, machineRanges: [{ minMachineCount: 1, maxMachineCount: 5, wageAmount: 5 }] })).status, 400)
      assert.equal((await P('POST', '/machine-wage-master', { ...base, machineRanges: [{ minMachineCount: 5, maxMachineCount: 3, wageAmount: 5 }] })).status, 400)
      assert.equal((await P('POST', '/machine-wage-master', { ...base, machineRanges: [{ minMachineCount: 3, maxMachineCount: 5, wageAmount: 0 }] })).status, 400)
      const c = await P('POST', '/machine-wage-master', base)
      assert.equal(c.status, 201)
      assert.equal((await P('POST', '/machine-wage-master', base)).status, 400, 'duplicate from-date')
      const r = (await P('GET', `/machine-wage-master/resolve?employeeId=${e._id}&date=2026-02-01&machineCount=7`)).data.data
      assert.equal(r.wage, 550)
      assert.equal((await P('GET', `/machine-wage-master/resolve?employeeId=${e._id}&date=2025-12-01&machineCount=7`)).data.data.found, false)
      assert.equal((await P('GET', '/machine-wage-master/resolve')).status, 400)
      assert.equal((await P('GET', `/machine-wage-master?employeeId=${e._id}`)).data.data.length, 1)
      const u = await P('PUT', `/machine-wage-master/${c.data.data._id}`, { machineRanges: [{ minMachineCount: 3, maxMachineCount: 15, wageAmount: 600 }] })
      assert.equal(u.status, 200)
      assert.equal((await P('PUT', `/machine-wage-master/${OID()}`, {})).status, 404)
      assert.equal((await P('DELETE', `/machine-wage-master/${c.data.data._id}`)).status, 200)
      assert.equal((await P('DELETE', `/machine-wage-master/${c.data.data._id}`)).status, 404)
    })
    test('legacy payroll: generate, history, edit, pending, settle, delete', async () => {
      const e = (await P('POST', '/employees', { name: 'Legacy', currentDefaultDailyWage: 500, deductionValue: 10 })).data.data
      assert.equal((await P('POST', '/employees', {})).status, 400)
      const gen = await P('POST', '/generate', { month: 1, year: 2026, periodStart: '2026-01-05', periodEnd: '2026-01-11', runTitle: 'W1', employeeEntries: [{ employeeId: e._id, daysWorked: 5, wagePerDay: 500, deductionPercentage: 10, marketAmount: 100 }] })
      assert.equal(gen.status, 201, JSON.stringify(gen.data))
      const emp = gen.data.data.employees[0]
      assert.deepEqual([emp.totalWages, emp.deductionAmount, emp.finalSalary, emp.amountPending], [2500, 250, 2150, 2150])
      assert.equal((await P('POST', '/generate', { periodStart: '2026-01-05' })).status, 400)
      assert.equal((await P('POST', '/generate', { month: 1, year: 2026, periodStart: '2026-01-12', periodEnd: '2026-01-05', employeeEntries: [{ employeeId: e._id }] })).status, 400)
      assert.equal((await P('GET', '/history/1/2026')).data.data.length, 1)
      assert.equal((await P('GET', '/pending')).data.data.length, 1)
      const st = await P('POST', '/payment/settle-total', { employeeId: e._id, amountPaid: 150 })
      assert.equal(st.data.data.settledAmount, 150)
      assert.equal((await P('POST', '/payment/settle-total', { employeeId: e._id, amountPaid: 99999 })).status, 400, 'overpay')
      assert.equal((await P('GET', `/payment-history/${e._id}`)).data.data.length, 1)
      assert.equal((await P('DELETE', `/history/${gen.data.data._id}`)).status, 200)
      assert.equal((await P('DELETE', `/history/${gen.data.data._id}`)).status, 404)
    })
  })
})
