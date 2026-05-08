const jwt = require('jsonwebtoken')

module.exports = (req, res, next) => {
  // Read from httpOnly cookie first, fall back to Authorization header
  let token = req.cookies?.accessToken
  if (!token) {
    const header = req.headers.authorization
    if (header?.startsWith('Bearer ')) token = header.split(' ')[1]
  }
  if (!token)
    return res.status(401).json({ message: 'Unauthorized – no token' })
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET)
    next()
  } catch {
    res.status(401).json({ message: 'Token invalid or expired' })
  }
}
