import { ref, nextTick } from 'vue'
import i18n from '@/plugins/i18n'

const show = ref(false)
const text = ref('')
const color = ref('success')
const timeout = ref(3000)

const ICONS = { success: 'mdi-check-circle', error: 'mdi-alert-circle', warning: 'mdi-alert', info: 'mdi-information' }
const DURATIONS = { success: 3000, info: 3000, warning: 4500, error: 5000 }

const t = (key, params) => i18n.global.t(key, params)

// Turns an axios/JS error into a user-facing message.
export function getErrorMessage(error, fallback) {
  const data = error?.response?.data
  const serverMsg = typeof data === 'string' ? '' : (data?.message || data?.error)
  if (serverMsg && typeof serverMsg === 'string') return serverMsg
  if (error?.code === 'ECONNABORTED' || /timeout/i.test(error?.message || '')) return t('timeoutError')
  if (error?.isAxiosError && !error.response) return t('networkError')
  const status = error?.response?.status
  if (status === 403) return t('forbiddenError')
  if (status === 404) return fallback || t('notFoundError')
  if (status >= 500) return fallback || t('serverError')
  return fallback || t('actionFailed')
}

export function useNotify() {
  async function open(message, tone = 'success', duration) {
    // Re-trigger the snackbar so back-to-back messages restart the timer
    if (show.value) {
      show.value = false
      await nextTick()
    }
    text.value = message || ''
    color.value = tone
    timeout.value = duration || DURATIONS[tone] || 3000
    show.value = true
  }

  const success = (message, duration) => open(message, 'success', duration)
  const error = (message, duration) => open(message, 'error', duration)
  const warning = (message, duration) => open(message, 'warning', duration)
  const info = (message, duration) => open(message, 'info', duration)
  const apiError = (err, fallback, duration) => open(getErrorMessage(err, fallback), 'error', duration)

  function close() {
    show.value = false
  }

  return { show, text, color, timeout, icons: ICONS, open, success, error, warning, info, apiError, close }
}
