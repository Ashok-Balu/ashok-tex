import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { aliases, mdi } from 'vuetify/iconsets/mdi'
import '@mdi/font/css/materialdesignicons.css'
import 'vuetify/styles'

export default createVuetify({
  components,
  directives,
  icons: {
    defaultSet: 'mdi',
    aliases,
    sets: { mdi },
  },
  theme: {
    defaultTheme: 'ashokLight',
    themes: {
      ashokLight: {
        dark: false,
        colors: {
          primary:    '#1565C0',
          secondary:  '#37474F',
          accent:     '#F57C00',
          success:    '#2E7D32',
          warning:    '#F9A825',
          error:      '#C62828',
          info:       '#0277BD',
          background: '#F0F4F8',
          surface:    '#FFFFFF',
          'on-surface': '#1A2744',
        },
      },
    },
  },
  defaults: {
    VBtn: {
      style: 'text-transform: none; letter-spacing: 0; font-weight: 600;',
    },
    VTextField: {
      variant: 'outlined',
      density: 'comfortable',
    },
    VSelect: {
      variant: 'outlined',
      density: 'comfortable',
    },
    VAutocomplete: {
      variant: 'outlined',
      density: 'comfortable',
    },
  },
})
