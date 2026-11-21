<template>
  <div class="lp" @mousemove="onParallax">
    <section class="lp-hero">
      <div class="lp-fabric" aria-hidden="true"></div>
      <svg class="lp-threads" viewBox="0 0 1200 300" preserveAspectRatio="none" aria-hidden="true">
        <path class="lp-thread t1" d="M0,180 C200,100 400,260 600,180 S1000,100 1200,180" />
        <path class="lp-thread t2" d="M0,220 C220,140 420,300 640,220 S1020,140 1200,220" />
        <path class="lp-thread t3" d="M0,140 C180,60 380,220 600,140 S980,60 1200,140" />
      </svg>
      <div class="lp-glow lp-glow-a" aria-hidden="true"></div>
      <div class="lp-glow lp-glow-b" aria-hidden="true"></div>
      <span v-for="n in 18" :key="n" class="lp-fleck" :style="{ '--n': n }" aria-hidden="true"></span>

      <div class="lp-hero-inner">
        <div class="lp-brand-row" v-motion :initial="{ opacity: 0, x: -60 }" :enter="{ opacity: 1, x: 0, transition: { duration: 700, type: 'spring', stiffness: 110, damping: 16 } }">
          <div class="lp-logo">🧵</div>
          <span class="lp-kicker">Powerloom &amp; Autoloom</span>
        </div>

        <h1 class="lp-title" v-motion :initial="{ opacity: 0, y: 40, scale: 0.85 }" :enter="{ opacity: 1, y: 0, scale: 1, transition: { delay: 150, duration: 800, type: 'spring', stiffness: 90, damping: 12 } }">ASHOK <span>TEX</span></h1>
        <p class="lp-subtitle" v-motion :initial="{ opacity: 0, y: 20 }" :enter="{ opacity: 1, y: 0, transition: { delay: 350, duration: 600 } }">{{ $t('loginSubtitle') }}</p>
        <p class="lp-lead" v-motion :initial="{ opacity: 0, y: 20 }" :enter="{ opacity: 1, y: 0, transition: { delay: 420, duration: 600 } }">
          {{ $t('loginLead') }}
        </p>

        <ul class="lp-features">
          <li v-for="(f, i) in features" :key="f.title" class="lp-feature" v-motion
            :initial="{ opacity: 0, x: -70 }"
            :enter="{ opacity: 1, x: 0, transition: { delay: 100 + i * 60, duration: 300 } }"
            :hovered="{ x: 10, scale: 1.02 }">
            <span class="lp-feature-icon" :class="f.tone"><component :is="f.icon" :size="14" /></span>
            <div>
              <strong>{{ f.title }}</strong>
              <small>{{ f.desc }}</small>
            </div>
          </li>
        </ul>

        <div class="lp-foot">
          <span class="lp-foot-dot"></span>
          © {{ new Date().getFullYear() }} Ashok Tex · Powerloom &amp; Autoloom
        </div>
      </div>
    </section>

    <main class="lp-main" @mousemove="onSpotlight">
      <span class="lp-blob lp-blob-a" aria-hidden="true"></span>
      <span class="lp-blob lp-blob-b" aria-hidden="true"></span>
      <div class="lp-deco" aria-hidden="true">
        <span class="lp-grid"></span>
        <span class="lp-ring r1"></span>
        <span class="lp-ring r2"></span>
        <span class="lp-ring r3"></span>
        <Cog class="lp-cog c1" :size="240" :stroke-width="0.6" />
        <Cog class="lp-cog c2" :size="150" :stroke-width="0.6" />
        <Cog class="lp-cog c3" :size="90" :stroke-width="0.8" />
        <span class="lp-orbit"><i></i><i></i><i></i></span>
        <span class="lp-chip k1"><Shirt :size="20" /></span>
        <span class="lp-chip k2"><Scissors :size="18" /></span>
        <span class="lp-chip k3"><Layers :size="18" /></span>
        <span class="lp-chip k4"><Sparkles :size="16" /></span>
        <span class="lp-weave w-tl"></span>
        <span class="lp-weave w-br"></span>
        <span v-for="n in 14" :key="'b' + n" class="lp-bubble" :style="{ '--n': n }"></span>
        <svg class="lp-wave" viewBox="0 0 1200 200" preserveAspectRatio="none">
          <path class="w1" d="M0,120 C200,60 400,180 600,120 S1000,60 1200,120 V200 H0 Z" />
          <path class="w2" d="M0,150 C220,100 420,200 640,150 S1020,100 1200,150 V200 H0 Z" />
        </svg>
      </div>
      <div class="lp-mobile-brand">
        <div class="lp-logo">🧵</div>
        <div>
          <strong>ASHOK TEX</strong>
          <small>{{ $t('loginSubtitle') }}</small>
        </div>
      </div>

      <div ref="tiltEl" class="lp-tilt">
      <div class="lp-card" v-motion :initial="{ opacity: 0, y: 24 }" :enter="{ opacity: 1, y: 0, transition: { duration: 300 } }">
        <i v-for="n in 6" :key="'s' + n" class="lp-spark" :style="{ '--n': n }" aria-hidden="true"></i>
        <div class="lp-card-top">
          <div class="lp-badge" aria-hidden="true">
            <span class="lp-badge-ring"></span>
            <span class="lp-badge-core">🧵</span>
          </div>
          <v-btn-toggle v-model="lang" density="compact" rounded="pill" variant="outlined" divided
            color="indigo-darken-2" class="lp-lang" @update:model-value="changeLang">
            <v-btn value="ta" size="small">தமிழ்</v-btn>
            <v-btn value="en" size="small">EN</v-btn>
          </v-btn-toggle>
        </div>

        <h2 class="lp-welcome" v-motion :initial="{ opacity: 0, y: 18 }" :enter="{ opacity: 1, y: 0, transition: { delay: 150, duration: 500 } }">{{ $t('loginWelcome') }}</h2>
        <p class="lp-desc" v-motion :initial="{ opacity: 0, y: 14 }" :enter="{ opacity: 1, y: 0, transition: { delay: 250, duration: 500 } }">{{ $t('loginDesc') }}</p>

        <v-form ref="formRef" @submit.prevent="doLogin">
          <div class="lp-fg" v-motion :initial="{ opacity: 0, x: -30 }" :enter="{ opacity: 1, x: 0, transition: { delay: 350, type: 'spring', stiffness: 130, damping: 16 } }">
          <label class="lp-label">{{ $t('username') }}</label>
          <v-text-field
            v-model="form.username"
            :placeholder="$t('loginUsernamePh')"
            variant="outlined"
            density="compact"
            rounded="lg"
            autocomplete="username"
            :rules="[v => !!v || $t('required')]"
            hide-details="auto"
            :class="['lp-field', { 'lp-shake': auth.error }]"
          >
            <template #prepend-inner><User :size="14" class="lp-input-icon" /></template>
          </v-text-field>
          </div>

          <div class="lp-fg lp-label-gap" v-motion :initial="{ opacity: 0, x: 30 }" :enter="{ opacity: 1, x: 0, transition: { delay: 450, type: 'spring', stiffness: 130, damping: 16 } }">
          <label class="lp-label">{{ $t('password') }}</label>
          <v-text-field
            v-model="form.password"
            :placeholder="$t('loginPasswordPh')"
            :type="show ? 'text' : 'password'"
            variant="outlined"
            density="compact"
            rounded="lg"
            autocomplete="current-password"
            :rules="[v => !!v || $t('required')]"
            hide-details="auto"
            :class="['lp-field', { 'lp-shake': auth.error }]"
          >
            <template #prepend-inner><Lock :size="14" class="lp-input-icon" /></template>
            <template #append-inner>
              <button type="button" class="lp-eye" :aria-label="$t(show ? 'loginHidePw' : 'loginShowPw')" @click="show = !show">
                <component :is="show ? EyeOff : Eye" :size="14" />
              </button>
            </template>
          </v-text-field>
          </div>

          <v-alert v-if="auth.error" type="error" variant="tonal" rounded="lg" density="compact" class="mb-4">
            {{ $t('invalidLogin') }}
          </v-alert>

          <div v-motion :initial="{ opacity: 0, y: 24, scale: 0.95 }" :enter="{ opacity: 1, y: 0, scale: 1, transition: { delay: 560, type: 'spring', stiffness: 140, damping: 14 } }">
          <v-btn type="submit" block rounded="lg" variant="flat" class="lp-signin" :loading="auth.loading">
            {{ $t('loginBtn') }}
            <ArrowRight :size="12" class="lp-arrow" />
          </v-btn>
          </div>
        </v-form>

        <div class="lp-secure">
          <ShieldCheck :size="11" />
          <span>{{ $t('loginSecure') }}</span>
        </div>
        <div class="lp-stitch" aria-hidden="true"></div>
      </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import VanillaTilt from 'vanilla-tilt'
