// [CONCEPT: point d'entree React] Boot de l'application : monte <App/> dans #root.

// Verifications supplementaires en developpement.
import { StrictMode } from 'react'
// API React 18 de montage dans le DOM.
import { createRoot } from 'react-dom/client'
// [CONCEPT: routeur] BrowserRouter utilise l'historique du navigateur : les URL
// sont propres (/tableau-de-bord) et la navigation ne recharge pas la page.
import { BrowserRouter } from 'react-router-dom'
// Etat d'authentification partage par toute l'application.
import { AuthProvider } from './auth/AuthContext'
// Composant racine (table de routage).
import App from './App'
// Tailwind + le theme du projet (bloc @theme). Unique feuille de style.
import './styles/theme.css'

// Monte l'application. Le "!" affirme a TypeScript que #root existe.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* ORDRE IMPORTANT : BrowserRouter en premier. AuthContext utilise
        useNavigate/useLocation indirectement via les pages ; le routeur doit
        donc envelopper le fournisseur d'authentification, et non l'inverse. */}
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
)
