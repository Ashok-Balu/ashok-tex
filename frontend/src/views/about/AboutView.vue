<template>
  <div class="about-page pa-4 pa-md-6">
    <!-- Hero Section -->
    <v-card rounded="xl" class="about-hero mb-6" elevation="0">
      <div class="hero-bg"></div>
      <span v-for="n in 6" :key="n" class="hero-thread" :style="{ '--n': n }" aria-hidden="true"></span>
      <div class="hero-content">
        <div class="hero-text">
          <div class="hero-logo-ring" v-motion :initial="{ opacity: 0, scale: 0.6 }" :enter="{ opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 200, damping: 14 } }">
            <span class="hero-logo">🧵</span>
          </div>
          <h1 class="hero-title" v-motion :initial="{ opacity: 0, y: 20 }" :enter="{ opacity: 1, y: 0, transition: { delay: 150 } }">{{ t('appName') }}</h1>
          <p class="hero-subtitle" v-motion :initial="{ opacity: 0, y: 16 }" :enter="{ opacity: 1, y: 0, transition: { delay: 300 } }">{{ t('aboutTagline') }}</p>
          <div class="hero-divider"></div>
          <div class="hero-stats">
            <div class="hero-stat">
              <div class="stat-number"><AnimatedNumber :value="12" :duration="1400" />+</div>
              <div class="stat-label">{{ t('companies') }}</div>
            </div>
            <div class="hero-stat-divider"></div>
            <div class="hero-stat">
              <div class="stat-number"><AnimatedNumber :value="14" :duration="1400" /></div>
              <div class="stat-label">{{ t('machines') }}</div>
            </div>
            <div class="hero-stat-divider"></div>
            <div class="hero-stat">
              <div class="stat-number">24/7</div>
              <div class="stat-label">{{ t('production') }}</div>
            </div>
          </div>
        </div>
        <div class="hero-art" v-tilt v-motion :initial="{ opacity: 0, x: 40 }" :enter="{ opacity: 1, x: 0, transition: { delay: 250, duration: 700 } }">
          <img src="/about/hero-loom.svg" alt="Loom weaving fabric" class="hero-art-img" width="480" height="360" />
        </div>
      </div>
      <svg class="hero-wave" viewBox="0 0 1440 120" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0,64 C360,120 720,0 1080,64 C1260,96 1360,80 1440,64 L1440,120 L0,120 Z" />
      </svg>
    </v-card>

    <v-row>
      <!-- Business Info -->
      <v-col cols="12" md="6" lg="4">
        <v-card rounded="xl" elevation="0" class="about-card h-100" v-motion :initial="{ opacity: 0, y: 24 }" :enter="{ opacity: 1, y: 0, transition: { delay: 100 } }">
          <div class="card-accent accent-indigo"></div>
          <v-card-text class="pa-6 pt-5">
            <div class="card-head">
              <div class="card-icon-wrap bg-indigo">
                <v-icon color="white" size="22">mdi-office-building</v-icon>
              </div>
              <h3 class="card-title">{{ t('aboutBusinessInfo') }}</h3>
            </div>

            <div class="info-list">
              <div class="info-row">
                <div class="info-icon"><v-icon size="18" color="indigo-darken-1">mdi-domain</v-icon></div>
                <div>
                  <div class="info-label">{{ t('aboutBusinessName') }}</div>
                  <div class="info-value">ASHOKTEX</div>
                </div>
              </div>
              <div class="info-row">
                <div class="info-icon"><v-icon size="18" color="indigo-darken-1">mdi-account-tie</v-icon></div>
                <div>
                  <div class="info-label">{{ t('aboutOwner') }}</div>
                  <div class="info-value">Balusamy M</div>
                </div>
              </div>
              <div class="info-row">
                <div class="info-icon"><v-icon size="18" color="indigo-darken-1">mdi-factory</v-icon></div>
                <div>
                  <div class="info-label">{{ t('aboutType') }}</div>
                  <div class="info-value">Powerloom & Autoloom Weaving</div>
                </div>
              </div>
              <div class="info-row">
                <div class="info-icon"><v-icon size="18" color="indigo-darken-1">mdi-map-marker</v-icon></div>
                <div>
                  <div class="info-label">{{ t('aboutAddress') }}</div>
                  <div class="info-value">7/72 Manjanayakkanpatti Pirivu, Esanatham Main Road, Paganatham, Karur - 639118</div>
                </div>
              </div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- Contact Details -->
      <v-col cols="12" md="6" lg="4">
        <v-card rounded="xl" elevation="0" class="about-card h-100" v-motion :initial="{ opacity: 0, y: 24 }" :enter="{ opacity: 1, y: 0, transition: { delay: 200 } }">
          <div class="card-accent accent-green"></div>
          <v-card-text class="pa-6 pt-5">
            <div class="card-head">
              <div class="card-icon-wrap bg-green">
                <v-icon color="white" size="22">mdi-phone-in-talk</v-icon>
              </div>
              <h3 class="card-title">{{ t('aboutContact') }}</h3>
            </div>

            <div class="info-list">
              <div class="info-row clickable" @click="callPhone">
                <div class="info-icon"><v-icon size="18" color="green-darken-2">mdi-phone</v-icon></div>
                <div>
                  <div class="info-label">{{ t('aboutPhone') }}</div>
                  <div class="info-value text-green-darken-2">+91 79041 54775</div>
                </div>
                <v-icon size="16" color="grey-lighten-1" class="ml-auto">mdi-open-in-new</v-icon>
              </div>
              <div class="info-row clickable" @click="openWhatsApp">
                <div class="info-icon"><v-icon size="18" color="green-darken-2">mdi-whatsapp</v-icon></div>
                <div>
                  <div class="info-label">{{ t('aboutWhatsApp') }}</div>
                  <div class="info-value text-green-darken-2">+91 79041 54775</div>
                </div>
                <v-icon size="16" color="grey-lighten-1" class="ml-auto">mdi-open-in-new</v-icon>
              </div>
              <div class="info-row">
                <div class="info-icon"><v-icon size="18" color="green-darken-2">mdi-map-marker-outline</v-icon></div>
                <div>
                  <div class="info-label">{{ t('aboutAddress') }}</div>
                  <div class="info-value">7/72 Manjanayakkanpatti Pirivu, Esanatham Main Road, Paganatham, Karur - 639118</div>
                </div>
              </div>
              <div class="info-row">
                <div class="info-icon"><v-icon size="18" color="green-darken-2">mdi-card-account-details-outline</v-icon></div>
                <div>
                  <div class="info-label">GSTIN</div>
                  <div class="info-value">33AJNPB5025G1ZM</div>
                </div>
              </div>
              <div class="info-row clickable" @click="openWebsite">
                <div class="info-icon"><v-icon size="18" color="green-darken-2">mdi-web</v-icon></div>
                <div>
                  <div class="info-label">Website</div>
                  <div class="info-value text-green-darken-2">ashoktex.com</div>
                </div>
                <v-icon size="16" color="grey-lighten-1" class="ml-auto">mdi-open-in-new</v-icon>
              </div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- Services -->
      <v-col cols="12" md="12" lg="4">
        <v-card rounded="xl" elevation="0" class="about-card h-100" v-motion :initial="{ opacity: 0, y: 24 }" :enter="{ opacity: 1, y: 0, transition: { delay: 300 } }">
          <div class="card-accent accent-orange"></div>
          <v-card-text class="pa-6 pt-5">
            <div class="card-head">
              <div class="card-icon-wrap bg-orange">
                <v-icon color="white" size="22">mdi-cog</v-icon>
              </div>
              <h3 class="card-title">{{ t('aboutServices') }}</h3>
            </div>

            <div class="services-grid">
              <div class="service-card" v-for="(service, i) in services" :key="service.icon" v-motion :initial="{ opacity: 0, x: 16 }" :enter="{ opacity: 1, x: 0, transition: { delay: 400 + i * 100 } }">
                <div class="service-icon" :style="{ background: service.bg, color: service.fg }">
                  <v-icon size="20">{{ service.icon }}</v-icon>
                </div>
                <div class="service-text">
                  <div class="service-title">{{ service.title }}</div>
                  <div class="service-desc">{{ service.desc }}</div>
                </div>
              </div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- Location Map -->
      <v-col cols="12" md="8">
        <v-card rounded="xl" elevation="0" class="about-card" v-motion :initial="{ opacity: 0, y: 24 }" :enter="{ opacity: 1, y: 0, transition: { delay: 500 } }">
          <div class="card-accent accent-red"></div>
          <v-card-text class="pa-6 pt-5">
            <div class="card-head">
              <div class="card-icon-wrap bg-red">
                <v-icon color="white" size="22">mdi-map-marker-radius</v-icon>
              </div>
              <h3 class="card-title">{{ t('aboutLocation') }}</h3>
            </div>
            <div class="map-shell">
              <div class="map-toolbar">
                <div>
                  <div class="map-eyebrow">Exact Business Pin</div>
                  <div class="map-heading">Ashok Tex, weaving unit</div>
                </div>
                <div class="map-actions">
                  <a class="map-link primary" :href="mapsPlaceUrl" target="_blank" rel="noopener noreferrer">
                    <v-icon size="16">mdi-map-search</v-icon>
                    <span>Open in Google Maps</span>
                  </a>
                  <a class="map-link" :href="mapsShareUrl" target="_blank" rel="noopener noreferrer">
                    <v-icon size="16">mdi-share-variant</v-icon>
                    <span>Shared Link</span>
                  </a>
                </div>
              </div>

              <div class="map-frame">
                <iframe
                  src="https://www.google.com/maps?q=Ashok%20Tex%2C%20weaving%20unit%4010.8439428%2C78.0379084&z=17&output=embed"
                  width="100%"
                  height="320"
                  style="border:0;"
                  allowfullscreen
                  loading="lazy"
                  referrerpolicy="no-referrer-when-downgrade"
                ></iframe>
              </div>
            </div>
            <div class="location-note">
              <div class="location-line">Ashok Tex, weaving unit</div>
              <div class="location-line">7/72 Manjanayakkanpatti Pirivu, Esanatham Main Road, Paganatham</div>
              <div class="location-line">Karur - 639118</div>
              <div class="location-line subtle">Map pin: 10.8439428, 78.0379084</div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- App Info -->
      <v-col cols="12" md="4">
        <v-card rounded="xl" elevation="0" class="about-card app-info-card h-100" v-motion :initial="{ opacity: 0, y: 24 }" :enter="{ opacity: 1, y: 0, transition: { delay: 600 } }">
          <div class="card-accent accent-blue"></div>
          <v-card-text class="pa-6 pt-5">
            <div class="card-head">
              <div class="card-icon-wrap bg-blue">
                <v-icon color="white" size="22">mdi-cellphone-link</v-icon>
              </div>
              <h3 class="card-title">{{ t('aboutApp') }}</h3>
            </div>

            <div class="app-info-stack">
              <div class="app-info-item">
                <v-icon size="20" color="blue-darken-1">mdi-application</v-icon>
                <div>
                  <div class="info-label">{{ t('aboutAppName') }}</div>
                  <div class="info-value">Ashok Tex ERP</div>
                </div>
              </div>
              <div class="app-info-item">
                <v-icon size="20" color="blue-darken-1">mdi-tag-outline</v-icon>
                <div>
                  <div class="info-label">{{ t('aboutVersion') }}</div>
                  <div class="info-value">v2.0.0</div>
                </div>
              </div>
              <div class="app-info-item">
                <v-icon size="20" color="blue-darken-1">mdi-code-tags</v-icon>
                <div>
                  <div class="info-label">{{ t('aboutTech') }}</div>
                  <div class="info-value">Vue 3 + Node.js</div>
                </div>
              </div>
              <div class="app-info-item">
                <v-icon size="20" color="blue-darken-1">mdi-shield-check-outline</v-icon>
                <div>
                  <div class="info-label">{{ t('aboutSecurity') }}</div>
                  <div class="info-value">JWT + Encrypted</div>
                </div>
              </div>
              <div class="app-info-item">
                <v-icon size="20" color="blue-darken-1">mdi-translate</v-icon>
                <div>
                  <div class="info-label">Languages</div>
                  <div class="info-value">Tamil & English</div>
                </div>
              </div>
              <div class="app-info-item">
                <v-icon size="20" color="blue-darken-1">mdi-currency-inr</v-icon>
                <div>
                  <div class="info-label">Currency</div>
                  <div class="info-value">Indian Rupee (INR)</div>
                </div>
              </div>
              <div class="app-info-item">
                <v-icon size="20" color="blue-darken-1">mdi-database-outline</v-icon>
                <div>
                  <div class="info-label">Database</div>
                  <div class="info-value">MongoDB</div>
                </div>
              </div>
              <div class="app-info-item">
                <v-icon size="20" color="blue-darken-1">mdi-earth</v-icon>
                <div>
                  <div class="info-label">Region</div>
                  <div class="info-value">Karur, Tamil Nadu</div>
                </div>
              </div>
            </div>

            <div class="app-footer">
              <div class="app-footer-text">{{ t('aboutMadeWith') }}</div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Process timeline -->
    <section class="about-section" data-aos="fade-up">
      <div class="section-head">
        <h2 class="section-title">{{ t('aboutProcess') }}</h2>
        <p class="section-sub">{{ t('aboutProcessSub') }}</p>
      </div>
      <ol class="process">
        <li v-for="(step, i) in processSteps" :key="step.icon" class="process-step" data-aos="zoom-in" :data-aos-delay="i * 120">
          <div class="process-node" :style="{ '--c': step.color }">
            <v-icon size="26" color="white">{{ step.icon }}</v-icon>
            <span class="process-num">{{ i + 1 }}</span>
          </div>
          <div class="process-label">{{ t(step.key) }}</div>
        </li>
      </ol>
    </section>

    <!-- Gallery -->
    <section class="about-section" data-aos="fade-up">
      <div class="section-head">
        <h2 class="section-title">{{ t('aboutGallery') }}</h2>
        <p class="section-sub">{{ t('aboutGallerySub') }}</p>
      </div>
      <div class="gallery">
        <figure v-for="(g, i) in gallery" :key="g.src" class="gallery-item" v-tilt data-aos="fade-up" :data-aos-delay="i * 150">
          <img :src="g.src" :alt="t(g.key)" loading="lazy" width="600" height="400" />
          <figcaption>{{ t(g.key) }}</figcaption>
        </figure>
      </div>
    </section>

    <!-- Tech marquee -->
    <section class="about-section" data-aos="fade-up">
      <div class="section-head">
        <h2 class="section-title">{{ t('aboutPoweredBy') }}</h2>
      </div>
      <div class="marquee" aria-label="Technologies">
        <div class="marquee-track">
          <span v-for="(tech, i) in marqueeTech" :key="tech.name + i" class="tech-chip" :aria-hidden="i >= techs.length">
            <v-icon size="18" :color="tech.color">{{ tech.icon }}</v-icon>{{ tech.name }}
          </span>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { onMounted, onActivated } from 'vue'
