import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL
const baseURL = API_URL ? `${API_URL}/api` : '/api'

const api = axios.create({
  baseURL,
  timeout: 15000,
})

api.interceptors.request.use(config => {
  const token = localStorage.getItem('at-token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  res => res,
  err => {
    const isLoginRequest = err.config?.url?.includes('/auth/login')
    if (err.response?.status === 401 && !isLoginRequest) {
      localStorage.removeItem('at-token')
      localStorage.removeItem('at-user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api
