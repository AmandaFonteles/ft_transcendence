// [CONCEPT: config de l'outil de build] Vite lit ce fichier au demarrage : il
// bundle notre code React et, en dev, le sert avec du Hot Module Replacement (HMR).

// Importe l'aide de typage/validation de la configuration Vite.
import { defineConfig } from 'vite'
// Plugin qui apprend a Vite a compiler le JSX/TSX.
import react from '@vitejs/plugin-react'
// [CONCEPT: Tailwind v4] Depuis la v4, Tailwind s'integre par un PLUGIN VITE et
// non plus par PostCSS. Consequence : aucun postcss.config.js ni tailwind.config.js
// n'est necessaire ; le theme se declare directement en CSS (voir styles/theme.css).
import tailwindcss from '@tailwindcss/vite'

// Exporte la configuration.
export default defineConfig({
  // Ordre sans importance ici, mais les deux plugins doivent etre presents.
  plugins: [react(), tailwindcss()],
  // Bloc de configuration du serveur de developpement.
  server: {
    // Ecoute sur 0.0.0.0 pour que le conteneur nginx puisse joindre Vite.
    host: true,
    // Port du serveur de dev (celui vers lequel nginx proxifie).
    port: 5173,
    // Surveillance des fichiers.
    watch: {
      // Polling : detection fiable des changements depuis un bind mount Docker.
      usePolling: true
    },
    // Canal WebSocket du rechargement a chaud.
    hmr: {
      // Port vu par le NAVIGATEUR : 8443, le port publie par nginx.
      clientPort: 8443,
      // Protocole securise, puisque la page vient de https://localhost:8443.
      protocol: 'wss'
    }
  }
})
