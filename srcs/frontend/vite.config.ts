import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// Depuis Tailwind v4, l'integration passe par un plugin Vite et non plus par
// PostCSS : ni postcss.config.js ni tailwind.config.js ne sont necessaires, le
// theme se declare directement en CSS (voir src/styles/theme.css).
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // 0.0.0.0 pour que le conteneur nginx puisse joindre Vite.
    host: true,
    port: 5173,
    watch: {
      // Polling : detection fiable des changements depuis un bind mount Docker.
      usePolling: true
    },
    hmr: {
      // Port vu par le NAVIGATEUR : celui publie par nginx.
      clientPort: 8443,
      protocol: 'wss'
    }
  }
})
