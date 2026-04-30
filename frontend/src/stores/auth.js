// ── auth.js ───────────────────────────────────────────────────────────────────
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/plugins/axios'

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem('at-token') || null)
  const user  = ref(JSON.parse(localStorage.getItem('at-user') || 'null'))
  const loading = ref(false)
  const error   = ref(null)
  const isLoggedIn = computed(() => !!token.value)

  async function login(username, password) {
    loading.value = true; error.value = null
    try {
      const res = await api.post('/auth/login', { username, password })
      token.value = res.data.token
      user.value  = res.data.user
      localStorage.setItem('at-token', token.value)
      localStorage.setItem('at-user', JSON.stringify(user.value))
      return true
    } catch (e) { error.value = e.response?.data?.message || 'Login failed'; return false }
    finally { loading.value = false }
  }

  function logout() {
    token.value = null; user.value = null
    localStorage.removeItem('at-token'); localStorage.removeItem('at-user')
  }

  return { token, user, loading, error, isLoggedIn, login, logout }
})
