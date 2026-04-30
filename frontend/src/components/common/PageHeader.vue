<template>
  <div class="page-header">
    <div>
      <div class="page-title">{{ title }}</div>
      <div v-if="sub" class="page-sub">{{ sub }}</div>
    </div>
    <div class="d-flex gap-2 flex-wrap">
      <slot />
    </div>
  </div>
</template>
<script setup>
defineProps({ title: String, sub: String })
</script>
