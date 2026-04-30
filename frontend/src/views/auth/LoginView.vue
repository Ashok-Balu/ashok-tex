<template>
  <div class="login-page">
    <v-card width="420" rounded="xl" elevation="24">
      <v-card-text class="pa-10">
        <div class="text-center mb-6">
          <div style="font-size:42px">🧵</div>
          <div style="font-size:24px;font-weight:800;color:#0D1B3E">{{ t('appName') }}</div>
          <div style="font-size:13px;color:#5A6A85;margin-top:4px">{{ t('loginSub') }}</div>
        </div>

        <v-form @submit.prevent="doLogin" ref="formRef">
          <v-text-field
            v-model="form.username"
            :label="t('username')"
            prepend-inner-icon="mdi-account"
            class="mb-3"
            :rules="[v => !!v || t('required')]"
            autocomplete="username"
          />
          <v-text-field
            v-model="form.password"
            :label="t('password')"
            prepend-inner-icon="mdi-lock"
            :type="show ? 'text' : 'password'"
            :append-inner-icon="show ? 'mdi-eye-off' : 'mdi-eye'"
            @click:append-inner="show = !show"
            class="mb-4"
            :rules="[v => !!v || t('required')]"
            autocomplete="current-password"
          />

          <v-alert v-if="auth.error" type="error" variant="tonal" rounded="lg" class="mb-4" density="compact">
            {{ t('invalidLogin') }}
          </v-alert>

          <v-btn type="submit" color="primary" size="large" block rounded="lg"
            :loading="auth.loading" variant="flat">
            {{ t('loginBtn') }}
          </v-btn>
        </v-form>

        <div class="d-flex justify-center mt-5">
          <v-btn-toggle v-model="lang" density="compact" rounded="lg" color="primary"
            variant="outlined" @update:model-value="changeLang">
            <v-btn value="ta" size="small">தமிழ்</v-btn>
            <v-btn value="en" size="small">EN</v-btn>
          </v-btn-toggle>
        </div>
      </v-card-text>
    </v-card>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const { t, locale } = useI18n()
const router = useRouter()
const auth   = useAuthStore()
const formRef = ref()
const show   = ref(false)
const lang   = ref(locale.value)
const form   = ref({ username: '', password: '' })

async function doLogin() {
  const { valid } = await formRef.value.validate()
  if (!valid) return
  const ok = await auth.login(form.value.username, form.value.password)
  if (ok) router.push('/dashboard')
}

function changeLang(l) { locale.value = l; localStorage.setItem('at-lang', l) }
</script>
