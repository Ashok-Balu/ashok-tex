// ── auth.js ───────────────────────────────────────────────────────────────────
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/plugins/axios'

export const useAuthStore = defineStore('auth', () => {
  // Token lives in httpOnly cookie — never stored in JS
  // Only store non-sensitive user display info in localStorage
  const user    = ref(JSON.parse(localStorage.getItem('at-user') || 'null'))
  const loading = ref(false)
  const error   = ref(null)
  const isLoggedIn = computed(() => !!user.value)
  let sessionCheckInterval = null

  async function login(username, password) {
    loading.value = true; error.value = null
    try {
      const res = await api.post('/auth/login', { username, password })
      user.value = res.data.user
      localStorage.setItem('at-user', JSON.stringify(user.value))
      setTimeout(() => {
        if (user.value) startSessionCheck()
      }, 3000)  // Delay session check so Chrome has time to persist cookies
      return true
    } catch (e) { error.value = e.response?.data?.message || 'Login failed'; return false }
    finally { loading.value = false }
  }

  async function logout() {
    try { await api.post('/auth/logout') } catch {}
    user.value = null
    localStorage.removeItem('at-user')
    stopSessionCheck()
  }

  // Periodically verify session is valid (every 5 minutes for mobile)
  // This catches cases where tokens expire silently, especially on mobile Chrome
  function startSessionCheck() {
    if (sessionCheckInterval) return
    
    let firstCheckDone = false
    const check = async () => {
      try {
        await api.get('/auth/session')
        firstCheckDone = true
      } catch (err) {
        if (err.response?.status === 401) {
          if (!firstCheckDone) {
            console.warn('⚠️ First session validation failed, retrying...')
            firstCheckDone = true
            setTimeout(check, 2000)
            return
          }
          console.warn('❌ Session lost - user logged out')
          await logout()
        }
      }
    }

    // Start checking after 3 seconds (avoid premature logout on mobile Chrome)
    // Then every 5 minutes to catch token expiration
    setTimeout(check, 3000)
    sessionCheckInterval = setInterval(check, 5 * 60 * 1000)
  }

  function stopSessionCheck() {
    if (sessionCheckInterval) {
      clearInterval(sessionCheckInterval)
      sessionCheckInterval = null
    }
  }

  // Check session on app startup
  async function restoreSession() {
    if (user.value) {
      try {
        await api.get('/auth/session')
        startSessionCheck()  // Only start checking if session validation succeeds
      } catch (err) {
        // If session validation fails, only logout on 401
        // Other errors (network, timeout) don't trigger logout
        if (err.response?.status === 401) {
          console.warn('Session validation failed - logging out')
          user.value = null
          localStorage.removeItem('at-user')
        }
      }
    }
  }

  return { user, loading, error, isLoggedIn, login, logout, restoreSession }
})
