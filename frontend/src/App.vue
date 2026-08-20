<template>
  <v-app>
    <router-view />
    <v-snackbar v-model="notify.show.value" :color="notify.color.value" :timeout="notify.timeout.value" location="top right">
      {{ notify.text.value }}
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
const { t } = useI18n()
const confirm = useConfirm()
const notify = useNotify()
</script>