import { celebrate } from '@/composables/useCelebrate'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import { useNotify } from '@/composables/useNotify'
import '@fontsource-variable/inter'
import { MotionDirective as vMotion } from '@vueuse/motion'
import { BarChart3, Users, PieChart, ClipboardList, User, Lock, Eye, EyeOff, ArrowRight, ShieldCheck, Cog, Shirt, Scissors, Layers, Sparkles } from 'lucide-vue-next'

const { locale, t } = useI18n()
const router = useRouter()
const auth = useAuthStore()
const notify = useNotify()
const formRef = ref()
const show = ref(false)
const lang = ref(locale.value)
const form = ref({ username: '', password: '' })

const features = computed(() => [
  { icon: BarChart3, tone: 'tone-blue', title: t('featProduction'), desc: t('featProductionDesc') },
  { icon: Users, tone: 'tone-amber', title: t('featPayroll'), desc: t('featPayrollDesc') },
  { icon: PieChart, tone: 'tone-teal', title: t('featAnalytics'), desc: t('featAnalyticsDesc') },
  { icon: ClipboardList, tone: 'tone-violet', title: t('featOrders'), desc: t('featOrdersDesc') },
])

const tiltEl = ref()

onMounted(() => {
  if (tiltEl.value && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    VanillaTilt.init(tiltEl.value, { max: 6, speed: 500, glare: true, 'max-glare': 0.12, scale: 1.01 })
  }
})