import { useI18n } from 'vue-i18n'
import { MotionDirective as vMotion } from '@vueuse/motion'
import AOS from 'aos'
import 'aos/dist/aos.css'
import VanillaTilt from 'vanilla-tilt'
import AnimatedNumber from '@/components/common/AnimatedNumber.vue'

const { t } = useI18n()

const vTilt = {
  mounted(el) {
    if (window.matchMedia('(prefers-reduced-motion: reduce), (pointer: coarse)').matches) return
    VanillaTilt.init(el, { max: 8, speed: 400, glare: true, 'max-glare': 0.25, scale: 1.02 })
  },
  unmounted(el) { el.vanillaTilt?.destroy() },
}

const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
onMounted(() => AOS.init({ duration: 700, easing: 'ease-out-cubic', once: true, offset: 60, disable: reduceMotion }))
onActivated(() => AOS.refreshHard())

const processSteps = [
  { icon: 'mdi-warehouse', key: 'aboutStep1', color: '#6366f1' },
  { icon: 'mdi-sine-wave', key: 'aboutStep2', color: '#0ea5e9' },
  { icon: 'mdi-texture-box', key: 'aboutStep3', color: '#10b981' },
  { icon: 'mdi-magnify-scan', key: 'aboutStep4', color: '#f59e0b' },
  { icon: 'mdi-truck-delivery', key: 'aboutStep5', color: '#ef4444' },
]

