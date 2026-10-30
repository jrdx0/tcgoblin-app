import { createApp } from 'vue'
import { createPinia } from 'pinia'
import PrimeVue from 'primevue/config'
import { ConfirmationService } from 'primevue'
import { definePreset } from '@primeuix/themes'
import Aura from '@primeuix/themes/aura'

import './assets/main.css'
import App from './App.vue'
import router from './router'

const AppPreset = definePreset(Aura, {
  semantic: {
    primary: {
      contrastColor: 'light-dark(#ffffff, {emerald.950})',
    },
  },
  components: {
    card: {
      root: {
        background: 'light-dark({surface.0}, #1c1c1f)',
        borderRadius: '12px',
        shadow: '0 1px 3px light-dark(rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0.35))',
      },
    },
    button: {
      outlined: {
        secondary: { color: 'light-dark({surface.500}, {surface.200})' },
      },
    },
    tag: {
      success: { color: 'light-dark({green.700}, {green.400})' },
      secondary: { background: 'light-dark({surface.100}, {surface.700})', color: 'light-dark({surface.600}, {surface.200})' },
      info: { background: 'light-dark({sky.100}, color-mix(in srgb, {sky.400}, transparent 82%))' },
    },
  },
})

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(PrimeVue, {
  theme: { preset: AppPreset },
  license: import.meta.env.VITE_PRIMEVUE_LICENSE,
})
app.use(ConfirmationService)

app.mount('#app')
