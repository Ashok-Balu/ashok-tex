const router  = require('express').Router()
const bcrypt  = require('bcryptjs')
const jwt     = require('jsonwebtoken')
const crypto  = require('crypto')
const ah      = require('express-async-handler')
const auth    = require('../middleware/auth')
const rateLimit = require('express-rate-limit')
const { body, validationResult } = require('express-validator')
const { User, RefreshToken } = require('../models')

const IS_PROD = process.env.NODE_ENV === 'production'

// ── Per-route rate limiters ───────────────────────────────────────────────────
// Login: max 5 FAILED attempts per 30 min (successful requests not counted)
const loginLimiter = rateLimit({
  windowMs: 30 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many failed login attempts. Try again in 30 minutes.' },
})

// Register: max 3 per hour per IP
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many registration attempts. Try again in 1 hour.' },
})

// ── Validation rules ─────────────────────────────────────────────────────────
const loginValidation = [
  body('username').trim().notEmpty().withMessage('Username required').isLength({ max: 100 }),
  body('password').notEmpty().withMessage('Password required').isLength({ max: 200 }),
]

const registerValidation = [
  body('username').trim().notEmpty().withMessage('Username required')
    .isLength({ min: 3, max: 50 }).withMessage('Username must be 3–50 characters')
    .matches(/^[a-zA-Z0-9_]+$/).withMessage('Username may only contain letters, numbers and underscores'),
  body('password').notEmpty().withMessage('Password required')
    .isLength({ min: 8, max: 200 }).withMessage('Password must be at least 8 characters'),
  body('role').optional().isIn(['admin', 'user']).withMessage('Role must be admin or user'),
]

function validate(req, res, next) {
  const errors = validationResult(req)
  if (!errors.isEmpty()) return res.status(422).json({ message: errors.array()[0].msg })
  next()
}

// Cookie options — httpOnly so JS cannot read them (XSS-safe)
const COOKIE_BASE = {
  httpOnly: true,
  secure:   IS_PROD,           // HTTPS only in production
  sameSite: IS_PROD ? 'none' : 'lax',
  path:     '/',
}

function setAccessCookie(res, user) {
  const token = jwt.sign(
    { id: user._id, username: user.username, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  )
  res.cookie('accessToken', token, { ...COOKIE_BASE, maxAge: 24 * 60 * 60 * 1000 })
}

async function setRefreshCookie(res, userId) {
  const raw   = crypto.randomBytes(64).toString('hex')
  const hash  = crypto.createHash('sha256').update(raw).digest('hex')
  const expAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  await RefreshToken.deleteMany({ user: userId })   // one active refresh per user
  await RefreshToken.create({ tokenHash: hash, user: userId, expiresAt: expAt })
  res.cookie('refreshToken', raw, { ...COOKIE_BASE, maxAge: 30 * 24 * 60 * 60 * 1000 })
}

// POST /api/auth/login
router.post('/login', loginLimiter, loginValidation, validate, ah(async (req, res) => {
  const { username, password } = req.body
  if (!username || !password)
    return res.status(400).json({ message: 'Username and password required' })

  const user = await User.findOne({ username: username.toLowerCase() })
  if (!user) return res.status(401).json({ message: 'Invalid credentials' })

  const ok = await bcrypt.compare(password, user.password)
  if (!ok) return res.status(401).json({ message: 'Invalid credentials' })

  setAccessCookie(res, user)
  await setRefreshCookie(res, user._id)
  res.json({ user: { id: user._id, username: user.username, role: user.role } })
}))

// POST /api/auth/refresh — silent token renewal using refresh cookie
router.post('/refresh', ah(async (req, res) => {
  const raw = req.cookies?.refreshToken
  if (!raw) return res.status(401).json({ message: 'No refresh token' })

  const hash   = crypto.createHash('sha256').update(raw).digest('hex')
  const stored = await RefreshToken.findOne({ tokenHash: hash }).populate('user')

  if (!stored || stored.expiresAt < new Date()) {
    res.clearCookie('accessToken',  COOKIE_BASE)
    res.clearCookie('refreshToken', COOKIE_BASE)
    return res.status(401).json({ message: 'Refresh token expired, please log in again' })
  }

  setAccessCookie(res, stored.user)
  res.json({ user: { id: stored.user._id, username: stored.user.username, role: stored.user.role } })
}))

// POST /api/auth/logout — invalidate refresh token and clear cookies
router.post('/logout', ah(async (req, res) => {
  const raw = req.cookies?.refreshToken
  if (raw) {
    const hash = crypto.createHash('sha256').update(raw).digest('hex')
    await RefreshToken.deleteOne({ tokenHash: hash })
  }
  res.clearCookie('accessToken',  COOKIE_BASE)
  res.clearCookie('refreshToken', COOKIE_BASE)
  res.json({ message: 'Logged out' })
}))

// GET /api/auth/session — verify session is valid (for mobile Chrome compatibility)
router.get('/session', auth, ah(async (req, res) => {
  res.json({ 
    valid: true, 
    user: {
      id: req.user.id,
      username: req.user.username,
      role: req.user.role
    }
  })
}))

// POST /api/auth/register — admin only
router.post('/register', registerLimiter, auth, registerValidation, validate, ah(async (req, res) => {
  if (req.user?.role !== 'admin')
    return res.status(403).json({ message: 'Forbidden – admin only' })

  const { username, password, role } = req.body
  if (!username || !password)
    return res.status(400).json({ message: 'Username and password required' })

  if (await User.findOne({ username: username.toLowerCase() }))
    return res.status(409).json({ message: 'Username already exists' })

  const hash = await bcrypt.hash(password, 12)   // salt rounds: 12
  const user = await User.create({ username: username.toLowerCase(), password: hash, role: role || 'user' })
  res.status(201).json({ message: 'User created', id: user._id })
}))

module.exports = router
