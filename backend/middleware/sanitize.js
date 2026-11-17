// Strip HTML tags from all string values in req.body recursively to prevent XSS
// Credentials are excluded: altering them would silently change the password the user chose.
const RAW_KEYS = new Set(['password', 'currentPassword', 'newPassword', 'passwordConfirm'])

function sanitizeValue(val, key) {
  if (typeof val === 'string') return RAW_KEYS.has(key) ? val : val.replace(/[<>]/g, '').trim()
  if (Array.isArray(val)) return val.map(v => sanitizeValue(v, key))
  if (val && typeof val === 'object') {
    return Object.fromEntries(
      Object.entries(val).map(([k, v]) => [k, sanitizeValue(v, k)])
    )
  }
  return val
}

module.exports = (req, res, next) => {
  if (req.body) req.body = sanitizeValue(req.body)
  next()
}
