<template>
  <div class="about-page pa-4 pa-md-6">
    <!-- Hero Section -->
    <v-card rounded="xl" class="about-hero mb-6" elevation="0">
      <div class="hero-bg"></div>
      <div class="hero-content">
        <div class="hero-logo-ring">
          <span class="hero-logo">🧵</span>
        </div>
        <h1 class="hero-title">{{ t('appName') }}</h1>
        <p class="hero-subtitle">{{ t('aboutTagline') }}</p>
        <div class="hero-divider"></div>
        <div class="hero-stats">
          <div class="hero-stat">
            <div class="stat-number">12+</div>
            <div class="stat-label">{{ t('companies') }}</div>
          </div>
          <div class="hero-stat-divider"></div>
          <div class="hero-stat">
            <div class="stat-number">14</div>
            <div class="stat-label">{{ t('machines') }}</div>
          </div>
          <div class="hero-stat-divider"></div>
          <div class="hero-stat">
            <div class="stat-number">24/7</div>
            <div class="stat-label">{{ t('production') }}</div>
          </div>
        </div>
      </div>
    </v-card>

    <v-row>
      <!-- Business Info -->
      <v-col cols="12" md="6" lg="4">
        <v-card rounded="xl" elevation="0" class="about-card h-100">
          <div class="card-accent accent-indigo"></div>
          <v-card-text class="pa-6 pt-5">
            <div class="card-icon-wrap bg-indigo">
              <v-icon color="white" size="24">mdi-office-building</v-icon>
            </div>
            <h3 class="card-title">{{ t('aboutBusinessInfo') }}</h3>

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
        <v-card rounded="xl" elevation="0" class="about-card h-100">
          <div class="card-accent accent-green"></div>
          <v-card-text class="pa-6 pt-5">
            <div class="card-icon-wrap bg-green">
              <v-icon color="white" size="24">mdi-phone-in-talk</v-icon>
            </div>
            <h3 class="card-title">{{ t('aboutContact') }}</h3>

            <div class="info-list">
              <div class="info-row clickable" @click="callPhone">
                <div class="info-icon"><v-icon size="18" color="green-darken-2">mdi-phone</v-icon></div>
                <div>
                  <div class="info-label">{{ t('aboutPhone') }}</div>
                  <div class="info-value text-green-darken-2">+91 99433 45614</div>
                </div>
                <v-icon size="16" color="grey-lighten-1" class="ml-auto">mdi-open-in-new</v-icon>
              </div>
              <div class="info-row clickable" @click="openWhatsApp">
                <div class="info-icon"><v-icon size="18" color="green-darken-2">mdi-whatsapp</v-icon></div>
                <div>
                  <div class="info-label">{{ t('aboutWhatsApp') }}</div>
                  <div class="info-value text-green-darken-2">+91 99433 45614</div>
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
                  <div class="info-value text-green-darken-2">ashoktex.in</div>
                </div>
                <v-icon size="16" color="grey-lighten-1" class="ml-auto">mdi-open-in-new</v-icon>
              </div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- Services -->
      <v-col cols="12" md="12" lg="4">
        <v-card rounded="xl" elevation="0" class="about-card h-100">
          <div class="card-accent accent-orange"></div>
          <v-card-text class="pa-6 pt-5">
            <div class="card-icon-wrap bg-orange">
              <v-icon color="white" size="24">mdi-cog</v-icon>
            </div>
            <h3 class="card-title">{{ t('aboutServices') }}</h3>

            <div class="services-grid">
              <div class="service-card" v-for="service in services" :key="service.icon">
                <v-avatar size="44" :color="service.color" variant="tonal" rounded="lg">
                  <v-icon size="22">{{ service.icon }}</v-icon>
                </v-avatar>
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
        <v-card rounded="xl" elevation="0" class="about-card">
          <div class="card-accent accent-red"></div>
          <v-card-text class="pa-6 pt-5">
            <div class="card-icon-wrap bg-red">
              <v-icon color="white" size="24">mdi-map-marker-radius</v-icon>
            </div>
            <h3 class="card-title">{{ t('aboutLocation') }}</h3>
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
        <v-card rounded="xl" elevation="0" class="about-card h-100">
          <div class="card-accent accent-blue"></div>
          <v-card-text class="pa-6 pt-5">
            <div class="card-icon-wrap bg-blue">
              <v-icon color="white" size="24">mdi-cellphone-link</v-icon>
            </div>
            <h3 class="card-title">{{ t('aboutApp') }}</h3>

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
            </div>

            <div class="app-footer">
              <div class="app-footer-text">{{ t('aboutMadeWith') }}</div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<script setup>
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const mapsPlaceUrl = 'https://www.google.com/maps/place/Ashok+Tex,+weaving+unit/@10.8439428,78.0379084,17z/data=!3m1!4b1!4m6!3m5!1s0x3baa2598ff9b4029:0xe3981d2da7644da1!8m2!3d10.8439428!4d78.0379084!16s%2Fg%2F11sjtjhjx1!18m1!1e1?entry=ttu'
const mapsShareUrl = 'https://share.google/dEtuNxkdQe9eIfEzV'

const services = [
  { icon: 'mdi-texture-box', color: 'indigo', title: 'Powerloom Weaving', desc: 'Quality fabric production' },
  { icon: 'mdi-robot-industrial', color: 'blue', title: 'Autoloom Ops', desc: 'Automated weaving' },
  { icon: 'mdi-account-group', color: 'teal', title: 'Workforce', desc: 'Payroll & attendance' },
  { icon: 'mdi-chart-bar', color: 'orange', title: 'Analytics', desc: 'Business insights' },
]

function callPhone() { window.open('tel:+919943345614') }
function openWhatsApp() { window.open('https://wa.me/919943345614', '_blank') }
function openWebsite() { window.open('https://ashoktex.in', '_blank') }
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
  background: linear-gradient(135deg, #0f1b3d 0%, #1a2f6b 35%, #2d4aa8 65%, #4a6fd4 100%);
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
  text-align: center;
  padding: 52px 24px 44px;
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
  font-size: 36px;
  font-weight: 900;
  color: white;
  letter-spacing: -0.5px;
  margin-bottom: 8px;
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

.card-icon-wrap {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 14px;
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
  margin-bottom: 16px;
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

.app-footer {
  margin-top: 20px;
  padding: 14px;
  background: linear-gradient(135deg, #e3f2fd, #f3e5f5);
  border-radius: 12px;
  text-align: center;
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
