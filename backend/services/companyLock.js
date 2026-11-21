// Serialises balance-changing operations per company so concurrent requests cannot overspend a balance.
// In-process only: sufficient for the single-instance deployment; multi-instance would need a DB-level lock.
const tails = new Map()

async function withCompanyLock(companyId, fn) {
  const key = String(companyId)
  const prev = tails.get(key) || Promise.resolve()
  let release
  const gate = new Promise(resolve => { release = resolve })
  const tail = prev.then(() => gate)
  tails.set(key, tail)
  await prev
  try {
    return await fn()
  } finally {
    release()
    if (tails.get(key) === tail) tails.delete(key)
  }
}

// Express middleware: holds the lock for `keyFn(req)` until the response has been sent.
function lockUntilResponse(keyFn) {
  return (req, res, next) => {
    const key = keyFn(req)
    if (!key) return next()
    withCompanyLock(key, () => new Promise(resolve => {
      res.once('finish', resolve)
      res.once('close', resolve)
      next()
    }))
  }
}

module.exports = { withCompanyLock, lockUntilResponse }
