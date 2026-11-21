const { test, before, after, describe } = require('node:test')
const assert = require('node:assert/strict')
const { startServer } = require('./helpers')

describe('rate limiting (real production limits)', () => {
  let s
  before(async () => {
    s = await startServer({ LOGIN_RATE_LIMIT_MAX: '5', REGISTER_RATE_LIMIT_MAX: '3', API_RATE_LIMIT_MAX: '20' })
  })
  after(() => s.stop())

  test('login locks out after 5 failed attempts but successful logins are not counted', async () => {
    for (let i = 0; i < 3; i++) {
      assert.equal((await s.request('POST', '/auth/login', { body: { username: 'qa_admin', password: 'Passw0rd!x' } })).status, 200)
    }
    const codes = []
    for (let i = 0; i < 7; i++) {
      codes.push((await s.request('POST', '/auth/login', { body: { username: 'qa_admin', password: 'wrong' + i } })).status)
    }
    assert.deepEqual(codes.slice(0, 5), [401, 401, 401, 401, 401])
    assert.equal(codes[6], 429)
  })

  test('general API limiter returns 429 with JSON message', async () => {
    const token = (await s.request('POST', '/auth/login', { body: { username: 'qa_user', password: 'Passw0rd!x' } })).data?.accessToken
    // login is locked for this IP, so use a forged-free path: sign a valid token directly
    const jwt = require('jsonwebtoken')
    const { JWT_SECRET } = require('./helpers')
    const t = token || jwt.sign({ id: '000000000000000000000001', username: 'qa_user', role: 'user' }, JWT_SECRET)
    let last
    for (let i = 0; i < 30; i++) last = await s.request('GET', '/companies', { token: t })
    assert.equal(last.status, 429)
    assert.ok(last.data.message)
  })
})