const gallery = [
  { src: '/about/gallery-yarn.svg', key: 'aboutGalYarn' },
  { src: '/about/gallery-weaving.svg', key: 'aboutGalWeaving' },
  { src: '/about/gallery-fabric.svg', key: 'aboutGalFabric' },
]

const techs = [
  { name: 'Vue 3', icon: 'mdi-vuejs', color: '#42b883' },
  { name: 'Vuetify', icon: 'mdi-material-design', color: '#1867c0' },
  { name: 'Node.js', icon: 'mdi-nodejs', color: '#3c873a' },
  { name: 'MongoDB', icon: 'mdi-database', color: '#13aa52' },
  { name: 'ApexCharts', icon: 'mdi-chart-areaspline', color: '#008ffb' },
  { name: 'AG Grid', icon: 'mdi-table-large', color: '#e8590c' },
  { name: 'Vite', icon: 'mdi-lightning-bolt', color: '#a855f7' },
  { name: 'VueUse Motion', icon: 'mdi-animation-play', color: '#ec4899' },
]
const marqueeTech = [...techs, ...techs]

const mapsPlaceUrl = 'https://www.google.com/maps/place/Ashok+Tex,+weaving+unit/@10.8439428,78.0379084,17z/data=!3m1!4b1!4m6!3m5!1s0x3baa2598ff9b4029:0xe3981d2da7644da1!8m2!3d10.8439428!4d78.0379084!16s%2Fg%2F11sjtjhjx1!18m1!1e1?entry=ttu'
const mapsShareUrl = 'https://share.google/dEtuNxkdQe9eIfEzV'

