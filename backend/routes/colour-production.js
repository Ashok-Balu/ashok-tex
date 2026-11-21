const router = require('express').Router()
const ah     = require('express-async-handler')
const auth   = require('../middleware/auth')
const { ColourProduction, Order } = require('../models')

router.use(auth)

function pickFields(body) {
  const data = {
    colour: String(body.colour || '').trim(),
    meter:  Number(body.meter),
    notes:  String(body.notes || '').trim(),
  }
  if (body.date) data.date = body.date
  return data
}

function validateFields(data) {
  if (!data.colour) return 'Colour is required'
  if (!(data.meter > 0)) return 'Meter must be greater than 0'
  return null
}

async function checkOrderEditable(orderId) {
  const order = await Order.findById(orderId).select('productionClosed')
  if (!order) return { status: 404, message: 'Order not found' }
  if (order.productionClosed) return { status: 400, message: 'Order production is closed. Colour entries are locked.' }
  return null
}

router.get('/', ah(async (req, res) => {
  const f = {}
  if (req.query.orderId) f.order = req.query.orderId
  res.json(await ColourProduction.find(f).sort({ date: -1, createdAt: -1 }).lean())
}))

router.post('/', ah(async (req, res) => {
  const data = pickFields(req.body)
  const invalid = validateFields(data)
  if (invalid) return res.status(400).json({ message: invalid })
  const blocked = await checkOrderEditable(req.body.order)
  if (blocked) return res.status(blocked.status).json({ message: blocked.message })
  const doc = await ColourProduction.create({ ...data, order: req.body.order })
  res.status(201).json(doc)
}))

router.put('/:id', ah(async (req, res) => {
  const existing = await ColourProduction.findById(req.params.id).select('order')
  if (!existing) return res.status(404).json({ message: 'Not found' })
  const blocked = await checkOrderEditable(existing.order)
  if (blocked) return res.status(blocked.status).json({ message: blocked.message })
  const data = pickFields(req.body)
  const invalid = validateFields(data)
  if (invalid) return res.status(400).json({ message: invalid })
  const doc = await ColourProduction.findByIdAndUpdate(req.params.id, data, { new: true, runValidators: true })
  res.json(doc)
}))

router.delete('/:id', ah(async (req, res) => {
  const existing = await ColourProduction.findById(req.params.id).select('order')
  if (!existing) return res.status(404).json({ message: 'Not found' })
  const blocked = await checkOrderEditable(existing.order)
  if (blocked) return res.status(blocked.status).json({ message: blocked.message })
  await ColourProduction.findByIdAndDelete(req.params.id)
  res.json({ message: 'Deleted', deletedId: req.params.id })
}))

module.exports = router
