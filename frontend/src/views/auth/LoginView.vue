<template>
  <div class="login-page">
    <!-- Left decorative panel -->
    <div class="login-left">
      <div class="left-content">
        <div class="left-pattern"></div>
        <div class="left-overlay"></div>
        <div class="left-text">
          <div class="left-logo">🧵</div>
          <h1>{{ t('appName') }}</h1>
          <p>Powerloom & Autoloom<br>Management System</p>
          <div class="left-features">
            <div class="feature-item">
              <v-icon size="18" color="white">mdi-check-circle</v-icon>
              <span>Production Tracking</span>
            </div>
            <div class="feature-item">
              <v-icon size="18" color="white">mdi-check-circle</v-icon>
              <span>Payroll Management</span>
            </div>
            <div class="feature-item">
              <v-icon size="18" color="white">mdi-check-circle</v-icon>
              <span>Company Analytics</span>
            </div>
            <div class="feature-item">
              <v-icon size="18" color="white">mdi-check-circle</v-icon>
              <span>Order Management</span>
            </div>
          </div>
        </div>
        <!-- Decorative circles -->
        <div class="deco-circle deco-1"></div>
        <div class="deco-circle deco-2"></div>
        <div class="deco-circle deco-3"></div>
      </div>
    </div>

    <!-- Right login form -->
    <div class="login-right">
      <div class="login-form-wrap">
        <!-- Language toggle at top -->
        <div class="d-flex justify-end mb-8">
          <v-btn-toggle v-model="lang" density="compact" rounded="pill" color="indigo-darken-2"
            variant="outlined" divided @update:model-value="changeLang" class="lang-toggle">
            <v-btn value="ta" size="small">தமிழ்</v-btn>
            <v-btn value="en" size="small">EN</v-btn>
          </v-btn-toggle>
        </div>

        <!-- Welcome text -->
        <div class="mb-8">
          <h2 class="login-welcome">{{ t('loginWelcome') }}</h2>
          <p class="login-desc">{{ t('loginSub') }}</p>
        </div>

        <!-- Form -->
        <v-form @submit.prevent="doLogin" ref="formRef">
          <div class="mb-5">
            <label class="input-label">{{ t('username') }}</label>
            <v-text-field
              v-model="form.username"
              placeholder="Enter your username"
              prepend-inner-icon="mdi-account-outline"
              variant="outlined"
              density="comfortable"
              rounded="lg"
              :rules="[v => !!v || t('required')]"
              autocomplete="username"
              hide-details="auto"
              class="login-field"
            />
          </div>

          <div class="mb-6">
            <label class="input-label">{{ t('password') }}</label>
            <v-text-field
              v-model="form.password"
              placeholder="Enter your password"
              prepend-inner-icon="mdi-lock-outline"
              variant="outlined"
              density="comfortable"
              rounded="lg"
              :type="show ? 'text' : 'password'"
              :append-inner-icon="show ? 'mdi-eye-off-outline' : 'mdi-eye-outline'"
              @click:append-inner="show = !show"
              :rules="[v => !!v || t('required')]"
              autocomplete="current-password"
              hide-details="auto"
              class="login-field"
            />
          </div>

          <v-alert v-if="auth.error" type="error" variant="tonal" rounded="lg" class="mb-4" density="compact">
            {{ t('invalidLogin') }}
          </v-alert>

          <v-btn
            type="submit"
            size="x-large"
            block
            rounded="lg"
            :loading="auth.loading"
            variant="flat"
            class="login-btn"
          >
            {{ t('loginBtn') }}
            <v-icon end>mdi-arrow-right</v-icon>
          </v-btn>
        </v-form>

        <!-- Footer -->
        <div class="login-footer">
          <v-icon size="14" color="grey-darken-1">mdi-shield-check</v-icon>
          <span>Secure & Encrypted Connection</span>
        </div>
      </div>
    </div>
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

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
}

/* ── Left Panel ── */
.login-left {
  flex: 0 0 48%;
  position: relative;
  overflow: hidden;
  display: none;
}

@media (min-width: 960px) {
  .login-left { display: block; }
}