const services = [
  { icon: 'mdi-texture-box', bg: '#e8eaf6', fg: '#3949ab', title: 'Powerloom Weaving', desc: 'Quality fabric production' },
  { icon: 'mdi-robot-industrial', bg: '#e3f2fd', fg: '#1e88e5', title: 'Autoloom Ops', desc: 'Automated weaving' },
  { icon: 'mdi-account-group', bg: '#e0f7f4', fg: '#00897b', title: 'Workforce', desc: 'Payroll & attendance' },
  { icon: 'mdi-chart-bar', bg: '#fff3e0', fg: '#fb8c00', title: 'Analytics', desc: 'Business insights' },
]

function callPhone() { window.open('tel:+917904154775') }
function openWhatsApp() { window.open('https://wa.me/917904154775', '_blank') }
function openWebsite() { window.open('https://ashoktex.com', '_blank') }
</script>

<style scoped>
.about-page {
  max-width: 1200px;
  margin: 0 auto;
}

/* ── Hero ── */
.about-hero {
  position: relative;
  overflow: hidden;
  border: none;
}

.hero-bg {
  position: absolute;
  inset: 0;
  background: linear-gradient(120deg, #142a6e 0%, #1e40af 50%, #2f63d6 100%);
}

.hero-bg::after {
  background-image:
    linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px);
  background-size: 32px 32px;
  mask-image: radial-gradient(circle at 50% 50%, #000 0%, transparent 75%);
}

.hero-bg::before {
  content: '';
  position: absolute;
  top: -40%;
  right: -20%;
  width: 600px;
  height: 600px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255,255,255,0.06) 0%, transparent 70%);
}

