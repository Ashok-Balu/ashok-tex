<template>
  <v-app>
    <v-progress-linear
      :active="loader.isLoading.value"
      indeterminate
      color="primary"
      height="3"
      class="app-top-progress"
    />
    <router-view />
    <v-overlay
      :model-value="loader.isBusy.value"
      persistent
      class="align-center justify-center"
      scrim="rgba(15, 23, 42, 0.35)"
      z-index="3000"
    >
      <div class="app-busy">
        <v-progress-circular indeterminate color="primary" size="42" width="4" />
        <span class="app-busy__text">{{ loader.busyText.value || t('pleaseWait') }}</span>
      </div>
    </v-overlay>
    <v-snackbar
      v-model="notify.show.value"
      :color="notify.color.value"
      :timeout="notify.timeout.value"
      location="top right"
      rounded="lg"
      multi-line
      class="app-snackbar"
    >
      <div class="d-flex align-center" style="gap:10px">
        <v-icon size="20">{{ notify.icons[notify.color.value] || 'mdi-information' }}</v-icon>
        <span>{{ notify.text.value }}</span>
      </div>
      <template #actions>
        <v-btn variant="text" color="white" @click="notify.close()">{{ t('close') }}</v-btn>
      </template>
    </v-snackbar>
    <!-- Global confirm dialog -->
    <v-dialog v-model="confirm.show.value" max-width="420" persistent>
      <v-card rounded="xl">
        <v-card-title class="text-h6 font-weight-bold pt-5 px-6">{{ confirm.title.value || t('confirmAction') }}</v-card-title>
        <v-card-text class="px-6">{{ confirm.message.value }}</v-card-text>
        <v-card-actions class="px-6 pb-5">
          <v-spacer />
          <v-btn variant="text" @click="confirm.onCancel()">{{ t('cancel') }}</v-btn>
          <v-btn :color="confirm.confirmColor.value || 'primary'" variant="flat" rounded="lg" @click="confirm.onConfirm()">{{ confirm.confirmText.value || t('confirm') }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-app>
</template>

<script setup>
import { useI18n } from 'vue-i18n'
import { useConfirm } from '@/composables/useConfirm'
import { useNotify } from '@/composables/useNotify'
import { useLoader } from '@/composables/useLoader'
const { t } = useI18n()
const confirm = useConfirm()
const notify = useNotify()
const loader = useLoader()
</script>

<style>
.app-top-progress {
  position: fixed !important;
  top: 0;
  left: 0;
  right: 0;
  z-index: 4000;
}
.app-busy {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px 26px;
  background: #fff;
  border-radius: 14px;
  box-shadow: 0 12px 32px rgba(15, 23, 42, 0.18);
}
.app-busy__text {
  font-weight: 600;
  color: #0f172a;
}
.app-snackbar .v-snackbar__wrapper {
  min-width: 300px;
}
</style>
