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

function processQueue(error) {
  failedQueue.forEach(p => error ? p.reject(error) : p.resolve())
  failedQueue = []
}

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
        await api.post('/auth/refresh')
        processQueue(null)
        return api(original)
      } catch {
        processQueue(new Error('Session expired'))
        localStorage.removeItem('at-user')
        window.location.href = '/login'
        return Promise.reject(err)
      } finally {
        isRefreshing = false
      }
    }
    return Promise.reject(err)
  }
)

export default api
