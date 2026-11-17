const router = require('express').Router()
const ah = require('express-async-handler')
const auth = require('../middleware/auth')
const { Target } = require('../models')

router.use(auth)

const TARGET_FIELDS = ['monthlyProductionMeter', 'monthlyCollectionAmount', 'maxRejectionPct']

function toNumber(value, { min = 0, max = Infinity } = {}) {
  const n = Number(value)
  if (!Number.isFinite(n)) return null
  return Math.min(max, Math.max(min, n))
}

router.get('/targets', ah(async (_req, res) => {
  const doc = await Target.findOne().lean()
  res.json(doc || { monthlyProductionMeter: 0, monthlyCollectionAmount: 0, maxRejectionPct: 3 })
}))

router.put('/targets', ah(async (req, res) => {
  const update = {}
  for (const field of TARGET_FIELDS) {
    if (req.body[field] === undefined) continue
    const n = toNumber(req.body[field], field === 'maxRejectionPct' ? { min: 0, max: 100 } : { min: 0 })
    if (n === null) return res.status(400).json({ message: `${field} must be a number` })
    update[field] = n
  }
  if (!Object.keys(update).length) return res.status(400).json({ message: 'No target fields provided' })
  update.updatedBy = req.user?.username || req.user?.name || ''
  const doc = await Target.findOneAndUpdate({}, { $set: update }, { new: true, upsert: true, setDefaultsOnInsert: true }).lean()
  res.json(doc)
}))

module.exports = router
