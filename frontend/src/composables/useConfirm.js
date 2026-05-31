import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

const show    = ref(false)
const message = ref('')
const title = ref('')
const confirmText = ref('')
const confirmColor = ref('error')
let _resolve  = null

export function useConfirm() {
  const { t } = useI18n()

  function confirm(input) {
    if (typeof input === 'object' && input !== null) {
      title.value = input.title || t('confirmAction')
      message.value = input.message || t('confirmMessage')
      confirmText.value = input.confirmText || t('confirm')
      confirmColor.value = input.confirmColor || 'primary'
    } else {
      title.value = t('deleteConfirm')
      message.value = input || t('deleteMessage')
      confirmText.value = t('delete')
      confirmColor.value = 'error'
    }
    show.value = true
    return new Promise(res => { _resolve = res })
  }

  function resetDialogState() {
    title.value = ''
    message.value = ''
    confirmText.value = ''
    confirmColor.value = 'error'
  }

  function onConfirm() {
    show.value = false
    _resolve?.(true)
    _resolve = null
    resetDialogState()
  }

  function onCancel() {
    show.value = false
    _resolve?.(false)
    _resolve = null
    resetDialogState()
  }

  return { show, title, message, confirmText, confirmColor, confirm, onConfirm, onCancel }
}
