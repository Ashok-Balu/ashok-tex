import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import i18n from './plugins/i18n'
import vuetify from './plugins/vuetify'
import App from './App.vue'
import { useAuthStore } from './stores/auth'

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

