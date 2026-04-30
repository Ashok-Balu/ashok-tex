const router = require('express').Router()
const bcrypt = require('bcryptjs')
const jwt    = require('jsonwebtoken')
const ah     = require('express-async-handler')
const { User } = require('../models')

// POST /api/auth/login
router.post('/login', ah(async (req, res) => {
  const { username, password } = req.body
  if (!username || !password)
    return res.status(400).json({ message: 'Username and password required' })

  const user = await User.findOne({ username: username.toLowerCase() })
  if (!user) return res.status(401).json({ message: 'Invalid credentials' })

  const ok = await bcrypt.compare(password, user.password)
  if (!ok)  return res.status(401).json({ message: 'Invalid credentials' })

  const token = jwt.sign(
    { id: user._id, username: user.username, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  )
  res.json({ token, user: { id: user._id, username: user.username, role: user.role } })
}))

// POST /api/auth/register  (used during setup / by admin)
router.post('/register', ah(async (req, res) => {
  const { username, password, role } = req.body
  if (!username || !password)
    return res.status(400).json({ message: 'Username and password required' })

  if (await User.findOne({ username: username.toLowerCase() }))
    return res.status(409).json({ message: 'Username already exists' })

  const hash = await bcrypt.hash(password, 10)
  const user = await User.create({ username: username.toLowerCase(), password: hash, role: role || 'user' })
  res.status(201).json({ message: 'User created', id: user._id })
}))

module.exports = router