.hero-bg::after {
  content: '';
  position: absolute;
  bottom: -30%;
  left: -10%;
  width: 400px;
  height: 400px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255,255,255,0.04) 0%, transparent 70%);
}

.hero-content {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(0, 0.9fr);
  align-items: center;
  gap: 24px;
  text-align: left;
  padding: 52px 40px 84px;
}

.hero-text { min-width: 0; }
.hero-text .hero-divider { margin-left: 0; }
.hero-text .hero-stats { justify-content: flex-start; flex-wrap: wrap; }
.hero-text .hero-stat { padding-left: 0; }

.hero-art {
  min-width: 0;
  transform-style: preserve-3d;
}

.hero-art-img {
  display: block;
  width: 100%;
  height: auto;
  max-width: 460px;
  margin: 0 auto;
  filter: drop-shadow(0 24px 40px rgba(0, 0, 0, 0.3));
  animation: about-float 6s ease-in-out infinite;
}

.hero-logo-ring { animation: about-pulse 3.2s ease-in-out infinite; }

.hero-thread {
  position: absolute;
  top: -10%;
  left: calc(var(--n) * 15%);
  width: 2px;
  height: 120%;
  background: linear-gradient(180deg, transparent, rgba(255, 255, 255, 0.35), transparent);
  transform: rotate(14deg);
  animation: about-thread calc(4s + var(--n) * 0.7s) ease-in-out infinite alternate;
  pointer-events: none;
}

