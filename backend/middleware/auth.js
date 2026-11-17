const jwt = require('jsonwebtoken')

module.exports = (req, res, next) => {
  // Accept the httpOnly cookie or the Authorization header; a stale cookie must not shadow a valid bearer token
  const candidates = []
  if (req.cookies?.accessToken) candidates.push(req.cookies.accessToken)
  const header = req.headers.authorization
  if (header?.startsWith('Bearer ')) candidates.push(header.split(' ')[1])

  if (!candidates.length)
    return res.status(401).json({ message: 'Unauthorized – no token' })

  for (const token of candidates) {
    try {
      req.user = jwt.verify(token, process.env.JWT_SECRET)
      return next()
    } catch { /* try the next candidate */ }
  }
  res.status(401).json({ message: 'Token invalid or expired' })
}
