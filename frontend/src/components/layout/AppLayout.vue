<template>
  <v-layout>
    <!-- Sidebar -->
    <v-navigation-drawer v-model="drawer" :rail="rail" permanent :class="['at-sidebar', { 'is-rail': rail }]" width="230" :rail-width="64">
      <!-- Logo -->
      <div class="sidebar-logo">
        <div class="d-flex align-center gap-3">
          <span style="font-size:28px">🧵</span>
          <div v-if="!rail">
            <div class="logo-title">{{ t('appName') }}</div>
            <div class="logo-sub">AUTOLOOM</div>
          </div>
        </div>
      </div>

      <v-list nav density="compact" class="px-2 py-2">
        <v-list-item
          v-for="item in nav"
          :key="item.to"
          :to="item.to"
          :prepend-icon="item.icon"
          :title="!rail ? t(item.key) : ''"
          rounded="lg"
          active-class="v-list-item--active"
        />
      </v-list>

      <template #append>
        <div style="padding:12px 16px;border-top:1px solid rgba(255,255,255,0.08)">
          <v-btn-toggle v-if="!rail" v-model="lang" density="compact" rounded="lg"
            color="primary" variant="outlined" divided style="background:rgba(255,255,255,0.05);width:100%"
            @update:model-value="changeLang">
            <v-btn value="ta" size="small" style="flex:1;color:rgba(255,255,255,0.6)">தமிழ்</v-btn>
            <v-btn value="en" size="small" style="flex:1;color:rgba(255,255,255,0.6)">EN</v-btn>
          </v-btn-toggle>
        </div>
      </template>
    </v-navigation-drawer>

    <!-- Top Bar -->
    <v-app-bar class="at-appbar" elevation="0" height="60">
      <v-app-bar-nav-icon @click="rail = !rail" color="grey-darken-1" />
      <v-app-bar-title>
        <span class="font-weight-bold" style="font-size:16px;color:#1A2744">{{ currentTitle }}</span>
      </v-app-bar-title>
      <template #append>
        <v-btn-toggle v-model="lang" density="compact" rounded="lg" color="primary"
          variant="outlined" class="mr-3" @update:model-value="changeLang">
          <v-btn value="ta" size="small">தமிழ்</v-btn>
          <v-btn value="en" size="small">EN</v-btn>
        </v-btn-toggle>
        <v-menu offset="8" :close-on-content-click="false">
          <template #activator="{ props }">
            <v-btn v-bind="props" variant="text" rounded="pill" class="user-menu-btn mr-2">
              <v-avatar color="indigo-darken-1" size="36">
                <span class="text-white font-weight-bold" style="font-size:15px">
                  {{ auth.user?.username?.[0]?.toUpperCase() || 'A' }}
                </span>
              </v-avatar>
              <v-icon size="18" class="ml-1" color="grey-darken-1">mdi-chevron-down</v-icon>
            </v-btn>
          </template>
          <v-card rounded="xl" elevation="12" min-width="260" class="user-menu-card">
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
    <v-main style="background:#F0F4F8">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </v-main>
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
const compactScreen = ref(false)

const nav = [
  { to: '/dashboard',  key: 'dashboard',  icon: 'mdi-view-dashboard' },
  { to: '/companies',  key: 'companies',  icon: 'mdi-domain' },
  { to: '/orders',     key: 'orders',     icon: 'mdi-package-variant' },
  { to: '/allocations', key: 'payment',   icon: 'mdi-source-branch' },
  { to: '/payroll',    key: 'payroll',    icon: 'mdi-cash-multiple' },
  // { to: '/financial-intelligence', key: 'financialIntelligence', icon: 'mdi-finance' }, // HIDDEN - enable when needed
  { to: '/analytics', key: 'analytics', icon: 'mdi-chart-areaspline' },
  { to: '/company-statement', key: 'companyStatement', icon: 'mdi-file-table-box' },
  { to: '/about', key: 'about', icon: 'mdi-information' },
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
  compactScreen.value = window.innerWidth <= 1200
}

watch(compactScreen, isCompact => {
  if (isCompact) rail.value = true
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
</style>
