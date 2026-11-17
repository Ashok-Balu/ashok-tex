const { test, before, after, describe } = require('node:test')
const assert = require('node:assert/strict')
const { startServer, OID } = require('./helpers')

describe('financial intelligence (per-user personal finance module)', () => {
  let s, admin, user
  const A = (m, p, body) => s.request(m, '/financial-intelligence' + p, { token: admin, body })
  const U = (m, p, body) => s.request(m, '/financial-intelligence' + p, { token: user, body })

  before(async () => {
    s = await startServer()
    admin = await s.login('qa_admin')
    user = await s.login('qa_user')
  })
  after(() => s.stop())

  test('profile: defaults, update, persists, priority order', async () => {
    const p0 = await A('GET', '/profile'); assert.equal(p0.status, 200)
    const up = await A('PUT', '/profile', { monthlyIncome: { powerloomIncome: 50000, rentalIncome: 8000 }, monthlyExpenses: { workerWages: 20000, familyExpenses: 15000, otherMonthlyExpenses: 3000 }, priorityOrder: ['a', 'b'] })
    assert.equal(up.status, 200)
    const again = (await A('GET', '/profile')).data
    assert.equal(again.monthlyIncome.powerloomIncome, 50000)
    assert.deepEqual(again.priorityOrder, ['a', 'b'])
    assert.equal((await A('PUT', '/profile', { monthlyIncome: { powerloomIncome: 'abc' } })).status, 400)
    assert.equal((await A('PUT', '/profile', { monthlyIncome: { powerloomIncome: -5 } })).status, 400, 'negative income')
  })

  test('monthly entry: add, edit, delete transaction, delete month', async () => {
    const add = await A('PUT', '/monthly-entry', { month: 3, year: 2026, monthlyIncome: { powerloomIncome: 1000 }, monthlyExpenses: { workerWages: 200, familyExpenses: 100, otherMonthlyExpenses: 50 }, label: 'first' })
    assert.equal(add.status, 200)
    assert.equal(add.data.totals.totalBalance, 650)
    await A('PUT', '/monthly-entry', { month: 3, year: 2026, monthlyIncome: { rentalIncome: 500 }, label: 'second' })
    const entry = (await A('GET', '/monthly-entry?month=3&year=2026')).data
    assert.equal(entry.transactions.length, 2)
    const txId = entry.transactions[0]._id
    const edit = await A('PUT', '/monthly-entry', { month: 3, year: 2026, _transactionId: txId, monthlyIncome: { powerloomIncome: 2000 }, monthlyExpenses: {} })
    assert.equal(edit.status, 200)
    assert.equal((await A('PUT', '/monthly-entry', { month: 3, year: 2026, _transactionId: OID() })).status, 404)
    assert.equal((await A('PUT', '/monthly-entry', { month: 3, year: 2026, monthlyIncome: { powerloomIncome: -1 } })).status, 400)
    assert.equal((await A('DELETE', `/monthly-entry?month=3&year=2026&transactionId=${txId}`)).status, 200)
    assert.equal((await A('DELETE', `/monthly-entry?month=3&year=2026&transactionId=${txId}`)).status, 404)
    assert.equal((await A('GET', '/monthly-entries?year=2026')).data.length, 1)
    assert.equal((await A('DELETE', '/monthly-entry?month=3&year=2026')).status, 200)
    assert.equal((await A('GET', '/monthly-entries?year=2026')).data.length, 0)
    assert.equal((await A('GET', '/monthly-entry?month=abc&year=2026')).status, 400)
  })

  describe('debts & payments', () => {
    let debt
    test('debt CRUD, duplicate name, validation', async () => {
      assert.equal((await A('POST', '/debts', { debtType: 'vehicle_loan' })).status, 400, 'name required')
      assert.equal((await A('POST', '/debts', { name: 'X', debtType: 'not_a_type' })).status, 400)
      const c = await A('POST', '/debts', { name: 'Auto Loan', debtType: 'vehicle_loan', currentBalance: 100000, originalAmount: 100000, interestRate: 12, emi: 5000 })
      assert.equal(c.status, 201); debt = c.data
      assert.equal(debt.currentMonthlyInterest, 1000)
      assert.equal((await A('POST', '/debts', { name: 'Auto Loan', debtType: 'vehicle_loan', currentBalance: 1 })).status, 409, 'duplicate name')
      assert.equal((await A('GET', '/debts')).data.length, 1)
      assert.equal((await A('GET', `/debts/${debt._id}`)).status, 200)
      assert.equal((await A('GET', `/debts/${OID()}`)).status, 404)
      assert.equal((await A('GET', '/debts/bad')).status, 400)
      const up = await A('PUT', `/debts/${debt._id}`, { interestRate: 6 })
      assert.equal(up.status, 200); assert.equal(up.data.currentMonthlyInterest, 500)
      assert.equal((await A('PUT', `/debts/${OID()}`, { name: 'x' })).status, 404)
    })
    test('per-user isolation: other user cannot read/modify', async () => {
      assert.equal((await U('GET', '/debts')).data.length, 0)
      assert.equal((await U('GET', `/debts/${debt._id}`)).status, 404)
      assert.equal((await U('PUT', `/debts/${debt._id}`, { name: 'hack' })).status, 404)
      assert.equal((await U('DELETE', `/debts/${debt._id}`)).status, 404)
      assert.equal((await U('POST', '/payments', { debt: debt._id, amountPaid: 10 })).status, 404)
    })
    test('payment reduces principal; edit and delete recompute balance', async () => {
      const p = await A('POST', '/payments', { debt: debt._id, amountPaid: 5000, paymentType: 'custom_split', interestPaid: 900, principalPaid: 4100, month: 3, year: 2026 })
      assert.equal(p.status, 201, JSON.stringify(p.data))
      assert.equal((await A('GET', `/debts/${debt._id}`)).data.debt.currentBalance, 95900)
      const up = await A('PUT', `/payments/${p.data._id}`, { amountPaid: 6000, paymentType: 'custom_split', interestPaid: 900, principalPaid: 5100 })
      assert.equal(up.status, 200)
      assert.equal((await A('GET', `/debts/${debt._id}`)).data.debt.currentBalance, 94900)
      assert.equal((await A('DELETE', `/payments/${p.data._id}`)).status, 200)
      assert.equal((await A('GET', `/debts/${debt._id}`)).data.debt.currentBalance, 100000)
      assert.equal((await A('DELETE', `/payments/${p.data._id}`)).status, 404)
    })
    test('payment validation never corrupts the debt balance', async () => {
      const before = (await A('GET', `/debts/${debt._id}`)).data.debt.currentBalance
      assert.equal((await A('POST', '/payments', { debt: 'bad', amountPaid: 100 })).status, 400)
      assert.equal((await A('POST', '/payments', { debt: debt._id, amountPaid: 0 })).status, 400, 'zero amount')
      assert.equal((await A('POST', '/payments', { debt: debt._id, amountPaid: -50 })).status, 400)
      assert.equal((await A('POST', '/payments', { debt: debt._id, amountPaid: 100, month: 13, year: 2026 })).status, 400)
      assert.equal((await A('POST', '/payments', { debt: debt._id, amountPaid: 100, date: 'garbage' })).status, 400)
      assert.equal((await A('GET', `/debts/${debt._id}`)).data.debt.currentBalance, before)
      assert.equal((await A('PUT', `/payments/${OID()}`, { amountPaid: 1 })).status, 404)
    })
    test('part-paid loan keeps its balance after a payment edit and delete', async () => {
      const d = (await A('POST', '/debts', { name: 'Part paid', debtType: 'business_loan', currentBalance: 80000, originalAmount: 100000, interestRate: 12 })).data
      const p = (await A('POST', '/payments', { debt: d._id, amountPaid: 1000, paymentType: 'principal_only', principalPaid: 1000, month: 3, year: 2026 })).data
      await A('PUT', `/payments/${p._id}`, { amountPaid: 2000, paymentType: 'principal_only', principalPaid: 2000 })
      assert.equal((await A('GET', `/debts/${d._id}`)).data.debt.currentBalance, 78000)
      await A('DELETE', `/payments/${p._id}`)
      assert.equal((await A('GET', `/debts/${d._id}`)).data.debt.currentBalance, 80000)
    })
    test('legacy debt without openingBalance is rebased on first payment edit', async () => {
      const d = (await A('POST', '/debts', { name: 'Legacy', debtType: 'business_loan', currentBalance: 50000, originalAmount: 70000, interestRate: 12 })).data
      await s.models.FinancialDebt.updateOne({ _id: d._id }, { $unset: { openingBalance: 1 } })
      const p = (await A('POST', '/payments', { debt: d._id, amountPaid: 1000, paymentType: 'principal_only', principalPaid: 1000, month: 3, year: 2026 })).data
      await A('PUT', `/payments/${p._id}`, { amountPaid: 3000, paymentType: 'principal_only', principalPaid: 3000 })
      assert.equal((await A('GET', `/debts/${d._id}`)).data.debt.currentBalance, 47000)
    })
    test('chit fund: installments reduce remaining months and close at zero', async () => {
      const c = (await A('POST', '/debts', { name: 'Chit', debtType: 'chit_fund', monthlyInstallment: 1000, remainingMonths: 2, totalInstallments: 10 })).data
      assert.equal(c.currentBalance, 2000)
      await A('POST', '/payments', { debt: c._id, amountPaid: 1000, month: 3, year: 2026 })
      await A('POST', '/payments', { debt: c._id, amountPaid: 1000, month: 4, year: 2026 })
      const d = (await A('GET', '/debts')).data.find(x => x._id === c._id)
      assert.equal(d.remainingMonths, 0); assert.equal(d.status, 'closed')
    })
    test('delete debt removes its payments; second delete 404', async () => {
      const d = (await A('POST', '/debts', { name: 'Temp', debtType: 'business_loan', currentBalance: 1000, interestRate: 24 })).data
      await A('POST', '/payments', { debt: d._id, amountPaid: 100, paymentType: 'interest_only', month: 3, year: 2026 })
      assert.equal((await A('DELETE', `/debts/${d._id}`)).status, 200)
      assert.equal(await s.models.FinancialDebtPayment.countDocuments({ debt: d._id }), 0)
      assert.equal((await A('DELETE', `/debts/${d._id}`)).status, 404)
    })
  })

  test('dashboard / reports respond for empty and populated data', async () => {
    assert.equal((await U('GET', '/dashboard')).status, 200)
    assert.equal((await A('GET', '/dashboard?month=3&year=2026')).status, 200)
    assert.equal((await A('GET', '/reports?month=3&year=2026')).status, 200)
    assert.equal((await U('GET', '/reports')).status, 200)
  })

  test('AI insights without provider key fails gracefully (no 500, no outbound call)', async () => {
    const r = await A('POST', '/ai-insights', { month: 3, year: 2026 })
    assert.ok([400, 429, 502].includes(r.status), `got ${r.status}`)
    assert.ok(r.data.message)
  })
})