onBeforeUnmount(() => tiltEl.value?.vanillaTilt?.destroy())

function onParallax(e) {
  const x = (e.clientX / window.innerWidth - 0.5) * 2
  const y = (e.clientY / window.innerHeight - 0.5) * 2
  e.currentTarget.style.setProperty('--px', x.toFixed(3))
  e.currentTarget.style.setProperty('--py', y.toFixed(3))
}

function onSpotlight(e) {
  const r = e.currentTarget.getBoundingClientRect()
  e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`)
  e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`)
}

async function doLogin() {
  const { valid } = await formRef.value.validate()
  if (!valid) return
  const ok = await auth.login(form.value.username, form.value.password)
  if (ok) {
    notify.success(t('loginSuccess', { name: auth.user?.username || '' }))
    celebrate('burst')
    router.push('/dashboard')
  }
}

function changeLang(l) {
  locale.value = l
  localStorage.setItem('at-lang', l)
}
</script>

<style scoped>
.lp {
  --lp-a: #2563eb; --lp-ha: #7dd3fc; --lp-ha-soft: #e0f2fe; --lp-b: #f97316; --lp-c: #14b8a6;
  --lp-ov: 10, 25, 60; --lp-bg: #0b1730; --lp-main-bg: #eef3fb; --lp-card: rgba(255, 255, 255, 0.88);
  --lp-glow-a: rgba(249, 115, 22, 0.3); --lp-glow-b: rgba(59, 130, 246, 0.35); --lp-spot: rgba(37, 99, 235, 0.14);
  --lp-btn1: #3b82f6; --lp-btn2: #1d4ed8; --lp-btn-text: #ffffff; --lp-btn-rgb: 29, 78, 216;
  --lp-text: #0f1b33; --lp-muted: #5b6b86; --lp-label: #1f2d4a; --lp-border: rgba(15, 27, 51, 0.1);
  --lp-field: rgba(15, 27, 51, 0.03); --lp-field-focus: #ffffff; --lp-outline: rgba(15, 27, 51, 0.2);
  --lp-placeholder: #8a97ad; --lp-icon: #6b7a96; --lp-pill: rgba(15, 27, 51, 0.06);
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  background: var(--lp-bg);
  font-family: 'Inter Variable', Inter, 'Tamil Sangam MN', 'Noto Sans Tamil', system-ui, sans-serif;
}

.lp::after {
  content: '';
  position: fixed;
  inset: 0;
  z-index: 100;
  pointer-events: none;
  opacity: 0.07;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
}

/* ---------- Left hero ---------- */
.lp-hero {
  position: relative;
  flex: 1.4 1 0;
  min-width: 0;
  display: none;
  overflow: hidden;
  background: var(--lp-bg);
}

.lp-hero::after {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 2;
  pointer-events: none;
  background: radial-gradient(ellipse at center, transparent 45%, rgba(0, 0, 0, 0.6) 100%);
}

@media (min-width: 960px) {
  .lp-hero { display: block; }
}

.lp-fabric {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(90deg, rgba(var(--lp-ov), 0.88) 0%, rgba(var(--lp-ov), 0.45) 55%, rgba(var(--lp-ov), 0.1) 100%),
    url('/login-bg.jpg') center / cover no-repeat;
  filter: saturate(1.2) brightness(1.15);
  translate: calc(var(--px, 0) * -14px) calc(var(--py, 0) * -10px);
}

.lp-threads {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  height: 34%;
  z-index: 1;
  pointer-events: none;
  opacity: 0.55;
}

.lp-thread {
  fill: none;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-dasharray: 14 18;
}

.lp-thread.t1 { stroke: var(--lp-ha); }
.lp-thread.t2 { stroke: var(--lp-b); }
.lp-thread.t3 { stroke: var(--lp-c); }

.lp-tilt {
  width: min(100%, clamp(300px, 37vw, 470px));
  transform-style: preserve-3d;
}

.lp-tilt .lp-card { width: 100%; }

@media (max-width: 959px) {
  .lp-tilt { width: min(100%, 440px); }
}

.lp-glow {
  position: absolute;
  border-radius: 50%;
  filter: blur(40px);
  pointer-events: none;
}

.lp-glow-a {
  width: 360px;
  height: 360px;
  top: -150px;
  right: -120px;
  background: var(--lp-glow-a);
}

.lp-glow-b {
  width: 420px;
  height: 420px;
  bottom: -160px;
  left: -120px;
  background: var(--lp-glow-b);
}

.lp-hero-inner {
  position: relative;
  z-index: 1;
  min-height: 100%;
  padding: clamp(28px, 4vh, 48px) clamp(28px, 4vw, 60px) clamp(24px, 3vh, 40px);
  display: flex;
  flex-direction: column;
  color: #f1f5ff;
}

