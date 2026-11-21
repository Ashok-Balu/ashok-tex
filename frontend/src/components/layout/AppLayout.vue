<template>
  <v-layout>
    <!-- Sidebar -->
    <v-navigation-drawer v-model="drawer" :rail="!mobile && !tablet && rail" :permanent="!mobile && !tablet" :temporary="mobile || tablet" :class="['at-sidebar', { 'is-rail': !mobile && !tablet && rail }]" width="230" :rail-width="64">
      <!-- Logo -->
      <div class="sidebar-logo">
        <div class="d-flex align-center gap-3">
          <span style="font-size:28px">🧵</span>
          <div v-if="!rail || mobile || tablet">
            <div class="logo-title">{{ t('appName') }}</div>
            <div class="logo-sub">AUTOLOOM</div>
          </div>
        </div>
      </div>

      <v-list nav density="compact" :class="['px-2 py-2', { 'mobile-nav-list': mobile }]">
        <v-list-item
          v-for="item in nav"
          :key="item.to"
          :to="item.to"
          :prepend-icon="item.icon"
          :title="(!rail || mobile || tablet) ? t(item.key) : ''"
          rounded="lg"
          active-class="v-list-item--active"
          :class="{ 'mobile-nav-item': mobile }"
          @click="mobile || tablet ? (drawer = false) : null"
        />
      </v-list>

      <template #append>
        <div style="padding:12px 16px;border-top:1px solid rgba(255,255,255,0.08)">
          <v-btn-toggle v-if="!rail || mobile || tablet" v-model="lang" density="compact" rounded="lg"
            color="primary" variant="outlined" divided style="background:rgba(255,255,255,0.05);width:100%"
            @update:model-value="changeLang">
            <v-btn value="ta" size="small" style="flex:1;color:rgba(255,255,255,0.6)">தமிழ்</v-btn>
            <v-btn value="en" size="small" style="flex:1;color:rgba(255,255,255,0.6)">EN</v-btn>
          </v-btn-toggle>
        </div>
      </template>
    </v-navigation-drawer>

    <!-- Top Bar -->
    <v-app-bar class="at-appbar" elevation="0" :height="mobile ? 52 : tablet ? 56 : 60">
      <v-app-bar-nav-icon @click="mobile || tablet ? (drawer = !drawer) : (rail = !rail)" color="grey-darken-1" />
      <v-app-bar-title>
        <span class="font-weight-bold appbar-title">{{ currentTitle }}</span>
      </v-app-bar-title>
      <template #append>
        <v-btn-toggle v-if="!mobile && !tablet" v-model="lang" density="compact" rounded="lg" color="primary"
          variant="outlined" class="mr-3" @update:model-value="changeLang">
          <v-btn value="ta" size="small">தமிழ்</v-btn>
          <v-btn value="en" size="small">EN</v-btn>
        </v-btn-toggle>
        <v-menu offset="10" transition="at-menu" :close-on-content-click="false" :fullscreen="smallMobile">
          <template #activator="{ props }">
            <v-btn v-bind="props" variant="text" rounded="pill" class="user-menu-btn" :aria-label="auth.user?.username || 'User'">
              <span class="user-avatar-ring">
                <v-avatar class="user-avatar" :size="mobile ? 32 : 36">
                  <span class="user-avatar-initial" :style="{ fontSize: mobile ? '13px' : '15px' }">{{ initial }}</span>
                </v-avatar>
                <span class="user-status-dot" />
              </span>
              <v-icon v-if="!mobile" size="18" class="user-chevron">mdi-chevron-down</v-icon>
            </v-btn>
          </template>
          <v-card rounded="xl" elevation="0" :min-width="smallMobile ? undefined : 280" class="user-menu-card">
            <div class="user-menu-header">
              <div class="user-menu-glow" />
              <div class="user-menu-id">
                <v-avatar class="user-avatar user-avatar-lg">
                  <span class="user-avatar-initial">{{ initial }}</span>
                </v-avatar>
                <div class="user-menu-text">
                  <div class="user-menu-name">{{ auth.user?.username || 'User' }}</div>
                  <div class="user-menu-meta">
                    <span class="user-role-badge">Admin</span>
                    <span>{{ t('appName') }}</span>
                  </div>
                </div>
              </div>
            </div>
            <!-- Language toggle in mobile user menu -->
            <div v-if="mobile || tablet" class="pa-3 pb-2">
              <v-btn-toggle v-model="lang" density="compact" rounded="lg" color="primary"
                variant="outlined" divided style="width:100%"
                @update:model-value="changeLang">
                <v-btn value="ta" size="small" style="flex:1">தமிழ்</v-btn>
                <v-btn value="en" size="small" style="flex:1">EN</v-btn>
              </v-btn-toggle>
            </div>
            <div class="user-menu-body">
              <v-list density="compact" class="pa-2 bg-transparent">
                <v-list-item to="/about" rounded="lg" class="user-menu-item">
                  <template #prepend>
                    <span class="menu-icon-tile tile-blue"><v-icon size="18">mdi-information-outline</v-icon></span>
                  </template>
                  <v-list-item-title class="font-weight-medium">{{ t('about') }}</v-list-item-title>
                  <template #append>
                    <v-icon size="16" class="user-menu-arrow">mdi-chevron-right</v-icon>
                  </template>
                </v-list-item>
              </v-list>
              <div class="pa-2 pt-0">
                <button type="button" class="user-logout-btn" @click="doLogout">
                  <span class="menu-icon-tile tile-red"><v-icon size="18">mdi-logout</v-icon></span>
                  <span>{{ t('logout') }}</span>
                </button>
              </div>
            </div>
          </v-card>
        </v-menu>
      </template>
    </v-app-bar>

    <!-- Page content -->
    <v-main :class="['app-main', { 'has-bottom-nav': mobile }]">
      <router-view v-slot="{ Component }">
        <transition name="at-page" mode="out-in">
          <keep-alive :max="6">
            <component :is="Component" :key="route.path" />
          </keep-alive>
        </transition>
      </router-view>
    </v-main>

    <!-- Bottom Navigation (Mobile only) -->
    <div v-if="mobile" class="bottom-nav">
      <router-link
        v-for="item in bottomNav"
        :key="item.to"
        :to="item.to"
        class="bottom-nav-item"
        :class="{ 'is-active': route.path.startsWith(item.to) }"
      >
        <v-icon :size="22">{{ item.icon }}</v-icon>
        <span class="bottom-nav-label">{{ t(item.key) }}</span>
      </router-link>
    </div>
  </v-layout>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useNotify } from '@/composables/useNotify'
