const { test, before, after, describe } = require('node:test')
const assert = require('node:assert/strict')
const jwt = require('jsonwebtoken')
const { startServer, OID, JWT_SECRET } = require('./helpers')

describe('auth & security', () => {
  let s, admin, user
  before(async () => {
    s = await startServer()
    admin = await s.login('qa_admin')
    user = await s.login('qa_user')
  })
  after(() => s.stop())

  const protectedRoutes = [
    ['GET', '/companies'], ['GET', '/orders'], ['GET', '/nool'], ['GET', '/production'], ['GET', '/colour-production'],
    ['GET', '/expenses'], ['GET', '/payments'], ['GET', '/rejections'], ['GET', '/reports/expense'], ['GET', '/dashboard'],
    ['GET', '/payroll/employees'], ['GET', '/salary/employees'], ['GET', '/financial-intelligence/debts'],
    ['GET', '/analytics'], ['GET', '/settings/targets'], ['GET', '/auth/session'],
  ]

  test('every data route rejects missing token with 401', async () => {
    for (const [m, p] of protectedRoutes) {
      const r = await s.request(m, p)
      assert.equal(r.status, 401, `${m} ${p} -> ${r.status}`)
    }
  })

  test('forged / expired / alg=none tokens are rejected', async () => {
    const forged = jwt.sign({ id: OID(), username: 'x', role: 'admin' }, 'wrong-secret')
    assert.equal((await s.request('GET', '/companies', { token: forged })).status, 401)
    const expired = jwt.sign({ id: OID(), username: 'x', role: 'admin' }, JWT_SECRET, { expiresIn: -10 })
    assert.equal((await s.request('GET', '/companies', { token: expired })).status, 401)
    const none = Buffer.from('{"alg":"none","typ":"JWT"}').toString('base64url') + '.' +
      Buffer.from(JSON.stringify({ id: OID(), role: 'admin' })).toString('base64url') + '.'
    assert.equal((await s.request('GET', '/companies', { token: none })).status, 401)
  })

  test('login: valid, invalid password, unknown user, missing fields', async () => {
    const ok = await s.request('POST', '/auth/login', { body: { username: 'QA_Admin', password: 'Passw0rd!x' } })
    assert.equal(ok.status, 200)
    assert.equal(ok.data.user.username, 'qa_admin')
    assert.ok(!('password' in ok.data.user))
    assert.match(ok.headers.get('set-cookie') || '', /HttpOnly/i)
    assert.equal((await s.request('POST', '/auth/login', { body: { username: 'qa_admin', password: 'bad' } })).status, 401)
    assert.equal((await s.request('POST', '/auth/login', { body: { username: 'nobody', password: 'x' } })).status, 401)
    assert.equal((await s.request('POST', '/auth/login', { body: { username: 'qa_admin' } })).status, 422)
  })

  test('login: NoSQL operator injection is neutralised', async () => {
    const r = await s.request('POST', '/auth/login', { body: { username: { $ne: null }, password: { $ne: null } } })
    assert.ok([401, 422, 400].includes(r.status), `got ${r.status}`)
    assert.ok(!r.data?.accessToken)
  })

  test('register: admin only, validation, duplicate', async () => {
    const body = { username: 'qa_new1', password: 'longenough1', role: 'user' }
    assert.equal((await s.request('POST', '/auth/register', { body })).status, 401)
    assert.equal((await s.request('POST', '/auth/register', { body, token: user })).status, 403)
    assert.equal((await s.request('POST', '/auth/register', { body: { ...body, password: 'short' }, token: admin })).status, 422)
    assert.equal((await s.request('POST', '/auth/register', { body: { ...body, username: 'bad name!' }, token: admin })).status, 422)
    assert.equal((await s.request('POST', '/auth/register', { body: { ...body, role: 'superuser' }, token: admin })).status, 422)
    assert.equal((await s.request('POST', '/auth/register', { body, token: admin })).status, 201)
    assert.equal((await s.request('POST', '/auth/register', { body, token: admin })).status, 409)
  })

  test('passwords are stored hashed and may contain < or > characters', async () => {
    const pw = 'ab<cd>efgh12'
    const created = await s.request('POST', '/auth/register', { body: { username: 'qa_angle', password: pw }, token: admin })
    assert.equal(created.status, 201)
    const stored = await s.models.User.findOne({ username: 'qa_angle' }).lean()
    assert.ok(stored.password.startsWith('$2'))
    // A password differing only in the stripped characters must NOT authenticate.
    const wrong = await s.request('POST', '/auth/login', { body: { username: 'qa_angle', password: 'abcdefgh12' } })
    assert.equal(wrong.status, 401)
    const right = await s.request('POST', '/auth/login', { body: { username: 'qa_angle', password: pw } })
    assert.equal(right.status, 200)
  })

  test('session endpoint returns user; refresh/logout flow works with cookies', async () => {
    const sess = await s.request('GET', '/auth/session', { token: admin })
    assert.equal(sess.status, 200)
    assert.equal(sess.data.user.role, 'admin')
    const login = await s.request('POST', '/auth/login', { body: { username: 'qa_admin', password: 'Passw0rd!x' } })
    const cookies = login.headers.getSetCookie().map(c => c.split(';')[0]).join('; ')
    const refreshed = await s.request('POST', '/auth/refresh', { headers: { Cookie: cookies } })
    assert.equal(refreshed.status, 200)
    assert.ok(refreshed.data.accessToken)
    const out = await s.request('POST', '/auth/logout', { headers: { Cookie: cookies } })
    assert.equal(out.status, 200)
    const again = await s.request('POST', '/auth/refresh', { headers: { Cookie: cookies } })
    assert.equal(again.status, 401)
    assert.equal((await s.request('POST', '/auth/refresh')).status, 401)
  })

  test('refresh for a deleted user returns 401, not 500', async () => {
    await s.request('POST', '/auth/register', { body: { username: 'qa_gone', password: 'longenough1' }, token: admin })
    const login = await s.request('POST', '/auth/login', { body: { username: 'qa_gone', password: 'longenough1' } })
    const cookies = login.headers.getSetCookie().map(c => c.split(';')[0]).join('; ')
    await s.models.User.deleteOne({ username: 'qa_gone' })
    const r = await s.request('POST', '/auth/refresh', { headers: { Cookie: cookies } })
    assert.equal(r.status, 401)
  })

  test('a stale/foreign accessToken cookie does not block a valid bearer token', async () => {
    const stale = jwt.sign({ id: OID(), username: 'x', role: 'admin' }, 'some-other-server-secret')
    const r = await s.request('GET', '/auth/session', { token: admin, headers: { Cookie: `accessToken=${stale}` } })
    assert.equal(r.status, 200)
    const only = await s.request('GET', '/auth/session', { headers: { Cookie: `accessToken=${stale}` } })
    assert.equal(only.status, 401)
  })

  test('role restrictions: delete company admin-only; reopen admin-only', async () => {
    const c = await s.request('POST', '/companies', { body: { name: 'RBAC Co' }, token: user })
    assert.equal(c.status, 201)
    assert.equal((await s.request('DELETE', `/companies/${c.data._id}`, { token: user })).status, 403)
    assert.equal((await s.request('PATCH', `/orders/${OID()}/reopen`, { token: user, body: {} })).status, 403)
    assert.equal((await s.request('DELETE', `/companies/${c.data._id}`, { token: admin })).status, 200)
  })

  test('security headers present, no x-powered-by, CORS rejects unknown origin', async () => {
    const r = await s.request('GET', '/health', { raw: true })
    assert.equal(r.headers.get('x-powered-by'), null)
    assert.ok(r.headers.get('x-content-type-options'))
    const bad = await s.request('GET', '/health', { raw: true, headers: { Origin: 'https://evil.example' } })
    assert.equal(bad.status, 403)
  })

  test('malformed JSON and unknown routes give JSON 4xx, not 500/HTML', async () => {
    const r = await s.request('POST', '/companies', { token: admin, body: '{"name":' })
    assert.equal(r.status, 400)
    const nf = await s.request('GET', '/no-such-route', { token: admin })
    assert.equal(nf.status, 404)
    assert.equal(typeof nf.data, 'object')
  })

  test('XSS: angle brackets stripped from stored strings', async () => {
    const r = await s.request('POST', '/companies', { token: admin, body: { name: '<script>alert(1)</script>Evil' } })
    assert.equal(r.status, 201)
    assert.ok(!/[<>]/.test(r.data.name))
  })

  test('mongo operator keys in body are stripped (no operator injection into updates)', async () => {
    const c = await s.request('POST', '/companies', { token: admin, body: { name: 'Inj Co' } })
    const r = await s.request('PUT', `/companies/${c.data._id}`, { token: admin, body: { name: 'Inj2', $set: { defaultDeduction: 99 } } })
    assert.equal(r.status, 200)
    assert.equal(r.data.defaultDeduction, 3)
  })
})
