// Test harness: boots the real server against an isolated local MongoDB and talks to it over HTTP.
// Run with a local mongod:  TEST_MONGO_URI=mongodb://127.0.0.1:27017/ashoktex_api_tests npm test
const { spawn } = require('child_process')
const net = require('net')
const path = require('path')
const crypto = require('crypto')
const bcrypt = require('bcryptjs')
const mongoose = require('mongoose')

const MONGO_URI = process.env.TEST_MONGO_URI || 'mongodb://127.0.0.1:27017/ashoktex_api_tests'
const JWT_SECRET = 'api-test-secret-' + crypto.randomBytes(16).toString('hex')

function assertSafeDatabase(uri) {
  // Never let the suite drop anything except a throw-away local database.
  const m = uri.match(/^mongodb:\/\/(127\.0\.0\.1|localhost)(:\d+)?\/([^?]+)/)
  if (!m || !/test|audit/i.test(m[3])) {
    throw new Error(`Refusing to run: TEST_MONGO_URI must be a local mongod and DB name must contain "test" or "audit" (got ${uri.replace(/\/\/[^@/]*@/, '//***@')})`)
  }
}

function freePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer()
    srv.listen(0, '127.0.0.1', () => {
      const { port } = srv.address()
      srv.close(() => resolve(port))
    })
    srv.on('error', reject)
  })
}

async function waitForHealth(base, child, timeoutMs = 20000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    if (child.exitCode !== null) throw new Error('Server exited early: ' + child.__log)
    try {
      const r = await fetch(base + '/api/health')
      if (r.ok) return
    } catch { /* not up yet */ }
    await new Promise(r => setTimeout(r, 150))
  }
  throw new Error('Server did not start in time: ' + child.__log)
}

async function startServer(extraEnv = {}) {
  assertSafeDatabase(MONGO_URI)
  if (mongoose.connection.readyState === 0) await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 4000 })
  await mongoose.connection.dropDatabase()
  const models = require('../models')
  await Promise.all(Object.values(models).map(m => m.syncIndexes()))

  const hash = await bcrypt.hash('Passw0rd!x', 4)
  await models.User.create([
    { username: 'qa_admin', password: hash, role: 'admin' },
    { username: 'qa_user', password: hash, role: 'user' },
  ])

  const port = await freePort()
  const child = spawn(process.execPath, ['server.js'], {
    cwd: path.resolve(__dirname, '..'),
    env: {
      ...process.env,
      NODE_ENV: 'test',
      PORT: String(port),
      MONGO_URI,
      JWT_SECRET,
      JWT_EXPIRES_IN: '1h',
      API_RATE_LIMIT_MAX: '100000',
      LOGIN_RATE_LIMIT_MAX: '100000',
      REGISTER_RATE_LIMIT_MAX: '100000',
      // Neutralise anything that could reach a real third-party service.
      GROQ_API_KEY: '', GEMINI_API_KEY: '', AI_PROVIDER: '',
      CLOUDINARY_CLOUD_NAME: '', CLOUDINARY_API_KEY: '', CLOUDINARY_API_SECRET: '',
      CLOUDINARY_NAME: '', CLOUDINARY_KEY: '', CLOUDINARY_SECRET: '',
      ENABLE_ARCHIVE_JOB: 'false',
      ...extraEnv,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  child.__log = ''
  child.stdout.on('data', d => { child.__log += d })
  child.stderr.on('data', d => { child.__log += d })
  const base = `http://127.0.0.1:${port}`
  await waitForHealth(base, child)

  async function request(method, url, { body, token, headers = {}, raw = false } = {}) {
    const res = await fetch(base + '/api' + url, {
      method,
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      body: body === undefined ? undefined : (typeof body === 'string' ? body : JSON.stringify(body)),
    })
    if (raw) return res
    const text = await res.text()
    let data = null
    try { data = text ? JSON.parse(text) : null } catch { data = text }
    return { status: res.status, data, headers: res.headers }
  }

  async function login(username = 'qa_admin', password = 'Passw0rd!x') {
    const r = await request('POST', '/auth/login', { body: { username, password } })
    if (r.status !== 200) throw new Error('login failed ' + r.status)
    return r.data.accessToken
  }

  return {
    base, request, login, models,
    log: () => child.__log,
    async stop() {
      child.kill('SIGTERM')
      await new Promise(r => child.once('exit', r))
      await mongoose.connection.dropDatabase()
      await mongoose.disconnect()
    },
  }
}

const OID = () => new mongoose.Types.ObjectId().toString()

module.exports = { startServer, OID, JWT_SECRET }