import { useLoader } from '@/composables/useLoader'

const { t, locale } = useI18n()
const notify = useNotify()
const loader = useLoader()
const router = useRouter()
const route  = useRoute()
const auth   = useAuthStore()
const initial = computed(() => auth.user?.username?.[0]?.toUpperCase() || 'A')

const drawer = ref(true)
const rail   = ref(false)
const lang   = ref(locale.value)
const mobile = ref(false)
const tablet = ref(false)
const smallMobile = ref(false)
const compactScreen = ref(false)

const nav = [
  { to: '/dashboard',  key: 'dashboard',  icon: 'mdi-view-dashboard' },
  { to: '/companies',  key: 'companies',  icon: 'mdi-domain' },
  { to: '/orders',     key: 'orders',     icon: 'mdi-package-variant' },
  { to: '/payroll',    key: 'payroll',    icon: 'mdi-cash-multiple' },
  // HIDDEN - enable when needed: { to: '/expenses', key: 'expense', icon: 'mdi-receipt-text' },
  { to: '/analytics', key: 'analytics', icon: 'mdi-chart-areaspline' },
  { to: '/company-statement', key: 'companyStatement', icon: 'mdi-file-table-box' },
  { to: '/about', key: 'about', icon: 'mdi-information' },
]

const bottomNav = [
  { to: '/dashboard',  key: 'dashboard',  icon: 'mdi-view-dashboard' },
  { to: '/companies',  key: 'companies',  icon: 'mdi-domain' },
  { to: '/orders',     key: 'orders',     icon: 'mdi-package-variant' },
  { to: '/payroll',    key: 'payroll',    icon: 'mdi-cash-multiple' },
  { to: '/analytics', key: 'analytics', icon: 'mdi-chart-areaspline' },
]

const currentTitle = computed(() => {
  const item = nav.find(n => route.path.startsWith(n.to))
  return item ? t(item.key) : t('appName')
})

