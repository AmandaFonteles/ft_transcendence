import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext'
import App from './App'
import './styles/theme.css'

// Point d'entree : monte <App/> dans #root.
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
