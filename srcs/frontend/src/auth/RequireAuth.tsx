// =============================================================================
// RequireAuth.tsx : garde de route. Protege les pages reservees aux connectes.
// =============================================================================

// Navigate redirige ; Outlet affiche la route enfant ; useLocation donne l'URL courante.
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext'

export default function RequireAuth() {
  // Etat d'authentification partage.
  const { user, loading } = useAuth()
  // URL demandee, pour y revenir apres connexion.
  const location = useLocation()

  // Tant que la session est en cours de verification, on n'affiche RIEN de
  // definitif. Sans ce garde-fou, un utilisateur deja connecte serait ejecte vers
  // la page de connexion pendant la fraction de seconde du refresh().
  if (loading) {
    return <p className="text-ink-soft">Vérification de la session…</p>
  }

  // Non connecte : redirection vers la page de connexion.
  // "replace" remplace l'entree d'historique au lieu d'en empiler une : le bouton
  // Retour ne ramene pas sur une page protegee inaccessible.
  // "state" memorise la destination voulue pour y revenir apres connexion.
  if (!user) {
    return <Navigate to="/connexion" replace state={{ from: location.pathname }} />
  }

  // Connecte : on affiche la route enfant.
  return <Outlet />
}
