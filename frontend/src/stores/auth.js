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

  async function login(username, password) {
    loading.value = true; error.value = null
    try {
      const res = await api.post('/auth/login', { username, password })
      user.value = res.data.user
      localStorage.setItem('at-user', JSON.stringify(user.value))
      return true
    } catch (e) { error.value = e.response?.data?.message || 'Login failed'; return false }
    finally { loading.value = false }
  }

  async function logout() {
    try { await api.post('/auth/logout') } catch {}
    user.value = null
    localStorage.removeItem('at-user')
  }

  return { user, loading, error, isLoggedIn, login, logout }
})
