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
let lastRefreshTime = 0
const REFRESH_INTERVAL = 20 * 60 * 1000  // Try refresh every 20 minutes (token lasts 24h)

function processQueue(error) {
  failedQueue.forEach(p => error ? p.reject(error) : p.resolve())
  failedQueue = []
}

// Request interceptor: Proactively refresh token periodically
api.interceptors.request.use(
  async config => {
    const now = Date.now()
    // Proactively refresh token every 20 minutes to prevent expiration
    if (now - lastRefreshTime > REFRESH_INTERVAL && !isRefreshing) {
      isRefreshing = true
      try {
        await api.post('/auth/refresh')
        lastRefreshTime = now
      } catch {
        // Silent fail - user will be prompted when making actual requests
      } finally {
        isRefreshing = false
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
    const isAuthRoute = url.includes('/auth/login') || url.includes('/auth/refresh') || url.includes('/auth/logout')

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
        await api.post('/auth/refresh')
        lastRefreshTime = Date.now()
        processQueue(null)
        return api(original)
      } catch (refreshErr) {
        console.error('❌ Session expired - redirecting to login')
        processQueue(new Error('Session expired'))
        localStorage.removeItem('at-user')
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

