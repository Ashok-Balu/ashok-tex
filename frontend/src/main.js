import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import i18n from './plugins/i18n'
import vuetify from './plugins/vuetify'
import App from './App.vue'
import { useAuthStore } from './stores/auth'
import api from '@/plugins/axios'

import './styles/main.scss'

const app = createApp(App)

const pinia = createPinia()
app.use(pinia)
app.use(router)
app.use(i18n)
app.use(vuetify)

app.mount('#app')

const isNativeDateInput = target =>
  target instanceof HTMLInputElement && target.type === 'date'

const allowedDateKeys = new Set([
  'Tab',
  'Enter',
  'Escape',
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'ArrowDown',
  'Home',
  'End',
])

// Enforce date selection via picker only (no manual typing/paste).
document.addEventListener('keydown', event => {
  if (!isNativeDateInput(event.target)) return
  if (event.ctrlKey || event.metaKey || event.altKey) return
  if (allowedDateKeys.has(event.key)) return
  event.preventDefault()
}, true)

document.addEventListener('beforeinput', event => {
  if (!isNativeDateInput(event.target)) return
  if (event.inputType?.startsWith('insert') || event.inputType === 'deleteContentBackward' || event.inputType === 'deleteContentForward') {
    event.preventDefault()
  }
}, true)

document.addEventListener('paste', event => {
  if (isNativeDateInput(event.target)) event.preventDefault()
}, true)

document.addEventListener('drop', event => {
  if (isNativeDateInput(event.target)) event.preventDefault()
}, true)

// Restore session on app startup (after mount to avoid top-level await)
const authStore = useAuthStore()
authStore.restoreSession()

// Mobile fix: Check session when app comes back into focus
// (User might have switched apps, cookies could be cleared)
document.addEventListener('visibilitychange', async () => {
  if (document.visibilityState === 'visible') {
    // App came back into focus - verify session is still valid
    if (authStore.isLoggedIn) {
      try {
        await api.get('/auth/session')
      } catch (err) {
        if (err.response?.status === 401) {
          authStore.logout()
        }
      }
    }
  }
})



