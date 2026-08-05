const path = require('path')
const ENV  = process.env.NODE_ENV || 'development'
require('dotenv').config({ path: path.resolve(__dirname, `.env.${ENV}`) })
require('dotenv').config({ path: path.resolve(__dirname, '.env') })

console.log('Running Environment:', ENV)
console.log('Mongo URI:', process.env.MONGO_URI)
const express         = require('express')
const cors            = require('cors')
const mongoose        = require('mongoose')
const helmet          = require('helmet')
const compression     = require('compression')
const rateLimit       = require('express-rate-limit')
const cookieParser    = require('cookie-parser')
const mongoSanitize   = require('express-mongo-sanitize')
const xssSanitize     = require('./middleware/sanitize')
const safeLogger      = require('./middleware/logger')
const { archiveOldClosedOrders } = require('./services/archiveOrders')

const app  = express()
const PORT = process.env.PORT || 5000
const bodyLimit = process.env.BODY_LIMIT || '15mb'

// Gzip compress all responses — reduces JSON payload size by ~70%
app.use(compression())

// Security headers
app.use(helmet())

// General API rate limit: 300 requests per minute per IP
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests, please slow down.' },
})

// CORS — only allow known frontend origins, no wildcard
const envOrigins = [
  ...(process.env.CORS_ORIGIN || '').split(','),
  ...(process.env.CLIENT_URL  || '').split(','),
]
const allowedOrigins = [
  'http://localhost:5173',
  'https://ashok-tex-g71m.vercel.app',
  ...envOrigins.map(o => o.trim()).filter(Boolean),
]
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true)
    cb(new Error('Not allowed by CORS'))
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))

app.use(express.json({ limit: bodyLimit }))
app.use(express.urlencoded({ extended: true, limit: bodyLimit }))
app.use(cookieParser())
// NoSQL injection prevention — strips $ and . from req.body/params/query
app.use(mongoSanitize())
// XSS — strip HTML tags from all string inputs
app.use(xssSanitize)
// Safe request logger — never logs passwords or tokens
app.use(safeLogger)

// Cache-Control: short private cache for faster back/forward navigation and repeated views.
// Must be BEFORE routes so the header is set before response is sent.
app.use((req, res, next) => {
  if (req.path.startsWith('/api/') && req.method === 'GET') {
    res.setHeader('Cache-Control', 'private, max-age=10, must-revalidate')
  }
  next()
})

// Routes — all behind the 100 req/min limiter
app.use('/api/auth',       require('./routes/auth'))
app.use('/api/companies',  apiLimiter, require('./routes/companies'))
app.use('/api/orders',     apiLimiter, require('./routes/orders'))
app.use('/api/nool',       apiLimiter, require('./routes/nool'))
app.use('/api/production', apiLimiter, require('./routes/production'))
app.use('/api/expenses',   apiLimiter, require('./routes/expenses'))
app.use('/api/payments',   apiLimiter, require('./routes/payments'))
app.use('/api/allocations',apiLimiter, require('./routes/allocations'))
app.use('/api/rejections', apiLimiter, require('./routes/rejections'))
app.use('/api/reports',    apiLimiter, require('./routes/reports'))
app.use('/api/dashboard',  apiLimiter, require('./routes/dashboard'))
app.use('/api/payroll',    apiLimiter, require('./routes/payroll'))
app.use('/api/salary',     apiLimiter, require('./routes/salary-run'))
app.use('/api/financial-intelligence', apiLimiter, require('./routes/financial-intelligence'))
app.use('/api/analytics',  apiLimiter, require('./routes/analytics'))

app.get('/api/health', (_, res) => res.json({ status: 'ok', ts: new Date() }))

const IS_PROD = process.env.NODE_ENV === 'production'

app.use((err, req, res, next) => {
  // Never log passwords or tokens — sanitize error objects before logging
  const safeMessage = (err.message || 'Internal Server Error')
    .replace(/password[^\s]*/gi, '[REDACTED]')
    .replace(/Bearer [^\s]+/gi, 'Bearer [REDACTED]')
  // Stack traces only in development — never expose internals in production
  if (!IS_PROD) console.error(`[ERROR] ${safeMessage}\n${err.stack}`)
  else console.error(`[ERROR] ${req.method} ${req.path} — ${safeMessage}`)
  res.status(err.status || 500).json({
    message: IS_PROD ? (err.status < 500 ? safeMessage : 'Internal Server Error') : safeMessage,
  })
})

mongoose
  .connect(process.env.MONGO_URI, {
    maxPoolSize: 10,          // keep up to 10 connections ready — avoids reconnect delay
    minPoolSize: 2,           // always keep 2 warm connections alive
    serverSelectionTimeoutMS: 5000,  // fail fast if MongoDB unreachable
    socketTimeoutMS: 45000,   // drop idle sockets after 45s
    heartbeatFrequencyMS: 10000,     // check connection health every 10s
  })
  .then(() => {
    console.log('✅ MongoDB connected')
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`)

      // ── Keep-alive ping (Render free tier sleeps after 15 min) ──
      // Pings own health endpoint every 13 minutes to prevent cold starts.
      if (IS_PROD && process.env.RENDER_EXTERNAL_URL) {
        const SELF_URL = `${process.env.RENDER_EXTERNAL_URL}/api/health`
        setInterval(() => {
          const https = require('https')
          const http  = require('http')
          const mod   = SELF_URL.startsWith('https') ? https : http
          mod.get(SELF_URL, r => console.log(`[keep-alive] ${r.statusCode}`))
             .on('error', e => console.warn('[keep-alive] ping failed:', e.message))
        }, 13 * 60 * 1000)
        console.log(`🔔 Keep-alive ping enabled → ${SELF_URL}`)
      }

      if (String(process.env.ENABLE_ARCHIVE_JOB || '').toLowerCase() === 'true') {
        const everyMs = Number(process.env.ARCHIVE_JOB_INTERVAL_MS || 24 * 60 * 60 * 1000)
        const archiveMonths = Number(process.env.ARCHIVE_AFTER_MONTHS || 3)
        setInterval(async () => {
          try {
            const result = await archiveOldClosedOrders({ months: archiveMonths })
            console.log(`[archive-job] archived=${result.archived} matched=${result.matched}`)
          } catch (e) {
            console.error('[archive-job] failed:', e.message)
          }
        }, everyMs)
        console.log(`[archive-job] enabled every ${everyMs}ms, after ${archiveMonths} months`)
      }
    })
  })
  .catch(err => {
    console.error('❌ MongoDB connection failed:', err.message)
    process.exit(1)
  })