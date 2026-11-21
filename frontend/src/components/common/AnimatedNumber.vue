<template>
  <span class="animated-number">{{ display }}</span>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'

const props = defineProps({
  value: { type: Number, default: 0 },
  format: { type: Function, default: v => String(Math.round(v)) },
  duration: { type: Number, default: 900 },
})

const current = ref(0)
const display = computed(() => props.format(current.value))
let raf = null

function animate(from, to) {
  if (raf) cancelAnimationFrame(raf)
  const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  if (reduce || !Number.isFinite(to)) { current.value = Number.isFinite(to) ? to : 0; return }
  const start = performance.now()
  const step = now => {
    const t = Math.min(1, (now - start) / props.duration)
    const eased = 1 - Math.pow(1 - t, 3)
    current.value = from + (to - from) * eased
    if (t < 1) raf = requestAnimationFrame(step)
    else current.value = to
  }
  raf = requestAnimationFrame(step)
}

watch(() => props.value, (to, from) => animate(Number(from || 0), Number(to || 0)), { immediate: true })
onBeforeUnmount(() => { if (raf) cancelAnimationFrame(raf) })
</script>

<style scoped>
.animated-number { font-variant-numeric: tabular-nums; }
</style>