function changeLang(l) {
  locale.value = l
  localStorage.setItem('at-lang', l)
}

async function doLogout() {
  await loader.run(auth.logout(), t('pleaseWait'))
  notify.success(t('loggedOut'))
  router.push('/login')
}

function syncScreenMode() {
  const w = window.innerWidth
  smallMobile.value = w < 400
  mobile.value = w < 768
  tablet.value = w >= 768 && w < 1024
  compactScreen.value = w <= 1200
}

watch(mobile, isMobile => {
  if (isMobile) {
    drawer.value = false
    rail.value = false
  } else if (!tablet.value) {
    drawer.value = true
  }
})

watch(tablet, isTablet => {
  if (isTablet) {
    drawer.value = false
    rail.value = false
  } else if (!mobile.value) {
    drawer.value = true
  }
})

watch(compactScreen, isCompact => {
  if (isCompact && !mobile.value && !tablet.value) rail.value = true
})

onMounted(() => {
  syncScreenMode()
  window.addEventListener('resize', syncScreenMode)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', syncScreenMode)
})
</script>

<style scoped>
.at-sidebar {
  background: linear-gradient(180deg, #10203f 0%, #0f1d38 100%);
  /* Nested v-layout makes items absolute (page-tall); pin to viewport */
  position: fixed !important;
}

.sidebar-logo {
  padding: 12px 14px;
}

.at-sidebar.is-rail .sidebar-logo {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 14px 0;
}

/* ── Normal (expanded) items ── */
.at-sidebar :deep(.v-list-item) {
  min-height: 42px;
  color: rgba(255,255,255,0.65);
  transition: background 0.2s ease, transform 0.2s ease, color 0.2s ease;
}

.at-sidebar :deep(.v-list-item:hover:not(.v-list-item--active)) {
  transform: translateX(3px);
}

.at-sidebar :deep(.v-list-item--active) {
  color: white !important;
  background: linear-gradient(90deg, rgba(59, 130, 246, 0.35), rgba(255, 255, 255, 0.06)) !important;
  box-shadow: inset 3px 0 0 #fbbf24, 0 8px 18px -10px rgba(59, 130, 246, 0.7);
}

.at-sidebar :deep(.v-list-item--active .v-icon) {
  color: #fbbf24 !important;
}

.at-sidebar::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(240px 200px at 0% 0%, rgba(59, 130, 246, 0.28), transparent 70%),
    radial-gradient(220px 200px at 100% 100%, rgba(245, 158, 11, 0.16), transparent 70%);
}

.at-sidebar :deep(.v-navigation-drawer__content),
.at-sidebar :deep(.v-navigation-drawer__append) {
  position: relative;
  z-index: 1;
}

.sidebar-logo span:first-child {
  display: inline-block;
  filter: drop-shadow(0 4px 10px rgba(251, 191, 36, 0.45));
}