.left-content {
  position: relative;
  height: 100%;
  background: linear-gradient(160deg, #0f1b3d 0%, #1a2f6b 40%, #2546a8 80%, #3b5dcc 100%);
}

.left-pattern {
  position: absolute;
  inset: 0;
  opacity: 0.04;
  background-image:
    radial-gradient(circle at 20% 50%, white 1px, transparent 1px),
    radial-gradient(circle at 80% 20%, white 1px, transparent 1px),
    radial-gradient(circle at 60% 80%, white 1px, transparent 1px);
  background-size: 60px 60px, 80px 80px, 100px 100px;
}

.left-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.2) 100%);
}

.left-text {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  justify-content: center;
  height: 100%;
  padding: 60px;
  color: white;
}

.left-logo {
  font-size: 64px;
  margin-bottom: 20px;
  filter: drop-shadow(0 4px 12px rgba(0,0,0,0.3));
}

.left-text h1 {
  font-size: 42px;
  font-weight: 900;
  letter-spacing: -1px;
  margin-bottom: 12px;
  line-height: 1.1;
}

.left-text p {
  font-size: 18px;
  opacity: 0.8;
  line-height: 1.5;
  margin-bottom: 40px;
}

.left-features {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.feature-item {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 15px;
  opacity: 0.85;
  font-weight: 500;
}

.deco-circle {
  position: absolute;
  border-radius: 50%;
  border: 1px solid rgba(255,255,255,0.08);
}

.deco-1 {
  width: 400px;
  height: 400px;
  top: -100px;
  right: -100px;
  animation: pulse 10s ease-in-out infinite;
}

.deco-2 {
  width: 250px;
  height: 250px;
  bottom: 10%;
  right: 20%;
  background: rgba(255,255,255,0.03);
  animation: pulse 14s ease-in-out infinite 3s;
}

.deco-3 {
  width: 150px;
  height: 150px;
  top: 40%;
  right: -30px;
  background: rgba(255,255,255,0.02);
  animation: pulse 8s ease-in-out infinite 1s;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.05); opacity: 0.7; }
}

/* ── Right Panel ── */
.login-right {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
  background: #fafbfd;
  position: relative;
}

@media (max-width: 959px) {
  .login-right {
    background: linear-gradient(160deg, #e8ecf8 0%, #f0f4ff 50%, #fafbfd 100%);
  }
}

.login-form-wrap {
  width: 100%;
  max-width: 420px;
}

.login-welcome {
  font-size: 30px;
  font-weight: 800;
  color: #0f1b3d;
  letter-spacing: -0.5px;
  margin-bottom: 6px;
}

.login-desc {
  font-size: 15px;
  color: #6b7a99;
}

.input-label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: #37474f;
  margin-bottom: 6px;
  margin-left: 2px;
}

.login-field :deep(.v-field) {
  background: white;
  border-color: #e2e8f0;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
  transition: all 0.2s ease;
}

.login-field :deep(.v-field:hover) {
  border-color: #94a3b8;
}

.login-field :deep(.v-field--focused) {
  background: white;
  border-color: #3b5dcc;
  box-shadow: 0 0 0 4px rgba(59, 93, 204, 0.08);
}

.login-field :deep(.v-field__input::placeholder) {
  color: #a0aec0;
}

.login-btn {
  font-weight: 700;
  font-size: 16px;
  letter-spacing: 0.2px;
  text-transform: none;
  height: 54px !important;
  background: linear-gradient(135deg, #1a2f6b, #3b5dcc) !important;
  color: white !important;
  box-shadow: 0 8px 28px rgba(26, 47, 107, 0.35);
  transition: all 0.25s ease;
}

.login-btn:hover {
  box-shadow: 0 12px 36px rgba(26, 47, 107, 0.45);
  transform: translateY(-2px);
}

.login-btn:active {
  transform: translateY(0);
}

.lang-toggle {
  border-color: #cbd5e1 !important;
}

.login-footer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin-top: 32px;
  font-size: 12px;
  color: #90a4ae;
}
</style>
