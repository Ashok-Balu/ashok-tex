<template>
  <div class="at-empty" role="status">
    <div class="at-empty-art" aria-hidden="true">
      <span class="at-empty-ring r1"></span>
      <span class="at-empty-ring r2"></span>
      <span class="at-empty-dot d1"></span>
      <span class="at-empty-dot d2"></span>
      <span class="at-empty-dot d3"></span>
      <div class="at-empty-icon">
        <v-icon :size="size" color="white">{{ icon }}</v-icon>
      </div>
    </div>
    <p v-if="title" class="at-empty-title">{{ title }}</p>
    <p v-if="hint" class="at-empty-hint">{{ hint }}</p>
    <slot />
  </div>
</template>

<script setup>
defineProps({
  icon: { type: String, default: 'mdi-package-variant-closed' },
  title: String,
  hint: String,
  size: { type: Number, default: 34 },
})
</script>

<style scoped>
.at-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 36px 16px;
  text-align: center;
}

.at-empty-art {
  position: relative;
  width: 110px;
  height: 110px;
  margin-bottom: 10px;
  display: grid;
  place-items: center;
}

.at-empty-icon {
  position: relative;
  z-index: 1;
  width: 70px;
  height: 70px;
  border-radius: 22px;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, #94a3b8, #64748b);
  box-shadow: 0 14px 28px -12px rgba(71, 85, 105, 0.6);
  transform: rotate(-6deg);
}

.at-empty-ring {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 2px dashed rgba(100, 116, 139, 0.35);
}

.at-empty-ring.r2 { inset: 14px; border-style: solid; border-color: rgba(100, 116, 139, 0.18); }

.at-empty-dot {
  position: absolute;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #60a5fa;
}

.at-empty-dot.d1 { top: 6px; right: 14px; }
.at-empty-dot.d2 { bottom: 10px; left: 6px; background: #fbbf24; width: 6px; height: 6px; }
.at-empty-dot.d3 { top: 40px; left: -2px; background: #34d399; width: 5px; height: 5px; }

.at-empty-title {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: #334155;
}

.at-empty-hint {
  margin: 0;
  max-width: 320px;
  font-size: 13px;
  color: #94a3b8;
}

@media (prefers-reduced-motion: no-preference) {
  .at-empty-icon { animation: at-empty-float 3.6s ease-in-out infinite; }
  .at-empty-ring.r1 { animation: at-empty-spin 22s linear infinite; }
  .at-empty-ring.r2 { animation: at-empty-pulse 3s ease-in-out infinite; }
  .at-empty-dot { animation: at-empty-twinkle 2.6s ease-in-out infinite; }
  .at-empty-dot.d2 { animation-delay: -0.9s; }
  .at-empty-dot.d3 { animation-delay: -1.7s; }
  .at-empty-title,
  .at-empty-hint { animation: at-empty-rise 0.6s ease backwards; }
  .at-empty-hint { animation-delay: 0.1s; }
}

@keyframes at-empty-float {
  0%, 100% { transform: translateY(0) rotate(-6deg); }
  50% { transform: translateY(-8px) rotate(4deg); }
}

@keyframes at-empty-spin { to { transform: rotate(360deg); } }

@keyframes at-empty-pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.12); opacity: 0.5; }
}

@keyframes at-empty-twinkle {
  0%, 100% { transform: scale(1); opacity: 0.4; }
  50% { transform: scale(1.7); opacity: 1; }
}

@keyframes at-empty-rise {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: none; }
}
</style>
