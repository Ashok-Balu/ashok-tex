// Safe request logger — redacts sensitive fields so they never appear in logs
const REDACTED = '[REDACTED]'
const SENSITIVE_KEYS = new Set([
  'password', 'passwordConfirm', 'currentPassword', 'newPassword',
  'token', 'accessToken', 'refreshToken', 'jwt',
  'secret', 'apiKey', 'api_key', 'authorization',
  'cardNumber', 'cvv', 'ssn', 'pan',
])

function redact(obj, depth = 0) {
  if (depth > 5 || !obj || typeof obj !== 'object') return obj
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [
      k,
      SENSITIVE_KEYS.has(k.toLowerCase()) ? REDACTED : redact(v, depth + 1),
    ])
  )
}

const IS_PROD = process.env.NODE_ENV === 'production'

module.exports = (req, res, next) => {
  if (IS_PROD) return next()   // skip verbose logging in production
  const body = req.body && Object.keys(req.body).length ? redact(req.body) : undefined
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}${body ? ' ' + JSON.stringify(body) : ''}`)
  next()
}
