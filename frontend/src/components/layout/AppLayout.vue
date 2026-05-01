<template>
  <v-layout>
    <!-- Sidebar -->
    <v-navigation-drawer v-model="drawer" :rail="rail" permanent class="at-sidebar" width="230">
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
        <v-menu>
          <template #activator="{ props }">
            <v-avatar v-bind="props" color="primary" size="34" class="mr-3" style="cursor:pointer">
              <span class="text-white font-weight-bold" style="font-size:14px">
                {{ auth.user?.username?.[0]?.toUpperCase() || 'A' }}
              </span>
            </v-avatar>
          </template>
          <v-list rounded="lg" elevation="8" min-width="160">
            <v-list-item :subtitle="auth.user?.username" :title="t('username')" />
            <v-divider />
            <v-list-item :title="t('logout')" prepend-icon="mdi-logout" @click="doLogout" />
          </v-list>
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
import { ref, computed } from 'vue'
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

const nav = [
  { to: '/dashboard',  key: 'dashboard',  icon: 'mdi-view-dashboard' },
  { to: '/companies',  key: 'companies',  icon: 'mdi-domain' },
  { to: '/orders',     key: 'orders',     icon: 'mdi-package-variant' },
  { to: '/payroll',    key: 'payroll',    icon: 'mdi-cash-multiple' },
  { to: '/reports',    key: 'reports',    icon: 'mdi-chart-bar' },
  { to: '/company-statement', key: 'companyStatement', icon: 'mdi-file-table-box' },
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
</script>
