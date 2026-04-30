const router = require('express').Router()
const ah     = require('express-async-handler')
const auth   = require('../middleware/auth')
const { Expense } = require('../models')

router.use(auth)

router.get('/', ah(async (req, res) => {
  const f = {}
  if (req.query.type) f.type = req.query.type
  if (req.query.from || req.query.to) {
    f.date = {}
    if (req.query.from) f.date.$gte = new Date(req.query.from)
    if (req.query.to)   { const e = new Date(req.query.to); e.setHours(23,59,59,999); f.date.$lte = e }
  }
  const lim = parseInt(req.query.limit) || 0
  res.json(await Expense.find(f).sort({ date: -1 }).limit(lim))
}))

router.post('/',    ah(async (req, res) => res.status(201).json(await Expense.create(req.body))))
router.put('/:id',  ah(async (req, res) => {
  const d = await Expense.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
  d ? res.json(d) : res.status(404).json({ message: 'Not found' })
}))
router.delete('/:id', ah(async (req, res) => { await Expense.findByIdAndDelete(req.params.id); res.json({ message: 'Deleted' }) }))

module.exports = router
