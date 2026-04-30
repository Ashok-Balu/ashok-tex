import { ref } from 'vue'

const show = ref(false)
const text = ref('')
const color = ref('success')
const timeout = ref(2500)

export function useNotify() {
  function open(message, tone = 'success', duration = 2500) {
    text.value = message || ''
    color.value = tone
    timeout.value = duration
    show.value = true
  }

  function success(message, duration) {
    open(message, 'success', duration)
  }

  function error(message, duration) {
    open(message, 'error', duration)
  }

  function close() {
    show.value = false
  }

  return { show, text, color, timeout, open, success, error, close }
}
