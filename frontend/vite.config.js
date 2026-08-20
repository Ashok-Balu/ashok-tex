import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vuetify from 'vite-plugin-vuetify'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [
    vue(),
    vuetify({ autoImport: true }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    // Split large chunks so the browser only downloads what it needs per page
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Vue core — tiny, always needed
          if (id.includes('node_modules/vue/') || id.includes('node_modules/@vue/')) {
            return 'vue-core'
          }
          // Vuetify — large but needed on every page; split from app code
          if (id.includes('node_modules/vuetify')) {
            return 'vuetify'
          }
          // AG Grid — only used in a couple of pages
          if (id.includes('node_modules/@ag-grid')) {
            return 'ag-grid'
          }
          // jsPDF — only used for payslip download
          if (id.includes('node_modules/jspdf') || id.includes('node_modules/html2canvas')) {
            return 'pdf-libs'
          }
          // Pinia + vue-router + vue-i18n — small shared utilities
          if (id.includes('node_modules/pinia') || id.includes('node_modules/vue-router') || id.includes('node_modules/vue-i18n')) {
            return 'vue-plugins'
          }
          // Remaining node_modules
          if (id.includes('node_modules')) {
            return 'vendor'
          }
        },
      },
    },
    // Increase warning threshold to avoid noise (we've already split the chunks)
    chunkSizeWarningLimit: 600,
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
  preview: {
    port: 4173,
  },
})
