// [CONCEPT: config de l'outil de build] Vite lit ce fichier au demarrage : il
// bundle notre code React et, en dev, le sert avec du Hot Module Replacement (HMR).

// Importe la fonction d'aide qui type et valide la configuration Vite.
import { defineConfig } from 'vite'
// Importe le plugin React : il apprend a Vite a compiler le JSX/TSX.
import react from '@vitejs/plugin-react'

// Exporte la configuration ; defineConfig fournit l'autocompletion et la verification.
export default defineConfig({
  // Active le plugin React dans la chaine de build.
  plugins: [react()],
  // Bloc de configuration du serveur de developpement.
  server: {
    // Ecoute sur 0.0.0.0 (toutes les interfaces), pas seulement localhost.
    // Pourquoi : le conteneur nginx est une autre "machine" reseau ; sans ca il
    // recevrait "connection refused" en essayant de joindre Vite.
    host: true,
    // Port du serveur de dev (celui vers lequel nginx proxifie).
    port: 5173,
    // Bloc de surveillance des fichiers.
    watch: {
      // Detecte les changements par polling (scrutation reguliere).
      // Pourquoi : depuis un bind mount Docker, les evenements de fichiers peuvent
      // etre perdus ; le polling rend le rechargement fiable partout.
      usePolling: true
    },
    // Bloc HMR : le canal WebSocket qui pousse les mises a jour a chaud vers le navigateur.
    hmr: {
      // Port vu par le NAVIGATEUR pour ce socket : 443 (il passe par nginx).
      // Pourquoi : la page vient de https://localhost (nginx, 443), pas de 5173.
      clientPort: 443,
      // Protocole du socket cote navigateur : wss (WebSocket securise, via TLS).
      // Pourquoi : sans ce bloc, Vite tenterait 5173 en direct et le live-reload echouerait.
      protocol: 'wss'
    }
  }
})