@keyframes about-float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

@keyframes about-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.35); }
  50% { box-shadow: 0 0 0 16px rgba(255, 255, 255, 0); }
}

@keyframes about-thread {
  from { transform: translateX(-24px) rotate(14deg); opacity: 0.4; }
  to { transform: translateX(24px) rotate(14deg); opacity: 1; }
}

@keyframes about-marquee {
  to { transform: translateX(-50%); }
}

/* ── Sections ── */
.about-section { margin-top: 40px; }

.section-head { text-align: center; margin-bottom: 24px; }

.section-title {
  display: inline-block;
  position: relative;
  font-size: 24px;
  font-weight: 800;
  color: #1a2744;
  padding-bottom: 10px;
}

.section-title::after {
  content: '';
  position: absolute;
  left: 25%;
  right: 25%;
  bottom: 0;
  height: 3px;
  border-radius: 2px;
  background: linear-gradient(90deg, #1e40af, #f59e0b);
}

.section-sub { margin-top: 8px; color: #64748b; font-size: 14px; }

/* Process */
.process {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 12px;
  position: relative;
}

.process::before {
  content: '';
  position: absolute;
  top: 32px;
  left: 10%;
  right: 10%;
  height: 3px;
  background: repeating-linear-gradient(90deg, #cbd5e1 0 8px, transparent 8px 16px);
}

.process-step { position: relative; text-align: center; }

.process-node {
  position: relative;
  width: 64px;
  height: 64px;
  margin: 0 auto 10px;
  border-radius: 50%;
  background: var(--c);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 10px 22px color-mix(in srgb, var(--c) 40%, transparent);
  transition: transform 0.25s ease;
}

.process-step:hover .process-node { transform: translateY(-4px) scale(1.08); }

.process-num {
  position: absolute;
  top: -4px;
  right: -4px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: #fff;
  color: #1a2744;
  font-size: 12px;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.18);
}

.process-label { font-size: 14px; font-weight: 700; color: #1a2744; }

/* Gallery */
.gallery {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
}

.gallery-item {
  position: relative;
  margin: 0;
  border-radius: 18px;
  overflow: hidden;
  background: #fff;
  border: 1px solid #e8edf3;
  box-shadow: 0 10px 28px rgba(15, 29, 56, 0.08);
}

.gallery-item img {
  display: block;
  width: 100%;
  height: auto;
  aspect-ratio: 3 / 2;
  object-fit: cover;
  transition: transform 0.6s ease;
}

.gallery-item:hover img { transform: scale(1.08); }

.gallery-item figcaption {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 28px 16px 12px;
  font-size: 15px;
  font-weight: 700;
  color: #fff;
  background: linear-gradient(180deg, transparent, rgba(15, 29, 56, 0.78));
}

/* Marquee */
.marquee {
  overflow: hidden;
  padding: 6px 0;
  mask-image: linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent);
  -webkit-mask-image: linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent);
}

.marquee-track {
  display: flex;
  width: max-content;
  gap: 14px;
  animation: about-marquee 28s linear infinite;
}

.marquee:hover .marquee-track { animation-play-state: paused; }

.tech-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  border-radius: 999px;
  background: #fff;
  border: 1px solid #e2e8f0;
  font-size: 14px;
  font-weight: 700;
  color: #1a2744;
  white-space: nowrap;
  box-shadow: 0 4px 12px rgba(15, 29, 56, 0.06);
}