.lp-brand-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.lp-logo {
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26px;
  border-radius: 14px;
  background: linear-gradient(145deg, #1b2a52, #0b1330);
  box-shadow: 0 10px 20px -8px rgba(11, 19, 48, 0.5);
}

.lp-kicker {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 4px;
  text-transform: uppercase;
  color: var(--lp-ha);
}

.lp-title {
  margin: 26px 0 0;
  font-size: clamp(40px, 5vw, 60px);
  font-weight: 800;
  letter-spacing: -0.5px;
  line-height: 1.05;
  color: #ffffff;
}

.lp-title span {
  color: var(--lp-ha);
}

.lp-subtitle {
  margin: 4px 0 0;
  font-size: clamp(22px, 2.5vw, 30px);
  font-weight: 500;
  color: #9fb0cf;
}

.lp-lead {
  margin: 14px 0 0;
  font-size: 17px;
  line-height: 1.5;
  color: #b8c4dd;
}

.lp-features {
  list-style: none;
  padding: 0;
  margin: 32px 0 0;
  display: flex;
  flex-direction: column;
  gap: 22px;
  max-width: 440px;
}

.lp-feature {
  display: flex;
  align-items: center;
  gap: 16px;
}

.lp-feature strong {
  display: block;
  font-size: 17px;
  font-weight: 600;
  color: #f1f5ff;
}

.lp-feature small {
  font-size: 14px;
  color: #8fa0c2;
}

.lp-feature-icon {
  width: 48px;
  height: 48px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
}

.lp-feature-icon svg {
  width: 22px;
  height: 22px;
}

.tone-blue { color: #2f5bd6; background: #e3eaff; }
.tone-amber { color: #d98a10; background: #fff1d6; }
.tone-teal { color: #13957a; background: #dcf5ee; }
.tone-violet { color: #6a4fd6; background: #ebe5ff; }

.lp-stats {
  margin-top: auto;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px;
  padding: 18px 20px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.12);
  box-shadow: 0 16px 40px -18px rgba(0, 0, 0, 0.6);
}

.lp-stat {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.lp-stat-icon {
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
}

.lp-stat-icon svg {
  width: 16px;
  height: 16px;
}

.lp-stat strong {
  display: block;
  font-size: 18px;
  font-weight: 700;
  color: #ffffff;
}

.lp-stat small {
  display: block;
  font-size: 12px;
  line-height: 1.3;
  color: #8fa0c2;
}

/* ---------- Right card ---------- */
.lp-main {
  flex: 1 1 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20px;
  padding: clamp(20px, 4vw, 40px) 20px;
  background:
    radial-gradient(520px circle at var(--mx, 50%) var(--my, 40%), var(--lp-spot), transparent 70%),
    var(--lp-main-bg);
  transition: background-color 0.5s ease;
}

.lp-card {
  position: relative;
  width: min(100%, clamp(300px, 37vw, 470px));
  padding: clamp(24px, 3vw, 40px) clamp(22px, 3vw, 40px) 34px;
  border-radius: 28px;
  background: var(--lp-card);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  border: 1px solid var(--lp-border);
  box-shadow: 0 50px 90px -35px rgba(0, 0, 0, 0.55), 0 0 0 1px color-mix(in srgb, var(--lp-a) 12%, transparent);
  transition: background-color 0.5s ease;
}

.lp-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 28px;
  right: 28px;
  height: 3px;
  border-radius: 0 0 4px 4px;
  background: linear-gradient(90deg, var(--lp-c), var(--lp-a), var(--lp-b), var(--lp-a));
}

.lp-mobile-brand {
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--lp-text);
}

.lp-mobile-brand strong {
  display: block;
  font-size: 20px;
  font-weight: 800;
  letter-spacing: 0.5px;
}

.lp-mobile-brand small {
  font-size: 13px;
  color: var(--lp-muted);
}

@media (min-width: 960px) {
  .lp-mobile-brand { display: none; }
}

@media (max-width: 959px) {
  .lp-card { width: min(100%, 440px); }
}

@media (max-width: 480px) {
  .lp-card { padding: 28px 22px 22px; }
  .lp-welcome { font-size: 30px; }
  .lp-field :deep(.v-field) { font-size: 16px; }
  .lp-title { font-size: 40px; }
}

.lp-card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 28px;
}

.lp-lang {
  border-color: var(--lp-outline) !important;
}

.lp-lang :deep(.v-btn) {
  color: var(--lp-text);
}

.lp-welcome {
  margin: 0;
  font-size: clamp(30px, 3.4vw, 40px);
  font-weight: 900;
  letter-spacing: -0.3px;
  background: linear-gradient(90deg, var(--lp-text) 0%, var(--lp-a) 60%, var(--lp-b) 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.lp-desc {
  margin: 8px 0 28px;
  font-size: 14px;
  line-height: 1.5;
  color: var(--lp-muted);
}

.lp-label {
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 500;
  color: var(--lp-label);
}

.lp-label-gap {
  margin-top: 14px;
}

.lp-field :deep(.v-field) {
  font-size: 14px;
  background: var(--lp-field);
  transition: transform 0.25s ease, background-color 0.25s ease, box-shadow 0.25s ease;
}

.lp-field:focus-within :deep(.v-field) {
  transform: translateY(-2px);
}

.lp-field:focus-within .lp-input-icon {
  color: var(--lp-a);
  transform: scale(1.15);
}

.lp-input-icon {
  transition: color 0.25s ease, transform 0.25s ease;
}



.lp-field :deep(.v-field__input) {
  min-height: 50px;
}

.lp-field :deep(.v-field) {
  transition: transform 0.25s ease, box-shadow 0.3s ease;
}

.lp-field :deep(.v-field:hover) {
  transform: translateY(-1px);
}

.lp-field :deep(.v-field--focused) {
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--lp-a) 18%, transparent), 0 10px 24px -12px color-mix(in srgb, var(--lp-a) 45%, transparent);
}

.lp-field .lp-input-icon {
  transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), color 0.25s ease;
}

.lp-field:focus-within .lp-input-icon {
  color: var(--lp-a);
  transform: scale(1.25) rotate(-8deg);
}

.lp-eye {
  transition: transform 0.2s ease;
}

.lp-eye:hover {
  transform: scale(1.2);
}

@keyframes lpShake {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-8px); }
  40% { transform: translateX(8px); }
  60% { transform: translateX(-6px); }
  80% { transform: translateX(6px); }
}