.logo-title {
  background: linear-gradient(90deg, #fff, #bfdbfe, #fff);
  background-size: 200% 100%;
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

@media (prefers-reduced-motion: no-preference) {
  .sidebar-logo span:first-child { animation: at-logo-sway 4s ease-in-out infinite; }
  .logo-title { animation: at-logo-shine 6s linear infinite; }
  .at-sidebar :deep(.v-list-item) { animation: at-nav-in 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) backwards; }
  .at-sidebar :deep(.v-list-item:nth-child(2)) { animation-delay: 0.05s; }
  .at-sidebar :deep(.v-list-item:nth-child(3)) { animation-delay: 0.1s; }
  .at-sidebar :deep(.v-list-item:nth-child(4)) { animation-delay: 0.15s; }
  .at-sidebar :deep(.v-list-item:nth-child(5)) { animation-delay: 0.2s; }
  .at-sidebar :deep(.v-list-item:nth-child(6)) { animation-delay: 0.25s; }
  .at-sidebar :deep(.v-list-item:nth-child(7)) { animation-delay: 0.3s; }
  .at-sidebar :deep(.v-list-item:nth-child(8)) { animation-delay: 0.35s; }
}

@keyframes at-logo-sway {
  0%, 100% { transform: rotate(-6deg); }
  50% { transform: rotate(8deg) scale(1.06); }
}

@keyframes at-logo-shine {
  to { background-position: -200% 0; }
}

@keyframes at-nav-in {
  from { opacity: 0; transform: translateX(-16px); }
  to { opacity: 1; transform: none; }
}

/* ── Rail (collapsed) items ── */
.at-sidebar.is-rail :deep(.v-list) {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px 0 !important;
}

.at-sidebar.is-rail :deep(.v-list-item) {
  width: 44px;
  height: 44px;
  min-height: 44px;
  max-width: 44px;
  border-radius: 12px;
  margin: 0 !important;
  padding: 0 !important;
  display: flex;
  align-items: center;
  justify-content: center;
}

.at-sidebar.is-rail :deep(.v-list-item__prepend) {
  margin-inline-end: 0 !important;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.at-sidebar.is-rail :deep(.v-list-item__spacer) {
  display: none !important;
}

.at-sidebar.is-rail :deep(.v-list-item__content) {
  display: none !important;
}

.at-sidebar.is-rail :deep(.v-icon) {
  font-size: 22px;
  color: rgba(255,255,255,0.65);
}

.at-sidebar.is-rail :deep(.v-list-item--active .v-icon) {
  color: white !important;
}

.at-sidebar.is-rail :deep(.v-list-item--active) {
  background: rgba(255,255,255,0.15) !important;
}

.at-sidebar.is-rail :deep(.v-list-item:hover:not(.v-list-item--active)) {
  background: rgba(255,255,255,0.08) !important;
}

.at-sidebar.is-rail :deep(.v-list-item:hover .v-icon) {
  color: white;
}

/* ── Mobile nav items (larger touch targets) ── */
.mobile-nav-list :deep(.v-list-item) {
  min-height: 50px !important;
  padding: 10px 16px !important;
  margin: 3px 8px !important;
  font-size: 15px !important;
}

.mobile-nav-list :deep(.v-list-item .v-icon) {
  font-size: 22px;
}

/* ── App bar ── */
.at-appbar {
  position: fixed !important;
  background: rgba(255, 255, 255, 0.8) !important;
  backdrop-filter: blur(14px) saturate(1.4);
  -webkit-backdrop-filter: blur(14px) saturate(1.4);
  border-bottom: 1px solid rgba(15, 29, 56, 0.07);
  box-shadow: 0 4px 18px rgba(15, 29, 56, 0.04);
}

.appbar-title {
  font-size: 16px;
  color: #1A2744;
}

/* ── Profile avatar ── */
.user-menu-btn {
  text-transform: none;
  padding: 4px 8px !important;
}

.user-avatar {
  background: linear-gradient(135deg, #1565C0 0%, #5E35B1 100%) !important;
  box-shadow: 0 2px 8px rgba(21, 101, 192, 0.35);
  transition: transform 0.25s ease;
}

.user-avatar-initial {
  color: #fff;
  font-weight: 800;
}

.user-avatar-ring {
  position: relative;
  display: inline-flex;
  isolation: isolate;
  border-radius: 50%;
  padding: 2px;
}

.user-avatar-ring::before {
  content: '';
  position: absolute;
  inset: -2px;
  border-radius: 50%;
  background: conic-gradient(from 0deg, #1565C0, #7C4DFF, #F57C00, #1565C0);
  z-index: -1;
  animation: at-spin 5s linear infinite;
}

.user-menu-btn:hover .user-avatar {
  transform: scale(1.06);
}

.user-status-dot {
  position: absolute;
  right: 0;
  bottom: 0;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #2E7D32;
  border: 2px solid #fff;
}

.user-status-dot::after {
  content: '';
  position: absolute;
  inset: -2px;
  border-radius: 50%;
  background: rgba(46, 125, 50, 0.45);
  animation: at-pulse 2s ease-out infinite;
}

.user-chevron {
  margin-left: 4px;
  color: #64748B;
  transition: transform 0.25s ease;
}

.user-menu-btn[aria-expanded='true'] .user-chevron {
  transform: rotate(180deg);
}

/* ── Profile menu card ── */
.user-menu-card {
  border: 1px solid rgba(15, 29, 56, 0.08);
  box-shadow: 0 24px 60px rgba(13, 27, 62, 0.22) !important;
  overflow: hidden;
}

.user-menu-header {
  position: relative;
  overflow: hidden;
  padding: 20px;
  color: #fff;
  background: linear-gradient(135deg, #10203F 0%, #1565C0 100%);
}

.user-menu-glow {
  position: absolute;
  top: -60px;
  right: -50px;
  width: 160px;
  height: 160px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.22), transparent 70%);
  animation: at-float 6s ease-in-out infinite;
}

.user-menu-id {
  position: relative;
  display: flex;
  align-items: center;
  gap: 14px;
}

.user-avatar-lg {
  width: 56px !important;
  height: 56px !important;
  border: 2px solid rgba(255, 255, 255, 0.75);
  background: linear-gradient(135deg, #F57C00 0%, #FFB74D 100%) !important;
}

.user-avatar-lg .user-avatar-initial {
  font-size: 22px;
}

.user-menu-name {
  font-size: 16px;
  font-weight: 800;
  letter-spacing: 0.2px;
}

.user-menu-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
  font-size: 12px;
  opacity: 0.85;
}

.user-role-badge {
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.18);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.4px;
}

.user-menu-body {
  padding-top: 6px;
}

.user-menu-item {
  transition: background 0.2s ease, transform 0.2s ease;
}

.user-menu-item:hover {
  background: #EEF4FF;
  transform: translateX(3px);
}

.user-menu-arrow {
  color: #94A3B8;
  transition: transform 0.2s ease;
}

.user-menu-item:hover .user-menu-arrow {
  transform: translateX(3px);
}

.menu-icon-tile {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  margin-right: 12px;
  border-radius: 10px;
}

.tile-blue {
  background: #E3F2FD;
  color: #1565C0;
}

.user-logout-btn {
  display: flex;
  align-items: center;
  width: 100%;
  padding: 10px 12px;
  border: 0;
  border-radius: 12px;
  background: #FFF5F5;
  color: #C62828;
  font: 600 14px var(--at-font);
  cursor: pointer;
  transition: background 0.2s ease, transform 0.15s ease;
}

.user-logout-btn:hover {
  background: #FDE3E3;
}

.user-logout-btn:active {
  transform: scale(0.98);
}

.user-logout-btn .menu-icon-tile {
  background: #fff;
  color: #C62828;
}

/* ── Main content area ── */
.app-main {
  background: linear-gradient(180deg, #EDF2F9 0%, #E4ECF6 100%);
  min-height: 100%;
}

@keyframes at-spin {
  to { transform: rotate(360deg); }
}

@keyframes at-pulse {
  0% { transform: scale(1); opacity: 0.8; }
  100% { transform: scale(2.2); opacity: 0; }
}

@keyframes at-float {
  0%, 100% { transform: translate(0, 0); }
  50% { transform: translate(-10px, 8px); }
}

.app-main.has-bottom-nav {
  padding-bottom: calc(64px + env(safe-area-inset-bottom, 0px)) !important;
}

/* ── Bottom Navigation ── */
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: space-around;
  height: calc(60px + env(safe-area-inset-bottom, 0px));
  background: #ffffff;
  border-top: 1px solid #E2E8F0;
  box-shadow: 0 -2px 12px rgba(0, 0, 0, 0.06);
  padding: 0 4px;
  padding-bottom: env(safe-area-inset-bottom, 0);
}

.bottom-nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  flex: 1;
  padding: 6px 4px;
  border-radius: 10px;
  color: #94A3B8;
  text-decoration: none;
  transition: all 0.2s ease;
  -webkit-tap-highlight-color: transparent;
}

.bottom-nav-item.is-active {
  color: #1565C0;
}

.bottom-nav-item.is-active .v-icon {
  color: #1565C0;
}

.bottom-nav-item:active {
  transform: scale(0.92);
}

.bottom-nav-label {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.1px;
  line-height: 1.2;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 64px;
}

.bottom-nav-item.is-active .bottom-nav-label {
  font-weight: 700;
}

/* ── Responsive ── */
@media (max-width: 767px) {
  .appbar-title {
    font-size: 14px !important;
  }

  .user-menu-btn {
    padding: 2px 4px !important;
  }
}

@media (min-width: 768px) and (max-width: 1023px) {
  .appbar-title {
    font-size: 15px;
  }
}
</style>
