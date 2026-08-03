// Strip HTML tags from all string values in req.body recursively to prevent XSS
function sanitizeValue(val) {
  if (typeof val === 'string') return val.replace(/[<>]/g, '').trim()
  if (Array.isArray(val)) return val.map(sanitizeValue)
  if (val && typeof val === 'object') {
    return Object.fromEntries(
      Object.entries(val).map(([k, v]) => [k, sanitizeValue(v)])
    )
  }
  return val
}

module.exports = (req, res, next) => {
  if (req.body) req.body = sanitizeValue(req.body)
  next()
}