.lp-shake :deep(.v-field) {
  animation: lpShake 0.5s ease;
  border-color: #d32f2f;
}

@media (prefers-reduced-motion: reduce) {
  .lp-shake :deep(.v-field) {
    animation: none;
  }
}

.lp-field :deep(.v-field--focused) {
  background: var(--lp-field-focus);
}

.lp-field :deep(input) {
  color: var(--lp-text);
}

.lp-field :deep(.v-field__outline) {
  color: var(--lp-outline);
}

.lp-field :deep(input:focus-visible) {
  outline: none;
}

.lp-field :deep(.v-field__input::placeholder) {
  color: var(--lp-placeholder);
  opacity: 1;
}

.lp-input-icon {
  color: var(--lp-icon);
  margin-inline-start: 2px;
}

.lp-eye {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--lp-icon);
  cursor: pointer;
}

.lp-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 8px 0 18px;
}

.lp-row :deep(.v-label) {
  font-size: 13px;
  color: #dbe4f5;
}

.lp-link {
  font-size: 13px;
  color: #2dd4bf;
  text-decoration: underline;
  text-underline-offset: 3px;
}

.lp-signin {
  height: 52px !important;
  margin-top: 22px;
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 0;
  text-transform: none;
  color: var(--lp-btn-text) !important;
  background: linear-gradient(90deg, var(--lp-btn1) 0%, var(--lp-btn2) 100%) !important;
  box-shadow: 0 12px 26px -10px rgba(var(--lp-btn-rgb), 0.55);
}

.lp-signin::after {
  content: '';
  position: absolute;
  top: 0;
  left: -75%;
  width: 50%;
  height: 100%;
  background: linear-gradient(120deg, transparent, rgba(255, 255, 255, 0.35), transparent);
  transform: skewX(-20deg);
  transition: left 0.7s ease;
}

.lp-signin:hover::after {
  left: 130%;
}

.lp-arrow {
  margin-inline-start: 8px;
  width: 18px;
  height: 18px;
}

.lp-secure {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin-top: 26px;
  width: fit-content;
  margin-inline: auto;
  padding: 7px 14px;
  border-radius: 999px;
  background: var(--lp-pill);
  font-size: 12px;
  color: var(--lp-muted);
}

@media (max-width: 380px) {
  .lp-card { padding: 24px 18px 20px; }
  .lp-row { flex-wrap: wrap; gap: 8px; }
}

@media (prefers-reduced-motion: reduce) {
  .lp-field:focus-within :deep(.v-field) { transform: none; }
}

/* ---------- FX layer ---------- */
.lp-fabric { transform-origin: 40% 50%; }

.lp-fleck {
  position: absolute;
  z-index: 1;
  left: calc(var(--n) * 5.4%);
  bottom: -14px;
  width: calc(3px + (var(--n) % 4) * 1.6px);
  height: calc(3px + (var(--n) % 4) * 1.6px);
  border-radius: 50%;
  background: var(--lp-ha);
  box-shadow: 0 0 12px var(--lp-ha);
  opacity: 0;
  pointer-events: none;
}

.lp-fleck:nth-child(3n) { background: var(--lp-b); box-shadow: 0 0 12px var(--lp-b); }