@media (max-width: 900px) {
  .hero-content {
    grid-template-columns: minmax(0, 1fr);
    text-align: center;
    padding: 40px 20px 72px;
  }
  .hero-text .hero-divider { margin-left: auto; }
  .hero-text .hero-stats { justify-content: center; }
  .hero-art-img { max-width: 320px; }
  .process { grid-template-columns: repeat(3, minmax(0, 1fr)); row-gap: 20px; }
  .process::before { display: none; }
  .gallery { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

@media (max-width: 520px) {
  .process { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .gallery { grid-template-columns: minmax(0, 1fr); }
  .section-title { font-size: 20px; }
}

@media (prefers-reduced-motion: reduce) {
  .hero-art-img, .hero-logo-ring, .hero-thread, .marquee-track { animation: none; }
  .gallery-item:hover img, .process-step:hover .process-node { transform: none; }
}

.hero-logo-ring {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 88px;
  height: 88px;
  border-radius: 50%;
  background: rgba(255,255,255,0.1);
  border: 2px solid rgba(255,255,255,0.15);
  margin-bottom: 18px;
  backdrop-filter: blur(8px);
}

.hero-logo {
  font-size: 44px;
  filter: drop-shadow(0 4px 8px rgba(0,0,0,0.3));
}

.hero-title {
  font-size: 38px;
  font-weight: 900;
  color: #fff;
  letter-spacing: -0.5px;
  margin-bottom: 8px;
  text-shadow: 0 6px 24px rgba(0,0,0,0.25);
}

.hero-subtitle {
  color: rgba(255,255,255,0.7);
  font-size: 16px;
  font-weight: 400;
}

.hero-divider {
  width: 50px;
  height: 3px;
  background: rgba(255,255,255,0.3);
  border-radius: 2px;
  margin: 24px auto;
}

.hero-stats {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 24px;
}

.hero-stat {
  text-align: center;
  padding: 4px 18px;
}

.hero-wave {
  position: absolute;
  left: 0;
  bottom: -1px;
  width: 100%;
  height: 64px;
  z-index: 1;
}

.hero-wave path {
  fill: rgba(255,255,255,0.96);
}

.stat-number {
  font-size: 26px;
  font-weight: 800;
  color: white;
}

.stat-label {
  font-size: 12px;
  color: rgba(255,255,255,0.6);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-top: 2px;
}

.hero-stat-divider {
  width: 1px;
  height: 36px;
  background: rgba(255,255,255,0.15);
}

/* ── Cards ── */
.about-card {
  border: 1px solid #e8edf3;
  position: relative;
  overflow: hidden;
  transition: all 0.25s ease;
  background: #ffffff;
}

.about-card:hover {
  border-color: #d0d8e8;
  box-shadow: 0 12px 32px rgba(0,0,0,0.06) !important;
  transform: translateY(-2px);
}

.card-accent {
  height: 4px;
}

.accent-indigo { background: linear-gradient(90deg, #3949ab, #5c6bc0); }
.accent-green { background: linear-gradient(90deg, #2e7d32, #66bb6a); }
.accent-orange { background: linear-gradient(90deg, #e65100, #ff9800); }
.accent-red { background: linear-gradient(90deg, #c62828, #ef5350); }
.accent-blue { background: linear-gradient(90deg, #1565c0, #42a5f5); }

.card-head {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 18px;
}

.card-icon-wrap {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 6px 14px rgba(0,0,0,0.12);
}

.bg-indigo { background: linear-gradient(135deg, #3949ab, #5c6bc0); }
.bg-green { background: linear-gradient(135deg, #2e7d32, #4caf50); }
.bg-orange { background: linear-gradient(135deg, #e65100, #fb8c00); }
.bg-red { background: linear-gradient(135deg, #c62828, #e53935); }
.bg-blue { background: linear-gradient(135deg, #1565c0, #1e88e5); }

.card-title {
  font-size: 18px;
  font-weight: 700;
  color: #1a2744;
  margin: 0;
}

/* ── Info rows ── */
.info-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.info-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 10px;
  transition: background 0.15s ease;
}

.info-row:hover {
  background: #f8fafc;
}

.info-row.clickable {
  cursor: pointer;
}

.info-row.clickable:hover {
  background: #e8f5e9;
}

.info-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: #f1f5f9;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.info-label {
  font-size: 11px;
  color: #90a4ae;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.4px;
}

.info-value {
  font-size: 14px;
  font-weight: 600;
  color: #263238;
  margin-top: 1px;
}

/* ── Services ── */
.services-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.service-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 12px;
  background: #f8fafc;
  border: 1px solid #f0f4f8;
  transition: all 0.2s ease;
}

.service-card:hover {
  background: #ede7f6;
  border-color: #d1c4e9;
  transform: translateX(4px);
}

.service-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.service-text {
  flex: 1;
}

.service-title {
  font-size: 14px;
  font-weight: 700;
  color: #263238;
}

.service-desc {
  font-size: 12px;
  color: #78909c;
  margin-top: 1px;
}

/* ── Map ── */
.map-shell {
  border-radius: 18px;
  padding: 14px;
  background: linear-gradient(180deg, #fff7f7 0%, #ffffff 100%);
  border: 1px solid #fde2e2;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.8);
}

.map-toolbar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 14px;
}

.map-eyebrow {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  color: #ef5350;
}

.map-heading {
  margin-top: 4px;
  font-size: 18px;
  font-weight: 800;
  color: #1a2744;
}

.map-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.map-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 9px 12px;
  border-radius: 999px;
  text-decoration: none;
  font-size: 12px;
  font-weight: 700;
  color: #c62828;
  background: #fff;
  border: 1px solid #f5c2c2;
  transition: all 0.2s ease;
}

.map-link:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 18px rgba(198, 40, 40, 0.12);
}

.map-link.primary {
  color: #fff;
  border-color: transparent;
  background: linear-gradient(135deg, #d32f2f, #ef5350);
}

.map-frame {
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid #f8d7da;
  box-shadow: 0 12px 28px rgba(198,40,40,0.08);
}

.location-note {
  margin-top: 14px;
  padding: 14px 16px;
  border-radius: 14px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
}

.location-line {
  color: #475569;
  font-size: 13px;
  line-height: 1.6;
}

.location-line:first-child {
  color: #1e293b;
  font-weight: 800;
}

.location-line.subtle {
  margin-top: 6px;
  color: #94a3b8;
  font-size: 12px;
}

/* ── App Info ── */
.app-info-stack {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.app-info-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
  border-bottom: 1px solid #f0f4f8;
}

.app-info-item:last-child {
  border-bottom: none;
}

.app-info-card :deep(.v-card-text) {
  display: flex;
  flex-direction: column;
  height: 100%;
  box-sizing: border-box;
}

.app-footer {
  margin-top: auto;
  padding: 14px;
  background: linear-gradient(135deg, #e8eaf6, #f3e5f5);
  border: 1px solid #e1e4f5;
  border-radius: 12px;
  text-align: center;
}

@media (prefers-reduced-motion: reduce) {
  .about-card:hover {
    transform: none;
  }
}

.app-footer-text {
  font-size: 13px;
  font-weight: 600;
  color: #5c6bc0;
}

@media (max-width: 960px) {
  .map-toolbar {
    flex-direction: column;
  }

  .map-actions {
    justify-content: flex-start;
  }
}

@media (max-width: 768px) {
  .about-page {
    padding: 12px !important;
  }

  .hero-content {
    padding: 36px 16px 32px;
  }

  .hero-title {
    font-size: 26px;
  }

  .hero-subtitle {
    font-size: 14px;
  }

  .hero-logo-ring {
    width: 72px;
    height: 72px;
  }

  .hero-logo {
    font-size: 36px;
  }

  .hero-stats {
    gap: 16px;
  }

  .stat-number {
    font-size: 20px;
  }

  .card-title {
    font-size: 16px;
  }

  .map-shell {
    padding: 10px;
  }

  .map-heading {
    font-size: 15px;
  }

  .map-frame iframe {
    height: 220px;
  }
}

@media (max-width: 480px) {
  .hero-content {
    padding: 28px 12px 24px;
  }

  .hero-title {
    font-size: 22px;
  }

  .hero-stats {
    flex-direction: column;
    gap: 12px;
  }

  .hero-stat-divider {
    width: 36px;
    height: 1px;
  }

  .map-actions {
    flex-direction: column;
    width: 100%;
  }

  .map-link {
    width: 100%;
    justify-content: center;
  }

  .info-row {
    padding: 8px 8px;
    gap: 10px;
  }

  .info-value {
    font-size: 13px;
  }
}
</style>
