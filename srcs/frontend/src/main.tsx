// [CONCEPT: point d'entree React] Boot de l'application : monte <App/> dans #root.

// Verifications supplementaires en developpement.
import { StrictMode } from 'react'
// API React 18 de montage dans le DOM.
import { createRoot } from 'react-dom/client'
// [CONCEPT: routeur] BrowserRouter utilise l'historique du navigateur : les URL
// sont propres (/tableau-de-bord) et la navigation ne recharge pas la page.
import { BrowserRouter } from 'react-router-dom'
// Composant racine (table de routage).
import App from './App'
// Jetons de design AVANT les composants : les variables doivent exister quand
// app.css les utilise. Inverser l'ordre laisserait des valeurs indefinies.
import './styles/tokens.css'
import './styles/app.css'

// Monte l'application. Le "!" affirme a TypeScript que #root existe.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* Le routeur doit envelopper toute l'app : les composants enfants utilisent
        Link, NavLink et useParams, qui exigent ce contexte. */}
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
)
