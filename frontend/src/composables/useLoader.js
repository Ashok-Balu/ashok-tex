import { ref, computed } from 'vue'

// Count of in-flight API requests (drives the global top progress bar)
const pending = ref(0)
// Blocking overlay for actions that have no button-level loader
const busyCount = ref(0)
const busyText = ref('')

export function useLoader() {
  function start() { pending.value++ }
  function done() { pending.value = Math.max(0, pending.value - 1) }

  async function run(task, message = '') {
    busyCount.value++
    busyText.value = message
    try {
      return await (typeof task === 'function' ? task() : task)
    } finally {
      busyCount.value = Math.max(0, busyCount.value - 1)
      if (!busyCount.value) busyText.value = ''
    }
  }

  return {
    pending,
    isLoading: computed(() => pending.value > 0),
    isBusy: computed(() => busyCount.value > 0),
    busyText,
    start,
    done,
    run,
  }
}
