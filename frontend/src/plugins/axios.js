import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL
const baseURL = API_URL ? `${API_URL}/api` : '/api'

const api = axios.create({
  baseURL,
  timeout: 15000,
  withCredentials: true,   // send httpOnly cookies automatically
})

// Silent token refresh logic
let isRefreshing = false
let failedQueue = []
let lastRefreshTime = Date.now()  // Initialize to NOW to prevent immediate refresh on first request
const REFRESH_INTERVAL = 10 * 60 * 1000  // Try refresh every 10 minutes (token lasts 24h)

function processQueue(error) {
  failedQueue.forEach(p => error ? p.reject(error) : p.resolve())
  failedQueue = []
}

// Request interceptor: Proactively refresh token periodically (but not on auth routes)
api.interceptors.request.use(
  async config => {
    const url = config.url || ''
    const isAuthRoute = url.includes('/auth/login') || url.includes('/auth/refresh') || url.includes('/auth/logout') || url.includes('/auth/session')

    const storedToken = localStorage.getItem('at-token')
    if (storedToken && !config.headers?.Authorization) {
      config.headers = {
        ...config.headers,
        Authorization: `Bearer ${storedToken}`,
      }
    }

    // Prevent stale GET responses after create/update/delete operations.
    if ((config.method || 'get').toLowerCase() === 'get' && !config.skipCacheBust) {
      config.params = {
        ...(config.params || {}),
        _ts: config.params?._ts || Date.now(),
      }
    }
    
    // Only refresh on non-auth routes, and only if interval has passed
    if (!isAuthRoute) {
      const now = Date.now()
      if (now - lastRefreshTime > REFRESH_INTERVAL && !isRefreshing) {
        isRefreshing = true
        lastRefreshTime = now  // Stamp immediately to prevent parallel refresh calls
        // Fire-and-forget — do NOT await; refreshing in background so the current
        // request is not blocked by the round-trip to /auth/refresh.
        api.post('/auth/refresh').catch(() => {}).finally(() => { isRefreshing = false })
      }
    }
    return config
  },
  error => Promise.reject(error)
)

// Response interceptor: Handle 401 and refresh token
api.interceptors.response.use(
  res => res,
  async err => {
    const original = err.config
    const url = original?.url || ''
    const isAuthRoute = url.includes('/auth/login') || url.includes('/auth/refresh') || url.includes('/auth/logout') || url.includes('/auth/session')

    if (err.response?.status === 401 && !isAuthRoute && !original._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then(() => api(original)).catch(e => Promise.reject(e))
      }
      
      original._retry = true
      isRefreshing = true
      try {
        console.warn('⚠️  Token expired, attempting refresh...')
        const refreshRes = await api.post('/auth/refresh')
        if (refreshRes.data?.accessToken) {
          localStorage.setItem('at-token', refreshRes.data.accessToken)
        }
        lastRefreshTime = Date.now()
        processQueue(null)
        return api(original)
      } catch (refreshErr) {
        console.error('❌ Session expired - redirecting to login')
        processQueue(new Error('Session expired'))
        localStorage.removeItem('at-user')
        localStorage.removeItem('at-token')
        window.location.href = '/login'
        return Promise.reject(refreshErr)
      } finally {
        isRefreshing = false
      }
    }
    return Promise.reject(err)
  }
)

export default api