.lp-title span {
  background: linear-gradient(90deg, var(--lp-ha), var(--lp-ha-soft), var(--lp-ha), var(--lp-ha-soft));
  background-size: 250% 100%;
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.lp-card::after {
  content: '';
  position: absolute;
  inset: -1px;
  border-radius: inherit;
  padding: 1px;
  background: conic-gradient(from var(--lp-angle, 0deg), transparent 0%, color-mix(in srgb, var(--lp-a) 70%, transparent) 12%, transparent 28%, color-mix(in srgb, var(--lp-b) 60%, transparent) 62%, transparent 78%);
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
  mask: linear-gradient(#000 0 0) content-box exclude, linear-gradient(#000 0 0);
  pointer-events: none;
}

@property --lp-angle {
  syntax: '<angle>';
  inherits: false;
  initial-value: 0deg;
}

@media (prefers-reduced-motion: no-preference) {
  .lp-fabric { animation: lp-kenburns 24s ease-in-out infinite alternate; }
  .lp-thread { animation: lp-weave 6s linear infinite; }
  .lp-thread.t2 { animation-duration: 9s; animation-direction: reverse; }
  .lp-thread.t3 { animation-duration: 12s; }
  .lp-glow-a { animation: lp-drift 14s ease-in-out infinite alternate; }
  .lp-glow-b { animation: lp-drift 18s ease-in-out infinite alternate-reverse; }
  .lp-fleck { animation: lp-rise calc(8s + var(--n) * 0.6s) linear infinite; animation-delay: calc(var(--n) * -1.4s); }
  .lp-title span { animation: lp-shine 6s linear infinite; }
  .lp-logo { animation: lp-float 4s ease-in-out infinite; }
  .lp-feature-icon { animation: lp-float 5s ease-in-out infinite; }
  .lp-feature:nth-child(even) .lp-feature-icon { animation-delay: -2.5s; }
  .lp-card::after { animation: lp-spin 7s linear infinite; }
  .lp-card::before { background-size: 200% 100%; animation: lp-shine 5s linear infinite; }
  .lp-signin { animation: lp-glow 3s ease-in-out infinite; }
  .lp-secure svg { animation: lp-float 3s ease-in-out infinite; }
}

@keyframes lp-kenburns {
  from { transform: scale(1) translate(0, 0); }
  to { transform: scale(1.1) translate(-1.5%, -1%); }
}

@keyframes lp-weave { to { stroke-dashoffset: -640; } }

@keyframes lp-drift {
  to { transform: translate(-40px, 30px) scale(1.12); }
}

@keyframes lp-rise {
  0% { transform: translateY(0) translateX(0); opacity: 0; }
  12% { opacity: 0.9; }
  100% { transform: translateY(-110vh) translateX(30px); opacity: 0; }
}

@keyframes lp-shine { to { background-position: -250% 0; } }

@keyframes lp-float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
}

@keyframes lp-spin { to { --lp-angle: 360deg; } }

@keyframes lp-glow {
  0%, 100% { box-shadow: 0 12px 26px -10px rgba(var(--lp-btn-rgb), 0.55); }
  50% { box-shadow: 0 14px 34px -6px rgba(var(--lp-btn-rgb), 0.85); }
}

/* ---------- Polish ---------- */
.lp-feature {
  padding: 12px 16px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.07);
  border: 1px solid rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  transition: background-color 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease;
}

.lp-feature:hover {
  background: rgba(255, 255, 255, 0.13);
  border-color: var(--lp-ha);
  box-shadow: 0 14px 30px -16px var(--lp-ha);
}

.lp-features { gap: 14px; }

.lp-title, .lp-subtitle, .lp-lead { text-shadow: 0 2px 18px rgba(0, 0, 0, 0.55); }

.lp-foot {
  margin-top: auto;
  padding-top: 28px;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
  letter-spacing: 0.4px;
  color: rgba(241, 245, 255, 0.7);
}

.lp-foot-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--lp-ha);
  box-shadow: 0 0 10px var(--lp-ha);
}

.lp-main { position: relative; overflow: hidden; }
.lp-tilt, .lp-mobile-brand { position: relative; z-index: 1; }

.lp-blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(70px);
  opacity: 0.45;
  pointer-events: none;
}

.lp-blob-a { width: 320px; height: 320px; top: -90px; right: -90px; background: var(--lp-a); }
.lp-blob-b { width: 280px; height: 280px; bottom: -90px; left: -70px; background: var(--lp-b); }

.lp-card { box-shadow: 0 50px 90px -35px rgba(0, 0, 0, 0.55), 0 0 60px -20px color-mix(in srgb, var(--lp-a) 40%, transparent), 0 0 0 1px color-mix(in srgb, var(--lp-a) 12%, transparent); }

@media (prefers-reduced-motion: no-preference) {
  .lp-blob-a { animation: lp-drift 16s ease-in-out infinite alternate; }
  .lp-blob-b { animation: lp-drift 20s ease-in-out infinite alternate-reverse; }
}

/* ---------- Background decoration ---------- */
.lp-deco {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}

