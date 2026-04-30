const router = require('express').Router()
const ah     = require('express-async-handler')
const auth   = require('../middleware/auth')
const { Nool } = require('../models')

router.use(auth)

const noolPopulate = {
  path: 'order',
  select: 'orderName company',
  populate: { path: 'company', select: 'name' },
}

router.get('/', ah(async (req, res) => {
  const f = {}
  if (req.query.orderId) f.order = req.query.orderId
   res.json(await Nool.find(f).populate(noolPopulate).sort({ date: -1, createdAt: -1 }))
}))

router.post('/', ah(async (req, res) => {
  const doc = await Nool.create(req.body)
  await doc.populate(noolPopulate)

  res.status(201).json(doc)
}))

router.put('/:id', ah(async (req, res) => {
   const doc = await Nool.findByIdAndUpdate(req.params.id, req.body, { new: true }).populate(noolPopulate)
  doc ? res.json(doc) : res.status(404).json({ message: 'Not found' })
}))

router.delete('/:id', ah(async (req, res) => {
  await Nool.findByIdAndDelete(req.params.id)
  res.json({ message: 'Deleted' })
}))

module.exports = router
