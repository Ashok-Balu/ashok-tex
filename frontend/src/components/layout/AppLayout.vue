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
        <v-menu offset="8" :close-on-content-click="false" :fullscreen="smallMobile">
          <template #activator="{ props }">
            <v-btn v-bind="props" variant="text" rounded="pill" class="user-menu-btn">
              <v-avatar color="indigo-darken-1" :size="mobile ? 32 : 36">
                <span class="text-white font-weight-bold" :style="{ fontSize: mobile ? '13px' : '15px' }">
                  {{ auth.user?.username?.[0]?.toUpperCase() || 'A' }}
                </span>
              </v-avatar>
              <v-icon v-if="!mobile" size="18" class="ml-1" color="grey-darken-1">mdi-chevron-down</v-icon>
            </v-btn>
          </template>
          <v-card rounded="xl" elevation="12" :min-width="smallMobile ? undefined : 260" class="user-menu-card">
            <div class="user-menu-header">
              <v-avatar color="indigo-darken-1" size="52">
                <span class="text-white font-weight-bold" style="font-size:22px">
                  {{ auth.user?.username?.[0]?.toUpperCase() || 'A' }}
                </span>
              </v-avatar>
              <div class="ml-3">
                <div class="text-subtitle-1 font-weight-bold" style="color:#1A2744">{{ auth.user?.username || 'User' }}</div>
                <div class="text-caption" style="color:#5A6A85">{{ t('appName') }} • Admin</div>
              </div>
            </div>
            <v-divider />
            <!-- Language toggle in mobile user menu -->
            <div v-if="mobile || tablet" class="pa-3">
              <v-btn-toggle v-model="lang" density="compact" rounded="lg" color="primary"
                variant="outlined" divided style="width:100%"
                @update:model-value="changeLang">
                <v-btn value="ta" size="small" style="flex:1">தமிழ்</v-btn>
                <v-btn value="en" size="small" style="flex:1">EN</v-btn>
              </v-btn-toggle>
            </div>
            <v-divider v-if="mobile || tablet" />
            <v-list density="compact" class="py-1">
              <v-list-item prepend-icon="mdi-information-outline" :title="t('about')" to="/about" rounded="lg" class="mx-2" />
            </v-list>
            <v-divider />
            <div class="pa-3">
              <v-btn color="red-darken-1" variant="tonal" block rounded="lg" prepend-icon="mdi-logout" @click="doLogout">
                {{ t('logout') }}
              </v-btn>
            </div>
          </v-card>
        </v-menu>
      </template>
    </v-app-bar>

    <!-- Page content -->
    <v-main :class="['app-main', { 'has-bottom-nav': mobile }]">
      <router-view v-slot="{ Component }">
        <keep-alive :max="6">
          <component :is="Component" :key="route.path" />
        </keep-alive>
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

const { t, locale } = useI18n()
const router = useRouter()
const route  = useRoute()
const auth   = useAuthStore()

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

function doLogout() {
  auth.logout()
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
}

.at-sidebar :deep(.v-list-item--active) {
  color: white !important;
  background: rgba(255,255,255,0.12) !important;
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
.appbar-title {
  font-size: 16px;
  color: #1A2744;
}

.user-menu-btn {
  text-transform: none;
  padding: 4px 8px !important;
}

.user-menu-card .user-menu-header {
  display: flex;
  align-items: center;
  padding: 20px;
  background: linear-gradient(135deg, #f0f4ff 0%, #e8eeff 100%);
}

/* ── Main content area ── */
.app-main {
  background: #F0F4F8;
}

.app-main.has-bottom-nav {
  padding-bottom: 64px !important;
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
  height: 60px;
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
  font-size: 10px;
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
