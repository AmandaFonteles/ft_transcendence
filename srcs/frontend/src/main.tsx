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
// Tailwind + le theme du projet. Un seul import de style desormais : le theme
// vit dans le bloc @theme de ce fichier, plus dans des feuilles separees.
import './styles/theme.css'

// Monte l'application. Le "!" affirme a TypeScript que #root existe.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* Le routeur doit envelopper toute l'app : Link, NavLink et useParams
        exigent ce contexte. */}
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
)
