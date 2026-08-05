<template>
  <v-text-field
    :model-value="displayValue"
    :label="label"
    :density="density"
    :variant="variant"
    :hide-details="hideDetails"
    :readonly="readonly"
    :disabled="disabled"
    inputmode="numeric"
    @focus="handleFocus"
    @blur="handleBlur"
    @update:model-value="handleInput"
  />
</template>

<script setup>
import { computed, ref } from 'vue'
import { formatIndianNumber, parseCurrencyInput } from '@/utils/currency'

const props = defineProps({
  modelValue: { type: Number, default: 0 },
  label: { type: String, default: '' },
  density: { type: String, default: 'compact' },
  variant: { type: String, default: 'outlined' },
  hideDetails: { type: [Boolean, String], default: false },
  readonly: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue'])

const isFocused = ref(false)

const displayValue = computed(() => {
  if (isFocused.value && Number(props.modelValue || 0) === 0) return ''
  return formatIndianNumber(props.modelValue || 0)
})

function handleInput(value) {
  emit('update:modelValue', parseCurrencyInput(value))
}

function handleFocus() {
  isFocused.value = true
  if (Number(props.modelValue || 0) === 0) {
    emit('update:modelValue', 0)
  }
}

function handleBlur() {
  isFocused.value = false
  const normalized = Number(props.modelValue || 0)
  emit('update:modelValue', Number.isFinite(normalized) ? normalized : 0)
}
</script>