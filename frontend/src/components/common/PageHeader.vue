<template>
  <div class="page-header">
    <div class="page-header-info">
      <div class="page-title">{{ title }}</div>
      <div v-if="sub" class="page-sub">{{ sub }}</div>
    </div>
    <div class="page-header-actions">
      <slot />
    </div>
  </div>
</template>
<script setup>
defineProps({ title: String, sub: String })
</script>
<style scoped>
.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 24px;
}

.page-header-info {
  min-width: 0;
  flex: 1;
}

.page-title {
  font-size: 22px;
  font-weight: 800;
  color: #1A2744;
  line-height: 1.2;
}

.page-sub {
  font-size: 13px;
  color: #5A6A85;
  margin-top: 4px;
}

.page-header-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
}

@media (max-width: 1024px) {
  .page-header {
    gap: 12px;
  }

  .page-title {
    font-size: 20px;
  }
}

@media (max-width: 767px) {
  .page-header {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
    margin-bottom: 16px;
  }

  .page-title {
    font-size: 18px;
  }

  .page-sub {
    font-size: 12px;
  }

  .page-header-actions {
    width: 100%;
    flex-direction: column;
    align-items: stretch;
  }
}

@media (max-width: 480px) {
  .page-header {
    margin-bottom: 12px;
  }

  .page-title {
    font-size: 16px;
  }
}
</style>
