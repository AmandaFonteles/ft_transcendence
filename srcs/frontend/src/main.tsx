// [CONCEPT: point d'entree React] Ce fichier demarre l'app : il trouve le div
// #root de index.html et demande a React d'y afficher <App/>.

// Importe StrictMode : un composant qui active des verifications de dev supplementaires.
import { StrictMode } from 'react'
// Importe createRoot : l'API moderne de React 18 pour connecter React au DOM.
import { createRoot } from 'react-dom/client'
// Importe notre composant racine (la page d'index).
import App from './App'
// Importe les styles globaux (appliques a toute la page).
import './index.css'

// Recupere le div #root, y cree une racine React, et y rend l'application.
// Le "!" affirme a TypeScript que #root existe (index.html le garantit).
// Pourquoi StrictMode : detecte tot certains bugs, sans effet en production.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