.lp-grid {
  position: absolute;
  inset: 0;
  background-image: radial-gradient(color-mix(in srgb, var(--lp-a) 45%, transparent) 1.2px, transparent 1.5px);
  background-size: 26px 26px;
  -webkit-mask-image: radial-gradient(circle at 50% 50%, #000 15%, transparent 72%);
  mask-image: radial-gradient(circle at 50% 50%, #000 15%, transparent 72%);
  opacity: 0.55;
}

.lp-ring {
  position: absolute;
  left: 50%;
  top: 50%;
  border-radius: 50%;
  border: 1px solid color-mix(in srgb, var(--lp-a) 28%, transparent);
  transform: translate(-50%, -50%);
}

.lp-ring.r1 { width: 560px; height: 560px; }
.lp-ring.r2 { width: 780px; height: 780px; border-style: dashed; border-color: color-mix(in srgb, var(--lp-b) 24%, transparent); }
.lp-ring.r3 { width: 1020px; height: 1020px; }

.lp-cog {
  position: absolute;
  color: var(--lp-a);
  opacity: 0.2;
}

.lp-cog.c1 { right: -70px; bottom: -60px; }
.lp-cog.c2 { left: 24px; top: 36px; color: var(--lp-b); }
.lp-cog.c3 { right: 12%; top: 12%; }

@media (prefers-reduced-motion: no-preference) {
  .lp-ring.r1 { animation: lp-pulse 6s ease-in-out infinite; }
  .lp-ring.r2 { animation: lp-pulse 8s ease-in-out infinite -2s; }
  .lp-ring.r3 { animation: lp-pulse 10s ease-in-out infinite -4s; }
  .lp-cog.c1 { animation: lp-turn 40s linear infinite; }
  .lp-cog.c2 { animation: lp-turn 28s linear infinite reverse; }
  .lp-cog.c3 { animation: lp-turn 18s linear infinite; }
}

@keyframes lp-pulse {
  0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.9; }
  50% { transform: translate(-50%, -50%) scale(1.06); opacity: 0.4; }
}

@keyframes lp-turn { to { transform: rotate(360deg); } }

/* ---------- Orbit, chips, waves ---------- */
.lp-orbit {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 640px;
  height: 640px;
  margin: -320px 0 0 -320px;
}

.lp-orbit i {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 10px;
  height: 10px;
  margin: -5px;
  border-radius: 50%;
  background: var(--lp-b);
  box-shadow: 0 0 14px var(--lp-b);
  transform: rotate(calc(var(--i, 0) * 120deg)) translateX(320px);
}

.lp-orbit i:nth-child(1) { --i: 0; }
.lp-orbit i:nth-child(2) { --i: 1; background: var(--lp-a); box-shadow: 0 0 14px var(--lp-a); }
.lp-orbit i:nth-child(3) { --i: 2; background: var(--lp-c); box-shadow: 0 0 14px var(--lp-c); }

.lp-chip {
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 14px;
  color: var(--lp-a);
  background: rgba(255, 255, 255, 0.7);
  border: 1px solid color-mix(in srgb, var(--lp-a) 25%, transparent);
  box-shadow: 0 14px 30px -14px color-mix(in srgb, var(--lp-a) 60%, transparent);
  backdrop-filter: blur(6px);
}

.lp-chip.k1 { top: 14%; left: 8%; }
.lp-chip.k2 { top: 22%; right: 7%; color: var(--lp-b); }
.lp-chip.k3 { bottom: 20%; left: 6%; color: var(--lp-c); }
.lp-chip.k4 { bottom: 14%; right: 10%; width: 38px; height: 38px; border-radius: 50%; color: var(--lp-b); }

.lp-wave {
  position: absolute;
  left: 0;
  bottom: 0;
  width: 100%;
  height: 26%;
}

.lp-wave .w1 { fill: color-mix(in srgb, var(--lp-a) 10%, transparent); }
.lp-wave .w2 { fill: color-mix(in srgb, var(--lp-b) 10%, transparent); }

@media (max-width: 700px) {
  .lp-chip, .lp-orbit { display: none; }
}

@media (prefers-reduced-motion: no-preference) {
  .lp-orbit { animation: lp-turn 26s linear infinite; }
  .lp-chip.k1 { animation: lp-bob 5s ease-in-out infinite; }
  .lp-chip.k2 { animation: lp-bob 6s ease-in-out infinite -1.5s; }
  .lp-chip.k3 { animation: lp-bob 7s ease-in-out infinite -3s; }
  .lp-chip.k4 { animation: lp-bob 4.5s ease-in-out infinite -2s; }
  .lp-wave .w1 { animation: lp-sway 9s ease-in-out infinite alternate; }
  .lp-wave .w2 { animation: lp-sway 12s ease-in-out infinite alternate-reverse; }
  .lp-arrow { animation: lp-nudge 1.6s ease-in-out infinite; }
  .lp-signin::before { animation: lp-ping 2.8s ease-out infinite; }
  .lp-welcome { animation: lp-shine 8s linear infinite; background-size: 220% 100%; }
}

@keyframes lp-bob {
  0%, 100% { transform: translateY(0) rotate(-4deg); }
  50% { transform: translateY(-14px) rotate(4deg); }
}

@keyframes lp-sway { to { transform: translateX(-4%) scaleY(1.15); } }

@keyframes lp-nudge {
  0%, 100% { transform: translateX(0); }
  50% { transform: translateX(5px); }
}

@keyframes lp-ping {
  0% { box-shadow: 0 0 0 0 rgba(var(--lp-btn-rgb), 0.45); }
  70%, 100% { box-shadow: 0 0 0 16px rgba(var(--lp-btn-rgb), 0); }
}

/* ---------- Form field motion ---------- */
.lp-fg { position: relative; }

.lp-fg::after {
  content: '';
  position: absolute;
  left: 8px;
  right: 8px;
  bottom: 0;
  height: 2px;
  border-radius: 2px;
  background: linear-gradient(90deg, var(--lp-a), var(--lp-b));
  transform: scaleX(0);
  transform-origin: left;
  transition: transform 0.45s ease;
  pointer-events: none;
}

.lp-fg:focus-within::after { transform: scaleX(1); }

.lp-signin::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
}

