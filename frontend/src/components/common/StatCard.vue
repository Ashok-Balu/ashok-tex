<template>
  <v-card class="stat-card" rounded="lg">
    <div class="d-flex align-start justify-space-between stat-card-top">
      <div>
        <div class="stat-label">{{ label }}</div>
        <div class="stat-value">{{ value }}</div>
        <div v-if="sub" class="stat-sub">{{ sub }}</div>
      </div>
      <div class="stat-icon" :style="{ background: iconBg }">
        <v-icon :icon="icon" :color="iconColor" size="24" />
      </div>
    </div>
    <div class="stat-card-bottom">
      <template v-if="progress !== undefined">
        <div class="at-progress mt-3">
          <div class="at-progress-fill" :style="{ width: progress + '%', background: progressColor || '#7B1FA2' }" />
        </div>
        <div class="text-caption mt-1" style="color:#5A6A85">{{ progress }}%</div>
      </template>
      <div v-else class="stat-card-placeholder" />
    </div>
  </v-card>
</template>

<script setup>
defineProps({
  icon: String, iconColor: String, iconBg: String,
  label: String, value: [String, Number], sub: String,
  progress: Number, progressColor: String,
})
</script>

<style scoped>
.stat-card {
  height: 100%;
  min-height: 128px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  background:
    radial-gradient(280px 90px at -15% -40%, rgba(21, 101, 192, 0.14), transparent 60%),
    radial-gradient(260px 90px at 120% -40%, rgba(46, 125, 50, 0.12), transparent 60%),
    #fff;
}

.stat-card-top {
  min-height: 72px;
}

.stat-card-bottom {
  min-height: 26px;
}

.stat-card-placeholder {
  height: 26px;
}

.stat-icon {
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.2), 0 6px 14px rgba(17, 24, 39, 0.14);
}

@media (max-width: 768px) {
  .stat-card {
    min-height: 100px;
  }

  .stat-card-top {
    min-height: 60px;
  }
}

@media (max-width: 480px) {
  .stat-card {
    min-height: 88px;
  }
}
</style>
