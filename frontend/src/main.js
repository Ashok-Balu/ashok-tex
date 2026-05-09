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



