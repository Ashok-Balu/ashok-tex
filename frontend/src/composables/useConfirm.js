import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

const show    = ref(false)
const message = ref('')
let _resolve  = null

export function useConfirm() {
  const { t } = useI18n()

  function confirm(msg) {
    message.value = msg || t('deleteMessage')
    show.value = true
    return new Promise(res => { _resolve = res })
  }

  function onConfirm() { show.value = false; _resolve?.(true) }
  function onCancel()  { show.value = false; _resolve?.(false) }

  return { show, message, confirm, onConfirm, onCancel }
}
