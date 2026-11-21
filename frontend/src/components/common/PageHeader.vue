<template>
  <div class="page-header">
    <span class="ph-orb ph-orb-a" aria-hidden="true"></span>
    <span class="ph-orb ph-orb-b" aria-hidden="true"></span>
    <img v-if="art" class="ph-art" :src="art" alt="" aria-hidden="true" />
    <svg class="ph-weave" viewBox="0 0 220 80" aria-hidden="true">
      <path d="M0 20 C40 0 70 40 110 20 S180 0 220 20" />
      <path d="M0 40 C40 20 70 60 110 40 S180 20 220 40" />
      <path d="M0 60 C40 40 70 80 110 60 S180 40 220 60" />
    </svg>
    <div class="page-header-info">
      <div class="ph-icon">
        <v-icon size="26" color="white">{{ resolvedIcon }}</v-icon>
      </div>
      <div class="ph-text">
        <div class="page-title">{{ title }}</div>
        <div v-if="sub" class="page-sub">{{ sub }}</div>
      </div>
    </div>
    <div class="page-header-actions">
      <slot />
    </div>
  </div>
</template>
<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const props = defineProps({ title: String, sub: String, icon: String })
const route = useRoute()

const routeIcons = {
  orders: 'mdi-package-variant',
  expenses: 'mdi-receipt-text',
  'company-statement': 'mdi-file-table-box',
}
const resolvedIcon = computed(() => props.icon || routeIcons[route.name] || 'mdi-view-dashboard')

const routeArt = {
  orders: '/art/orders-art.svg',
  'company-statement': '/art/statement-art.svg',
}
const art = computed(() => routeArt[route.name] || '')
</script>
<style scoped>
.page-header {
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 24px;
  padding: 18px 22px;
  border-radius: 20px;
  border: 1px solid #dbe6f7;
  background: linear-gradient(120deg, #ffffff 0%, #f1f6ff 55%, #e6efff 100%);
  box-shadow: 0 10px 30px -18px rgba(30, 64, 175, 0.35);
}

.page-header::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  background: linear-gradient(180deg, #1e40af, #f59e0b);
}

.ph-orb {
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
}

.ph-orb-a {
  width: 160px;
  height: 160px;
  right: -40px;
  top: -70px;
  background: radial-gradient(circle, rgba(59, 130, 246, 0.25), transparent 70%);
}

.ph-orb-b {
  width: 120px;
  height: 120px;
  right: 22%;
  bottom: -60px;
  background: radial-gradient(circle, rgba(245, 158, 11, 0.22), transparent 70%);
}

.ph-weave {
  position: absolute;
  right: 12px;
  bottom: 6px;
  width: 220px;
  height: 80px;
  fill: none;
  stroke: rgba(30, 64, 175, 0.16);
  stroke-width: 2;
  stroke-dasharray: 6 8;
  pointer-events: none;
}

.ph-icon {
  flex-shrink: 0;
  width: 52px;
  height: 52px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #1565c0, #3b82f6);
  box-shadow: 0 10px 22px -8px rgba(21, 101, 192, 0.6);
}

.ph-text { min-width: 0; }

.ph-art {
  position: absolute;
  right: 24px;
  bottom: 0;
  height: min(100%, 120px);
  width: auto;
  opacity: 0.35;
  pointer-events: none;
  z-index: 0;
}

@media (max-width: 1100px) {
  .ph-art { display: none; }
}

@media (prefers-reduced-motion: no-preference) {
  .ph-icon { animation: ph-pulse 3.4s ease-in-out infinite; }
  .ph-weave path { animation: ph-flow 6s linear infinite; }
  .ph-orb-a { animation: ph-drift 9s ease-in-out infinite alternate; }
}

@keyframes ph-pulse {
  0%, 100% { box-shadow: 0 10px 22px -8px rgba(21, 101, 192, 0.6), 0 0 0 0 rgba(59, 130, 246, 0.35); }
  50% { box-shadow: 0 10px 22px -8px rgba(21, 101, 192, 0.6), 0 0 0 12px rgba(59, 130, 246, 0); }
}

@keyframes ph-flow {
  to { stroke-dashoffset: -56; }
}

@keyframes ph-drift {
  to { transform: translate(-24px, 18px); }
}

.page-header-info {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
  flex: 1;
}

.page-title {
  font-size: 24px;
  font-weight: 800;
  color: #1A2744;
  line-height: 1.2;
  letter-spacing: -0.3px;
}

.page-sub {
  font-size: 13px;
  color: #5A6A85;
  margin-top: 4px;
}

.page-header-actions {
  position: relative;
  z-index: 1;
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
    padding: 14px 14px 14px 18px;
    border-radius: 16px;
  }

  .ph-icon { width: 42px; height: 42px; border-radius: 13px; }
  .ph-weave { display: none; }

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