.lp-signin:hover .lp-arrow { transform: translateX(6px); }

/* ---------- Card badge, sparkles, stitch ---------- */
.lp-badge {
  position: relative;
  width: 46px;
  height: 46px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.lp-badge-core {
  position: relative;
  z-index: 1;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  border-radius: 14px;
  background: linear-gradient(145deg, var(--lp-btn1), var(--lp-btn2));
  box-shadow: 0 10px 20px -8px rgba(var(--lp-btn-rgb), 0.7);
}

.lp-badge-ring {
  position: absolute;
  inset: -4px;
  border-radius: 18px;
  border: 2px dashed color-mix(in srgb, var(--lp-a) 55%, transparent);
}

.lp-spark {
  position: absolute;
  top: calc(8% + var(--n) * 14%);
  left: -4px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--lp-b);
  box-shadow: 0 0 14px 2px var(--lp-b);
  opacity: 0.7;
  pointer-events: none;
}

.lp-spark:nth-of-type(even) { left: auto; right: -4px; }
.lp-spark:nth-of-type(3n) { background: var(--lp-a); box-shadow: 0 0 14px 2px var(--lp-a); }

.lp-stitch {
  margin: 18px 6px 0;
  height: 0;
  border-top: 2px dashed color-mix(in srgb, var(--lp-a) 35%, transparent);
  opacity: 0.8;
}

/* ---------- Behind the form: weave patterns and bubbles ---------- */
.lp-weave {
  position: absolute;
  width: 340px;
  height: 340px;
  background-image:
    repeating-linear-gradient(45deg, color-mix(in srgb, var(--lp-a) 22%, transparent) 0 1px, transparent 1px 14px),
    repeating-linear-gradient(-45deg, color-mix(in srgb, var(--lp-b) 20%, transparent) 0 1px, transparent 1px 14px);
}

.lp-weave.w-tl {
  top: 0;
  left: 0;
  -webkit-mask-image: radial-gradient(circle at 0 0, #000 20%, transparent 70%);
  mask-image: radial-gradient(circle at 0 0, #000 20%, transparent 70%);
}

.lp-weave.w-br {
  right: 0;
  bottom: 0;
  -webkit-mask-image: radial-gradient(circle at 100% 100%, #000 20%, transparent 70%);
  mask-image: radial-gradient(circle at 100% 100%, #000 20%, transparent 70%);
}

.lp-bubble {
  position: absolute;
  left: calc(var(--n) * 7%);
  bottom: -40px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 1px solid color-mix(in srgb, var(--lp-a) 45%, transparent);
  background: radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.8), color-mix(in srgb, var(--lp-a) 12%, transparent));
  opacity: 0;
}

@media (prefers-reduced-motion: no-preference) {
  .lp-badge-ring { animation: lp-turn 12s linear infinite; }
  .lp-badge-core { animation: lp-bob 4s ease-in-out infinite; }
  .lp-spark { animation: lp-twinkle calc(2s + var(--n) * 0.4s) ease-in-out infinite; }
  .lp-stitch { animation: lp-march 1.2s linear infinite; }
  .lp-weave.w-tl { animation: lp-breathe 10s ease-in-out infinite alternate; }
  .lp-weave.w-br { animation: lp-breathe 12s ease-in-out infinite alternate-reverse; }
  .lp-bubble { animation: lp-bubble calc(9s + var(--n) * 0.8s) ease-in infinite; animation-delay: calc(var(--n) * -1.3s); }
}

.lp-bubble:nth-of-type(3n) { width: 22px; height: 22px; }
.lp-bubble:nth-of-type(4n) { width: 10px; height: 10px; }

@keyframes lp-twinkle {
  0%, 100% { transform: scale(0.5); opacity: 0.2; }
  50% { transform: scale(1.4); opacity: 0.9; }
}

@keyframes lp-march { to { border-top-color: color-mix(in srgb, var(--lp-b) 55%, transparent); } }

@keyframes lp-breathe {
  from { opacity: 0.5; transform: scale(1); }
  to { opacity: 1; transform: scale(1.08); }
}

@keyframes lp-bubble {
  0% { transform: translateY(0) translateX(0) scale(0.6); opacity: 0; }
  15% { opacity: 0.85; }
  100% { transform: translateY(-105vh) translateX(24px) scale(1.1); opacity: 0; }
}
</style>
