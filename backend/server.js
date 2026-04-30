require('dotenv').config()
const express  = require('express')
const cors     = require('cors')
const mongoose = require('mongoose')

const app  = express()
const PORT = process.env.PORT || 5000
const bodyLimit = process.env.BODY_LIMIT || '15mb'

// ✅ FIXED CORS (ONLY THIS ONE)
app.use(cors({
  origin: [
    "http://localhost:5173",
    "https://ashok-tex-g71m.vercel.app"
  ],
  credentials: true
}))

app.use(express.json({ limit: bodyLimit }))
app.use(express.urlencoded({ extended: true, limit: bodyLimit }))

// Routes
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

app.get('/api/health', (_, res) => res.json({ status: 'ok', ts: new Date() }))

app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(err.status || 500).json({ message: err.message || 'Internal Server Error' })
})

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB connected')
    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`))
  })
  .catch(err => {
    console.error('❌ MongoDB connection failed:', err.message)
    process.exit(1)
  })