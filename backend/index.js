const path = require('path')
const ENV = process.env.NODE_ENV || 'development'
require('dotenv').config({ path: path.resolve(__dirname, `.env.${ENV}`) })
require('dotenv').config({ path: path.resolve(__dirname, '.env') })
const express   = require('express')
const cors      = require('cors')
const mongoose  = require('mongoose')

const app  = express()
const PORT = process.env.PORT || 5000
const bodyLimit = process.env.BODY_LIMIT || '15mb'

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({
  origin: (origin, callback) => {
    const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173').split(',').map(o => o.trim())
    if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      callback(null, true)
    } else {
      callback(new Error('CORS not allowed'))
    }
  },
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  maxAge: 3600,
}))
app.use(express.json({ limit: bodyLimit }))
app.use(express.urlencoded({ extended: true, limit: bodyLimit }))

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth',       require('./routes/auth'))
app.use('/api/companies',  require('./routes/companies'))
app.use('/api/orders',     require('./routes/orders'))
app.use('/api/nool',       require('./routes/nool'))
app.use('/api/production', require('./routes/production'))
app.use('/api/expenses',   require('./routes/expenses'))
app.use('/api/payments',   require('./routes/payments'))
app.use('/api/reports',    require('./routes/reports'))
app.use('/api/dashboard',  require('./routes/dashboard'))
app.use('/api/payroll',    require('./routes/payroll'))
app.use('/api/salary',     require('./routes/salary-run'))
app.use('/api/analytics',  require('./routes/analytics'))

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/api/health', (_, res) => res.json({ status: 'ok', time: new Date() }))

// ── Error handler ─────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(err.status || 500).json({ message: err.message || 'Internal Server Error' })
})

// ── Connect & Start ───────────────────────────────────────────────────────────
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅  MongoDB connected')
    app.listen(PORT, () => console.log(`🚀  Server running → http://localhost:${PORT}`))
  })
  .catch(err => {
    console.error('❌  MongoDB connection failed:', err.message)
    process.exit(1)
  })
